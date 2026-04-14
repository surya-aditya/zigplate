// Mobile intro — same shape as desktop, snappier timing.

import Motion from "@/VFX/Motion";
import { Get, cssProp } from "@/utils/dom";

const DURATION = 400;

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
