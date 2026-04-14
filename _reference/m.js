(((R = {
	isStory: (t) => "/story" === t || "/story-extended" === t,
	iLerp: (t, s, i) => R.Clamp((i - t) / (s - t), 0, 1),
	Lerp: (t, s, i) => t * (1 - i) + s * i,
	Damp: (t, s, i) => R.Lerp(t, s, 1 - Math.exp(Math.log(1 - i) * RD)),
	Remap: (t, s, i, e, r) => R.Lerp(i, e, R.iLerp(t, s, r)),
	M: class {
		constructor(t) {
			(R.BM(this, ["gRaf", "run", "uSvg", "uLine", "uProp"]),
				(this.v = this.vInit(t)),
				(this.r = new R.Raf(this.run)));
		}
		vInit(s) {
			const r = {
				el: R.Sel.el(s.el),
				e: {
					curve: s.e || "linear",
				},
				d: {
					origin: s.d || 0,
					cur: 0,
				},
				de: s.de || 0,
				cb: s.cb || !1,
				r: s.r || 2,
				pr: 0,
				prE: 0,
				elapsed: 0,
			};
			((r.elL = r.el.length),
				R.Has(s, "u")
					? (r.u = (t) => {
							s.u(r);
						})
					: R.Has(s, "svg")
						? (r.u = this.uSvg)
						: R.Has(s, "line")
							? (r.u = this.uLine)
							: (r.u = this.uProp));
			var i = s.p || !1,
				t = s.svg || !1,
				h = s.line || !1;
			let e = !1;
			if (i) {
				((r.prop = {}), (r.propI = []));
				var n = Object.keys(i);
				r.propL = n.length;
				let t = r.propL;
				for (; t--; ) {
					var a = n[t],
						a =
							((r.prop[t] = {
								name: a,
								origin: {
									start: i[a][0],
									end: i[a][1],
								},
								cur: i[a][0],
								start: i[a][0],
								end: i[a][1],
								unit: i[a][2] || "%",
							}),
							a.charAt(0)),
						o = "r" === a && e ? "r2" : a;
					((e = "r" === a), (r.propI[o] = t));
				}
			} else if (t)
				((r.svg = {
					type: t.type,
					attr: "polygon" === t.type ? "points" : "d",
					end: t.end,
					originArr: {},
					arr: {},
					val: [],
				}),
					(r.svg.start = t.start || R.Ga(r.el[0], r.svg.attr)),
					(r.svg.cur = r.svg.start),
					(r.svg.originArr.start = R.Svg.split(r.svg.start)),
					(r.svg.originArr.end = R.Svg.split(r.svg.end)),
					(r.svg.arr.start = r.svg.originArr.start),
					(r.svg.arr.end = r.svg.originArr.end),
					(r.svg.arrL = r.svg.arr.start.length));
			else if (h) {
				r.line = {
					dashed: h.dashed,
					factor: {
						start: R.Def(h.start) ? (100 - h.start) / 100 : 1,
						end: R.Def(h.end) ? (100 - h.end) / 100 : 0,
					},
					shapeL: [],
					origin: {
						start: [],
						end: [],
					},
					cur: [],
					start: [],
					end: [],
				};
				for (let e = 0; e < r.elL; e++) {
					var l = h.elWL || r.el[e];
					r.line.shapeL[e] = R.Svg.shapeL(l);
					let t;
					if (r.line.dashed) {
						var d = r.line.dashed;
						let s = 0;
						var p = d.split(/[\s,]/),
							c = p.length;
						for (let t = 0; t < c; t++) s += parseFloat(p[t]) || 0;
						let i = "";
						var u = Math.ceil(r.line.shapeL[e] / s);
						for (let t = 0; t < u; t++) i += d + " ";
						t = i + "0 " + r.line.shapeL[e];
					} else t = r.line.shapeL[e];
					((r.el[e].style.strokeDasharray = t),
						(r.line.origin.start[e] = r.line.factor.start * r.line.shapeL[e]),
						(r.line.origin.end[e] = r.line.factor.end * r.line.shapeL[e]),
						(r.line.cur[e] = r.line.origin.start[e]),
						(r.line.start[e] = r.line.origin.start[e]),
						(r.line.end[e] = r.line.origin.end[e]));
				}
			}
			return r;
		}
		play(t) {
			(this.pause(), this.vU(t), this.de.run());
		}
		pause() {
			(this.r.stop(), R.Stop(this.de));
		}
		vU(t) {
			var s = t || {},
				i = R.Has(s, "reverse") ? "start" : "end";
			if (R.Has(this.v, "prop")) {
				let t = this.v.propL;
				for (; t--; )
					((this.v.prop[t].end = this.v.prop[t].origin[i]),
						(this.v.prop[t].start = this.v.prop[t].cur),
						R.Has(s, "p") &&
							R.Has(s.p, this.v.prop[t].name) &&
							(R.Has(s.p[this.v.prop[t].name], "newEnd") &&
								(this.v.prop[t].end = s.p[this.v.prop[t].name].newEnd),
							R.Has(s.p[this.v.prop[t].name], "newStart")) &&
							(this.v.prop[t].start = s.p[this.v.prop[t].name].newStart));
			} else if (R.Has(this.v, "svg"))
				(R.Has(s, "svg") && R.Has(s.svg, "start")
					? (this.v.svg.arr.start = s.svg.start)
					: (this.v.svg.arr.start = R.Svg.split(this.v.svg.cur)),
					R.Has(s, "svg") && R.Has(s.svg, "end")
						? (this.v.svg.arr.end = s.svg.end)
						: (this.v.svg.arr.end = this.v.svg.originArr[i]));
			else if (R.Has(this.v, "line")) {
				for (let t = 0; t < this.v.elL; t++)
					this.v.line.start[t] = this.v.line.cur[t];
				if (R.Has(s, "line") && R.Has(s.line, "end")) {
					this.v.line.factor.end = (100 - s.line.end) / 100;
					for (let t = 0; t < this.v.elL; t++)
						this.v.line.end[t] = this.v.line.factor.end * this.v.line.shapeL[t];
				} else
					for (let t = 0; t < this.v.elL; t++)
						this.v.line.end[t] = this.v.line.origin[i][t];
			}
			((this.v.d.cur = R.Has(s, "d")
				? s.d
				: R.R(this.v.d.origin - this.v.d.cur + this.v.elapsed)),
				(this.v.e.curve = s.e || this.v.e.curve),
				(this.v.e.calc = R.Is.str(this.v.e.curve)
					? R.Ease[this.v.e.curve]
					: R.Ease4(this.v.e.curve)),
				(this.v.de = (R.Has(s, "de") ? s : this.v).de),
				(this.v.cb = (R.Has(s, "cb") ? s : this.v).cb),
				(this.v.pr = this.v.prE = 0 === this.v.d.cur ? 1 : 0),
				(this.de = new R.De(this.gRaf, this.v.de)));
		}
		gRaf() {
			this.r.run();
		}
		run(t) {
			1 === this.v.pr
				? (this.pause(), this.v.u(), this.v.cb && this.v.cb())
				: ((this.v.elapsed = R.Clamp(t, 0, this.v.d.cur)),
					(this.v.pr = R.Clamp(this.v.elapsed / this.v.d.cur, 0, 1)),
					(this.v.prE = this.v.e.calc(this.v.pr)),
					this.v.u());
		}
		uProp() {
			var t = this.v.prop,
				s = this.v.propI;
			let i = this.v.propL;
			for (; i--; ) t[i].cur = this.lerp(t[i].start, t[i].end);
			var e = R.Has(s, "x") ? t[s.x].cur + t[s.x].unit : 0,
				r = R.Has(s, "y") ? t[s.y].cur + t[s.y].unit : 0,
				e = e + r === 0 ? 0 : "translate3d(" + e + "," + r + ",0)",
				r = R.Has(s, "r") ? t[s.r].name + "(" + t[s.r].cur + "deg)" : 0,
				h = R.Has(s, "r2") ? t[s.r2].name + "(" + t[s.r2].cur + "deg)" : 0,
				n = R.Has(s, "s") ? t[s.s].name + "(" + t[s.s].cur + ")" : 0,
				a =
					e + r + h + n === 0
						? 0
						: [e, r, h, n].filter((t) => 0 !== t).join(" "),
				o = R.Has(s, "o") ? t[s.o].cur : -1;
			let l = this.v.elL;
			for (; l-- && !R.Und(this.v.el[l]); )
				(0 !== a && (this.v.el[l].style.transform = a),
					0 <= o && (this.v.el[l].style.opacity = o));
		}
		uSvg() {
			var s = this.v.svg;
			s.curTemp = "";
			for (let t = 0; t < s.arrL; t++)
				((s.val[t] = isNaN(s.arr.start[t])
					? s.arr.start[t]
					: this.lerp(s.arr.start[t], s.arr.end[t])),
					(s.curTemp += s.val[t] + " "),
					(s.cur = s.curTemp.trim()));
			for (let t = 0; t < this.v.elL && !R.Und(this.v.el[t]); t++)
				this.v.el[t].setAttribute(s.attr, s.cur);
		}
		uLine() {
			var s = this.v.line;
			for (let t = 0; t < this.v.elL; t++) {
				var i = this.v.el[t].style;
				((s.cur[t] = this.lerp(s.start[t], s.end[t])),
					(i.strokeDashoffset = s.cur[t]),
					0 === this.v.pr && (i.opacity = 1));
			}
		}
		lerp(t, s) {
			return R.R(R.Lerp(t, s, this.v.prE), this.v.r);
		}
	},
	TL: class {
		constructor() {
			((this._ = []), (this.d = 0));
		}
		from(t) {
			((this.d += R.Has(t, "de") ? t.de : 0),
				(t.de = this.d),
				this._.push(new R.M(t)));
		}
		play(t) {
			this.run("play", t);
		}
		pause() {
			this.run("pause");
		}
		run(t, s) {
			let i = 0;
			for (var e = this._.length, r = s || void 0; i < e; )
				(this._[i][t](r), i++);
		}
	},
	BM: (t, s) => {
		let i = s.length;
		for (; i--; ) t[s[i]] = t[s[i]].bind(t);
	},
	Clamp: (t, s, i) => (t < s ? s : i < t ? i : t),
	Clone: (t) => JSON.parse(JSON.stringify(t)),
	De: class {
		constructor(t, s) {
			((this.cb = t),
				(this.d = s),
				R.BM(this, ["loop"]),
				(this.r = new R.Raf(this.loop)));
		}
		run() {
			0 === this.d ? this.cb() : this.r.run();
		}
		stop() {
			this.r.stop();
		}
		loop(t) {
			t = R.Clamp(t, 0, this.d);
			1 === R.Clamp(t / this.d, 0, 1) && (this.stop(), this.cb());
		}
	},
	Def: (t) => void 0 !== t,
	Dist: (t, s) => Math.sqrt(t * t + s * s),
	Ease: {
		linear: (t) => t,
		i1: (t) => 1 - Math.cos(t * (0.5 * Math.PI)),
		o1: (t) => Math.sin(t * (0.5 * Math.PI)),
		io1: (t) => -0.5 * (Math.cos(Math.PI * t) - 1),
		i2: (t) => t * t,
		o2: (t) => t * (2 - t),
		io2: (t) => (t < 0.5 ? 2 * t * t : (4 - 2 * t) * t - 1),
		i3: (t) => t * t * t,
		o3: (t) => --t * t * t + 1,
		io3: (t) =>
			t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
		i4: (t) => t * t * t * t,
		o4: (t) => 1 - --t * t * t * t,
		io4: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
		i5: (t) => t * t * t * t * t,
		o5: (t) => 1 + --t * t * t * t * t,
		io5: (t) =>
			t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
		i6: (t) => (0 === t ? 0 : 2 ** (10 * (t - 1))),
		o6: (t) => (1 === t ? 1 : 1 - 2 ** (-10 * t)),
		io6: (t) =>
			0 === t || 1 === t
				? t
				: (t /= 0.5) < 1
					? 0.5 * 2 ** (10 * (t - 1))
					: 0.5 * (2 - 2 ** (-10 * --t)),
	},
	r0: (t, s) => 1 - 3 * s + 3 * t,
	r1: (t, s) => 3 * s - 6 * t,
	r2: (t, s, i) => ((R.r0(s, i) * t + R.r1(s, i)) * t + 3 * s) * t,
	r3: (t, s, i) => 3 * R.r0(s, i) * t * t + 2 * R.r1(s, i) * t + 3 * s,
	r4: (t, s, i, e, r) => {
		let h,
			n,
			a = 0;
		for (
			;
			(n = s + 0.5 * (i - s)),
				0 < (h = R.r2(n, e, r) - t) ? (i = n) : (s = n),
				1e-7 < Math.abs(h) && ++a < 10;
		);
		return n;
	},
	r5: (s, i, e, r) => {
		for (let t = 0; t < 4; ++t) {
			var h = R.r3(i, e, r);
			if (0 === h) return i;
			i -= (R.r2(i, e, r) - s) / h;
		}
		return i;
	},
}).Ease4 = (t) => {
	const h = t[0],
		s = t[1],
		n = t[2],
		i = t[3];
	let a = new Float32Array(11);
	if (h !== s || n !== i)
		for (let t = 0; t < 11; ++t) a[t] = R.r2(0.1 * t, h, n);
	return (t) =>
		(h === s && n === i) || 0 === t || 1 === t
			? t
			: R.r2(
					(function (t) {
						let s = 0;
						for (var i = 1; 10 !== i && a[i] <= t; ++i) s += 0.1;
						--i;
						var e = (t - a[i]) / (a[i + 1] - a[i]),
							e = s + 0.1 * e,
							r = R.r3(e, h, n);
						return 0.001 <= r
							? R.r5(t, e, h, n)
							: 0 === r
								? e
								: R.r4(t, r, r + 0.1, h, n);
					})(t),
					s,
					i,
				);
}),
	(R.Fetch = (s) => {
		var t = "json" === s.type;
		const i = t ? "json" : "text";
		var e = {
			method: t ? "POST" : "GET",
			headers: new Headers({
				"Content-type": t ? "application/x-www-form-urlencoded" : "text/html",
			}),
			mode: "same-origin",
		};
		(t && (e.body = s.body),
			fetch(s.url, e)
				.then((t) => {
					if (t.ok) return t[i]();
					s.error && s.error();
				})
				.then((t) => {
					s.success(t);
				}));
	}),
	(R.Has = (t, s) => t.hasOwnProperty(s)),
	(R.Is = {
		str: (t) => "string" == typeof t,
		obj: (t) => t === Object(t),
		arr: (t) => t.constructor === Array,
	}),
	(R.Mod = (t, s) => ((t % s) + s) % s),
	(R.Pad = (t, s) => ("000" + t).slice(-s)),
	(R.Pause = (t) => {
		R.Def(t) && t.pause();
	}),
	(R.PCurve = (t, s, i) => {
		return ((s + i) ** (s + i) / (s ** s * i ** i)) * t ** s * (1 - t) ** i;
	}),
	(R.R = (t, s) => {
		s = R.Und(s) ? 100 : 10 ** s;
		return Math.round(t * s) / s;
	}),
	(R.Sel = {
		el: (t) => {
			let s = [];
			var i;
			return (
				R.Is.str(t)
					? ((i = t.substring(1)),
						"#" === t.charAt(0) ? (s[0] = R.G.id(i)) : (s = R.G.class(i)))
					: (s[0] = t),
				s
			);
		},
		type: (t) => ("#" === t.charAt(0) ? "id" : "class"),
		name: (t) => t.substring(1),
	}),
	(R.L = (t, s, i, e) => {
		var r = R.Sel.el(t),
			h = r.length;
		let n = !1;
		var t = i.substring(0, 3),
			a =
				(("whe" !== t && "mou" !== t && "tou" !== t && "poi" !== t) ||
					(n = {
						passive: !1,
					}),
				"a" === s ? "add" : "remove");
		for (let t = 0; t < h; t++) r[t][a + "EventListener"](i, e, n);
	}));
