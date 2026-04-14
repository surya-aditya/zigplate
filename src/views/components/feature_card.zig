const h = @import("html");
const Tag = h.Tag;

pub const template: []const u8 = Tag("div", ".feature-card",
    Tag("h3", "", "{{title}}") ++
    Tag("p", "", "{{description}}")
);

pub const Item = struct {
    title: []const u8,
    description: []const u8,

    pub fn get(self: Item, key: []const u8) []const u8 {
        const eql = @import("std").mem.eql;
        if (eql(u8, key, "title")) return self.title;
        if (eql(u8, key, "description")) return self.description;
        return "";
    }
};
