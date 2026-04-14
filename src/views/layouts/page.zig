const h = @import("html");
const Tag = h.Tag;

// PageLayout — direct port of the React equivalent. Wraps a page body
// in the `.pg_` / `.pg` structure, with the overlay chrome that only
// desktop gets. Every option is comptime, so mobile builds don't carry
// the desktop-only markup at all.
//
//   PageLayout(.{ .children = inner, .is_desktop = true, .bg_id = "x" });
pub fn PageLayout(comptime opts: struct {
    children: []const u8,
    is_desktop: bool = true,
    is_overlay: bool = true,
    bg_id: ?[]const u8 = null,
    custom_elements: []const u8 = "",
}) []const u8 {
    const show_overlay = opts.is_desktop and opts.is_overlay;

    const bg_sel: []const u8 = if (opts.bg_id) |id|
        "#" ++ id ++ ".pg-bg[data-ns]"
    else
        ".pg-bg[data-ns]";

    const overlay_bg: []const u8 = if (show_overlay) Tag("div", bg_sel, "") else "";
    const overlay_ov: []const u8 = if (show_overlay) Tag("div", ".pg-ov", "") else "";

    return Tag("div", ".pg_",
        Tag("div", ".pg-o._ns", "") ++
        opts.custom_elements ++
        Tag("div", ".pg", overlay_bg ++ opts.children) ++
        overlay_ov
    );
}
