import { Class, CreateElement, Get, getElements } from "@/utils/dom";
import { isDef, isNum, isUnd } from "@/utils/guards";
import { R } from "@/utils/math";
import { Rect } from "@/utils/styles";

type TokenType = "word" | "space" | "br" | "tag" | "raw" | "wbr";

interface BaseToken {
	type: TokenType;
	open?: number[];
	close?: number[];
	mi?: number; // measurement-unit index (word/raw only)
}

interface WordToken extends BaseToken {
	type: "word";
	text: string;
}

interface SpaceToken extends BaseToken {
	type: "space";
	ws: string; // preserve exact whitespace run (e.g. " ", "\n", "\t", "\u00A0")
}

interface BrToken extends BaseToken {
	type: "br";
}

interface WbrToken extends BaseToken {
	type: "wbr";
}

interface TagToken extends BaseToken {
	type: "tag";
	open_?: number;
	close_?: number;
}

interface RawToken extends BaseToken {
	type: "raw";
	html: string;
	kind: RawKind;
	measureHtml?: string; // placeholder for measurement
}

type RawKind =
	| "svg"
	| "button"
	| "img"
	| "video"
	| "audio"
	| "canvas"
	| "iframe"
	| "input"
	| "select"
	| "textarea"
	| "picture"
	| "object"
	| "embed"
	| "inline-block"
	| "nowrap";

type Token = WordToken | SpaceToken | BrToken | WbrToken | TagToken | RawToken;

interface TagDefinition {
	tag: string;
	open: string;
	close: string;
	extra?: number;
}

// Set of void elements that don't need closing tags
const VOID_ELEMENTS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

// Elements that should be treated as raw (atomic) units
const RAW_ELEMENTS = new Set([
	"svg",
	"button",
	"img",
	"video",
	"audio",
	"canvas",
	"iframe",
	"input",
	"select",
	"textarea",
	"picture",
	"object",
	"embed",
]);

export class SplitLines {
	public dom: HTMLElement;
	public txt: string;

	constructor(opts: { dom: HTMLElement }) {
		const el = getElements(opts.dom)[0] as HTMLElement | undefined;
		this.dom = el ?? opts.dom;
		this.txt = this.dom?.innerHTML ?? "";
	}

