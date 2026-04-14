import type { EaseType } from "@/VFX/types/motion";

export type PropSpec = ["x" | "y" | "rx" | "o", number, number, string?];

/**
 * Ease function type
 */
export interface AnimationHandle {
	play(): void;
	pause(): void;
}

/**
 * Animation timeline constructor
 */
export interface AnimationTimelineConstructor {
	new (opts: {
		de?: number;
		d: number;
		u: (frame: { pr: number }) => void;
		cb: () => void;
	}): AnimationHandle;
}

/**
 * Object group constructor
 */
export interface ObjGroupOptions {
	// Start index
	idx: number;

	// Descendant
	ch: number;

	// Elements
	dom: Element[] | HTMLCollectionOf<Element>;

	// Properties
	p: PropSpec[];

	// Random
	rand: boolean;
}

/**
 * Object constructor
 */
export interface ObjOptions {
	i: number;
	p: PropSpec[];
}

/**
 * Animator constructor
 */
export type AnimatorOptions = {
	dom: HTMLElement | HTMLElement[] | HTMLCollectionOf<HTMLElement>;
	p: any;
	de?: number;
	lT?: boolean;
	ch: number;
	rand?: boolean;
};

/**
 * Run options
 */
export type RunOptions = {
	a: "show" | "hide";
	d: number;
	e?: EaseType;
	de?: number;
};
