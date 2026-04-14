import { hasProp } from "@/utils/dom";

type Handler<T> = () => T;

export function pickByKey<T>(
	v: object,
	map: Record<string, Handler<T>>,
	fallback: Handler<T>
): T {
	for (const key of Object.keys(map)) {
		if (hasProp(v, key) && map[key]) {
			return map[key]();
		}
	}
	return fallback();
}
