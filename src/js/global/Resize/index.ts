import { RzM } from "@/global/Resize/RzObserver";

let ROId = 0;

/**
 * Resize Observer
 * Runs a callback when the window is resized.
 * @params cb Callback function
 */
export class Rz {
	private readonly id: number;
	private readonly cb: (ev: Event) => void;

	constructor(cb: (ev: Event) => void) {
		this.cb = cb;
		this.id = ROId;

		ROId++;
	}

	on() {
		RzM.a({
			id: this.id,
			cb: this.cb,
		});
	}

	off() {
		RzM.r(this.id);
	}
}
