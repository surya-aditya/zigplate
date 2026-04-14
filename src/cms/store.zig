const std = @import("std");

// ---------------------------------------------------------------------
// CMS store — in-memory snapshot of every route's content.
//
// Each entry owns its own strings (title, field keys, field values),
// allocated through the store's backing allocator. `replace` frees the
// previous entry's strings before installing the new one — so repeated
// CMS updates for the same route don't grow memory indefinitely.
// ---------------------------------------------------------------------

pub const Content = struct {
    title: []const u8,
    fields: std.StringHashMapUnmanaged([]const u8) = .{},

    pub fn get(self: Content, key: []const u8) []const u8 {
        return self.fields.get(key) orelse "";
    }
};

pub const Store = struct {
    gpa: std.mem.Allocator,
    mu: std.Thread.RwLock = .{},
    entries: std.StringHashMapUnmanaged(Content) = .{},
    version: u64 = 0,

    pub fn init(gpa: std.mem.Allocator) Store {
        return .{ .gpa = gpa };
    }

    pub fn deinit(self: *Store) void {
        self.mu.lock();
        defer self.mu.unlock();
        freeAllEntries(self.gpa, &self.entries);
    }

    pub fn get(self: *Store, route: []const u8) ?Content {
        self.mu.lockShared();
        defer self.mu.unlockShared();
        return self.entries.get(route);
    }

    pub fn currentVersion(self: *Store) u64 {
        self.mu.lockShared();
        defer self.mu.unlockShared();
        return self.version;
    }

    pub fn entriesCount(self: *Store) usize {
        self.mu.lockShared();
        defer self.mu.unlockShared();
        return self.entries.count();
    }

    // Replace the entry for `route`. `content`'s strings are duplicated
    // into the store; the previous entry (if any) is freed.
    pub fn replace(self: *Store, route: []const u8, content: Content) !void {
        var cloned = try cloneContent(self.gpa, content);
        errdefer freeContent(self.gpa, &cloned);

        self.mu.lock();
        defer self.mu.unlock();

        const gop = try self.entries.getOrPut(self.gpa, route);
        if (gop.found_existing) {
            freeContent(self.gpa, gop.value_ptr);
        } else {
            const owned_key = try self.gpa.dupe(u8, route);
            // Overwrite the hashmap's non-owning key with our duplicate so
            // the store no longer borrows the caller's `route` slice.
            gop.key_ptr.* = owned_key;
        }
        gop.value_ptr.* = cloned;
        self.version +%= 1;
    }

    pub fn seed(self: *Store) !void {
        {
            var c = Content{ .title = "Home" };
            defer c.fields.deinit(self.gpa);
            try c.fields.put(self.gpa, "heading", "zigplate");
            try c.fields.put(self.gpa, "subtitle", "Rendered server-side, per device, on every request.");
            try self.replace("/", c);
        }
        {
            var c = Content{ .title = "About" };
            defer c.fields.deinit(self.gpa);
            try c.fields.put(self.gpa, "heading", "About");
            try c.fields.put(self.gpa, "body", "Zig for server + bundler + SSR; TypeScript for the client.");
            try self.replace("/about", c);
        }
    }

    pub fn clear(self: *Store) void {
        self.mu.lock();
        defer self.mu.unlock();
        freeAllEntries(self.gpa, &self.entries);
        self.version +%= 1;
    }
};

fn cloneContent(gpa: std.mem.Allocator, src: Content) !Content {
    var cloned = Content{ .title = try gpa.dupe(u8, src.title) };
    errdefer freeContent(gpa, &cloned);

    var it = src.fields.iterator();
    while (it.next()) |e| {
        const k = try gpa.dupe(u8, e.key_ptr.*);
        errdefer gpa.free(k);
        const v = try gpa.dupe(u8, e.value_ptr.*);
        errdefer gpa.free(v);
        try cloned.fields.put(gpa, k, v);
    }
    return cloned;
}

fn freeContent(gpa: std.mem.Allocator, c: *Content) void {
    var it = c.fields.iterator();
    while (it.next()) |e| {
        gpa.free(@constCast(e.key_ptr.*));
        gpa.free(@constCast(e.value_ptr.*));
    }
    c.fields.deinit(gpa);
    gpa.free(@constCast(c.title));
    c.* = .{ .title = "" };
}

fn freeAllEntries(gpa: std.mem.Allocator, entries: *std.StringHashMapUnmanaged(Content)) void {
    var it = entries.iterator();
    while (it.next()) |e| {
        gpa.free(@constCast(e.key_ptr.*));
        freeContent(gpa, e.value_ptr);
    }
    entries.clearRetainingCapacity();
}