	rz(wrappers: [string, string]) {
		const root = this.dom;
		if (!root) return;

		root.innerHTML = this.txt;

		// Handle empty content
		if (!this.txt.trim()) {
			const [before, after] = wrappers;
			root.innerHTML = before + "&nbsp;" + after;
			return;
		}

		let width = Rect(root).width;

		// Handle zero-width container
		if (width <= 0) return;

		// text-indent: after split each ln_ is display:block and inherits
		// text-indent, so ALL lines are indented — subtract from measurement width
		let textIndent = 0;
		try {
			textIndent = parseFloat(getComputedStyle(root).textIndent) || 0;
		} catch {}
		if (textIndent > 0) width -= textIndent;

		const reSpace = /(\s+|\u00A0+)/;
		// Split on whitespace, slashes, hyphens, zero-width space, soft hyphen, hyphen
		const reSplit = /(\s+|\u00A0+|[\/\-​\u00AD\u2010\u200B])/;

		const buildTagStrings = (el: HTMLElement, isVoid: boolean) => {
			const tagName = el.tagName.toLowerCase();
			let open = "<" + tagName;

			const attrs = el.attributes;
			for (let i = 0; i < attrs.length; i++) {
				const attr = attrs[i];
				if (isUnd(attr)) continue;
				// Escape attribute values to prevent XSS
				const escapedValue = attr.value
					.replace(/&/g, "&amp;")
					.replace(/"/g, "&quot;");
				open += " " + attr.name + '="' + escapedValue + '"';
			}

			open += ">";
			return {
				open,
				close: isVoid ? "" : "</" + tagName + ">",
			};
		};

		// Helper to check if element should be treated as atomic unit
		const shouldTreatAsRaw = (el: HTMLElement, tagName: string): RawKind | null => {
			// Check if it's a known raw element
			if (RAW_ELEMENTS.has(tagName)) {
				return tagName as RawKind;
			}

			// Check for SVG namespace
			if (
				el.namespaceURI === "http://www.w3.org/2000/svg" ||
				tagName === "svg"
			) {
				return "svg";
			}

			// Check computed styles for inline-block/inline-flex elements
			try {
				const style = getComputedStyle(el);

				// Elements with white-space: nowrap should be treated atomically
				if (
					style.whiteSpace === "nowrap" ||
					style.whiteSpace === "pre"
				) {
					return "nowrap";
				}

				// Inline-block and inline-flex elements are atomic
				if (
					style.display === "inline-block" ||
					style.display === "inline-flex"
				) {
					return "inline-block";
				}
			} catch {
				// getComputedStyle can fail for detached elements
			}

			return null;
		};

		// Helper to create measurement HTML for raw elements
		const createMeasureHtml = (
			el: HTMLElement,
			kind: RawKind,
			html: string
		): string => {
			try {
				const style = getComputedStyle(el);

				// Ignore absolutely/fixed positioned elements
				if (style.position === "absolute" || style.position === "fixed") {
					return "";
				}

				const r = Rect(el);
				const w = Math.max(0, R(r.width, 2));
				const h = Math.max(0, R(r.height, 2));

				// Button gets special handling to preserve inline layout
				if (kind === "button") {
					return (
						`<span class="-ln-w -ln-btn" style="display:inline-block;vertical-align:baseline;">` +
						html.replace(
							"<button",
							'<button style="display:inline-flex;align-items:center;vertical-align:baseline;white-space:nowrap;margin:0;pointer-events:none;"'
						) +
						`</span>`
					);
				}

				// Input/select/textarea preserve actual element for accurate sizing
				if (kind === "input" || kind === "select" || kind === "textarea") {
					return `<span class="-ln-w -ln-form" style="display:inline-block;vertical-align:baseline;width:${w}px;height:${h}px;"></span>`;
				}

				// Image with explicit dimensions
				if (kind === "img") {
					return `<span class="-ln-w -ln-img" style="display:inline-block;vertical-align:baseline;width:${w}px;height:${h}px;"></span>`;
				}

				// Default: sized placeholder span
				return `<span class="-ln-w -ln-raw" style="display:inline-block;vertical-align:baseline;width:${w}px;height:${h}px;"></span>`;
			} catch {
				return `<span class="-ln-w -ln-raw" style="display:inline-block;vertical-align:baseline;"></span>`;
			}
		};

		// ---------------------------------------------------------------------
		// 1) Tokenize DOM into word/space/br/wbr/raw + tag boundary tokens
		//    Keeps tag context snapshots for correct nesting on split.
		//    Supports svg/button/img/video/etc as RAW units (measured + emitted).
		// ---------------------------------------------------------------------
		const tokens: Token[] = [];
		const tags: TagDefinition[] = [];

		const tagContext = { open: [] as number[], close: [] as number[] };

		const snapshotCtx = (t: BaseToken) => {
			if (tagContext.open.length) t.open = tagContext.open.slice();
			if (tagContext.close.length) t.close = tagContext.close.slice();
		};

		const pushWord = (text: string) => {
			if (!text) return; // Skip empty strings
			const t: WordToken = { type: "word", text };
			snapshotCtx(t);
			tokens.push(t);
		};

		const pushSpace = (ws: string) => {
			const t: SpaceToken = { type: "space", ws };
			snapshotCtx(t);
			tokens.push(t);
		};

		const pushBr = () => {
			const t: BrToken = { type: "br" };
			snapshotCtx(t);
			tokens.push(t);
		};

		const pushWbr = () => {
			const t: WbrToken = { type: "wbr" };
			snapshotCtx(t);
			tokens.push(t);
		};

		const pushRaw = (raw: RawToken) => {
			snapshotCtx(raw);
			tokens.push(raw);
		};

		(function walk(node: Node, depth = 0) {
			const children = node.childNodes;
			for (let i = 0; i < children.length; i++) {
				const child = children[i] as Node;

				// Text node
				if (child.nodeType === 3) {
					const text = child.nodeValue || "";
					if (!text) continue;

					const parts = text.split(reSplit);
					for (let j = 0; j < parts.length; j++) {
						const part = parts[j];
						if (!part) continue;
						if (reSpace.test(part)) pushSpace(part);
						else pushWord(part);
					}
					continue;
				}

				// Skip non-element nodes (comments, etc)
				if (child.nodeType !== 1) continue;

				const el = child as HTMLElement;
				const tagName = el.tagName.toLowerCase();
				const isVoid = VOID_ELEMENTS.has(tagName);

				// Handle <wbr> - word break opportunity
				if (tagName === "wbr") {
					pushWbr();
					continue;
				}

				// Handle <br>
				if (tagName === "br") {
					pushBr();
					continue;
				}

				// Check if this element should be treated as raw/atomic
				const rawKind = shouldTreatAsRaw(el, tagName);
				if (rawKind) {
					const html = el.outerHTML;
					const measureHtml = createMeasureHtml(el, rawKind, html);

					pushRaw({
						type: "raw",
						kind: rawKind,
						html,
						measureHtml,
					});
					continue;
				}

				// Normal tag - walk its children
				const tagStrings = buildTagStrings(el, isVoid);
				const tagIndex = tags.length;

				tags.push({
					tag: tagName,
					open: tagStrings.open,
					close: tagStrings.close,
				});

				// Keep anchor extra rule for empty spans after anchors
				if (depth === 1 && el.childNodes.length === 0) {
					let k = tagIndex - 1;
					while (k >= 0) {
						if (tags[k]?.tag === "a") {
							tags[k]!.extra = tagIndex;
							break;
						}
						k--;
					}
				}

				tagContext.open.push(tagIndex);
				tagContext.close.unshift(tagIndex);

				tokens.push({ type: "tag", open_: tagIndex });

				// Only walk children for non-void elements
				if (!isVoid) {
					walk(el, depth + 1);
				}

				tokens.push({ type: "tag", close_: tagIndex });

				tagContext.open.pop();
				tagContext.close.shift();
			}
		})(root);

		// Handle case where no tokens were generated
		if (tokens.length === 0) {
			const [before, after] = wrappers;
			root.innerHTML = before + "&nbsp;" + after;
			return;
		}

		// ---------------------------------------------------------------------
		// 2) Build measurement HTML
		//    Only WORD and RAW become measurement units (-ln-w).
		//    Spaces are emitted as literal whitespace (not &nbsp;).
		// ---------------------------------------------------------------------
		let measuredHtml = "";
		let unitIndex = 0;

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i] as Token;

			if (token.type === "tag") {
				const t = token as TagToken;
				const isOpen = isNum(t.open_);
				const tagIndex = isOpen ? t.open_ : t.close_;
				if (!isNum(tagIndex)) continue;
				const tagInfo = tags[tagIndex];
				if (!tagInfo) continue;
				measuredHtml += isOpen ? tagInfo.open : tagInfo.close;
				continue;
			}

			if (token.type === "word") {
				token.mi = unitIndex++;
				measuredHtml += `<span class="-ln-w" style="display:inline-block;vertical-align:baseline;">${
					(token as WordToken).text
				}</span>`;
				continue;
			}

			if (token.type === "space") {
				// Preserve exact whitespace run; browser will collapse visually
				measuredHtml += (token as SpaceToken).ws;
				continue;
			}

			if (token.type === "br") {
				measuredHtml += "<br>";
				continue;
			}

			if (token.type === "wbr") {
				// Word break opportunity - emitted as zero-width for measurement
				measuredHtml += "<wbr>";
				continue;
			}

			if (token.type === "raw") {
				token.mi = unitIndex++;
				const raw = token as RawToken;
				measuredHtml +=
					raw.measureHtml ??
					`<span class="-ln-w -ln-raw" style="display:inline-block;vertical-align:baseline;"></span>`;
				continue;
			}
		}

