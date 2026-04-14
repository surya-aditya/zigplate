const std = @import("std");
const lexer = @import("lexer.zig");
const reserved = @import("reserved.zig");
const names = @import("names.zig");

const Token = lexer.Token;

// Property rename map — original property name → mangled short name.
// Applies anywhere in the file on `.<name>` accesses. Built by scanning
// every class body and treating each method-like declaration inside as
// a property to mangle.
//
// ⚠️  Property mangling is inherently risky: if any outside code (a
// library, the DOM, JSON payloads) uses the same key name, the rename
// breaks it. This implementation ONLY mangles names declared INSIDE a
// `class { … }` body, which is the sweet spot — self-contained classes
// whose methods are invoked internally via `this.x` or by code that
// also goes through the mangle pass.
pub const PropertyMap = struct {
    // original → mangled. Keys point into the source buffer; values are
    // owned by the caller via `name_storage`.
    map: std.StringHashMap([]const u8),
    // Token indices where a class method is DECLARED. Used by the emit
    // pass to rename the declaration site (which isn't `.name` access
    // and so wouldn't be caught by the property-access heuristic).
    decl_tokens: std.AutoHashMap(usize, void),
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) PropertyMap {
        return .{
            .map = std.StringHashMap([]const u8).init(allocator),
            .decl_tokens = std.AutoHashMap(usize, void).init(allocator),
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *PropertyMap) void {
        self.map.deinit();
        self.decl_tokens.deinit();
    }

    pub fn get(self: *const PropertyMap, name: []const u8) ?[]const u8 {
        return self.map.get(name);
    }

    pub fn isDeclaration(self: *const PropertyMap, token_index: usize) bool {
        return self.decl_tokens.contains(token_index);
    }
};

// Walks the token stream and collects every method name declared in a
// class body. Returns a map from original → mangled; the storage for the
// mangled strings is pushed into `name_storage` (caller owns).
pub fn collect(
    allocator: std.mem.Allocator,
    tokens: []const Token,
    src: []const u8,
    gen: *names.NameGen,
    name_storage: *std.ArrayList([]u8),
) !PropertyMap {
    var props = PropertyMap.init(allocator);
    errdefer props.deinit();

    var i: usize = 0;
    while (i < tokens.len) : (i += 1) {
        const tok = tokens[i];
        if (tok.kind != .identifier) continue;
        if (!std.mem.eql(u8, src[tok.start..tok.end], "class")) continue;

        // Walk forward past the class name / `extends Parent` clause to
        // reach the opening `{` of the class body.
        const brace = findClassBodyBrace(tokens, src, i + 1) orelse continue;

        // Scan the class body; register every method declaration.
        try collectMethodsInClassBody(allocator, tokens, src, gen, name_storage, &props, brace);

        i = brace; // skip past the class keyword we just consumed
    }

    return props;
}

fn findClassBodyBrace(tokens: []const Token, src: []const u8, from: usize) ?usize {
    var i = from;
    while (i < tokens.len) : (i += 1) {
        const t = tokens[i];
        if (t.kind == .symbol and src[t.start] == '{') return i;
        // Give up if we run into a `;` or top-level structural break
        // before hitting the body (means it wasn't a class declaration).
        if (t.kind == .symbol and src[t.start] == ';') return null;
    }
    return null;
}

fn collectMethodsInClassBody(
    allocator: std.mem.Allocator,
    tokens: []const Token,
    src: []const u8,
    gen: *names.NameGen,
    name_storage: *std.ArrayList([]u8),
    props: *PropertyMap,
    open_brace: usize,
) !void {
    var depth: usize = 1;
    var i: usize = open_brace + 1;

    while (i < tokens.len and depth > 0) : (i += 1) {
        const t = tokens[i];
        if (t.kind == .symbol) {
            const c = src[t.start];
            if (c == '{') depth += 1;
            if (c == '}') {
                depth -= 1;
                continue;
            }
        }

        // We only care about identifiers at the top level of the class
        // body (depth == 1). Nested braces belong to method bodies and
        // are handled by the regular mangler passes.
        if (depth != 1 or t.kind != .identifier) continue;

        const ident = src[t.start..t.end];

        // `static`/`async`/`get`/`set` are modifiers — skip and look at
        // the next identifier. `*` prefixes generators (a symbol token).
        if (isMethodModifier(ident)) continue;

        // Method definition: `ident(` (after optional whitespace).
        const paren = nextNonWhitespace(tokens, i + 1);
        if (paren >= tokens.len or tokens[paren].kind != .symbol or src[tokens[paren].start] != '(') continue;

        // Don't touch names that JS semantics pin (`constructor`, …) or
        // anything our reserved list protects.
        if (reserved.isReserved(ident)) continue;
        if (isPropertyBlocklisted(ident)) continue;

        // ALWAYS mark the declaration site so emit() keeps the literal
        // name verbatim — even if a previous class already declared the
        // same method name. Otherwise scope-mangling would rename the
        // second declaration and silently break method lookups.
        try props.decl_tokens.put(i, {});

        // Only allocate a new short name the FIRST time we see this name
        // — same method on different classes shares one entry.
        if (props.map.contains(ident)) continue;

        var buf: [8]u8 = undefined;
        var short = gen.next(&buf);
        while (std.mem.eql(u8, short, ident)) {
            short = gen.next(&buf);
        }
        const owned = try allocator.dupe(u8, short);
        try name_storage.append(owned);
        try props.map.put(ident, owned);
    }
}

fn nextNonWhitespace(tokens: []const Token, from: usize) usize {
    var i = from;
    while (i < tokens.len and tokens[i].kind == .whitespace) : (i += 1) {}
    return i;
}

fn isMethodModifier(name: []const u8) bool {
    return std.mem.eql(u8, name, "static") or
        std.mem.eql(u8, name, "async") or
        std.mem.eql(u8, name, "get") or
        std.mem.eql(u8, name, "set");
}

// Names we must not rename even inside a class body. `constructor` is
// called implicitly by `new`, and well-known symbols like `toString`
// are dispatched by the runtime.
fn isPropertyBlocklisted(name: []const u8) bool {
    return std.mem.eql(u8, name, "constructor") or
        std.mem.eql(u8, name, "toString") or
        std.mem.eql(u8, name, "valueOf") or
        std.mem.eql(u8, name, "then") or
        std.mem.eql(u8, name, "catch") or
        std.mem.eql(u8, name, "finally") or
        std.mem.eql(u8, name, "length");
}
