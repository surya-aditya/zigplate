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
    var out: std.ArrayList(u8) = .empty;
    errdefer out.deinit(allocator);

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
                    try out.appendSlice(allocator,renamed);
                    continue;
                }
            } else if (isPropertyKey(tokens, src, i) or isObjectMethodShorthand(tokens, src, i)) {
                // `{key: value}` / `{key() {…}}` — `key` is a property
                // name, not a reference to anything in scope.
            } else if (isObjectShorthand(tokens, src, i)) {
                // `{name}` is sugar for `{name: name}`. If `name` is in
                // the rename map we expand to `{name: renamed}` so the
                // outgoing property key stays the original spelling
                // while the value still resolves to the renamed local.
                if (tree.lookup(text)) |renamed| {
                    try out.appendSlice(allocator,text);
                    try out.appendSlice(allocator,":");
                    try out.appendSlice(allocator,renamed);
                    continue;
                }
            } else if (!isContextualKeywordUsage(tokens, src, i, text)) {
                // Regular identifier: use the scope chain — but skip
                // contextual keywords used in syntax position
                // (`get [x]()`, `set name()`) that must stay verbatim.
                if (tree.lookup(text)) |renamed| {
                    try out.appendSlice(allocator,renamed);
                    continue;
                }
            }

            try out.appendSlice(allocator,text);
        } else {
            try out.appendSlice(allocator,src[tok.start..tok.end]);
        }
    }

    return out.toOwnedSlice(allocator);
}

// True if the identifier at `index` is the right-hand side of a `.`
// accessor (e.g. `this.method`, `obj.method`). We also treat shorthand
// method declarations `method()` inside a class body as accesses — but
// that case is handled by the property pass rewriting scope_of_token.
// `get` / `set` / `async` / `static` are contextual keywords: when they
// appear right before an identifier or a `[` (computed method name)
// they're part of getter/setter/modifier syntax — NOT a variable
// reference. We detect that pattern here and bail out of renaming so
// constructs like `{ get [name]() {} }` survive mangling.
fn isContextualKeywordUsage(tokens: []const Token, src: []const u8, index: usize, text: []const u8) bool {
    const is_ck = std.mem.eql(u8, text, "get") or
        std.mem.eql(u8, text, "set") or
        std.mem.eql(u8, text, "async") or
        std.mem.eql(u8, text, "static");
    if (!is_ck) return false;

    var j: usize = index + 1;
    while (j < tokens.len and tokens[j].kind == .whitespace) : (j += 1) {}
    if (j >= tokens.len) return false;

    const next = tokens[j];
    if (next.kind == .identifier) return true; // `get name() …`
    if (next.kind == .symbol and src[next.start] == '[') return true; // `get [x]() …`
    return false;
}

// True if the identifier sits in shorthand property position inside an
// object literal or destructuring — `{key, …}` (= `{key: key}`) or
// `const {key, …} = obj`. Renaming would silently change semantics
// (the property name on the object would no longer match), so emit
// expands `{key}` → `{key: renamed}` instead.
fn isObjectShorthand(tokens: []const Token, src: []const u8, index: usize) bool {
    var n: usize = index + 1;
    while (n < tokens.len and tokens[n].kind == .whitespace) : (n += 1) {}
    if (n >= tokens.len or tokens[n].kind != .symbol) return false;
    const next_c = src[tokens[n].start];
    if (next_c != ',' and next_c != '}') return false;

    if (index == 0) return false;
    var p: usize = index - 1;
    while (p > 0 and tokens[p].kind == .whitespace) : (p -= 1) {}
    const prev = tokens[p];
    if (prev.kind != .symbol) return false;
    const prev_c = src[prev.start];
    if (prev_c != '{' and prev_c != ',') return false;

    // Walk back to the enclosing bracket. Must be `{` AND that `{` must
    // open an OBJECT LITERAL (or destructuring pattern), not a block.
    var depth: isize = 0;
    var i: usize = p;
    while (true) {
        const t = tokens[i];
        if (t.kind == .symbol) {
            const c = src[t.start];
            if (c == ')' or c == ']' or c == '}') depth += 1;
            if (c == '(' or c == '[' or c == '{') {
                if (depth == 0) {
                    if (c != '{') return false;
                    return braceOpensObject(tokens, src, i);
                }
                depth -= 1;
            }
        }
        if (i == 0) return false;
        i -= 1;
    }
}

