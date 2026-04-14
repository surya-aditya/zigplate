const std = @import("std");

// ---------------------------------------------------------------------
// Comptime HTML DSL.
//
// The page skeleton is built at comptime with `Tag`, `TagA`, and `Void_`:
//
//     const h1_  = h.Tag("h1");
//     const p_   = h.Tag("p");
//     const sec_ = h.TagA("section", "class=\"p-home\"");
//
//     pub const body_template = sec_(h1_("{heading}") ++ p_("{body}"));
//
// CMS fields go in via `{key}` (HTML-escaped) or `{!key}` (trusted raw),
// and `writeTemplate` streams the final bytes at request time. Literal
// `{` in markup is written as `{{`.
// ---------------------------------------------------------------------

const TagFn = fn (comptime []const u8) []const u8;

pub fn Tag(comptime tag: []const u8) TagFn {
    return struct {
        fn f(comptime inner: []const u8) []const u8 {
            return "<" ++ tag ++ ">" ++ inner ++ "</" ++ tag ++ ">";
        }
    }.f;
}

pub fn TagA(comptime tag: []const u8, comptime attrs: []const u8) TagFn {
    return struct {
        fn f(comptime inner: []const u8) []const u8 {
            return "<" ++ tag ++ " " ++ attrs ++ ">" ++ inner ++ "</" ++ tag ++ ">";
        }
    }.f;
}

pub fn Void_(comptime tag: []const u8) []const u8 {
    return "<" ++ tag ++ "/>";
}

pub fn VoidA(comptime tag: []const u8, comptime attrs: []const u8) []const u8 {
    return "<" ++ tag ++ " " ++ attrs ++ "/>";
}

// ---------------------------------------------------------------------
// Runtime interpolation.
// ---------------------------------------------------------------------

pub fn writeTemplate(w: anytype, template: []const u8, ctx: anytype) !void {
    var i: usize = 0;
    while (i < template.len) {
        const c = template[i];
        if (c != '{') {
            try w.writeByte(c);
            i += 1;
            continue;
        }

        // `{{` is a literal `{`.
        if (i + 1 < template.len and template[i + 1] == '{') {
            try w.writeByte('{');
            i += 2;
            continue;
        }

        const end = std.mem.indexOfScalarPos(u8, template, i + 1, '}') orelse {
            try w.writeByte('{');
            i += 1;
            continue;
        };

        var key = template[i + 1 .. end];
        var raw = false;
        if (key.len > 0 and key[0] == '!') {
            raw = true;
            key = key[1..];
        }

        const val = ctx.get(key);
        if (raw) try w.writeAll(val) else try writeEscaped(w, val);
        i = end + 1;
    }
}

pub fn writeEscaped(w: anytype, s: []const u8) !void {
    for (s) |c| switch (c) {
        '<' => try w.writeAll("&lt;"),
        '>' => try w.writeAll("&gt;"),
        '&' => try w.writeAll("&amp;"),
        '"' => try w.writeAll("&quot;"),
        '\'' => try w.writeAll("&#39;"),
        else => try w.writeByte(c),
    };
}
