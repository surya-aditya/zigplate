import type { LineSpec, MotionState } from "@/VFX/types/motion";
import { hasProp } from "@/utils/dom";
import { isDef } from "@/utils/guards";
import { Dash, SvgShapeL } from "@/utils/svg";

export const isLineMode = (v: MotionState) => hasProp(v, "line");

export function initLine(st: MotionState, spec: LineSpec) {
	const n = st.len ?? 0;
	if (n === 0) return;

	const shL = new Float32Array(n);
	const start = new Float32Array(n);
	const end = new Float32Array(n);
	const cur = new Float32Array(n);
	const lastOff = new Float32Array(n);
	lastOff.fill(NaN);

	const dashedPattern = spec.dashed?.trim() || null;

	let defaultStart = 0;
	let defaultEnd = 0;

	for (let i = 0; i < n; i++) {
		const el = st._[i];
		if (!el) continue;

		const elWL = spec.elWL ?? el;
		const len = SvgShapeL(elWL);
		shL[i] = len;

		const s = isDef(spec.start) ? (spec.start as number) : len; // hidden
		const e = isDef(spec.end) ? (spec.end as number) : 0; // visible

		start[i] = s;
		end[i] = e;
		cur[i] = s;

		defaultStart = s;
		defaultEnd = e;

		Dash(el, "a", len);
		Dash(el, "o", cur[i]!);
		lastOff[i] = cur[i]!;

		// if fully hidden, kill the cap dot
		const vis = len - cur[i]!;
		(el as HTMLElement).style.opacity = vis <= 0.5 ? "0" : "1";
	}

	st.line = {
		dashed: dashedPattern || undefined,
		f: { start: defaultStart, end: defaultEnd },
		shL,
		start,
		end,
		cur,
		last: lastOff,
	} as any;
}

export function updateLine(ctx: {
	st: MotionState;
	l: (a: number, b: number) => number;
}) {
	const { st, l } = ctx;
	const ln = st.line!;
	const n = st.len ?? 0;

	const start = ln.start;
	const end = ln.end;
	const cur = ln.cur;
	const lastOff = ln.last;
	const shL = ln.shL as Float32Array; // lengths

	for (let i = 0; i < n; i++) {
		const el = st._[i];
		if (!el) continue;

		const c = l(start[i], end[i]);
		if (c === cur[i]) continue;

		cur[i] = c;

		if (c !== lastOff[i]) {
			Dash(el, "o", c);
			lastOff[i] = c;
		}

		// opacity based on visible length
		const len = shL[i];
		if (!len) continue;
		const vis = len - c;
		(el as HTMLElement).style.opacity = vis <= 0.5 ? "0" : "1";
	}
}
