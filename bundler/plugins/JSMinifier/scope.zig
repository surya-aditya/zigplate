const std = @import("std");

// A scope is one node in a tree. The root (id = 0) is the module scope.
// Each `{…}` in the source opens a child scope.
pub const Scope = struct {
    parent: ?u32,
    renames: std.StringHashMap([]const u8),
};

// Holds the whole tree plus the in-flight "current" pointer used while
// walking tokens. The walk is done twice (once to build the tree / collect
// declarations, once to emit with renames), so the tree is reusable.
pub const ScopeTree = struct {
    allocator: std.mem.Allocator,
    scopes: std.ArrayList(Scope),
    current: u32,

    pub fn init(allocator: std.mem.Allocator) !ScopeTree {
        var scopes: std.ArrayList(Scope) = .empty;
        // Seed with the root scope.
        try scopes.append(allocator, .{
            .parent = null,
            .renames = std.StringHashMap([]const u8).init(allocator),
        });
        return .{
            .allocator = allocator,
            .scopes = scopes,
            .current = 0,
        };
    }

    pub fn deinit(self: *ScopeTree) void {
        for (self.scopes.items) |*s| s.renames.deinit();
        self.scopes.deinit(self.allocator);
    }

    pub fn isRoot(self: *const ScopeTree) bool {
        return self.current == 0;
    }

    // Create a new child of `current` and descend into it.
    pub fn enter(self: *ScopeTree) !void {
        const child_id: u32 = @intCast(self.scopes.items.len);
        try self.scopes.append(self.allocator, .{
            .parent = self.current,
            .renames = std.StringHashMap([]const u8).init(self.allocator),
        });
        self.current = child_id;
    }

    // Return to `current`'s parent (no-op at the root).
    pub fn exit(self: *ScopeTree) void {
        const cur = self.scopes.items[self.current];
        if (cur.parent) |p| self.current = p;
    }

    // Move the cursor back to the root. Used between pass 1 (declaration
    // collection) and pass 2 (emit) so both walks see the same sequence.
    pub fn rewind(self: *ScopeTree) void {
        self.current = 0;
    }

    // Register `original → mangled` in the given scope.
    pub fn registerIn(self: *ScopeTree, scope_id: u32, original: []const u8, mangled: []const u8) !void {
        try self.scopes.items[scope_id].renames.put(original, mangled);
    }

    pub fn contains(self: *const ScopeTree, scope_id: u32, name: []const u8) bool {
        return self.scopes.items[scope_id].renames.contains(name);
    }

    // Walk up from `current` looking for a rename of `name`.
    pub fn lookup(self: *const ScopeTree, name: []const u8) ?[]const u8 {
        var id: ?u32 = self.current;
        while (id) |i| {
            if (self.scopes.items[i].renames.get(name)) |m| return m;
            id = self.scopes.items[i].parent;
        }
        return null;
    }
};
