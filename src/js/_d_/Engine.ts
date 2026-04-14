// =====================================================================
// Desktop engine — owns one component per route and dispatches the
// per-frame / per-resize lifecycle to all of them. Each component
// guards its own work with `this.rqd` so dispatch is cheap when
// inactive.
//
// Modeled on the reference's class E: instantiate every page once,
// call `init()` per navigation, run a single rAF loop here that fans
// out to every component's `loop()`.
// =====================================================================

import { Raf } from "@/global/Runtime";
import { Rz } from "@/global/Resize";
import Ho from "@/_d_/Pages/Ho";
import Ab from "@/_d_/Pages/Ab";

export default class Engine implements AppEngine {
    private readonly ho = new Ho();
    private readonly ab = new Ab();
    private readonly raf: Raf;
    private readonly rz: Rz;
    private booted = false;

    constructor() {
        this.raf = new Raf(this.loop);
        this.rz = new Rz(this.resize);
    }

    init(): void {
        this.ho.init();
        this.ab.init();

        // First navigation also turns on the global runners.
        if (this.booted) return;
        this.booted = true;
        this.rz.on();
        this.raf.run();
    }

    resize = (): void => {
        this.ho.resize?.();
        this.ab.resize?.();
    };

    loop = (): void => {
        this.ho.loop?.();
        this.ab.loop?.();
    };

    on(): void {
        this.ho.on?.();
        this.ab.on?.();
    }

    off(): void {
        this.ho.off?.();
        this.ab.off?.();
    }
}
