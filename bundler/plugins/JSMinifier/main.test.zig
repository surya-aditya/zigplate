const std = @import("std");
const minifyJs = @import("main.zig").minifyJs;

test "minify strips line comments and collapses whitespace" {
    const src =
        \\function add(a, b) { // add two numbers
        \\    return a + b;
        \\}
    ;
    const out = try minifyJs(std.testing.allocator, src);

    defer std.testing.allocator.free(out);

    try std.testing.expectEqualStrings("function add(a,b){return a+b}", out);
}

test "minify strips block comments" {
    const src = "var x = 1; /* keep me? no */ var y = 2;";
    const out = try minifyJs(std.testing.allocator, src);

    defer std.testing.allocator.free(out);

    try std.testing.expectEqualStrings("var x=1;var y=2;", out);
}

test "minify preserves strings and template literals" {
    const src = "const s = \"  hello  \"; const t = `  world  `;";
    const out = try minifyJs(std.testing.allocator, src);

    defer std.testing.allocator.free(out);

    try std.testing.expectEqualStrings("const s=\"  hello  \";const t=`  world  `;", out);
}
