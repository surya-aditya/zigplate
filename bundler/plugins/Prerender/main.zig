const std = @import("std");

// Usage:
//   prerender <shell.html> <page.html> <data.json> <device> <output.html>
//
// Substitutes the following placeholders inside the shell:
//   __DEVICE__       → "<device>"
//   __PAGE_BODY__    → contents of <page.html>
//   __TITLE__        → data.title (or "" if missing)
//
// No JSON seed is inlined — the client fetches /cache/<device>.json on
// boot and discovers everything (route shortcodes, titles, html) from
// there. Removing the seed keeps the initial HTML lean.
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 6) {
        std.debug.print("Usage: prerender <shell.html> <page.html> <data.json> <device> <output.html>\n", .{});
        return;
    }

    const shell = try std.fs.cwd().readFileAlloc(allocator, args[1], 4 * 1024 * 1024);
    defer allocator.free(shell);
    const page = try std.fs.cwd().readFileAlloc(allocator, args[2], 4 * 1024 * 1024);
    defer allocator.free(page);
    const data = try std.fs.cwd().readFileAlloc(allocator, args[3], 4 * 1024 * 1024);
    defer allocator.free(data);

    const device = args[4];
    const out_path = args[5];

    const title = extractStringField(data, "title") orelse "";

    var step1 = std.ArrayList(u8).init(allocator);
    defer step1.deinit();
    try replace(&step1, shell, "__DEVICE__", device);

    var step2 = std.ArrayList(u8).init(allocator);
    defer step2.deinit();
    try replace(&step2, step1.items, "__PAGE_BODY__", page);

    var step3 = std.ArrayList(u8).init(allocator);
    defer step3.deinit();
    try replace(&step3, step2.items, "__TITLE__", title);

    if (std.fs.path.dirname(out_path)) |dir| std.fs.cwd().makePath(dir) catch {};
    try std.fs.cwd().writeFile(.{ .sub_path = out_path, .data = step3.items });

    std.debug.print(
        "\x1b[34m  HTML\x1b[0m  {s} \x1b[2m+\x1b[0m {s} \x1b[2m→\x1b[0m {s}\n",
        .{ args[2], args[3], out_path },
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

// Tiny "good enough" JSON string-field reader. Looks for "<field>": "value"
// at the top level. Returns a slice into `src` (no allocation) or null.
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
        if (src[i] == '\\' and i + 1 < src.len) i += 1; // skip escapes
    }
    if (i >= src.len) return null;
    return src[v_start..i];
}