const Tab = class {
	constructor() {
		((this._ = []),
			(this.pause = 0),
			R.BM(this, ["v"]),
			R.L(document, "a", "visibilitychange", this.v));
	}
	add(t) {
		this._.push(t);
	}
	v() {
		var t = performance.now();
		let s,
			i,
			e =
				((i = document.hidden
					? ((this.pause = t), "stop")
					: ((s = t - this.pause), "start")),
				this._.length);
		for (; e--; ) this._[e][i](s);
	}
};
R.Tab = new Tab();
let RD = 0;
const FR = 1e3 / 60,
	Raf =
		((R.Raf_ = class {
			constructor() {
				((this._ = []),
					(this.l = 0),
					(this.on = !0),
					R.BM(this, ["loop", "tOff", "tOn"]),
					R.Tab.add({
						stop: this.tOff,
						start: this.tOn,
					}),
					this.raf());
			}
			tOff() {
				this.on = !1;
			}
			tOn(t) {
				this.t = null;
				let s = this.l;
				for (; s--; ) this._[s].sT += t;
				this.on = !0;
			}
			a(t) {
				(this._.push(t), this.l++);
			}
			r(t) {
				let s = this.l;
				for (; s--; )
					if (this._[s].id === t) return (this._.splice(s, 1), void this.l--);
			}
			loop(s) {
				if (this.on) {
					(this.t || (this.t = s), (RD = (s - this.t) / FR), (this.t = s));
					let t = this.l;
					for (; t--; ) {
						var i,
							e = this._[t];
						R.Def(e) && (e.sT || (e.sT = s), (i = s - e.sT), e.cb(i));
					}
				}
				this.raf();
			}
			raf() {
				requestAnimationFrame(this.loop);
			}
		}),
		new R.Raf_());
