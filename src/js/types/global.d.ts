// =====================================================================
// Ambient types used across the client bundle. Anything the Controller
// reaches through `__` (the server-seeded app root) lives here.
// =====================================================================

interface AppCacheEntry {
    t?: string; // <title> for this route
    h: string[]; // HTML fragments to inject (0 = <main> body)
}

interface AppRouteState {
    url: string;
    pg: string;
}

interface AppRouter {
    cur: AppRouteState;
    prv: AppRouteState;
}

interface AppWin {
    w: number;
    h: number;
    readonly mid: { w: number; h: number };
    readonly rat: { wh: number; hw: number };
    readonly vw: number;
    readonly vh: number;
    readonly ori: "l" | "p";
    readonly tr: { y: number };
    upd: (w: number, h: number, dpr?: number) => void;
}

// Active-route flags. Keyed by the shortcode declared in src/data/<page>.json
// (`route` field). Engine's child components flip on/off based on these.
type AppRouteFlags = Record<string, boolean>;

interface AppRoot {
    boot: boolean;
    mut: boolean;
    win: AppWin;
    is: AppRouteFlags;
    was: AppRouteFlags;
    // Route lookup populated from cache (path → shortcode) and the
    // current/previous active route — both consumed by Router(...).
    rts: Record<string, string>;
    rt: AppRouter;
    // The active engine instance — Mutation needs it to call off()/init()
    // around DOM swaps. Lives on `__` so the engine is reachable from
    // anywhere without prop-drilling through Controller.
    e?: AppEngine;
    // Navigation source — the clicked anchor element, or the literal
    // string "back" for popstate-driven transitions. Used by Engine
    // implementations that want to drive different exit animations.
    target?: HTMLAnchorElement | "back" | null;

    // Active route information.
    rt: AppRouter;
    // Per-transition scratch space. Controller fills these in; Mutation
    // calls them at the right moment in the visual sequence so the DOM
    // swap is owned by Controller while the timing is owned by Mutation.
    //
    //   update    — Mutation.out() calls this to hand control back to
    //               Controller once the exit animation finishes. Controller
    //               then sets up insertNew / removeOld and triggers
    //               Mutation.in().
    //   insertNew — inject the new page HTML into <main>.
    //   removeOld — remove the previous page's HTML.
    pg: {
        update?: () => void;
        insertNew?: () => void;
        removeOld?: () => void;
    } | null;

    // Server-sent route/data blobs.
    rts?: unknown;
    dta?: unknown;

    // Attached engine (optional).
    e?: AppEngine;

    // Target anchor for the in-flight navigation (string "back" or element).
    target?: HTMLAnchorElement | string;
}

// Variant-specific modules attached to Controller.
//
// The `intro` callback is the ybp pattern: Controller hands the splash
// a function that, when invoked with a setup fn, runs Controller's
// cache + engine setup and then calls fn() so the splash can animate.
interface AppIntro {}
type AppIntroCb = (fn: () => void) => void;
interface AppMutation {
    out(): void;
    in(): void;
}
interface AppPageComponent {
    rqd: boolean;
    init(): void;
    resize?(): void;
    loop?(): void;
    on?(): void;
    off?(): void;
}

interface AppEngine {
    // Called every time the active route changes (initial mount + each
    // SPA navigation). Engine flips `rqd` on its children and forwards
    // the lifecycle.
    init(): void;
    resize?(): void;
    loop?(): void;
    on?(): void;
    off?(): void;
}

// Global variables injected by the server's inline bootstrap.
declare const __: AppRoot;
