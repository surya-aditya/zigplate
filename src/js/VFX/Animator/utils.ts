import { getElements } from "@/utils/dom";

type DomInput =
	| string
	| Element
	| Element[]
	| HTMLCollectionOf<Element>
	| NodeListOf<Element>;

export function normalizeDom(input: DomInput): Element[] {
	if (typeof input === "string") {
		// SelectElements should return Element[]
		return getElements(input);
	}
	if (Array.isArray(input)) return input as Element[];
	if (!input) return []; // null/undefined guard for getElementById
	const anyInput = input as any;
	// HTMLCollection / NodeList (array-like) vs single Element
	return typeof anyInput.length === "number" && !("nodeType" in anyInput)
		? Array.from(anyInput as HTMLCollectionOf<Element> | NodeListOf<Element>)
		: [anyInput as Element];
}

export function buildGroups(
	roots: Element[],
	ch: number
): { groups: Element[][]; total: number } {
	const groups: Element[][] = [];
	let total = 0;
	for (const root of roots) {
		const list = ch === 0 ? [root] : (Array.from(root.children) as Element[]);
		groups.push(list);
		total += list.length;
	}
	if (ch === 0 && total === 0) total = roots.length;
	return { groups, total };
}
