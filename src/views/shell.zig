const h = @import("html");

// `document(body)` wraps a page body in the full HTML shell — all at
// comptime, so each page's `full_template` is a single `[]const u8`.
// CMS-driven pieces (`{title}`, `{device}`) are resolved at request
// time by `h.writeTemplate`.

const html_ = h.TagA("html", "lang=\"en\"");
const head_ = h.Tag("head");
const title_ = h.Tag("title");
const body_ = h.Tag("body");
const main_ = h.TagA("main", "id=\"m\"");
const nav_ = h.TagA("nav", "id=\"n\"");
const lo_ = h.TagA("div", "id=\"lo\"");
const lo_bg_ = h.TagA("div", "id=\"lo-bg\"");
const a_home_ = h.TagA("a", "href=\"/\"");
const a_about_ = h.TagA("a", "href=\"/about\"");
const script_ = h.TagA("script", "src=\"/{device}.js\"");

const head_block: []const u8 = head_(
    h.VoidA("meta", "charset=\"utf-8\"") ++
    h.VoidA("meta", "name=\"viewport\" content=\"width=device-width, initial-scale=1\"") ++
    title_("{title} · zigplate") ++
    h.VoidA("link", "rel=\"stylesheet\" href=\"/app.css\"")
);

const chrome_block: []const u8 =
    nav_(a_home_("Home") ++ a_about_("About")) ++
    lo_(lo_bg_("")) ++
    script_("");

pub fn document(comptime page_body: []const u8) []const u8 {
    return "<!doctype html>" ++ html_(
        head_block ++
        body_(main_(page_body) ++ chrome_block)
    );
}
