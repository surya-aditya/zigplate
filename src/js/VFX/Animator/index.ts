import ObjGroup from "@/VFX/Animator/ObjGroup";
import { buildGroups, normalizeDom } from "@/VFX/Animator/utils";
import { Ease4 } from "@/VFX/Ease/CubicBezierEase";
import { Ease } from "@/VFX/Ease/Easing";
import type { EaseCurve, EaseFn } from "@/VFX/Ease/utils";
import Motion from "@/VFX/Motion";
import type {
	AnimationHandle,
	AnimatorOptions,
	RunOptions,
} from "@/VFX/types/animator";
import { Pause } from "@/utils/events";
import { isDef, isStr } from "@/utils/guards";
import { Clamp } from "@/utils/math";

export default class Animator {
	declare start: number;

	private line: ObjGroup[] = [];
	private lineL: number = 0;
	private objL: number = 0;

	private stag: number = 0;
	private dStag: number = 0;

	// Running
	private r: boolean = false;
	private an?: AnimationHandle;

	constructor(opts: AnimatorOptions) {
		const baseDelay = opts.de ?? 0;
		const linearTiming = opts.lT ?? false;
		const ch = opts.ch;
		const rand = opts.rand ?? false;

		const roots = normalizeDom(opts.dom as HTMLElement | HTMLElement[]);
		const { groups, total } = buildGroups(roots, ch);

		this.lineL = groups.length;
		this.objL = Math.max(total, this.lineL);

		const props = opts.p;
		this.start = props[0][1];

		this.line = [];
		let idx = 0;
		for (let i = 0; i < this.lineL; i++) {
			const group = new ObjGroup({
				idx,
				ch,
				dom: groups[i] as Element[],
				p: props,
				rand,
			});

			this.line[i] = group;
			if (!linearTiming) idx += group.objL;
		}

		this.stag = Clamp((5 * baseDelay) / this.objL, 20, baseDelay);
		this.dStag = this.stag * (this.objL - 1);
	}

	m(opts: RunOptions) {
		Pause(this.an);

		const isShow = opts.a === "show";
		const duration = opts.d;

		let easingFn: EaseFn;
		if (isDef(opts.e)) {
			easingFn = isStr(opts.e) ? Ease[opts.e] : Ease4(opts.e as EaseCurve);
		} else {
			easingFn = Ease.o6;
		}

		const lines = this.line;
		const lineL = this.lineL;

		let toEnd = false;
		if (!isShow) {
			const firstCur = lineL > 0 ? lines[0]?.obj?.[0]?.cur?.[0] ?? 0 : 0;
			if ((this.start < 0 && firstCur > 0) || this.start) {
				toEnd = true;
			}
		}

		let delay = opts.de;
		if (isShow && this.r) delay = 0;

		let totalDur = duration;
		if (isShow && duration > 0) totalDur += this.dStag;

		const remap: { start: number; end: number }[] = [];
		const step = totalDur === 0 ? 0 : this.stag / totalDur;
		for (let i = 0; i < this.objL; i++) {
			remap[i] = { start: i * step, end: 1 - (this.objL - 1 - i) * step };
		}

		for (let i = 0; i < lineL; i++) {
			lines[i]!.prep({
				isShow,
				running: this.r,
				remap,
				toEnd,
			});
		}

		this.an = new Motion({
			de: delay,
			d: totalDur,
			u: (frame) => {
				const pr = frame.pr[0];

				for (let i = 0; i < lineL; i++) {
					lines[i]?.tick({ pr, rEase: easingFn });
				}
			},
			cb: () => {
				this.r = false;
			},
		});

		return {
			play: () => {
				this.r = true;
				this.an?.play();
			},
		};
	}
}
