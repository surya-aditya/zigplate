const std = @import("std");

// Handle a single HTTP connection by serving a static file from `root`.
pub fn handle(
    allocator: std.mem.Allocator,
    conn: std.net.Server.Connection,
    root: []const u8,
) !void {
    defer conn.stream.close();

    var read_buf: [8192]u8 = undefined;
    var server = std.http.Server.init(conn, &read_buf);

    var req = server.receiveHead() catch return;

    const target = req.head.target;
    const path = if (std.mem.eql(u8, target, "/")) "/index.html" else target;
    const clean = if (std.mem.indexOfScalar(u8, path, '?')) |q| path[0..q] else path;

    if (std.mem.indexOf(u8, clean, "..") != null) {
        try req.respond("forbidden", .{ .status = .forbidden });
        return;
    }

    const fs_path = try std.fs.path.join(allocator, &.{ root, clean[1..] });
    defer allocator.free(fs_path);

    const file = std.fs.cwd().openFile(fs_path, .{}) catch {
        try req.respond("not found", .{ .status = .not_found });
        std.debug.print("  \x1b[31m404\x1b[0m {s}\n", .{clean});
        return;
    };
    defer file.close();

    const stat = try file.stat();
    const body = try allocator.alloc(u8, stat.size);
    defer allocator.free(body);
    _ = try file.readAll(body);

    const ctype = contentType(clean);
    try req.respond(body, .{
        .status = .ok,
        .extra_headers = &.{.{ .name = "content-type", .value = ctype }},
    });
    std.debug.print("  \x1b[32m200\x1b[0m {s} \x1b[2m({d} bytes)\x1b[0m\n", .{ clean, stat.size });
}

fn contentType(path: []const u8) []const u8 {
    if (std.mem.endsWith(u8, path, ".html")) return "text/html; charset=utf-8";
    if (std.mem.endsWith(u8, path, ".css")) return "text/css; charset=utf-8";
    if (std.mem.endsWith(u8, path, ".js")) return "application/javascript; charset=utf-8";
    if (std.mem.endsWith(u8, path, ".json")) return "application/json";
    if (std.mem.endsWith(u8, path, ".svg")) return "image/svg+xml";
    if (std.mem.endsWith(u8, path, ".png")) return "image/png";
    if (std.mem.endsWith(u8, path, ".jpg") or std.mem.endsWith(u8, path, ".jpeg")) return "image/jpeg";
    return "application/octet-stream";
}
