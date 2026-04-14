const std = @import("std");
const h = @import("html");
const manifest = @import("manifest");
const cms_mod = @import("cms");

pub const CmsStore = cms_mod.Store;
pub const Content = cms_mod.Content;

// RenderCtx is the lookup table `h.writeTemplate` walks through. Every
// `{key}` placeholder in a page or shell template maps to one branch
// here — add a key and every page that uses it sees it.
pub const RenderCtx = struct {
    content: Content,
    device: []const u8,

    pub fn get(self: RenderCtx, key: []const u8) []const u8 {
        if (std.mem.eql(u8, key, "title")) return self.content.title;
        if (std.mem.eql(u8, key, "device")) return self.device;
        return self.content.get(key);
    }
};

// ---------------------------------------------------------------------
// Per-device JSON cache blob with memoisation keyed on store version.
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

    fn slotFor(device: []const u8) ?usize {
        if (std.mem.eql(u8, device, "d")) return 0;
        if (std.mem.eql(u8, device, "m")) return 1;
        return null;
    }

    pub fn getBlob(
        self: *Cache,
        device: []const u8,
        store: *CmsStore,
    ) ![]const u8 {
        const slot = slotFor(device) orelse return error.UnknownDevice;
        const current = store.currentVersion();

        self.mu.lock();
        defer self.mu.unlock();

        const e = &self.entries[slot];
        if (e.blob) |b| if (e.version == current) return b;

        if (e.blob) |b| self.gpa.free(b);
        e.blob = null;

        var buf: std.ArrayList(u8) = .empty;
        errdefer buf.deinit(self.gpa);
        try renderCacheBlob(buf.writer(self.gpa), device, store);
        e.blob = try buf.toOwnedSlice(self.gpa);
        e.version = current;
        return e.blob.?;
    }
};

// ---------------------------------------------------------------------
// Rendering.
// ---------------------------------------------------------------------

pub fn renderDocument(
    w: anytype,
    path: []const u8,
    device: []const u8,
    store: *CmsStore,
) !void {
    const i = manifest.findIndex(path) orelse return error.NotFound;
    const page = manifest.pages[i];
    const content = store.get(path) orelse Content{ .title = page.default_title };
    const ctx = RenderCtx{ .content = content, .device = device };
    try h.writeTemplate(w, page.full_template, ctx);
}

pub fn renderCacheBlob(
    w: anytype,
    device: []const u8,
    store: *CmsStore,
) !void {
    try w.writeAll("{\"body\":\"");
    {
        const ctx = RenderCtx{
            .content = .{ .title = "" },
            .device = device,
        };
        var esc = jsonEscaper(w);
        try h.writeTemplate(&esc, manifest.empty_document, ctx);
    }
    try w.writeAll("\",\"cache\":{");

    var first = true;
    for (manifest.pages) |p| {
        if (!first) try w.writeAll(",");
        first = false;
        const content = store.get(p.path) orelse Content{ .title = p.default_title };
        const ctx = RenderCtx{ .content = content, .device = device };

        try w.writeByte('"');
        try writeJsonEscaped(w, p.path);
        try w.writeAll("\":{\"title\":\"");
        try writeJsonEscaped(w, content.title);
        try w.writeAll("\",\"html\":\"");
        {
            var esc = jsonEscaper(w);
            try h.writeTemplate(&esc, p.body_template, ctx);
        }
        try w.writeAll("\"}");
    }

    try w.writeAll("},\"routes\":{");
    first = true;
    for (manifest.pages) |p| {
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
