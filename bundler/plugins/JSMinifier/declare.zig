const std = @import("std");
const lexer = @import("lexer.zig");
const reserved = @import("reserved.zig");
const scope_mod = @import("scope.zig");
const names = @import("names.zig");

const Token = lexer.Token;
const ScopeTree = scope_mod.ScopeTree;
const NameGen = names.NameGen;

// Build the scope tree and collect declarations. Returns a parallel array
// `scope_of_token[i]` = scope id that was active when token i was encountered
// (before handling `{`/`}` of that token). The caller owns both the tree
// and the returned slice.
pub fn collect(
    allocator: std.mem.Allocator,
    tree: *ScopeTree,
    gen: *NameGen,
    name_storage: *std.ArrayList([]u8),
    tokens: []const Token,
    src: []const u8,
) ![]u32 {
    // Phase A: walk once to build scope tree and scope_of_token map.
    var scope_of_token = try allocator.alloc(u32, tokens.len);
    errdefer allocator.free(scope_of_token);

    // We record scope_of_token AFTER handling enter/exit so that:
    //   - a `{` token sits in the new (child) scope it opens, and
    //   - a `}` token sits in the parent scope it returns to.
    // This makes `scope_of_token[brace_index]` a direct handle to the body
    // scope, with no need to guess from sibling ordering.
    for (tokens, 0..) |tok, i| {
        if (tok.kind == .symbol) {
            const c = src[tok.start];
            if (c == '{') try tree.enter();
            if (c == '}') tree.exit();
        }
        scope_of_token[i] = tree.current;
    }
    // Reset so Phase B and later passes start from the root again.
    tree.rewind();

    // Phase B: walk again to find declarations and register names.
    var ti: usize = 0;
    while (ti < tokens.len) : (ti += 1) {
        const tok = tokens[ti];
        if (tok.kind != .identifier) continue;

        const text = src[tok.start..tok.end];
        const here = scope_of_token[ti];

        // `var`/`let`/`const` binding(s). Register in the scope where the
        // declaration appears. Top-level bindings are treated as
        // module-local: a bundled ES module has its own scope distinct
        // from `globalThis`, so renaming them is safe as long as the code
        // isn't meant to leak globals.
        if (reserved.isDeclarationKeyword(text)) {
            if (isExported(tokens, src, ti)) continue;
            try registerDeclarationTargets(tree, gen, name_storage, tokens, src, ti + 1, here);
            continue;
        }

        // `class Name …` — register the class name in the enclosing
        // scope. Method names (properties on the prototype) are NOT
        // mangled: `obj.method` uses the same key, and `obj` could be
        // anything — only Terser's opt-in property mangler attempts this.
        if (std.mem.eql(u8, text, "class")) {
            const exported = isExported(tokens, src, ti);
            const after_kw = skipWhitespace(tokens, ti + 1);
            if (!exported and after_kw < tokens.len and tokens[after_kw].kind == .identifier) {
                const name = src[tokens[after_kw].start..tokens[after_kw].end];
                if (!reserved.isReserved(name)) {
                    try registerName(tree, gen, name_storage, here, name);
                }
            }
            continue;
        }

        // `function name(params) { body }` — register the function name in
        // the enclosing scope and the params in the body scope. Exported
        // function names are kept (only the body-local params mangled).
        if (std.mem.eql(u8, text, "function")) {
            const exported = isExported(tokens, src, ti);
            const after_kw = skipWhitespace(tokens, ti + 1);
            var after_name = after_kw;
            if (after_kw < tokens.len and tokens[after_kw].kind == .identifier) {
                if (!exported) {
                    try registerName(tree, gen, name_storage, here, src[tokens[after_kw].start..tokens[after_kw].end]);
                }
                after_name = after_kw + 1;
            }
            try registerParamsForBody(tree, gen, name_storage, tokens, src, after_name, scope_of_token, here);
            continue;
        }

        // Arrow function: detect `=>` by looking at `=` followed by `>` and
        // register its params. The params belong to the body scope when the
        // body is a block, otherwise they fall into the current scope.
        if (ti + 1 < tokens.len and tok.kind == .identifier) {
            // (identifiers themselves never start `=>`; nothing to do here)
        }
    }

    // Separate pass dedicated to arrow params so we handle them uniformly
    // and don't interfere with the main identifier loop above.
    ti = 0;
    while (ti < tokens.len) : (ti += 1) {
        const tok = tokens[ti];
        if (tok.kind != .symbol or src[tok.start] != '=') continue;
        const peek = skipWhitespace(tokens, ti + 1);
        if (peek >= tokens.len or tokens[peek].kind != .symbol or src[tokens[peek].start] != '>') continue;

        try registerArrowParams(tree, gen, name_storage, tokens, src, ti, scope_of_token);
    }

    // One more pass: method-shorthand params. Pattern is
    //   `identifier(args) {`  or  `)(args) {`  inside a class body.
    // We detect it by spotting `) {` and verifying the token just before
    // the matching `(` isn't a control-flow keyword like `if`/`while`.
    try registerMethodParams(tree, gen, name_storage, tokens, src, scope_of_token);

    return scope_of_token;
}

