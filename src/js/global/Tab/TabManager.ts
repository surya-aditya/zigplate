import { BM } from "@/utils/bind-method";
import { Listen } from "@/utils/dom";

/**
 * Tab manager
 * Keeps track of visibilitychange and notifies listeners with start/stop events.
 */

type TabListener = {
	id?: number;
	start: (dt: number) => void;
	stop: () => void;
};

class TabManager {
	private _: TabListener[] = [];

	private now = 0;
	private l = 0;

	constructor() {
		Listen(document, "a", "visibilitychange", this.v);
	}

	a(listener: TabListener) {
		this._.push(listener);
		this.l++;
	}

	r(id: number) {
		for (let i = this.l - 1; i >= 0; i--) {
			if (this._[i]!.id === id) {
				this._.splice(i, 1);
				this.l--;
				return;
			}
		}
	}

	@BM()
	private v() {
		const now = performance.now();
		let method: "start" | "stop";
		let elapsed = 0;

		if (document.hidden) {
			this.now = now;
			method = "stop";
		} else {
			elapsed = now - this.now;
			method = "start";
		}

		for (let i = this.l - 1; i >= 0; i--) {
			this._[i]![method](elapsed);
		}
	}
}

export const TM = new TabManager();