// True if the `{` at `brace_idx` opens an object literal / destructuring
// pattern (rather than a block). Determined by what precedes it:
//   block:  `)` `;` `{` `}` `>` (end of `=>`), `do`/`else`/`try`/…
//   object: `=` `(` `,` `:` `?` `[` `return`/`yield`/…
fn braceOpensObject(tokens: []const Token, src: []const u8, brace_idx: usize) bool {
    if (brace_idx == 0) return false;
    var b: usize = brace_idx - 1;
    while (b > 0 and tokens[b].kind == .whitespace) : (b -= 1) {}
    const before = tokens[b];

    if (before.kind == .symbol) {
        const c = src[before.start];
        // Block-introducing punctuation. `>` covers the `=>` arrow.
        if (c == ')' or c == ';' or c == '{' or c == '}' or c == '>') return false;
        return true;
    }
    if (before.kind == .identifier) {
        const t = src[before.start..before.end];
        const block_keywords = [_][]const u8{
            "do",      "else",  "try",  "finally", "class",
            "function","switch","case", "default",
        };
        for (block_keywords) |kw| {
            if (std.mem.eql(u8, t, kw)) return false;
        }
        return true;
    }
    return false;
}

// True if the identifier looks like a method-shorthand declaration in
// an object literal — `{ key() {…} }` or `{ get() {…} }` (method
// literally named `get`!). Walks back past `,` separators until we hit
// the enclosing bracket, which must be `{` to qualify. Same pattern
// inside `[ … ]` (array literals) or `( … )` (call args / params) is
// NOT a method declaration.
fn isObjectMethodShorthand(tokens: []const Token, src: []const u8, index: usize) bool {
    // Next non-whitespace must be `(`.
    var n: usize = index + 1;
    while (n < tokens.len and tokens[n].kind == .whitespace) : (n += 1) {}
    if (n >= tokens.len or tokens[n].kind != .symbol or src[tokens[n].start] != '(') return false;

    if (index == 0) return false;
    var p: usize = index - 1;
    while (p > 0 and tokens[p].kind == .whitespace) : (p -= 1) {}
    const prev = tokens[p];
    if (prev.kind != .symbol) return false;

    // Walk back at depth 0 from `,` until we hit the enclosing opener.
    var open_idx: usize = p;
    if (src[prev.start] != '{') {
        if (src[prev.start] != ',') return false;
        var depth: isize = 0;
        var i: usize = p;
        while (true) {
            const t = tokens[i];
            if (t.kind == .symbol) {
                const c = src[t.start];
                if (c == ')' or c == ']' or c == '}') depth += 1;
                if (c == '(' or c == '[' or c == '{') {
                    if (depth == 0) {
                        if (c != '{') return false;
                        open_idx = i;
                        break;
                    }
                    depth -= 1;
                }
            }
            if (i == 0) return false;
            i -= 1;
        }
    }

    return braceOpensObject(tokens, src, open_idx);
}

// True if the identifier sits in property-key position — followed by `:`
// and not part of a ternary `cond ? a : b`. Catches both object-literal
// keys (`{get: …}`) and labeled statements (`loop: …`). These names
// must keep their original spelling.
fn isPropertyKey(tokens: []const Token, src: []const u8, index: usize) bool {
    var j: usize = index + 1;
    while (j < tokens.len and tokens[j].kind == .whitespace) : (j += 1) {}
    if (j >= tokens.len or tokens[j].kind != .symbol or src[tokens[j].start] != ':') return false;

    // Walk back to confirm we're not in a ternary's consequent. A `?`
    // at the same paren/brace depth would mean `cond ? key : val`.
    if (index == 0) return true;
    var i: usize = index - 1;
    var depth: isize = 0;
    while (true) {
        const t = tokens[i];
        if (t.kind == .symbol) {
            const c = src[t.start];
            if (c == ')' or c == ']' or c == '}') depth += 1;
            if (c == '(' or c == '[' or c == '{') {
                depth -= 1;
                if (depth < 0) return true;
            }
            if (depth == 0 and c == '?') return false;
            if (depth == 0 and (c == ',' or c == ';')) return true;
        }
        if (i == 0) return true;
        i -= 1;
    }
}

fn isPropertyAccess(tokens: []const Token, src: []const u8, index: usize) bool {
    if (index == 0) return false;
    var j: usize = index - 1;
    while (j > 0 and tokens[j].kind == .whitespace) : (j -= 1) {}
    const prev = tokens[j];
    if (prev.kind != .symbol or src[prev.start] != '.') return false;

    // `...x` (rest / spread) also has `.` immediately before `x`. Walk
    // back further: if the previous symbol is ALSO `.`, this is `..` or
    // `...`, which is a spread/rest, not a property access.
    if (j == 0) return true;
    const prev2 = tokens[j - 1];
    if (prev2.kind == .symbol and src[prev2.start] == '.') return false;
    return true;
}
