import type { EaseCurve, EaseFn } from "@/VFX/Ease/utils";

export type EaseType = string | EaseCurve | EaseFn;

/**
 * Properties spec
 * @typedef {Object} PropertiesSpec
 * @property {Number} start - starting value
 * @property {Number} end - ending value
 * @property {String} unit - unit
 */
export type PropertiesSpec = Record<
	string,
	[start: number, end: number, unit?: string]
>;

/**
 * SVG spec
 * @typedef {Object} SvgSpec
 * @property {String} type - SVG type
 * @property {String} start - starting value
 * @property {String} end - ending value
 */
export type SvgSpec = { type: string; start?: string; end: string };

/**
 * Line spec
 * @typedef {Object} LineSpec
 * @property {String} dashed - dash pattern
 * @property {Number} start - starting value
 * @property {Number} end - ending value
 * @property {Element} elWL - element to which the line is applied
 */
export type LineSpec = {
	dashed?: string;
	start?: number;
	end?: number;
	elWL?: Element;
};

/**
 * Motion options
 * @typedef {Object} MotionOptions
 * @property {Element|Element[]|string} _ - element(s) to animate
 * @property {EaseType} e - easing curve
 * @property {Number} d - starting value
 * @property {Number} de - duration
 * @property {Function} cb - callback
 * @property {Number} r - rounding precision
 * @property {any} p - properties
 * @property {any} svg - SVG
 * @property {any} line - line
 * @property {Function} u - updater
 */
export type MotionOptions = {
	_?: Element | string;
	e?: EaseType;
	d?: number;
	de?: number;
	cb?: false | (() => void);
	rev?: boolean;
	r?: number;
	p?: any;
	svg?: any;
	line?: any;
	u?: (state: any) => void;
};

/**
 * Motion state
 * @typedef {Object} MotionState
 * @property {Array} _ - elements to animate
 * @property {Number} len - number of elements
 * @property {Object} e - easing curve
 * @property {Object} d - starting and ending values
 * @property {Number} de - duration
 * @property {Function} cb - callback
 * @property {Number} r - rounding precision
 * @property {Number} pr - [progress, eased progress]
 * @property {Number} t - elapsed time
 * @property {Function} u - updater
 * @property {Object} p - properties
 * @property {Array} pI - interpolated properties
 * @property {Number} pL - number of properties
 * @property {Object} svg - SVG
 * @property {Object} line - line
 */
export type MotionState = {
	_: any;
	len?: number;
	e: { t: EaseType; c?: (t: number) => number };
	d: { og: number; cur: number };
	de: number;
	cb: false | (() => void);
	r: number;
	pr: [number, number];
	t: number;
	u?: () => void;

	p?: any;
	pI?: any;
	pL?: number;
	svg?: any;
	line?: any;
};
