// =====================================================================
// Desktop intro. Mirrors the ybp pattern:
//
//   constructor(cb) — Controller hands us a `cb` that schedules a
//                     setup function. We call cb(() => this.cb()) so
//                     Controller.intro() runs its cache + engine setup
//                     first, then invokes our `cb()` to play the splash.
//
//   cb()           — fade `#lo-bg` to opacity 0, then hide `#lo`.
// =====================================================================

import Motion from "@/VFX/Motion";
import { Get, cssProp } from "@/utils/dom";

const DURATION = 600;

export default class Intro implements AppIntro {
    constructor(cb: AppIntroCb) {
        cb(() => this.cb());
    }

    cb(): void {
        new Motion({
            _: "#lo-bg",
            d: DURATION,
            e: "o3",
            p: { o: [1, 0, ""] },
            cb: () => {
                const lo = Get.i("lo") as HTMLElement | null;
                if (lo) cssProp(lo, "display", "none");
            },
        }).play();
    }
}