fn isControlFlowOrOperator(name: []const u8) bool {
    return std.mem.eql(u8, name, "if") or
        std.mem.eql(u8, name, "while") or
        std.mem.eql(u8, name, "for") or
        std.mem.eql(u8, name, "switch") or
        std.mem.eql(u8, name, "catch") or
        std.mem.eql(u8, name, "with") or
        std.mem.eql(u8, name, "return") or
        std.mem.eql(u8, name, "typeof") or
        std.mem.eql(u8, name, "new") or
        std.mem.eql(u8, name, "delete") or
        std.mem.eql(u8, name, "throw") or
        std.mem.eql(u8, name, "void") or
        std.mem.eql(u8, name, "yield") or
        std.mem.eql(u8, name, "await") or
        std.mem.eql(u8, name, "in") or
        std.mem.eql(u8, name, "of") or
        std.mem.eql(u8, name, "instanceof") or
        std.mem.eql(u8, name, "function");
}

fn registerMethodParams(
    tree: *ScopeTree,
    gen: *NameGen,
    name_storage: *std.ArrayList([]u8),
    tokens: []const Token,
    src: []const u8,
    scope_of_token: []u32,
) !void {
    var i: usize = 0;
    while (i + 1 < tokens.len) : (i += 1) {
        const t = tokens[i];
        if (t.kind != .symbol or src[t.start] != ')') continue;

        // `) {` (allowing whitespace between)?
        const brace_at = skipWhitespace(tokens, i + 1);
        if (brace_at >= tokens.len or tokens[brace_at].kind != .symbol or src[tokens[brace_at].start] != '{') continue;

        // Find the matching `(`.
        const open = findMatchingBackward(tokens, src, i, '(', ')') orelse continue;

        // Inspect the token right before `(`. If it's a control-flow
        // keyword or operator, this isn't a function-like — skip.
        if (open == 0) continue;
        var before = open - 1;
        while (before > 0 and tokens[before].kind == .whitespace) : (before -= 1) {}
        const prev = tokens[before];
        if (prev.kind == .identifier) {
            const prev_text = src[prev.start..prev.end];
            if (isControlFlowOrOperator(prev_text)) continue;
        } else if (prev.kind == .symbol) {
            // `=>(` or `)(...)` etc. also aren't method-shorthand.
            const c = src[prev.start];
            if (c == '=' or c == '>' or c == '(' or c == ',' or c == ';' or c == '{' or c == '}') continue;
        }

        // Register each identifier inside the param list in body_scope.
        // Skip shorthand identifiers in object destructuring (`{cb, de}`)
        // and object property keys (`{k: local}` — `k` is the key) — only
        // their renamed local counterparts get registered. See the same
        // rule in registerIdentsInGroup.
        const body_scope = scope_of_token[brace_at];
        var j: usize = open + 1;
        var brace_depth: usize = 0;
        while (j < i) : (j += 1) {
            const tt = tokens[j];
            if (tt.kind == .symbol) {
                const c = src[tt.start];
                if (c == '{') brace_depth += 1;
                if (c == '}' and brace_depth > 0) brace_depth -= 1;
            }
            if (tt.kind != .identifier) continue;
            if (brace_depth > 0 and isObjectKeyInGroup(tokens, src, j)) continue;
            scope_of_token[j] = body_scope;
            const name = src[tt.start..tt.end];
            if (reserved.isReserved(name)) continue;
            try registerName(tree, gen, name_storage, body_scope, name);
        }
    }
}

