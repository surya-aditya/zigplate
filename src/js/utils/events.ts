/**
 * ------------------------------------------------------
 * Events
 * ------------------------------------------------------
 */

import { isDef } from "@/utils/guards";

export const PD = (event: Event) => {
	if (event.cancelable) event.preventDefault();
};

export const Propagation = (event: Event, immediate: boolean = false) => {
	const { cancelable, stopImmediatePropagation, stopPropagation } = event;

	if (cancelable) {
		immediate ? stopImmediatePropagation() : stopPropagation();
	}
};

export type Stoppable = { stop?: () => void } | null | undefined;
export const Stop = (task: Stoppable): void => {
	if (isDef(task)) task?.stop?.();
};

export type Pauseable = { pause?: () => void } | null | undefined;
export const Pause = (task: Pauseable): void => {
	if (isDef(task)) task?.pause?.();
};

export function isKey(event: Event): event is KeyboardEvent {
	return event instanceof KeyboardEvent;
}

export function isNextKey(
	key: string,
	opts: { space?: boolean } = {}
): boolean {
	const nextKeys = ["ArrowDown", "ArrowRight"];
	if (opts.space) nextKeys.push(" ");
	return nextKeys.includes(key);
}

export function isPrevKey(key: string): boolean {
	const prevKeys = ["ArrowUp", "ArrowLeft"];
	return prevKeys.includes(key);
}
