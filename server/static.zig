const std = @import("std");
const render = @import("render.zig");

// ---------------------------------------------------------------------
// Request handler.
//
//   * GET `/_cms/invalidate`      → rebuild render cache on next hit
//   * POST `/_cms/invalidate`     → same (the real CMS webhook verb)
//   * `/<route>?d=<device>`       → SSR JSON cache blob for that device
//   * `/`, `/about`, ...          → SSR full HTML document
//   * everything else             → static file from `root`
// ---------------------------------------------------------------------

pub const Ctx = struct {
    root: []const u8,
    store: *render.CmsStore,
    cache: *render.Cache,
};

pub fn handle(
    allocator: std.mem.Allocator,
    conn: std.net.Server.Connection,
    ctx: Ctx,
) !void {
    defer conn.stream.close();

    var read_buf: [8192]u8 = undefined;
    var write_buf: [8192]u8 = undefined;
    var stream_reader = conn.stream.reader(&read_buf);
    var stream_writer = conn.stream.writer(&write_buf);
    var server = std.http.Server.init(stream_reader.interface(), &stream_writer.interface);

    var req = server.receiveHead() catch return;
    const target = req.head.target;

    const q_pos = std.mem.indexOfScalar(u8, target, '?');
    const raw_path = if (q_pos) |p| target[0..p] else target;
    const query = if (q_pos) |p| target[p + 1 ..] else "";

    if (std.mem.indexOf(u8, raw_path, "..") != null) {
        try req.respond("forbidden", .{ .status = .forbidden });
        return;
    }

    const device = detectDevice(&req);

    // CMS webhook — invalidates the per-device render cache so the
    // next request re-renders with the latest content.
    if (std.mem.eql(u8, raw_path, "/_cms/invalidate")) {
        ctx.cache.invalidate();
        try req.respond("ok", .{
            .status = .ok,
            .extra_headers = &.{.{ .name = "content-type", .value = "text/plain" }},
        });
        std.debug.print("  \x1b[33mCMS\x1b[0m cache invalidated\n", .{});
        return;
    }

    // `?d=<device>` is the client bootstrap request — Controller fires
    // it once the SPA is ready and expects the full route cache back.
    if (queryDevice(query)) |dev| {
        const blob = ctx.cache.getBlob(dev, ctx.store) catch |err| {
            try req.respond("cache error", .{ .status = .internal_server_error });
            std.debug.print("  \x1b[31m500\x1b[0m cache {s}: {s}\n", .{ dev, @errorName(err) });
            return;
        };
        try req.respond(blob, .{
            .status = .ok,
            .extra_headers = &.{.{ .name = "content-type", .value = "application/json" }},
        });
        std.debug.print(
            "  \x1b[32m200\x1b[0m \x1b[2m[{s}]\x1b[0m cache \x1b[2m({d} bytes)\x1b[0m\n",
            .{ dev, blob.len },
        );
        return;
    }

    // HTML routes → SSR. Anything with a "real" extension (.css, .js,
    // .png, …) falls through to the static branch.
    if (isPageRoute(raw_path)) {
        const normalized = normalizePath(raw_path);
        var buf: std.ArrayList(u8) = .empty;
        defer buf.deinit(allocator);

        render.renderDocument(buf.writer(allocator), normalized, device, ctx.store) catch |err| switch (err) {
            error.NotFound => {
                try req.respond("not found", .{ .status = .not_found });
                std.debug.print("  \x1b[31m404\x1b[0m {s}\n", .{raw_path});
                return;
            },
            else => return err,
        };

        try req.respond(buf.items, .{
            .status = .ok,
            .extra_headers = &.{.{ .name = "content-type", .value = "text/html; charset=utf-8" }},
        });
        std.debug.print(
            "  \x1b[32m200\x1b[0m \x1b[2m[{s}]\x1b[0m {s} \x1b[2m({d} bytes SSR)\x1b[0m\n",
            .{ device, raw_path, buf.items.len },
        );
        return;
    }

    // Static asset passthrough.
    const rel = if (raw_path.len > 0 and raw_path[0] == '/') raw_path[1..] else raw_path;
    const fs_path = try std.fs.path.join(allocator, &.{ ctx.root, rel });
    defer allocator.free(fs_path);

    const file = std.fs.cwd().openFile(fs_path, .{}) catch {
        try req.respond("not found", .{ .status = .not_found });
        std.debug.print("  \x1b[31m404\x1b[0m {s}\n", .{raw_path});
        return;
    };
    defer file.close();

    const stat = try file.stat();
    const body = try allocator.alloc(u8, stat.size);
    defer allocator.free(body);
    _ = try file.readAll(body);

    const ctype = contentType(fs_path);
    try req.respond(body, .{
        .status = .ok,
        .extra_headers = &.{.{ .name = "content-type", .value = ctype }},
    });
    std.debug.print(
        "  \x1b[32m200\x1b[0m \x1b[2m[{s}]\x1b[0m {s} \x1b[2m({d} bytes)\x1b[0m\n",
        .{ device, raw_path, stat.size },
    );
}

// A "page route" is either `/` or a path with no file extension. Paths
// with extensions are treated as static assets.
fn isPageRoute(path: []const u8) bool {
    if (std.mem.eql(u8, path, "/")) return true;
    const last_slash = std.mem.lastIndexOfScalar(u8, path, '/') orelse return false;
    const tail = path[last_slash + 1 ..];
    return std.mem.indexOfScalar(u8, tail, '.') == null;
}

fn normalizePath(path: []const u8) []const u8 {
    if (path.len == 0) return "/";
    if (path.len > 1 and path[path.len - 1] == '/') return path[0 .. path.len - 1];
    return path;
}

fn queryDevice(query: []const u8) ?[]const u8 {
    var it = std.mem.tokenizeScalar(u8, query, '&');
    while (it.next()) |pair| {
        const eq = std.mem.indexOfScalar(u8, pair, '=') orelse continue;
        const key = pair[0..eq];
        const val = pair[eq + 1 ..];
        if (std.mem.eql(u8, key, "d")) {
            if (std.mem.eql(u8, val, "d")) return "d";
            if (std.mem.eql(u8, val, "m")) return "m";
        }
    }
    return null;
}

fn detectDevice(req: *std.http.Server.Request) []const u8 {
    var it = req.iterateHeaders();
    while (it.next()) |h| {
        if (!std.ascii.eqlIgnoreCase(h.name, "user-agent")) continue;
        return classify(h.value);
    }
    return "d";
}

fn classify(ua: []const u8) []const u8 {
    const mobile_needles = [_][]const u8{ "Mobi", "Android", "iPhone", "iPad", "iPod" };
    for (mobile_needles) |needle| {
        if (std.ascii.indexOfIgnoreCase(ua, needle) != null) return "m";
    }
    return "d";
}

fn contentType(path: []const u8) []const u8 {
    if (std.mem.endsWith(u8, path, ".css")) return "text/css; charset=utf-8";
    if (std.mem.endsWith(u8, path, ".js")) return "application/javascript; charset=utf-8";
    if (std.mem.endsWith(u8, path, ".json")) return "application/json";
    if (std.mem.endsWith(u8, path, ".svg")) return "image/svg+xml";
    if (std.mem.endsWith(u8, path, ".png")) return "image/png";
    if (std.mem.endsWith(u8, path, ".jpg") or std.mem.endsWith(u8, path, ".jpeg")) return "image/jpeg";
    return "application/octet-stream";
}
