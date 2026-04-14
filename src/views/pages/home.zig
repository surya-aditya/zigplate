const std = @import("std");
const h = @import("html");
const cms = @import("cms");
const feature_card = @import("components_feature_card");
const layouts_page = @import("layouts_page");

const Tag = h.Tag;
const PageLayout = layouts_page.PageLayout;

pub const route = "ho";
pub const default_title = "Home";

// --- Template -------------------------------------------------------

const inner: []const u8 =
    Tag("section", ".hero", Tag("h1", "", "{{heading}}") ++
        Tag("p", ".subtitle", "{{subtitle}}")) ++
    Tag("section", ".features", "{{!features}}");

fn wrap(comptime is_desktop: bool) []const u8 {
    return PageLayout(.{
        .children = inner,
        .is_desktop = is_desktop,
        .bg_id = "home-bg",
    });
}

const bodies = [_][]const u8{ wrap(true), wrap(false) };

// --- Data + render --------------------------------------------------

const seed_features = [_]feature_card.Item{
    .{ .title = "Server-side", .description = "Every request renders through Zig." },
    .{ .title = "Per-device", .description = "Desktop and mobile get separate bundles + templates." },
    .{ .title = "CMS-ready", .description = "Swap seed data for Sanity / Prismic / your own." },
};

const Ctx = struct {
    heading: []const u8,
    subtitle: []const u8,
    features: []const u8,

    pub fn get(self: Ctx, key: []const u8) []const u8 {
        return h.ctxGet(self, key);
    }
};

pub fn renderBody(
    w: anytype,
    allocator: std.mem.Allocator,
    device_idx: usize,
    content: cms.Content,
) !void {
    const features_html = try h.renderList(allocator, feature_card.template, &seed_features);
    defer allocator.free(features_html);

    const ctx = Ctx{
        .heading = content.get("heading"),
        .subtitle = content.get("subtitle"),
        .features = features_html,
    };
    try h.writeTemplate(w, bodies[device_idx], ctx);
}
