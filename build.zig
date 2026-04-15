const std = @import("std");

// ============================================================================
// Zigplate Build Scripts
// ============================================================================
//
//   zig build              Build the server binary (no run, no bundling)
//   zig build serve        Bundle assets + run dev server (one-shot)
//   zig build dev          Watch src/ + rebundle + restart server on change
//                          (requires watchexec: `brew install watchexec`)
//   zig build run          Run the already-built server binary
//   zig build bundle       Minify all assets (CSS + JS)
//   zig build test         Run all tests
//   zig build clean        Remove zig-out/ and .zig-cache/
//
// ============================================================================

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const mk = ModBuilder{ .b = b, .target = target, .optimize = optimize };
    const host = HostTools{ .b = b, .target = b.graph.host };

    // ---------------- Host tools (build-time) ------------------------

    const css_minifier = host.exe("css-minifier", "bundler/plugins/CSSMinifier/main.zig");
    const js_minifier = host.exe("js-minifier", "bundler/plugins/JSMinifier/main.zig");
    const asset_hash = host.exe("asset-hash", "bundler/plugins/AssetHash/main.zig");
    const bundle_report = host.exe("bundle-report", "bundler/plugins/BundleReport/main.zig");

    // TSBundle: Zig-only TypeScript → bundled JS. Links vendored
    // tree-sitter + tree-sitter-typescript (MIT, ~2 MB of C source).
    const ts_bundle = buildTsBundle(b, host.target);

    // Shared stats log — each minifier + the hasher append one CSV line;
    // bundle-report renders the final unified table.
    const stats_log = ".cache/bundle-stats.log";
    const clear_stats = b.addRunArtifact(bundle_report);
    clear_stats.setCwd(b.path("."));
    clear_stats.has_side_effects = true;
    clear_stats.addArgs(&.{ "clear", stats_log });

    // ---------------- Critical-CSS (minified + embedded) -------------

    // Minify root.css into a build-tracked artifact and expose the
    // LazyPath as a module so document.zig can `@embedFile("root_css")`
    // and receive the MINIFIED bytes. Any edit to src/css/root.css
    // re-minifies → the server recompiles with the new bytes inline.
    const min_root = b.addRunArtifact(css_minifier);
    min_root.setCwd(b.path("."));
    min_root.addFileArg(b.path("src/css/root.css"));
    const root_min_path = min_root.addOutputFileArg("root.min.css");
    const root_css = b.createModule(.{ .root_source_file = root_min_path });

    // ---------------- Views + server modules ------------------------

    const html = mk.mod("bundler/plugins/Html/html.zig", .{});
    const cms = mk.mod("src/cms/store.zig", .{});
    const document = mk.mod("src/views/document.zig", .{
        .html = html,
        .root_css = root_css,
    });
    const layouts_page = mk.mod("src/views/layouts/page.zig", .{ .html = html });
    const c_feature_card = mk.mod("src/views/components/feature_card.zig", .{ .html = html });
    const pages_home = mk.mod("src/views/pages/home.zig", .{
        .html = html,
        .cms = cms,
        .components_feature_card = c_feature_card,
        .layouts_page = layouts_page,
    });
    const pages_about = mk.mod("src/views/pages/about.zig", .{
        .html = html,
        .cms = cms,
        .layouts_page = layouts_page,
    });
    const router = mk.mod("src/views/router.zig", .{
        .cms = cms,
        .pages_home = pages_home,
        .pages_about = pages_about,
    });
    const server = mk.mod("server/main.zig", .{
        .html = html,
        .cms = cms,
        .document = document,
        .router = router,
    });

    // ---------------- Server exe + run / serve / dev ----------------

    const exe = b.addExecutable(.{ .name = "zigplate", .root_module = server });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    run_cmd.stdio = .inherit;
    if (b.args) |args| run_cmd.addArgs(args);
    b.step("run", "Run the already-built server binary").dependOn(&run_cmd.step);

    // ---------------- Asset pipeline (CSS + TS/JS) ------------------

    const bundle_step = b.step("bundle", "Minify all assets (CSS + JS)");

    // asset-hash fingerprints the built CSS/JS, renames files in public/,
    // and emits a Zig manifest we import as a module.
    const hash_run = b.addRunArtifact(asset_hash);
    hash_run.setCwd(b.path("."));
    // The tool renames files in public/ as a side effect Zig can't hash;
    // without this flag Zig would cache the step and skip the renames on
    // subsequent builds.
    hash_run.has_side_effects = true;
    const assets_manifest = hash_run.addOutputFileArg("assets.zig");
    hash_run.addArg("public");

    // Per-device override sheets → public/{d,m}.css; then hashed.
    for ([_][]const u8{ "d", "m" }) |name| {
        const src_path = b.fmt("src/css/{s}.css", .{name});
        const out_path = b.fmt("public/{s}.css", .{name});
        const run = b.addRunArtifact(css_minifier);
        run.setCwd(b.path("."));
        run.setEnvironmentVariable("BUNDLE_STATS_LOG", stats_log);
        run.has_side_effects = true;
        run.addArgs(&.{ src_path, out_path });
        run.step.dependOn(&clear_stats.step);
        bundle_step.dependOn(&run.step);
        hash_run.step.dependOn(&run.step);
        hash_run.addArg(b.fmt("{s}.css", .{name}));
    }

    for ([_][]const u8{ "d", "m" }) |name| {
        const entry = b.fmt("src/js/{s}.ts", .{name});
        const intermediate = b.fmt(".cache/ts/{s}.js", .{name});
        const final = b.fmt("public/{s}.js", .{name});

        // ts-bundle: strip TS + resolve imports + wrap in IIFE.
        const tsb = b.addRunArtifact(ts_bundle);
        tsb.setCwd(b.path("."));
        tsb.has_side_effects = true;
        tsb.addArgs(&.{ entry, intermediate });

        const min = b.addRunArtifact(js_minifier);
        min.setCwd(b.path("."));
        min.setEnvironmentVariable("BUNDLE_STATS_LOG", stats_log);
        min.has_side_effects = true;
        min.addArgs(&.{ intermediate, final });
        min.step.dependOn(&tsb.step);
        min.step.dependOn(&clear_stats.step);
        bundle_step.dependOn(&min.step);
        hash_run.step.dependOn(&min.step);
        hash_run.addArg(b.fmt("{s}.js", .{name}));
    }

    hash_run.setEnvironmentVariable("BUNDLE_STATS_LOG", stats_log);
    hash_run.step.dependOn(&clear_stats.step);
    bundle_step.dependOn(&hash_run.step);

    const print_stats = b.addRunArtifact(bundle_report);
    print_stats.setCwd(b.path("."));
    print_stats.has_side_effects = true;
    print_stats.addArgs(&.{ "print", stats_log });
    print_stats.step.dependOn(&hash_run.step);
    bundle_step.dependOn(&print_stats.step);

    const assets = b.createModule(.{
        .root_source_file = assets_manifest,
        .target = target,
        .optimize = optimize,
    });
    server.addImport("assets", assets);

    // Prerender per-device cache JSON to public/<dev>.json. The server
    // itself runs the render code in `--prerender` mode, so the bundle
    // step bakes the SPA bootstrap payload as a static file —
    // `/d.json` and `/m.json` are then served by the regular static
    // path with no per-request rendering cost.
    const prerender = b.addRunArtifact(exe);
    prerender.setCwd(b.path("."));
    prerender.has_side_effects = true;
    prerender.addArgs(&.{ "--prerender", "public" });
    prerender.step.dependOn(b.getInstallStep());
    bundle_step.dependOn(&prerender.step);

    // `serve` = bundle everything, then run.
    run_cmd.step.dependOn(bundle_step);
    b.step("serve", "Bundle assets + run dev server (one-shot)").dependOn(&run_cmd.step);

    // `dev` = wipe stale outputs once, then watchexec-loop `zig build serve`.
    // Clean-on-start guarantees deleted source files don't leave cruft in
    // public/ or .cache/; the watch loop itself is incremental.
    const dev_clean_public = b.addRemoveDirTree(b.path("public"));
    const dev_clean_cache = b.addRemoveDirTree(b.path(".cache"));

    const watch = b.addSystemCommand(&.{
        "watchexec", "--restart", "--clear",
        "--exts",    "zig,ts,css",
        "--watch",   "src",
        "--watch",   "bundler",
        "--watch",   "server",
        "--watch",   "build.zig",
        "--",        "zig", "build", "serve",
    });
    watch.setCwd(b.path("."));
    watch.step.dependOn(&dev_clean_public.step);
    watch.step.dependOn(&dev_clean_cache.step);
    b.step("dev", "Watch src/ + rebuild + restart on change (requires watchexec)").dependOn(&watch.step);

    // ---------------- Tests ----------------------------------------

    const test_step = b.step("test", "Run all tests");
    addTest(b, test_step, server);
    addTest(b, test_step, mk.mod("bundler/plugins/CSSMinifier/main.test.zig", .{}));
    addTest(b, test_step, mk.mod("bundler/plugins/JSMinifier/main.test.zig", .{}));

    // ---------------- Clean ----------------------------------------

    const clean_step = b.step("clean", "Remove zig-out/ and .zig-cache/");
    clean_step.dependOn(&b.addRemoveDirTree(b.path("zig-out")).step);
    clean_step.dependOn(&b.addRemoveDirTree(b.path(".zig-cache")).step);
}

