# Zigplate

A tiny server-side-rendered web stack in Zig, with TypeScript for the client and a custom bundler. Per-device builds (desktop / mobile), comptime-composed HTML templates, content-addressed assets, CMS-swappable content, and real observability — all in ~1.5 MB of RSS.

---

## Highlights

- **Zig-only toolchain.** Server, HTML DSL, CSS minifier, TypeScript bundler (via vendored tree-sitter), JS minifier, asset hasher — all Zig + vendored C. No Node, no Bun, no npm, no external runtime. The only tool you install on a VPS is `zig` itself.
- **Zig SSR.** Pages render on every request through comptime-composed templates (`src/views/`). No runtime template parser.
- **React-style component DSL.** `Tag("h1", "#title.hero", "{{heading}}")` — Emmet-like selectors, mustache slots, HTML-escaping built in.
- **Per-device output.** Desktop and mobile have separate HTML templates, separate JS bundles (`d.js` / `m.js`), and separate CSS overlays (`d.css` / `m.css`). The server sniffs the User-Agent and picks the right one.
- **CMS-ready.** A `Store` in `src/cms/` owns route content. Swap the seed for a Sanity / Prismic / bespoke adapter; `POST /_cms/invalidate` refreshes the render cache.
- **Content-addressed assets.** Bundler emits `d.<hash>.js` etc. + an auto-generated Zig manifest the server imports, so cache-control can safely be `immutable`.
- **Critical CSS inlined.** `root.css` is minified at build time and `@embedFile`d into the binary — every first paint arrives in one round-trip.
- **Runtime observability.** `/_/stats` JSON endpoint + a compact live `VITALS` badge in the terminal showing requests / errors / render-max / cache-hit / memory / CPU.
- **Hot reload for dev.** `zig build dev` wipes stale outputs and spawns `watchexec` — any save to `.zig` / `.ts` / `.css` rebuilds + restarts in ~1 s.

---

## Requirements

### Build + run

