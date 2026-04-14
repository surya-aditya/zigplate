import { Get } from "@/utils/dom";

/**
 * Get the index of an element inside a list.
 * @param target Element HTML
 * @param list Iterable or ArrayLike of Elements
 * @returns Index number, or -1 if not found
 */
export function getIndex(
	target: Element,
	list: Iterable<Element> | ArrayLike<Element>
): number {
	let i = 0;
	for (const el of list as any) {
		if (el === target) return i;
		i++;
	}
	return -1;
}

/**
 * Get index of an element within its parent’s children.
 * @param el Element HTML
 * @returns
 */
export function getIndexInParent(el: HTMLElement): number {
	const parent = el.parentElement;
	if (!parent) return -1;
	return getIndex(el, parent.children);
}

/**
 * Get index of an element among all elements with a given class.
 * @param el Element HTML
 * @param className
 * @returns
 */
export function getIndexByClass(el: HTMLElement, className: string): number {
	const list = Get.c(className) as HTMLElement[];
	return getIndex(el, list);
}

/**
 * Get index of the closest trigger element from a host element.
 * @param host HTMLElement
 * @param triggers HTMLElement[]
 * @param selector Dom selector string for closest trigger (e.g., ".a-l, .a-p, .a-o")
 * @returns
 */
export function getIndexClosestTrigger(
	host: HTMLElement,
	triggers: HTMLElement[],
	selector: string // ".a-l, .a-p, .a-o"
): number {
	const trigger = host.closest(selector) as HTMLElement | null;
	return trigger ? getIndex(trigger, triggers) : -1;
}
