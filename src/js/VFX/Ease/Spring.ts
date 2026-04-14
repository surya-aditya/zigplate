import { isNum } from "@/utils/guards";
import { R, Clamp } from "@/utils/math";

export interface EaseSpringCfg {
	k?: number;
	d?: number;
	m?: number;
	p?: number;
}

/**
 * Spring easing function
 * @param k Stiffness
 * @param d Damping
 * @param m Mass
 * @param p Rounding precision
 * @returns
 */
export function EaseSpring({ k = 100, d = 10, m = 1, p }: EaseSpringCfg = {}) {
	k = Clamp(k, 1, 1e4);
	d = Clamp(d, 0, 1e3);
	m = Clamp(m, 0.1, 100);

	const w0 = Math.sqrt(k / m);
	const z = d / (2 * Math.sqrt(k * m));
	const useR = isNum(p);

	// underdamped
	if (z < 1) {
		const oneMinus = 1 - z * z;
		const wd = w0 * Math.sqrt(oneMinus);
		const inv = 1 / Math.sqrt(oneMinus);

		return (t: number): number => {
			const e = Math.exp(-z * w0 * t);
			let y = 1 - e * (Math.cos(wd * t) + z * inv * Math.sin(wd * t));

			return useR ? R(y, p) : y;
		};
	}

	// critical / overdamped
	return (t: number): number => {
		let y = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
		return useR ? R(y, p) : y;
	};
}
