import { Clamp } from "@/utils/math";
import { BM } from "@/utils/bind-method";
import { Raf } from "@/global/Runtime";

/**
 * Delay
 * Runs a callback after a given de (ms), using requestAnimationFrame.
 * @params cb Callback function
 * @params de Delay in ms
 */
export class Delay {
	// Callback function
	private readonly cb: () => void;

	// Delay in ms
	private readonly de: number;

	// Frame handler
	private readonly tk: Raf;

	constructor(cb: () => void, de: number) {
		this.cb = cb;
		this.de = de;

		this.tk = new Raf(this.tick);
	}

	run() {
		if (this.de === 0) {
			this.cb();
		} else {
			this.tk.run();
		}
	}

	stop() {
		this.tk.stop();
	}

	@BM()
	private tick(elapsed: number) {
		const clamped = Clamp(elapsed, 0, this.de);
		const ratio = Clamp(clamped / this.de, 0, 1);

		if (ratio === 1) {
			this.stop();
			this.cb();
		}
	}
}