fn findMatchingBackward(
    tokens: []const Token,
    src: []const u8,
    close_index: usize,
    open: u8,
    close: u8,
) ?usize {
    var depth: usize = 1;
    if (close_index == 0) return null;
    var i: usize = close_index - 1;
    while (true) {
        const t = tokens[i];
        if (t.kind == .symbol) {
            const c = src[t.start];
            if (c == close) depth += 1;
            if (c == open) {
                depth -= 1;
                if (depth == 0) return i;
            }
        }
        if (i == 0) return null;
        i -= 1;
    }
}

fn skipWhitespace(tokens: []const Token, from: usize) usize {
    var i = from;
    while (i < tokens.len and tokens[i].kind == .whitespace) : (i += 1) {}
    return i;
}

// True if the declaration that starts at `ti` is preceded by `export`
// (including `export default`). Exported bindings must keep their names so
// other modules importing them still resolve correctly.
fn isExported(tokens: []const Token, src: []const u8, ti: usize) bool {
    if (ti == 0) return false;
    var b: usize = ti - 1;
    while (b > 0 and tokens[b].kind == .whitespace) : (b -= 1) {}
    const prev = tokens[b];
    if (prev.kind != .identifier) return false;

    const t = src[prev.start..prev.end];
    if (std.mem.eql(u8, t, "export")) return true;
    if (std.mem.eql(u8, t, "default") and b > 0) {
        var b2: usize = b - 1;
        while (b2 > 0 and tokens[b2].kind == .whitespace) : (b2 -= 1) {}
        const p2 = tokens[b2];
        if (p2.kind == .identifier and std.mem.eql(u8, src[p2.start..p2.end], "export")) return true;
    }
    return false;
}

// Starting at the token just after `var/let/const`, register every
// binding target in the declaration. Handles multi-declarations
// (`var a, b, c = …`), destructuring (`{a, b}` and `[a, b]`), and
// initializers (the `= expr` part is skipped, including any nested
// braces/brackets/parens).
fn registerDeclarationTargets(
    tree: *ScopeTree,
    gen: *NameGen,
    name_storage: *std.ArrayList([]u8),
    tokens: []const Token,
    src: []const u8,
    from: usize,
    scope_id: u32,
) !void {
    var i: usize = skipWhitespace(tokens, from);
    var expect_binding: bool = true;
    var depth: usize = 0;

    while (i < tokens.len) : (i += 1) {
        const t = tokens[i];

        if (t.kind == .symbol) {
            const c = src[t.start];
            // Statement terminator at top level ends the declaration.
            if (depth == 0 and c == ';') break;
            // A bare `,` only ends the current binding when not nested
            // inside an initializer's brackets/parens.
            if (depth == 0 and c == ',') {
                expect_binding = true;
                continue;
            }
            // Track depth for `()`, `[]`, `{}` so nested commas in
            // initializers don't trip the binding scanner.
            if (c == '(' or c == '[' or c == '{') {
                if (depth == 0 and expect_binding and (c == '{' or c == '[')) {
                    // Destructuring pattern at the binding position —
                    // register every identifier inside the group.
                    const close: u8 = if (c == '{') '}' else ']';
                    try registerIdentsInGroup(tree, gen, name_storage, tokens, src, i, c, close, scope_id);
                    // Jump past the matching close so we don't recurse.
                    if (findMatching(tokens, src, i, c, close)) |end_idx| {
                        i = end_idx;
                    }
                    expect_binding = false;
                    continue;
                }
                depth += 1;
                continue;
            }
            if (c == ')' or c == ']' or c == '}') {
                if (depth > 0) depth -= 1;
                continue;
            }
            continue;
        }

        if (t.kind == .identifier and depth == 0 and expect_binding) {
            try registerName(tree, gen, name_storage, scope_id, src[t.start..t.end]);
            expect_binding = false;
        }
    }
}

