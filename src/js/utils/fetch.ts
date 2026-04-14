/**
 * ------------------------------------------------------
 * Fetch
 * ------------------------------------------------------
 */

import { isObj } from "@/utils/guards";

type FetchBaseOptions<T = unknown> = {
	url: string;
	body?: BodyInit | Record<string, unknown> | null;
	signal?: AbortSignal;
	method?: "GET" | "POST";
	headers?: HeadersInit;
	error?: (err?: unknown) => void;
	success?: (data: T) => void;
};

type FetchOptionsHtml = FetchBaseOptions<string> & { type: "html" };
type FetchOptionsJson<T = unknown> = FetchBaseOptions<T> & {
	type?: "json" | "data";
};

export function Fetch(opts: FetchOptionsHtml): void;
export function Fetch<T = unknown>(opts: FetchOptionsJson<T>): void;

export function Fetch<T = unknown>(
	opts: FetchOptionsHtml | FetchOptionsJson<T>
): void {
	const isHtml = opts.type === "html";
	const method: "GET" | "POST" =
		opts.method || (opts.body == null ? "GET" : "POST");

	const headers = new Headers(opts.headers);
	const body = normalizeBody(opts.body, method, headers);

	const init: RequestInit = {
		method,
		mode: "same-origin",
		headers,
		body,
		signal: opts.signal,
	};

	fetch(opts.url, init)
		.then(async (res) => {
			if (!res.ok) {
				opts.error?.(`HTTP ${res.status} ${res.statusText}`);
				return;
			}

			if (isHtml) {
				const text = await res.text();
				(opts.success as ((d: string) => void) | undefined)?.(text);
			} else {
				const json = (await res.json()) as T;
				(opts.success as ((d: T) => void) | undefined)?.(json);
			}
		})
		.catch((err) => {
			opts.error?.(err);
		});
}

function normalizeBody(
	body: FetchBaseOptions["body"],
	method: "GET" | "POST",
	headers: Headers
): BodyInit | undefined {
	if (body == null || method === "GET") return undefined;

	const b = body as any;
	const isPlainObject =
		isObj(b) &&
		!(b instanceof FormData) &&
		!(b instanceof Blob) &&
		!(b instanceof URLSearchParams) &&
		!(b instanceof ReadableStream);

	if (isPlainObject) {
		if (!headers.has("Content-Type"))
			headers.set("Content-Type", "application/json");
		return JSON.stringify(b);
	}
	return body as BodyInit;
}
