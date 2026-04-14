import Obj from "@/VFX/Animator/Obj";
import type { ObjGroupOptions } from "@/VFX/types/animator";
import type { EaseFn } from "@/VFX/Ease/utils";
import { RandomUnique } from "@/utils/math";

export default class ObjGroup {
	// Is random
	private rand: boolean;

	// Elements
	private el: Element[][] = [];
	private len: number[] = [];

	// Objects
	public obj: Obj[] = [];
	public objL: number;

	// Random unique
	private randU: number[] = [];

	constructor({ dom, ch, p: props, idx, rand }: ObjGroupOptions) {
		this.rand = rand;
		this.objL = dom.length;
		this.randU = [];

		for (let i = 0; i < this.objL; i++) {
			const base = dom[i];
			if (!base) continue;

			const list: Element[] = ch === 2 ? Array.from(base.children) : [base];

			this.el[i] = list;
			this.len[i] = list.length;

			this.obj[i] = new Obj({ i: idx + i, p: props });
			this.randU[i] = i;
		}
	}

	prep(ctx: {
		running: boolean;
		isShow: boolean;
		remap: { start: number; end: number }[];
		toEnd: boolean;
	}) {
		if (!ctx.running && this.rand) {
			this.randU = RandomUnique(this.objL);
		}

		for (let i = 0; i < this.objL; i++) {
			const o = this.obj[i];

			if (o) {
				o.prep(ctx);
			}
		}
	}

	tick(ctx: { pr: number; rEase: EaseFn }) {
		const { pr, rEase } = ctx;
		for (let i = 0; i < this.objL; i++) {
			const groupEls = this.el[this.randU[i]!];
			if (!groupEls) continue;

			this.obj[i]!.tick({
				dom: groupEls,
				domL: this.len[i] ?? groupEls.length,
				pr,
				rEase,
			});
		}
	}
}
