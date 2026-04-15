const std = @import("std");
const render = @import("render.zig");
const stats_mod = @import("stats.zig");
const log = @import("log.zig");

// ---------------------------------------------------------------------
// Request handler.
//
//   * `/_/stats`                   → JSON observability snapshot
//   * `/_cms/invalidate`           → wipe render cache
//   * `/<route>?d=<device>`        → SSR JSON cache blob
//   * `/`, `/about`, ...           → SSR full HTML document
//   * everything else              → static file from `root`
// ---------------------------------------------------------------------

pub const Ctx = struct {
    root: []const u8,
    store: *render.CmsStore,
    cache: *render.Cache,
    stats: *stats_mod.Stats,
};

// Max bytes we'll hold in memory for a single static-asset response.
// Everything above this is refused with 413 — keeps RSS predictable
// even if someone drops a huge file in public/ by mistake.
const max_static_bytes: u64 = 16 * 1024 * 1024;

// Connection-level timeouts. Both directions — so a stalled client
// can't pin a handler forever.
const io_timeout_seconds: i64 = 15;

// Emit the STATS summary line every N completed requests. 1 = every
// request (noisy-but-obvious in dev). Bump to 10/100 for production.
const stats_print_every: u64 = 1;

pub fn handle(
    parent_allocator: std.mem.Allocator,
    conn: std.net.Server.Connection,
    ctx: Ctx,
) !void {
    defer conn.stream.close();
    setSocketTimeouts(conn.stream.handle);

    // Per-request arena: every allocation below drops in one deinit
    // at the end of the request, regardless of error path.
    var arena = std.heap.ArenaAllocator.init(parent_allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    // One-line STATS summary every N completed requests.
    defer maybePrintStats(ctx);

    var read_buf: [8192]u8 = undefined;
    var write_buf: [8192]u8 = undefined;
    var stream_reader = conn.stream.reader(&read_buf);
    var stream_writer = conn.stream.writer(&write_buf);
    var server = std.http.Server.init(stream_reader.interface(), &stream_writer.interface);

    var req = server.receiveHead() catch |err| {
        log.headParseError(err);
        return;
    };
    const target = req.head.target;

    const q_pos = std.mem.indexOfScalar(u8, target, '?');
    const raw_path = if (q_pos) |p| target[0..p] else target;
    const query = if (q_pos) |p| target[p + 1 ..] else "";

    if (std.mem.indexOf(u8, raw_path, "..") != null) {
        try req.respond("forbidden", .{ .status = .forbidden });
        ctx.stats.recordResponse(.forbidden, .static_asset, "forbidden".len);
        return;
    }

    const device = detectDevice(&req);

    // Stats endpoint — always JSON, always uncached.
    if (std.mem.eql(u8, raw_path, "/_/stats")) {
        try handleStats(allocator, &req, ctx);
        return;
    }

    // CMS webhook — invalidates the per-device render cache.
    if (std.mem.eql(u8, raw_path, "/_cms/invalidate")) {
        ctx.cache.invalidate();
        try req.respond("ok", .{
            .status = .ok,
            .extra_headers = &.{.{ .name = "content-type", .value = "text/plain" }},
        });
        ctx.stats.recordResponse(.ok, .cms_invalidate, 2);
        log.cmsInvalidated();
        return;
    }

    // The per-device cache blob is now prerendered to `public/<dev>.json`
    // at build time and served by the static-asset path below. No
    // dynamic `?d=X` handling needed.
    _ = query;

    // HTML routes → SSR.
    if (isPageRoute(raw_path)) {
        const normalized = normalizePath(raw_path);
        // Arena-backed buffer: no explicit deinit needed.
        var buf: std.ArrayList(u8) = .empty;

        const render_start = std.time.nanoTimestamp();
        render.renderDocument(allocator, buf.writer(allocator), normalized, device, ctx.store) catch |err| switch (err) {
            error.NotFound => {
                try req.respond("not found", .{ .status = .not_found });
                ctx.stats.recordResponse(.not_found, .html, 0);
                log.notFound(raw_path);
                return;
            },
            else => {
                try req.respond("render error", .{ .status = .internal_server_error });
                ctx.stats.recordResponse(.internal_server_error, .html, 0);
                log.internalError(raw_path, err);
                return;
            },
        };

        const render_ns: u64 = @intCast(std.time.nanoTimestamp() - render_start);
        ctx.stats.recordRender(render_ns);

        try req.respond(buf.items, .{
            .status = .ok,
            .extra_headers = &.{.{ .name = "content-type", .value = "text/html; charset=utf-8" }},
        });
        ctx.stats.recordResponse(.ok, .html, buf.items.len);
        log.ok(device, raw_path, buf.items.len, " SSR");
        return;
    }

    // Static asset passthrough.
    const rel = if (raw_path.len > 0 and raw_path[0] == '/') raw_path[1..] else raw_path;
    const fs_path = try std.fs.path.join(allocator, &.{ ctx.root, rel });

    const file = std.fs.cwd().openFile(fs_path, .{}) catch {
        try req.respond("not found", .{ .status = .not_found });
        ctx.stats.recordResponse(.not_found, .static_asset, 0);
        log.notFound(raw_path);
        return;
    };
    defer file.close();

    const stat = try file.stat();
    if (stat.size > max_static_bytes) {
        try req.respond("payload too large", .{ .status = .payload_too_large });
        ctx.stats.recordResponse(.payload_too_large, .static_asset, 0);
        log.internalError(raw_path, error.StaticAssetTooLarge);
        return;
    }
    // Arena alloc — freed along with everything else on request exit.
    const body = try allocator.alloc(u8, stat.size);
    _ = try file.readAll(body);

    const ctype = contentType(fs_path);
    const cc: []const u8 = if (isHashedAsset(raw_path))
        "public, max-age=31536000, immutable"
    else
        "public, max-age=60";

    try req.respond(body, .{
        .status = .ok,
        .extra_headers = &.{
            .{ .name = "content-type", .value = ctype },
            .{ .name = "cache-control", .value = cc },
        },
    });

    ctx.stats.recordResponse(.ok, .static_asset, stat.size);
    log.ok(device, raw_path, stat.size, "");
}

fn maybePrintStats(ctx: Ctx) void {
    const total = ctx.stats.requests_total.load(.monotonic);
    if (total == 0 or total % stats_print_every != 0) return;

    const errs = ctx.stats.status_4xx.load(.monotonic) + ctx.stats.status_5xx.load(.monotonic);
    const max_ns = ctx.stats.render_ns_max.load(.monotonic);

    const cache_snap = ctx.cache.snapshot();
    const total_cache = cache_snap.hits + cache_snap.misses;
    const hit_pct: f64 = if (total_cache > 0)
        @as(f64, @floatFromInt(cache_snap.hits)) / @as(f64, @floatFromInt(total_cache))
    else
        0.0;

    const ru = std.posix.getrusage(std.posix.rusage.SELF);
    const user_ms = @as(i64, ru.utime.sec) * 1000 + @divFloor(ru.utime.usec, 1000);
    const sys_ms = @as(i64, ru.stime.sec) * 1000 + @divFloor(ru.stime.usec, 1000);

    log.statsLine(total, errs, max_ns, hit_pct, stats_mod.rssBytes(ru), user_ms, sys_ms);
}

fn handleStats(
    allocator: std.mem.Allocator,
    req: *std.http.Server.Request,
    ctx: Ctx,
) !void {
    // Arena-backed; freed when the parent request's arena deinits.
    var buf: std.ArrayList(u8) = .empty;

    try ctx.stats.writeJson(buf.writer(allocator), ctx.store, ctx.cache);
    try req.respond(buf.items, .{
        .status = .ok,
        .extra_headers = &.{
            .{ .name = "content-type", .value = "application/json" },
            .{ .name = "cache-control", .value = "no-store" },
        },
    });
    // Intentionally not counted in request stats — would be self-referential.
}

// Matches content-addressed filenames produced by AssetHash:
// `<stem>.<16-hex>.<ext>` — safe to cache forever.
fn isHashedAsset(path: []const u8) bool {
    const slash = std.mem.lastIndexOfScalar(u8, path, '/') orelse return false;
    const basename = path[slash + 1 ..];
    const last = std.mem.lastIndexOfScalar(u8, basename, '.') orelse return false;
    const penult = std.mem.lastIndexOfScalar(u8, basename[0..last], '.') orelse return false;
    const hash = basename[penult + 1 .. last];

    if (hash.len != 16) return false;

    for (hash) |c| {
        const ok = (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f');

        if (!ok) return false;
    }
    return true;
}

// "/" or a path with no trailing extension.
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

// Apply send/recv timeouts to an accepted socket so a stalled client
// can't pin a handler indefinitely. Failures are ignored — the server
// still works without timeouts.
fn setSocketTimeouts(fd: std.posix.socket_t) void {
    const tv = std.posix.timeval{
        .sec = @intCast(io_timeout_seconds),
        .usec = 0,
    };
    const bytes = std.mem.asBytes(&tv);
    std.posix.setsockopt(fd, std.posix.SOL.SOCKET, std.posix.SO.RCVTIMEO, bytes) catch {};
    std.posix.setsockopt(fd, std.posix.SOL.SOCKET, std.posix.SO.SNDTIMEO, bytes) catch {};
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
