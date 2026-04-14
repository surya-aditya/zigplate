import type { MotionState, PropertiesSpec } from "@/VFX/types/motion";
import { hasProp } from "@/utils/dom";

/**
 * Utilities
 */

export const isPropsMode = (st: MotionState) => hasProp(st, "p");

const ROLES = ["a", "b", "c", "d", "x", "y", "r", "rx", "s", "o"] as const;
type Role = (typeof ROLES)[number];

const makeIndexMap = () =>
	ROLES.reduce(
		(m, k) => ((m[k] = -1), m),
		Object.create(null) as Record<Role, number>
	);

/**
 * ------------------------------------------------------
 * Element Properties
 * ------------------------------------------------------
 */
export function initProps(st: MotionState, spec: PropertiesSpec) {
	const keys = Object.keys(spec) as (keyof PropertiesSpec)[];
	st.p = [];

	st.pI = makeIndexMap();
	st.pL = keys.length;

	let sawRotate = false;

	for (let i = 0; i < st.pL; i++) {
		const name = keys[i]!;
		const prop = spec[name];
		if (!prop) continue;

		let [start, end, givenUnit] = prop;

		// Default unit = % for every property unless explicitly provided
		const unit = givenUnit ?? "%";

		st.p[i] = { name, unit, og: { start, end }, cur: start, start, end };

		const prefix = name.charAt(0);
		const role: Role = prefix === "r" && sawRotate ? "rx" : (prefix as Role);

		if (role in st.pI) (st.pI as any)[role] = i;
		if (prefix === "r") sawRotate = true;
	}
}

export function updateProps(ctx: {
	st: MotionState;
	l: (a: number, b: number) => number;
}) {
	const { st, l } = ctx;

	const props = st.p;
	const idx = st.pI;
	const count = st.pL ?? props.length;

	for (let i = 0; i < count; i++) {
		const it = props[i];
		it.cur = l(it.start, it.end);
	}

	// clip-path: inset(a b c d)
	const ids = [idx.a, idx.b, idx.c, idx.d];

	const prec = st.r;
	const EPS = 0.5 / 10 ** prec;

	let hasClip = false;
	let clip = "inset(";

	for (let k = 0; k < ids.length; k++) {
		const pi = ids[k];
		let token: string;

		if (pi >= 0) {
			let v = props[pi].cur;

			if (v > -EPS && v < EPS) {
				v = 0;
			}

			if (v !== 0) {
				hasClip = true;
			}

			const u = props[pi].unit || "%";
			token = `${v}${u}`;
		} else {
			token = "0%";
		}

		clip += token + (k === 3 ? ")" : " ");
	}

	for (let i = 0, n = st.len ?? 0; i < n; i++) {
		const el = st._[i] as HTMLElement;
		const style = el.style;

		if (hasClip) {
			if (style.clipPath !== clip) style.clipPath = clip;
		}
	}

	// transform: translate3d(x,y,0) rotate(r) rotateX(rx) scale(s)
	const ix = idx.x;
	const iy = idx.y;
	const ir = idx.r;
	const irx = idx.rx;
	const is = idx.s;

	let t = "";

	// only create translate if x or y props exist and are non-zero
	if (ix >= 0 || iy >= 0) {
		const hasX = ix >= 0 && props[ix].cur !== 0;
		const hasY = iy >= 0 && props[iy].cur !== 0;

		const tx = hasX ? props[ix].cur + (props[ix].unit || "") : "0";
		const ty = hasY ? props[iy].cur + (props[iy].unit || "") : "0";

		if (tx !== "0" || ty !== "0") {
			t = `translate3d(${tx},${ty},0)`;
		}
	}

	let r1 = "";
	if (ir >= 0) {
		const p = props[ir];
		r1 = `rotate(${p.cur}deg)`;
	}

	let rx = "";
	if (irx >= 0) {
		const p = props[irx];
		rx = `rotateX(${p.cur}deg)`;
	}

	let sc = "";
	if (is >= 0) {
		st.r = 6;

		const p = props[is];
		sc = `scale(${p.cur})`;
	}

	let transform = "";
	if (t || r1 || rx || sc) {
		transform = (t ? [t, r1, rx, sc] : [r1, rx, sc]).filter(Boolean).join(" ");
	}

	const hasTransform = transform !== "";

	// opacity
	const io = idx.o;
	const hasOpacity = io >= 0;
	const opacityVal = hasOpacity ? props[io].cur : 1;

	if (!(hasClip || hasTransform || hasOpacity)) return;

	for (let i = 0, n = st.len ?? 0; i < n; i++) {
		const el = st._[i];
		if (!el) continue;
		const style = el.style;

		if (hasTransform && style.transform !== transform) {
			style.transform = transform;
		}

		if (hasClip && style.clipPath !== clip) {
			style.clipPath = clip;
		}

		if (hasOpacity) {
			const op = `${opacityVal}`;
			if (style.opacity !== op) style.opacity = op;
		}
	}
}