// From the position right after the function name (or the `function`
// keyword, if anonymous), locate `(params)` and the body `{`. Register all
// identifiers inside the params in the body's scope.
fn registerParamsForBody(
    tree: *ScopeTree,
    gen: *NameGen,
    name_storage: *std.ArrayList([]u8),
    tokens: []const Token,
    src: []const u8,
    from: usize,
    scope_of_token: []u32,
    fallback_scope: u32,
) !void {
    const lp = skipWhitespace(tokens, from);
    if (lp >= tokens.len or tokens[lp].kind != .symbol or src[tokens[lp].start] != '(') return;

    // Find matching `)`.
    const rp = findMatching(tokens, src, lp, '(', ')') orelse return;

    // Find the body-opening `{` after `)` to learn the body scope.
    const brace = skipWhitespace(tokens, rp + 1);
    const body_scope = if (brace < tokens.len and tokens[brace].kind == .symbol and src[tokens[brace].start] == '{')
        scope_of_token[brace]
    else
        fallback_scope;

    // Register every identifier inside the param list in body_scope. Also
    // rebase the param tokens themselves into body_scope so emit() renames
    // them in place — otherwise the param list and the body would disagree.
    var i: usize = lp + 1;
    while (i < rp) : (i += 1) {
        const t = tokens[i];
        if (t.kind != .identifier) continue;
        scope_of_token[i] = body_scope;
        const name = src[t.start..t.end];
        if (reserved.isReserved(name)) continue;
        try registerName(tree, gen, name_storage, body_scope, name);
    }
}

// Helper that lets us mutate the slice we got from the caller (Zig
// distinguishes `[]const u32` from `[]u32`; we accept const above for
// clarity but need writes here).
fn scope_of_token_mut(s: []const u32) []u32 {
    return @constCast(s);
}

// Arrow params: given the index of the `=` token that starts `=>`, walk
// backward to collect the params, then register them in the body's scope
// (or the current scope if the body is an expression).
fn registerArrowParams(
    tree: *ScopeTree,
    gen: *NameGen,
    name_storage: *std.ArrayList([]u8),
    tokens: []const Token,
    src: []const u8,
    eq_index: usize,
    scope_of_token: []u32,
) !void {
    if (eq_index == 0) return;

    // Only handle arrows with a real `{ … }` block body. The block's
    // own scope is where the params belong. For expression-bodied
    // arrows (`x => x*2`) we'd have to synthesise a scope and bound
    // it precisely; instead we skip them so the params don't pollute
    // the enclosing scope and break unrelated identifiers that share
    // the same name.
    const gt_index = eq_index + 1;
    const after_arrow = skipWhitespace(tokens, gt_index + 1);
    if (after_arrow >= tokens.len or tokens[after_arrow].kind != .symbol or src[tokens[after_arrow].start] != '{') return;
    const body_scope = scope_of_token[after_arrow];

    // Step back past whitespace to find the param source.
    var bi: usize = eq_index - 1;
    while (bi > 0 and tokens[bi].kind == .whitespace) : (bi -= 1) {}

    const prev = tokens[bi];

    // Unparenthesized single param: `x =>`
    if (prev.kind == .identifier) {
        scope_of_token[bi] = body_scope;
        const name = src[prev.start..prev.end];
        if (!reserved.isReserved(name)) {
            try registerName(tree, gen, name_storage, body_scope, name);
        }
        return;
    }

    // `) =>` — walk back to the matching `(` and register identifiers.
    if (prev.kind == .symbol and src[prev.start] == ')') {
        var paren_depth: usize = 1;
        if (bi == 0) return;
        var ci: usize = bi - 1;
        while (true) {
            const t = tokens[ci];
            if (t.kind == .symbol) {
                const c = src[t.start];
                if (c == ')') paren_depth += 1;
                if (c == '(') {
                    paren_depth -= 1;
                    if (paren_depth == 0) break;
                }
            }
            if (t.kind == .identifier) {
                scope_of_token[ci] = body_scope;
                const name = src[t.start..t.end];
                if (!reserved.isReserved(name)) {
                    try registerName(tree, gen, name_storage, body_scope, name);
                }
            }
            if (ci == 0) return;
            ci -= 1;
        }
    }
}

