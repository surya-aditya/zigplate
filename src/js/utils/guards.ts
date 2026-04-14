/**
 * ------------------------------------------------------
 * Type guards
 * ------------------------------------------------------
 */

import type { EaseFn } from "@/VFX/Ease/utils";

/**
 * Is function?
 * @param value
 * @returns
 */
export const isFn = (value: unknown): value is Function =>
	typeof value === "function";

/**
 * Is string?
 * @param value
 * @returns
 */
export const isStr = (value: unknown): value is string =>
	typeof value === "string";

/**
 * Is number?
 * @param value
 * @returns
 */
export const isNum = (value: unknown): value is number =>
	typeof value === "number";

/**
 * Is value object?
 * @param value
 * @returns
 */
export const isObj = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/**
 * Is value array?
 * @param value
 * @returns
 */
export const isArr = (value: unknown): value is Array<unknown> =>
	Array.isArray(value);

/**
 * Is value defined?
 * @param value
 * @returns
 */
export const isDef = <T>(v: T | undefined | null): v is T =>
	v !== undefined && v !== null;

/**
 * Is value undefined?
 * @param value
 * @returns
 */
export const isUnd = (value: unknown): value is undefined =>
	value === undefined;

/**
 * Is value null?
 * @param value
 * @returns
 */
export const isPresent = <T>(value: T | null | undefined): value is T =>
	value !== null && value !== undefined;

/**
 * Is value iterable?
 * @param value
 * @returns
 */
export const isIterable = (v: unknown): v is Iterable<unknown> =>
	isObj(v) && isDef((v as any)[Symbol.iterator]);

/**
 * Clone
 * @param obj
 * @returns
 */
export const Clone = (obj: unknown): unknown => JSON.parse(JSON.stringify(obj));

/**
 * Is value a Float32Array?
 * @param value
 * @returns
 */
export const isF32A = (value: unknown): value is Float32Array =>
	value instanceof Float32Array;

/**
 * Is value a Uint16Array?
 * @param value
 * @returns
 */
export const isU16A = (value: unknown): value is Uint16Array =>
	value instanceof Uint16Array;

/**
 * Is value a Uint8Array?
 * @param value
 * @returns
 */
export const isU8A = (value: unknown): value is Uint8Array =>
	value instanceof Uint8Array;

/**
 * Is power of two
 * @param n
 * @returns
 */
export function isPOT(n: number) {
	return (n & (n - 1)) === 0 && n !== 0;
}

/**
 * Is HTMLElement?
 * @param value
 * @returns
 */
export const isHTML = (value: unknown): value is HTMLElement =>
	value instanceof HTMLElement;

/**
 * Is EaseFn?
 * @param value
 * @returns
 */
export const isEaseFn = (value: unknown): value is EaseFn => isFn(value);

/**
 * Is NaN
 * @param value
 * @returns
 */
export const isNaN = (value: unknown): value is number =>
	isNum(value) && Number.isNaN(value);
