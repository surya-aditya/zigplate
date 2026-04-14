/**
 * ------------------------------------------------------
 * DOM
 * ------------------------------------------------------
 */

import { isArr, isDef, isObj, isStr } from "@/utils/guards";

const dictionary = {
	a: "add",
	r: "remove",
	c: "contains",
	t: "toggle",
} as const;

// export const Doc = document!;
// export const Body = Doc.body;

/**
 * Convert to array
 * @param value
 * @returns
 */
export function toArr<T>(value: T | T[]): T[] {
	return Array.isArray(value) ? value : [value];
}

/**
 * Get the first child element
 * @param element Element
 * @returns
 */
export const Child0 = (element: Element | undefined): HTMLElement =>
	element!.firstElementChild as HTMLElement;

/**
 * Create Elements
 */

export const CreateElement = (tag: string): HTMLElement =>
	document.createElement(tag);

export function GetOrCreate(cls: string, parent: HTMLElement): HTMLElement {
	const el = parent.getElementsByClassName(cls)[0];
	if (el) return el as HTMLElement;
	const n = CreateElement("div");
	n.className = cls;
	parent.appendChild(n);
	return n;
}

/**
 * ------------------------------
 * Get Elements
 * -----------------------------
 */
type Scope = Document | Element | HTMLElement | null | undefined;

const exec = (scope: Scope, method: string, value: string): any =>
	(scope ?? (document as any))[method](value);

const get = (
	scope: Scope,
	suffix: "ById" | "sByClassName" | "sByTagName",
	value: string,
): any => exec(scope, "getElement" + suffix, value);

export const Get = {
	i: (id: string, scope?: Scope) => get(scope, "ById", id) as Element | null,
	c: (className: string, scope?: Scope) =>
		Array.from(get(scope, "sByClassName", className)) as HTMLElement[],
	t: (tagName: string, scope?: Scope) =>
		get(scope, "sByTagName", tagName) as
			| HTMLElement[]
			| HTMLCollectionOf<HTMLElement>,
};

/**
 * --------------------------------
 * Query Selectors
 * --------------------------------
 */

const qs = "querySelector";

/**
 * Get the first matching element
 * @param selector Selector string
 * @param scope Scope to search within
 * @returns
 */
export const Qs = (selector: string, scope?: Scope) => {
	return (scope ?? document)[qs](selector) as Element | null;
};

/** Get all matching elements
 * @param selector Selector string
 * @param scope Scope to search within
 * @returns
 */
export const Qsa = (selector: string, scope?: Scope) => {
	return Array.from((scope ?? document).querySelectorAll(selector)) as
		| HTMLElement[]
		| SVGElement[]
		| Element[];
};

/**
 * ------------------------------
 * Element Class
 * ------------------------------
 */
export const Class = {
	a: (element: Element, c: string) => element.classList[dictionary.a](c),
	r: (element: Element, c: string) => element.classList[dictionary.r](c),
	c: (element: Element, c: string) => element.classList[dictionary.c](c),
	t: (element: Element, c: string, s: boolean) =>
		element.classList[dictionary.t](c, s),
};

/**
 * ------------------------------
 * Element Attributes
 * -----------------------------
 */
export const dataAttr = ([name, value]: [string, string?]) =>
	isDef(value) ? `data-${name}="${value}"` : `data-${name}`;
export const hasAttr = (el: Element | HTMLElement, name: string) =>
	el.hasAttribute(name);
export const getAttr = (el: Element | HTMLElement, name: string) =>
	el.getAttribute(name);
export const setAttr = (
	el: Element | HTMLElement,
	name: string,
	value: string,
) => el.setAttribute(name, value);
export const removeAttr = (el: Element | HTMLElement, name: string) =>
	el.removeAttribute(name);

/**
 * ------------------------------
 * Other DOM Utilities
 * ------------------------------
 */

/**
 * Select elements
 * @param element
 * @returns
 */
export function getElements(
	input: string | HTMLElement | Element,
): HTMLElement[] {
	if (!isStr(input)) {
		return [input as HTMLElement];
	}

	const name = getSelectorName(input);

	if (getSelectorType(input) === "id") {
		return [Get.i(name) as HTMLElement];
	}

	return Get.c(name);
}

export function getSelectorType(selector: string): "id" | "class" {
	return selector.charAt(0) === "#" ? "id" : "class";
}

export function getSelectorName(selector: string): string {
	return selector.substring(1);
}

/**
 * Check if property exists
 * @param obj
 * @param prop
 * @returns
 */
