const std = @import("std");
const ts = @import("ts.zig");

// ---------------------------------------------------------------------
// ts-bundle: TypeScript → single-file JS bundle, using vendored
// tree-sitter-typescript for parsing. Invocation:
//
//   ts-bundle <entry.ts> <output.js>
//
// Produces an IIFE-wrapped bundle with a tiny module registry, matching
// the shape `bun build --format=iife` produced before.
// ---------------------------------------------------------------------

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const a = gpa.allocator();

    const args = try std.process.argsAlloc(a);
    defer std.process.argsFree(a, args);

    if (args.len < 3) {
        std.debug.print("Usage: ts-bundle <entry.ts> <output.js>\n", .{});
        return error.BadArgs;
    }

    var bundle = Bundle.init(a);
    defer bundle.deinit();

    try bundle.addEntry(args[1]);
    const out = try bundle.emit();
    defer a.free(out);

    if (std.fs.path.dirname(args[2])) |d| std.fs.cwd().makePath(d) catch {};
    try std.fs.cwd().writeFile(.{ .sub_path = args[2], .data = out });

    std.debug.print(
        "  \x1b[36mTS\x1b[0m  {s} \x1b[2m→\x1b[0m {s}  \x1b[2m({d} modules, {d} bytes)\x1b[0m\n",
        .{ args[1], args[2], bundle.modules.items.len, out.len },
    );
}

// ---------------------------------------------------------------------
// Bundle — orchestrates module discovery + per-file transform + emit.
// ---------------------------------------------------------------------

const Module = struct {
    path: []const u8, // repo-relative, e.g. "src/js/d.ts" — canonical
    transformed: []const u8, // owned, already-stripped/rewritten JS body
};

const Bundle = struct {
    a: std.mem.Allocator,
    modules: std.ArrayList(Module) = .empty,
    paths_seen: std.StringHashMapUnmanaged(void) = .{},
    entry: ?[]const u8 = null,

    fn init(a: std.mem.Allocator) Bundle {
        return .{ .a = a };
    }

    fn deinit(self: *Bundle) void {
        for (self.modules.items) |m| {
            self.a.free(m.path);
            self.a.free(m.transformed);
        }
        self.modules.deinit(self.a);
        var it = self.paths_seen.keyIterator();
        while (it.next()) |k| self.a.free(k.*);
        self.paths_seen.deinit(self.a);
    }

    fn addEntry(self: *Bundle, entry: []const u8) !void {
        self.entry = try self.a.dupe(u8, entry);
        try self.visit(entry);
    }

    // BFS through imports. `path` is repo-relative. Dedupes via paths_seen.
    fn visit(self: *Bundle, path: []const u8) !void {
        const canonical = try self.a.dupe(u8, path);
        errdefer self.a.free(canonical);
        const gop = try self.paths_seen.getOrPut(self.a, canonical);
        if (gop.found_existing) {
            self.a.free(canonical);
            return;
        }

        // `.d.ts` declaration files are type-only — emit an empty module.
        if (std.mem.endsWith(u8, path, ".d.ts")) {
            try self.modules.append(self.a, .{
                .path = try self.a.dupe(u8, path),
                .transformed = try self.a.dupe(u8, ""),
            });
            return;
        }

        const src = std.fs.cwd().readFileAlloc(self.a, path, 8 * 1024 * 1024) catch |err| {
            std.debug.print("ts-bundle: can't read {s}: {s}\n", .{ path, @errorName(err) });
            return err;
        };
        defer self.a.free(src);

        var tx = try Transformer.init(self.a, path, src);
        defer tx.deinit();

        const transformed = try tx.run();
        try self.modules.append(self.a, .{
            .path = try self.a.dupe(u8, path),
            .transformed = transformed,
        });

        // Process discovered imports recursively.
        for (tx.deps.items) |dep| try self.visit(dep);
    }

    fn emit(self: *Bundle) ![]u8 {
        var out: std.ArrayList(u8) = .empty;
        errdefer out.deinit(self.a);
        const w = out.writer(self.a);

        try w.writeAll(prelude);
        for (self.modules.items) |m| {
            try w.writeAll("__def(");
            try writeJsonString(w, m.path);
            try w.writeAll(", function(exports, module) {\n");
            try w.writeAll(m.transformed);
            try w.writeAll("\n});\n");
        }
        try w.writeAll("__req(");
        try writeJsonString(w, self.entry.?);
        try w.writeAll(");\n})();\n");
        return out.toOwnedSlice(self.a);
    }
};

