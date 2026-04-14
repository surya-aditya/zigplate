const std = @import("std");
const h = @import("html");
const document = @import("document");
const router = @import("router");
const cms_mod = @import("cms");

pub const CmsStore = cms_mod.Store;
pub const Content = cms_mod.Content;

pub const ShellCtx = struct {
    title: []const u8,
    device: []const u8,
    content: []const u8,

    pub fn get(self: ShellCtx, key: []const u8) []const u8 {
        return h.ctxGet(self, key);
    }
};

// ---------------------------------------------------------------------
// Per-device JSON cache blob, memoised on store version.
// ---------------------------------------------------------------------

pub const Cache = struct {
    gpa: std.mem.Allocator,
    mu: std.Thread.Mutex = .{},
    entries: [2]Entry = .{ .{}, .{} },

    const Entry = struct {
        version: u64 = std.math.maxInt(u64),
        blob: ?[]u8 = null,
    };

    pub fn init(gpa: std.mem.Allocator) Cache {
        return .{ .gpa = gpa };
    }

    pub fn deinit(self: *Cache) void {
        self.mu.lock();
        defer self.mu.unlock();
        for (&self.entries) |*e| if (e.blob) |b| self.gpa.free(b);
    }

    pub fn invalidate(self: *Cache) void {
        self.mu.lock();
        defer self.mu.unlock();
        for (&self.entries) |*e| {
            if (e.blob) |b| self.gpa.free(b);
            e.blob = null;
            e.version = std.math.maxInt(u64);
        }
    }

    pub fn getBlob(
        self: *Cache,
        device: []const u8,
        store: *CmsStore,
    ) ![]const u8 {
        const slot = router.deviceIdx(device);
        const current = store.currentVersion();

        self.mu.lock();
        defer self.mu.unlock();

        const e = &self.entries[slot];
        if (e.blob) |b| if (e.version == current) return b;

        if (e.blob) |b| self.gpa.free(b);
        e.blob = null;

        var buf: std.ArrayList(u8) = .empty;
        errdefer buf.deinit(self.gpa);
        try renderCacheBlob(self.gpa, buf.writer(self.gpa), device, store);
        e.blob = try buf.toOwnedSlice(self.gpa);
        e.version = current;
        return e.blob.?;
    }
};

// ---------------------------------------------------------------------
// Request-time rendering.
// ---------------------------------------------------------------------

pub fn renderDocument(
    allocator: std.mem.Allocator,
    w: anytype,
    path: []const u8,
    device: []const u8,
    store: *CmsStore,
) !void {
    const idx = router.find(path) orelse return error.NotFound;
    const page = router.pages[idx];
    const content = store.get(path) orelse Content{ .title = page.default_title };

    // Pass 1 — page body into a buffer.
    var body_buf: std.ArrayList(u8) = .empty;
    defer body_buf.deinit(allocator);
    try router.renderBody(idx, body_buf.writer(allocator), allocator, device, content);

    // Pass 2 — envelope around it.
    const shell = ShellCtx{
        .title = content.title,
        .device = device,
        .content = body_buf.items,
    };
    try h.writeTemplate(w, document.template, shell);
}

pub fn renderCacheBlob(
    allocator: std.mem.Allocator,
    w: anytype,
    device: []const u8,
    store: *CmsStore,
) !void {
    try w.writeAll("{\"body\":\"");
    {
        const shell = ShellCtx{ .title = "", .device = device, .content = "" };
        var esc = jsonEscaper(w);
        try h.writeTemplate(&esc, document.empty, shell);
    }
    try w.writeAll("\",\"cache\":{");

    var first = true;
    for (router.pages, 0..) |p, idx| {
        if (!first) try w.writeAll(",");
        first = false;
        const content = store.get(p.path) orelse Content{ .title = p.default_title };

        try w.writeByte('"');
        try writeJsonEscaped(w, p.path);
        try w.writeAll("\":{\"title\":\"");
        try writeJsonEscaped(w, content.title);
        try w.writeAll("\",\"html\":\"");
        {
            var esc = jsonEscaper(w);
            try router.renderBody(idx, &esc, allocator, device, content);
        }
        try w.writeAll("\"}");
    }

    try w.writeAll("},\"routes\":{");
    first = true;
    for (router.pages) |p| {
        if (!first) try w.writeAll(",");
        first = false;
        try w.writeByte('"');
        try writeJsonEscaped(w, p.path);
        try w.writeAll("\":\"");
        try writeJsonEscaped(w, p.code);
        try w.writeByte('"');
    }
    try w.writeAll("},\"data\":{}}");
}

// ---- JSON escaping ---------------------------------------------------

fn writeJsonEscaped(w: anytype, s: []const u8) !void {
    for (s) |c| try writeEscapedByte(w, c);
}

fn writeEscapedByte(w: anytype, c: u8) !void {
    switch (c) {
        '"' => try w.writeAll("\\\""),
        '\\' => try w.writeAll("\\\\"),
        '\n' => try w.writeAll("\\n"),
        '\r' => try w.writeAll("\\r"),
        '\t' => try w.writeAll("\\t"),
        '/' => try w.writeAll("\\/"),
        0...0x08, 0x0B, 0x0C, 0x0E...0x1F => try w.print("\\u{x:0>4}", .{c}),
        else => try w.writeByte(c),
    }
}

fn JsonEscaper(comptime Inner: type) type {
    return struct {
        inner: Inner,
        const Self = @This();
        pub fn writeAll(self: *Self, bytes: []const u8) !void {
            for (bytes) |c| try writeEscapedByte(self.inner, c);
        }
        pub fn writeByte(self: *Self, c: u8) !void {
            try writeEscapedByte(self.inner, c);
        }
        pub fn print(self: *Self, comptime fmt: []const u8, args: anytype) !void {
            var buf: [256]u8 = undefined;
            const s = try std.fmt.bufPrint(&buf, fmt, args);
            try self.writeAll(s);
        }
    };
}

fn jsonEscaper(inner: anytype) JsonEscaper(@TypeOf(inner)) {
    return .{ .inner = inner };
}
