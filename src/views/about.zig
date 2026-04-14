const h = @import("html");

const section_ = h.TagA("section", "class=\"p-about\"");
const h1_ = h.Tag("h1");
const p_ = h.Tag("p");
const a_home_ = h.TagA("a", "href=\"/\"");

pub const route = "ab";
pub const default_title = "About";

pub const body_template: []const u8 = section_(
    h1_("{heading}") ++
    p_("{body}") ++
    p_(a_home_("← Home"))
);
