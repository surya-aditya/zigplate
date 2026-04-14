const std = @import("std");

// JavaScript reserved words and well-known globals that the mangler must
// never rename. Keeping this list in one place makes it easy to extend
// (e.g. add framework-specific globals).
pub const reserved_words = [_][]const u8{
    // Language keywords
    "break",      "case",        "catch",        "continue",      "debugger",
    "default",    "delete",      "do",           "else",          "finally",
    "for",        "function",    "if",           "in",            "instanceof",
    "new",        "return",      "switch",       "this",          "throw",
    "try",        "typeof",      "var",          "void",          "while",
    "with",       "class",       "const",        "enum",          "export",
    "extends",    "import",      "super",        "implements",    "interface",
    "let",        "package",     "private",      "protected",     "public",
    "static",     "yield",       "async",        "await",         "of",

    // Literals
    "undefined",  "null",        "true",         "false",         "NaN",
    "Infinity",

    // Well-known globals the mangler must not touch
    "console",    "window",      "document",     "Math",          "JSON",
    "Array",      "Object",      "String",       "Number",        "Boolean",
    "Date",       "RegExp",      "Error",        "Map",           "Set",
    "Promise",    "Symbol",      "Proxy",        "Reflect",       "parseInt",
    "parseFloat", "isNaN",       "isFinite",     "eval",          "setTimeout",
    "setInterval","clearTimeout","clearInterval","fetch",         "alert",
    "confirm",    "prompt",      "require",      "module",        "exports",
    "global",     "globalThis",  "self",         "arguments",     "prototype",
    "constructor","__proto__",
};

// Is this name something we must not rename?
pub fn isReserved(name: []const u8) bool {
    for (&reserved_words) |rw| {
        if (std.mem.eql(u8, name, rw)) return true;
    }
    return false;
}

// Is this identifier the keyword of a binding declaration?
pub fn isDeclarationKeyword(name: []const u8) bool {
    return std.mem.eql(u8, name, "var") or
        std.mem.eql(u8, name, "let") or
        std.mem.eql(u8, name, "const");
}
