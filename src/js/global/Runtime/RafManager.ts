import { TM } from "@/global/Tab/TabManager";
import { BM, BMAll } from "@/utils/bind-method";

const FRAME_RATE = 1e3 / 60;
let DELTA_FRAME = 0;

/**
 * Returns the delta frame based on the current frame rate (1e3 / 60).
 * @returns
 */
export function getDeltaFrame() {
	return DELTA_FRAME;
}

@BMAll({ e: ["a", "r", "tk"] })
class RafManager {
	// Tasks
	private _: any[] = [];

	// Tasks Length
	private l = 0;

	// Is Active
	private on = true;

	// Current Time
	private now = performance.now();

	constructor() {
		TM.a({ stop: this.h, start: this.v });

		this.tk();
	}

	/** Tab Hidden */
	private h() {
		this.on = false;
	}

	/** Tab Visible */
	private v(delta: number) {
		this.now = performance.now();

		for (let i = this.l - 1; i >= 0; i--) {
			this._[i].sT += delta;
		}

		this.on = true;
	}

	/** Add Task */
	a(opt: { id: number; cb: (elapsed: number) => void }) {
		this._.push(opt);
		this.l++;
	}

	/** Remove Task */
	r(id: number) {
		for (let i = this.l - 1; i >= 0; i--) {
			if (this._[i].id === id) {
				this._.splice(i, 1);

				void this.l--;
			}
		}
	}

	/** Tick */
	private tick(now: number) {
		if (this.on) {
			const dt = now - this.now;
			this.now = now;
			DELTA_FRAME = dt / FRAME_RATE;

			for (let i = this.l - 1; i >= 0; i--) {
				const task = this._[i];
				if (!task) continue;

				task.sT ||= now;
				const elapsed = now - task.sT;

				task.cb(elapsed);
			}
		}

		this.tk();
	}

	/** rAF */
	private tk() {
		requestAnimationFrame(this.tick);
	}
}

export const RM = new RafManager();
