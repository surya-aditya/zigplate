// Mobile engine — same shape as desktop, separate page components.

import { Raf } from "@/global/Runtime";
import { Rz } from "@/global/Resize";
import Ho from "@/_m_/Pages/Ho";
import Ab from "@/_m_/Pages/Ab";

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