const prelude =
    \\(function() {
    \\var __mods = Object.create(null);
    \\var __cache = Object.create(null);
    \\function __def(id, fn) { __mods[id] = fn; }
    \\function __req(id) {
    \\  if (__cache[id]) return __cache[id];
    \\  var module = { exports: {} };
    \\  __cache[id] = module.exports;
    \\  __mods[id](module.exports, module);
    \\  __cache[id] = module.exports;
    \\  return module.exports;
    \\}
    \\
;

// ---------------------------------------------------------------------
// Transformer — runs per-file: parse, collect edits, emit transformed source.
// ---------------------------------------------------------------------

const Edit = struct {
    start: u32,
    end: u32,
    replacement: []const u8, // empty = pure strip
};

const Transformer = struct {
    a: std.mem.Allocator,
    path: []const u8, // for resolving relative imports
    src: []const u8,

    tree: *ts.Tree,
    parser: *ts.Parser,

    edits: std.ArrayList(Edit) = .empty,
    trailing: std.ArrayList(u8) = .empty, // "exports.X = X;" appended after body
    deps: std.ArrayList([]const u8) = .empty, // discovered import targets (owned)
    // Per-class scratch — collected during handleClass, then flushed
    // as an Edit at class.end_byte. Decorator wiring goes here so it
    // runs immediately after the class, before any module-level code.
    class_postlude: std.ArrayList(u8) = .empty,

    fn init(a: std.mem.Allocator, path: []const u8, src: []const u8) !Transformer {
        const parser = ts.ts_parser_new() orelse return error.ParserAlloc;
        errdefer ts.ts_parser_delete(parser);

        _ = ts.ts_parser_set_language(parser, ts.tree_sitter_typescript());

        const tree = ts.ts_parser_parse_string(parser, null, src.ptr, @intCast(src.len)) orelse return error.ParseFailed;
        errdefer ts.ts_tree_delete(tree);

        return .{
            .a = a,
            .path = path,
            .src = src,
            .tree = tree,
            .parser = parser,
        };
    }

    fn deinit(self: *Transformer) void {
        ts.ts_tree_delete(self.tree);
        ts.ts_parser_delete(self.parser);
        self.edits.deinit(self.a);
        self.trailing.deinit(self.a);
        self.class_postlude.deinit(self.a);
        for (self.deps.items) |d| self.a.free(d);
        self.deps.deinit(self.a);
    }

    fn run(self: *Transformer) ![]u8 {
        const root = ts.ts_tree_root_node(self.tree);
        try self.walkProgram(root);

        // Sort edits by start; apply.
        std.mem.sort(Edit, self.edits.items, {}, editLessThan);

        var out: std.ArrayList(u8) = .empty;
        errdefer out.deinit(self.a);
        var cursor: u32 = 0;
        for (self.edits.items) |e| {
            if (e.start < cursor) continue; // overlapping/contained edit — outer already covered it
            try out.appendSlice(self.a, self.src[cursor..e.start]);
            try out.appendSlice(self.a, e.replacement);
            cursor = e.end;
        }
        try out.appendSlice(self.a, self.src[cursor..]);
        try out.appendSlice(self.a, self.trailing.items);
        return out.toOwnedSlice(self.a);
    }

    // Top-level walk — like `walk`, but also handles decorators that
    // appear as siblings of class/function statements at the program
    // root (common tree-sitter-typescript shape for `@Dec class Foo {}`).
    fn walkProgram(self: *Transformer, root: ts.Node) !void {
        const cc = ts.ts_node_child_count(root);
        var i: u32 = 0;
        var pending_start: u32 = 0;
        var pending_end: u32 = 0;
        var pending_calls: std.ArrayList([]const u8) = .empty;
        defer pending_calls.deinit(self.a);

        while (i < cc) : (i += 1) {
            const child = ts.ts_node_child(root, i);
            const ck = std.mem.span(ts.ts_node_type(child));

            if (eq(ck, "decorator")) {
                if (pending_calls.items.len == 0) pending_start = ts.ts_node_start_byte(child);
                pending_end = ts.ts_node_end_byte(child);
                try pending_calls.append(self.a, self.decoratorCallText(child));
                continue;
            }

            if (pending_calls.items.len > 0) {
                // Strip the decorator bytes.
                try self.edits.append(self.a, .{
                    .start = pending_start,
                    .end = pending_end,
                    .replacement = "",
                });

                // Find the class name the decorators apply to.
                const class_name = self.siblingClassName(child);
                if (class_name) |name| {
                    var buf: std.ArrayList(u8) = .empty;
                    defer buf.deinit(self.a);
                    for (pending_calls.items) |call_text| {
                        try buf.writer(self.a).print(
                            "{0s} = ({1s})({0s}) || {0s};",
                            .{ name, call_text },
                        );
                    }
                    const insert_pos = ts.ts_node_end_byte(child);
                    try self.edits.append(self.a, .{
                        .start = insert_pos,
                        .end = insert_pos,
                        .replacement = try self.a.dupe(u8, buf.items),
                    });
                }
                pending_calls.clearRetainingCapacity();
            }

            try self.walk(child);
        }
    }

    // Given a node that's a sibling of decorators (either a class
    // declaration directly or an export_statement wrapping one), return
    // the class's name.
    fn siblingClassName(self: *Transformer, node: ts.Node) ?[]const u8 {
        const k = std.mem.span(ts.ts_node_type(node));
        if (eq(k, "class_declaration") or eq(k, "abstract_class_declaration")) {
            return self.classDeclarationName(node);
        }
        if (eq(k, "export_statement")) {
            const cc = ts.ts_node_child_count(node);
            var i: u32 = 0;
            while (i < cc) : (i += 1) {
                const child = ts.ts_node_child(node, i);
                const ck = std.mem.span(ts.ts_node_type(child));
                if (eq(ck, "class_declaration") or eq(ck, "abstract_class_declaration")) {
                    return self.classDeclarationName(child);
                }
            }
        }
        return null;
    }

    // Recursive AST walk. Returns true iff the caller should skip
    // recursing into this node's children (because we've already elided
    // or rewritten it as a unit).
    fn walk(self: *Transformer, node: ts.Node) anyerror!void {
        const kind_ptr = ts.ts_node_type(node);
        const kind = std.mem.span(kind_ptr);

        // ---- Top-level TS-only declarations → strip entire node ---
        if (eq(kind, "interface_declaration") or
            eq(kind, "type_alias_declaration") or
            eq(kind, "ambient_declaration") or
            eq(kind, "type_annotation") or
            eq(kind, "opting_type_annotation") or
            eq(kind, "type_predicate_annotation") or
            eq(kind, "asserts_annotation") or
            eq(kind, "type_parameters") or
            eq(kind, "type_arguments") or
            eq(kind, "omitting_type_annotation") or
            eq(kind, "adding_type_annotation") or
            eq(kind, "function_signature") or
            eq(kind, "abstract_method_signature") or
            eq(kind, "index_signature") or
            eq(kind, "construct_signature") or
            eq(kind, "call_signature") or
            eq(kind, "implements_clause"))
        {
            try self.addStrip(node);
            return; // don't recurse
        }

        // ---- `as X` / `satisfies X` → keep lhs, drop the rest ----
        if (eq(kind, "as_expression") or eq(kind, "satisfies_expression")) {
            // children: expr, 'as'/'satisfies', type. Strip from the keyword to end.
            const child_count = ts.ts_node_child_count(node);
            var i: u32 = 0;
            while (i < child_count) : (i += 1) {
                const child = ts.ts_node_child(node, i);
                const ck = std.mem.span(ts.ts_node_type(child));
                if (eq(ck, "as") or eq(ck, "satisfies")) {
                    const start = ts.ts_node_start_byte(child);
                    const end = ts.ts_node_end_byte(node);
                    try self.edits.append(self.a, .{ .start = start, .end = end, .replacement = "" });
                    break;
                }
            }
            // Walk LHS subtree; it may contain its own type stuff.
            if (child_count > 0) try self.walk(ts.ts_node_child(node, 0));
            return;
        }

        // ---- Non-null assertion `x!` → drop the bang ----
        if (eq(kind, "non_null_expression")) {
            const child_count = ts.ts_node_child_count(node);
            var i: u32 = 0;
            while (i < child_count) : (i += 1) {
                const child = ts.ts_node_child(node, i);
                const ck = std.mem.span(ts.ts_node_type(child));
                if (eq(ck, "!")) {
                    try self.addStrip(child);
                    break;
                }
            }
            if (child_count > 0) try self.walk(ts.ts_node_child(node, 0));
            return;
        }

        // ---- Accessibility / readonly / override modifiers → strip ----
        if (eq(kind, "accessibility_modifier") or
            eq(kind, "readonly") or
            eq(kind, "override_modifier") or
            eq(kind, "abstract_modifier") or
            eq(kind, "declare_keyword"))
        {
            try self.addStrip(node);
            return;
        }

        // ---- Classes with decorators → transpile legacy-style ----
        if (eq(kind, "class_declaration") or eq(kind, "class")) {
            try self.handleClass(node);
            return;
        }

        // ---- Optional `?` marker on params / members ----
        // For optional_parameter and public_field_definition, the `?`
        // is a raw anonymous child. Walk children and drop standalone `?`.
        // ---- TypeScript `this` parameter — strip param + trailing `,` ----
        // `function foo(this: X, real: Y) {}` → `function foo(real) {}`
        // The `this` parameter is a TS-only construct; at runtime it
        // doesn't exist, so the whole param and its comma have to go.
        if (eq(kind, "required_parameter")) {
            const cc = ts.ts_node_child_count(node);
            if (cc > 0) {
                const first = ts.ts_node_child(node, 0);
                const first_k = std.mem.span(ts.ts_node_type(first));
                if (eq(first_k, "this")) {
                    const start = ts.ts_node_start_byte(node);
                    var end = ts.ts_node_end_byte(node);
                    // Extend through any trailing whitespace + one comma.
                    while (end < self.src.len and (self.src[end] == ' ' or self.src[end] == '\t' or self.src[end] == '\n')) end += 1;
                    if (end < self.src.len and self.src[end] == ',') end += 1;
                    while (end < self.src.len and (self.src[end] == ' ' or self.src[end] == '\t' or self.src[end] == '\n')) end += 1;
                    try self.edits.append(self.a, .{ .start = start, .end = @intCast(end), .replacement = "" });
                    return;
                }
            }
        }

        if (eq(kind, "optional_parameter") or
            eq(kind, "public_field_definition") or
            eq(kind, "method_definition") or
            eq(kind, "method_signature") or
            eq(kind, "required_parameter"))
        {
            const child_count = ts.ts_node_child_count(node);
            // `declare` modifier on a class field means "type-only, don't emit".
            if (eq(kind, "public_field_definition")) {
                var j: u32 = 0;
                while (j < child_count) : (j += 1) {
                    const child = ts.ts_node_child(node, j);
                    const ck = std.mem.span(ts.ts_node_type(child));
                    if (eq(ck, "declare")) {
                        try self.addStrip(node);
                        return;
                    }
                }
            }
            var i: u32 = 0;
            while (i < child_count) : (i += 1) {
                const child = ts.ts_node_child(node, i);
                const ck = std.mem.span(ts.ts_node_type(child));
                // Strip TS-only punctuation on declarations:
                //   `x?:`  → `x`  (optional marker)
                //   `x!:`  → `x`  (definite assignment assertion)
                if (eq(ck, "?") or eq(ck, "!")) try self.addStrip(child);
            }
            i = 0;
            while (i < child_count) : (i += 1) try self.walk(ts.ts_node_child(node, i));
            return;
        }

        // ---- Import ----
        if (eq(kind, "import_statement")) {
            try self.handleImport(node);
            return;
        }

        // ---- Export ----
        if (eq(kind, "export_statement")) {
            try self.handleExport(node);
            return;
        }

        // Default: recurse into children.
        const child_count = ts.ts_node_child_count(node);
        var i: u32 = 0;
        while (i < child_count) : (i += 1) try self.walk(ts.ts_node_child(node, i));
    }

    // ---------------- Imports --------------------------------------

    fn handleImport(self: *Transformer, node: ts.Node) !void {
        // `import type ...` → strip whole statement.
        if (self.isTypeOnlyImport(node)) {
            try self.addStrip(node);
            return;
        }

        // Find the source string literal — last child of type `string`
        // (or inside `string` node).
        const src_text = self.importSourceString(node) orelse {
            try self.addStrip(node);
            return;
        };

        const resolved = try self.resolveImport(src_text);
        try self.deps.append(self.a, try self.a.dupe(u8, resolved));

        // Build replacement: `const <pattern> = __req("<resolved>");`
        const import_clause = self.findChild(node, "import_clause");

        var buf: std.ArrayList(u8) = .empty;
        defer buf.deinit(self.a);
        const w = buf.writer(self.a);

        if (import_clause) |clause| {
            // Inspect clause children to figure out shape.
            try self.emitImportBindings(w, clause, resolved);
        } else {
            // Side-effect only: `import "x";`
            try w.print("__req(\"{s}\");", .{resolved});
        }

        const start = ts.ts_node_start_byte(node);
        const end = ts.ts_node_end_byte(node);
        try self.edits.append(self.a, .{
            .start = start,
            .end = end,
            .replacement = try buf.toOwnedSlice(self.a),
        });
    }

    fn emitImportBindings(self: *Transformer, w: anytype, clause: ts.Node, resolved: []const u8) !void {
        // Possible shapes:
        //   default                        → identifier child
        //   { a, b as c }                  → named_imports
        //   * as ns                        → namespace_import
        //   default, { a, b }              → identifier + named_imports
        //   default, * as ns               → identifier + namespace_import
        var default_name: ?[]const u8 = null;
        var named: ?ts.Node = null;
        var ns: ?ts.Node = null;

        const cc = ts.ts_node_child_count(clause);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const ch = ts.ts_node_child(clause, i);
            const k = std.mem.span(ts.ts_node_type(ch));
            if (eq(k, "identifier")) default_name = self.text(ch);
            if (eq(k, "named_imports")) named = ch;
            if (eq(k, "namespace_import")) ns = ch;
        }

        if (default_name) |name| {
            try w.print("var {s} = __req(\"{s}\").default;", .{ name, resolved });
        }

        if (ns) |ns_node| {
            // children: "*", "as", identifier
            const nc = ts.ts_node_child_count(ns_node);
            var j: u32 = 0;
            while (j < nc) : (j += 1) {
                const ch = ts.ts_node_child(ns_node, j);
                const k = std.mem.span(ts.ts_node_type(ch));
                if (eq(k, "identifier")) {
                    try w.print("var {s} = __req(\"{s}\");", .{ self.text(ch), resolved });
                    break;
                }
            }
        }

        if (named) |named_node| {
            // children include `{`, import_specifier*, `,`, `}`.
            // Each import_specifier: identifier [`as` identifier]
            var first = true;
            try w.print("var {{", .{});
            const nc = ts.ts_node_child_count(named_node);
            var j: u32 = 0;
            while (j < nc) : (j += 1) {
                const spec = ts.ts_node_child(named_node, j);
                const k = std.mem.span(ts.ts_node_type(spec));
                if (!eq(k, "import_specifier")) continue;
                if (isTypeOnlySpec(spec)) continue;
                const sc = ts.ts_node_child_count(spec);
                var orig: ?[]const u8 = null;
                var alias: ?[]const u8 = null;
                var m: u32 = 0;
                while (m < sc) : (m += 1) {
                    const ch = ts.ts_node_child(spec, m);
                    const ck = std.mem.span(ts.ts_node_type(ch));
                    if (eq(ck, "identifier")) {
                        if (orig == null) orig = self.text(ch) else alias = self.text(ch);
                    }
                }
                if (orig == null) continue;
                if (!first) try w.writeAll(", ");
                first = false;
                if (alias) |al| {
                    try w.print("{s}: {s}", .{ orig.?, al });
                } else {
                    try w.print("{s}", .{orig.?});
                }
            }
            try w.print("}} = __req(\"{s}\");", .{resolved});
        }
    }

    fn isTypeOnlyImport(self: *Transformer, node: ts.Node) bool {
        // `import type { X } from "..."` — the `type` keyword appears
        // as an anonymous child between `import` and `import_clause`.
        const cc = ts.ts_node_child_count(node);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const ch = ts.ts_node_child(node, i);
            const k = std.mem.span(ts.ts_node_type(ch));
            if (eq(k, "type")) return true;
        }
        _ = self;
        return false;
    }

    fn isTypeOnlySpec(spec: ts.Node) bool {
        // `{ type X }` — spec has a leading `type` keyword child.
        const cc = ts.ts_node_child_count(spec);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const ch = ts.ts_node_child(spec, i);
            const k = std.mem.span(ts.ts_node_type(ch));
            if (eq(k, "type")) return true;
        }
        return false;
    }

    fn importSourceString(self: *Transformer, node: ts.Node) ?[]const u8 {
        // Find the `string` node child; strip its quotes.
        const cc = ts.ts_node_child_count(node);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const ch = ts.ts_node_child(node, i);
            const k = std.mem.span(ts.ts_node_type(ch));
            if (eq(k, "string")) {
                const full = self.text(ch);
                if (full.len >= 2) return full[1 .. full.len - 1];
            }
        }
        return null;
    }

    // Resolves an import specifier relative to self.path, applying the
    // `@/` → `src/js/` alias, trying `.ts`, `/index.ts`, `.js` fallback.
    fn resolveImport(self: *Transformer, spec: []const u8) ![]const u8 {
        var base: []u8 = undefined;
        var base_owned = false;
        defer if (base_owned) self.a.free(base);

        if (std.mem.startsWith(u8, spec, "@/")) {
            base = try std.fmt.allocPrint(self.a, "src/js/{s}", .{spec[2..]});
            base_owned = true;
        } else if (std.mem.startsWith(u8, spec, "./") or std.mem.startsWith(u8, spec, "../")) {
            const dir = std.fs.path.dirname(self.path) orelse ".";
            base = try std.fs.path.join(self.a, &.{ dir, spec });
            base_owned = true;
        } else {
            base = try self.a.dupe(u8, spec);
            base_owned = true;
        }

        // If the spec already has an extension, trust it.
        if (std.mem.endsWith(u8, base, ".ts") or std.mem.endsWith(u8, base, ".js")) {
            base_owned = false;
            return base;
        }

        // Try `<base>.ts`, then `<base>/index.ts`, then `<base>.js`.
        const candidates = [_][]const u8{ ".ts", "/index.ts", ".js", "/index.js" };
        for (candidates) |suffix| {
            const candidate = try std.fmt.allocPrint(self.a, "{s}{s}", .{ base, suffix });
            if (std.fs.cwd().access(candidate, .{})) |_| {
                return candidate;
            } else |_| {
                self.a.free(candidate);
            }
        }

        // Default fallback if nothing exists — still append `.ts` so the
        // resulting error message is informative.
        return try std.fmt.allocPrint(self.a, "{s}.ts", .{base});
    }

    // ---------------- Exports --------------------------------------

    fn handleExport(self: *Transformer, node: ts.Node) !void {
        const cc = ts.ts_node_child_count(node);

        // Strip + collect any decorators appearing inside the export
        // statement (e.g. `@BMAll(...) export default class Motion {}`).
        // They'll be re-emitted as trailing assignments once the class
        // name is known.
        var pending_calls: std.ArrayList([]const u8) = .empty;
        defer pending_calls.deinit(self.a);
        var dec_start: u32 = 0;
        var dec_end: u32 = 0;
        {
            var k: u32 = 0;
            while (k < cc) : (k += 1) {
                const ch = ts.ts_node_child(node, k);
                const kk = std.mem.span(ts.ts_node_type(ch));
                if (!eq(kk, "decorator")) continue;
                if (pending_calls.items.len == 0) dec_start = ts.ts_node_start_byte(ch);
                dec_end = ts.ts_node_end_byte(ch);
                try pending_calls.append(self.a, self.decoratorCallText(ch));
            }
            if (pending_calls.items.len > 0) {
                try self.edits.append(self.a, .{
                    .start = dec_start,
                    .end = dec_end,
                    .replacement = "",
                });
            }
        }

        // Scan children.
        var has_default = false;
        var has_type_keyword = false;
        var inner: ?ts.Node = null;
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const ch = ts.ts_node_child(node, i);
            const k = std.mem.span(ts.ts_node_type(ch));
            if (eq(k, "default")) has_default = true;
            if (eq(k, "type")) has_type_keyword = true;
            if (eq(k, "export") or eq(k, "default") or eq(k, "type") or eq(k, ";") or eq(k, "decorator")) continue;
            if (inner == null) inner = ch;
        }

        // Emit decorator wiring immediately after the export statement
        // so it runs before any later module-level code (importantly,
        // before the `exports.default = X;` trailing or any sibling
        // `export const RM = new X()`).
        if (pending_calls.items.len > 0) {
            if (inner) |inner_node| {
                const name = self.classDeclarationName(inner_node);
                if (name) |n| {
                    var buf: std.ArrayList(u8) = .empty;
                    defer buf.deinit(self.a);
                    for (pending_calls.items) |call_text| {
                        try buf.writer(self.a).print(
                            "{0s} = ({1s})({0s}) || {0s};",
                            .{ n, call_text },
                        );
                    }
                    const insert_pos = ts.ts_node_end_byte(node);
                    try self.edits.append(self.a, .{
                        .start = insert_pos,
                        .end = insert_pos,
                        .replacement = try self.a.dupe(u8, buf.items),
                    });
                }
            }
        }

        // `export type ...` / `export interface ...` → strip.
        if (has_type_keyword) {
            try self.addStrip(node);
            return;
        }
        if (inner) |inner_node| {
            const ik = std.mem.span(ts.ts_node_type(inner_node));
            if (eq(ik, "interface_declaration") or
                eq(ik, "type_alias_declaration") or
                eq(ik, "ambient_declaration"))
            {
                try self.addStrip(node);
                return;
            }
        }

        // `export default <expr>` → strip `export default` prefix, append `exports.default = <name>;`
        if (has_default) {
            const inner_node = inner orelse {
                try self.addStrip(node);
                return;
            };
            const ik = std.mem.span(ts.ts_node_type(inner_node));

            // For named default class/function, append `exports.default = <name>`.
            // For anonymous or other exprs, rewrite whole statement to
            //   `exports.default = <expr>;`
            const decl_name = self.declarationName(inner_node);
            if (decl_name != null and (eq(ik, "class_declaration") or eq(ik, "function_declaration") or eq(ik, "generator_function_declaration"))) {
                // Strip "export default " (keep the class/function).
                const decl_start = ts.ts_node_start_byte(inner_node);
                const node_start = ts.ts_node_start_byte(node);
                try self.edits.append(self.a, .{ .start = node_start, .end = decl_start, .replacement = "" });
                try self.walk(inner_node);
                try self.trailing.appendSlice(self.a, "\nexports.default = ");
                try self.trailing.appendSlice(self.a, decl_name.?);
                try self.trailing.appendSlice(self.a, ";");
                return;
            }

            // Rewrite: `exports.default = <inner text with walks applied>`.
            // Walk children first to collect edits within the expression,
            // then the emit pass will apply them.
            try self.walk(inner_node);
            const inner_start = ts.ts_node_start_byte(inner_node);
            const node_start = ts.ts_node_start_byte(node);
            const node_end = ts.ts_node_end_byte(node);
            const inner_end = ts.ts_node_end_byte(inner_node);

            try self.edits.append(self.a, .{
                .start = node_start,
                .end = inner_start,
                .replacement = try self.a.dupe(u8, "exports.default = "),
            });
            // If the statement ends with `;` after inner, keep it; else add one.
            if (node_end > inner_end) {
                // No change needed — there's probably a trailing `;` already.
            } else {
                try self.edits.append(self.a, .{
                    .start = inner_end,
                    .end = inner_end,
                    .replacement = try self.a.dupe(u8, ";"),
                });
            }
            return;
        }

        // `export function foo` / `export class Foo` / `export const x` / `export let y`
        if (inner) |inner_node| {
            const decl_name = self.declarationName(inner_node);
            if (decl_name) |name| {
                const inner_start = ts.ts_node_start_byte(inner_node);
                const node_start = ts.ts_node_start_byte(node);
                // Strip just the `export ` prefix.
                try self.edits.append(self.a, .{ .start = node_start, .end = inner_start, .replacement = "" });
                try self.walk(inner_node);
                try self.trailing.appendSlice(self.a, "\nexports.");
                try self.trailing.appendSlice(self.a, name);
                try self.trailing.appendSlice(self.a, " = ");
                try self.trailing.appendSlice(self.a, name);
                try self.trailing.appendSlice(self.a, ";");
                return;
            }

            // Multiple bindings: `export const a = 1, b = 2` — collect each name.
            if (eq(std.mem.span(ts.ts_node_type(inner_node)), "lexical_declaration") or
                eq(std.mem.span(ts.ts_node_type(inner_node)), "variable_declaration"))
            {
                const inner_start = ts.ts_node_start_byte(inner_node);
                const node_start = ts.ts_node_start_byte(node);
                try self.edits.append(self.a, .{ .start = node_start, .end = inner_start, .replacement = "" });
                try self.walk(inner_node);

                // Find each variable_declarator's identifier.
                const icc = ts.ts_node_child_count(inner_node);
                var j: u32 = 0;
                while (j < icc) : (j += 1) {
                    const ch = ts.ts_node_child(inner_node, j);
                    const ck = std.mem.span(ts.ts_node_type(ch));
                    if (!eq(ck, "variable_declarator")) continue;
                    const name_child = ts.ts_node_child(ch, 0);
                    const nk = std.mem.span(ts.ts_node_type(name_child));
                    if (!eq(nk, "identifier")) continue;
                    const name = self.text(name_child);
                    try self.trailing.appendSlice(self.a, "\nexports.");
                    try self.trailing.appendSlice(self.a, name);
                    try self.trailing.appendSlice(self.a, " = ");
                    try self.trailing.appendSlice(self.a, name);
                    try self.trailing.appendSlice(self.a, ";");
                }
                return;
            }
        }

        // Fallback: recurse normally and strip the `export` keyword.
        i = 0;
        while (i < cc) : (i += 1) {
            const ch = ts.ts_node_child(node, i);
            const k = std.mem.span(ts.ts_node_type(ch));
            if (eq(k, "export")) try self.addStrip(ch);
        }
        i = 0;
        while (i < cc) : (i += 1) try self.walk(ts.ts_node_child(node, i));
    }

    fn declarationName(self: *Transformer, node: ts.Node) ?[]const u8 {
        const k = std.mem.span(ts.ts_node_type(node));
        if (eq(k, "function_declaration") or
            eq(k, "class_declaration") or
            eq(k, "generator_function_declaration") or
            eq(k, "abstract_class_declaration"))
        {
            // child 1 is typically the identifier.
            const cc = ts.ts_node_child_count(node);
            var i: u32 = 0;
            while (i < cc) : (i += 1) {
                const ch = ts.ts_node_child(node, i);
                const ck = std.mem.span(ts.ts_node_type(ch));
                if (eq(ck, "identifier") or eq(ck, "type_identifier")) return self.text(ch);
            }
        }
        return null;
    }

    // ---------------- Classes + decorators -------------------------
    //
    // Stage-3 decorators aren't shipped in browsers yet (as of 2025).
    // We transpile to the legacy "decorate(target, key, desc)" form,
    // which the `bind-method.ts` runtime handles (it inspects args to
    // distinguish legacy vs Stage-3 at call time).
    //
    //   @DecClass class Foo {}
    //   → class Foo {}
    //     Foo = DecClass(Foo) || Foo;
    //
    //   class Foo { @DecMethod greet() {} }
    //   → class Foo { greet() {} }
    //     (function(){
    //        var d = Object.getOwnPropertyDescriptor(Foo.prototype, "greet");
    //        var r = DecMethod(Foo.prototype, "greet", d);
    //        if (r) Object.defineProperty(Foo.prototype, "greet", r);
    //     })();

    fn handleClass(self: *Transformer, node: ts.Node) !void {
        // Find the class name — first identifier/type_identifier child.
        const class_name = self.classDeclarationName(node);

        // Decorator wiring is collected here and inserted as a single
        // edit immediately after the class declaration. Inserting at
        // the end of the class (rather than at end-of-module) ensures
        // decorators run before any module-level code that constructs
        // an instance — `export const RM = new RafManager()` would
        // otherwise see the un-decorated class.
        const saved_postlude = self.class_postlude;
        self.class_postlude = .empty;
        defer {
            self.class_postlude.deinit(self.a);
            self.class_postlude = saved_postlude;
        }

        // Collect + strip decorators attached directly to the class.
        const cc = ts.ts_node_child_count(node);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const child = ts.ts_node_child(node, i);
            const ck = std.mem.span(ts.ts_node_type(child));
            if (!eq(ck, "decorator")) continue;
            try self.addStrip(child);
            if (class_name) |name| {
                const call_text = self.decoratorCallText(child);
                try self.class_postlude.writer(self.a).print(
                    "{0s} = ({1s})({0s}) || {0s};",
                    .{ name, call_text },
                );
            }
        }

        // Walk the body; intercept method_definition to emit decorators.
        i = 0;
        while (i < cc) : (i += 1) {
            const child = ts.ts_node_child(node, i);
            const ck = std.mem.span(ts.ts_node_type(child));
            if (eq(ck, "class_body")) {
                try self.walkClassBody(child, class_name);
            } else if (!eq(ck, "decorator")) {
                try self.walk(child);
            }
        }

        // Insert decorator wiring at the end of the class declaration.
        if (self.class_postlude.items.len > 0) {
            const insert_pos = ts.ts_node_end_byte(node);
            const owned = try self.a.dupe(u8, self.class_postlude.items);
            try self.edits.append(self.a, .{
                .start = insert_pos,
                .end = insert_pos,
                .replacement = owned,
            });
        }
    }

    fn walkClassBody(self: *Transformer, body: ts.Node, class_name: ?[]const u8) !void {
        const cc = ts.ts_node_child_count(body);
        var i: u32 = 0;
        // Pending decorators accumulate on the preceding-sibling positions
        // and apply to the next method_definition (tree-sitter pattern).
        var pending_start: u32 = 0;
        var pending_end: u32 = 0;
        var pending_calls: std.ArrayList([]const u8) = .empty;
        defer pending_calls.deinit(self.a);

        while (i < cc) : (i += 1) {
            const member = ts.ts_node_child(body, i);
            const mk = std.mem.span(ts.ts_node_type(member));

            if (eq(mk, "decorator")) {
                if (pending_calls.items.len == 0) {
                    pending_start = ts.ts_node_start_byte(member);
                }
                pending_end = ts.ts_node_end_byte(member);
                try pending_calls.append(self.a, self.decoratorCallText(member));
                continue;
            }

            if (eq(mk, "method_definition") and pending_calls.items.len > 0) {
                // Strip all decorator bytes (one contiguous range).
                try self.edits.append(self.a, .{
                    .start = pending_start,
                    .end = pending_end,
                    .replacement = "",
                });

                const method_name = self.methodDefinitionName(member);
                if (class_name != null and method_name != null) {
                    // Emit the decorator wiring — but defer to per-class
                    // post-emit so it runs immediately after the class
                    // declaration (and crucially, before any module-level
                    // code that constructs an instance).
                    for (pending_calls.items) |call_text| {
                        try self.class_postlude.writer(self.a).print(
                            "(function(){{var d=Object.getOwnPropertyDescriptor({0s}.prototype,\"{1s}\");var r=({2s})({0s}.prototype,\"{1s}\",d);if(r)Object.defineProperty({0s}.prototype,\"{1s}\",r);}})();",
                            .{ class_name.?, method_name.?, call_text },
                        );
                    }
                }
                pending_calls.clearRetainingCapacity();
            }
            try self.walk(member);
        }

        // Any trailing decorators with no method after — just strip them.
        if (pending_calls.items.len > 0) {
            try self.edits.append(self.a, .{
                .start = pending_start,
                .end = pending_end,
                .replacement = "",
            });
        }
    }

    fn methodDefinitionName(self: *Transformer, node: ts.Node) ?[]const u8 {
        const cc = ts.ts_node_child_count(node);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const child = ts.ts_node_child(node, i);
            const ck = std.mem.span(ts.ts_node_type(child));
            if (eq(ck, "property_identifier") or
                eq(ck, "private_property_identifier") or
                eq(ck, "computed_property_name"))
            {
                return self.text(child);
            }
        }
        return null;
    }

    fn classDeclarationName(self: *Transformer, node: ts.Node) ?[]const u8 {
        const cc = ts.ts_node_child_count(node);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const child = ts.ts_node_child(node, i);
            const ck = std.mem.span(ts.ts_node_type(child));
            if (eq(ck, "type_identifier") or eq(ck, "identifier")) {
                return self.text(child);
            }
        }
        return null;
    }

    // Returns the text of the call expression after `@` — i.e. `BM()`
    // for `@BM()`, `BMAll({ e: ["a"] })` for `@BMAll({ e: ["a"] })`.
    fn decoratorCallText(self: *Transformer, decorator: ts.Node) []const u8 {
        const cc = ts.ts_node_child_count(decorator);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const child = ts.ts_node_child(decorator, i);
            const ck = std.mem.span(ts.ts_node_type(child));
            if (!eq(ck, "@")) return self.text(child);
        }
        return self.text(decorator);
    }

    // ---------------- Helpers --------------------------------------

    fn addStrip(self: *Transformer, node: ts.Node) !void {
        const start = ts.ts_node_start_byte(node);
        const end = ts.ts_node_end_byte(node);
        try self.edits.append(self.a, .{ .start = start, .end = end, .replacement = "" });
    }

    fn text(self: *Transformer, node: ts.Node) []const u8 {
        const s = ts.ts_node_start_byte(node);
        const e = ts.ts_node_end_byte(node);
        return self.src[s..e];
    }

    fn findChild(self: *Transformer, node: ts.Node, kind: []const u8) ?ts.Node {
        _ = self;
        const cc = ts.ts_node_child_count(node);
        var i: u32 = 0;
        while (i < cc) : (i += 1) {
            const ch = ts.ts_node_child(node, i);
            const k = std.mem.span(ts.ts_node_type(ch));
            if (eq(k, kind)) return ch;
        }
        return null;
    }
};

fn editLessThan(_: void, a: Edit, b: Edit) bool {
    if (a.start != b.start) return a.start < b.start;
    return a.end > b.end; // outer-first when tied
}

fn eq(a: []const u8, b: []const u8) bool {
    return std.mem.eql(u8, a, b);
}

fn writeJsonString(w: anytype, s: []const u8) !void {
    try w.writeByte('"');
    for (s) |ch| switch (ch) {
        '"' => try w.writeAll("\\\""),
        '\\' => try w.writeAll("\\\\"),
        '\n' => try w.writeAll("\\n"),
        '\r' => try w.writeAll("\\r"),
        else => try w.writeByte(ch),
    };
    try w.writeByte('"');
}
