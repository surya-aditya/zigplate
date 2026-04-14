import { Raf } from "@/global/Runtime";
import type { MotionOptions, MotionState } from "@/VFX/types/motion";

import { Ease4 } from "@/VFX/Ease/CubicBezierEase";
import { Ease } from "@/VFX/Ease/Easing";

import { initProps, isPropsMode, updateProps } from "@/VFX/Motion/props";
import { initSvg, isSvgMode, svgSetFromTo, updateSvg } from "@/VFX/Motion/svg";
import { initLine, isLineMode, updateLine } from "@/VFX/Motion/line";

import { BMAll } from "@/utils/bind-method";
import { Stop } from "@/utils/events";
import { Delay } from "@/utils/delay";
import { getElements, hasProp } from "@/utils/dom";
import { isDef, isEaseFn, isFn, isNum, isStr } from "@/utils/guards";
import { Clamp, Lerp, R } from "@/utils/math";
import type { EaseFn } from "@/VFX/Ease/utils";

@BMAll({ e: ["stI, stU, play, pause"] })
export default class Motion {
	declare __: typeof __;

	private st: MotionState;
	private r: Raf;
	private de: Delay | null = null;

	constructor(v: MotionOptions) {
		this.st = this.stI(v);
		this.r = new Raf(this.run);
	}

	stI(opt: MotionOptions): MotionState {
		const el: Element[] = opt._ ? getElements(opt._) : [];
		const len = el.length ?? 0;

		const st: MotionState = {
			_: el,
			len,
			e: { t: opt.e || "l" },
			d: { og: opt.d || 0, cur: 0 },
			de: opt.de || 0,
			cb: opt.cb || false,
			r: opt.r || 2,
			pr: [0, 0],
			t: 0,
		};

		if (opt.u) {
			st.u = () => opt.u!(st);
		} else if (opt.svg) {
			initSvg(st, opt.svg);
			st.u = () => updateSvg({ st, l: this.lerp });
		} else if (opt.line) {
			initLine(st, opt.line);
			st.u = () => updateLine({ st, l: this.lerp });
		} else {
			initProps(st, opt.p);
			st.u = () => updateProps({ st, l: this.lerp });
		}

		return st;
	}

	play(v?: Partial<MotionOptions>) {
		this.pause();
		this.stU(v);

		if (this.de) {
			this.de.run();
		}
	}

	pause() {
		this.r.stop();
		Stop(this.de);
	}

	stU(o?: Partial<MotionOptions>) {
		const state = this.st;
		const opt = o || {};
		const ease = state.e;
		const prevCurve = ease.t;
		const edge = hasProp(opt, "rev") && opt.rev ? "start" : "end";

		if (isPropsMode(state)) {
			const props = state.p;
			const len = state.pL ?? props.length ?? 0;
			const overrides = opt.p;

			if (!overrides) {
				for (let i = 0; i < len; i++) {
					const p = props[i];
					p.start = p.cur;
					p.end = p.og[edge];
				}
			} else {
				for (let i = 0; i < len; i++) {
					const p = props[i];
					const ov = overrides?.[p.name];

					p.start = !isNum(ov) && isDef(ov?.start) ? ov.start : p.cur;
					p.end = isNum(ov)
						? (ov as number)
						: isDef(ov?.end)
						? ov.end
						: p.og[edge];
				}
			}
		} else if (isSvgMode(state)) {
			const s = state.svg!;

			const fromStr: string =
				opt.svg && hasProp(opt.svg, "start")
					? (opt.svg.start as string)
					: s.cur;

			const toStr: string =
				opt.svg && hasProp(opt.svg, "end") ? (opt.svg.end as string) : s[edge];

			svgSetFromTo(s, fromStr, toStr);
		} else if (isLineMode(state)) {
			const ln = state.line!;
			const n = state.len ?? 0;

			// always start from current offset
			for (let i = 0; i < n; i++) {
				ln.start[i] = ln.cur[i];
			}

			let targetOff: number;

			// override end if provided in play({ line: { end: ... } })
			if (hasProp(opt, "line") && isDef(opt.line?.end)) {
				targetOff = opt.line!.end as number;
			} else {
				// use default offset based on edge: "start" or "end"
				targetOff = ln.f[edge];
			}

			for (let i = 0; i < n; i++) {
				ln.end[i] = targetOff;
			}
		}

		state.d.cur =
			hasProp(opt, "d") && isNum(opt.d)
				? opt.d
				: R(state.d.og - state.d.cur + state.t);

		let newCurve = opt.e || prevCurve;
		let easeFn: EaseFn | undefined;

		if (isStr(newCurve)) {
			easeFn = Ease[newCurve];
			if (!easeFn) {
				newCurve = "l";
				easeFn = Ease.l;
			}
		} else if (isEaseFn(newCurve)) {
			easeFn = newCurve;
		} else {
			easeFn = Ease4(newCurve);
		}

		ease.t = newCurve;
		ease.c = easeFn;

		state.de = hasProp(opt, "de") && isNum(opt.de) ? opt.de : state.de;
		state.cb = hasProp(opt, "cb") ? opt.cb ?? false : state.cb;

		state.pr[0] = state.pr[1] = state.d.cur === 0 ? 1 : 0;

		this.de = new Delay(this.tick, state.de);
	}

	tick() {
		this.r.run();
	}

	run(tick: number): void {
		const state = this.st;

		if (state.pr[0] === 1) {
			this.pause();
			state.u?.();
			if (state.cb) state.cb();
		} else {
			state.t = Clamp(tick, 0, state.d.cur);

			state.pr[0] = Clamp(state.t / state.d.cur, 0, 1);
			state.pr[1] = state.e.c?.(state.pr[0]) ?? 0;

			state.u?.();
		}
	}

	lerp(a: number, b: number) {
		const state = this.st;

		return R(Lerp(a, b, state.pr[1]), state.r);
	}
}
