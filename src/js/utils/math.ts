import { getDeltaFrame } from "@/global/Runtime/RafManager";
import { isUnd } from "@/utils/guards";

/**
 * Round
 * @param v value
 * @param r rounding precision
 * @returns
 */
export const R = (v: number, r?: number) => {
	const i = isUnd(r) ? 100 : 10 ** r;
	return Math.round(v * i) / i;
};

/**
 * Clamp n value between [min, max]
 * @param n Value
 * @param min Minimum
 * @param max Maximum
 * @returns
 */
export function Clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

export function ClampR(x: number, min: number, max: number): number {
	return R(Clamp(x, min, max));
}

/**
 * Given a value v in [a,b], return normalized t in [0,1].
 */
export function iLerp(a: number, b: number, v: number): number {
	const d = b - a;
	return d === 0 ? 0 : Clamp((v - a) / d, 0, 1);
}

/**
 * Linear interpolation: mix a→b by t in [0,1]
 * */
export function Lerp(a: number, b: number, t: number): number {
	return a * (1 - t) + b * t;
}

/**
 * Exponential damping (frame-rate independent).
 * lambda = “speed” (per second), dt = delta time in seconds.
 * Common form: t = 1 - exp(-lambda * dt)
 */
export function Damp(current: number, target: number, lambda: number): number {
	const value = 1 - Math.exp(-lambda * getDeltaFrame());
	return Lerp(current, target, value);
}

/**
 * Remap value v from [inMin,inMax] to [outMin,outMax]
 */
export function Remap(
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number,
	v: number
): number {
	return Lerp(outMin, outMax, iLerp(inMin, inMax, v));
}

/**
 * Distance between two points
 * @param x
 * @param y
 * @returns
 */
export const Dist = (x: number, y: number) => Math.sqrt(x * x + y * y);

/**
 * Random number in range [min,max]
 * @param {number} min - minimum
 * @param {number} max - maximum
 * @param {number} r - precision (optional, passed to R)
 * @returns {number}
 */
export const RandomRange = (min: number, max: number, r?: number): number => {
	const rand = Math.random() * (max - min) + min;
	return R(rand, r);
};

/**
 * Random number in signed band [-max,-min] U [min,max]
 * @param min
 * @param max
 * @param r
 * @returns
 */
export const RandomSignedBand = (
	min: number,
	max: number,
	r?: number
): number => {
	const sign = Math.random() < 0.5 ? -1 : 1;
	return RandomRange(sign * min, sign * max, r);
};

function swap<T>(a: T[], i: number, j: number): void {
	const ai = a[i];
	const aj = a[j];
	if (ai === undefined || aj === undefined) return;
	a[i] = aj;
	a[j] = ai;
}

/**
 * Generate a shuffled array of indices [0..length-1]
 * @param {number} length - length of array
 * @returns {number[]}
 */
export const RandomUnique = (length: number): number[] => {
	const arr: number[] = Array.from({ length }, (_, i) => i);
	for (let i = length - 1; i > 0; i--) {
		swap(arr, i, Math.floor(Math.random() * (i + 1)));
	}
	return arr;
};

/**
 * Unequal tolerance
 * @param value1
 * @param value2
 * @param tolerance
 * @returns
 */
export function UneT(value1: number, value2: number, tolerance: number) {
	return Math.abs(value1 - value2) >= tolerance;
}

/** Unequal with precision
 * @param value1
 * @param value2
 * @param precision
 * @returns
 */
export function Une(value1: number, value2: number, precision: number) {
	return R(Math.abs(value1 - value2), precision) !== 0;
}

/**
 * Modulo operation that always returns a positive result.
 * @param dividend
 * @param divisor
 * @returns
 */
export function Mod(dividend: number, divisor: number): number {
	return ((dividend % divisor) + divisor) % divisor;
}
