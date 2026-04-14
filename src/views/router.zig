const std = @import("std");
const cms = @import("cms");
const home = @import("pages_home");
const about = @import("pages_about");

pub const Page = struct {
    path: []const u8,
    code: []const u8,
    default_title: []const u8,
};

pub const pages = [_]Page{
    .{ .path = "/", .code = home.route, .default_title = home.default_title },
    .{ .path = "/about", .code = about.route, .default_title = about.default_title },
};

// Comptime tuple of page namespaces. Inline-iterated to dispatch to the
// right module without a handwritten switch.
const page_modules = .{ home, about };

pub const devices = [_][]const u8{ "d", "m" };

pub fn find(path: []const u8) ?usize {
    for (pages, 0..) |p, i| {
        if (std.mem.eql(u8, p.path, path)) {
            return i;
        }
    }

    return null;
}

pub fn deviceIdx(device: []const u8) usize {
    if (std.mem.eql(u8, device, "m")) return 1;
    return 0;
}

pub fn renderBody(
    idx: usize,
    w: anytype,
    allocator: std.mem.Allocator,
    device: []const u8,
    content: cms.Content,
) !void {
    const di = deviceIdx(device);

    inline for (page_modules, 0..) |mod, i| {
        if (idx == i) return mod.renderBody(w, allocator, di, content);
    }

    return error.NotFound;
}
