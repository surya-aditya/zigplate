const std = @import("std");
const h = @import("html");
const cms = @import("cms");
const layouts_page = @import("layouts_page");

const Tag = h.Tag;
const PageLayout = layouts_page.PageLayout;

pub const route = "ab";
pub const default_title = "About";

// --- Template -------------------------------------------------------

const inner: []const u8 = Tag("section", "", Tag("h1", "", "{{heading}}") ++
    Tag("p", "", "{{body}}") ++
    Tag("p", "", Tag("a", "[href=/]", "← Home")));

fn wrap(comptime is_desktop: bool) []const u8 {
    return PageLayout(.{
        .children = inner,
        .is_desktop = is_desktop,
    });
}

const bodies = [_][]const u8{ wrap(true), wrap(false) };

// --- Data + render --------------------------------------------------

const Ctx = struct {
    heading: []const u8,
    body: []const u8,

    pub fn get(self: Ctx, key: []const u8) []const u8 {
        return h.ctxGet(self, key);
    }
};

pub fn renderBody(
    w: anytype,
    _: std.mem.Allocator,
    device_idx: usize,
    content: cms.Content,
) !void {
    const ctx = Ctx{
        .heading = content.get("heading"),
        .body = content.get("body"),
    };
    try h.writeTemplate(w, bodies[device_idx], ctx);
}
