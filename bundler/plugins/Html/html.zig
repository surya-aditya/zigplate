const std = @import("std");

// ---------------------------------------------------------------------
// Comptime HTML DSL — Emmet-style selectors + mustache runtime slots.
//
//   Tag("h1", "#title.hero", "{{heading}}")
//   Tag("a",  ".nav-link[href=/][target=_blank]", "Home")
//   Tag("p",  "",            "plain paragraph")
//   Void("meta", "[charset=utf-8]")
//
// Selector grammar:
//   #id            — sets id="id"   (at most one)
//   .class         — appended to class="..."
//   [key=value]    — raw attribute; value must not contain `]` or spaces
//
// Runtime slots inside the returned string:
//   {{key}}        — HTML-escaped scalar from ctx.get(key)
//   {{!key}}       — trusted passthrough (pre-rendered fragments)
// ---------------------------------------------------------------------

pub fn Tag(
    comptime tag: []const u8,
    comptime selector: []const u8,
    comptime inner: []const u8,
) []const u8 {
    const attrs = comptime parseSelector(selector);
    if (attrs.len == 0) {
        return "<" ++ tag ++ ">" ++ inner ++ "</" ++ tag ++ ">";
    }
    return "<" ++ tag ++ " " ++ attrs ++ ">" ++ inner ++ "</" ++ tag ++ ">";
}

pub fn Void(
    comptime tag: []const u8,
    comptime selector: []const u8,
) []const u8 {
    const attrs = comptime parseSelector(selector);
    if (attrs.len == 0) return "<" ++ tag ++ "/>";
    return "<" ++ tag ++ " " ++ attrs ++ "/>";
}

// Parse an Emmet-like selector into an HTML attribute string at comptime.
fn parseSelector(comptime sel: []const u8) []const u8 {
    comptime {
        if (sel.len == 0) return "";

        var id: []const u8 = "";
        var classes: []const u8 = "";
        var extras: []const u8 = ""; // pre-joined "k=\"v\" k2=\"v2\""
        var i: usize = 0;

        while (i < sel.len) {
            const c = sel[i];
            switch (c) {
                '#' => {
                    i += 1;
                    const start = i;
                    while (i < sel.len and sel[i] != '#' and sel[i] != '.' and sel[i] != '[') : (i += 1) {}
                    if (id.len != 0) @compileError("selector '" ++ sel ++ "': multiple #ids");
                    id = sel[start..i];
                },
                '.' => {
                    i += 1;
                    const start = i;
                    while (i < sel.len and sel[i] != '#' and sel[i] != '.' and sel[i] != '[') : (i += 1) {}
                    const tok = sel[start..i];
                    classes = if (classes.len == 0) tok else classes ++ " " ++ tok;
                },
                '[' => {
                    i += 1;
                    const start = i;
                    while (i < sel.len and sel[i] != ']') : (i += 1) {}
                    if (i >= sel.len) @compileError("selector '" ++ sel ++ "': unterminated [...]");
                    const body = sel[start..i];
                    i += 1; // past ]

                    const eq = std.mem.indexOfScalar(u8, body, '=') orelse {
                        // Bare attribute like [disabled]
                        const attr = body ++ "=\"\"";
                        extras = if (extras.len == 0) attr else extras ++ " " ++ attr;
                        continue;
                    };
                    const k = body[0..eq];
                    const v = body[eq + 1 ..];
                    const attr = k ++ "=\"" ++ v ++ "\"";
                    extras = if (extras.len == 0) attr else extras ++ " " ++ attr;
                },
                else => @compileError("selector '" ++ sel ++ "': unexpected byte at offset " ++ std.fmt.comptimePrint("{d}", .{i})),
            }
        }

        var out: []const u8 = "";

        if (id.len > 0) {
            out = "id=\"" ++ id ++ "\"";
        }

        if (classes.len > 0) {
            if (out.len > 0) out = out ++ " ";
            out = out ++ "class=\"" ++ classes ++ "\"";
        }

        if (extras.len > 0) {
            if (out.len > 0) out = out ++ " ";
            out = out ++ extras;
        }

        return out;
    }
}

// ---------------------------------------------------------------------
// Runtime interpolation.
// ---------------------------------------------------------------------

pub fn writeTemplate(w: anytype, template: []const u8, ctx: anytype) !void {
    var i: usize = 0;
    while (i < template.len) {
        if (i + 1 < template.len and template[i] == '{' and template[i + 1] == '{') {
            const close = findClose(template, i + 2) orelse {
                try w.writeByte(template[i]);
                i += 1;
                continue;
            };
            var key = template[i + 2 .. close];
            var raw = false;
            if (key.len > 0 and key[0] == '!') {
                raw = true;
                key = key[1..];
            }
            const val = ctx.get(key);
            if (raw) try w.writeAll(val) else try writeEscaped(w, val);
            i = close + 2;
            continue;
        }
        try w.writeByte(template[i]);
        i += 1;
    }
}

fn findClose(s: []const u8, from: usize) ?usize {
    var j = from;
    while (j + 1 < s.len) : (j += 1) {
        if (s[j] == '}' and s[j + 1] == '}') return j;
    }
    return null;
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

// ---------------------------------------------------------------------
// Collection helper. Renders `atom_template` once per item and returns
// the concatenated HTML as a single owned slice.
// ---------------------------------------------------------------------

// Generic ctx.get — matches `{{key}}` to a struct field of the same
// name when the field type is a string slice. Non-string fields (e.g.
// owned allocators) are skipped, so pages can mix data with bookkeeping
// in the same struct:
//
//   const Ctx = struct {
//       heading: []const u8,
//       features: []const u8,
//       pub fn get(self: Ctx, key: []const u8) []const u8 {
//           return h.ctxGet(self, key);
//       }
//   };
pub fn ctxGet(ctx: anytype, key: []const u8) []const u8 {
    const info = @typeInfo(@TypeOf(ctx));
    const fields = switch (info) {
        .@"struct" => |s| s.fields,
        else => @compileError("ctxGet: ctx must be a struct"),
    };
    inline for (fields) |f| {
        if (comptime (f.type == []const u8 or f.type == []u8)) {
            if (std.mem.eql(u8, key, f.name)) return @field(ctx, f.name);
        }
    }
    return "";
}

pub fn renderList(
    allocator: std.mem.Allocator,
    atom_template: []const u8,
    items: anytype,
) ![]u8 {
    var buf: std.ArrayList(u8) = .empty;
    errdefer buf.deinit(allocator);
    for (items) |item| {
        try writeTemplate(buf.writer(allocator), atom_template, item);
    }
    return buf.toOwnedSlice(allocator);
}