// ---------------- Helpers ---------------------------------------

const ModBuilder = struct {
    b: *std.Build,
    target: std.Build.ResolvedTarget,
    optimize: std.builtin.OptimizeMode,

    fn mod(
        self: ModBuilder,
        path: []const u8,
        imports: anytype,
    ) *std.Build.Module {
        const m = self.b.createModule(.{
            .root_source_file = self.b.path(path),
            .target = self.target,
            .optimize = self.optimize,
        });
        inline for (std.meta.fields(@TypeOf(imports))) |f| {
            m.addImport(f.name, @field(imports, f.name));
        }
        return m;
    }
};

const HostTools = struct {
    b: *std.Build,
    target: std.Build.ResolvedTarget,

    // Build-time helper exe (runs on host). Always ReleaseFast — these
    // are pure transformers where debug info would just slow iteration.
    fn exe(
        self: HostTools,
        name: []const u8,
        path: []const u8,
    ) *std.Build.Step.Compile {
        const m = self.b.createModule(.{
            .root_source_file = self.b.path(path),
            .target = self.target,
            .optimize = .ReleaseFast,
        });
        return self.b.addExecutable(.{ .name = name, .root_module = m });
    }
};

fn addTest(b: *std.Build, step: *std.Build.Step, m: *std.Build.Module) void {
    const t = b.addTest(.{ .root_module = m });
    step.dependOn(&b.addRunArtifact(t).step);
}

