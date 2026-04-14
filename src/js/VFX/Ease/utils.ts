export const PI = Math.PI;
export const cos = (v: number) => Math.cos(v);
export const sin = (v: number) => Math.sin(v);

export type EaseFn = (t: number) => number;
export type EaseMap = Record<string, EaseFn>;

export type EaseCurve = [number, number, number, number];

export const createEaseDictionary = (
	easeArrays: readonly [EaseFn[], EaseFn[], EaseFn[], EaseFn[]]
): EaseMap => {
	const ease: EaseMap = {};
	const [linear, i, o, io] = easeArrays;

	ease.l = linear[0] ?? ((t) => t);

	const cats = ["i", "o", "io"] as const;
	const arrs = [i, o, io] as const;

	for (let c = 0; c < arrs.length; c++) {
		const cat = cats[c];
		const arr = arrs[c];
		if (!arr) continue;

		for (let idx = 0; idx < arr.length; idx++) {
			const fn = arr[idx];
			if (!fn) continue;

			ease[`${cat}${idx + 1}`] = fn;
		}
	}

	return ease;
};
