const std = @import("std");
const static = @import("static.zig");
const render = @import("render.zig");

fn handleSigint(_: c_int) callconv(.c) void {
    std.debug.print("\n\x1b[2m  bye 👋\x1b[0m\n", .{});
    std.process.exit(0);
}

pub fn main() !void {
    // Clean exit on Ctrl+C so the build runner doesn't report a failure.
    var act = std.posix.Sigaction{
        .handler = .{ .handler = handleSigint },
        .mask = std.mem.zeroes(std.posix.sigset_t),
        .flags = 0,
    };
    std.posix.sigaction(std.posix.SIG.INT, &act, null);
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    // Optional CLI args: `zig build run -- <root> <port>`
    const root: []const u8 = if (args.len >= 2) args[1] else "public";
    const port: u16 = if (args.len >= 3) try std.fmt.parseInt(u16, args[2], 10) else 8000;

    // CMS store drives what the renderer sees. Seeded with defaults;
    // a real adapter (Sanity / Prismic / …) will call `store.replace`
    // on fetch and `cache.invalidate` from the webhook path.
    var store = render.CmsStore.init(allocator);
    defer store.deinit();
    try store.seed();

    var cache = render.Cache.init(allocator);
    defer cache.deinit();

    const ctx = static.Ctx{ .root = root, .store = &store, .cache = &cache };

    const addr = try std.net.Address.parseIp("127.0.0.1", port);
    var listener = try addr.listen(.{ .reuse_address = true });
    defer listener.deinit();

    std.debug.print(
        "\x1b[35m  SERVE\x1b[0m  http://127.0.0.1:{d}  \x1b[2m(root:\x1b[0m \x1b[36m{s}\x1b[0m\x1b[2m, SSR)\x1b[0m\n",
        .{ port, root },
    );

    while (true) {
        const conn = listener.accept() catch |err| {
            std.debug.print("accept error: {s}\n", .{@errorName(err)});
            continue;
        };
        static.handle(allocator, conn, ctx) catch |err| {
            std.debug.print("request error: {s}\n", .{@errorName(err)});
        };
    }
}
