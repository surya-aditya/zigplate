// Hand-written tree-sitter bindings — just the subset ts-bundle uses.
// Matches the public ABI (v15) of the vendored tree-sitter library
// under `vendor/tree-sitter/lib/`. Plain `extern fn` declarations, no
// @cImport, no clang dependency from ZLS's side.

pub const Language = opaque {};
pub const Parser = opaque {};
pub const Tree = opaque {};

pub const Node = extern struct {
    context: [4]u32,
    id: ?*const anyopaque,
    tree: ?*const Tree,
};

// Parser lifecycle.
pub extern fn ts_parser_new() ?*Parser;
pub extern fn ts_parser_delete(parser: *Parser) void;
pub extern fn ts_parser_set_language(parser: *Parser, language: *const Language) bool;

// One-shot parse of an in-memory UTF-8 string.
pub extern fn ts_parser_parse_string(
    parser: *Parser,
    old_tree: ?*const Tree,
    string: [*]const u8,
    length: u32,
) ?*Tree;

// Tree lifecycle + root.
pub extern fn ts_tree_delete(tree: *Tree) void;
pub extern fn ts_tree_root_node(tree: *const Tree) Node;

// Node inspection.
pub extern fn ts_node_type(node: Node) [*:0]const u8;
pub extern fn ts_node_start_byte(node: Node) u32;
pub extern fn ts_node_end_byte(node: Node) u32;
pub extern fn ts_node_child_count(node: Node) u32;
pub extern fn ts_node_child(node: Node, i: u32) Node;

// Language factory — provided by the generated tree-sitter-typescript
// parser.c. Linked into the executable through build.zig.
pub extern fn tree_sitter_typescript() *const Language;
