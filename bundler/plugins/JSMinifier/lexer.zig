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

// Breaks the source into a flat list of tokens. The caller owns the returned
// slice and must free it with `allocator.free(...)`.
pub fn tokenize(allocator: std.mem.Allocator, src: []const u8) ![]Token {
    var tokens = std.ArrayList(Token).init(allocator);
    errdefer tokens.deinit();

    var i: usize = 0;
    while (i < src.len) {
        const start = i;

        // String: scan to matching closing quote, respecting escapes.
        if (src[i] == '\'' or src[i] == '"' or src[i] == '`') {
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
            try tokens.append(.{ .kind = .string, .start = start, .end = i });
            continue;
        }

        // Identifier / keyword: starts with letter, `_`, or `$`.
        if (std.ascii.isAlphabetic(src[i]) or src[i] == '_' or src[i] == '$') {
            while (i < src.len and (std.ascii.isAlphanumeric(src[i]) or src[i] == '_' or src[i] == '$')) {
                i += 1;
            }
            try tokens.append(.{ .kind = .identifier, .start = start, .end = i });
            continue;
        }

        // Number: digits, dots, hex chars, exponents, signs in mantissa.
        if (std.ascii.isDigit(src[i]) or (src[i] == '.' and i + 1 < src.len and std.ascii.isDigit(src[i + 1]))) {
            while (i < src.len and
                (std.ascii.isAlphanumeric(src[i]) or src[i] == '.' or src[i] == '+' or src[i] == '-'))
            {
                i += 1;
            }
            try tokens.append(.{ .kind = .number, .start = start, .end = i });
            continue;
        }

        // Whitespace: coalesce runs into a single token.
        if (std.ascii.isWhitespace(src[i])) {
            while (i < src.len and std.ascii.isWhitespace(src[i])) : (i += 1) {}
            try tokens.append(.{ .kind = .whitespace, .start = start, .end = i });
            continue;
        }

        // Anything else is a single-byte symbol.
        i += 1;
        try tokens.append(.{ .kind = .symbol, .start = start, .end = i });
    }

    return tokens.toOwnedSlice();
}
