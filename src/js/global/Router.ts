export function Router(newUrl: string) {
	const APP = __ as AppRoot;

	const newPage = APP.rts[newUrl] ?? "404";
	const oldRoute = APP.rt.cur;
	const prevRoute = APP.rt.prv;

	APP.rt.prv = oldRoute;
	APP.rt.cur = { url: newUrl, pg: newPage };

	APP.is[oldRoute.pg] = false;
	APP.is[newPage] = true;

	if (prevRoute.pg) APP.was[prevRoute.pg as string] = false;

	APP.was[oldRoute.pg] = true;
}
