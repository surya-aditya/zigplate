const h = @import("html");

const section_ = h.TagA("section", "class=\"p-home\"");
const h1_ = h.Tag("h1");
const p_ = h.Tag("p");

pub const route = "ho";
pub const default_title = "Home";

pub const body_template: []const u8 = section_(
    h1_("{heading}") ++
    p_("{body}")
);
