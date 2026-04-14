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

    // "zig build ts" — bundle TypeScript entries with bun. bun handles
    // path aliases (@/…), concatenates imports, and emits a self-contained
    // JS bundle per entry. Each entry is piped through our Zig minifier
    // afterwards to get the final public/<name>.js.
    const ts_entries = [_][]const u8{ "d", "m" };
    const ts_step = b.step("ts", "Bundle TypeScript entries");
    const js_step = b.step("js", "Bundle + minify all JS bundles");

    for (ts_entries) |name| {
        const entry = b.fmt("src/js/{s}.ts", .{name});
        const out_intermediate = b.fmt(".cache/ts/{s}.js", .{name});
        const out_final = b.fmt("public/{s}.js", .{name});

        // bun build entry --outfile .cache/ts/<name>.js --target browser --format=iife
        // `iife` wraps everything in a self-invoking function so our
        // mangler can rename every local without worrying about exports.
        const bun = b.addSystemCommand(&.{
            "bun",    "build",
            entry,    "--outfile",
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

    // Prerender tool — substitutes __DEVICE__ and __SEED_DATA__ in HTML
    // templates to produce one pre-rendered file per (page × device).
    const prerender = b.addExecutable(.{
        .name = "prerender",
        .root_source_file = b.path("bundler/plugins/Prerender/main.zig"),
        .target = b.host,
        .optimize = .ReleaseFast,
    });

    // `pages` maps a template basename to its data file basename. Both are
    // resolved relative to src/ and src/data/ respectively.
    const pages = [_][]const u8{ "index", "about" };
    const devices = [_][]const u8{ "d", "m" };

    const copy_html_step = b.step("html", "Prerender HTML pages per device");
    for (pages) |page| {
        for (devices) |dev| {
            const page_html = b.fmt("src/pages/{s}.html", .{page});
            const data = b.fmt("src/data/{s}.json", .{page});
            const out = b.fmt("public/{s}.{s}.html", .{ page, dev });

            const run = b.addRunArtifact(prerender);
            run.setCwd(b.path("."));
            run.addArgs(&.{ "src/shell.html", page_html, data, dev, out });
            copy_html_step.dependOn(&run.step);
        }
    }

    // Cache aggregator — one rich blob per device covering every route.
    const cachegen = b.addExecutable(.{
        .name = "cachegen",
        .root_source_file = b.path("bundler/plugins/CacheGen/main.zig"),
        .target = b.host,
        .optimize = .ReleaseFast,
    });
    const cache_step = b.step("cache", "Build per-device route cache into public/cache/");
    for (devices) |dev| {
        const out = b.fmt("public/cache/{s}.json", .{dev});
        const run = b.addRunArtifact(cachegen);
        run.setCwd(b.path("."));
        run.addArgs(&.{ dev, "src/shell.html", "src/pages", "src/data", out });
        cache_step.dependOn(&run.step);
    }

    // "zig build bundle"
    const bundle_step = b.step("bundle", "Minify all assets (CSS + JS)");
    bundle_step.dependOn(&run_css.step);
    bundle_step.dependOn(js_step);
    bundle_step.dependOn(copy_html_step);
    bundle_step.dependOn(cache_step);

    // Ensure `dev` bundles assets before starting the server.
    run_cmd.step.dependOn(&run_css.step);
    run_cmd.step.dependOn(js_step);
    run_cmd.step.dependOn(copy_html_step);
    run_cmd.step.dependOn(cache_step);
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
