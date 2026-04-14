const std = @import("std");

// Usage:
//   cachegen <device> <shell.html> <pages_dir> <data_dir> <output.json>
//
// Produces a single per-device cache shaped like the ybp reference:
//
//   {
//     "body":   "<shell with __PAGE_BODY__ stripped>",
//     "cache":  { "/path": { "title": "...", "html": "<page-body>" }, ... },
//     "routes": { "/path": "shortcode" },
//     "data":   { ...union of every data.json's `data` field... }
//   }
//
// Route paths follow the `index → /` convention; everything else maps to
// "/<basename>.html". Both `cache` and `routes` are populated by walking
// every *.html in <pages_dir> and joining with the matching *.json in
// <data_dir>.
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 6) {
        std.debug.print("Usage: cachegen <device> <shell.html> <pages_dir> <data_dir> <output.json>\n", .{});
        return;
    }

    const device = args[1];
    const shell_path = args[2];
    const pages_dir = args[3];
    const data_dir = args[4];
    const out_path = args[5];

    const shell_raw = try std.fs.cwd().readFileAlloc(allocator, shell_path, 4 * 1024 * 1024);
    defer allocator.free(shell_raw);

    // Strip the per-page slot from the shell, then resolve __DEVICE__ so
    // the body is ready to be hot-swapped into the document during boot.
    var body_step = std.ArrayList(u8).init(allocator);
    defer body_step.deinit();
    try replace(&body_step, shell_raw, "__PAGE_BODY__", "");

    var body = std.ArrayList(u8).init(allocator);
    defer body.deinit();
    try replace(&body, body_step.items, "__DEVICE__", device);

    // Walk pages_dir to collect routes.
    var dir = try std.fs.cwd().openDir(pages_dir, .{ .iterate = true });
    defer dir.close();

    var out = std.ArrayList(u8).init(allocator);
    defer out.deinit();
    const w = out.writer();

    try w.writeAll("{\"body\":");
    try writeJsonString(w, body.items);
    try w.writeAll(",\"cache\":{");

    var first = true;
    var iter = dir.iterate();
    var routes_acc = std.ArrayList(u8).init(allocator);
    defer routes_acc.deinit();
    var data_acc = std.ArrayList(u8).init(allocator);
    defer data_acc.deinit();
    var routes_first = true;
    var data_first = true;

    while (try iter.next()) |entry| {
        if (entry.kind != .file) continue;
        if (!std.mem.endsWith(u8, entry.name, ".html")) continue;

        const stem = entry.name[0 .. entry.name.len - ".html".len];
        const route = if (std.mem.eql(u8, stem, "index"))
            try allocator.dupe(u8, "/")
        else
            try std.fmt.allocPrint(allocator, "/{s}", .{stem});
        defer allocator.free(route);

        const page_path = try std.fs.path.join(allocator, &.{ pages_dir, entry.name });
        defer allocator.free(page_path);
        const page_html = try std.fs.cwd().readFileAlloc(allocator, page_path, 4 * 1024 * 1024);
        defer allocator.free(page_html);

        const data_path = try std.fmt.allocPrint(allocator, "{s}/{s}.json", .{ data_dir, stem });
        defer allocator.free(data_path);

        const data_raw = std.fs.cwd().readFileAlloc(allocator, data_path, 4 * 1024 * 1024) catch null;
        defer if (data_raw) |d| allocator.free(d);

        const title = if (data_raw) |d| extractStringField(d, "title") orelse "" else "";
        const route_code = if (data_raw) |d| extractStringField(d, "route") orelse stem else stem;
        const data_blob = if (data_raw) |d| extractObjectField(d, "data") else null;

        // cache[<route>] = {"title": "...", "html": "..."}
        if (!first) try w.writeAll(",");
        first = false;
        try writeJsonString(w, route);
        try w.writeAll(":{\"title\":");
        try writeJsonString(w, title);
        try w.writeAll(",\"html\":");
        try writeJsonString(w, page_html);
        try w.writeAll("}");

        // Buffer routes / data — we'll emit them after the cache object.
        if (!routes_first) try routes_acc.appendSlice(",");
        routes_first = false;
        try writeJsonString(routes_acc.writer(), route);
        try routes_acc.appendSlice(":");
        try writeJsonString(routes_acc.writer(), route_code);

        if (data_blob) |db| {
            const trimmed = std.mem.trim(u8, db, " \t\r\n");
            if (trimmed.len > 0 and !std.mem.eql(u8, trimmed, "{}")) {
                if (!data_first) try data_acc.appendSlice(",");
                data_first = false;
                try writeJsonString(data_acc.writer(), route);
                try data_acc.appendSlice(":");
                try data_acc.appendSlice(trimmed);
            }
        }
    }

    try w.writeAll("},\"routes\":{");
    try w.writeAll(routes_acc.items);
    try w.writeAll("},\"data\":{");
    try w.writeAll(data_acc.items);
    try w.writeAll("}}");

    if (std.fs.path.dirname(out_path)) |d| std.fs.cwd().makePath(d) catch {};
    try std.fs.cwd().writeFile(.{ .sub_path = out_path, .data = out.items });

    std.debug.print(
        "\x1b[36m  CACHE\x1b[0m \x1b[2m({s})\x1b[0m \x1b[2m→\x1b[0m {s} \x1b[2m({d} bytes)\x1b[0m\n",
        .{ device, out_path, out.items.len },
    );
}

