import { Rz } from "@/global/Resize";
import { BM } from "@/utils/bind-method";

type Win = {
	w: number;
	h: number;

	readonly mid: { w: number; h: number };
	readonly rat: { wh: number; hw: number };
	readonly vw: number;
	readonly vh: number;
	readonly ori: "l" | "p";
	readonly tr: { y: number };

	upd: (w: number, h: number, dpr?: number) => void;
};

export class Window {
	declare __: typeof __;

	constructor() {
		const APP = __ as AppRoot;

		if (!APP.win) {
			const _mid = { w: 0, h: 0 };

			APP.win = {
				w: 0,
				h: 0,

				get mid() {
					_mid.w = this.w * 0.5;
					_mid.h = this.h * 0.5;

					return _mid;
				},

				get rat() {
					return {
						wh: this.w / this.h,
						hw: this.h / this.w,
					};
				},
				get vw() {
					return this.w / 100;
				},
				get vh() {
					return this.h / 100;
				},
				get ori() {
					return this.w >= this.h ? "l" : "p";
				},
				get tr() {
					return { y: -250 * (this.h / 982) };
				},

				upd(w: number, h: number) {
					this.w = w;
					this.h = h;
				},
			} as Win;
		}

		new Rz(this.rz).on();

		this.rz();
	}

	@BM()
	private rz() {
		const APP = __ as AppRoot;
		APP.win.upd(innerWidth, innerHeight);
	}
}
