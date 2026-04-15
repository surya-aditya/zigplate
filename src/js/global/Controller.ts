// =====================================================================
// Controller — direct port of the reference's `class Ctrl`. Method
// names, ordering, and side-effect shape mirror it line-for-line.
// =====================================================================

import type { AppPage, PageCtor } from "@/types/app";
import { Get, Listen, hasAttr } from "@/utils/dom";
import { PD, Propagation } from "@/utils/events";
import { Fetch } from "@/utils/fetch";
import { Window } from "@/global/Window";
import { Router } from "@/global/Router";

// ──────────────── Module-level constants ────────────────

const MAIN_ID = "m"; // <main id="m"> — the swap target
const COMPLETE = "complete"; // document.readyState we wait for in onPS
const EXTERNAL_PREFIXES = ["mai", "tel"]; // mailto:, tel: — let the browser handle
const ORIGIN_RE = /^.*\/\/[^/]+/; // strip scheme+host from full URLs

// ──────────────── Types ────────────────

type Device = "d" | "m";

interface RouteEntry {
	title: string;
	html: string;
}

interface CacheBlob {
	body: string;
	cache: Record<string, RouteEntry>;
	routes: Record<string, string>;
	data: Record<string, unknown>;
}

export type ControllerProps = [
	device: Device,
	page: PageCtor,
	mutation: new () => AppMutation,
	engine?: new () => AppEngine,
	intro?: new (cb: AppIntroCb) => AppIntro,
];

// ──────────────── Helpers ────────────────

// Single source of the global app root, written exactly once on boot.
function rootApp(): AppRoot {
	const g = globalThis as unknown as { __?: AppRoot };
	return (g.__ ??= {} as AppRoot);
}

function defaultRouteState() {
	return {
		cur: { url: location.pathname, pg: "" },
		prv: { url: "", pg: "" },
	};
}

// ──────────────── Controller ────────────────

export default class Controller {
	private readonly d: Device;
	private readonly page: AppPage;

	// Mutation: ctor stored as `m_`, instance promoted to `m` once
	// `intro` runs. Same naming convention as the reference's source.
	private m_: new () => AppMutation;
	private m!: AppMutation;

	// Main element handle; the reference uses `_`.
	private _!: HTMLElement;

	// Per-device route cache populated by `intro`.
	private cache: Record<string, RouteEntry> = {};

	constructor(t: ControllerProps) {
		const APP = rootApp();

		APP.mut = true;
		APP.rt ??= defaultRouteState();
		APP.is ??= {};
		APP.was ??= {};
		APP.rts ??= {};
		APP.pg ??= {};

		this.d = t[0];
		this.m_ = t[2];

		new Window();
		if (t[3]) APP.e = new t[3]();

		this.cache[location.pathname] = {
			title: document.title,
			html: this.snapshot(),
		};

		this.page = new t[1]();

		this.onPS();
		Listen(document.body, "a", "click", this.eD);

		const introCtor = t[4];
		if (introCtor) {
			new introCtor((fn) => this.intro(fn));
		} else {
			this.intro(() => {});
		}
	}

	// onPopstate equivalent.
	private onPS(): void {
		const doc = document;
		let waiting = doc.readyState !== COMPLETE;

		onload = () => setTimeout(() => (waiting = false), 0);

		onpopstate = (event: PopStateEvent) => {
			if (waiting && doc.readyState === COMPLETE) {
				PD(event);
				Propagation(event, true);
			}

			if (__.mut) {
				this.hPS();
			} else {
				__.mut = true;
				this.out(location.pathname, "back");
			}
		};
	}

	// Click delegate. Walks up to find the first <a> or submit control,
	// honours `target=_blank` / mailto / tel, then kicks off `out`.
	private eD = (event: Event): void => {
		let r: Element | null = event.target as Element | null;
		let isAnchor = false;
		let isSubmit = false;

		while (r) {
			const tag = r.tagName;
			if (tag === "A") {
				isAnchor = true;
				break;
			}
			if (
				(tag === "INPUT" || tag === "BUTTON") &&
				(r as HTMLInputElement).type === "submit"
			) {
				isSubmit = true;
				break;
			}
			r = r.parentNode as Element | null;
		}

		if (isAnchor) {
			const anchor = r as HTMLAnchorElement;
			const href = anchor.href;
			const prefix = href.substring(0, 3);
			if (hasAttr(anchor, "target") || EXTERNAL_PREFIXES.includes(prefix))
				return;

			PD(event);
			if (__.mut) return;

			const path = href.replace(ORIGIN_RE, "");
			if (href.includes("#") || path === __.rt.cur.url) return;

			__.mut = true;
			this.out(path, anchor);
		} else if (isSubmit) {
			PD(event);
		}
	};

	private intro(splash: () => void): void {
		const done = () => {
			this._ = Get.i(MAIN_ID) as HTMLElement;
			this.m = new this.m_();

			Router(location.pathname);

			__.e?.init?.();
			__.mut = false;

			splash();
		};

		Fetch<CacheBlob>({
			url: "/" + this.d + ".json",
			type: "json",
			success: (blob) => {
				__.rts = { ...__.rts, ...blob.routes };
				(__ as { data?: unknown }).data = blob.data;
				for (const k in blob.cache) {
					if (!this.cache[k]) this.cache[k] = blob.cache[k]!;
				}
				done();
			},
			error: done,
		});
	}

	// Start a transition.
	private out(t: string, s: HTMLAnchorElement | "back"): void {
		Router(t);
		__.target = s;
		__.pg!.update = () => this.in();

		this.m.out();
	}

	// Mid-transition handover from Mutation.
	private in(): void {
		const entry = this.cache[__.rt.cur.url]!;

		document.title = entry.title;
		if (__.target !== "back") this.hPS();

		__.pg!.insertNew = () => {
			this.add(this._, "beforeend", entry.html);
			this.page.mount(this._, null);
			__.e?.init?.();
		};
		__.pg!.removeOld = () => {
			while (this._.firstChild) this._.removeChild(this._.firstChild);
		};

		this.m.in();
	}

	// insertAdjacentHTML wrapper — same as ybp's `add`.
	private add(target: HTMLElement, where: InsertPosition, html: string): void {
		target.insertAdjacentHTML(where, html);
	}

	// pushState helper — same as ybp's `hPS`.
	private hPS(): void {
		const url = __.rt.cur.url;
		history.pushState({ page: url }, "", url);
	}

	private snapshot(): string {
		const root = Get.i(MAIN_ID) as HTMLElement | null;
		return root ? root.innerHTML : "";
	}
}