fn replace(out: *std.ArrayList(u8), src: []const u8, needle: []const u8, sub: []const u8) !void {
    var i: usize = 0;
    while (std.mem.indexOfPos(u8, src, i, needle)) |pos| {
        try out.appendSlice(src[i..pos]);
        try out.appendSlice(sub);
        i = pos + needle.len;
    }
    try out.appendSlice(src[i..]);
}

fn writeJsonString(w: anytype, s: []const u8) !void {
    try w.writeByte('"');
    for (s) |c| switch (c) {
        '"' => try w.writeAll("\\\""),
        '\\' => try w.writeAll("\\\\"),
        '\n' => try w.writeAll("\\n"),
        '\r' => try w.writeAll("\\r"),
        '\t' => try w.writeAll("\\t"),
        '/' => try w.writeAll("\\/"),
        0...0x08, 0x0B, 0x0C, 0x0E...0x1F => try w.print("\\u{x:0>4}", .{c}),
        else => try w.writeByte(c),
    };
    try w.writeByte('"');
}

// Read a top-level "<field>": "..." string value. Returns slice into src.
fn extractStringField(src: []const u8, field: []const u8) ?[]const u8 {
    var buf: [128]u8 = undefined;
    const needle = std.fmt.bufPrint(&buf, "\"{s}\"", .{field}) catch return null;
    const key_start = std.mem.indexOf(u8, src, needle) orelse return null;
    var i = key_start + needle.len;
    while (i < src.len and (src[i] == ' ' or src[i] == ':' or src[i] == '\t')) : (i += 1) {}
    if (i >= src.len or src[i] != '"') return null;
    i += 1;
    const v_start = i;
    while (i < src.len and src[i] != '"') : (i += 1) {
        if (src[i] == '\\' and i + 1 < src.len) i += 1;
    }
    if (i >= src.len) return null;
    return src[v_start..i];
}

// Read a top-level "<field>": { ... } object value. Returns slice into src
// covering the braces and content. Doesn't handle nested string-with-brace
// edge cases, which is fine for our well-formed pretty-printed JSON inputs.
fn extractObjectField(src: []const u8, field: []const u8) ?[]const u8 {
    var buf: [128]u8 = undefined;
    const needle = std.fmt.bufPrint(&buf, "\"{s}\"", .{field}) catch return null;
    const key_start = std.mem.indexOf(u8, src, needle) orelse return null;
    var i = key_start + needle.len;
    while (i < src.len and (src[i] == ' ' or src[i] == ':' or src[i] == '\t' or src[i] == '\r' or src[i] == '\n')) : (i += 1) {}
    if (i >= src.len or src[i] != '{') return null;
    const start = i;
    var depth: usize = 1;
    i += 1;
    while (i < src.len and depth > 0) : (i += 1) {
        if (src[i] == '{') depth += 1;
        if (src[i] == '}') depth -= 1;
    }
    return src[start..i];
}
