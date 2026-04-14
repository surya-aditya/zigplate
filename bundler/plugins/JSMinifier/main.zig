const std = @import("std");
const minify = @import("minify.zig");
const mangler = @import("mangler.zig");

// Re-export so the test file (and any other module) can pull the engines
// directly from `main.zig` without knowing the internal file layout.
pub const minifyJs = minify.minifyJs;
pub const mangle = mangler.mangle;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 3) {
        std.debug.print("Usage: js-minifier <input.js> <output.js>\n", .{});
        return;
    }

    // Read input.
    const input = try std.fs.cwd().readFileAlloc(allocator, args[1], 10 * 1024 * 1024);
    defer allocator.free(input);

    // Pipeline: strip whitespace/comments → rename local identifiers.
    const minified = try minify.minifyJs(allocator, input);
    defer allocator.free(minified);

    const mangled = try mangler.mangle(allocator, minified);
    defer allocator.free(mangled);

    // Make sure the output directory exists, then write.
    if (std.fs.path.dirname(args[2])) |dir| {
        std.fs.cwd().makePath(dir) catch {};
    }
    try std.fs.cwd().writeFile(.{
        .sub_path = args[2],
        .data = mangled,
    });

    // Stats.
    const original: f64 = @floatFromInt(input.len);
    const compressed: f64 = @floatFromInt(mangled.len);
    const savings = if (input.len > 0) (1.0 - compressed / original) * 100.0 else 0.0;

    std.debug.print(
        "\x1b[33m  JS  \x1b[0m {s} \x1b[2m→\x1b[0m {s}\n" ++
            "       \x1b[36m{d}\x1b[0m bytes \x1b[2m→\x1b[0m \x1b[1m\x1b[36m{d}\x1b[0m bytes " ++
            "\x1b[2m(\x1b[0m\x1b[32m-{d:.1}%\x1b[0m\x1b[2m)\x1b[0m\n",
        .{ args[1], args[2], input.len, mangled.len, savings },
    );
}
