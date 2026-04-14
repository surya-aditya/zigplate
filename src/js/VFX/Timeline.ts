import Motion from "@/VFX/Motion";
import type { MotionOptions } from "@/VFX/types/motion";
import { hasProp } from "@/utils/dom";

type MotionAction = "play" | "pause";

export default class Timeline {
	private a: Motion[];
	private d: number;

	constructor() {
		this.a = [];
		this.d = 0;
	}

	_(opts: MotionOptions) {
		this.d += opts.de && hasProp(opts, "de") ? opts.de : 0;
		opts.de = this.d;

		this.a.push(new Motion(opts));
	}

	play(v?: Partial<MotionOptions>) {
		this.run("play", v);
	}

	pause() {
		this.run("pause");
	}

	run(action: MotionAction, override?: Partial<MotionOptions>) {
		const len = this.a.length;
		const v = override || void 0;

		for (let i = 0; i < len; i++) {
			const m = this.a[i]! as Motion;
			m[action](v);
		}
	}
}
