const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // CSS Minifier
    const css_mod = b.createModule(.{
        .root_source_file = b.path("plugins/CSSMinifier/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    const css_minifier = b.addExecutable(.{
        .name = "css-minifier",
        .root_module = css_mod,
    });
    b.installArtifact(css_minifier);

    // JS Minifier
    const js_mod = b.createModule(.{
        .root_source_file = b.path("plugins/JSMinifier/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    const js_minifier = b.addExecutable(.{
        .name = "js-minifier",
        .root_module = js_mod,
    });
    b.installArtifact(js_minifier);

    // Run steps — forward CLI args via `zig build run-... -- <input> <output>`
    const run_css = b.addRunArtifact(css_minifier);
    const run_js = b.addRunArtifact(js_minifier);
    if (b.args) |args| {
        run_css.addArgs(args);
        run_js.addArgs(args);
    }

    const css_step = b.step("run-css-minifier", "Run CSS Minifier");
    css_step.dependOn(&run_css.step);

    const js_step = b.step("run-js-minifier", "Run JS Minifier");
    js_step.dependOn(&run_js.step);

    // `zig build bundle` — one-shot: minify the project's CSS + JS to public/.
    // Paths are relative to the bundler/ directory (where build.zig lives).
    const bundle_css = b.addRunArtifact(css_minifier);
    bundle_css.addArgs(&.{ "../src/css/main.css", "../public/app.css" });

    const bundle_js = b.addRunArtifact(js_minifier);
    bundle_js.addArgs(&.{ "../src/js/main.js", "../public/app.js" });

    const bundle_step = b.step("bundle", "Minify project CSS + JS into public/");
    bundle_step.dependOn(&bundle_css.step);
    bundle_step.dependOn(&bundle_js.step);

    // Unit tests — tests live in separate `main.test.zig` files.
    const css_test_mod = b.createModule(.{
        .root_source_file = b.path("plugins/CSSMinifier/main.test.zig"),
        .target = target,
        .optimize = optimize,
    });
    const js_test_mod = b.createModule(.{
        .root_source_file = b.path("plugins/JSMinifier/main.test.zig"),
        .target = target,
        .optimize = optimize,
    });
    const css_tests = b.addTest(.{ .root_module = css_test_mod });
    const js_tests = b.addTest(.{ .root_module = js_test_mod });

    const run_css_tests = b.addRunArtifact(css_tests);
    const run_js_tests = b.addRunArtifact(js_tests);

    const test_step = b.step("test", "Run all minifier tests");
    test_step.dependOn(&run_css_tests.step);
    test_step.dependOn(&run_js_tests.step);
}
