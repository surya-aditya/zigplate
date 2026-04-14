const std = @import("std");
const shell = @import("shell");
const index_view = @import("index_view");
const about_view = @import("about_view");

pub const Page = struct {
    stem: []const u8,
    path: []const u8,
    code: []const u8,
    default_title: []const u8,
    body_template: []const u8,     // page body only ({heading}, {body}, …)
    full_template: []const u8,     // shell ++ body ++ shell (single pass)
};

// Add a page: import the module, append one entry.
pub const pages = [_]Page{
    .{
        .stem = "index",
        .path = "/",
        .code = index_view.route,
        .default_title = index_view.default_title,
        .body_template = index_view.body_template,
        .full_template = shell.document(index_view.body_template),
    },
    .{
        .stem = "about",
        .path = "/about",
        .code = about_view.route,
        .default_title = about_view.default_title,
        .body_template = about_view.body_template,
        .full_template = shell.document(about_view.body_template),
    },
};

// Shell with an empty <main> — returned as the cache blob's `body` so
// the client has the device-correct chrome to hydrate into.
pub const empty_document: []const u8 = shell.document("");

pub const devices = [_][]const u8{ "d", "m" };

pub fn findIndex(path: []const u8) ?usize {
    for (pages, 0..) |p, i| if (std.mem.eql(u8, p.path, path)) return i;
    return null;
}
