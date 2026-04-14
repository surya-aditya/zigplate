const std = @import("std");

// ============================================================================
// Zigplate Build Scripts — like package.json but in Zig
// ============================================================================
//
//   zig build              Build the server + bundler plugins
//   zig build run          Run the dev server
//   zig build dev          Bundle assets + run the dev server
//   zig build bundle       Minify CSS and JS into public/
//   zig build css          Minify CSS only
//   zig build js           Minify JS only
//   zig build test         Run all tests (server + bundler plugins)
//   zig build clean        Remove build artifacts
//
// ============================================================================

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const host = b.graph.host;

    // -----------------------------------------------------------------------
    // 1. Server executable
    // -----------------------------------------------------------------------

    // Shared DSL + CMS + views wired as named modules so cross-directory
    // imports are explicit (each module sandboxes to its root_source_file
    // in Zig 0.15).
    const html_mod = b.createModule(.{
        .root_source_file = b.path("bundler/plugins/Html/html.zig"),
        .target = target,
        .optimize = optimize,
    });
    const cms_store_mod = b.createModule(.{
        .root_source_file = b.path("src/cms/store.zig"),
        .target = target,
        .optimize = optimize,
    });

    // Module naming mirrors filesystem paths with `_` separators:
    //   src/views/document.zig             → "document"
    //   src/views/layouts/page.zig         → "layouts_page"
    //   src/views/components/feature_card  → "components_feature_card"
    //   src/views/pages/home.zig           → "pages_home"
    //   src/views/router.zig               → "router"

    // Document envelope.
    const document_mod = b.createModule(.{
        .root_source_file = b.path("src/views/document.zig"),
        .target = target,
        .optimize = optimize,
    });
    document_mod.addImport("html", html_mod);

    // Layouts — per-page wrappers.
    const layouts_page_mod = b.createModule(.{
        .root_source_file = b.path("src/views/layouts/page.zig"),
        .target = target,
        .optimize = optimize,
    });
    layouts_page_mod.addImport("html", html_mod);

    // Components (atoms).
    const components_feature_card_mod = b.createModule(.{
        .root_source_file = b.path("src/views/components/feature_card.zig"),
        .target = target,
        .optimize = optimize,
    });
    components_feature_card_mod.addImport("html", html_mod);

    // Pages.
    const pages_home_mod = b.createModule(.{
        .root_source_file = b.path("src/views/pages/home.zig"),
        .target = target,
        .optimize = optimize,
    });
    pages_home_mod.addImport("html", html_mod);
    pages_home_mod.addImport("cms", cms_store_mod);
    pages_home_mod.addImport("components_feature_card", components_feature_card_mod);
    pages_home_mod.addImport("layouts_page", layouts_page_mod);

    const pages_about_mod = b.createModule(.{
        .root_source_file = b.path("src/views/pages/about.zig"),
        .target = target,
        .optimize = optimize,
    });
    pages_about_mod.addImport("html", html_mod);
    pages_about_mod.addImport("cms", cms_store_mod);
    pages_about_mod.addImport("layouts_page", layouts_page_mod);

    // Router — registry + dispatch.
    const router_mod = b.createModule(.{
        .root_source_file = b.path("src/views/router.zig"),
        .target = target,
        .optimize = optimize,
    });
    router_mod.addImport("cms", cms_store_mod);
    router_mod.addImport("pages_home", pages_home_mod);
    router_mod.addImport("pages_about", pages_about_mod);

    const server_mod = b.createModule(.{
        .root_source_file = b.path("server/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    server_mod.addImport("html", html_mod);
    server_mod.addImport("cms", cms_store_mod);
    server_mod.addImport("document", document_mod);
    server_mod.addImport("router", router_mod);

    const exe = b.addExecutable(.{
        .name = "zigplate",
        .root_module = server_mod,
    });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    run_cmd.stdio = .inherit;
    if (b.args) |args| run_cmd.addArgs(args);

    const run_step = b.step("run", "Run the Zigplate dev server");
    run_step.dependOn(&run_cmd.step);

    const dev_step = b.step("dev", "Bundle assets and serve on http://127.0.0.1:8000");

    // -----------------------------------------------------------------------
    // 2. Bundler plugins — CSS and JS minifiers
    // -----------------------------------------------------------------------

    const css_mod = b.createModule(.{
        .root_source_file = b.path("bundler/plugins/CSSMinifier/main.zig"),
        .target = host,
        .optimize = .ReleaseFast,
    });
    const css_minifier = b.addExecutable(.{
        .name = "css-minifier",
        .root_module = css_mod,
    });

    const js_mod = b.createModule(.{
        .root_source_file = b.path("bundler/plugins/JSMinifier/main.zig"),
        .target = host,
        .optimize = .ReleaseFast,
    });
    const js_minifier = b.addExecutable(.{
        .name = "js-minifier",
        .root_module = js_mod,
    });

    const run_css = b.addRunArtifact(css_minifier);
    run_css.setCwd(b.path("."));
    run_css.addArgs(&.{ "src/css/main.css", "public/app.css" });

    const css_step = b.step("css", "Minify CSS  ->  public/app.css");
    css_step.dependOn(&run_css.step);

    const ts_entries = [_][]const u8{ "d", "m" };
    const ts_step = b.step("ts", "Bundle TypeScript entries");
    const js_step = b.step("js", "Bundle + minify all JS bundles");

    for (ts_entries) |name| {
        const entry = b.fmt("src/js/{s}.ts", .{name});
        const out_intermediate = b.fmt(".cache/ts/{s}.js", .{name});
        const out_final = b.fmt("public/{s}.js", .{name});

        const bun = b.addSystemCommand(&.{
            "bun",      "build",
            entry,      "--outfile",
            out_intermediate,
            "--target", "browser",
            "--format=iife",
        });
        bun.setCwd(b.path("."));
        ts_step.dependOn(&bun.step);

        const run = b.addRunArtifact(js_minifier);
        run.setCwd(b.path("."));
        run.addArgs(&.{ out_intermediate, out_final });
        run.step.dependOn(&bun.step);
        js_step.dependOn(&run.step);
    }

    // HTML + route cache are rendered on demand by the server
    // (see `server/render.zig`). No build-time HTML generation.

    const bundle_step = b.step("bundle", "Minify all assets (CSS + JS)");
    bundle_step.dependOn(&run_css.step);
    bundle_step.dependOn(js_step);

    run_cmd.step.dependOn(&run_css.step);
    run_cmd.step.dependOn(js_step);
    dev_step.dependOn(&run_cmd.step);

    // -----------------------------------------------------------------------
    // 3. Tests
    // -----------------------------------------------------------------------

    const test_step = b.step("test", "Run all tests");

    const server_test_mod = b.createModule(.{
        .root_source_file = b.path("server/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    const server_tests = b.addTest(.{ .root_module = server_test_mod });
    test_step.dependOn(&b.addRunArtifact(server_tests).step);

    const css_test_mod = b.createModule(.{
        .root_source_file = b.path("bundler/plugins/CSSMinifier/main.test.zig"),
        .target = target,
        .optimize = optimize,
    });
    const css_tests = b.addTest(.{ .root_module = css_test_mod });
    test_step.dependOn(&b.addRunArtifact(css_tests).step);

    const js_test_mod = b.createModule(.{
        .root_source_file = b.path("bundler/plugins/JSMinifier/main.test.zig"),
        .target = target,
        .optimize = optimize,
    });
    const js_tests = b.addTest(.{ .root_module = js_test_mod });
    test_step.dependOn(&b.addRunArtifact(js_tests).step);

    // -----------------------------------------------------------------------
    // 4. Clean
    // -----------------------------------------------------------------------

    const clean_step = b.step("clean", "Remove build artifacts");
    clean_step.dependOn(&b.addRemoveDirTree(b.path("zig-out")).step);
    clean_step.dependOn(&b.addRemoveDirTree(b.path(".zig-cache")).step);
}
