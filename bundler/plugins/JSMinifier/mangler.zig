const std = @import("std");
const lexer = @import("lexer.zig");
const names = @import("names.zig");
const scope_mod = @import("scope.zig");
const declare = @import("declare.zig");
const emit = @import("emit.zig");
const properties = @import("properties.zig");

// Per-call knobs. Defaults are "as aggressive as safely possible" so the
// out-of-the-box build produces the smallest valid output.
pub const Options = struct {
    // Rename class method names (e.g. `speak()` → `a()`) and every
    // `.speak` access to match. Safe only when nothing outside the mangle
    // pass references those names — see properties.zig for the caveats.
    mangle_properties: bool = true,
};

// Public entry point. Renames local identifiers in `src` to short forms
// while leaving globals, reserved words, and unmangled property accesses
// untouched. The caller owns the returned buffer.
pub fn mangle(allocator: std.mem.Allocator, src: []const u8) ![]u8 {
    return mangleWith(allocator, src, .{});
}

pub fn mangleWith(allocator: std.mem.Allocator, src: []const u8, opts: Options) ![]u8 {
    const tokens = try lexer.tokenize(allocator, src);
    defer allocator.free(tokens);

    var tree = try scope_mod.ScopeTree.init(allocator);
    defer tree.deinit();

    // Owns every short name allocated during mangling. Freed at the end.
    var name_storage: std.ArrayList([]u8) = .empty;
    defer {
        for (name_storage.items) |n| allocator.free(n);
        name_storage.deinit(allocator);
    }

    var gen = names.NameGen{};

    const scope_of_token = try declare.collect(allocator, &tree, &gen, &name_storage, tokens, src);
    defer allocator.free(scope_of_token);

    // Always discover class-method declaration positions so emit can
    // keep their names verbatim (decorator helpers reference them by
    // string). When property mangling is enabled we ALSO assign short
    // names; when disabled we drop the rename map but keep the decl
    // markers so scope-mangling can't accidentally rewrite them.
    var props = try properties.collect(allocator, tokens, src, &gen, &name_storage);
    defer props.deinit();
    if (!opts.mangle_properties) props.map.clearRetainingCapacity();

    return emit.emit(allocator, &tree, &props, tokens, src, scope_of_token);
}
