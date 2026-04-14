const std = @import("std");

// ---------------------------------------------------------------------
// All server-side stdout/stderr noise lives here. Keeps request
// handlers, render, and main.zig free of ANSI escape clutter and makes
// it easy to tweak formatting in one place.
// ---------------------------------------------------------------------

// --- Banners & lifecycle --------------------------------------------

pub fn banner(port: u16, root: []const u8) void {
    std.debug.print(
        "\x1b[2m──────────────────────────────────────────────────────────\x1b[0m\n" ++
            "\x1b[46;30m READY  \x1b[0m  http://127.0.0.1:{d}  \x1b[2m(root:\x1b[0m \x1b[36m{s}\x1b[0m\x1b[2m, SSR)\x1b[0m\n" ++
            "\x1b[2m──────────────────────────────────────────────────────────\x1b[0m\n",
        .{ port, root },
    );
}

pub fn shutdown() void {
    std.debug.print("\n\x1b[2m STOPPED\x1b[0m 👋\n", .{});
}

pub fn cmsInvalidated() void {
    std.debug.print("\x1b[43;30m FLUSH  \x1b[0m  cms content cache cleared\n", .{});
}

// --- Request outcomes ----------------------------------------------

pub fn ok(device: []const u8, path: []const u8, bytes: u64, kind: []const u8) void {
    std.debug.print(
        "  \x1b[32m200\x1b[0m \x1b[2m[{s}]\x1b[0m {s} \x1b[2m({d} bytes{s})\x1b[0m\n",
        .{ device, path, bytes, kind },
    );
}

pub fn notFound(path: []const u8) void {
    std.debug.print("  \x1b[31m404\x1b[0m {s}\n", .{path});
}

pub fn internalError(path: []const u8, err: anyerror) void {
    std.debug.print(
        "  \x1b[31m500\x1b[0m {s} \x1b[2m({s})\x1b[0m\n",
        .{ path, @errorName(err) },
    );
}

// --- Connection / runtime errors ------------------------------------

pub fn acceptError(err: anyerror) void {
    std.debug.print("  \x1b[31maccept\x1b[0m {s}\n", .{@errorName(err)});
}

pub fn requestError(err: anyerror) void {
    std.debug.print("  \x1b[31mrequest\x1b[0m {s}\n", .{@errorName(err)});
}

pub fn headParseError(err: anyerror) void {
    std.debug.print("  \x1b[33mhead\x1b[0m {s}\n", .{@errorName(err)});
}

// --- Periodic runtime summary --------------------------------------

pub fn statsLine(
    req_total: u64,
    err_total: u64,
    render_max_ns: u64,
    cache_hit_pct: f64,
    rss_bytes: u64,
    cpu_user_ms: i64,
    cpu_sys_ms: i64,
) void {
    std.debug.print(
        "\x1b[44;30m VITALS \x1b[0m" ++
            "  \x1b[2mReq:\x1b[0m \x1b[36m{d}\x1b[0m" ++
            "  \x1b[2mErr:\x1b[0m \x1b[{s}m{d}\x1b[0m" ++
            "  \x1b[2mRenMax:\x1b[0m \x1b[36m{d}µs\x1b[0m" ++
            "  \x1b[2mCHit:\x1b[0m \x1b[36m{d:.0}%\x1b[0m" ++
            "  \x1b[2mMemory:\x1b[0m \x1b[36m{d:.1} MB\x1b[0m" ++
            "  \x1b[2mCPU:\x1b[0m \x1b[36m{d}ms u / {d}ms s\x1b[0m\n",
        .{
            req_total,
            if (err_total > 0) "31" else "2",
            err_total,
            render_max_ns / 1000,
            cache_hit_pct * 100.0,
            @as(f64, @floatFromInt(rss_bytes)) / (1024.0 * 1024.0),
            cpu_user_ms,
            cpu_sys_ms,
        },
    );
}
