const std = @import("std");

// Subcommands:
//   bundle-report clear <log-path>    — truncate (or remove) the stats log
//   bundle-report print <log-path>    — read the log and render a PM2-style
//                                       unicode box table of every entry
//
// Each stats-log line is pipe-separated:
//   KIND|SOURCE|OUTPUT|BYTES_IN|BYTES_OUT
// HASH rows emit the same number for in/out (lossless), and render the
// "saved" column as `—`.

const Row = struct {
    kind: []const u8,
    src: []const u8,
    dst: []const u8,
    n_in: u64,
    n_out: u64,

    fn kindOrder(k: []const u8) u8 {
        if (std.mem.eql(u8, k, "CSS")) return 0;
        if (std.mem.eql(u8, k, "JS")) return 1;
        if (std.mem.eql(u8, k, "HASH")) return 2;
        return 3;
    }

    fn lessThan(_: void, a: Row, b: Row) bool {
        const ka = kindOrder(a.kind);
        const kb = kindOrder(b.kind);
        if (ka != kb) return ka < kb;
        return std.mem.lessThan(u8, a.src, b.src);
    }
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const a = gpa.allocator();

    const args = try std.process.argsAlloc(a);
    defer std.process.argsFree(a, args);

    if (args.len < 3) {
        std.debug.print("Usage: bundle-report <clear|print> <log-path>\n", .{});
        return;
    }

    const cmd = args[1];
    const log_path = args[2];

    if (std.mem.eql(u8, cmd, "clear")) {
        if (std.fs.path.dirname(log_path)) |d| std.fs.cwd().makePath(d) catch {};
        std.fs.cwd().deleteFile(log_path) catch {};
        (try std.fs.cwd().createFile(log_path, .{})).close();
        return;
    }

    if (std.mem.eql(u8, cmd, "print")) {
        try printTable(a, log_path);
        return;
    }

    std.debug.print("unknown subcommand: {s}\n", .{cmd});
}

fn printTable(a: std.mem.Allocator, log_path: []const u8) !void {
    const raw = std.fs.cwd().readFileAlloc(a, log_path, 4 * 1024 * 1024) catch return;
    defer a.free(raw);

    var rows: std.ArrayList(Row) = .empty;
    defer rows.deinit(a);

    var lines = std.mem.splitScalar(u8, raw, '\n');
    while (lines.next()) |line| {
        if (line.len == 0) continue;
        const row = parseRow(line) orelse continue;
        try rows.append(a, row);
    }

    if (rows.items.len == 0) return;

    // Stable order regardless of parallel execution: group by kind
    // (CSS → JS → HASH), then alphabetically within each group.
    std.mem.sort(Row, rows.items, {}, Row.lessThan);

    const headers = [_][]const u8{ "KIND", "SOURCE", "OUTPUT", "IN", "OUT", "SAVED" };
    var w: [6]usize = .{ headers[0].len, headers[1].len, headers[2].len, headers[3].len, headers[4].len, headers[5].len };

    var num_buf: [32]u8 = undefined;

    for (rows.items) |r| {
        if (r.kind.len > w[0]) w[0] = r.kind.len;
        if (r.src.len > w[1]) w[1] = r.src.len;
        if (r.dst.len > w[2]) w[2] = r.dst.len;
        const n_in_str = std.fmt.bufPrint(&num_buf, "{d}b", .{r.n_in}) catch continue;
        if (n_in_str.len > w[3]) w[3] = n_in_str.len;
        const n_out_str = std.fmt.bufPrint(&num_buf, "{d}b", .{r.n_out}) catch continue;
        if (n_out_str.len > w[4]) w[4] = n_out_str.len;
        const saved = savedCell(&num_buf, r);
        if (saved.len > w[5]) w[5] = saved.len;
    }

    printBorder(w, "┌", "┬", "┐");
    printHeader(w, &headers);
    printBorder(w, "├", "┼", "┤");
    for (rows.items) |r| printRow(w, r);
    printBorder(w, "└", "┴", "┘");
}

