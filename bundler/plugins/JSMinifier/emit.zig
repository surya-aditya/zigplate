const std = @import("std");
const lexer = @import("lexer.zig");
const scope_mod = @import("scope.zig");
const properties = @import("properties.zig");

const Token = lexer.Token;
const ScopeTree = scope_mod.ScopeTree;
const PropertyMap = properties.PropertyMap;

// Walk the tokens once more and emit them into `out`. Identifiers are
// looked up in the scope chain (for locals) or the property map (for
// class methods) and replaced with their mangled name.
pub fn emit(
    allocator: std.mem.Allocator,
    tree: *ScopeTree,
    props: *const PropertyMap,
    tokens: []const Token,
    src: []const u8,
    scope_of_token: []const u32,
) ![]u8 {
    var out = std.ArrayList(u8).init(allocator);
    errdefer out.deinit();

    tree.rewind();

    for (tokens, 0..) |tok, i| {
        tree.current = scope_of_token[i];

        if (tok.kind == .identifier) {
            const text = src[tok.start..tok.end];

            // Property access `.name` OR a class-method declaration:
            // consult the property map. Everywhere else goes through
            // the regular scope chain.
            if (isPropertyAccess(tokens, src, i) or props.isDeclaration(i)) {
                if (props.get(text)) |renamed| {
                    try out.appendSlice(renamed);
                    continue;
                }
            } else if (tree.lookup(text)) |renamed| {
                // Regular identifier: use the scope chain.
                try out.appendSlice(renamed);
                continue;
            }

            try out.appendSlice(text);
        } else {
            try out.appendSlice(src[tok.start..tok.end]);
        }
    }

    return out.toOwnedSlice();
}

// True if the identifier at `index` is the right-hand side of a `.`
// accessor (e.g. `this.method`, `obj.method`). We also treat shorthand
// method declarations `method()` inside a class body as accesses — but
// that case is handled by the property pass rewriting scope_of_token.
fn isPropertyAccess(tokens: []const Token, src: []const u8, index: usize) bool {
    if (index == 0) return false;
    var j: usize = index - 1;
    while (j > 0 and tokens[j].kind == .whitespace) : (j -= 1) {}
    const prev = tokens[j];
    if (prev.kind != .symbol) return false;
    return src[prev.start] == '.';
}
