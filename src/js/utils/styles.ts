/**
 * Element styles
 */

import { isNum } from "@/utils/guards";

export const style = (el: HTMLElement): CSSStyleDeclaration => el.style;

/**
 * Set the opacity of an element.
 * @param elements HTMLElement
 * @param value Opacity value
 * @returns
 */
export const Opacity = (elements: HTMLElement, value: number) => {
	return (style(elements).opacity = value.toString());
};

/**
 * Set the 3D translation of an element.
 * @param el  Element
 * @param x X position
 * @param y Y position
 * @param u unit
 */
export const T = (
	el: HTMLElement,
	x: number | string,
	y: number | string,
	u: "px" | "%" = "%",
): void => {
	const X = isNum(x) ? `${x}${u}` : x;
	const Y = isNum(y) ? `${y}${u}` : y;
	style(el).transform = `translate3d(${X},${Y},0)`;
};

export const ClipPath = (
	el: HTMLElement,
	value: [number, number, number, number],
	unit: string = "%",
) => {
	const [a, b, c, d] = value;
	el.style.clipPath = `inset(${a}${unit} ${b}${unit} ${c}${unit} ${d}${unit})`;
};

/**
 * Set clip-path inset on an element.
 * @param el Element
 * @param t Top inset (px)
 * @param r Right inset (px)
 * @param b Bottom inset (px)
 * @param l Left inset (px)
 */
export const Inset = (
	el: HTMLElement,
	t: number,
	r: number = 0,
	b: number = 0,
	l: number = 0,
) => {
	style(el).clipPath = `inset(${t}px ${r}px ${b}px ${l}px)`;
};

/**
 *
 * @param el Element
 * @returns
 */
export const Rect = (el: Element): DOMRect => el.getBoundingClientRect();

/**
 * Apply or clear CSS transition on one or more elements.
 * @param el HTMLElement or array of elements
 * @param duration Transition duration in ms (0 = disable)
 * @param easing Easing function (comma or cubic-bezier)
 * @param prop CSS property to transition (default: "transform")
 */
export function setTransition(
	el: HTMLElement | HTMLElement[],
	duration = 0,
	easing = ".16,1,.36,1",
	prop = "transform",
): void {
	const els = Array.isArray(el) ? el : [el];
	const easingStr = easing.includes("cubic-bezier")
		? easing
		: `cubic-bezier(${easing})`;

	const transitionValue =
		duration > 0 ? `${prop} ${duration}ms ${easingStr}` : "none";

	for (let i = 0; i < els.length; i++) {
		const e = els[i];
		if (!e || e.style.transition === transitionValue) continue;
		e.style.transition = transitionValue;
	}
}
