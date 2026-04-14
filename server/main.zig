const std = @import("std");
const static = @import("static.zig");
const render = @import("render.zig");
const stats_mod = @import("stats.zig");
const log = @import("log.zig");

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

    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    const root: []const u8 = if (args.len >= 2) args[1] else "public";
    const port: u16 = if (args.len >= 3) try std.fmt.parseInt(u16, args[2], 10) else 8000;

    // CMS store drives what the renderer sees. Seeded with defaults; a
    // real CMS adapter calls `store.replace` on fetch + hits
    // `/_cms/invalidate` (or calls `cache.invalidate()` directly).
    var store = render.CmsStore.init(allocator);
    defer store.deinit();
    try store.seed();

    var cache = render.Cache.init(allocator);
    defer cache.deinit();

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
