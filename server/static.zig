const std = @import("std");

// Handle a single HTTP connection by serving a static file from `root`.
//
// HTML requests are routed through a per-device lookup: `/about.html`
// becomes `public/about.<d|m>.html` depending on the User-Agent header.
// That way the browser receives a fully pre-rendered, device-specific
// document with the right JS bundle tag already baked in — no runtime
// sniffing, no flash-of-wrong-layout.
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

    // Extract path + query separately so `/about?d=d` matches `/about`.
    const q_pos = std.mem.indexOfScalar(u8, target, '?');
    const raw_path = if (q_pos) |p| target[0..p] else target;
    const query = if (q_pos) |p| target[p + 1 ..] else "";

    const path = if (std.mem.eql(u8, raw_path, "/")) "/index.html" else raw_path;
    const clean = path;

    if (std.mem.indexOf(u8, clean, "..") != null) {
        try req.respond("forbidden", .{ .status = .forbidden });
        return;
    }

    // Detect the device from the User-Agent once; reused if this is HTML.
    const device = detectDevice(&req);

    // `?d=<device>` requests serve the cache JSON for that device. The
    // pathname is ignored for content (we still validate it has been
    // passed) — same convention as ybp's app/server/handler.ts.
    const cache_device = queryDevice(query);

    // Compute the filesystem path. For `.html` routes we prefer the
    // pre-rendered per-device variant; fall back to the plain file.
    // For `?d=` requests we serve the matching cache file directly.
    const fs_path = if (cache_device) |dev|
        try std.fmt.allocPrint(allocator, "{s}/cache/{s}.json", .{ root, dev })
    else
        try resolvePath(allocator, root, clean, device);
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

    const ctype = contentType(fs_path);
    try req.respond(body, .{
        .status = .ok,
        .extra_headers = &.{.{ .name = "content-type", .value = ctype }},
    });
    std.debug.print(
        "  \x1b[32m200\x1b[0m \x1b[2m[{s}]\x1b[0m {s} \x1b[2m({d} bytes)\x1b[0m\n",
        .{ device, clean, stat.size },
    );
}

// Resolve a request path to a filesystem path.
//
// HTML routing — clean URLs without an extension are treated as page
// routes and resolved to `<page>.<device>.html`:
//
//   /            → public/index.<d>.html
//   /about       → public/about.<d>.html
//   /about.html  → public/about.<d>.html      (legacy, also supported)
//
// Anything that DOES have an extension (.css, .js, .png, …) skips the
// page-route logic and is served directly.
fn resolvePath(
    allocator: std.mem.Allocator,
    root: []const u8,
    clean: []const u8,
    device: []const u8,
) ![]u8 {
    if (std.mem.eql(u8, clean, "/")) {
        return std.fmt.allocPrint(allocator, "{s}/index.{s}.html", .{ root, device });
    }

    const rel = clean[1..]; // strip leading '/'
    const stem = if (std.mem.endsWith(u8, rel, ".html"))
        rel[0 .. rel.len - ".html".len]
    else if (std.mem.indexOfScalar(u8, rel, '.') == null)
        rel
    else
        return std.fs.path.join(allocator, &.{ root, rel }); // static asset

    const variant = try std.fmt.allocPrint(allocator, "{s}/{s}.{s}.html", .{ root, stem, device });
    errdefer allocator.free(variant);

    // Fall back to a plain `<stem>.html` if the per-device variant is missing.
    std.fs.cwd().access(variant, .{}) catch {
        allocator.free(variant);
        return std.fmt.allocPrint(allocator, "{s}/{s}.html", .{ root, stem });
    };
    return variant;
}

// Pick `d` or `m` out of the query string when the client asks for the
// cache JSON, e.g. `/about?d=m`. Returns null when there's no `d=` key.
fn queryDevice(query: []const u8) ?[]const u8 {
    var it = std.mem.tokenize(u8, query, "&");
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
    // Very small sniff list — good enough for the prerender dispatch and
    // matches the heuristic the reference ybp client used.
    const mobile_needles = [_][]const u8{ "Mobi", "Android", "iPhone", "iPad", "iPod" };
    for (mobile_needles) |needle| {
        if (std.ascii.indexOfIgnoreCase(ua, needle) != null) return "m";
    }
    return "d";
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
