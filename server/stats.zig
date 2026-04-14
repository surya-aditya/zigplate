const std = @import("std");

// ---------------------------------------------------------------------
// Runtime observability. All counters are atomic so the request path
// can bump them under any future threading model without extra locks.
// Snapshot is rendered as JSON for `GET /_/stats`.
// ---------------------------------------------------------------------

const Atomic = std.atomic.Value;

pub const ResponseKind = enum {
    html,
    cache_blob,
    static_asset,
    cms_invalidate,
};

pub const Stats = struct {
    start_ms: i64,

    requests_total: Atomic(u64) = .init(0),
    status_2xx: Atomic(u64) = .init(0),
    status_4xx: Atomic(u64) = .init(0),
    status_5xx: Atomic(u64) = .init(0),

    kind_html: Atomic(u64) = .init(0),
    kind_cache_blob: Atomic(u64) = .init(0),
    kind_static: Atomic(u64) = .init(0),
    kind_cms_invalidate: Atomic(u64) = .init(0),

    bytes_out_total: Atomic(u64) = .init(0),

    render_count: Atomic(u64) = .init(0),
    render_ns_total: Atomic(u64) = .init(0),
    render_ns_max: Atomic(u64) = .init(0),

    // Fixed log-scale buckets for render latency — poor-man's histogram.
    // Order matches `bucket_edges_ns` / `bucket_labels`.
    render_buckets: [7]Atomic(u64) = [_]Atomic(u64){.init(0)} ** 7,

    pub fn init() Stats {
        return .{ .start_ms = std.time.milliTimestamp() };
    }

    pub fn recordResponse(
        self: *Stats,
        status: std.http.Status,
        kind: ResponseKind,
        bytes: u64,
    ) void {
        _ = self.requests_total.fetchAdd(1, .monotonic);
        const code = @intFromEnum(status);
        if (code < 300) {
            _ = self.status_2xx.fetchAdd(1, .monotonic);
        } else if (code < 500) {
            _ = self.status_4xx.fetchAdd(1, .monotonic);
        } else {
            _ = self.status_5xx.fetchAdd(1, .monotonic);
        }

        const kind_counter = switch (kind) {
            .html => &self.kind_html,
            .cache_blob => &self.kind_cache_blob,
            .static_asset => &self.kind_static,
            .cms_invalidate => &self.kind_cms_invalidate,
        };
        _ = kind_counter.fetchAdd(1, .monotonic);
        _ = self.bytes_out_total.fetchAdd(bytes, .monotonic);
    }

    pub fn recordRender(self: *Stats, ns: u64) void {
        _ = self.render_count.fetchAdd(1, .monotonic);
        _ = self.render_ns_total.fetchAdd(ns, .monotonic);
        while (true) {
            const cur = self.render_ns_max.load(.monotonic);
            if (ns <= cur) break;
            _ = self.render_ns_max.cmpxchgStrong(cur, ns, .monotonic, .monotonic) orelse break;
        }
        _ = self.render_buckets[bucketFor(ns)].fetchAdd(1, .monotonic);
    }

    const bucket_labels = [_][]const u8{
        "<10us", "10-100us", "100us-1ms", "1-10ms", "10-100ms", "100ms-1s", ">=1s",
    };

    fn bucketFor(ns: u64) usize {
        if (ns < 10_000) return 0;
        if (ns < 100_000) return 1;
        if (ns < 1_000_000) return 2;
        if (ns < 10_000_000) return 3;
        if (ns < 100_000_000) return 4;
        if (ns < 1_000_000_000) return 5;
        return 6;
    }

    // Emits a JSON snapshot combining self + the CMS store + the render
    // cache + rusage() into one payload.
    pub fn writeJson(
        self: *Stats,
        w: anytype,
        cms_store: anytype,
        render_cache: anytype,
    ) !void {
        const now_ms = std.time.milliTimestamp();
        const uptime_ms = now_ms - self.start_ms;

        const rt = self.requests_total.load(.monotonic);
        const s2 = self.status_2xx.load(.monotonic);
        const s4 = self.status_4xx.load(.monotonic);
        const s5 = self.status_5xx.load(.monotonic);

        const kh = self.kind_html.load(.monotonic);
        const kc = self.kind_cache_blob.load(.monotonic);
        const ks = self.kind_static.load(.monotonic);
        const ki = self.kind_cms_invalidate.load(.monotonic);

        const bytes_out = self.bytes_out_total.load(.monotonic);

        const rc = self.render_count.load(.monotonic);
        const rns_total = self.render_ns_total.load(.monotonic);
        const rns_max = self.render_ns_max.load(.monotonic);
        const rns_avg: u64 = if (rc > 0) rns_total / rc else 0;

        const cache_snap = render_cache.snapshot();

        const ru = std.posix.getrusage(std.posix.rusage.SELF);
        const user_ms = @as(i64, ru.utime.sec) * 1000 + @divFloor(ru.utime.usec, 1000);
        const sys_ms = @as(i64, ru.stime.sec) * 1000 + @divFloor(ru.stime.usec, 1000);

        try w.print(
            \\{{"uptime_ms":{d},"started_ms":{d},"requests":{{"total":{d},"2xx":{d},"4xx":{d},"5xx":{d},"html":{d},"cache_blob":{d},"static":{d},"cms_invalidate":{d},"bytes_out":{d}}},"render":{{"count":{d},"avg_ns":{d},"max_ns":{d},"total_ns":{d},"buckets":{{
        , .{
            uptime_ms, self.start_ms, rt, s2, s4, s5,
            kh, kc, ks, ki, bytes_out,
            rc, rns_avg, rns_max, rns_total,
        });

        inline for (bucket_labels, 0..) |label, i| {
            if (i > 0) try w.writeAll(",");
            try w.print("\"{s}\":{d}", .{ label, self.render_buckets[i].load(.monotonic) });
        }

        try w.print(
            \\}}}},"cache":{{"hits":{d},"misses":{d},"invalidations":{d},"version":{d},"d_bytes":{d},"m_bytes":{d}}},"cms":{{"entries":{d},"version":{d}}},"process":{{"rss_bytes":{d},"user_cpu_ms":{d},"sys_cpu_ms":{d}}}}}
        , .{
            cache_snap.hits,          cache_snap.misses,
            cache_snap.invalidations, cache_snap.version,
            cache_snap.d_bytes,       cache_snap.m_bytes,
            cms_store.entriesCount(), cms_store.currentVersion(),
            rssBytes(ru),             user_ms,
            sys_ms,
        });
    }
};

pub fn rssBytes(ru: std.posix.rusage) u64 {
    // macOS reports maxrss in BYTES; Linux reports it in KiB. Detect by
    // tag to keep the JSON field consistent cross-platform.
    const max: u64 = @intCast(ru.maxrss);
    return if (@import("builtin").os.tag == .macos) max else max * 1024;
}
