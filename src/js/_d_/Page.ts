// =====================================================================
// Desktop page renderer. Rich layout, optional animations, more DOM.
// =====================================================================

import type { AppPage } from "@/types/app";
import { CreateElement } from "@/utils/dom";

export default class Page implements AppPage {
    mount(root: HTMLElement, data: unknown): void {
        const d = data as { sections?: { heading: string; body: string }[] } | null;
        if (!d?.sections) return;

        const wrap = CreateElement("section");
        wrap.className = "desktop-sections";

        for (const s of d.sections) {
            const h = CreateElement("h3");
            h.textContent = s.heading;
            const p = CreateElement("p");
            p.textContent = s.body;
            wrap.append(h, p);
        }
        root.appendChild(wrap);
    }
}
