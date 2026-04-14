import type { EaseCurve, EaseFn } from "@/VFX/Ease/utils";
import { Clamp } from "@/utils/math";

const NEWTON_ITERS = 4;
const SAMPLE_SIZE = 11;
const STEP = 1 / (SAMPLE_SIZE - 1);

// Evaluate cubic-bezier at t for control points (p1,p2)
function curveVal(t: number, p1: number, p2: number): number {
	const mt = 1 - t;
	// 3*(1−t)^2 * t * p1 + 3*(1−t)*t^2 * p2 + t^3
	return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}

// Derivative w.r.t t
function curveDer(t: number, p1: number, p2: number): number {
	const mt = 1 - t;
	return 3 * mt * mt * p1 + 6 * mt * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

export const Ease4 = ([x1, y1, x2, y2]: EaseCurve): EaseFn => {
	const sampleX = new Float32Array(SAMPLE_SIZE);
	const last = SAMPLE_SIZE - 1;

	const isLinear = x1 === y1 && x2 === y2;

	if (!isLinear) {
		for (let i = 0; i < SAMPLE_SIZE; i++) {
			const u = i * STEP;
			sampleX[i] = curveVal(u, x1, x2);
		}
	}

	return (t: number): number => {
		if (isLinear) return t;
		if (t <= 0) return 0;
		if (t >= 1) return 1;

		let idx = 0;
		while (idx < last && sampleX[idx]! < t) {
			idx++;
		}
		const i0 = idx === 0 ? 0 : idx - 1;
		const i1 = idx;

		const x0 = sampleX[i0]!;
		const x1s = sampleX[i1]!;
		const span = x1s - x0 || 1e-6;
		const local = (t - x0) / span;

		let u = (i0 + local) * STEP;

		for (let i = 0; i < NEWTON_ITERS; i++) {
			const x = curveVal(u, x1, x2) - t;
			const d = curveDer(u, x1, x2);
			if (d === 0) break;
			u -= x / d;
		}

		u = Clamp(u, 0, 1);

		return curveVal(u, y1, y2);
	};
};
