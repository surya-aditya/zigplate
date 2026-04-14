import {
	cos,
	createEaseDictionary,
	PI,
	sin,
	type EaseMap,
} from "@/VFX/Ease/utils";

export const Ease: EaseMap | any = createEaseDictionary([
	// Linear
	[(t: number) => t],

	// Ease-In functions
	[
		// easeInSine - i1
		(t: number) => 1 - cos(t * 0.5 * PI),

		// easeInQuad - i2
		(t: number) => t * t,

		// easeInCubic - i3
		(t: number) => t * t * t,

		// easeInQuart - i4
		(t: number) => t * t * t * t,

		// easeInQuint - i5
		(t: number) => t * t * t * t * t,

		// easeInExpo - i6
		(t: number) => (0 === t ? 0 : 2 ** (10 * (t - 1))),
	],

	// Ease-Out functions
	[
		// easeOutSine - o1
		(t: number) => sin(t * 0.5 * PI),

		// easeOutQuad - o2
		(t: number) => t * (2 - t),

		// easeOutCubic - o3
		(t: number) => {
			return --t * t * t + 1;
		},

		// easeOutQuart - o4
		(t: number) => {
			return 1 - --t * t * t * t;
		},

		// easeOutQuint - o5
		(t: number) => {
			return 1 + --t * t * t * t * t;
		},

		// easeOutExpo - o6
		(t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
	],

	// Ease-In-Out functions
	[
		// easeInOutSine - io1
		(t: number) => -0.5 * (cos(PI * t) - 1),

		// easeInOutQuad - io2
		(t: number) => (t < 0.5 ? 2 * t * t : (4 - 2 * t) * t - 1),

		// easeInOutCubic - io3
		(t: number) =>
			t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

		// easeInOutQuart - io4
		(t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),

		// easeInOutQuint - io5
		(t: number) =>
			t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,

		// easeInOutExpo
		(t: number) =>
			t === 0
				? 0
				: t === 1
				? 1
				: t < 0.5
				? 0.5 * 2 ** (10 * (t * 2 - 1))
				: 0.5 * (2 - 2 ** (-10 * (t * 2 - 1))),
	],
]);
