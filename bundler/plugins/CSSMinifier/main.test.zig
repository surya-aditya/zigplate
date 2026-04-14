const std = @import("std");
const minifyCss = @import("main.zig").minifyCss;

test "minify collapses whitespace and strips comments" {
    const src =
        \\/* header */
        \\.foo  {
        \\    color:  red;
        \\    padding: 10px;
        \\}
    ;
    const out = try minifyCss(std.testing.allocator, src);

    defer std.testing.allocator.free(out);

    try std.testing.expectEqualStrings(".foo{color:red;padding:10px;}", out);
}

test "minify preserves strings verbatim" {
    const src = ".a{content: \"  hello  world  \";}";
    const out = try minifyCss(std.testing.allocator, src);

    defer std.testing.allocator.free(out);

    try std.testing.expectEqualStrings(".a{content:\"  hello  world  \";}", out);
}
