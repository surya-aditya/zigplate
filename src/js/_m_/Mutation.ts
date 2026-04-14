// Mobile mutation — same shape as desktop, snappier timing.

import Motion from "@/VFX/Motion";
import { Get, cssProp } from "@/utils/dom";

const DURATION = 180;

function showLoader(): void {
    const lo = Get.i("lo") as HTMLElement | null;
    if (lo) cssProp(lo, "display", "");
    const bg = Get.i("lo-bg") as HTMLElement | null;
    if (bg) cssProp(bg, "opacity", "0");
}

function hideLoader(): void {
    const lo = Get.i("lo") as HTMLElement | null;
    if (lo) cssProp(lo, "display", "none");
}

export default class Mutation implements AppMutation {
    out(): void {
        __.e?.off?.();
        showLoader();

        new Motion({
            _: "#lo-bg",
            d: DURATION,
            e: "o3",
            p: { o: [0, 1, ""] },
            cb: () => __.pg?.update?.(),
        }).play();
    }

    in(): void {
        __.pg?.removeOld?.();
        __.pg?.insertNew?.();
        __.e?.on?.();

        new Motion({
            _: "#lo-bg",
            d: DURATION,
            e: "o3",
            p: { o: [1, 0, ""] },
            cb: () => {
                hideLoader();
                __.mut = false;
                __.target = null;
            },
        }).play();
    }
}
