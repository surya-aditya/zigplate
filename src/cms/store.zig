const std = @import("std");

// ---------------------------------------------------------------------
// CMS store — in-memory snapshot of the content that drives every page.
//
// The shape here is deliberately generic: `fields` is a flat string map
// so adding a new CMS field doesn't require touching the store. Page
// render functions look up the keys they care about via `get`.
//
// Source-of-truth flow (once a real CMS is wired in):
//
//   1. Server boot → `Store.init` → `Store.seed` fills defaults.
//   2. CMS fetch adapter (Sanity / Prismic / custom) calls
//      `Store.replace(route, Content)` under the write lock.
//   3. `POST /_cms/invalidate` bumps `version` so the render cache
//      knows to regenerate on the next request.
// ---------------------------------------------------------------------

pub const Content = struct {
    title: []const u8,
    // Flat `key -> value` map; owners of the values are tracked by
    // `Store` via `arena`. Keys are the same across pages (e.g.
    // "heading", "body") so templates stay simple.
    fields: std.StringHashMapUnmanaged([]const u8) = .{},

    pub fn get(self: Content, key: []const u8) []const u8 {
        return self.fields.get(key) orelse "";
    }
};

pub const Store = struct {
    gpa: std.mem.Allocator,
    // All content strings are owned by this arena so replacing a route
    // is a matter of resetting the per-route sub-arena.
    arena: std.heap.ArenaAllocator,
    mu: std.Thread.RwLock = .{},
    entries: std.StringHashMapUnmanaged(Content) = .{},
    // Monotonic — incremented on every mutation so caches can detect
    // staleness without comparing content.
    version: u64 = 0,

    pub fn init(gpa: std.mem.Allocator) Store {
        return .{
            .gpa = gpa,
            .arena = std.heap.ArenaAllocator.init(gpa),
        };
    }

    pub fn deinit(self: *Store) void {
        self.entries.deinit(self.gpa);
        self.arena.deinit();
    }

    // Read snapshot. Caller must not hold the returned slices past the
    // next `replace` / `seed` / `clear` — but since those only fire on
    // CMS updates behind a write lock and we render atomically per
    // request, that's fine for our single-request rendering model.
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

    // Replace the entry for `route` with `content`. Strings in `content`
    // are copied into the store's arena so the caller can free its
    // temporaries immediately after.
    pub fn replace(self: *Store, route: []const u8, content: Content) !void {
        self.mu.lock();
        defer self.mu.unlock();

        const a = self.arena.allocator();
        const owned_route = try a.dupe(u8, route);
        var owned = Content{ .title = try a.dupe(u8, content.title) };

        var it = content.fields.iterator();
        while (it.next()) |e| {
            try owned.fields.put(a, try a.dupe(u8, e.key_ptr.*), try a.dupe(u8, e.value_ptr.*));
        }

        try self.entries.put(self.gpa, owned_route, owned);
        self.version +%= 1;
    }

    // Seed with defaults so the server can render before the real CMS
    // adapter reports in.
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

    // Discard everything and bump the version so caches rebuild.
    pub fn clear(self: *Store) void {
        self.mu.lock();
        defer self.mu.unlock();
        self.entries.clearRetainingCapacity();
        _ = self.arena.reset(.retain_capacity);
        self.version +%= 1;
    }
};
