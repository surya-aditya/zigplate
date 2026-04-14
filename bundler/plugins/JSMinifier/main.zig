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

    // Property mangling (class method renaming) is disabled by default
    // for bundler-produced input because bun's async/decorator helpers
    // contain class methods whose names collide with property accesses
    // in user code, producing invalid JS. Re-enable per-project if safe.
    const mangled = try mangler.mangleWith(allocator, minified, .{ .mangle_properties = false });
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

    appendStats(allocator, "JS", args[1], args[2], input.len, mangled.len) catch {
        std.debug.print(
            "\x1b[43;30m JS   \x1b[0m  {s} \x1b[2m→\x1b[0m {s}  {d} \x1b[2m→\x1b[0m {d} b  (-{d:.1}%)\n",
            .{ args[1], args[2], input.len, mangled.len, savings },
        );
    };
}

fn appendStats(
    a: std.mem.Allocator,
    kind: []const u8,
    src: []const u8,
    dst: []const u8,
    n_in: u64,
    n_out: u64,
) !void {
    const log_path = std.process.getEnvVarOwned(a, "BUNDLE_STATS_LOG") catch return error.NoStatsLog;
    defer a.free(log_path);
    var file = try std.fs.cwd().createFile(log_path, .{ .truncate = false });
    defer file.close();
    try file.seekFromEnd(0);
    var buf: [512]u8 = undefined;
    const line = try std.fmt.bufPrint(&buf, "{s}|{s}|{s}|{d}|{d}\n", .{ kind, src, dst, n_in, n_out });
    try file.writeAll(line);
}