		const measureEl = CreateElement("div");
		let computed: CSSStyleDeclaration;

		try {
			computed = getComputedStyle(this.dom);
		} catch {
			// Fallback for detached elements
			measureEl.remove();
			return;
		}

		Object.assign(measureEl.style, {
			position: "absolute",
			fontFamily: computed.fontFamily,
			fontSize: computed.fontSize,
			fontWeight: computed.fontWeight,
			lineHeight: computed.lineHeight,
			letterSpacing: computed.letterSpacing,
			textAlign: computed.textAlign,
			textTransform: computed.textTransform,
			wordBreak: computed.wordBreak,
			overflowWrap: computed.overflowWrap,
			hyphens: computed.hyphens,
			pointerEvents: "none",
			width: width + "px",
			visibility: "hidden",
			left: "-99999px",
			top: "0px",
			whiteSpace: "normal",
		});

		measureEl.className = "-ln";
		measureEl.insertAdjacentHTML("beforeend", measuredHtml);
		document.body.appendChild(measureEl);

		// ---------------------------------------------------------------------
		// 3) Detect soft line breaks by top changes on measurement units.
		//    RAW svg placeholders cannot start a line (keep your rule).
		// ---------------------------------------------------------------------
		const unitSpans = Get.c("-ln-w", measureEl);
		const unitCount = unitSpans.length;

		const breakUnitIndices: number[] = [];
		let lastTop: number | null = null;

