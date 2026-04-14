const std = @import("std");

// ============================================================================
// Zigplate Build Scripts — like package.json but in Zig
// ============================================================================
//
// Available commands:
//
//   zig build              Build the server + bundler plugins
//   zig build run          Run the dev server
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

    // -----------------------------------------------------------------------
    // 1. Server executable
    // -----------------------------------------------------------------------

    const exe = b.addExecutable(.{
        .name = "zigplate",
        .root_source_file = b.path("server/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    // `.inherit` hands the terminal directly to the server so Ctrl+C
    // reaches the server's signal handler instead of the build runner.
    run_cmd.stdio = .inherit;
    if (b.args) |args| {
        run_cmd.addArgs(args);
    }
    const run_step = b.step("run", "Run the Zigplate dev server");
    run_step.dependOn(&run_cmd.step);

    // "zig build dev" — bundle assets first, then run server.
    const dev_step = b.step("dev", "Bundle assets and serve on http://127.0.0.1:8000");

    // -----------------------------------------------------------------------
    // 2. Bundler plugins — CSS and JS minifiers
    // -----------------------------------------------------------------------

    const css_minifier = b.addExecutable(.{
        .name = "css-minifier",
        .root_source_file = b.path("bundler/plugins/CSSMinifier/main.zig"),
        .target = b.host,
        .optimize = .ReleaseFast,
    });

    const js_minifier = b.addExecutable(.{
        .name = "js-minifier",
        .root_source_file = b.path("bundler/plugins/JSMinifier/main.zig"),
        .target = b.host,
        .optimize = .ReleaseFast,
    });

    // "zig build css"
    const run_css = b.addRunArtifact(css_minifier);
    run_css.setCwd(b.path("."));
    run_css.addArgs(&.{ "src/css/main.css", "public/app.css" });

    const css_step = b.step("css", "Minify CSS  ->  public/app.css");
    css_step.dependOn(&run_css.step);

    // "zig build ts" — compile TypeScript src/ts/*.ts → src/js/*.js
    const tsc = b.addSystemCommand(&.{ "tsc", "--project", "tsconfig.json" });
    tsc.setCwd(b.path("."));
    const ts_step = b.step("ts", "Compile TypeScript ->  src/js/");
    ts_step.dependOn(&tsc.step);

    // "zig build js" — minify the compiled JS.
    const run_js = b.addRunArtifact(js_minifier);
    run_js.setCwd(b.path("."));
    run_js.addArgs(&.{ ".cache/ts/main.js", "public/app.js" });
    run_js.step.dependOn(&tsc.step);

    const js_step = b.step("js", "Compile TS + minify JS -> public/app.min.js");
    js_step.dependOn(&run_js.step);

    // Copy every HTML page in src/ into public/. Add more by adding to
    // this list — the server picks them up automatically.
    const html_pages = [_][]const u8{ "index.html", "about.html" };
    const copy_html_step = b.step("html", "Copy HTML pages into public/");
    for (html_pages) |page| {
        const src_path = b.fmt("src/{s}", .{page});
        const copy = b.addInstallFileWithDir(b.path(src_path), .{ .custom = "../public" }, page);
        copy_html_step.dependOn(&copy.step);
    }

    // "zig build bundle"
    const bundle_step = b.step("bundle", "Minify all assets (CSS + JS)");
    bundle_step.dependOn(&run_css.step);
    bundle_step.dependOn(&run_js.step);
    bundle_step.dependOn(copy_html_step);

    // Ensure `dev` bundles assets before starting the server.
    run_cmd.step.dependOn(&run_css.step);
    run_cmd.step.dependOn(&run_js.step);
    run_cmd.step.dependOn(copy_html_step);
    dev_step.dependOn(&run_cmd.step);

    // -----------------------------------------------------------------------
    // 3. Tests
    // -----------------------------------------------------------------------

    const test_step = b.step("test", "Run all tests");

    const server_tests = b.addTest(.{
        .root_source_file = b.path("server/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    test_step.dependOn(&b.addRunArtifact(server_tests).step);

    const css_tests = b.addTest(.{
        .root_source_file = b.path("bundler/plugins/CSSMinifier/main.test.zig"),
        .target = target,
        .optimize = optimize,
    });
    test_step.dependOn(&b.addRunArtifact(css_tests).step);

    const js_tests = b.addTest(.{
        .root_source_file = b.path("bundler/plugins/JSMinifier/main.test.zig"),
        .target = target,
        .optimize = optimize,
    });
    test_step.dependOn(&b.addRunArtifact(js_tests).step);

    // -----------------------------------------------------------------------
    // 4. Clean
    // -----------------------------------------------------------------------

    const clean_step = b.step("clean", "Remove build artifacts");
    clean_step.dependOn(&b.addRemoveDirTree("zig-out").step);
    clean_step.dependOn(&b.addRemoveDirTree(".zig-cache").step);
}
