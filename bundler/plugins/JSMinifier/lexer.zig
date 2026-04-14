const std = @import("std");

// A coarse token kind — enough to drive the minifier and mangler without
// building a full AST.
pub const TokenKind = enum {
    identifier, // variable names, keywords: `var`, `myFunc`, `console`
    string, // '...' or "..." or `...`
    number, // 123, 0.5, 0xFF
    symbol, // operators and punctuation: { } ( ) = + ; …
    whitespace, // spaces, tabs, newlines
    comment, // not currently emitted, reserved for future use
};

pub const Token = struct {
    kind: TokenKind,
    start: usize, // start index in source (inclusive)
    end: usize, // end index in source (exclusive)
};

// Walk the body of a template literal starting at `*i = position of '`'`.
// Emits the literal chunks (including their backtick / `${` boundaries)
// as `.string` tokens, and re-enters normal tokenization for each
// `${ … }` interpolation so the identifiers inside get renamed.
fn tokenizeTemplate(allocator: std.mem.Allocator, tokens: *std.ArrayList(Token), src: []const u8, i: *usize) anyerror!void {
    var pos = i.*;
    const open_start = pos;
    pos += 1; // skip opening backtick
    var chunk_start = open_start;

    while (pos < src.len) {
        const c = src[pos];
        if (c == '\\') {
            pos += 2;
            continue;
        }
        if (c == '`') {
            // Trailing chunk + close.
            try tokens.append(allocator, .{ .kind = .string, .start = chunk_start, .end = pos + 1 });
            pos += 1;
            i.* = pos;
            return;
        }
        if (c == '$' and pos + 1 < src.len and src[pos + 1] == '{') {
            // Emit the literal chunk including `${`, then recurse into
            // the interpolation as ordinary JS until the matching `}`.
            try tokens.append(allocator, .{ .kind = .string, .start = chunk_start, .end = pos + 2 });
            pos += 2;

            var depth: usize = 1;
            while (pos < src.len and depth > 0) {
                const inner_start = pos;
                const ch = src[pos];

                if (ch == '\'' or ch == '"') {
                    const q = ch;
                    pos += 1;
                    while (pos < src.len) {
                        if (src[pos] == '\\') {
                            pos += 2;
                            continue;
                        }
                        if (src[pos] == q) {
                            pos += 1;
                            break;
                        }
                        pos += 1;
                    }
                    try tokens.append(allocator, .{ .kind = .string, .start = inner_start, .end = pos });
                    continue;
                }

                if (ch == '`') {
                    try tokenizeTemplate(allocator, tokens, src, &pos);
                    continue;
                }

                if (std.ascii.isAlphabetic(ch) or ch == '_' or ch == '$') {
                    while (pos < src.len and (std.ascii.isAlphanumeric(src[pos]) or src[pos] == '_' or src[pos] == '$')) {
                        pos += 1;
                    }
                    try tokens.append(allocator, .{ .kind = .identifier, .start = inner_start, .end = pos });
                    continue;
                }

                if (std.ascii.isDigit(ch) or (ch == '.' and pos + 1 < src.len and std.ascii.isDigit(src[pos + 1]))) {
                    while (pos < src.len) {
                        const d = src[pos];
                        if (std.ascii.isAlphanumeric(d) or d == '.') {
                            pos += 1;
                            continue;
                        }
                        if ((d == '+' or d == '-') and pos > inner_start) {
                            const prev = src[pos - 1];
                            if (prev == 'e' or prev == 'E') {
                                pos += 1;
                                continue;
                            }
                        }
                        break;
                    }
                    try tokens.append(allocator, .{ .kind = .number, .start = inner_start, .end = pos });
                    continue;
                }

                if (std.ascii.isWhitespace(ch)) {
                    while (pos < src.len and std.ascii.isWhitespace(src[pos])) : (pos += 1) {}
                    try tokens.append(allocator, .{ .kind = .whitespace, .start = inner_start, .end = pos });
                    continue;
                }

                if (ch == '{') depth += 1;
                if (ch == '}') {
                    depth -= 1;
                    if (depth == 0) {
                        // Closing `}` of `${ … }` belongs to the template
                        // literal — DO NOT emit it as a symbol token, or
                        // the scope tree would treat it as a block close.
                        // Roll chunk_start back to include it in the
                        // next string chunk.
                        chunk_start = pos;
                        pos += 1;
                        break;
                    }
                }
                try tokens.append(allocator, .{ .kind = .symbol, .start = inner_start, .end = inner_start + 1 });
                pos += 1;
            }
            continue;
        }
        pos += 1;
    }

    // Unterminated template — emit whatever we have.
    try tokens.append(allocator, .{ .kind = .string, .start = chunk_start, .end = pos });
    i.* = pos;
}

// Breaks the source into a flat list of tokens. The caller owns the returned
// slice and must free it with `allocator.free(...)`.
pub fn tokenize(allocator: std.mem.Allocator, src: []const u8) ![]Token {
    var tokens: std.ArrayList(Token) = .empty;
    errdefer tokens.deinit(allocator);

    var i: usize = 0;
    while (i < src.len) {
        const start = i;

        // Regular string `'…'` / `"…"` — opaque to mangling.
        if (src[i] == '\'' or src[i] == '"') {
            const quote = src[i];
            i += 1;
            while (i < src.len) {
                if (src[i] == '\\') {
                    i += 2;
                    continue;
                }
                if (src[i] == quote) {
                    i += 1;
                    break;
                }
                i += 1;
            }
            try tokens.append(allocator, .{ .kind = .string, .start = start, .end = i });
            continue;
        }

        // Template literal `…${expr}…` — emit the surrounding backtick
        // chunks as `.string` tokens but recurse into `${ … }` so the
        // identifiers inside get renamed by the mangler.
        if (src[i] == '`') {
            try tokenizeTemplate(allocator, &tokens, src, &i);
            continue;
        }

        // Identifier / keyword: starts with letter, `_`, or `$`.
        if (std.ascii.isAlphabetic(src[i]) or src[i] == '_' or src[i] == '$') {
            while (i < src.len and (std.ascii.isAlphanumeric(src[i]) or src[i] == '_' or src[i] == '$')) {
                i += 1;
            }
            try tokens.append(allocator, .{ .kind = .identifier, .start = start, .end = i });
            continue;
        }

        // Number: digits, dots, hex chars, exponent. `+`/`-` are ONLY
        // consumed when they directly follow an exponent letter (e/E),
        // otherwise we'd swallow the `--` of `1---t` into the number.
        if (std.ascii.isDigit(src[i]) or (src[i] == '.' and i + 1 < src.len and std.ascii.isDigit(src[i + 1]))) {
            while (i < src.len) {
                const c = src[i];
                if (std.ascii.isAlphanumeric(c) or c == '.') {
                    i += 1;
                    continue;
                }
                if ((c == '+' or c == '-') and i > start) {
                    const prev = src[i - 1];
                    if (prev == 'e' or prev == 'E') {
                        i += 1;
                        continue;
                    }
                }
                break;
            }
            try tokens.append(allocator, .{ .kind = .number, .start = start, .end = i });
            continue;
        }

        // Whitespace: coalesce runs into a single token.
        if (std.ascii.isWhitespace(src[i])) {
            while (i < src.len and std.ascii.isWhitespace(src[i])) : (i += 1) {}
            try tokens.append(allocator, .{ .kind = .whitespace, .start = start, .end = i });
            continue;
        }

        // Anything else is a single-byte symbol.
        i += 1;
        try tokens.append(allocator, .{ .kind = .symbol, .start = start, .end = i });
    }

    return tokens.toOwnedSlice(allocator);
}
