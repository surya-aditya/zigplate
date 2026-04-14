import { RM } from "@/global/Runtime/RafManager";
let RafId = 0;

/**
 * Request Animation Frame Runner
 * @params cb Callback function
 */
export class Raf {
	// Callback
	private cb: (elapsed: number) => void;

	// Unique ID
	private id: number;

	// Is Active
	private on = false;

	constructor(cb: (elapsed: number) => void) {
		this.cb = cb;
		this.id = RafId;

		RafId++;
	}

	run() {
		if (!this.on) {
			RM.a({ id: this.id, cb: this.cb });
			this.on = true;
		}
	}

	stop() {
		if (this.on && this.id !== null) {
			RM.r(this.id);
			this.on = false;
		}
	}
}
