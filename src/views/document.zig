const h = @import("html");
const Tag = h.Tag;
const Void = h.Void;

// The site-wide HTML envelope. `{{!content}}` is the rendered page
// body; `{{title}}` and `{{device}}` are resolved against the shell
// ctx built in server/render.zig.

const head_block: []const u8 = Tag("head", "",
    Void("meta", "[charset=utf-8]") ++
    Void("meta", "[name=viewport][content=width=device-width, initial-scale=1]") ++
    Tag("title", "", "{{title}} · zigplate") ++
    Void("link", "[rel=stylesheet][href=/app.css]")
);

const chrome_block: []const u8 =
    Tag("nav", "#n",
        Tag("a", "#n-li-0[href=/]", "Home") ++
        Tag("a", "#n-li-1[href=/about]", "About")
    ) ++
    Tag("div", "#lo", Tag("div", "#lo-bg", "")) ++
    Tag("script", "[src=/{{device}}.js]", "");

pub const template: []const u8 = "<!doctype html>" ++ Tag("html", "[lang=en]",
    head_block ++
    Tag("body", "", Tag("main", "#m", "{{!content}}") ++ chrome_block)
);

// Same envelope with an empty <main> — returned as the cache blob's
// `body` so the SPA has device-correct chrome to hydrate into.
pub const empty: []const u8 = "<!doctype html>" ++ Tag("html", "[lang=en]",
    head_block ++
    Tag("body", "", Tag("main", "#m", "") ++ chrome_block)
);
