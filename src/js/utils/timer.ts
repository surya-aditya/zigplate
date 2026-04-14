import { Delay } from "@/utils/delay";
/**
 * Timer
 * Runs a callback after a given de (ms).
 * @params cb Callback function
 * @params de Delay in ms
 */
export class Timer {
	private _: Delay;

	constructor({ cb, de }: { cb: () => void; de: number }) {
		this._ = new Delay(cb, de);
	}

	run() {
		this._.stop();
		this._.run();
	}
}
