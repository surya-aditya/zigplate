import { Raf } from "@/global/Runtime";
import { BMAll } from "@/utils/bind-method";
import { Listen } from "@/utils/dom";
import { isMobile } from "@/utils/snif";
import { Timer } from "@/utils/timer";

interface ResizeListener {
	id: number;
	cb: (event: Event) => void;
}

@BMAll({ e: ["a", "r"] })
class RzManager {
	private eT: "resize" | "orientationchange";
	private t = false;

	private _: ResizeListener[] = [];
	private f: Raf;
	private d: Timer;

	private l = 0;

	private e?: Event;

	constructor() {
		this.eT = isMobile ? "orientationchange" : "resize";

		this.d = new Timer({ de: 250, cb: this.tick });
		this.f = new Raf(this.run);

		Listen(window, "a", this.eT, this.fn);
	}

	a(listener: ResizeListener): void {
		this._.push(listener);
		this.l++;
	}

	r(id: number): void {
		for (let i = this.l - 1; i >= 0; i--) {
			if (this._[i]!.id === id) {
				return void this._.splice(i, 1);
			}
		}
	}

	private fn(ev: Event) {
		this.e = ev;
		this.d.run();
	}

	private tick() {
		if (this.l > 0 && !this.t) {
			this.t = true;
			this.f.run();
		}
	}

	private run() {
		for (let i = 0; i < this._.length; i++) {
			this._[i]!.cb(this.e!);
		}

		this.f.stop();
		this.t = false;
	}
}

export const RzM = new RzManager();