// Register each identifier appearing between matching `open` and `close`
// brackets (used for destructuring).
fn registerIdentsInGroup(
    tree: *ScopeTree,
    gen: *NameGen,
    name_storage: *std.ArrayList([]u8),
    tokens: []const Token,
    src: []const u8,
    start_index: usize,
    open: u8,
    close: u8,
    scope_id: u32,
) !void {
    var depth: usize = 1;
    var i: usize = start_index + 1;
    while (i < tokens.len) : (i += 1) {
        const t = tokens[i];
        if (t.kind == .symbol) {
            const c = src[t.start];
            if (c == open) depth += 1;
            if (c == close) {
                depth -= 1;
                if (depth == 0) return;
            }
        }
        if (t.kind == .identifier and depth == 1) {
            const name = src[t.start..t.end];
            if (reserved.isReserved(name)) continue;

            // For object destructuring `{a, b: c, ...d}`:
            //   `a`         (shorthand)   → register; emit will expand
            //                                to `{a: renamed}` so the key
            //                                on the source object stays.
            //   `b: c`      (renamed)     → skip `b` (key), register `c`.
            //   `...d`      (rest)        → register `d`.
            if (open == '{' and isObjectKeyInGroup(tokens, src, i)) continue;
            try registerName(tree, gen, name_storage, scope_id, name);
        }
    }
}

fn isShorthandInObjectGroup(tokens: []const Token, src: []const u8, index: usize) bool {
    // next non-ws is `,` or `}` AND prev non-ws is `{` or `,`.
    var n: usize = index + 1;
    while (n < tokens.len and tokens[n].kind == .whitespace) : (n += 1) {}
    if (n >= tokens.len or tokens[n].kind != .symbol) return false;
    const nc = src[tokens[n].start];
    if (nc != ',' and nc != '}') return false;

    if (index == 0) return false;
    var p: usize = index - 1;
    while (p > 0 and tokens[p].kind == .whitespace) : (p -= 1) {}
    if (tokens[p].kind != .symbol) return false;
    const pc = src[tokens[p].start];
    return pc == '{' or pc == ',';
}

fn isObjectKeyInGroup(tokens: []const Token, src: []const u8, index: usize) bool {
    // identifier followed by `:` is the property key — the value side
    // (after `:`) is what gets registered as the local binding.
    var n: usize = index + 1;
    while (n < tokens.len and tokens[n].kind == .whitespace) : (n += 1) {}
    if (n >= tokens.len or tokens[n].kind != .symbol) return false;
    return src[tokens[n].start] == ':';
}

fn findMatching(
    tokens: []const Token,
    src: []const u8,
    start_index: usize,
    open: u8,
    close: u8,
) ?usize {
    var depth: usize = 1;
    var i: usize = start_index + 1;
    while (i < tokens.len) : (i += 1) {
        const t = tokens[i];
        if (t.kind != .symbol) continue;
        const c = src[t.start];
        if (c == open) depth += 1;
        if (c == close) {
            depth -= 1;
            if (depth == 0) return i;
        }
    }
    return null;
}

// Allocate + register a short name for `original` in `scope_id`. No-op if
// `original` is reserved or already registered in that scope.
fn registerName(
    tree: *ScopeTree,
    gen: *NameGen,
    name_storage: *std.ArrayList([]u8),
    scope_id: u32,
    original: []const u8,
) !void {
    if (reserved.isReserved(original)) return;
    if (tree.contains(scope_id, original)) return;

    var buf: [8]u8 = undefined;
    var short = gen.next(&buf);
    // Avoid no-op renames like `a → a` so the mangling is visible.
    while (std.mem.eql(u8, short, original)) {
        short = gen.next(&buf);
    }
    const owned = try tree.allocator.dupe(u8, short);
    try name_storage.append(tree.allocator, owned);
    try tree.registerIn(scope_id, original, owned);
}