let RafId = 0;
((R.Raf = class {
	constructor(t) {
		((this.cb = t), (this.on = !1), (this.id = RafId), RafId++);
	}
	run() {
		this.on ||
			(Raf.a({
				id: this.id,
				cb: this.cb,
			}),
			(this.on = !0));
	}
	stop() {
		this.on && (Raf.r(this.id), (this.on = !1));
	}
}),
	(R.Rand = {
		range: (t, s, i) => R.R(Math.random() * (s - t) + t, i),
		uniq: (s) => {
			var i = [];
			for (let t = 0; t < s; t++) i[t] = t;
			let t = s;
			for (var e, r; t--; )
				((e = ~~(Math.random() * (t + 1))),
					(r = i[t]),
					(i[t] = i[e]),
					(i[e] = r));
			return i;
		},
	}),
	(R.Re = (t) => t.getBoundingClientRect()),
	(R.Snif = {
		uA: navigator.userAgent.toLowerCase(),
		get iPadIOS13() {
			return "MacIntel" === navigator.platform && 1 < navigator.maxTouchPoints;
		},
		get isMobile() {
			return /mobi|android|tablet|ipad|iphone/.test(this.uA) || this.iPadIOS13;
		},
		get isFirefox() {
			return -1 < this.uA.indexOf("firefox");
		},
	}),
	(R.Stop = (t) => {
		R.Def(t) && t.stop();
	}),
	(R.Svg = {
		shapeL: (e) => {
			var t, s, i, r;
			if ("circle" === e.tagName) return 2 * R.Ga(e, "r") * Math.PI;
			if ("line" === e.tagName)
				return (
					(t = R.Ga(e, "x1")),
					(s = R.Ga(e, "x2")),
					(i = R.Ga(e, "y1")),
					(r = R.Ga(e, "y2")),
					Math.sqrt((s -= t) * s + (r -= i) * r)
				);
			if ("polyline" !== e.tagName) return e.getTotalLength();
			{
				let s = 0,
					i = 0;
				var h = e.points.numberOfItems;
				for (let t = 0; t < h; t++) {
					var n = e.points.getItem(t);
					(0 < t && (s += R.Dist(n.x - i.x, n.y - i.y)), (i = n));
				}
				return s;
			}
		},
		split: (t) => {
			var s = [],
				i = t.split(" "),
				e = i.length;
			for (let t = 0; t < e; t++) {
				var r = i[t].split(","),
					h = r.length;
				for (let t = 0; t < h; t++) {
					var n = r[t],
						n = isNaN(n) ? n : +n;
					s.push(n);
				}
			}
			return s;
		},
	}),
	(R.Timer = class {
		constructor(t) {
			this._ = new R.De(t.cb, t.de);
		}
		run() {
			(this._.stop(), this._.run());
		}
	}),
	(R.Und = (t) => void 0 === t),
	(R.Une = (t, s, i) => 0 !== R.R(Math.abs(t - s), i)),
	(R.Cr = (t) => document.createElement(t)),
	(R.g = (t, s, i) => {
		return (t || document)["getElement" + s](i);
	}),
	(R.G = {
		id: (t, s) => R.g(s, "ById", t),
		class: (t, s) => R.g(s, "sByClassName", t),
		tag: (t, s) => R.g(s, "sByTagName", t),
	}),
	(R.Ga = (t, s) => t.getAttribute(s)),
	(R.index = (s, i) => {
		var e = i.length;
		for (let t = 0; t < e; t++) if (s === i[t]) return t;
		return -1;
	}),
	(R.Index = {
		list: (t) => R.index(t, t.parentNode.children),
		class: (t, s, i) => R.index(t, R.G.class(s, i)),
	}),
	(R.PD = (t) => {
		t.cancelable && t.preventDefault();
	}),
	(R.RO_ = class {
		constructor() {
			((this.eT = R.Snif.isMobile ? "orientationchange" : "resize"),
				(this.t = !1),
				(this._ = []),
				(this.l = 0),
				R.BM(this, ["fn", "gRaf", "run"]),
				(this.d = new R.Timer({
					de: 40,
					cb: this.gRaf,
				})),
				(this.f = new R.Raf(this.run)),
				R.L(window, "a", this.eT, this.fn));
		}
		a(t) {
			(this._.push(t), this.l++);
		}
		r(t) {
			let s = this.l;
			for (; s--; )
				if (this._[s].id === t) return (this._.splice(s, 1), void this.l--);
		}
		fn(t) {
			((this.e = t), this.d.run());
		}
		gRaf() {
			0 < this.l && !this.t && ((this.t = !0), this.f.run());
		}
		run() {
			let t = 0;
			for (var s = this._.length; t < s; ) (this._[t].cb(this.e), t++);
			(this.f.stop(), (this.t = !1));
		}
	}));