		const EPS = 1;

		for (let i = 0; i < unitCount; i++) {
			const el = unitSpans[i] as HTMLElement;
			let top: number;

			try {
				top = Rect(el).top;
			} catch {
				continue; // Skip if rect fails
			}

			const isRawSvg = Class.c(el, "-ln-raw");
			const prev = i > 0 ? (unitSpans[i - 1] as HTMLElement) : null;
			const prevIsBtn = !!prev && Class.c(prev, "-ln-btn");

			if (lastTop === null) {
				lastTop = top;
				continue;
			}

			if (Math.abs(top - lastTop) > EPS) {
				if (!isRawSvg && i > 0) {
					let breakAt = i - 1;
					if (prevIsBtn) breakAt = i - 2;
					if (breakAt >= 0) breakUnitIndices.push(breakAt);
				}
				if (!isRawSvg) lastTop = top;
			}
		}

		const breakSet = new Set(breakUnitIndices);

		// ---------------------------------------------------------------------
		// 4) Build final lines, preserving tag nesting and RAW html.
		//    Critical: when a break happens after a WORD/RAW unit,
		//    consume trailing SPACE tokens into the SAME line before pushing.
		//    This prevents "forCreativity" and prevents a new ln starting with space.
		// ---------------------------------------------------------------------
		const lines: string[] = [];
		let currentLine = "";
		let openStack: number[] = [];

		const closeOne = (idx: number) => {
			const tagInfo = tags[idx];
			if (!tagInfo) return;

			if (isDef(tagInfo.extra)) {
				const extraTag = tags[tagInfo.extra];
				if (extraTag) currentLine += extraTag.open + extraTag.close;
			}
			currentLine += tagInfo.close;
		};

		const openOne = (idx: number) => {
			const tagInfo = tags[idx];
			if (!tagInfo) return;
			currentLine += tagInfo.open;
		};

		const syncTo = (desired: number[] = []) => {
			let k = 0;
			const a = openStack;
			const b = desired;
			const n = Math.min(a.length, b.length);
			while (k < n && a[k] === b[k]) k++;

			for (let i = a.length - 1; i >= k; i--) closeOne(a[i]!);
			for (let i = k; i < b.length; i++) openOne(b[i]!);

			openStack = b.slice();
		};

		const closeAll = () => {
			for (let i = openStack.length - 1; i >= 0; i--) closeOne(openStack[i]!);
			openStack = [];
		};

		const pushLine = (allowBlank = false) => {
			const trimmed = currentLine.trimEnd();
			if (trimmed.length) lines.push(trimmed);
			else if (allowBlank) lines.push("&nbsp;"); // only for explicit <br> blank lines
			currentLine = "";
		};

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i] as Token;

			if (token.type === "tag") continue;

			syncTo(token.open ?? []);

			if (token.type === "br") {
				closeAll();
				pushLine(false);
				syncTo(token.open ?? []);
				continue;
			}

			if (token.type === "wbr") {
				// Word break opportunity - don't output anything but allow break here
				continue;
			}

			if (token.type === "word") currentLine += (token as WordToken).text;
			else if (token.type === "space") currentLine += (token as SpaceToken).ws;
			else if (token.type === "raw") currentLine += (token as RawToken).html;

			// Break after a unit (word/raw). Pull trailing spaces into this same line.
			if (isNum(token.mi) && breakSet.has(token.mi)) {
				// Consume spaces that follow immediately so next line never starts with whitespace
				while (
					i + 1 < tokens.length &&
					(tokens[i + 1] as Token).type === "space"
				) {
					i++;
					currentLine += (tokens[i] as SpaceToken).ws;
				}

				closeAll();
				pushLine(false);
				syncTo(token.open ?? []);
			}
		}

		closeAll();
		currentLine = currentLine.trimEnd();

		// Only push final line if it has content
		if (currentLine.length) {
			lines.push(currentLine);
		}

		// Handle edge case: no lines generated
		if (lines.length === 0) {
			const [before, after] = wrappers;
			root.innerHTML = before + "&nbsp;" + after;
			measureEl.remove();
			return;
		}

		// ---------------------------------------------------------------------
		// 5) Wrap and apply
		// ---------------------------------------------------------------------
		const [before, after] = wrappers;
		let finalHtml = "";
		for (let i = 0; i < lines.length; i++) {
			if (i > 0) finalHtml += " ";
			finalHtml += before + lines[i] + after;
		}

		root.innerHTML = finalHtml;
		measureEl.remove();
	}
}
