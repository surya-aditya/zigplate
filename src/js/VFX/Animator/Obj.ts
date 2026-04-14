import type { ObjOptions, PropSpec } from "@/VFX/types/animator";
import { Lerp, R, Remap } from "@/utils/math";

export default class Obj {
	private idx: number;
	private p_: PropSpec[];
	private p_L: number;
	private p: any[] = [];

	public pr: { start: number; end: number } = { start: 0, end: 1 };
	public cur: number[] = [];

	constructor(opts: ObjOptions) {
		this.idx = opts.i;
		this.p_ = opts.p;
		this.p_L = this.p_.length;
		this.p = [];
		this.cur = [];

		for (let i = 0; i < this.p_L; i++) {
			const spec = this.p_[i];
			if (!spec) continue;

			this.cur[i] = spec[1];
			this.p[i] = {
				// Precision rounding
				r: spec[0] === "y" || spec[0] === "x" ? 3 : 6,

				// Unit
				u: spec[3] ?? "%",
			};
		}
	}

	prep(ctx: {
		isShow: boolean;
		running: boolean;
		remap: { start: number; end: number }[];
		toEnd: boolean;
	}) {
		const isShow = ctx.isShow;
		const running = ctx.running;

		for (let i = 0; i < this.p_L; i++) {
			const prop = this.p_[i];
			if (!prop) continue;

			const startVal = prop[1];
			const endVal = prop[2];

			const p = this.p[i];

			if (prop[0] === "o") {
				if (isShow) {
					p.start = running ? this.cur[i] : startVal;
					p.end = endVal;
				} else {
					p.start = this.cur[i];
					p.end = startVal;
				}
			} else {
				if (isShow) {
					p.start = startVal;
					if (running) {
						p.start = this.cur[i]! < 0.85 * endVal ? startVal : this.cur[i];
					}
					p.end = 0;
				} else {
					p.start = this.cur[i];
					p.end = ctx.toEnd ? endVal : startVal;
				}
			}
		}

		const list = ctx.remap[this.idx];

		const safe = list ?? { start: 0, end: 1 };

		this.pr =
			isShow && !running
				? { start: safe.start, end: safe.end }
				: { start: 0, end: 1 };
	}

	tick(ctx: {
		dom: Element[];
		domL: number;
		pr: number;
		rEase: (t: number) => number;
	}) {
		const domEls = ctx.dom ?? [];
		const domLen = ctx.domL ?? domEls.length;
		const pos: [number, number] = [0, 0];
		let unitSuffix = "%";

		const start = this.pr.start;
		const end = this.pr.end ?? 1;
		const remapped = Remap(start, end, 0, 1, ctx.pr);
		const eased = ctx.rEase ? ctx.rEase(remapped) : remapped;

		let rotateStr = "";
		let opacityVal = "";

		for (let i = 0; i < this.p_L; i++) {
			const spec = this.p_[i];
			const prop = this.p[i];
			if (!spec || !prop) continue;

			const startVal = prop.start;
			const endVal = prop.end;
			const round = prop.r;

			this.cur[i] = R(Lerp(startVal, endVal, eased), round);

			switch (spec[0]) {
				case "y":
					pos[1] = this.cur[i]!;
					unitSuffix = prop.u ?? "%";
					break;
				case "x":
					pos[0] = this.cur[i]!;
					unitSuffix = prop.u ?? "%";
					break;
				case "rx":
					rotateStr = ` rotateX(${this.cur[i]}deg)`;
					break;
				case "o":
					opacityVal = String(this.cur[i] ?? "");
					break;
			}
		}

		const transformStr =
			`translate3d(${pos[0]}${unitSuffix},${pos[1]}${unitSuffix},0)` +
			rotateStr;

		for (let i = 0; i < domLen; i++) {
			const el = domEls[i];
			const style = (el as HTMLElement).style;

			style.transform = transformStr;
			if (opacityVal) style.opacity = opacityVal;
		}
	}
}