fn parseRow(line: []const u8) ?Row {
    var it = std.mem.splitScalar(u8, line, '|');
    const kind = it.next() orelse return null;
    const src = it.next() orelse return null;
    const dst = it.next() orelse return null;
    const n_in_s = it.next() orelse return null;
    const n_out_s = it.next() orelse return null;
    const n_in = std.fmt.parseInt(u64, n_in_s, 10) catch return null;
    const n_out = std.fmt.parseInt(u64, n_out_s, 10) catch return null;
    return .{ .kind = kind, .src = src, .dst = dst, .n_in = n_in, .n_out = n_out };
}

fn savedCell(buf: []u8, r: Row) []const u8 {
    if (std.mem.eql(u8, r.kind, "HASH") or r.n_in == 0) return "-";
    const before: f64 = @floatFromInt(r.n_in);
    const after: f64 = @floatFromInt(r.n_out);
    const pct = (1.0 - after / before) * 100.0;
    return std.fmt.bufPrint(buf, "-{d:.1}%", .{pct}) catch "";
}

fn printBorder(w: [6]usize, left: []const u8, mid: []const u8, right: []const u8) void {
    std.debug.print("\x1b[2m{s}", .{left});
    for (w, 0..) |width, i| {
        var k: usize = 0;
        while (k < width + 2) : (k += 1) std.debug.print("─", .{});
        if (i + 1 < w.len) std.debug.print("{s}", .{mid});
    }
    std.debug.print("{s}\x1b[0m\n", .{right});
}

fn printHeader(w: [6]usize, headers: *const [6][]const u8) void {
    std.debug.print("\x1b[2m│\x1b[0m", .{});
    for (headers, w) |h, width| {
        std.debug.print(" \x1b[1m{s}\x1b[0m", .{h});
        pad(width - h.len);
        std.debug.print(" \x1b[2m│\x1b[0m", .{});
    }
    std.debug.print("\n", .{});
}

fn printRow(w: [6]usize, r: Row) void {
    var num_in_buf: [32]u8 = undefined;
    var num_out_buf: [32]u8 = undefined;
    var saved_buf: [32]u8 = undefined;

    const color: []const u8 = if (std.mem.eql(u8, r.kind, "CSS"))
        "\x1b[32m"
    else if (std.mem.eql(u8, r.kind, "JS"))
        "\x1b[33m"
    else if (std.mem.eql(u8, r.kind, "HASH"))
        "\x1b[35m"
    else
        "";

    std.debug.print("\x1b[2m│\x1b[0m ", .{});
    std.debug.print("{s}{s}\x1b[0m", .{ color, r.kind });
    pad(w[0] - r.kind.len);
    std.debug.print(" \x1b[2m│\x1b[0m", .{});

    cellLeft(r.src, w[1]);
    cellLeft(r.dst, w[2]);

    const in_str = std.fmt.bufPrint(&num_in_buf, "{d}b", .{r.n_in}) catch "?";
    cellRight(in_str, w[3]);

    const out_str = std.fmt.bufPrint(&num_out_buf, "{d}b", .{r.n_out}) catch "?";
    cellRight(out_str, w[4]);

    const saved = savedCell(&saved_buf, r);
    cellRight(saved, w[5]);

    std.debug.print("\n", .{});
}

// Left-aligned cell including the trailing `│`.
fn cellLeft(text: []const u8, width: usize) void {
    std.debug.print(" {s}", .{text});
    pad(width - text.len);
    std.debug.print(" \x1b[2m│\x1b[0m", .{});
}

// Right-aligned cell including the trailing `│`.
fn cellRight(text: []const u8, width: usize) void {
    std.debug.print(" ", .{});
    pad(width - text.len);
    std.debug.print("{s} \x1b[2m│\x1b[0m", .{text});
}

fn pad(n: usize) void {
    var i: usize = 0;
    while (i < n) : (i += 1) std.debug.print(" ", .{});
}
