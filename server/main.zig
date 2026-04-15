const std = @import("std");
const static = @import("static.zig");
const render = @import("render.zig");
const stats_mod = @import("stats.zig");
const log = @import("log.zig");

fn prerender(a: std.mem.Allocator, root: []const u8, store: *render.CmsStore) !void {
    if (std.fs.path.dirname(root)) |d| std.fs.cwd().makePath(d) catch {};
    std.fs.cwd().makePath(root) catch {};

    for ([_][]const u8{ "d", "m" }) |device| {
        var buf: std.ArrayList(u8) = .empty;
        defer buf.deinit(a);
        try render.renderCacheBlob(a, buf.writer(a), device, store);

        const path = try std.fmt.allocPrint(a, "{s}/{s}.json", .{ root, device });
        defer a.free(path);
        try std.fs.cwd().writeFile(.{ .sub_path = path, .data = buf.items });

        std.debug.print(
            "\x1b[44;30m PRERND \x1b[0m  {s} \x1b[2m({d} bytes)\x1b[0m\n",
            .{ path, buf.items.len },
        );
    }
}

fn handleSigint(_: c_int) callconv(.c) void {
    log.shutdown();
    std.process.exit(0);
}

pub fn main() !void {
    var act = std.posix.Sigaction{
        .handler = .{ .handler = handleSigint },
        .mask = std.mem.zeroes(std.posix.sigset_t),
        .flags = 0,
    };
    std.posix.sigaction(std.posix.SIG.INT, &act, null);

    // c_allocator = system malloc. Tiny resident footprint vs. the
    // GeneralPurposeAllocator's per-allocation metadata + leak-tracking
    // bookkeeping (which pulls in ~1 MB of extra RSS even at idle).
    // Each request uses an arena layered on top, so fragmentation is
    // bounded per request.
    const allocator = std.heap.c_allocator;

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    // Args:
    //   <root> <port>                — serve mode (default)
    //   --prerender <root>           — write per-device cache JSON to root and exit
    var prerender_root: ?[]const u8 = null;
    if (args.len > 1 and std.mem.eql(u8, args[1], "--prerender")) {
        prerender_root = if (args.len >= 3) args[2] else "public";
    }

    const root: []const u8 = if (prerender_root) |r| r else (if (args.len >= 2) args[1] else "public");
    const port: u16 = if (args.len >= 3 and prerender_root == null) try std.fmt.parseInt(u16, args[2], 10) else 8000;

    // CMS store drives what the renderer sees. Seeded with defaults; a
    // real CMS adapter calls `store.replace` on fetch + hits
    // `/_cms/invalidate` (or calls `cache.invalidate()` directly).
    var store = render.CmsStore.init(allocator);
    defer store.deinit();
    try store.seed();

    var cache = render.Cache.init(allocator);
    defer cache.deinit();

    // Prerender mode — write per-device cache JSON to <root>/<dev>.json
    // and exit. Used by `zig build bundle` to bake the SPA bootstrap
    // payload as a static file.
    if (prerender_root != null) {
        try prerender(allocator, root, &store);
        return;
    }

    var stats = stats_mod.Stats.init();

    const ctx = static.Ctx{
        .root = root,
        .store = &store,
        .cache = &cache,
        .stats = &stats,
    };

    const addr = try std.net.Address.parseIp("127.0.0.1", port);
    var listener = try addr.listen(.{ .reuse_address = true });
    defer listener.deinit();

    log.banner(port, root);

    // Baseline VITALS line so the badge shows even before the first
    // request hits.
    {
        const ru = std.posix.getrusage(std.posix.rusage.SELF);
        const user_ms = @as(i64, ru.utime.sec) * 1000 + @divFloor(ru.utime.usec, 1000);
        const sys_ms = @as(i64, ru.stime.sec) * 1000 + @divFloor(ru.stime.usec, 1000);
        log.statsLine(0, 0, 0, 0.0, stats_mod.rssBytes(ru), user_ms, sys_ms);
    }

    while (true) {
        const conn = listener.accept() catch |err| {
            log.acceptError(err);
            continue;
        };
        static.handle(allocator, conn, ctx) catch |err| {
            log.requestError(err);
        };
    }
}
