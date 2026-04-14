import { isFn, isObj } from "@/utils/guards";

type AnyFn = (...a: any[]) => any;
type Mode = "lazy" | "eager";

export type BMOptions = {
	m?: Mode;
	e?: (string | symbol)[];
	i?: (string | symbol)[];
};

/**
 * Method decorator to bind a method to its class instance
 * @param opts BM options - mode
 * @returns
 */
export function BM(): any;
export function BM(opts: BMOptions): any;
export function BM(arg?: BMOptions) {
	const opts: Required<BMOptions> = {
		m: arg?.m ?? "lazy",
		e: arg?.e ?? [],
		i: arg?.i ?? [],
	};

	function asNew(method: AnyFn, ctx: ClassMethodDecoratorContext) {
		if (ctx.kind !== "method") return method;

		if (isEager(opts)) {
			ctx.addInitializer(function () {
				const key = ctx.name as string | symbol;
				bindAndInstall(this as object, key, method);
			});
			return method;
		}

		// lazy
		ctx.addInitializer(function () {
			const key = ctx.name as string | symbol;
			Object.defineProperty(this, key, makeLazyGetter(key, method));
		});
		return method;
	}

	// ---- Legacy decorators (TS)
	function asLegacy(
		_target: any,
		prop: string | symbol,
		desc?: PropertyDescriptor
	) {
		if (!isMethodDescriptor(desc)) return desc;
		return makeLazyGetter(prop, desc.value);
	}

	return function (...args: any[]) {
		if (args.length === 2 && isObj(args[1]) && "kind" in args[1]) {
			return asNew(args[0], args[1] as unknown as ClassMethodDecoratorContext);
		}

		return asLegacy(args[0], args[1], args[2]);
	};
}

/**
 * Bind all methods in a class to the instance.
 * Priority: if exclude (e) provided & non-empty → use exclude.
 * Otherwise if include (i) provided & non-empty → use include.
 * Otherwise bind all methods.
 */
export function BMAll(opts: BMOptions = {}) {
	const m = opts.m ?? "lazy";
	const hasExclude = Array.isArray(opts.e) && opts.e.length > 0;
	const hasInclude = !hasExclude && Array.isArray(opts.i) && opts.i.length > 0;

	const exclude = new Set(opts.e ?? []);
	const include = new Set(opts.i ?? []);

	return function <T extends new (...a: any[]) => any>(Cls: T) {
		const proto = Cls.prototype;

		const all = getOwnMethodNames(proto); // already removes "constructor" below
		const names = all
			.filter((n) => n !== "constructor")
			.filter((n) => (hasExclude ? !exclude.has(n) : true))
			.filter((n) => (hasInclude ? include.has(n) : true));

		for (const name of names) {
			const d = Object.getOwnPropertyDescriptor(proto, name);
			if (!isMethodDescriptor(d)) continue;
			const decorated = BM({ m })(proto, name as any, d);
			if (decorated) Object.defineProperty(proto, name, decorated);
		}

		return Cls;
	};
}

// ------------------------------------------------------------------------------------
// Utilities for binding methods to class instance
// ------------------------------------------------------------------------------------
export const isEager = (opts: BMOptions) => opts.m === "eager";

export function bindAndInstall(
	obj: object,
	key: string | symbol,
	fn: AnyFn
): AnyFn {
	const bound = fn.bind(obj);
	Object.defineProperty(obj, key, {
		value: bound,
		writable: true,
		configurable: true,
	});
	return bound;
}

export function makeLazyGetter(
	key: string | symbol,
	fn: AnyFn,
	cacheKey: symbol = Symbol(`__bm_${String(key)}`)
): PropertyDescriptor {
	return {
		configurable: true,
		get(this: any) {
			if (this[cacheKey]) return this[cacheKey];
			const bound = bindAndInstall(this, key, fn);
			this[cacheKey] = bound;
			return bound;
		},
	};
}

export function isMethodDescriptor(
	d?: PropertyDescriptor
): d is PropertyDescriptor & { value: AnyFn } {
	return isFn(d?.value);
}

export function getOwnMethodNames(proto: any): (string | symbol)[] {
	const names: (string | symbol)[] = Object.getOwnPropertyNames(proto);
	const syms = Object.getOwnPropertySymbols(proto);
	return [...names, ...syms].filter((n) => n !== "constructor");
}
