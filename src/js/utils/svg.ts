import { getAttr } from "@/utils/dom";
import { isFn, isStr } from "@/utils/guards";
import { Dist, R } from "@/utils/math";

export const numAttr = (element: Element, name: string): number => {
	const raw = getAttr(element, name);
	const n = raw == null ? NaN : parseFloat(raw);
	return Number.isFinite(n) ? n : 0;
};

export const SvgShapeL = function (element: Element): number {
	const svgEl = element as SVGElement;

	if (svgEl.tagName === "circle") {
		const radius = numAttr(svgEl, "r");
		return 2 * radius * Math.PI;
	}

	if (svgEl.tagName === "line") {
		let x1 = numAttr(element, "x1");
		let x2 = numAttr(element, "x2");
		let y1 = numAttr(element, "y1");
		let y2 = numAttr(element, "y2");

		x2 -= x1;
		y2 -= y1;

		return Math.sqrt(x2 * x2 + y2 * y2);
	}

	if (svgEl.tagName === "polyline" && svgEl instanceof SVGPolylineElement) {
		const pts = svgEl.points;
		const n = pts.numberOfItems;
		if (n === 0) return 0;

		let totalLength = 0;
		let previousPoint = pts.getItem(0);

		for (let i = 1; i < n; i++) {
			const currentPoint = pts.getItem(i);
			totalLength += Dist(
				currentPoint.x - previousPoint.x,
				currentPoint.y - previousPoint.y,
			);
			previousPoint = currentPoint;
		}

		return totalLength;
	}

	const maybeGeom = svgEl as unknown as SVGGeometryElement;
	if (isFn(maybeGeom.getTotalLength)) {
		return maybeGeom.getTotalLength();
	}

	return 0;
};

export const SvgSplit = (d: unknown): Array<string | number> => {
	if (!isStr(d) || d.length === 0) return [];

	const s = d.replace(/,/g, " ");
	const TOKEN_RE = /[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

	const tokens = s.match(TOKEN_RE);
	if (!tokens) return [];

	return tokens.map((t) => {
		if (t.length === 1 && /[a-zA-Z]/.test(t)) return t;
		return parseFloat(t);
	});
};

/**
 * Sets the stroke dash array or offset style on an SVG element.
 *
 * @param element - The SVG element whose style to modify
 * @param type - `"a"` for dasharray, anything else for dashoffset
 * @param value - The value to assign (string or number)
 */
export const Dash = (
	element: SVGElement,
	type: "a" | "o",
	value: string | number,
): void => {
	const prop = type === "a" ? "strokeDasharray" : "strokeDashoffset";
	const val = isStr(value) ? parseFloat(value as string) : (value as number);
	(element.style as any)[prop] = R(val).toString();
};