| Tool          | Required for         | Install                                                                 |
|---------------|----------------------|-------------------------------------------------------------------------|
| **Zig 0.15.2** | everything           | [ziglang.org/download](https://ziglang.org/download/) · `brew install zig` · `apt: ziglang/ppa` · `asdf`, `mise`, or the tarball |
| **watchexec** | `zig build dev` only | [watchexec.github.io](https://watchexec.github.io) · `brew install watchexec` · `cargo install watchexec-cli` · `apt install watchexec` |

**That's the whole list.** Zig compiles the server, compiles the vendored C (tree-sitter + grammar), and runs the TypeScript→JS pipeline all through its own build graph. No Node, no Bun, no esbuild, no npm.

### Deployment

Ship the compiled binary plus the `public/` directory:

```
zig-out/bin/zigplate        ← built with `zig build -Doptimize=ReleaseFast`
public/                     ← populated by `zig build bundle`
```

The binary is statically-linked, cross-compilable, and the whole thing runs with zero other dependencies on the target.

### Deployment examples

**Docker** (multi-stage, final image < 3 MB):
```dockerfile
FROM alpine:latest AS build
RUN apk add --no-cache zig
COPY . /src
WORKDIR /src
RUN zig build bundle -Doptimize=ReleaseFast
RUN zig build -Doptimize=ReleaseFast

FROM scratch
COPY --from=build /src/zig-out/bin/zigplate /zigplate
COPY --from=build /src/public /public
EXPOSE 8000
CMD ["/zigplate", "/public", "8000"]
```

**Bare VM / VPS**:
```bash
# on the VPS — one tool installed
curl -fsSL https://ziglang.org/download/... | tar -xJ

# build + serve
zig build bundle -Doptimize=ReleaseFast
zig build run -Doptimize=ReleaseFast -- public 80
```

Cross-compile from another host if you prefer: `-Dtarget=x86_64-linux-gnu`.

---

## Commands

```
zig build              Build the server binary (no run, no bundling)
zig build serve        Bundle assets + run dev server on http://127.0.0.1:8000
zig build dev          Watch src/ + rebundle + restart server on change
zig build run          Run the already-built binary
zig build bundle       Minify all assets (CSS + JS) + hash them
zig build test         Run all tests
zig build clean        Remove zig-out/ and .zig-cache/
```

For production, add `-Doptimize=ReleaseFast`:

```bash
zig build serve -Doptimize=ReleaseFast
```

Drops RSS from ~2 MB to ~1.5 MB and renders roughly 3× faster.

---

## Directory layout

```
server/               Request handler, render orchestrator, CMS store, logs, stats
  main.zig            entry + sigaction + stats instantiation
  static.zig          per-request pipeline (arena, timeouts, stats)
  render.zig          renderDocument + renderCacheBlob + Cache
  stats.zig           atomic counters + /_/stats JSON
  log.zig             all ANSI / terminal output lives here

src/
  cms/store.zig       in-memory Content store (per-entry gpa-owned)
  css/                root.css (inlined), d.css / m.css (per-device)
  js/                 TypeScript: d.ts / m.ts entries, _d_/_m_ engines, VFX, utils
  views/
    document.zig      <!doctype html> envelope
    layouts/page.zig  PageLayout wrapper (overlay chrome, per-device)
    components/       reusable atoms (feature_card, …)
    pages/            per-route body + prepareCtx + renderBody
    router.zig        registry + dispatch

bundler/plugins/      host-side build tools (run at build time)
  Html/               comptime HTML DSL (Tag / Void / writeTemplate)
  CSSMinifier/        CSS → minified CSS
  TSBundle/           TypeScript → JS via tree-sitter
  JSMinifier/         mangling + whitespace strip for JS bundles
  AssetHash/          SHA-256 rename + Zig manifest emit
  BundleReport/       aggregates per-tool stats into a PM2-style table
```

C dependencies (tree-sitter + tree-sitter-typescript) are declared in `build.zig.zon`. Zig downloads them to `~/.cache/zig/p/` on first build — nothing's vendored in the repo.

---

## The template DSL

Every page builds at comptime:

```zig
const h = @import("html");
const Tag = h.Tag;

const inner: []const u8 =
    Tag("section", ".hero",
        Tag("h1", "",         "{{heading}}") ++
        Tag("p",  ".subtitle", "{{subtitle}}")
    ) ++
    Tag("section", ".features", "{{!features}}");

pub const body_d = PageLayout(.{ .children = inner, .is_desktop = true  });
pub const body_m = PageLayout(.{ .children = inner, .is_desktop = false });
```

**Selector grammar** (Emmet-like):
- `#id` — at most one
- `.class` — repeat, joined with spaces
- `[key=value]` — any attribute; bare `[disabled]` is allowed

**Slot grammar** (mustache):
- `{{key}}` — HTML-escaped scalar from `ctx.get(key)`
- `{{!key}}` — raw passthrough (pre-rendered fragments)

See `bundler/plugins/Html/html.zig` for the full parser (~150 lines).

---

## Routing

1. `GET /`, `GET /about`, … → SSR full document via `server/render.zig:renderDocument`.
2. `GET /<anything>?d=<d|m>` → per-device JSON cache blob (memoised; regenerated only when the CMS `version` bumps).
3. `POST /_cms/invalidate` (or `GET`) → wipes the render cache.
4. `GET /_/stats` → observability snapshot.
5. Anything else → static file from `public/`, with `Cache-Control: public, max-age=31536000, immutable` for content-hashed URLs and `max-age=60` for the rest.

Adding a page = three lines in `src/views/router.zig` (one entry in `pages`, one in `page_modules`) plus a new `src/views/pages/<name>.zig` exporting `route`, `default_title`, and `renderBody`.

---

## CMS

`src/cms/store.zig` exposes a thread-safe `Store` holding per-route `Content` (title + string-keyed fields). Each `Store.replace` dupes into its own allocator and frees the prior entry — no arena churn, no leak on repeated updates.

Plug a real CMS in by writing an adapter that calls `store.replace(route, content)` on webhook / poll, then hits `POST /_cms/invalidate` (in-process or via HTTP) to drop the render cache.

---

## Asset pipeline

```
src/css/root.css   ─→ CSSMinifier   ─→ .zig-cache/root.min.css  ─→ @embedFile into server
src/css/d.css      ─→ CSSMinifier   ─→ public/d.css             ─→ AssetHash → public/d.<hash>.css
src/css/m.css      ─→ CSSMinifier   ─→ public/m.css             ─→ AssetHash → public/m.<hash>.css
src/js/d.ts        ─→ bun build     ─→ .cache/ts/d.js           ─→ JSMinifier → public/d.js → AssetHash → public/d.<hash>.js
src/js/m.ts        ─→ bun build     ─→ .cache/ts/m.js           ─→ JSMinifier → public/m.js → AssetHash → public/m.<hash>.js
```

AssetHash also emits `assets.zig` with `d_css`, `m_css`, `d_js`, `m_js` constants — `server/render.zig` imports it and fills the `<link>` / `<script>` slots per device.

---

## Observability

### Terminal

Every request prints a status line; every request also prints a one-line `VITALS` sample:

```
 READY    http://127.0.0.1:8000  (root: public, SSR)
 VITALS   Req: 3  Err: 0  RenMax: 143µs  CHit: 100%  Memory: 1.7 MB  CPU: 2ms u / 4ms s
  200 [d] / (2716 bytes SSR)
 VITALS   Req: 4  Err: 0  RenMax: 143µs  CHit: 100%  Memory: 1.7 MB  CPU: 2ms u / 4ms s
```

Bump the cadence when it's noisy — single constant in `server/static.zig`:

```zig
const stats_print_every: u64 = 1;     // every request (dev)
// const stats_print_every: u64 = 100;  // production
```

### JSON endpoint

```bash
curl http://127.0.0.1:8000/_/stats | jq
```

```json
{
  "uptime_ms": 12345,
  "requests": { "total": 123, "2xx": 120, "4xx": 3, "5xx": 0, ... },
  "render":   { "count": 50, "avg_ns": 50000, "max_ns": 390000,
                "buckets": { "<10us": 10, "10-100us": 39, "100us-1ms": 1, ... } },
  "cache":    { "hits": 42, "misses": 2, "invalidations": 0, "version": 2 },
  "cms":      { "entries": 2, "version": 2 },
  "process":  { "rss_bytes": 1900544, "user_cpu_ms": 1150, "sys_cpu_ms": 2196 }
}
```

Pipe it into a dashboard or alert on the bits that matter (RSS growth, error rate, render tail).

---

## Performance

ReleaseFast, single-threaded, macOS M-series, measured with `wrk -t2 -c50 -d5s`:

- ~38,000 req/s sustained
- p50 0.58 ms · p95 0.90 ms · p99 64 ms (accept-queue tail)
- 100% cache hit once warm
- RSS stable at 1.7 MB across ~1M requests — no leak

---

## Client JS

TypeScript lives in `src/js/`. Two entry points: `d.ts` (desktop) and `m.ts` (mobile). Each imports a variant `Engine` from `_d_/` or `_m_/`. Shared code (VFX, utilities, globals) is under `VFX/`, `utils/`, `global/`.

Import alias: `@/` maps to `src/js/`.

**Bundling pipeline:** `TSBundle` (tree-sitter-based Zig tool) strips TypeScript type syntax, resolves imports (including `@/` alias, directory-`index.ts`, and file-level `.ts`/`.js`), and wraps everything in a tiny module registry IIFE. `JSMinifier` then does mangling + whitespace strip. `AssetHash` renames the output to `<stem>.<hash>.js`.

What `TSBundle` handles:

- type annotations, generics, type aliases, interfaces, `as`/`satisfies` casts, `!` non-null, `?` optional params, function overloads, `declare` class fields, ambient declarations, `import type` / `export type`
- ES-module `import` / `export` statements (default + named + namespace + side-effect)
- Stage-3 decorators pass through unchanged (they run natively on Chrome 131+ / Safari 18+, which is your deploy target since `bind-method.ts` uses `ClassMethodDecoratorContext`)

What's **not** supported (none are used in the codebase today; add to the tool if you start using them):

- legacy (TC39 stage-2) decorators — there's no transform back to `Object.defineProperty` calls
- `export * from "..."` and `export { X } from "..."` re-exports
- `enum` / `namespace` / `module` blocks
- JSX / TSX

See `CLAUDE.md` for the full rules (around VFX, utils, the Engine lifecycle, and the variant split).

---

## License

TBD.