export function hasProp<T extends object, K extends PropertyKey>(
	obj: T,
	prop: K,
): prop is K & keyof T {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * ------------------------------
 * Element Listeners
 * ------------------------------
 */

type ListenerScope = Element | HTMLBodyElement | Document | Window;
type LsnOpts = boolean | AddEventListenerOptions | undefined;

const INPUT_PREFIXES = ["whe", "mou", "tou", "poi"] as const;

function isInputEvent(type: string) {
	const p = type.slice(0, 3);
	return INPUT_PREFIXES.includes(p as any);
}

function addOpts(type: string, opts?: AddEventListenerOptions): LsnOpts {
	if (!opts) {
		return isInputEvent(type) ? { passive: false } : false;
	}

	if (isObj(opts)) {
		if (opts.passive === undefined && isInputEvent(type)) {
			return { ...opts, passive: false };
		}

		return opts;
	}

	return opts;
}

function removeOpts(opts?: AddEventListenerOptions): LsnOpts {
	if (!opts) return false;

	if (typeof opts === "object") {
		const cap = opts.capture ?? false;
		return cap;
	}

	return opts; // boolean already
}

/**
 * Element Listeners
 * @param target "#id" | ".class" | Element | Document | Window
 * @param action "a" = add, "r" = remove
 * @param type   "click" | "wheel" | "touchstart" | ...
 * @param handler Event handler
 * @param opts  AddEventListenerOptions (e.g., { once:true, passive:true, capture:true })
 */
export function Listen(
	target: string | ListenerScope,
	action: "a" | "r",
	type: string,
	handler: EventListener,
	opts?: AddEventListenerOptions,
) {
	const method = (dictionary[action] + "EventListener") as
		| "addEventListener"
		| "removeEventListener";

	let elements: ListenerScope[];
	if (target instanceof Document || target instanceof Window) {
		elements = [target];
	} else {
		const selected = getElements(target);
		elements = isArr(selected) ? selected : [selected];
	}

	const options = action === "a" ? addOpts(type, opts) : removeOpts(opts);

	for (let i = 0; i < elements.length; i++) {
		const el = elements[i];
		if (!el) continue;
		el[method](type, handler, options as any);
	}
}

/**
 * Pad a number with leading zeros
 * @param v Value to pad
 * @param n Number of characters
 * @returns
 */
export const Pad = (v: number, n: number = 2): string => {
	return v.toString().padStart(n, "0");
};

/**
 * Pointer Events
 */
const pe = (element: Element, value: string) => {
	(element as HTMLElement).style.pointerEvents = value;
};

/**
 * Pointer Events
 * "n" = none, "a" = auto
 */
export const PE = {
	a: (element: Element | HTMLElement) => pe(element, "all"),
	n: (element: Element | HTMLElement) => pe(element, "none"),
};

/**
 * CSS Props
 * @param element Element
 * @param prop Property
 * @param value Value
 */
export const cssProp = (
	element: Element,
	prop: string,
	value: number | string,
) => {
	(element as HTMLElement).style.setProperty("--" + prop, value.toString());
};

/**
 * Remove CSS properties
 * @param element Element
 * @param props Properties
 */
export const rmProps = (element: Element, props: string[]) => {
	for (let i = 0; i < props.length; i++) {
		(element as HTMLElement).style.removeProperty("--" + props[i]);
	}
};

const zCache = new WeakMap<HTMLElement, string>();
/**
 * Set the z-index of an element
 * @param element
 * @param value
 */
export const zIndex = (
	element: HTMLElement | Element,
	value: string | number = "",
) => {
	const el = element as HTMLElement;
	const str = String(value);

	if (zCache.get(el) === str) return;

	el.style.zIndex = str;
	zCache.set(el, str);
};

/**
 * Substring utility
 * @param str Input string
 * @param start Start index
 * @param end End index
 * @returns
 */
export const Substring = (str: string, start: number, end?: number): string => {
	return str.substring(start, end);
};

/**
 * Query elements whose class list contains the given prefix
 * e.g. QsPrefix("a-o", el) matches a-o, a-o-5, a-o-10
 */
export const QsPrefix = (prefix: string, scope?: Scope): HTMLElement[] =>
	Array.from(
		(scope ?? document).querySelectorAll(`[class*="${prefix}"]`),
	) as HTMLElement[];

/**
 * Parse a-{type}-{n} class → n * 10
 */
export function parseStagger(el: Element, prefix: string): number {
	const cls = el.classList;
	const re = new RegExp(`^${prefix}-(\\d+)$`);
	for (let i = 0; i < cls.length; i++) {
		const m = re.exec(cls[i]!);
		if (m) return parseInt(m[1]!) * 10;
	}
	return 0;
}

/**
 * Get children as array
 * @param element Parent element
 * @returns
 */
export const Children = (
	element: HTMLCollection | HTMLElement | Element,
): HTMLElement[] => {
	return Array.from(
		element instanceof HTMLCollection ? element : element.children,
	) as HTMLElement[];
};

/**
 * Get computed style numeric value for a given property.
 * Strips units via parseFloat. Returns 0 if not parsable.
 * @param element Element
 * @param prop CSS Property
 * @returns Numeric value of the computed style property
 */
export const CS = (
	element: Element,
	prop: keyof CSSStyleDeclaration,
): number => {
	const value = getComputedStyle(element)[prop];
	return isStr(value) ? parseFloat(value) || 0 : 0;
};
