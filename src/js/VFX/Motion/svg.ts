import type { MotionState, SvgSpec } from "@/VFX/types/motion";
import { getAttr, hasProp, setAttr } from "@/utils/dom";
import { isNum } from "@/utils/guards";
import { SvgSplit } from "@/utils/svg";

/**
 * Utilities
 */
export const isSvgMode = (st: MotionState) => hasProp(st, "svg");

export function svgSetFromTo(
	s: NonNullable<MotionState["svg"]>,
	fromStr: string,
	toStr: string
) {
	const fromTok = SvgSplit(fromStr) ?? [];
	const toTok = SvgSplit(toStr) ?? [];
	const L = fromTok.length;

	if (fromTok.length !== toTok.length) {
		throw new Error(`SVG morph mismatch: ${fromTok.length} vs ${toTok.length}`);
	}

	s.arr = { start: fromTok, end: toTok };
	s.arrL = L;

	const mask = new Uint8Array(L);
	const numIdx: number[] = [];
	const out = s.out && s.out.length === L ? s.out : new Array<string>(L);

	for (let i = 0; i < L; i++) {
		const aNum = isNum(fromTok[i]);
		const bNum = isNum(toTok[i]);
		if (aNum && bNum) {
			mask[i] = 1;
			numIdx.push(i);
			out[i] = "";
		} else {
			out[i] = String(fromTok[i]!);
		}
	}

	s.mask = mask;
	s.numIdx = numIdx;
	s.out = out;

	s.start = fromStr;
	s.end = toStr;
	s.cur = fromStr;
	s.last = "";
}

/**
 * ------------------------------------------------------
 * SVG
 * ------------------------------------------------------
 */
export function initSvg(st: MotionState, spec: SvgSpec) {
	const attr = spec.type === "polygon" ? "points" : "d";
	const startStr = spec.start ?? getAttr(st._[0], attr);
	const endStr = spec.end;

	const startTok = SvgSplit(startStr) ?? [];
	const endTok = SvgSplit(endStr) ?? [];
	const L = startTok.length;

	const mask = new Uint8Array(L);
	const numIdx: number[] = [];
	const out = new Array<string>(L);

	for (let i = 0; i < L; i++) {
		const aNum = isNum(startTok[i]);
		const bNum = isNum(endTok[i]);
		if (aNum && bNum) {
			mask[i] = 1;
			numIdx.push(i);
			out[i] = "";
		} else {
			out[i] = String(startTok[i]!);
		}
	}

	st.svg = {
		type: spec.type,
		attr,
		start: startStr,
		end: endStr,
		cur: startStr,
		arr: { start: startTok, end: endTok },
		mask,
		numIdx,
		out,
		arrL: L,
		last: "",
	} as any;
}

export function updateSvg(ctx: {
	st: MotionState;
	l: (a: number, b: number) => number;
}) {
	const { st, l } = ctx;
	const s = st.svg!;
	const from = s.arr.start as (string | number)[];
	const to = s.arr.end as (string | number)[];
	const out = s.out as string[];
	const numIdx = s.numIdx as number[];

	for (let j = 0; j < numIdx.length; j++) {
		const i = numIdx[j]!;
		const v = l(from[i] as number, to[i] as number);
		out[i] = String(v);
	}

	const cur = out.join(" ");
	if (cur === s.last) return;

	s.last = s.cur = cur;
	for (let i = 0; i < st.len! && st._[i]; i++) {
		setAttr(st._[i], s.attr, cur);
	}
}
