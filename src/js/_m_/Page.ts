// =====================================================================
// Mobile page renderer. Collapsible sections, leaner DOM.
// =====================================================================

import type { AppPage } from "@/types/app";
import { CreateElement } from "@/utils/dom";

export default class Page implements AppPage {
    mount(root: HTMLElement, data: unknown): void {
        const d = data as { sections?: { heading: string; body: string }[] } | null;
        if (!d?.sections) return;

        const wrap = CreateElement("section");
        wrap.className = "mobile-sections";

        for (const s of d.sections) {
            const details = CreateElement("details");
            const summary = CreateElement("summary");
            summary.textContent = s.heading;
            const p = CreateElement("p");
            p.textContent = s.body;
            details.append(summary, p);
            wrap.appendChild(details);
        }
        root.appendChild(wrap);
    }
}