const RO = new R.RO_();
let RoId = 0;
function Router(t) {
	var s = _A,
		i = s.config.routes[t],
		e = s.route.new,
		r = s.route.old;
	((s.route.old = e),
		(s.route.new = {
			url: t,
			page: i,
		}),
		(s.is[e.page] = !1),
		(s.is[i] = !0),
		r.page && (s.was[r.page] = !1),
		(s.was[e.page] = !0));
}
((R.RO = class {
	constructor(t) {
		((this.cb = t), (this.id = RoId), RoId++);
	}
	on() {
		RO.a({
			id: this.id,
			cb: this.cb,
		});
	}
	off() {
		RO.r(this.id);
	}
}),
	(R.O = (t, s) => {
		t.style.opacity = s;
	}),
	(R.pe = (t, s) => {
		t.style.pointerEvents = s;
	}),
	(R.PE = {
		all: (t) => {
			R.pe(t, "all");
		},
		none: (t) => {
			R.pe(t, "none");
		},
	}),
	(R.T = (t, s, i, e) => {
		e = R.Und(e) ? "%" : e;
		t.style.transform = "translate3d(" + s + e + "," + i + e + ",0)";
	}));
class Win {
	constructor(t) {
		((_A.win = {
			w: 0,
			h: 0,
		}),
			(this.d = t),
			R.BM(this, ["resize"]),
			new R.RO(this.resize).on(),
			this.resize());
	}
	resize() {
		var t = _A,
			s = innerWidth,
			i = innerHeight,
			e =
				((t.win = {
					w: s,
					h: i,
				}),
				(t.winSemi = {
					w: 0.5 * s,
					h: 0.5 * i,
				}),
				(t.winRatio = {
					wh: s / i,
					hw: i / s,
				}),
				(t.isLandscape = 1 < t.winRatio.wh),
				(t.format = t.isLandscape ? "landscape" : "portrait"),
				t.config.psd[this.d]);
		((t.psd = {
			h: e.h,
			w: e.w,
		}),
			(t.winWpsdW = s / t.psd.w),
			(t.winHpsdH = i / t.psd.h),
			(t.tr = {
				y: -250 * t.winHpsdH,
			}));
	}
}
class Rotate {
	constructor() {
		((this.inDom = !1),
			R.BM(this, ["resize"]),
			new R.RO(this.resize).on(),
			this.resize());
	}
	resize() {
		var t = _A,
			t = 1 < t.winRatio.wh && t.win.h < 450 && t.win.w < 850;
		t && !this.inDom ? this.a() : !t && this.inDom && this.r();
	}
	a() {
		((this.iW = R.Cr("div")), (this.iW.className = "i_"));
		var t = R.Cr("div");
		((t.className = "i"),
			(t.textContent = "Please rotate your device"),
			this.iW.appendChild(t),
			document.body.prepend(this.iW),
			(this.inDom = !0));
	}
	r() {
		(this.iW.parentNode.removeChild(this.iW), (this.inDom = !1));
	}
}
class Ctrl {
	constructor(t) {
		var s = _A;
		s.is[404] ||
			((s.mutating = !0),
			(s.page = {}),
			(this.transitionM = t.transition.mutation),
			(this.d = t.device),
			R.BM(this, ["eD"]),
			new Win(this.d),
			"m" === this.d && new Rotate(),
			(s.e = new t.engine()),
			this.onPopstate(),
			R.L(document.body, "a", "click", this.eD),
			new t.transition.intro((t) => {
				this.intro(t);
			}));
	}
	onPopstate() {
		const s = document,
			i = "complete";
		let e = s.readyState !== i;
		((onload = (t) => {
			setTimeout((t) => {
				e = !1;
			}, 0);
		}),
			(onpopstate = (t) => {
				e && s.readyState === i && (R.PD(t), t.stopImmediatePropagation());
				t = _A;
				R.Und(t.config.routes) ||
					(t.mutating || "/video/" === location.pathname.substring(0, 7)
						? this.hPS()
						: ((t.mutating = !0), this.out(location.pathname, "back")));
			}));
	}
	eD(t) {
		var s,
			i,
			e = _A;
		let r = t.target,
			h = !1,
			n = !1;
		for (; r; ) {
			var a = r.tagName;
			if ("A" === a) {
				h = !0;
				break;
			}
			if (("INPUT" === a || "BUTTON" === a) && "submit" === r.type) {
				n = !0;
				break;
			}
			r = r.parentNode;
		}
		h
			? ((i = (s = r.href).substring(0, 3)),
				r.hasAttribute("target") ||
					"mai" === i ||
					"tel" === i ||
					(R.PD(t), e.mutating) ||
					((i = s.replace(/^.*\/\/[^/]+/, "")) !== e.route.new.url
						? ((e.mutating = !0), this.out(i, r))
						: "nav-logo" === r.id && (location.href = "/")))
			: n && R.PD(t);
	}
	intro(s) {
		const i = _A;
		R.Fetch({
			url: i.route.new.url + "?device=" + this.d,
			type: "html",
			success: (t) => {
				t = JSON.parse(t);
				((i.config.routes = t.routes),
					(i.data = t.data),
					(this.cache = t.cache),
					this.add(document.body, "afterbegin", t.body),
					(this._ = R.G.id("_")),
					(this.transitionM = new this.transitionM()),
					s());
			},
		});
	}
	out(t, s) {
		Router(t);
		t = _A;
		((t.target = s),
			(t.page.update = (t) => {
				this.in();
			}),
			"back" !== s &&
				("m" === this.d
					? s.classList.contains("st-g-a") &&
						(t.e.sz.slider.index = R.Index.class(s, "st-g-a"))
					: R.Def(s.parentNode) &&
						(s = s.parentNode).classList.contains("sz_i") &&
						(t.e.sz.index = R.Index.class(s, "sz_i"))),
			this.transitionM.out());
	}
	in() {
		var t = _A;
		const s = this.cache[t.route.new.url];
		((document.title = s.title),
			"back" !== t.target &&
				(t.target.classList.contains("in-r-i") && t.target.classList.add("on"),
				this.hPS()),
			(t.page.insertNew = (t) => {
				this.add(this._, "beforeend", s.html);
			}),
			(t.page.removeOld = (t) => {
				var s = this._.children[0];
				s.parentNode.removeChild(s);
			}),
			this.transitionM.in());
	}
	add(t, s, i) {
		t.insertAdjacentHTML(s, i);
	}
	hPS() {
		var t = _A.route.new.url;
		history.pushState(
			{
				page: t,
			},
			"",
			t,
		);
	}
}
class N {
	constructor(t) {
		((this.cb = t.cb), R.BM(this, ["run"]));
	}
	on() {
		this.l("a");
	}
	off() {
		this.l("r");
	}
	l(t) {
		R.L(window, t, "scroll", this.run);
	}
	run() {
		this.cb(scrollY);
	}
}
class S {
	constructor() {
		(R.BM(this, ["sY"]),
			(this.n = new N({
				cb: this.sY,
			})));
	}
	init() {
		this._ = 0;
	}
	resize() {}
	on() {
		this.n.on();
	}
	off() {
		this.n.off();
	}
	sY(t) {
		this._ = t;
	}
}
let Fx$2 = class {
	intro() {
		((this.menu = R.G.id("n-m")),
			(this.close = R.G.id("n-c")),
			(this.logo = R.G.id("n-l")));
	}
	init() {
		var t = _A,
			s = t.is,
			i = s.in || s.ab || s.re || s.p0 || s.p1 || s.st,
			e = s.in || s.sz,
			s = s.ho || s.ab || s.re || s.p0 || s.p1 || s.st,
			r = t.route.old.url;
		let h = r;
		(r
			? t.is.sz && (h = "/video/" === r.substring(0, 7) ? "/story" : r)
			: (h = t.is.in ? "/" : "/story"),
			(this.close.href = h),
			i
				? (R.PE.all(this.logo), R.O(this.logo, 1))
				: (R.PE.none(this.logo), R.O(this.logo, 0)),
			s
				? (R.PE.all(this.menu), R.O(this.menu, 1))
				: (R.PE.none(this.menu), R.O(this.menu, 0)),
			e
				? (R.PE.all(this.close), R.O(this.close, 1))
				: (R.PE.none(this.close), R.O(this.close, 0)));
	}
};
class Nav {
	constructor() {
		this.fx = new Fx$2();
	}
	intro() {
		this.fx.intro();
	}
	init() {
		this.fx.init();
	}
}
class K {
	constructor() {
		(R.BM(this, ["loop"]),
			(this.raf = new R.Raf(this.loop)),
			(this.isOff = !0));
	}
	init() {
		((this.url = _A.route.new.url),
			(this.lazyp = R.G.class("k")),
			(this.lazypL = this.lazyp.length),
			(this.lazyRange = []),
			(this.lazypOff = []));
		for (let t = 0; t < this.lazypL; t++)
			((this.lazypOff[t] = !0), (this.lazyRange[t] = {}));
		this.resizeA();
	}
	resizeA() {
		var t = _A,
			s = t.e.s._,
			i = t.win.h;
		for (let t = 0; t < this.lazypL; t++) {
			if (R.Und(this.lazyp[t])) return;
			var e = R.Re(this.lazyp[t]),
				r = e.top,
				e = e.height;
			((this.lazyRange[t].s = Math.max(r + s - i, i < r ? 1 : 0)),
				(this.lazyRange[t].e = Math.max(r + s, 0) + e));
		}
	}
	run() {
		((this.isOff = !1), this.raf.run());
	}
	loop() {
		var s = _A.e.s._;
		for (let t = 0; t < this.lazypL; t++)
			if (
				this.lazypOff[t] &&
				s >= this.lazyRange[t].s &&
				s <= this.lazyRange[t].e
			) {
				if (this.isOff || R.Und(this.lazyp[t])) return;
				this.lazypOff[t] = !1;
				const e = this.lazyp[t];
				if ("IMG" === e.tagName) {
					const r = e.dataset.src;
					var i = new Image();
					((i.crossOrigin = "anonymous"),
						(i.src = r),
						i.decode().then((t) => {
							this.isOff ||
								R.Und(e) ||
								((e.src = r),
								e.classList.contains("k-o")
									? e.classList.add("on")
									: e.parentNode.classList.contains("k-o") &&
										e.parentNode.classList.add("on"));
						}));
				} else e.classList.contains("k-o") && e.classList.add("on");
			}
	}
	off() {
		((this.isOff = !0), (this.lazypL = 0), this.raf.stop());
	}
}
class Video {
	constructor(t) {
		((this.dom = t.dom), (this.isPlaying = !1), (this.isPause = !1));
	}
	play() {
		((this.isPause = !1),
			this.isPlaying ||
				((this.dom.muted = !1),
				(this.playPromise = this.dom.play()),
				this.playPromise.then((t) => {
					((this.isPlaying = !0), this.isPause && this.pause());
				})));
	}
	pause() {
		((this.isPause = !0),
			this.isPlaying &&
				(this.dom.pause(), (this.isPlaying = !1), (this.dom.muted = !0)));
	}
}
class Vid {
	constructor() {
		R.BM(this, ["fn"]);
	}
	init() {
		var t = _A.route.old.url;
		((this.v = R.G.class("vi-v")[0]),
			(this.back = R.G.class("vi-b")[0]),
			(this.back.href = t || "/"),
			(this.videoI = new Video({
				dom: this.v,
			})),
			this.videoI.play());
	}
	play() {
		this.videoI.play();
	}
	pause() {
		this.videoI.pause();
	}
	fn() {
		this.videoI.isPlaying ? this.pause() : this.play();
	}
	l(t) {
		R.L(this.v, t, "click", this.fn);
	}
	on() {
		this.l("a");
	}
	off() {
		((this.ready = !1), this.l("r"));
	}
}
class Vi {
	constructor() {
		this.vid = new Vid();
	}
	init() {
		((this.rqd = _A.is.vi), this.rqd && this.vid.init());
	}
	on() {
		this.rqd && this.vid.on();
	}
	off() {
		this.rqd && this.vid.off();
	}
}
class Obj {
	constructor(t) {
		var s = t.index,
			i = t.de;
		((this.p_ = t.p),
			(this.p_L = this.p_.length),
			(this.p = []),
			(this.pr = {
				show: {
					start: s * i,
					end: 1 - (t.length - 1 - s) * i,
				},
				hide: {
					start: 0,
					end: 1,
				},
			}),
			(this.cur = []));
		for (let t = 0; t < this.p_L; t++) {
			var e = this.p_[t];
			((this.cur[t] = e[1]),
				(this.p[t] = {
					round: "y" === e[0] || "x" === e[0] ? 3 : 6,
				}));
		}
	}
	prepare(s) {
		this.isShow = s.isShow;
		var i = s.running;
		for (let t = 0; t < this.p_L; t++) {
			var e = this.p_[t],
				r = e[1],
				h = e[2];
			"opacity" === e[0]
				? this.isShow
					? ((this.p[t].start = i ? this.cur[t] : r), (this.p[t].end = h))
					: ((this.p[t].start = this.cur[t]), (this.p[t].end = r))
				: this.isShow
					? ((this.p[t].start = i ? this.cur[t] : r), (this.p[t].end = 0))
					: ((this.p[t].start = this.cur[t]),
						(this.p[t].end = s.pEndIsEnd ? h : r));
		}
		var t = this.isShow && !i ? this.pr.show : this.pr.hide;
		((this.pr.start = t.start), (this.pr.end = t.end));
	}
	loop(t) {
		var s = t.el,
			i = t.elL,
			e = [0, 0];
		let r;
		var h = R.Remap(this.pr.start, this.pr.end, 0, 1, t.pr),
			n = t.rEase(h);
		let a = "",
			o = "";
		for (let t = 0; t < this.p_L; t++) {
			var l = this.p_[t][0],
				d = this.p[t];
			((this.cur[t] = R.R(R.Lerp(d.start, d.end, n), d.round)),
				"y" === l
					? ((e[1] = this.cur[t]), (r = this.u(t)))
					: "x" === l
						? ((e[0] = this.cur[t]), (r = this.u(t)))
						: "rotateX" === l
							? (a = " rotateX(" + this.cur[t] + "deg)")
							: "opacity" === l && (o = this.cur[t]));
		}
		var p = "translate3d(" + e[0] + r + "," + e[1] + r + ",0)" + a;
		for (let t = 0; t < i; t++) {
			var c = s[t].style;
			((c.transform = p), "" !== o && (c.opacity = o));
		}
	}
	u(t) {
		return R.Def(this.p_[t][3]) ? this.p_[t][3] : "%";
	}
}
class Obj_ {
	constructor(t) {
		((this.a = _A), (this.de = t.de));
		var s = t.el,
			i = t.ch,
			e = t.p,
			r = t.indexStart,
			h =
				((this.rand = t.rand),
				(this.length = t.length),
				(this.element = []),
				(this.elementL = []),
				(this.obj = []),
				(this.objL = s.length),
				(this.randUniq = []),
				t.objLength);
		for (let t = 0; t < this.objL; t++)
			((this.element[t] = 2 === i ? s[t].children : [s[t]]),
				(this.elementL[t] = this.element[t].length),
				(this.obj[t] = new Obj({
					index: r + t,
					length: h,
					de: this.de,
					p: e,
				})),
				(this.randUniq[t] = t));
	}
	prepare(s) {
		!s.running && this.rand && (this.randUniq = R.Rand.uniq(this.objL));
		for (let t = 0; t < this.objL; t++) this.obj[t].prepare(s);
	}
	loop(t) {
		var s = t.pr,
			i = t.rEase;
		for (let t = 0; t < this.objL; t++)
			this.obj[t].loop({
				el: this.element[this.randUniq[t]],
				elL: this.elementL[t],
				pr: s,
				rEase: i,
			});
	}
}
class An {
	constructor(t) {
		((this.a = _A), (this.de = t.de || 0));
		var s = t.lT || !1,
			i = t.ch,
			e = t.rand || !1;
		let r = t.el;
		(R.Und(r.length) && (r = [r]), (this.lineL = r.length));
		var h = t.p,
			t =
				((this.start = h[0][1]), (this.objLength = this.lineL), r[0].children);
		(0 < i && 1 === this.lineL && 1 < t.length && (this.objLength = t.length),
			(this.line = []));
		let n = 0;
		for (let t = 0; t < this.lineL; t++) {
			var a = 0 === i ? [r[t]] : r[t].children;
			((this.line[t] = new Obj_({
				length: this.lineL,
				objLength: this.objLength,
				indexStart: n,
				ch: i,
				el: a,
				p: h,
				de: this.de,
				rand: e,
			})),
				s || (n += this.line[t].objL));
		}
	}
	m(t) {
		R.Def(this.anim) && this.anim.pause();
		var s = "show" === t.a,
			i = t.d;
		let e;
		e = R.Def(t.e) ? (R.Is.str(t.e) ? R.Ease[t.e] : R.Ease4(t.e)) : R.Ease.o6;
		const r = this.line,
			h = this.lineL;
		var n = r[0].obj[0].cur[0];
		let a = !1,
			o = (s || (a = ((this.start < 0 && 0 < n) || this.start, !0)), t.de);
		s && this.running && (o = 0);
		for (let t = 0; t < h; t++)
			r[t].prepare({
				isShow: s,
				running: this.running,
				pEndIsEnd: a,
			});
		n = s ? 1 - (this.objLength - 1) * this.de : 1;
		return (
			(this.anim = new R.M({
				de: o,
				d: i / n,
				u: (t) => {
					var s = t.pr;
					for (let t = 0; t < h; t++)
						r[t].loop({
							pr: s,
							rEase: e,
						});
				},
				cb: (t) => {
					this.running = !1;
				},
			})),
			{
				play: (t) => {
					((this.running = !0), this.anim.play());
				},
			}
		);
	}
}
class SL {
	constructor(t) {
		((this.el = R.Sel.el(t.el)[0]),
			(this.txt = this.el.innerHTML),
			(this.txt = this.txt.replaceAll("</i> <i>", " ")));
		var t = R.Cr("div"),
			s = ((t.innerHTML = this.txt), t.childNodes),
			i = s.length;
		this.arr = [];
		let e = 0;
		for (let t = 0; t < i; t++) {
			var r,
				h = s[t];
			if (3 === h.nodeType) {
				var n = h.nodeValue.split(" "),
					a = n.length;
				for (let t = 0; t < a; t++) {
					var o = "" === n[t] ? " " : n[t];
					((this.arr[e] = {
						type: "txt",
						word: o,
					}),
						e++);
				}
			} else
				"BR" === h.tagName
					? ((this.arr[e] = {
							type: "br",
						}),
						e++)
					: ("A" !== h.tagName && "I" !== h.tagName) ||
						((r = h.outerHTML),
						(h = h.innerHTML),
						(r = r.split(">" + h + "<")),
						(this.arr[e] = {
							type: "tag",
							start: r[0] + ">",
							end: "<" + r[1],
							word: h.split(" "),
						}),
						e++);
		}
		this.arrL = this.arr.length;
	}
	resize(t) {
		this.el.innerHTML = this.txt;
		let e = this.gW(this.el);
		var r = R.Cr("div"),
			s = r.style,
			i =
				((s.visibility = "hidden"),
				(s.position = "absolute"),
				(s.whiteSpace = "nowrap"),
				getComputedStyle(this.el)),
			h =
				((s.fontFamily = i.fontFamily),
				(s.fontSize = i.fontSize),
				(s.fontWeight = i.fontWeight),
				(s.letterSpacing = i.letterSpacing),
				(r.className = "_sl"),
				document.body.prepend(r),
				parseInt(i.textIndent, 10)),
			n = 0 < h;
		let a = !0,
			o = (n && ((e -= h), (a = !1)), "");
		var l = [];
		let d = 0,
			p = "",
			c = "";
		for (let t = 0; t < this.arrL; t++) {
			var u = this.arr[t];
			if ((n && !a && 0 < d && ((a = !0), (e += h)), "txt" === u.type)) {
				var v = u.word;
				let t = " " === v ? "" : " ";
				((r.innerHTML = p + v),
					(c =
						this.gW(r) > e
							? ((l[d++] = c.trim()), (p = v + t), v + t)
							: ((p = p + v + t), c + v + t)));
			} else if ("tag" === u.type) {
				var g = u.start,
					f = u.end,
					m = u.word,
					b = m.length,
					y = b - 1;
				((p = this.rLS(p)), (c = this.rLS(c)));
				let i = "";
				for (let s = 0; s < b; s++) {
					var w = s === y ? "" : " ",
						L = m[s],
						x = g + (i += L) + f;
					if (((r.innerHTML = p + x), this.gW(r) > e))
						(0 === s ? (l[d++] = c.trim()) : ((c = c.trim() + f), (l[d++] = c)),
							(p = ""),
							(i = L + w),
							(c = s === y ? g + L + f + w : g + L + w));
					else {
						i += w;
						let t = L;
						(0 === s && (t = g + t), s === y && (t += f), (c = c + t + w));
					}
					s === y && (p += g + i + f);
				}
			} else "br" === u.type && ((l[d++] = c.trim()), (p = ""), (c = ""));
		}
		c !== l[d - 1] && "" !== (s = c.trim()) && (l[d++] = s);
		var _ = t.tag.start,
			z = t.tag.end;
		for (let t = 0; t < d; t++) {
			var M = "" === l[t] ? "&nbsp;" : l[t];
			o += _ + M + z;
		}
		(r.parentNode.removeChild(r), (this.el.innerHTML = o));
	}
	rLS(t) {
		return t.replace(/\s?$/, "");
	}
	gW(t) {
		return R.Re(t).width;
	}
}
class TM {
	constructor(t) {
		((this.cb = t.cb),
			(this.el = R.Has(t, "el") ? R.Sel.el(t.el)[0] : document),
			R.BM(this, ["run"]));
	}
	on() {
		this.l("a");
	}
	off() {
		this.l("r");
	}
	l(t) {
		R.L(this.el, t, "touchmove", this.run);
	}
	run(t) {
		var s = t.changedTouches[0];
		this.cb(s.pageX, s.pageY, t);
	}
}
class Slider {
	constructor() {
		(R.BM(this, ["fn", "move", "down", "up"]),
			(this.tm = new TM({
				cb: this.move,
			})),
			(this.index = 0));
	}
	init() {
		((this.hour = R.G.class("sz-h")),
			(this.bg = R.G.class("sz-b")),
			(this.thumb = R.G.class("sz-c-t")),
			(this.len = this.hour.length));
		var t = _A.data.sz[this.index].video;
		(-1 < t && R.Def(this.thumb[t]) && R.PE.all(this.thumb[t]),
			(this.direction = 1),
			(this.hourWSemi = []),
			(this.pos = []),
			(this.x = []),
			(this.bgLR = []),
			(this.bgRL = []),
			(this.prlx = []));
		for (let t = 0; t < this.len; t++)
			((this.x[t] = 0),
				(this.bgLR[t] = 0),
				(this.bgRL[t] = 0),
				(this.prlx[t] = 0));
		((this.isDrag = !1), (this.cd = R.G.class("sz-c-d")));
		var s = R.G.class("sz-c-d-p");
		((this.cdpSL = []), (this.cdpVisible = []));
		for (let t = 0; t < this.len; t++)
			((this.cdpSL[t] = new SL({
				el: s[t],
			})),
				(this.cdpVisible[t] = t === this.index));
		this.cdp = [];
		var i = R.G.class("sz-c-d");
		this.cdl = [];
		for (let t = 0; t < this.len; t++) {
			var e = R.G.class("sz-c-d-l", i[t])[0];
			R.Def(e)
				? (this.cdl[t] = new An({
						ch: 1,
						el: e,
						p: [["y", 110, -110]],
					}))
				: (this.cdl[t] = void 0);
		}
		(R.Def(this.cdl[this.index]) &&
			this.cdl[this.index]
				.m({
					a: "show",
					d: 0,
				})
				.play(),
			this.peA(this.index, "all"),
			this.resize());
	}
	resize() {
		var t = _A.winWpsdW,
			s = 67 * t,
			i = 308 * t;
		this.gap2 = 2 * i;
		for (let t = 0; t < this.len; t++)
			(t < this.len - 2
				? (this.pos[t] = s + i * (t + 1))
				: (this.pos[t] = s + i * (t - this.len + 1)),
				(this.hourWSemi[t] = 0.5 * R.Re(this.hour[t]).width));
		for (let t = 0; t < this.len; t++) {
			var e = this.cdpVisible[t] ? 0 : -110;
			(this.cdpSL[t].resize({
				tag: {
					start:
						'<span class="y_"><span class="y" style="transform: translate3d(0,' +
						e +
						',0);">',
					end: "</span></span>",
				},
			}),
				(this.cdp[t] = new An({
					ch: 1,
					el: R.G.class("y_", this.cdpSL[t].el),
					p: [["y", 110, -110]],
					de: 0.04,
				})),
				this.cdpVisible[t] &&
					this.cdp[t]
						.m({
							a: "show",
							d: 0,
						})
						.play());
		}
		this.render({
			from: "resize",
		});
	}
	loop() {
		this.render({
			from: "loop",
		});
	}
	render(t) {
		var h = "loop" === t.from,
			n = _A.data.sz,
			a = h ? 0.09 : 1;
		for (let r = 0; r < this.len; r++) {
			var o = R.Mod(r - this.index, this.len),
				o = this.pos[o] - this.hourWSemi[r],
				l =
					((this.x[r] = R.Damp(this.x[r], o, a)),
					R.R(Math.abs(this.x[r] - o), 3) > this.gap2);
			(l && (this.x[r] = o),
				(!R.Une(this.x[r], o, 3) && h) ||
					R.T(this.hour[r], R.R(this.x[r]), 0, "px"));
			let t = r - this.index,
				s = (t > this.len - 2 ? (t -= this.len) : t < -2 && (t += this.len), 0),
				i = (0 < t && (s = 100), 0),
				e =
					(t < 0 && (i = 100),
					5 < t &&
						(0 < this.direction
							? ((s = 100), (this.bgLR[r] = 100))
							: ((i = 100), (this.bgRL[r] = 100))),
					0);
			(0 < t ? (e = 30) : t < 0 && (e = -30),
				(this.bgLR[r] = R.Damp(this.bgLR[r], s, a)),
				(this.bgRL[r] = R.Damp(this.bgRL[r], i, a)),
				(this.prlx[r] = R.Damp(this.prlx[r], e, a)));
			((l = n[r].video), (o = -1 < l));
			(R.Une(this.bgLR[r], s, 3) || R.Une(this.bgRL[r], i, 3) || !h) &&
				((this.bg[r].style.clipPath =
					"inset(0 " + R.R(this.bgRL[r]) + "% 0 " + R.R(this.bgLR[r]) + "%)"),
				R.T(this.bg[r].children[0], R.R(this.prlx[r]), 0),
				o) &&
				((this.thumb[l].style.clipPath =
					"inset(0 " + R.R(this.bgRL[r]) + "% 0 " + R.R(this.bgLR[r]) + "%)"),
				R.T(this.thumb[l].children[0], R.R(this.prlx[r]), 0));
		}
	}
	down(t) {
		"A" === t.target.tagName ||
			2 === t.button ||
			(t.ctrlKey && 1 === t.button) ||
			((this.isDown = !0),
			(this.isDrag = !1),
			(this.start = t.touches[0].pageX));
	}
	move(t) {
		this.isDown &&
			((t = t - this.start),
			(this.swipe = 0 < t ? -1 : 1),
			(this.isDrag = 20 < Math.abs(t)));
	}
	up() {
		var t;
		this.isDown &&
			((this.isDown = !1), this.isDrag) &&
			((t = R.Mod(this.index + this.swipe, this.len)),
			this.slide({
				direction: this.swipe,
				index: t,
			}));
	}
	fn(t) {
		var s = 0 < t.pageX ? 1 : -1,
			t = R.Index.class(t.target, "sz-h");
		this.slide({
			direction: s,
			index: t,
		});
	}
	slide(t) {
		var s = this.index,
			t = ((this.index = t.index), (this.direction = t.direction), _A),
			i = t.t.y.show.d,
			t = t.t.y.show.e,
			e = _A.data.sz[s].video,
			e =
				(-1 < e && R.Def(this.thumb[e]) && R.PE.none(this.thumb[e]),
				_A.data.sz[this.index].video);
		(-1 < e && R.Def(this.thumb[e]) && R.PE.all(this.thumb[e]),
			this.peA(s, "none"),
			this.peA(this.index, "all"),
			this.cdp[s]
				.m({
					a: "hide",
					d: 300,
					e: "i1",
					de: 0,
				})
				.play(),
			this.cdp[this.index]
				.m({
					a: "show",
					d: i,
					e: t,
					de: 400,
				})
				.play(),
			R.Def(this.cdl[s]) &&
				this.cdl[s]
					.m({
						a: "hide",
						d: 300,
						e: "i1",
						de: 0,
					})
					.play(),
			R.Def(this.cdl[this.index]) &&
				this.cdl[this.index]
					.m({
						a: "show",
						d: i,
						e: t,
						de: 700,
					})
					.play());
	}
	l(t) {
		var s = document;
		(R.L(".sz-h", t, "click", this.fn),
			R.L(s, t, "touchstart", this.down),
			R.L(s, t, "touchend", this.up));
	}
	on() {
		(this.tm.on(), this.l("a"));
	}
	off() {
		(this.tm.off(), this.l("r"));
	}
	peA(t, s) {
		t = R.G.class("sz-c-d-l", this.cd[t]);
		0 < t.length && R.PE[s](t[0]);
	}
}
class Sz {
	constructor() {
		this.slider = new Slider();
	}
	init() {
		var t = _A.is;
		((this.rqd = t.sz), this.rqd && this.slider.init());
	}
	resize() {
		this.rqd && this.slider.resize();
	}
	loop() {
		this.rqd && this.slider.loop();
	}
	on() {
		this.rqd && this.slider.on();
	}
	off() {
		this.rqd && this.slider.off();
	}
}
class E {
	constructor() {
		var t = _A,
			s = {
				front: R.Ease4([0.76, 0, 0.2, 1]),
				back: R.Ease4([0.76 - 0.18, 0, 0.38, 1]),
			};
		((t.t = {
			fx: {
				show: {
					d: 1500,
					e: "o6",
				},
				hide: {
					d: 600,
					e: "i3",
				},
			},
			y: {
				show: {
					d: 1500,
					e: "o6",
				},
				hide: {
					d: 600,
					e: "i3",
				},
				hideP0: {
					d: 400,
					e: "o1",
				},
				hideST0: {
					d: 300,
					e: "o1",
				},
				hideST1: {
					d: 150,
					e: "o1",
				},
			},
			o: {
				show: {
					d: 600,
					e: "o3",
				},
				hide: {
					d: 600,
					e: "i3",
				},
			},
			tr: {
				d: 1e3,
			},
			e4: {
				o6: R.Ease4([0.16, 1, 0.3, 1]),
				io6: R.Ease4([0.87, 0, 0.13, 1]),
				io: {
					front: s.front,
					back: s.back,
				},
				o2: R.Ease4([0.5, 1, 0.89, 1]),
			},
			nav: {
				d: 700,
			},
		}),
			R.BM(this, ["resize", "loop"]),
			(this.raf = new R.Raf(this.loop)),
			(this.s = new S()),
			(this.nav = new Nav()),
			(this.k = new K()),
			(this.vi = new Vi()),
			(this.sz = new Sz()));
	}
	intro() {
		this.nav.intro();
	}
	init() {
		(this.s.init(),
			this.nav.init(),
			this.k.init(),
			this.vi.init(),
			this.sz.init());
		var t = _A.is,
			t = t.ho || t.sz || t.vi ? "add" : "remove";
		document.body.classList[t]("fx");
	}
	resize() {
		(this.s.resize(), this.k.resizeA(), this.sz.resize());
	}
	run() {
		(new R.RO(this.resize).on(), this.raf.run());
	}
	on() {
		(this.s.on(), this.vi.on(), this.sz.on());
	}
	loop() {
		this.sz.loop();
	}
	off() {
		(this.k.off(), this.s.off(), this.vi.off(), this.sz.off());
	}
}
let Fx$1 = class {
	constructor() {
		this.loadBg = R.G.id("lo-bg");
	}
	run(t) {
		var s = _A.config.isLocal,
			i = s ? 0 : 100,
			s = s ? 0 : 700,
			e = new R.TL();
		(e.from({
			el: this.loadBg,
			p: {
				o: [1, 0],
			},
			d: s,
			e: "linear",
			de: i,
			cb: t,
		}),
			e.play());
	}
};
class Intro {
	constructor(t) {
		const s = _A,
			i = new Fx$1();
		t((t) => {
			(s.e.intro(),
				i.run((t) => {
					(s.e.init(),
						s.e.run(),
						s.e.k.run(),
						s.e.on(),
						(s.mutating = !1),
						R.PE.none(R.G.id("lo")));
				}));
		});
	}
}
class Fx {
	constructor() {
		this.m = new R.M({
			el: R.G.id("a"),
			p: {
				o: [0, 1],
			},
		});
	}
	out(t) {
		this.m.play({
			d: t.d,
			e: t.e,
			cb: t.cb,
		});
	}
	in(t) {
		this.m.play({
			reverse: !0,
			d: t.d,
			e: t.e,
			cb: !1,
		});
	}
}
class Mutation {
	constructor() {
		this.mutationFx = new Fx();
	}
	out() {
		const s = _A;
		s.e.off();
		this.mutationFx.out({
			d: 200,
			e: "linear",
			cb: (t) => {
				s.page.update();
			},
		});
	}
	in() {
		const s = _A;
		(s.page.removeOld(), s.page.insertNew(), scrollTo(0, 0));
		(s.e.init(),
			this.mutationFx.in({
				d: 300,
				e: "linear",
			}),
			new R.De((t) => {
				s.e.k.run();
			}, 1).run(),
			new R.De((t) => {
				(s.e.on(), (s.mutating = !1));
			}, 300).run());
	}
}
class Grid {
	constructor(t) {
		((this.col = t.col), (this.inDom = !1));
		t = document;
		(R.BM(this, ["key"]), R.L(t, "a", "keydown", this.key));
	}
	key(t) {
		"Escape" === t.code && this.inDom
			? this.click({
					escape: !0,
				})
			: "KeyG" === t.code &&
				t.shiftKey &&
				this.click({
					escape: !1,
				});
	}
	click(t) {
		this.inDom
			? t.escape || "g_o" === this.gW.className
				? this.remove()
				: (this.gW.className = "g_o")
			: this.add();
	}
	remove() {
		(this.gW.parentNode.removeChild(this.gW), (this.inDom = !1));
	}
	add() {
		((this.gW = R.Cr("div")), (this.gW.id = "g_"));
		var s = R.Cr("div"),
			i = ((s.id = "g"), []);
		for (let t = 0; t < this.col; t++)
			((i[t] = R.Cr("div")), s.appendChild(i[t]));
		(this.gW.appendChild(s), document.body.prepend(this.gW), (this.inDom = !0));
	}
}
(new Grid({
	col: 2,
}),
	new Ctrl({
		device: "m",
		engine: E,
		transition: {
			intro: Intro,
			mutation: Mutation,
		},
	}));
