const std = @import("std");

pub fn main() !void {

    // Allocator setup
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 3) {
        std.debug.print("Usage: css-minifier <input.css> <output.css>\n", .{});
        return; // No error, just exit after showing usage
    }

    // File reading
    const input = try std.fs.cwd().readFileAlloc(allocator, args[1], 10 * 1024 * 1024);
    defer allocator.free(input);

    // Minification
    const minified = try minifyCss(allocator, input);
    defer allocator.free(minified);

    // File writing — ensure output directory exists first
    if (std.fs.path.dirname(args[2])) |dir| {
        std.fs.cwd().makePath(dir) catch {};
    }
    try std.fs.cwd().writeFile(.{
        .sub_path = args[2],
        .data = minified,
    });

    // Stats output
    //
    // We use stdout (not stderr) so the build step output is visible.
    // ANSI escape codes add color to terminal output:
    //   \x1b[  = start escape sequence
    //   32m    = green text
    //   36m    = cyan text
    //   1m     = bold
    //   2m     = dim
    //   0m     = reset to default
    const original: f64 = @floatFromInt(input.len);
    const compressed: f64 = @floatFromInt(minified.len);
    const savings = if (input.len > 0) (1.0 - compressed / original) * 100.0 else 0.0;

    appendStats(allocator, "CSS", args[1], args[2], input.len, minified.len) catch {
        std.debug.print(
            "\x1b[42;30m CSS  \x1b[0m  {s} \x1b[2m→\x1b[0m {s}  {d} \x1b[2m→\x1b[0m {d} b  (-{d:.1}%)\n",
            .{ args[1], args[2], input.len, minified.len, savings },
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


// Minifier engine
pub fn minifyCss(allocator: std.mem.Allocator, src: []const u8) ![]u8 {
    var out: std.ArrayList(u8) = .empty;
    errdefer out.deinit(allocator);

    var i: usize = 0;

    // `?u8` is an "optional u8" — it's either:
    //   `null`  → we're NOT inside a string
    //   `'\''`  → we're inside a single-quoted string
    //   `'"'`   → we're inside a double-quoted string
    var in_string: ?u8 = null;

    while (i < src.len) {

        // ============================================================
        // STATE 1: Copy everything verbatim
        // ============================================================
        if (in_string) |quote| {

            // Copy the current byte to output without any changes.
            // `try` because .append() can fail if allocation fails.
            try out.append(allocator, src[i]);

            // Check if this byte closes the string
            if (src[i] == quote and (i == 0 or src[i - 1] != '\\')) {
                in_string = null; // We're no longer inside a string
            }

            i += 1;
            continue;
        }

        // ============================================================
        // STATE 2: Detect comments, strings, whitespace
        // ============================================================

        // Block comments checker: /* .. */
        // `i + 1 < src.len` prevents reading past the end of the file.
        if (i + 1 < src.len and src[i] == '/' and src[i + 1] == '*') {
            i += 2; // Skip the "/*"

            while (i + 1 < src.len) : (i += 1) {
                if (src[i] == '*' and src[i + 1] == '/') {
                    i += 2; // Skip the "*/"
                    break;
                }
            }

            continue;
        }

        // Check for string opening: switch to "in_string" state
        if (src[i] == '\'' or src[i] == '"') {

            // Store WHICH quote character opened the string so we know
            // which one closes it. (A ' inside "..." doesn't close it.)
            in_string = src[i];

            // Output the opening quote itself.
            try out.append(allocator, src[i]);
            i += 1;
            continue;
        }

        // Collapse whitespace
        // `std.ascii.isWhitespace` returns true for:
        //    space (0x20), tab (0x09), newline (0x0A), carriage return (0x0D),
        //    vertical tab (0x0B), form feed (0x0C).
        if (std.ascii.isWhitespace(src[i])) {
            // Emit single space if:
            //  - We've already wriiten something (out.items.len > 0)
            //  - The last written character is NOT a removable punctuation char.
            //    After `{` or `:` etc., a space is never needed.
            if (out.items.len > 0 and !isRemovable(out.items[out.items.len - 1])) {
                var j = i + 1;

                while (j < src.len and std.ascii.isWhitespace(src[j])) : (j += 1) {
                    // Skip all consecutive whitespace characters
                }

                if (j < src.len and !isRemovable(src[j])) {
                    try out.append(allocator, ' ');
                }
            }

            while (i < src.len and std.ascii.isWhitespace(src[i])) : (i += 1) {
                // Skip all consecutive whitespace characters
            }

            continue;
        }

        // ============================================================
        // Just copy the byte
        // ============================================================

        try out.append(allocator, src[i]);
        i += 1;
    }

    // Convert the ArrayList into a plain []u8 slice.
    return out.toOwnedSlice(allocator);
}

// These punctuation characters never need a space after them,
// so if we see a whitespace followed by one of these,
// we can skip the whitespace entirely.
fn isRemovable(c: u8) bool {
    return switch (c) {
        '{', '}', ';', ':', ',', '>', '~', '+', '(', ')' => true,
        else => false,
    };
}