// Build the ts-bundle host exe. Tree-sitter + grammar are pulled in
// through Zig's package manager (build.zig.zon → ~/.cache/zig/p/), so
// nothing's vendored in the repo.
fn buildTsBundle(b: *std.Build, host_target: std.Build.ResolvedTarget) *std.Build.Step.Compile {
    const ts_dep = b.dependency("tree_sitter", .{});
    const ts_ts_dep = b.dependency("tree_sitter_typescript", .{});

    const mod = b.createModule(.{
        .root_source_file = b.path("bundler/plugins/TSBundle/main.zig"),
        .target = host_target,
        .optimize = .ReleaseFast,
        .link_libc = true,
    });

    // Keep warnings quiet; the grammar's generated parser is huge and
    // we don't want to maintain a patch on it.
    const cflags = [_][]const u8{
        "-std=c11",
        "-fPIC",
        "-Wno-unused-parameter",
        "-Wno-unused-function",
        "-Wno-unused-but-set-variable",
    };

    // tree-sitter core (amalgamated lib.c pulls in every other .c).
    mod.addCSourceFile(.{ .file = ts_dep.path("lib/src/lib.c"), .flags = &cflags });
    mod.addIncludePath(ts_dep.path("lib/include"));
    mod.addIncludePath(ts_dep.path("lib/src"));

    // tree-sitter-typescript grammar.
    mod.addCSourceFile(.{ .file = ts_ts_dep.path("typescript/src/parser.c"), .flags = &cflags });
    mod.addCSourceFile(.{ .file = ts_ts_dep.path("typescript/src/scanner.c"), .flags = &cflags });
    mod.addIncludePath(ts_ts_dep.path("typescript/src"));
    mod.addIncludePath(ts_ts_dep.path("common"));

    return b.addExecutable(.{ .name = "ts-bundle", .root_module = mod });
}
