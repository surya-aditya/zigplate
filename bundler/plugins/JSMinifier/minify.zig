const std = @import("std");

// Strip comments and collapse whitespace from JavaScript source. Strings
// and template literals are copied verbatim. Caller owns the result.
pub fn minifyJs(allocator: std.mem.Allocator, src: []const u8) ![]u8 {
    var out = std.ArrayList(u8).init(allocator);
    errdefer out.deinit();

    var i: usize = 0;

    // `?u8` is "optional u8":
    //   `null`  → not currently inside a string
    //   `'\''`  → inside a single-quoted string
    //   `'"'`   → inside a double-quoted string
    var in_string: ?u8 = null;
    var in_template: bool = false;

    while (i < src.len) {
        // Inside a template literal — copy verbatim, watching for the close.
        if (in_template) {
            try out.append(src[i]);
            if (src[i] == '`' and (i == 0 or src[i - 1] != '\\')) {
                in_template = false;
            }
            i += 1;
            continue;
        }

        // Inside a regular string — copy verbatim until the matching quote.
        if (in_string) |quote| {
            try out.append(src[i]);
            if (src[i] == quote and (i == 0 or src[i - 1] != '\\')) {
                in_string = null;
            }
            i += 1;
            continue;
        }

        // Line comment `// ...` — skip to end of line.
        if (i + 1 < src.len and src[i] == '/' and src[i + 1] == '/') {
            i += 2;
            while (i < src.len and src[i] != '\n') : (i += 1) {}
            continue;
        }

        // Block comment `/* ... */`.
        if (i + 1 < src.len and src[i] == '/' and src[i + 1] == '*') {
            i += 2;
            while (i + 1 < src.len) : (i += 1) {
                if (src[i] == '*' and src[i + 1] == '/') {
                    i += 2;
                    break;
                }
            }
            continue;
        }

        // Template literal opener.
        if (src[i] == '`') {
            in_template = true;
            try out.append(src[i]);
            i += 1;
            continue;
        }

        // Regular string opener.
        if (src[i] == '\'' or src[i] == '"') {
            in_string = src[i];
            try out.append(src[i]);
            i += 1;
            continue;
        }

        // Whitespace: collapse runs and emit a single space only when both
        // surrounding tokens are identifier-ish (so `var x` stays valid but
        // `x = 1` collapses to `x=1`).
        if (std.ascii.isWhitespace(src[i])) {
            if (out.items.len > 0) {
                const last = out.items[out.items.len - 1];
                var j = i + 1;
                while (j < src.len and std.ascii.isWhitespace(src[j])) : (j += 1) {}
                if (j < src.len and needsSpace(last) and needsSpace(src[j])) {
                    try out.append(' ');
                }
            }
            while (i < src.len and std.ascii.isWhitespace(src[i])) : (i += 1) {}
            continue;
        }

        // Drop `;` immediately before `}` — saves one byte each time.
        if (src[i] == ';') {
            var j = i + 1;
            while (j < src.len and std.ascii.isWhitespace(src[j])) : (j += 1) {}
            if (j < src.len and src[j] == '}') {
                i += 1;
                continue;
            }
            try out.append(src[i]);
            i += 1;
            continue;
        }

        // Anything else: copy as-is.
        try out.append(src[i]);
        i += 1;
    }

    return out.toOwnedSlice();
}

// Identifier-like bytes need separation from each other; punctuation does not.
fn needsSpace(c: u8) bool {
    return std.ascii.isAlphanumeric(c) or c == '_' or c == '$';
}
