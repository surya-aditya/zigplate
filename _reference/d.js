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
				var a = Object.keys(i);
				r.propL = a.length;
				let t = r.propL;
				for (; t--; ) {
					var o = a[t],
						o =
							((r.prop[t] = {
								name: o,
								origin: {
									start: i[o][0],
									end: i[o][1],
								},
								cur: i[o][0],
								start: i[o][0],
								end: i[o][1],
								unit: i[o][2] || "%",
							}),
							o.charAt(0)),
						l = "r" === o && e ? "r2" : o;
					((e = "r" === o), (r.propI[l] = t));
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
					var n = h.elWL || r.el[e];
					r.line.shapeL[e] = R.Svg.shapeL(n);
					let t;
					if (r.line.dashed) {
						var d = r.line.dashed;
						let s = 0;
						var p = d.split(/[\s,]/),
							c = p.length;
						for (let t = 0; t < c; t++) s += parseFloat(p[t]) || 0;
						let i = "";
						var v = Math.ceil(r.line.shapeL[e] / s);
						for (let t = 0; t < v; t++) i += d + " ";
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
				a = R.Has(s, "s") ? t[s.s].name + "(" + t[s.s].cur + ")" : 0,
				o =
					e + r + h + a === 0
						? 0
						: [e, r, h, a].filter((t) => 0 !== t).join(" "),
				l = R.Has(s, "o") ? t[s.o].cur : -1;
			let n = this.v.elL;
			for (; n-- && !R.Und(this.v.el[n]); )
				(0 !== o && (this.v.el[n].style.transform = o),
					0 <= l && (this.v.el[n].style.opacity = l));
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
			a,
			o = 0;
		for (
			;
			(a = s + 0.5 * (i - s)),
				0 < (h = R.r2(a, e, r) - t) ? (i = a) : (s = a),
				1e-7 < Math.abs(h) && ++o < 10;
		);
		return a;
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
		a = t[2],
		i = t[3];
	let o = new Float32Array(11);
	if (h !== s || a !== i)
		for (let t = 0; t < 11; ++t) o[t] = R.r2(0.1 * t, h, a);
	return (t) =>
		(h === s && a === i) || 0 === t || 1 === t
			? t
			: R.r2(
					(function (t) {
						let s = 0;
						for (var i = 1; 10 !== i && o[i] <= t; ++i) s += 0.1;
						--i;
						var e = (t - o[i]) / (o[i + 1] - o[i]),
							e = s + 0.1 * e,
							r = R.r3(e, h, a);
						return 0.001 <= r
							? R.r5(t, e, h, a)
							: 0 === r
								? e
								: R.r4(t, r, r + 0.1, h, a);
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
		let a = !1;
		var t = i.substring(0, 3),
			o =
				(("whe" !== t && "mou" !== t && "tou" !== t && "poi" !== t) ||
					(a = {
						passive: !1,
					}),
				"a" === s ? "add" : "remove");
		for (let t = 0; t < h; t++) r[t][o + "EventListener"](i, e, a);
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
					var a = e.points.getItem(t);
					(0 < t && (s += R.Dist(a.x - i.x, a.y - i.y)), (i = a));
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
					var a = r[t],
						a = isNaN(a) ? a : +a;
					s.push(a);
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
			a = !1;
		for (; r; ) {
			var o = r.tagName;
			if ("A" === o) {
				h = !0;
				break;
			}
			if (("INPUT" === o || "BUTTON" === o) && "submit" === r.type) {
				a = !0;
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
			: a && R.PD(t);
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
class PM {
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
		R.L(this.el, t, "pointermove", this.run);
	}
	run(t) {
		this.cb(t.pageX, t.pageY, t);
	}
}
class C {
	constructor() {
		((this._ = [-1, -1]),
			(this._Norm = [0, 0]),
			(this.out = !1),
			R.BM(this, ["move", "outFn", "inFn"]),
			(this.mm = new PM({
				cb: this.move,
			})));
	}
	move(t, s) {
		this._ = [t, s];
		var i = _A.winSemi,
			e = _A.win;
		this._Norm = [((t - i.w) / e.w) * 0.25, ((s - i.h) / e.h) * 0.25];
	}
	inFn() {
		this.out = !1;
	}
	outFn() {
		this.out = !0;
	}
	run() {
		this.mm.on();
		var t = document;
		(R.L(t, "a", "pointerleave", this.outFn),
			R.L(t, "a", "pointerenter", this.inFn));
	}
}
function Page$1(t) {
	t = R.G.class("p" + (t || ""));
	return t[t.length - 1];
}
class V_ {
	constructor() {
		((this._ = []),
			(this.l = 0),
			(this.t = !1),
			(this.ff = R.Snif.isFirefox),
			R.BM(this, ["fn"]));
		var t = document;
		(R.L(t.body, "a", "wheel", this.fn), R.L(t, "a", "keydown", this.fn));
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
		((this.e = t),
			(this.eT = t.type),
			(this.eK = t.key),
			("keydown" === this.eT && "Tab" !== this.eK) || R.PD(t),
			0 < this.l && !this.t && ((this.t = !0), this.run()));
	}
	run() {
		"wheel" === this.eT ? this.w() : "keydown" === this.eT && this.k();
	}
	w() {
		var t = this.e,
			s = t.wheelDeltaY,
			t = this.ff && 1 === t.deltaMode ? 0.833333 : 0.555556;
		((this.s = -s * t), this.cb("w"));
	}
	k() {
		var s = this.eK,
			t = "Arrow",
			i = s === t + "Up" || s === t + "Left",
			e = " " === s;
		if (i || s === t + "Down" || s === t + "Right" || e) {
			let t = 100;
			(i
				? (t *= -1)
				: e && ((s = this.e.shiftKey ? -1 : 1), (t = (_A.win.h - 40) * s)),
				(this.s = t),
				this.cb("k"));
		} else this.t = !1;
	}
	cb(t) {
		let s = this.l;
		for (; s--; ) {
			var i = this._[s];
			("w" !== t && !i.k) || i.cb(this.s);
		}
		this.t = !1;
	}
}
const v = new V_();
let VId = 0,
	V$1 = class {
		constructor(t) {
			((this.o = t), (this.i = VId), VId++);
		}
		on() {
			v.a({
				id: this.i,
				cb: this.o.cb,
				k: this.o.k,
			});
		}
		off() {
			v.r(this.i);
		}
	};
class S {
	constructor() {
		((this.rqd = !1),
			(this.min = 0),
			(this.isDown = !1),
			(this.isDrag = !1),
			(this.prev = 0),
			R.BM(this, ["vFn", "move", "down", "up"]),
			(this.v = new V$1({
				cb: this.vFn,
				k: !0,
			})),
			(this.pm = new PM({
				cb: this.move,
			})));
	}
	intro() {
		var t = _A,
			t = ((this._ = {}), t.config.routes),
			s = Object.keys(t),
			i = s.length;
		for (let t = 0; t < i; t++) {
			var e = s[t];
			this._[e] = {
				cur: 0,
				tar: 0,
			};
		}
	}
	init() {
		var t = _A;
		if (
			((this.url = t.route.new.url),
			(this.isSt = t.is.st),
			(this.isVi = t.is.vi),
			(this.isRe = t.is.re),
			this.isSt &&
				(this.stH = {
					cur: 0,
					tar: 0,
				}),
			this.isRe)
		) {
			this.__ = [];
			for (let t = 0; t < 4; t++)
				this.__[t] = {
					cur: 0,
					tar: 0,
				};
		}
		(this.sUpAll(0),
			(this.isSt || t.is.se) && (t.was.st || t.was.se) && t.e.ste.gl.sUpdate(),
			this.resize());
	}
	resize() {
		var t = _A,
			s = t.win.h,
			i = t.is,
			e = t.e.p().children;
		let r = 0;
		if (i.st) r = R.Re(e[1]).height;
		else if (i.vi) r = 0;
		else {
			let s = e.length;
			i.p0 && --s;
			for (let t = 0; t < s; t++) r += R.Re(e[t]).height;
		}
		((this.max = Math.max(r - s, 0)),
			(this.max = R.R(this.max)),
			this.sUpAll(this.clamp(this._[this.url].tar)),
			this.isSt &&
				((this.stHero = R.G.id("st-h")),
				(this.maxSt = Math.max(R.Re(this.stHero).height - s, 0)),
				(t = this.clampSt(this.stH.tar)),
				(this.stH.cur = t),
				(this.stH.tar = t)));
	}
	vFn(t) {
		this.isDown ||
			(this.sUp(this.clamp(this._[this.url].tar + t)),
			this.isSt && this.sUpSt(this.clampSt(this.stH.tar + t)));
	}
	sUp(s) {
		if (((this._[this.url].tar = s), this.isRe))
			for (let t = 0; t < 4; t++) this.__[t].tar = s;
	}
	sUpSt(t) {
		this.stH.tar = t;
	}
	down(t) {
		(R.PD(t),
			"A" === t.target.tagName ||
				2 === t.button ||
				(t.ctrlKey && 1 === t.button) ||
				((this.isDown = !0),
				(this.isDrag = !1),
				(this.start = {
					x: t.pageX,
					y: t.pageY,
				}),
				(this.tar = this._[this.url].tar),
				(this.tarPrev = this.tar),
				this.isSt &&
					((this.startSt = {
						x: t.pageX,
						y: t.pageY,
					}),
					(this.tarSt = this.stH.tar),
					(this.tarPrevSt = this.tarSt))));
	}
	move(t, s, i) {
		(R.PD(i),
			this.isVi && _A.e.vi.vid.move(),
			this.isDown &&
				((i = Math.abs(t - this.start.x)),
				(t = Math.abs(s - this.start.y)),
				(this.isDrag = 6 < i || 6 < t),
				this.isDrag) &&
				((i = s) > this.prev && this.tar === this.min
					? (this.start.y = i - (this.tarPrev - this.min) / 2)
					: i < this.prev &&
						this.tar === this.max &&
						(this.start.y = i - (this.tarPrev - this.max) / 2),
				(this.prev = i),
				(this.tar = 2 * -(i - this.start.y) + this.tarPrev),
				(this.tar = this.clamp(this.tar)),
				this.sUp(this.tar),
				this.isSt) &&
				((this.tarSt = 2 * -(i - this.startSt.y) + this.tarPrevSt),
				(this.tarSt = this.clampSt(this.tarSt)),
				this.sUpSt(this.tarSt)));
	}
	up() {
		this.isDown && ((this.isDown = !1), (this.isDrag = !1));
	}
	loop() {
		this.rqd = !1;
		var t = this.url,
			s = R.Une(this._[t].cur, this._[t].tar, 3);
		if (
			(s && (this._[t].cur = R.Damp(this._[t].cur, this._[t].tar, 0.09)),
			s && !this.rqd && (this.rqd = !0),
			this.isRe)
		)
			for (let t = 0; t < 4; t++)
				this.__[t].cur = R.Damp(
					this.__[t].cur,
					this.__[t].tar,
					0.09 - 0.007 * (t + 1),
				);
		this.isSt &&
			R.Une(this.stH.cur, this.stH.tar, 3) &&
			((this.stH.cur = R.Damp(this.stH.cur, this.stH.tar, 0.09)),
			R.T(this.stHero, 0, R.R(-this.stH.cur), "px"));
	}
	sUpAll(s) {
		var t = this._[this.url];
		if (((t.tar = s), (t.cur = s), this.isRe))
			for (let t = 0; t < 4; t++) ((this.__[t].tar = s), (this.__[t].cur = s));
		((this.tar = s), (this.tarPrev = s));
	}
	clamp(t) {
		return R.R(R.Clamp(t, this.min, this.max));
	}
	clampSt(t) {
		return R.R(R.Clamp(t, this.min, this.maxSt));
	}
	l(t) {
		var s = document;
		(R.L(s, t, "pointerdown", this.down), R.L(s, t, "pointerup", this.up));
	}
	on() {
		(this.v.on(), this.pm.on(), this.l("a"));
	}
	off() {
		(this.v.off(), this.pm.off(), this.l("r"));
	}
}
class I {
	constructor() {
		var t = _A,
			s =
				((this.isRe = t.is.re),
				(this._ = []),
				(this._L = 0),
				(this.url = t.route.new.url),
				t.e.p().children),
			i = s.length;
		for (let t = 0; t < i; t++) {
			var e = s[t];
			e.classList.contains("_ns") ||
				((this._[this._L] = {
					dom: e,
					range: {},
				}),
				this._L++);
		}
		this.resize();
	}
	resize() {
		var s = _A.win.h;
		let i = 0;
		for (let t = 0; t < this._L; t++) {
			var e = this._[t],
				r = R.Re(e.dom).height,
				h = i - s,
				a = Math.max(i, 0) + r;
			((e.range.s = h),
				(e.range.e = a),
				(e.isOut = !1),
				(e.isRel = -1),
				this.isRe &&
					e.dom.classList.contains("re-l") &&
					(e.isRel = R.Index.class(e.dom, "re-l")),
				(i += r));
		}
		this.run();
	}
	run() {
		var s = _A.e.s;
		let i = s._[this.url].cur;
		for (let t = 0; t < this._L; t++) {
			var e = this._[t];
			(i = -1 < e.isRel ? s.__[e.isRel].cur : i) > e.range.s && i <= e.range.e
				? (e.isOut && (e.isOut = !1), this.draw(e, i))
				: e.isOut || ((e.isOut = !0), this.draw(e, i));
		}
	}
	draw(t, s) {
		R.T(t.dom, 0, R.R(-s), "px");
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
				var a = h.nodeValue.split(" "),
					o = a.length;
				for (let t = 0; t < o; t++) {
					var l = "" === a[t] ? " " : a[t];
					((this.arr[e] = {
						type: "txt",
						word: l,
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
			a = 0 < h;
		let o = !0,
			l = (a && ((e -= h), (o = !1)), "");
		var n = [];
		let d = 0,
			p = "",
			c = "";
		for (let t = 0; t < this.arrL; t++) {
			var v = this.arr[t];
			if ((a && !o && 0 < d && ((o = !0), (e += h)), "txt" === v.type)) {
				var u = v.word;
				let t = " " === u ? "" : " ";
				((r.innerHTML = p + u),
					(c =
						this.gW(r) > e
							? ((n[d++] = c.trim()), (p = u + t), u + t)
							: ((p = p + u + t), c + u + t)));
			} else if ("tag" === v.type) {
				var m = v.start,
					f = v.end,
					g = v.word,
					y = g.length,
					w = y - 1;
				((p = this.rLS(p)), (c = this.rLS(c)));
				let i = "";
				for (let s = 0; s < y; s++) {
					var x = s === w ? "" : " ",
						L = g[s],
						_ = m + (i += L) + f;
					if (((r.innerHTML = p + _), this.gW(r) > e))
						(0 === s ? (n[d++] = c.trim()) : ((c = c.trim() + f), (n[d++] = c)),
							(p = ""),
							(i = L + x),
							(c = s === w ? m + L + f + x : m + L + x));
					else {
						i += x;
						let t = L;
						(0 === s && (t = m + t), s === w && (t += f), (c = c + t + x));
					}
					s === w && (p += m + i + f);
				}
			} else "br" === v.type && ((n[d++] = c.trim()), (p = ""), (c = ""));
		}
		c !== n[d - 1] && "" !== (s = c.trim()) && (n[d++] = s);
		var b = t.tag.start,
			A = t.tag.end;
		for (let t = 0; t < d; t++) {
			var z = "" === n[t] ? "&nbsp;" : n[t];
			l += b + z + A;
		}
		(r.parentNode.removeChild(r), (this.el.innerHTML = l));
	}
	rLS(t) {
		return t.replace(/\s?$/, "");
	}
	gW(t) {
		return R.Re(t).width;
	}
}
class Z {
	init(t) {
		var s = _A,
			i = s.e.p("_");
		((this.url = s.route.new.url),
			(this.de_ = s.is.re ? 70 : 100),
			(this.trigger = []),
			(this.fx = []),
			(this.visible = []),
			(this.limit = []),
			(this.first = !0),
			(this.de = t.de),
			(this.y = R.G.class("z-y", i)),
			(this.yL = this.y.length),
			(this.o = R.G.class("z-o", i)),
			(this.oL = this.o.length),
			(this.s = R.G.class("z-s", i)),
			(this.sL = this.s.length),
			(this.sSL = []));
		for (let t = 0; t < this.sL; t++)
			this.sSL[t] = new SL({
				el: this.s[t],
			});
		(this.resizeB(), this.resizeA());
	}
	resizeB() {
		let s = -1 + this.yL + this.oL;
		for (let t = 0; t < this.sL; t++) {
			s++;
			var i = this.visible[s] ? 0 : 102;
			this.sSL[t].resize({
				tag: {
					start:
						'<span class="y_"><span class="y" style="transform: translate3d(0,' +
						i +
						'%,0);">',
					end: "</span></span>",
				},
			});
		}
	}
	resizeA() {
		let i = -1;
		var t = _A,
			e = t.t.y.show.d,
			r = t.t.y.show.e,
			s = t.t.o.show.d,
			h = t.t.o.show.e;
		for (let t = 0; t < this.yL; t++)
			if ((i++, !this.visible[i])) {
				this.trigger[i] = this.y[t];
				var a = this.calc(i, "z-y");
				this.fx[i] = new R.TL();
				for (let t = 0; t < a.domL; t++) {
					var o = 0 === t ? a.de : 60;
					(t < a._.domL &&
						this.fx[i].from({
							el: a._.dom[t],
							p: {
								y: [102, 0],
							},
							d: e,
							e: r,
							de: o,
						}),
						t < a.line.domL &&
							this.fx[i].from({
								el: a.line.dom[t].children[0],
								p: {
									x: [-102, 0],
								},
								d: e,
								e: r,
								de: 0,
							}));
				}
			}
		for (let t = 0; t < this.oL; t++)
			if ((i++, !this.visible[i])) {
				this.trigger[i] = this.o[t];
				var l = this.calc(i, "z-o"),
					n = !l.vp && 0 === l.de,
					d = n ? 0 : s;
				this.fx[i] = new R.TL();
				for (let t = 0; t < l.domL; t++) {
					var p = 0 === t ? l.de : 100;
					(this.fx[i].from({
						el: l._.dom[t],
						p: {
							o: [0, 1],
						},
						d: d,
						e: h,
						de: p,
					}),
						n && ((this.visible[i] = !0), this.fx[i].play()));
				}
			}
		for (let t = 0; t < this.sL; t++)
			if ((i++, !this.visible[i])) {
				var c = this.s[t],
					v = ((this.trigger[i] = c), this.calc(i, "z-s")),
					c = c.classList.contains("t-1"),
					u = {
						y: [102, 0],
					};
				c && (u.rotateX = [-10, 0]);
				let s = c ? 120 : 60;
				this.fx[i] = new R.TL();
				for (let t = 0; t < v.domL; t++) {
					var m = 0 === t ? v.de : s;
					this.fx[i].from({
						el: v._.dom[t],
						p: u,
						d: e,
						e: r,
						de: m,
					});
				}
			}
		if (this.first) {
			((this.first = !1), (this.triggerL = i + 1));
			for (let t = 0; t < this.triggerL; t++)
				R.Und(this.visible[t]) && (this.visible[t] = !1);
		}
	}
	loop() {
		if (0 !== this.triggerL) {
			var s = _A.e.s._[this.url].cur;
			for (let t = 0; t < this.triggerL; t++)
				s > this.limit[t] &&
					!this.visible[t] &&
					((this.visible[t] = !0), this.fx[t].play());
		}
	}
	calc(t, s) {
		var i = _A,
			e = "z-y" === s,
			r = "z-o" === s ? "o" : "y",
			h = i.win.h,
			a = this.trigger[t],
			o = {},
			l = "-[0-9]?[0-9]",
			i = R.Re(a).top + i.e.s._[this.url].cur,
			n = i < h;
		this.limit[t] = n ? -1 : i - h;
		let d = 0;
		n && (d = this.de);
		((t = new RegExp(s + l)),
			(i = a.className.match(t)),
			i && (d += this.de_ * i[0].substring(4)),
			(h = new RegExp(s + l + l)),
			(t = a.className.match(h)),
			t &&
				((i = t[0].substring(4).split("-")),
				(d += n ? this.de_ * i[1] : this.de_ * i[0])),
			(l = R.G.class(s + "-w", a)[0]),
			(h = l || a),
			(t = h.classList.contains(r) ? [h] : R.G.class(r, h)));
		return (
			(o._ = {
				dom: t,
			}),
			(o._.domL = o._.dom.length),
			e &&
				((o.line = {
					dom: R.G.class("l", h),
				}),
				(o.line.domL = o.line.dom.length)),
			(o.domL = o._.domL),
			e && (o.domL = Math.max(o.line.domL, o._.domL)),
			(o.de = d),
			(o.vp = n),
			o
		);
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
			a = t.rEase(h);
		let o = "",
			l = "";
		for (let t = 0; t < this.p_L; t++) {
			var n = this.p_[t][0],
				d = this.p[t];
			((this.cur[t] = R.R(R.Lerp(d.start, d.end, a), d.round)),
				"y" === n
					? ((e[1] = this.cur[t]), (r = this.u(t)))
					: "x" === n
						? ((e[0] = this.cur[t]), (r = this.u(t)))
						: "rotateX" === n
							? (o = " rotateX(" + this.cur[t] + "deg)")
							: "opacity" === n && (l = this.cur[t]));
		}
		var p = "translate3d(" + e[0] + r + "," + e[1] + r + ",0)" + o;
		for (let t = 0; t < i; t++) {
			var c = s[t].style;
			((c.transform = p), "" !== l && (c.opacity = l));
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
		let a = 0;
		for (let t = 0; t < this.lineL; t++) {
			var o = 0 === i ? [r[t]] : r[t].children;
			((this.line[t] = new Obj_({
				length: this.lineL,
				objLength: this.objLength,
				indexStart: a,
				ch: i,
				el: o,
				p: h,
				de: this.de,
				rand: e,
			})),
				s || (a += this.line[t].objL));
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
		var a = r[0].obj[0].cur[0];
		let o = !1,
			l = (s || (o = ((this.start < 0 && 0 < a) || this.start, !0)), t.de);
		s && this.running && (l = 0);
		for (let t = 0; t < h; t++)
			r[t].prepare({
				isShow: s,
				running: this.running,
				pEndIsEnd: o,
			});
		a = s ? 1 - (this.objLength - 1) * this.de : 1;
		return (
			(this.anim = new R.M({
				de: l,
				d: i / a,
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
let Fx$a = class {
	intro() {
		var t = [["y", 110, -110]];
		((this.menuE = R.G.id("n-m")),
			(this.closeE = R.G.id("n-c")),
			(this.logoE = R.G.id("n-l")),
			(this.menuA = new An({
				ch: 2,
				el: this.menuE,
				p: t,
			})),
			(this.closeA = new An({
				ch: 2,
				el: this.closeE,
				p: t,
			})),
			(this.logoA = new R.M({
				el: this.logoE,
				p: {
					o: [0, 1],
				},
			})));
	}
	logo(t) {
		var s = _A,
			t = "show" === t.a,
			i = (t ? s.t.y.show : s.t.y.hide).d,
			e = (t ? s.t.y.show : s.t.y.hide).e;
		const r = t ? "all" : "none",
			h = {
				d: i,
				e: e,
				de: t ? s.t.nav.d : 0,
			};
		return (
			t || (h.reverse = !0),
			{
				play: (t) => {
					(R.PE[r](this.logoE), this.logoA.play(h));
				},
			}
		);
	}
	right(t) {
		const i = _A;
		const e = "menu" === t.t;
		var t = t.a,
			s = "show" === t,
			r = (s ? i.t.y.show : i.t.y.hide).d,
			h = (s ? i.t.y.show : i.t.y.hide).e;
		const a = s ? "all" : "none",
			o = e ? this.menuE : this.closeE;
		var l = e ? this.menuA : this.closeA,
			s = s ? i.t.nav.d : 0;
		const n = l.m({
			a: t,
			d: r,
			e: h,
			de: s,
		});
		return {
			play: (t) => {
				if (!e) {
					var s = i.route.old.url;
					let t = s;
					(s
						? i.is.sz && (t = "/video/" === s.substring(0, 7) ? "/story" : s)
						: (t = i.is.in ? "/" : "/story"),
						(this.closeE.href = t));
				}
				(R.PE[a](o), n.play());
			},
		};
	}
};
class Nav {
	constructor() {
		this.fx = new Fx$a();
	}
	intro() {
		this.fx.intro();
	}
}
let GL$6 = class {
		constructor() {
			this.logo_ = [];
		}
		init() {
			var t = _A,
				t = ((this.url = t.route.new.url), t.rgl._[this.url].plane);
			((this.bg = t.bg[0]), (this.logo = t.logo), this.resize());
		}
		resize() {
			var t = _A,
				s = t.win,
				i = t.winWpsdW;
			const e = this.bg.move.lerp;
			((e.x = 0), (e.y = 0), (e.w = s.w), (e.h = s.h));
			var r = [179, 518, 794, 1107, 1405, 1687],
				h = 0.5 * (s.h - this.logo[0].media.data[0].element.height * i);
			this.logoH = [];
			for (let t = 0; t < 6; t++) {
				var a = this.logo[t].media.data[0].element;
				const e = this.logo[t].move.lerp;
				((this.logoH[t] = a.height * i),
					(e.x = r[t] * i),
					(e.y = h),
					(e.w = a.width * i),
					(e.h = this.logoH[t]));
			}
			this.texSet();
		}
		loop() {
			this.texSet();
		}
		texSet() {}
		show(t) {
			var s = _A;
			const e = s.t.e4.o6;
			var i = s.t.tr.d;
			const r = s.t.e4.io.front;
			var h = 0.5 * i,
				a = s.t.y.show.d + h;
			const o = i / (s.t.y.show.d + h);
			(R.Pause(this.bgA),
				R.Pause(this.bgB),
				(this.bg.move.ease.maskTB = 1),
				(this.bg.move.ease.scale = 0.3),
				(this.bgA = new R.M({
					d: a,
					u: (t) => {
						var s = this.bg.move.ease,
							i = R.iLerp(0, o, t.pr);
						((s.maskTB = R.Lerp(1, 0, r(i))),
							(s.scale = R.Lerp(0.1, 0, r(i)) + R.Lerp(0.2, 0, e(t.pr))));
					},
				})));
			var l = t.de - 160,
				n = [0, 1, 2, 3, 4, 8];
			for (let s = 0; s < 6; s++) {
				R.Pause(this.logo_[s]);
				const d = this.logo[s].move;
				((d.ease.maskYNorm = 1),
					(d.ease.y = this.logoH[s]),
					(d.ease.y1 = 0),
					(d.ease.maskBT = 0),
					(d.lerp.rotate = 1),
					(this.logo_[s] = new R.M({
						de: l + 80 * n[s],
						d: 1300,
						u: (t) => {
							t = e(t.pr);
							((d.ease.maskYNorm = R.Lerp(1, 0, t)),
								(d.ease.y = R.Lerp(this.logoH[s], 0, t)),
								(d.lerp.rotate = R.Lerp(1, 0, t)));
						},
					})));
			}
			return {
				play: (t) => {
					this.bgA.play();
					for (let t = 0; t < 6; t++) this.logo_[t].play();
				},
			};
		}
		hide() {
			const r = _A,
				h = r.t.e4.io.front,
				a = r.t.e4.io.back;
			var t = r.t.tr.d;
			return (
				R.Pause(this.bgA),
				R.Pause(this.bgB),
				(this.bgB = new R.M({
					d: t,
					u: (s) => {
						var i = R.Lerp(0, 1, h(s.pr)),
							t = this.bg.move.ease;
						((t.maskBT = i), (t.y = R.Lerp(0, r.tr.y, a(s.pr))));
						for (let t = 0; t < 6; t++) {
							var e = this.logo[t].move;
							((e.ease.maskBT = i), (e.ease.y1 = R.Lerp(0, r.tr.y, a(s.pr))));
						}
					},
					cb: (t) => {
						var s = this.bg.move.ease;
						((s.y = 0), (s.maskBT = 0));
					},
				})),
				this.bgB
			);
		}
	},
	Fx$9 = class {
		init() {
			((this.circle_ = R.G.id("ho-m-p-i-c_")),
				(this.circle = R.G.id("ho-m-p-i-c")),
				(this.playTriangle = R.G.id("ho-m-p-i-t")),
				(this.y = R.G.class("y", R.G.id("ho-m"))));
		}
		show(t) {
			var s = t.de;
			((this.circleA_ = new R.M({
				el: this.circle_,
				p: {
					opacity: [0, 1],
					rotate: [90, 270],
				},
				d: 2e3,
				e: "io6",
				de: s,
			})),
				(this.circleA = new R.M({
					el: this.circle,
					line: {
						start: 0,
						end: 100,
					},
					d: 2e3,
					e: "io6",
					de: s,
				})),
				(this.triangleA = new R.M({
					el: this.playTriangle,
					p: {
						opacity: [0, 1],
					},
					d: 1e3,
					e: "o6",
					de: s + 1e3,
				})));
			const i = new R.TL();
			for (let t = 0; t < 6; t++) {
				var e = 0 === t ? s + 700 : 100;
				i.from({
					el: this.y[t],
					p: {
						y: [101, 0],
					},
					d: 1500,
					e: "o6",
					de: e,
				});
			}
			return {
				play: (t) => {
					(this.circleA_.play(),
						this.circleA.play(),
						this.triangleA.play(),
						i.play());
				},
			};
		}
	};
class HO {
	constructor() {
		((this.gl = new GL$6()), (this.fx = new Fx$9()));
	}
	init() {
		((this.rqd = _A.is.ho), this.rqd && (this.gl.init(), this.fx.init()));
	}
	resize() {
		this.rqd && this.gl.resize();
	}
	loop() {
		this.rqd && this.gl.loop();
	}
}
let Fx$8 = class {
		init() {
			((this.eBgLine = R.G.id("in-r-b-e-a-b")),
				(this.eP = R.G.id("in-r-b-e-p")));
		}
		show(t) {
			t = t.de;
			const s = new R.M({
					el: this.eBgLine,
					p: {
						x: [-101, 0],
					},
					d: 1500,
					e: "io6",
					de: t,
				}),
				i = new R.De((t) => {
					this.eP.classList.add("on");
				}, t + 700);
			return {
				play: (t) => {
					(i.run(), s.play());
				},
			};
		}
	},
	GL$5 = class {
		init() {
			var t = _A,
				t = ((this.url = t.route.new.url), t.rgl._[this.url]);
			((this.tex = t.plane.main),
				(this.texL = this.tex.length),
				(this.texMax = this.texL - 1),
				(this._3d = [
					{
						cur: 0,
						tar: 0,
					},
					{
						cur: 0,
						tar: 0,
					},
				]),
				this.resize());
		}
		resize() {
			var t = _A,
				s = t.winWpsdW,
				i = 22 * s,
				e = 1264 * s,
				r = t.win.h - 2 * i,
				h = i + 0.5 * e - t.winSemi.w;
			for (let t = 0; t < this.texL; t++) {
				var a = this.tex[t].move,
					o = a.lerp,
					a = a.ease;
				((o.x = i),
					(o.y = i),
					(o.w = e),
					(o.h = r),
					(o.h = r),
					(o.opacity = 0.5),
					(a.view = h),
					(a.prlxx = -0.02 * (this.texL - 1 - t)));
			}
			this.y = 300 * t.winWpsdW;
		}
		move3D() {
			var s = _A.e.c._Norm;
			for (let t = 0; t < 2; t++)
				this._3d[t].cur = R.Damp(this._3d[t].cur, s[t], 0.08);
			var i = this._3d[0].cur,
				e = this._3d[1].cur;
			for (let t = 0; t < this.texL; t++) {
				var r = this.tex[t].move.ease;
				((r.rx = i), (r.ry = e));
			}
		}
		loop() {
			this.move3D();
		}
		show(t) {
			var s = _A;
			const r = s.t.e4.o6;
			var i = s.t.y.show.d;
			(R.Pause(this.fx), R.Pause(this.fx1));
			for (let t = 0; t < this.texL; t++) this.tex[t].move.ease.scale = 0.25;
			this.fx = new R.M({
				d: i + 2 * t.de,
				u: (t) => {
					var s = r(t.pr),
						i = R.Lerp(0.25, 0, s);
					for (let t = 0; t < this.texL; t++) {
						var e = this.tex[t].move.ease;
						((e.scale = i), (e.y = R.Lerp(this.y * (this.texMax - t), 0, s)));
					}
				},
			});
			const h = s.t.e4.io.front;
			i = s.t.tr.d;
			return (
				(this.fx1 = new R.M({
					d: i,
					u: (t) => {
						var s = h(t.pr),
							i = R.Lerp(1, 0, s),
							e = R.Lerp(0, 1, s);
						for (let t = 0; t < this.texL; t++) {
							var r = this.tex[t].move.ease;
							((r.maskTB = i),
								(r.z = R.Lerp(0, this.texMax - t, s)),
								(r.rf = e));
						}
					},
				})),
				{
					play: (t) => {
						(this.fx.play(), this.fx1.play());
					},
				}
			);
		}
		hide() {
			const n = _A,
				d = n.t.e4.io.front,
				p = n.t.e4.io.back;
			var t = n.t.tr.d;
			return (
				R.Pause(this.fx),
				(this.fx = new R.M({
					d: t,
					u: (t) => {
						var s = p(t.pr),
							i = d(t.pr),
							e = R.Lerp(0, 1, i),
							r = R.Lerp(0, n.tr.y / n.win.h, s),
							h = R.Lerp(1, 0, s),
							a = R.Lerp(0.5, 0, R.iLerp(0, 0.6, t.pr));
						for (let t = 0; t < this.texL; t++) {
							var o = this.tex[t].move,
								l = o.ease;
							((l.maskBT = e),
								(l.prlxy = r),
								(l.z = R.Lerp(this.texMax - t, 0, i)),
								(l.rf = h),
								(o.lerp.opacity = a));
						}
					},
					cb: (t) => {
						for (let t = 0; t < this.texL; t++) {
							var s = this.tex[t].move.ease;
							((s.maskBT = 0), (s.prlxy = 0));
						}
					},
				})),
				this.fx
			);
		}
	};
class IN {
	constructor() {
		((this.fx = new Fx$8()), (this.gl = new GL$5()));
	}
	init() {
		((this.rqd = _A.is.in), this.rqd && (this.fx.init(), this.gl.init()));
	}
	resize() {
		this.rqd && this.gl.resize();
	}
	loop() {
		this.rqd && this.gl.loop();
	}
}
let Fx$7 = class {
		init() {
			var t = _A.e.p(),
				s = [["y", 110, -110]];
			((this.nLarge = new An({
				ch: 1,
				el: R.G.class("se-g-r-c-t-a-n-l", t),
				p: s,
			})),
				(this.nLarge_ = new An({
					ch: 0,
					el: R.G.class("se-g-r-c-t-a-n-l", t),
					p: [["y", -50, 50]],
				})),
				(this.nExpo = new An({
					ch: 1,
					el: R.G.class("se-g-r-c-t-a-n-e", t),
					p: s,
				})));
		}
		run(t) {
			var s = _A,
				i = t.a,
				e = "show" === i,
				r = (e ? s.t.y.show : s.t.y.hideST1).d,
				e = (e ? s.t.y.show : s.t.y.hideST1).e,
				s = t.de;
			const h = this.nLarge.m({
					a: i,
					d: r,
					e: e,
					de: s,
				}),
				a = this.nExpo.m({
					a: i,
					d: r,
					e: e,
					de: s,
				}),
				o = this.nLarge_.m({
					a: i,
					d: r,
					e: e,
					de: s,
				});
			return {
				play: (t) => {
					(h.play(), a.play(), o.play());
				},
			};
		}
	},
	Over$1 = class {
		constructor() {
			R.BM(this, ["fn"]);
		}
		init() {
			var t = _A.e.p(),
				s = R.G.class("se-g-r-c-t-a-a", t),
				i = R.G.class("se-g-r-c-t-a-l", t),
				e = s.length;
			((this.activity = []), (this.location = []), (this.location_ = []));
			for (let t = 0; t < e; t++)
				((this.activity[t] = new An({
					ch: 1,
					el: s[t],
					p: [
						["y", 102, -102],
						["rotateX", -90, 20],
					],
					de: 0.013,
				})),
					(this.location[t] = new An({
						ch: 1,
						el: i[t],
						p: [["y", 110, -110]],
					})),
					(this.location_[t] = new An({
						ch: 0,
						el: i[t],
						p: [["y", 50, -50]],
					})));
		}
		fn(t) {
			var s = Math.floor(0.5 * R.Index.class(t.target, "se-g-r-c-a")),
				t = "mouseenter" === t.type ? "show" : "hide",
				i = "show" == t,
				e = i ? 1200 : 300,
				i = i ? "o6" : "o1",
				r = this.activity[s].m({
					a: t,
					d: e,
					e: i,
				}),
				h = this.location[s].m({
					a: t,
					d: e,
					e: i,
				}),
				s = this.location_[s].m({
					a: t,
					d: e,
					e: i,
				});
			(r.play(), h.play(), s.play());
		}
		l(s) {
			var i = ["enter", "leave"];
			for (let t = 0; t < 2; t++)
				R.L(".se-g-r-c-a", s, "mouse" + i[t], this.fn);
		}
		on() {
			this.l("a");
		}
		off() {
			this.l("r");
		}
	};
class SE {
	constructor() {
		((this.fx = new Fx$7()), (this.over = new Over$1()));
	}
	init() {
		((this.rqd = _A.is.se), this.rqd && (this.fx.init(), this.over.init()));
	}
	on() {
		this.rqd && this.over.on();
	}
	off() {
		this.rqd && this.over.off();
	}
}
let Fx$6 = class {
	init() {
		var t = _A.e.p(),
			s = ["y", 110, -110];
		((this.time = new An({
			ch: 1,
			el: R.G.class("st-g-r-c-a-t", t),
			p: [["y", 110, 110]],
		})),
			(this.apo = new An({
				ch: 1,
				el: R.G.id("st-h-n-a"),
				p: [s],
			})),
			(this.num = new An({
				ch: 1,
				el: R.G.id("st-h-n-n").children[0],
				p: [s, ["rotateX", -30, 8]],
				de: 0.02,
			})),
			(this.title = new An({
				ch: 2,
				el: R.G.id("st-h-t"),
				p: [s],
				de: 0.03,
			})),
			(this.story = new An({
				ch: 1,
				el: R.G.id("st-h-s"),
				p: [s],
			})),
			(this.p = R.G.id("st-h-p")),
			(this.pSL = new SL({
				el: this.p,
			})),
			(this.visible = !1),
			this.resizeB());
	}
	resizeB() {
		var t = this.visible ? 0 : -101;
		(this.pSL.resize({
			tag: {
				start:
					'<div class="y_"><div class="y" style="transform: translate3d(0,' +
					t +
					'%,0);">',
				end: "</div></div>",
			},
		}),
			(this.pA = new An({
				ch: 0,
				el: R.G.class("y", this.p),
				p: [["y", 110, -110]],
				de: 0.02,
			})),
			this.visible &&
				this.pA
					.m({
						a: "show",
						d: 0,
					})
					.play());
	}
	run(t) {
		var s = _A,
			i = t.a;
		const e = "show" === i;
		var r = (e ? s.t.y.show : s.t.y.hideST0).d,
			h = (e ? s.t.y.show : s.t.y.hideST0).e,
			a = (e ? s.t.y.show : s.t.y.hideST1).d,
			s = (e ? s.t.y.show : s.t.y.hideST1).e,
			o = t.de,
			t = t.deTime,
			l = e ? 300 : 0,
			n = e ? 100 : 0;
		const d = this.apo.m({
				a: i,
				d: r,
				e: h,
				de: o,
			}),
			p = this.num.m({
				a: i,
				d: r,
				e: h,
				de: o,
			}),
			c = this.title.m({
				a: i,
				d: r,
				e: h,
				de: o + l,
			}),
			v = this.story.m({
				a: i,
				d: r,
				e: h,
				de: o + l + n,
			}),
			u = this.pA.m({
				a: i,
				d: a,
				e: s,
				de: o + l + n,
			}),
			m = this.time.m({
				a: i,
				d: a,
				e: s,
				de: o + t,
			});
		return {
			play: (t) => {
				((this.visible = e),
					d.play(),
					p.play(),
					c.play(),
					v.play(),
					u.play(),
					m.play());
			},
		};
	}
};
class ST {
	constructor() {
		this.fx = new Fx$6();
	}
	init() {
		((this.rqd = _A.is.st), this.rqd && this.fx.init());
	}
	resizeB() {
		this.rqd && this.fx.resizeB();
	}
}
let GL$4 = class {
	intro() {
		var t = _A.rgl._["/story"];
		((this.tex = t.plane.main),
			(this.texL = t.planeL.main),
			(this.imgL = this.texL / 5),
			(this.lerp = t.lerp),
			(this.lerpL = this.lerp.length),
			(this._ = {
				tar: [],
				cur: [],
				de: [],
			}),
			(this.index = 0),
			(this.eY = []));
		for (let t = 0; t < this.imgL; t++) this.eY[t] = 0;
		((this.over = -1), (this.scale = []));
		for (let t = 0; t < this.imgL; t++)
			this.scale[t] = {
				cur: 0,
				tar: 0,
			};
	}
	init() {
		var t = _A,
			s = t.route.new;
		((this.url = s.url),
			(this.dataP = t.data[s.page]),
			(this.isSe = t.is.se),
			this.isSe
				? ((this.domImg = R.G.class("se-g-r-c-i")),
					(this.domTxt = R.G.class("se-g-r-c-t-a")))
				: (this.domImg = R.G.class("st-g-r-c-a")),
			this.resize({
				from: "init",
			}));
	}
	resize(t) {
		var s = _A,
			i = this.data();
		"init" === t.from && (s.was.st || s.was.se)
			? this._set({
					_: ["tar"],
					data: i,
					de: !0,
				})
			: this._set({
					_: ["cur", "tar"],
					data: i,
					de: !1,
				});
	}
	overFn() {
		var t = _A;
		let s = -1;
		var i = t.e.c._,
			e = i[0],
			r = i[1];
		for (let t = 0; t < this.imgL; t++) {
			var h = this.tex[5 * t].move.lerp,
				a = e >= h.x && e <= h.x + h.w,
				h = r >= h.y && r <= h.y + h.h;
			if (a && h) {
				s = t;
				break;
			}
		}
		this.over === s ||
			t.mutating ||
			(-1 !== this.over && (this.scale[this.over].tar = 0),
			-1 !== s && (this.scale[s].tar = 0.03),
			(this.over = s));
	}
	loop() {
		(this.texSet(), this.overFn());
	}
	show(t) {
		const r = _A;
		var s = r.t.y.show.d;
		const h = r.t.e4.o6;
		var i = R.R(s / 0.94);
		const a = [];
		for (let t = 0; t < this.imgL; t++) {
			var e = R.Clamp(t, 0, 2);
			a[t] = {
				start: 0.03 * e,
				end: 0.03 * e + 0.94,
			};
		}
		(R.Pause(this.fx), R.Pause(this.fx1));
		for (let t = 0; t < this.texL; t++) this.tex[t].move.ease.y = r.win.h;
		return (
			(this.fx = new R.M({
				d: i,
				de: t.de,
				u: (t) => {
					let i = 0;
					for (let s = 0; s < this.imgL; s++) {
						var e = h(R.iLerp(a[s].start, a[s].end, t.pr));
						this.eY[s] = R.Lerp(r.win.h, 0, e);
						for (let t = 0; t < 5; t++)
							((this.tex[i].move.ease.y = this.eY[s]), i++);
					}
				},
			})),
			(this.fx1 = new R.M({
				d: s + 1e3,
				de: t.de,
				u: (t) => {
					let s = 0;
					var i = h(t.pr),
						e = R.Ease.o2(t.pr);
					for (let t = 0; t < this.imgL; t++)
						for (let t = 0; t < 5; t++) {
							var r = this.tex[s].move.ease;
							((r.opacity = e),
								(r.z = R.Lerp(4 - t, 0, e)),
								(r.y1 = R.Lerp(40 * (4 - t), 0, i)),
								s++);
						}
				},
			})),
			{
				play: (t) => {
					(this.fx.play(), this.fx1.play());
				},
			}
		);
	}
	hide() {
		const h = _A,
			s = h.t.e4.io.front,
			a = h.t.e4.io.back;
		var t = h.t.tr.d;
		R.Pause(this.fx);
		const o = [];
		for (let t = 0; t < this.imgL; t++) o[t] = this.eY[t];
		return (
			(this.fx = new R.M({
				d: t,
				u: (t) => {
					let i = 0;
					var e = R.Lerp(0, 1, s(t.pr));
					for (let s = 0; s < this.imgL; s++) {
						this.eY[s] = R.Lerp(o[s], h.tr.y, a(t.pr));
						for (let t = 0; t < 5; t++) {
							var r = this.tex[i].move.ease;
							((r.y = this.eY[s]), (r.maskBT = e), i++);
						}
					}
				},
				cb: (t) => {
					for (let t = 0; t < this.texL; t++) {
						var s = this.tex[t].move.ease;
						((s.y = 0), (s.maskBT = 0));
					}
				},
			})),
			this.fx
		);
	}
	sUpdate() {
		var t = _A,
			s = t.win.h,
			i = t.e.p(),
			e = t.winSemi.h,
			r = t.e.s._,
			h = t.route.old,
			a = t.route.new,
			o = r[h.url].cur,
			r = r[a.url],
			l = t.data[h.page],
			n = t.data[a.page];
		let d;
		for (let t = (this.index = 0); t < this.imgL; t++) {
			var p = this.tex[5 * t].move.lerp,
				p = p.y + 0.5 * p.h;
			(0 === t && (d = p),
				Math.abs(e - p) < Math.abs(e - d) && ((d = p), (this.index = t)));
		}
		var h = t.is.st ? 1 : 0,
			a = R.Re(i.children[h]).height - s,
			t = R.G.class("_ri", i)[this.index],
			h = R.Re(t),
			c = h.top;
		((c -= (0.5 * (s - h.height)) / n[this.index].prlx.img),
			(c = R.Clamp(c, 0, a)));
		let v = 0;
		for (let t = 0; t < this.imgL; t++) {
			var u = c * n[t].prlx.img - o * l[t].prlx.img;
			for (let t = 0; t < 5; t++)
				((this.tex[v].move.lerp.y += u),
					(this._.cur[v].y += u),
					(this._.tar[v].y += u),
					v++);
		}
		((r.tar = c), (r.cur = c));
	}
	texSet() {
		var t = _A,
			i = t.e.s._[this.url].cur,
			e = t.winSemi.w;
		this.moving = !1;
		let r = 0;
		for (let s = 0; s < this.imgL; s++) {
			var h = this.dataP[s].prlx;
			(this.isSe
				? (R.T(this.domImg[s], 0, i * (1 - h.img) - this.top[s], "px"),
					R.T(this.domTxt[s], 0, i * (1 - h.txt) - this.top[s], "px"))
				: R.T(this.domImg[s], 0, i * (1 - h.img) - this.top[s], "px"),
				(this.scale[s].cur = R.Damp(
					this.scale[s].cur,
					this.scale[s].tar,
					0.08,
				)));
			for (let t = 0; t < 5; t++) {
				var a = this.tex[r].move,
					o = a.lerp,
					l = this._.cur[r],
					n = this._.tar[r];
				for (let t = 0; t < this.lerpL; t++) {
					var d = this.lerp[t],
						p = d.prop;
					(R.Une(l[p], n[p], d.r) && (this.moving = !0),
						(l[p] = R.Damp(l[p], n[p], 0.09)),
						(o[p] = l[p]),
						"y" === p && (o[p] -= i * h.img));
				}
				((a.ease.scale = this.scale[s].cur),
					(a.ease.view = l.x + 0.5 * l.w - e),
					r++);
			}
		}
	}
	_set(t) {
		var s = t._,
			e = s.length,
			r = t.data,
			h = r.length,
			a = t.de;
		for (let i = 0; i < h; i++) {
			const n = r[i];
			var o = a ? n.de : 0;
			for (let t = 0; t < e; t++) {
				const d = this._[s[t]];
				var l = this._.de;
				(R.Stop(l[i]),
					(l[i] = new R.De((t) => {
						d[i] = {};
						for (let t = 0; t < this.lerpL; t++) {
							var s = this.lerp[t].prop;
							d[i][s] = n[s];
						}
					}, o)),
					l[i].run());
			}
		}
	}
	data() {
		var t = _A,
			s = t.e.s._[this.url].cur,
			i = R.G.class("_ri", t.e.p()),
			e = ((this.top = []), []);
		let r = 0;
		for (let t = 0; t < this.imgL; t++) {
			R.T(this.domImg[t], 0, 0, "px");
			var h = this.dataP[t].prlx.img,
				a = R.Re(i[t]),
				o = a.width,
				l = a.height,
				n = a.top,
				d = ((this.top[t] = (n + s) * (1 - h)), (n + s) * h),
				p = a.left;
			R.T(this.domImg[t], 0, 0);
			for (let t = 0; t < 5; t++)
				((e[r] = {
					y: d,
					x: p,
					w: o,
					h: l,
					scale: 1,
					opacity: 1,
					de: 0,
					bw: this.isSe ? 0 : 1,
					lumi: 0.75,
					rotate: 0,
				}),
					r++);
		}
		return e;
	}
};
class Mode {
	constructor() {
		this.visible = !1;
	}
	intro() {
		this.d = R.G.id("d");
		var s = R.G.class("d-b-p");
		((this.arrow = R.G.class("d-a")), (this.border = []));
		for (let t = 0; t < 4; t++)
			this.border[t] = new R.M({
				el: s[t],
				line: {
					start: 0,
					end: 100,
				},
			});
		((this.arrowO = new R.M({
			el: ".d-a",
			p: {
				o: [0, 1],
			},
		})),
			this.arrowRotate().play());
	}
	fx(t) {
		var s = _A,
			i = "show" === t.a;
		if ((this.visible && i) || (!this.visible && !i))
			return {
				play: (t) => {},
			};
		const e = (this.visible = i) ? "all" : "none",
			r = t.de,
			h = i ? 100 : 0,
			a = (i ? s.t.y.show : s.t.y.hide).d,
			o = (i ? s.t.y.show : s.t.y.hide).e,
			l = {
				d: a,
				e: o,
				de: r,
			};
		return (
			i || (l.reverse = !0),
			{
				play: (t) => {
					R.PE[e](this.d);
					for (let t = 0; t < 4; t++)
						this.border[t].play({
							line: {
								end: h,
							},
							d: a,
							e: o,
							de: r,
						});
					this.arrowO.play(l);
				},
			}
		);
	}
	arrowRotate() {
		var t = _A.is.se;
		const s = t ? "add" : "remove";
		return (
			(this.d.href = t ? "/story" : "/story-extended"),
			{
				play: (t) => {
					for (let t = 0; t < 2; t++) this.arrow[t].classList[s]("fx");
				},
			}
		);
	}
}
class STE {
	constructor() {
		((this.gl = new GL$4()), (this.mode = new Mode()));
	}
	intro() {
		(this.gl.intro(), this.mode.intro());
	}
	init() {
		var t = _A.is;
		((this.rqd = t.st || t.se), this.rqd && this.gl.init());
	}
	resize() {
		this.rqd &&
			this.gl.resize({
				from: "resize",
			});
	}
	loop() {
		this.rqd && this.gl.loop();
	}
}
let GL$3 = class {
	init() {
		var t = _A,
			s = t.route.new,
			s = ((this.url = s.url), t.rgl._["/story-zoom"]);
		((this.dataP = t.data.sz),
			(this.clr = {
				cur: 0,
				tar: 0,
			}),
			(this.large = s.plane.large),
			(this.largeL = s.planeL.large),
			(this.lLR = []),
			(this.lRL = []),
			(this.lX = []));
		for (let t = 0; t < this.largeL; t++)
			((this.lLR[t] = {
				cur: 0,
				tar: 0,
			}),
				(this.lRL[t] = {
					cur: 0,
					tar: 0,
				}),
				(this.lX[t] = {
					cur: 0,
					tar: 0,
				}));
		((this.small = s.plane.small),
			(this.smallL = s.planeL.small),
			(this.sLR = []),
			(this.sRL = []),
			(this.sX = []));
		for (let t = 0; t < this.smallL; t++)
			((this.sLR[t] = {
				cur: 0,
				tar: 0,
			}),
				(this.sRL[t] = {
					cur: 0,
					tar: 0,
				}),
				(this.sX[t] = {
					cur: 0,
					tar: 0,
				}));
		((this.scale = {
			cur: 0,
			tar: 0,
		}),
			(this.thumb = R.G.class("sz-c-t")),
			(this.tLR = []),
			(this.tRL = []));
		for (let t = 0; t < this.smallL; t++)
			((this.tLR[t] = {
				cur: 0,
				tar: 0,
			}),
				(this.tRL[t] = {
					cur: 0,
					tar: 0,
				}));
		this.resize();
	}
	resize() {
		var t = _A,
			s = t.win.w,
			i = t.win.h,
			t = t.winWpsdW;
		for (let t = 0; t < this.largeL; t++) {
			var e = this.large[t].move.lerp;
			((e.x = 0),
				(e.y = 0),
				(e.w = s),
				(e.h = i),
				(e.bw = 0),
				(e.lumi = this.dataP[t].luminosity));
		}
		var r = 22 * t,
			h = 296 * t,
			a = s - h - r,
			o = (9 * h) / 16,
			l = i - o - r;
		for (let t = 0; t < this.smallL; t++) {
			var n = this.small[t].move,
				d = n.lerp;
			((d.x = a),
				(d.y = l),
				(d.w = h),
				(d.h = o),
				(d.bw = 1),
				(d.lumi = 1),
				(n.ease.maskTB = 0));
		}
		r = 22 * t;
		((this.smallEnd = (i - (166.5 * t + r) - 1) / i),
			(this.smallStart = (i - r + 1) / i));
	}
	setClr(t) {
		this.clr.tar = t;
	}
	overFn() {
		var t = _A,
			s = t.e.c._,
			i = s[0],
			s = s[1],
			e = this.small[0].move.lerp,
			i = i >= e.x && i <= e.x + e.w,
			s = s >= e.y && s <= e.y + e.h;
		(i && s) || t.is.vi ? (this.scale.tar = 0.05) : (this.scale.tar = 0);
	}
	loop() {
		(this.texSet(), this.overFn());
	}
	texSet() {
		var s = 0.09;
		this.clr.cur = R.Damp(this.clr.cur, this.clr.tar, 0.07);
		for (let t = 0; t < this.largeL; t++)
			this.large[t].move.lerp.bw = this.clr.cur;
		for (let t = 0; t < this.largeL; t++) {
			((this.lLR[t].cur = R.Damp(this.lLR[t].cur, this.lLR[t].tar, s)),
				(this.lRL[t].cur = R.Damp(this.lRL[t].cur, this.lRL[t].tar, s)),
				(this.lX[t].cur = R.Damp(this.lX[t].cur, this.lX[t].tar, s)));
			var i = this.large[t].move.ease;
			((i.maskLR = this.lLR[t].cur),
				(i.maskRL = this.lRL[t].cur),
				(i.x = this.lX[t].cur));
		}
		this.scale.cur = R.Damp(this.scale.cur, this.scale.tar, 0.08);
		for (let t = 0; t < this.smallL; t++) {
			((this.sLR[t].cur = R.Damp(this.sLR[t].cur, this.sLR[t].tar, s)),
				(this.sRL[t].cur = R.Damp(this.sRL[t].cur, this.sRL[t].tar, s)),
				(this.sX[t].cur = R.Damp(this.sX[t].cur, this.sX[t].tar, s)));
			var e = this.small[t].move.ease;
			((e.maskLR = this.sLR[t].cur + 25e-5),
				(e.maskRL = this.sRL[t].cur + 25e-5),
				(e.x = this.sX[t].cur),
				(e.scale = this.scale.cur));
		}
		for (let t = 0; t < this.smallL; t++)
			((this.tLR[t].cur = R.Damp(this.tLR[t].cur, this.tLR[t].tar, s)),
				(this.tRL[t].cur = R.Damp(this.tRL[t].cur, this.tRL[t].tar, s)),
				(this.thumb[t].style.clipPath =
					"inset(0 " +
					R.R(this.tRL[t].cur) +
					"% 0 " +
					R.R(this.tLR[t].cur) +
					"%)"));
	}
	show() {
		var t = _A;
		const a = t.t.e4.io.front,
			o = t.t.e4.o6;
		var s = t.t.tr.d,
			i = 0.5 * s,
			t = t.t.y.show.d + i;
		const l = s / t,
			n = i / t;
		R.Pause(this.fx);
		for (let t = 0; t < this.largeL; t++) {
			var e = this.large[t].move.ease;
			((e.maskTB = 1), (e.maskBT = 0), (e.scale = 0.3), (e.y = 0));
		}
		for (let t = 0; t < this.smallL; t++) {
			var r = this.small[t].move.ease;
			((r.maskTB = 0), (r.maskBT = 0), (r.y = 0));
		}
		return (
			(this.fx = new R.M({
				d: t,
				u: (t) => {
					var s = R.iLerp(0, l, t.pr),
						i = R.Lerp(1, 0, a(s)),
						e = R.Lerp(0.1, 0, a(s)) + R.Lerp(0.2, 0, o(t.pr)),
						r = R.Lerp(this.smallStart, this.smallEnd, o(R.iLerp(n, 1, t.pr)));
					for (let t = 0; t < this.largeL; t++) {
						var h = this.large[t].move.ease;
						((h.maskTB = i), (h.scale = e));
					}
					for (let t = 0; t < this.smallL; t++)
						this.small[t].move.ease.maskTB = r;
				},
			})),
			this.fx
		);
	}
	hide() {
		const a = _A,
			o = a.t.e4.io.front,
			l = a.t.e4.io.back;
		var t = a.t.tr.d;
		const n = a.data.sz[a.e.sz.index].video,
			d = -1 < n;
		R.Pause(this.fx);
		for (let t = 0; t < this.largeL; t++) {
			var s = this.large[t].move.ease;
			((s.maskTB = 0), (s.maskBT = 0), (s.scale = 0), (s.y = 0));
		}
		for (let t = 0; t < this.smallL; t++) {
			var i = this.small[t].move.ease;
			((i.maskTB = 0), (i.maskBT = 0), (i.y = 0));
		}
		return (
			(this.fx = new R.M({
				d: t,
				u: (t) => {
					var s = R.Lerp(0, 1, o(t.pr)),
						i = R.Lerp(0, a.tr.y, l(t.pr)),
						e = 1.5 * i,
						t = 0.5 * i;
					for (let t = 0; t < this.largeL; t++) {
						var r = this.large[t].move.ease;
						((r.maskBT = s), (r.y = i));
					}
					for (let t = 0; t < this.smallL; t++) {
						var h = this.small[t].move.ease;
						((h.maskBT = s), (h.y = e));
					}
					d && R.Def(this.thumb[n]) && R.T(this.thumb[n], 0, t, "px");
				},
			})),
			this.fx
		);
	}
};
class Bw {
	constructor() {
		R.BM(this, ["fn"]);
	}
	init() {
		((this.index = 1), (this.clr = R.G.class("sz-c-b-c")));
	}
	fn(t) {
		t = R.Index.class(t.target, "sz-c-b-c");
		this.index !== t &&
			(this.clr[this.index].classList.remove("fx"),
			this.clr[t].classList.add("fx"),
			(this.index = t),
			_A.e.sz.gl.setClr(0 === t ? 1 : 0));
	}
	l(t) {
		R.L(".sz-c-b-c", t, "click", this.fn);
	}
	on() {
		this.l("a");
	}
	off() {
		this.l("r");
	}
}
class Slider {
	constructor() {
		R.BM(this, ["fn"]);
	}
	init() {
		((this.h = R.G.class("sz-h")), (this.hL = this.h.length), (this.x = []));
		for (let t = 0; t < this.hL; t++)
			this.x[t] = {
				cur: 0,
				tar: 0,
			};
		((this.proCur_ = R.G.id("sz-c-p-c")),
			(this.proCur = this.proCur_.children[0]),
			(this.state = ""),
			this.peSet({
				a: "all",
				index: _A.e.sz.index,
			}),
			this.resize());
	}
	resize() {
		var t = _A,
			s = t.e.sz.index,
			t = t.winWpsdW;
		((this.xPos = [
			-400 * t,
			338 * t,
			950 * t,
			1444 * t,
			1760 * t,
			1996 * t,
			2232 * t,
		]),
			this.set({
				index: s,
				from: "resize",
			}));
	}
	loop() {
		for (let t = 0; t < this.hL; t++)
			((this.x[t].cur = R.Damp(this.x[t].cur, this.x[t].tar, 0.09)),
				R.T(this.h[t], this.x[t].cur, 0, "px"));
	}
	start(t) {
		(R.Pause(this.timer),
			(this.state = "A"),
			R.T(this.proCur, -100, 0),
			R.T(this.proCur_, 0, 0),
			(this.timer = new R.M({
				de: t.de,
				d: 5e3,
				u: (t) => {
					t = R.Lerp(-100, 0, t.pr);
					R.T(this.proCur, t, 0);
				},
				cb: (t) => {
					var s = R.Mod(_A.e.sz.index + 1, this.hL);
					this.run({
						index: s,
					});
				},
			})),
			this.timer.play());
	}
	fn(t) {
		t = R.Index.class(t.target, "sz-h");
		this.run({
			index: t,
		});
	}
	run(t) {
		var s = _A.e.sz,
			t = t.index;
		t !== s.index &&
			(R.Pause(this.timer),
			"B" === this.state && R.T(this.proCur, -100, 0),
			(this.state = "B"),
			(this.timer = new R.M({
				d: 1e3,
				u: (t) => {
					t = R.Lerp(0, 100.5, R.Ease.o6(t.pr));
					R.T(this.proCur_, t, 0);
				},
				cb: (t) => {
					this.start({
						de: 0,
					});
				},
			})),
			this.timer.play(),
			this.peSet({
				a: "none",
				index: s.index,
			}),
			this.peSet({
				a: "all",
				index: t,
			}),
			this.set({
				index: t,
				from: "fn",
			}),
			s.fx.slide({
				index: t,
			}),
			(s.index = t));
	}
	peSet(t) {
		var s = _A.data.sz[t.index].video;
		-1 < s && R.PE[t.a](R.G.class("sz-c-t")[s]);
	}
	set(t) {
		var s = _A,
			e = "resize" === t.from,
			r = s.e.sz.gl,
			h = t.index,
			a = s.win.w,
			o = 0.15 * a,
			t = 296 * s.winWpsdW,
			i = 22 * s.winWpsdW,
			l = (t + i) / a,
			n = i / a,
			d = 0.1 * t,
			p = s.data.sz;
		for (let i = 0; i < this.hL; i++) {
			var c = p[i].video;
			let t = i - h;
			(t > this.hL - 4 ? (t -= this.hL) : t < -3 && (t += this.hL),
				(t = R.Clamp(t, -2, 4)));
			var v = this.xPos[t + 2];
			let s = !0;
			(e || (s = (a < v && this.x[i].tar < 0) || (v < 0 && this.x[i].tar > a)),
				(this.x[i].tar = v),
				s && (this.x[i].cur = v));
			var u,
				v = 0 < t ? 1 : 0,
				m = t < 0 ? 1 : 0,
				f = 0 === t ? 0 : t < 0 ? -o : o;
			((r.lLR[i].tar = v),
				(r.lRL[i].tar = m),
				(r.lX[i].tar = f),
				s && ((r.lLR[i].cur = v), (r.lRL[i].cur = m), (r.lX[i].cur = f)),
				-1 < c &&
					((v = 0 === t ? 0 : t < 0 ? -d : d),
					(m = 0 < t ? 1 - n : 1 - l),
					(f = t < 0 ? l : n),
					(r.sLR[(u = c)].tar = m),
					(r.sRL[u].tar = f),
					(r.sX[u].tar = v),
					s) &&
					((r.sLR[u].cur = m), (r.sRL[u].cur = f), (r.sX[u].cur = v)),
				-1 < c &&
					((m = 0 < t ? 100 : 0),
					(f = t < 0 ? 100 : 0),
					(r.tLR[(u = c)].tar = m),
					(r.tRL[u].tar = f),
					s) &&
					((r.tLR[u].cur = m), (r.tRL[u].cur = f)));
		}
	}
	l(t) {
		R.L(".sz-h", t, "click", this.fn);
	}
	on() {
		this.l("a");
	}
	off() {
		(R.Pause(this.timer), this.l("r"));
	}
}
let Fx$5 = class {
	init() {
		var t = _A,
			s = t.e.sz.index,
			i = t.e.p(),
			e =
				((this.l = t.rgl._["/story-zoom"].planeL.large),
				(this.hn = R.G.class("sz-h-n", i)),
				(this.hl = R.G.class("sz-h-l", i)),
				R.G.class("sz-c-c"));
		this.cc = [];
		for (let t = 0; t < this.l; t++)
			this.cc[t] = new An({
				ch: 2,
				el: e[t],
				p: [["y", 110, -110]],
				de: 0.04,
			});
		((this.cb = R.G.id("sz-c-b").children[0]),
			(this.cpb = R.G.id("sz-c-p-b")),
			(this.cd = R.G.class("sz-c-d")));
		var r = R.G.class("sz-c-d-p");
		((this.cdpSL = []), (this.cdpVisible = []));
		for (let t = 0; t < this.l; t++)
			((this.cdpSL[t] = new SL({
				el: r[t],
			})),
				(this.cdpVisible[t] = !1));
		this.cdp = [];
		var h = R.G.class("sz-c-d");
		this.cdl = [];
		for (let t = 0; t < this.l; t++) {
			var a = R.G.class("sz-c-d-l", h[t])[0];
			R.Def(a)
				? (this.cdl[t] = new An({
						ch: 1,
						el: a,
						p: [["y", 110, -110]],
					}))
				: (this.cdl[t] = void 0);
		}
		this.ct = R.G.class("sz-c-t");
		i = t.data.sz[s].video;
		(-1 < i && R.O(this.ct[i], 0), this.resize());
	}
	resize() {
		for (let t = 0; t < this.l; t++) {
			var s = this.cdpVisible[t] ? 0 : -110;
			(this.cdpSL[t].resize({
				tag: {
					start:
						'<span class="y_"><span class="y" style="transform: translate3d(0,' +
						s +
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
	}
	showCT() {
		var t = _A,
			s = t.e.sz.index,
			s = t.data.sz[s].video,
			t = t.t.tr.d;
		return new R.M({
			el: this.ct[s],
			p: {
				o: [0, 1],
				scale: [2, 1],
			},
			d: 1300,
			e: "o6",
			r: 6,
			de: 200 + 0.5 * t,
		});
	}
	show(t) {
		const s = _A,
			e = t.de;
		var r = 1300,
			h = s.t.y.show.e;
		const i = s.e.sz.index;
		var a = i - 1;
		const o = new R.TL(),
			l = new R.TL();
		for (let i = 0; i < this.l; i++) {
			var n = R.Mod(i + a, this.l);
			let t = 0,
				s = 0;
			(0 === i ? ((t = e), (s = t + 200)) : i < 4 && ((t = 120), (s = t)),
				o.from({
					el: this.hn[n].children[0],
					p: {
						y: [101, 0],
					},
					d: r,
					e: h,
					de: t,
				}),
				l.from({
					el: this.hl[n].children[0],
					p: {
						y: [101, 0],
					},
					d: r,
					e: h,
					de: s,
				}));
		}
		const d = new R.M({
				el: this.cb,
				p: {
					y: [110, 0],
				},
				d: r,
				e: h,
				de: e,
			}),
			p = this.cc[i].m({
				a: "show",
				d: r,
				e: h,
				de: e + 200,
			}),
			c = new R.M({
				el: this.cpb,
				p: {
					x: [-101, 0],
				},
				d: 2e3,
				e: "io6",
				de: e - 200,
			}),
			v = this.cdp[i].m({
				a: "show",
				d: r,
				e: h,
				de: e + 300,
			});
		let u;
		const m = R.Def(this.cdl[i]);
		return (
			m &&
				(u = this.cdl[i].m({
					a: "show",
					d: r,
					e: h,
					de: e + 600,
				})),
			this.peA(i, "all"),
			{
				play: (t) => {
					((this.cdpVisible[i] = !0),
						s.e.sz.slider.start({
							de: e + 500,
						}),
						o.play(),
						l.play(),
						c.play(),
						p.play(),
						d.play(),
						v.play(),
						m && u.play());
				},
			}
		);
	}
	slide(t) {
		var s = _A,
			i = s.t.y.show.d,
			s = s.t.y.show.e,
			t = t.index,
			e = _A.e.sz.index,
			r = this.cc[e].m({
				a: "hide",
				d: 300,
				e: "i1",
				de: 0,
			}),
			h = this.cc[t].m({
				a: "show",
				d: i,
				e: s,
				de: 300,
			}),
			a = this.cdp[e].m({
				a: "hide",
				d: 300,
				e: "i1",
				de: 0,
			}),
			o = this.cdp[t].m({
				a: "show",
				d: i,
				e: s,
				de: 400,
			});
		let l;
		var n = R.Def(this.cdl[e]);
		n &&
			(l = this.cdl[e].m({
				a: "hide",
				d: 300,
				e: "i1",
				de: 0,
			}));
		let d;
		var p = R.Def(this.cdl[t]);
		(p &&
			(d = this.cdl[t].m({
				a: "show",
				d: i,
				e: s,
				de: 700,
			})),
			(this.cdpVisible[e] = !1),
			(this.cdpVisible[t] = !0),
			this.peA(e, "none"),
			this.peA(t, "all"),
			r.play(),
			a.play(),
			h.play(),
			o.play(),
			n && l.play(),
			p && d.play());
	}
	peA(t, s) {
		t = R.G.class("sz-c-d-l", this.cd[t]);
		0 < t.length && R.PE[s](t[0]);
	}
};
class SZ {
	constructor() {
		((this.gl = new GL$3()),
			(this.slider = new Slider()),
			(this.fx = new Fx$5()),
			(this.bw = new Bw()),
			(this.index = 0));
	}
	intro() {}
	init() {
		var t = _A.is;
		((this.rqd = t.sz),
			this.rqd &&
				(this.gl.init(), this.slider.init(), this.fx.init(), this.bw.init()));
	}
	resize() {
		this.rqd &&
			(this.gl.resize({
				from: "resize",
			}),
			this.slider.resize(),
			this.fx.resize());
	}
	loop() {
		this.rqd && (this.gl.loop(), this.slider.loop());
	}
	on() {
		this.rqd && (this.slider.on(), this.bw.on());
	}
	off() {
		this.rqd && (this.slider.off(), this.bw.off());
	}
}
let GL$2 = class {
	init() {
		var t = _A,
			t = ((this.url = t.route.new.url), t.rgl._[this.url]);
		((this.tex = t.plane.main),
			(this.texL = t.planeL.main),
			(this.imgL = this.texL / 5),
			(this.y = []),
			(this.img = R.G.class("p0-g")),
			(this.over = -1),
			(this.bw = []),
			(this.scale = []));
		for (let t = 0; t < this.imgL; t++)
			((this.bw[t] = {
				cur: 1,
				tar: 1,
			}),
				(this.scale[t] = {
					cur: 0,
					tar: 0,
				}));
		this.eY = [];
		for (let t = 0; t < this.imgL; t++) this.eY[t] = 0;
		this.resize();
	}
	resize() {
		var t = _A,
			s = t.e.s._[this.url].cur,
			i = t.winSemi.w;
		let e = 0;
		for (let t = 0; t < this.imgL; t++) {
			var r = R.Re(this.img[t]),
				h = r.width,
				a = r.height,
				o = r.left;
			this.y[t] = r.top + s;
			for (let t = 0; t < 5; t++) {
				var l = this.tex[e].move,
					n = l.lerp;
				((n.x = o), (n.w = h), (n.h = a), (l.ease.view = o + 0.5 * h - i), e++);
			}
		}
		this.texSet();
	}
	overFn() {
		var t = _A;
		let s = -1;
		var i = t.e.c._,
			e = i[0],
			r = i[1];
		for (let t = 0; t < this.imgL; t++) {
			var h = this.tex[5 * t].move.lerp,
				a = e >= h.x && e <= h.x + h.w,
				h = r >= h.y && r <= h.y + h.h;
			if (a && h) {
				s = t;
				break;
			}
		}
		this.over === s ||
			t.mutating ||
			(-1 !== this.over &&
				(t.e.p0.over.fx({
					a: "hide",
					index: this.over,
				}),
				(this.bw[this.over].tar = 1),
				(this.scale[this.over].tar = 0)),
			-1 !== s &&
				(t.e.p0.over.fx({
					a: "show",
					index: s,
				}),
				(this.bw[s].tar = 0),
				(this.scale[s].tar = 0.03)),
			(this.over = s));
	}
	loop() {
		(this.texSet(), this.overFn());
	}
	texSet() {
		var s = _A.e.s._[this.url].cur;
		let i = 0;
		for (let t = 0; t < this.imgL; t++) {
			var e = this.y[t] - s,
				r =
					((this.bw[t].cur = R.Damp(this.bw[t].cur, this.bw[t].tar, 0.09)),
					this.bw[t].cur),
				h =
					((this.scale[t].cur = R.Damp(
						this.scale[t].cur,
						this.scale[t].tar,
						0.05,
					)),
					this.scale[t].cur);
			for (let t = 0; t < 5; t++) {
				var a = this.tex[i].move;
				((a.lerp.y = e), (a.lerp.bw = r), (a.ease.scale = h), i++);
			}
		}
	}
	show(t) {
		const r = _A,
			h = r.t.e4.o6;
		var s = r.t.y.show.d,
			i = R.R(s / 0.9);
		const a = [];
		for (let t = 0; t < this.texL; t++) {
			var e = R.Clamp(t, 0, 2);
			a[t] = {
				start: 0.05 * e,
				end: 0.05 * e + 0.9,
			};
		}
		(R.Pause(this.fx), R.Pause(this.fx1));
		for (let t = 0; t < this.texL; t++) this.tex[t].move.ease.y = r.win.h;
		return (
			(this.fx = new R.M({
				d: i,
				de: t.de,
				u: (t) => {
					let i = 0;
					for (let s = 0; s < this.imgL; s++) {
						var e = h(R.iLerp(a[s].start, a[s].end, t.pr));
						this.eY[s] = R.Lerp(r.win.h, 0, e);
						for (let t = 0; t < 5; t++)
							((this.tex[i].move.ease.y = this.eY[s]), i++);
					}
				},
			})),
			(this.fx1 = new R.M({
				d: s + 1e3,
				de: t.de,
				u: (t) => {
					let s = 0;
					var i = h(t.pr),
						e = R.Ease.o2(t.pr);
					for (let t = 0; t < this.imgL; t++)
						for (let t = 0; t < 5; t++) {
							var r = this.tex[s].move.ease;
							((r.opacity = e),
								(r.z = R.Lerp(4 - t, 0, e)),
								(r.y1 = R.Lerp(40 * (4 - t), 0, i)),
								s++);
						}
				},
			})),
			{
				play: (t) => {
					(this.fx.play(), this.fx1.play());
				},
			}
		);
	}
	hide() {
		const h = _A,
			s = h.t.e4.io.front,
			a = h.t.e4.io.back;
		var t = h.t.tr.d;
		R.Pause(this.fx);
		const o = [];
		for (let t = 0; t < this.imgL; t++) o[t] = this.eY[t];
		return (
			(this.fx = new R.M({
				d: t,
				u: (t) => {
					var i = R.Lerp(0, 1, s(t.pr));
					let e = 0;
					for (let s = 0; s < this.imgL; s++) {
						this.eY[s] = R.Lerp(o[s], h.tr.y, a(t.pr));
						for (let t = 0; t < 5; t++) {
							var r = this.tex[e].move.ease;
							((r.y = this.eY[s]), (r.maskBT = i), e++);
						}
					}
				},
				cb: (t) => {
					for (let t = 0; t < this.texL; t++) {
						var s = this.tex[t].move.ease;
						((s.y = 0), (s.maskBT = 0));
					}
				},
			})),
			this.fx
		);
	}
};
class Over {
	init() {
		var t = _A.e.p("_"),
			i = R.G.class("p0-l", t),
			e = i.length;
		((this.tFx = []), (this.sFx = []));
		for (let s = 0; s < e; s++) {
			var r = R.G.class("p0-l-t", i[s])[0].children,
				h = r.length;
			this.tFx[s] = [];
			for (let t = 0; t < h; t++) {
				var a = 7 < r[t].children.length ? 0.015 : 0.02;
				this.tFx[s][t] = new An({
					ch: 1,
					el: r[t],
					p: [
						["y", 110, -110],
						["rotateX", -30, 8],
					],
					de: a,
				});
			}
			var o = R.G.class("p0-l-s", i[s])[0];
			this.sFx[s] = new An({
				ch: 1,
				el: o,
				p: [["y", 110, -110]],
			});
		}
	}
	fx(t) {
		const s = _A;
		var i = t.a,
			e = t.index,
			t = "show" === i,
			r = (t ? s.t.y.show : s.t.y.hideP0).d,
			h = (t ? s.t.y.show : s.t.y.hideP0).e,
			a = t ? 100 : 0,
			o = t ? 400 : 0,
			l = this.tFx[e].length,
			n = [];
		for (let t = 0; t < l; t++)
			n[t] = this.tFx[e][t].m({
				a: i,
				d: r,
				e: h,
				de: a * t,
			});
		o = this.sFx[e].m({
			a: i,
			d: r,
			e: h,
			de: o,
		});
		t
			? ((this.delay = new R.De(
					(t) => {
						s.canLoad = !0;
					},
					0.85 * r + a * (l - 1),
				)),
				this.delay.run())
			: (R.Stop(this.delay), (s.canLoad = !1));
		for (let t = 0; t < l; t++) n[t].play();
		o.play();
	}
}
let Fx$4 = class {
	init() {
		_A;
		var t = R.G.id("p0-h"),
			t = R.G.class("y_", t);
		this.hero = new An({
			ch: 1,
			el: t,
			p: [["y", 110, -110]],
		});
	}
	show(t) {
		var s = _A,
			t = t.de,
			s = s.t.y.show.d;
		const i = this.hero.m({
			a: "show",
			d: s,
			e: "o6",
			de: t,
		});
		return {
			play: (t) => {
				i.play();
			},
		};
	}
};
class P0 {
	constructor() {
		((this.gl = new GL$2()), (this.over = new Over()), (this.fx = new Fx$4()));
	}
	init() {
		((this.rqd = _A.is.p0),
			this.rqd && (this.gl.init(), this.over.init(), this.fx.init()));
	}
	resize() {
		this.rqd && this.gl.resize();
	}
	loop() {
		this.rqd && this.gl.loop();
	}
}
let GL$1 = class {
		constructor() {
			R.BM(this, ["fFn"]);
		}
		init() {
			var t = _A,
				t = ((this.url = t.route.new.url), t.rgl._[this.url]);
			((this.tex = t.plane.main),
				(this.texL = t.planeL.main),
				(this.y = []),
				(this.mScale = []),
				(this.mOn = []));
			for (let t = 0; t < this.texL; t++) {
				this.mOn[t] = 0 === t || t === this.texL - 2;
				var s = this.mOn[t] ? 1 : 1.1;
				this.mScale[t] = {
					cur: s,
					tar: s,
				};
			}
			((this.fOpacity = []), (this.fScale = []));
			for (let t = 0; t < 2; t++)
				((this.fOpacity[t] = {
					cur: 0,
					tar: 0,
				}),
					(this.fScale[t] = {
						cur: 1.1,
						tar: 1.1,
					}));
			this.resize();
		}
		resize() {
			var t = _A,
				s = t.e.s._[this.url].cur,
				i = R.G.class("r-i", t.e.p());
			for (let t = 0; t < this.texL; t++) {
				var e = R.Re(i[t]),
					r = e.top + s,
					h = this.tex[t].move.lerp;
				((h.x = e.left),
					(h.w = e.width),
					(h.h = e.height),
					(h.bw = 0),
					(this.y[t] = r));
			}
			var t = t.e.i._,
				a = t.length - 3;
			((this.lastPrlx = this.texL - 3),
				(this.range = [
					{
						s: t[0].range.s,
						e: t[0].range.e,
						factor: 0.3,
					},
					{
						s: t[a].range.s,
						e: t[a].range.e,
						factor: 0.1,
					},
				]),
				this.texSet());
		}
		loop() {
			this.texSet();
		}
		texSet() {
			var t = _A,
				s = t.e.s._[this.url].cur,
				i = t.win.h;
			for (let t = 0; t < this.texL; t++) {
				var e,
					r = this.tex[t].move;
				((r.lerp.y = this.y[t] - s),
					(0 !== t && t !== this.lastPrlx) ||
						((e = 0 === t ? 0 : 1),
						(e = this.range[e]),
						(r.ease.prlxy = R.Remap(e.s, e.e, -e.factor, e.factor, s))),
					0 < t &&
						t < this.lastPrlx &&
						(this.mOn[t] ||
							(s > this.y[t] - i &&
								((this.mOn[t] = !0), (this.mScale[t].tar = 1))),
						(this.mScale[t].cur = R.Damp(
							this.mScale[t].cur,
							this.mScale[t].tar,
							0.05,
						)),
						(r.lerp.scale = this.mScale[t].cur)),
					t > this.lastPrlx &&
						((e = t - (this.lastPrlx + 1)),
						(this.fOpacity[e].cur = R.Damp(
							this.fOpacity[e].cur,
							this.fOpacity[e].tar,
							0.25,
						)),
						(r.lerp.opacity = this.fOpacity[e].cur),
						(this.fScale[e].cur = R.Damp(
							this.fScale[e].cur,
							this.fScale[e].tar,
							0.09,
						)),
						(r.lerp.scale = this.fScale[e].cur)));
			}
		}
		fFn(t) {
			const s = _A;
			var i = "mouseenter" === t.type,
				e = R.Index.class(t.target, "p1-f-l");
			(t.target.classList[i ? "add" : "remove"]("fx"),
				(this.fOpacity[e].tar = i ? 1 : 0),
				(this.fScale[e].tar = i ? 1 : 1.1),
				i
					? ((this.delay = new R.De((t) => {
							s.canLoad = !0;
						}, 800)),
						this.delay.run())
					: (R.Stop(this.delay), (s.canLoad = !1)));
		}
		show() {
			var t = _A;
			const h = t.t.e4.io.front,
				a = t.t.e4.o6;
			var s = t.t.tr.d,
				t = t.t.y.show.d + 0.5 * s;
			const o = s / t;
			R.Pause(this.fx);
			for (let t = 0; t < this.texL; t++) {
				var i = this.tex[t].move.ease;
				((i.maskTB = 1), (i.maskBT = 0), (i.scale = 0.3), (i.y = 0));
			}
			return (
				(this.fx = new R.M({
					d: t,
					u: (t) => {
						var s = R.iLerp(0, o, t.pr),
							i = R.Lerp(1, 0, h(s)),
							e = R.Lerp(0.1, 0, h(s)) + R.Lerp(0.2, 0, a(t.pr));
						for (let t = 0; t < this.texL; t++) {
							var r = this.tex[t].move.ease;
							((r.maskTB = i), (r.scale = e));
						}
					},
				})),
				this.fx
			);
		}
		hide() {
			const r = _A,
				h = r.t.e4.io.front,
				a = r.t.e4.io.back;
			var t = r.t.tr.d,
				s = (R.Pause(this.fx), r.rgl._[r.route.old.url]);
			const o = s.plane.main,
				l = s.planeL.main;
			for (let t = 0; t < l; t++) {
				var i = o[t].move.ease;
				((i.maskTB = 0), (i.maskBT = 0), (i.scale = 0), (i.y = 0));
			}
			return (
				(this.fx = new R.M({
					d: t,
					u: (t) => {
						var s = R.Lerp(0, 1, h(t.pr)),
							i = R.Lerp(0, r.tr.y, a(t.pr));
						for (let t = 0; t < l; t++) {
							var e = o[t].move.ease;
							((e.maskBT = s), (e.y = i));
						}
					},
				})),
				this.fx
			);
		}
		l(s) {
			var i = ["enter", "leave"];
			for (let t = 0; t < 2; t++) R.L(".p1-f-l", s, "mouse" + i[t], this.fFn);
		}
		on() {
			this.l("a");
		}
		off() {
			this.l("r");
		}
	},
	Fx$3 = class {
		init() {
			var t = _A.e.p(),
				s = R.G.class("p1-h-t", t)[0].children,
				i = s.length;
			this.tFx = [];
			for (let t = 0; t < i; t++) {
				var e = 7 < s[t].children.length ? 0.016 : 0.022;
				this.tFx[t] = new An({
					ch: 1,
					el: s[t],
					p: [
						["y", 110, -110],
						["rotateX", -30, 8],
					],
					de: e,
				});
			}
			var r = R.G.class("p1-h-b", t)[0].children,
				h = r.length;
			this.bFx = [];
			for (let t = 0; t < h; t++)
				this.bFx[t] = new An({
					ch: 2,
					el: r[t].classList.contains("p1-h-b-1") ? r[t].children[0] : r[t],
					p: [["y", 110, -110]],
					de: 0.02,
				});
		}
		show(t) {
			var s = _A,
				i = s.t.y.show.d,
				e = s.t.y.show.e,
				r = t.de - 80;
			const h = this.tFx.length,
				a = [];
			for (let t = 0; t < h; t++)
				a[t] = this.tFx[t].m({
					a: "show",
					d: i,
					e: e,
					de: r + 150 * t,
				});
			const o = this.bFx.length,
				l = [];
			for (let t = 0; t < o; t++)
				l[t] = this.bFx[t].m({
					a: "show",
					d: i,
					e: e,
					de: 300 + r + 150 * t,
				});
			return {
				play: (t) => {
					for (let t = 0; t < h; t++) a[t].play();
					for (let t = 0; t < o; t++) l[t].play();
				},
			};
		}
	};
class P1 {
	constructor() {
		((this.gl = new GL$1()), (this.fx = new Fx$3()));
	}
	init() {
		((this.rqd = _A.is.p1), this.rqd && (this.gl.init(), this.fx.init()));
	}
	resize() {
		this.rqd && this.gl.resize();
	}
	on() {
		this.rqd && this.gl.on();
	}
	loop() {
		this.rqd && this.gl.loop();
	}
	off() {
		this.rqd && this.gl.off();
	}
}
class GL {
	init() {
		var t = _A,
			t = ((this.url = t.route.new.url), t.rgl._[this.url]);
		((this.tex = t.plane.main),
			(this.texL = t.planeL.main),
			(this.texMax = this.texL - 1),
			(this._3d = [
				{
					cur: 0,
					tar: 0,
				},
				{
					cur: 0,
					tar: 0,
				},
			]),
			(this.y = []),
			(this.img = R.G.id("ab-i")),
			this.resize());
	}
	resize() {
		var t = _A,
			s = t.e.s._[this.url].cur,
			i = t.winSemi.w,
			e = R.Re(this.img),
			r = e.top + s,
			h = e.left,
			a = e.width,
			o = e.height;
		for (let t = 0; t < this.texL; t++) {
			var l = this.tex[t].move,
				n = l.lerp,
				l = l.ease;
			((n.x = h),
				(n.w = a),
				(n.h = o),
				(n.opacity = 0.5),
				(l.view = h + 0.5 * a - i),
				(l.prlxx = -0.02 * (this.texL - 1 - t)),
				(this.y[t] = r));
		}
		((this.y_ = 200 * t.winWpsdW), this.texSet());
	}
	move3D() {
		var s = _A.e.c._Norm;
		for (let t = 0; t < 2; t++)
			this._3d[t].cur = R.Damp(this._3d[t].cur, s[t], 0.08);
		var i = this._3d[0].cur,
			e = this._3d[1].cur;
		for (let t = 0; t < this.texL; t++) {
			var r = this.tex[t].move.ease;
			((r.rx = i), (r.ry = e));
		}
	}
	loop() {
		(this.move3D(), this.texSet());
	}
	texSet() {
		var s = _A.e.s._[this.url].cur;
		for (let t = 0; t < this.texL; t++) this.tex[t].move.lerp.y = this.y[t] - s;
	}
	show(t) {
		var s = _A;
		const r = s.t.e4.o6;
		var i = s.t.y.show.d;
		(R.Pause(this.fx), R.Pause(this.fx1));
		for (let t = 0; t < this.texL; t++) {
			var e = this.tex[t].move.ease;
			((e.y = 0), (e.y1 = _A.win.h));
		}
		this.fx = new R.M({
			d: i + t.de,
			de: 0,
			u: (t) => {
				var s = r(t.pr),
					i = R.Lerp(0.25, 0, s);
				for (let t = 0; t < this.texL; t++) {
					var e = this.tex[t].move.ease;
					((e.scale = i), (e.y1 = R.Lerp(this.y_ * (this.texMax - t), 0, s)));
				}
			},
		});
		const h = s.t.e4.io.front;
		i = s.t.tr.d;
		return (
			(this.fx1 = new R.M({
				d: i,
				u: (t) => {
					var s = h(t.pr),
						i = R.Lerp(1, 0, s),
						e = R.Lerp(0, 1, s);
					for (let t = 0; t < this.texL; t++) {
						var r = this.tex[t].move.ease;
						((r.maskTB = i), (r.z = R.Lerp(0, this.texMax - t, s)), (r.rf = e));
					}
				},
			})),
			{
				play: (t) => {
					(this.fx.play(), this.fx1.play());
				},
			}
		);
	}
	hide() {
		const n = _A,
			d = n.t.e4.io.front,
			p = n.t.e4.io.back;
		var t = n.t.tr.d;
		return (
			R.Pause(this.fx),
			(this.fx = new R.M({
				d: t,
				u: (s) => {
					var t = p(s.pr),
						i = d(s.pr),
						e = R.Lerp(0, 1, i),
						r = R.Lerp(0, n.tr.y / n.win.h, t),
						h = R.Lerp(1, 0, t),
						a = R.Lerp(0.5, 0, R.iLerp(0, 0.6, s.pr));
					for (let t = 0; t < this.texL; t++) {
						var o = this.tex[t].move,
							l = o.ease;
						((l.maskBT = e),
							(l.prlxy = r),
							(l.z = R.Lerp(this.texMax - t, 0, i)),
							(l.rf = h),
							(o.lerp.opacity = a),
							(l.y = R.Lerp(0, n.tr.y, p(s.pr))));
					}
				},
				cb: (t) => {
					for (let t = 0; t < this.texL; t++) {
						var s = this.tex[t].move.ease;
						((s.maskBT = 0), (s.prlxy = 0));
					}
				},
			})),
			this.fx
		);
	}
}
class Ab {
	constructor() {
		this.gl = new GL();
	}
	init() {
		((this.rqd = _A.is.ab), this.rqd && this.gl.init());
	}
	resize() {
		this.rqd && this.gl.resize();
	}
	loop() {
		this.rqd && this.gl.loop();
	}
}
let Fx$2 = class {
		init() {
			this.vid = R.G.class("vi-v", _A.e.p("_"))[0].style;
		}
		run(t) {
			const s = _A;
			const i = "show" === t.a;
			t = s.t.tr.d;
			const e = s.t.e4.io.front,
				r = new R.M({
					d: t,
					u: (t) => {
						t = R.Lerp(s.win.h, 0, e(t.pr));
						this.vid.clipPath = "inset(" + R.R(t) + "px 0 0 0)";
					},
				});
			return {
				play: (t) => {
					i && (r.play(), s.e.vi.vid.run());
				},
			};
		}
	},
	Video$1 = class {
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
	},
	Vid$1 = class {
		constructor() {
			(R.BM(this, ["fn", "progFn", "outFn"]),
				(this.coord = [
					[
						"15.55,1 12.45,1 12.45,19 15.55,19 15.55,10",
						"7.55,1 4.45,1 4.45,19 7.55,19 7.55,10",
					],
					[
						"13.68432,7.33714 9,4.63288 9,15.36493 13.68432,12.66021 18.29423,10",
						"9,4.63288 2.70577,1 2.70577,19 9,15.36493 9,10",
					],
				]));
		}
		init() {
			var t = _A,
				s = t.e.p("_"),
				t = t.route.old.url;
			((this.v = R.G.class("vi-v", s)[0]),
				(this.prog_ = R.G.class("vi-c-m-p_", s)[0]),
				(this.prog = this.prog_.children[0]),
				(this.progC = this.prog.children[0]),
				(this.time = R.G.class("vi-c-m-t-t", s)[0]),
				(this.title = R.G.class("vi-c-m-t-i", s)[0]),
				(this.back = R.G.class("vi-b", s)[0]),
				(this.action = R.G.class("vi-c-m-a", s)[0]),
				(this.actionP = R.G.class("vi-c-m-a-p", s)),
				(this.bg = R.G.class("vi-c-b", s)[0]),
				(this.morph = []),
				(this.back.href = t || "/"),
				(this.lerp = 0.12),
				(this.opacity = {
					cur: 0,
					tar: 0,
				}),
				(this.vD = this.v.duration),
				(this.timeTxt = this.sToHms(this.v.currentTime)),
				(this.videoI = new Video$1({
					dom: this.v,
				})),
				(this.timer = new R.De((t) => {
					this.fx({
						a: "hide",
					});
				}, 1e3)),
				(this.visible = !1),
				(this.ready = !1),
				this.resize());
		}
		run() {
			((this.de = new R.De((t) => {
				this.ready = !0;
			}, 1100)),
				this.play(),
				this.de.run());
		}
		play() {
			this.videoI.play();
		}
		pause() {
			this.videoI.pause();
		}
		move() {
			_A.mutating ||
				(this.ready &&
					this.videoI.isPlaying &&
					(this.fx({
						a: "show",
					}),
					this.timer.stop(),
					this.timer.run()));
		}
		loop() {
			var t;
			this.ready &&
				((t = this.v.currentTime / this.vD),
				R.T(this.progC, R.R(R.Lerp(-100, 0, t)), 0),
				this.sToHms(this.v.currentTime) !== this.timeTxt &&
					((this.timeTxt = this.sToHms(this.v.currentTime)),
					(this.time.textContent = this.timeTxt)),
				(this.opacity.cur = R.Damp(
					this.opacity.cur,
					this.opacity.tar,
					this.lerp,
				)),
				R.Une(this.opacity.cur, this.opacity.tar, 6)) &&
				((t = R.R(this.opacity.cur, 6)),
				R.O(this.back, t),
				R.O(this.prog, t),
				R.O(this.time, t),
				R.O(this.title, t),
				R.O(this.action, t),
				R.O(this.bg, t));
		}
		fn() {
			if (this.ready) {
				this.timer.stop();
				let s = 0;
				this.videoI.isPlaying
					? (this.pause(),
						this.fx({
							a: "show",
						}),
						(s = 1))
					: (this.play(), this.timer.run());
				for (let t = 0; t < 2; t++)
					(R.Pause(this.morph[t]),
						(this.morph[t] = new R.M({
							el: this.actionP[t],
							svg: {
								type: "polygon",
								end: this.coord[s][t],
							},
							d: 300,
							e: "o3",
						})),
						this.morph[t].play());
			}
		}
		outFn() {
			this.ready &&
				this.videoI.isPlaying &&
				(this.timer.stop(),
				this.fx({
					a: "hide",
				}));
		}
		fx(t) {
			var t = "show" === t.a,
				s = t ? "all" : "none";
			(this.visible && t) ||
				((this.visible || t) &&
					((this.visible = t),
					R.PE[s](this.back),
					R.PE[s](this.prog_),
					R.PE[s](this.action),
					(this.lerp = t ? 0.12 : 0.25),
					(this.opacity.tar = t ? 1 : 0)));
		}
		resize() {
			var t = R.Re(this.prog_);
			((this.prog_X = t.left), (this.prog_W = t.width));
		}
		progFn(t) {
			t = (t.pageX - this.prog_X) / this.prog_W;
			this.v.currentTime = this.vD * t;
		}
		l(t) {
			(R.L(this.v, t, "click", this.fn),
				R.L(this.action, t, "click", this.fn),
				R.L(this.prog_, t, "click", this.progFn),
				R.L(document, t, "pointerleave", this.outFn));
		}
		on() {
			this.l("a");
		}
		off() {
			((this.ready = !1), this.l("r"), this.timer.stop(), this.de.stop());
		}
		sToHms(t) {
			t = Number(t);
			var s = Math.floor(t / 3600),
				i = Math.floor((t % 3600) / 60),
				t = Math.floor((t % 3600) % 60);
			return s + ":" + R.Pad(i, 2) + ":" + R.Pad(t, 2);
		}
	};
class Vi {
	constructor() {
		((this.fx = new Fx$2()), (this.vid = new Vid$1()));
	}
	init() {
		((this.rqd = _A.is.vi), this.rqd && (this.fx.init(), this.vid.init()));
	}
	resize() {
		this.rqd && this.vid.resize();
	}
	on() {
		this.rqd && this.vid.on();
	}
	loop() {
		this.rqd && this.vid.loop();
	}
	off() {
		this.rqd && this.vid.off();
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
			(this.p = Page$1),
			(this.raf = new R.Raf(this.loop)),
			(this.c = new C()),
			(this.s = new S()),
			(this.z = new Z()),
			(this.nav = new Nav()),
			(this.ho = new HO()),
			(this.in = new IN()),
			(this.st = new ST()),
			(this.se = new SE()),
			(this.ste = new STE()),
			(this.sz = new SZ()),
			(this.p0 = new P0()),
			(this.p1 = new P1()),
			(this.ab = new Ab()),
			(this.vi = new Vi()));
	}
	intro() {
		(this.s.intro(), this.nav.intro(), this.ste.intro());
	}
	init() {
		((_A.canLoad = !1),
			this.s.init(),
			(this.i = new I()),
			this.z.init({
				de: 0.5 * _A.t.tr.d,
			}),
			this.ho.init(),
			this.in.init(),
			this.st.init(),
			this.se.init(),
			this.ste.init(),
			this.sz.init(),
			this.p0.init(),
			this.p1.init(),
			this.ab.init(),
			this.vi.init());
	}
	resize() {
		(this.z.resizeB(),
			this.st.resizeB(),
			this.s.resize(),
			this.i.resize(),
			this.z.resizeA(),
			this.ho.resize(),
			this.in.resize(),
			this.ste.resize(),
			this.sz.resize(),
			this.p0.resize(),
			this.p1.resize(),
			this.ab.resize(),
			this.vi.resize());
	}
	run() {
		(new R.RO(this.resize).on(), this.raf.run(), this.c.run());
	}
	on() {
		(this.s.on(), this.sz.on(), this.p1.on(), this.se.on(), this.vi.on());
	}
	loop() {
		var t = _A;
		(this.s.loop(),
			this.z.loop(),
			this.ho.loop(),
			this.in.loop(),
			this.ste.loop(),
			this.sz.loop(),
			this.p0.loop(),
			this.p1.loop(),
			this.ab.loop(),
			this.vi.loop(),
			t.e.s.rqd && this.i.run());
	}
	off() {
		(this.s.off(), this.sz.off(), this.p1.off(), this.se.off(), this.vi.off());
	}
}
class Page {
	constructor(t) {
		const s = _A,
			i = s.e;
		var t = t.intro,
			e = s.is,
			r = s.was,
			h = e.st || e.se,
			a = r.st || r.se,
			o = h && a,
			l = 0.5 * s.t.tr.d;
		const n = [],
			d =
				((t
					? (e.vi
							? n.push(
									i.vi.fx.run({
										a: "show",
									}),
								)
							: ((t = !(!e.in && !e.sz)),
								n.push(
									i.nav.fx.right({
										t: t ? "close" : "menu",
										a: "show",
										de: 300 + l,
									}),
								),
								t ||
									n.push(
										i.nav.fx.logo({
											a: "show",
											de: 300 + l,
										}),
									)),
						h && !a
							? (n.push(
									i.ste.gl.show({
										de: l,
									}),
								),
								e.st
									? n.push(
											i.st.fx.run({
												a: "show",
												de: l,
												deTime: 800,
											}),
										)
									: e.se &&
										n.push(
											i.se.fx.run({
												a: "show",
												de: l,
											}),
										),
								n.push(
									i.ste.mode.fx({
										a: "show",
										de: l,
									}),
								))
							: e.sz
								? (n.push(i.sz.fx.showCT()),
									n.push(
										i.sz.fx.show({
											de: l,
										}),
									),
									n.push(i.sz.gl.show()))
								: e.p0
									? (n.push(
											i.p0.gl.show({
												de: l,
											}),
										),
										n.push(
											i.p0.fx.show({
												de: 200 + l,
											}),
										))
									: e.p1
										? (n.push(
												i.p1.fx.show({
													de: l,
												}),
											),
											n.push(
												i.p1.gl.show({
													de: 0,
												}),
											))
										: e.in
											? (n.push(
													i.in.fx.show({
														de: l,
													}),
												),
												n.push(
													i.in.gl.show({
														de: l,
													}),
												))
											: e.ho
												? (n.push(
														i.ho.gl.show({
															de: l,
														}),
													),
													n.push(
														i.ho.fx.show({
															de: 0,
														}),
													))
												: e.ab &&
													n.push(
														i.ab.gl.show({
															de: l,
														}),
													),
						(t = s.config.isLocal ? 0 : 500),
						new R.De((t) => {
							(i.on(), R.PE.none(R.G.id("lo")), (s.mutating = !1));
						}, t))
					: (!h && a
							? n.push(i.ste.gl.hide())
							: r.st && e.se
								? n.push(
										i.st.fx.run({
											a: "hide",
											de: 0,
											deTime: 0,
										}),
									)
								: r.se && e.st
									? n.push(
											i.se.fx.run({
												a: "hide",
												de: 0,
												deTime: 0,
											}),
										)
									: r.sz
										? n.push(i.sz.gl.hide())
										: r.p0
											? n.push(i.p0.gl.hide())
											: r.p1
												? n.push(i.p1.gl.hide())
												: r.ab
													? n.push(i.ab.gl.hide())
													: r.ho
														? n.push(i.ho.gl.hide())
														: r.in
															? n.push(i.in.gl.hide())
															: r.vi &&
																n.push(
																	i.vi.fx.run({
																		a: "hide",
																	}),
																),
						e.st &&
							n.push(
								i.st.fx.run({
									a: "show",
									de: o ? 100 : l,
									deTime: o ? 300 : 800,
								}),
							),
						e.se &&
							n.push(
								i.se.fx.run({
									a: "show",
									de: o ? 100 : l,
								}),
							),
						h
							? n.push(
									i.ste.mode.fx({
										a: "show",
										de: l,
									}),
								)
							: n.push(
									i.ste.mode.fx({
										a: "hide",
										de: 0,
									}),
								),
						h && n.push(i.ste.mode.arrowRotate()),
						e.vi
							? r.in || r.sz
								? n.push(
										i.nav.fx.right({
											t: "close",
											a: "hide",
										}),
									)
								: (n.push(
										i.nav.fx.right({
											t: "menu",
											a: "hide",
										}),
									),
									n.push(
										i.nav.fx.logo({
											a: "hide",
										}),
									))
							: r.vi
								? e.in || e.sz
									? n.push(
											i.nav.fx.right({
												t: "close",
												a: "show",
											}),
										)
									: (n.push(
											i.nav.fx.right({
												t: "menu",
												a: "show",
											}),
										),
										n.push(
											i.nav.fx.logo({
												a: "show",
											}),
										))
								: e.in || e.sz
									? (n.push(
											i.nav.fx.right({
												t: "menu",
												a: "hide",
											}),
										),
										n.push(
											i.nav.fx.logo({
												a: "hide",
											}),
										),
										n.push(
											i.nav.fx.right({
												t: "close",
												a: "show",
											}),
										))
									: (r.in || r.sz) &&
										(n.push(
											i.nav.fx.right({
												t: "close",
												a: "hide",
											}),
										),
										n.push(
											i.nav.fx.right({
												t: "menu",
												a: "show",
											}),
										),
										n.push(
											i.nav.fx.logo({
												a: "show",
											}),
										)),
						h && !a
							? n.push(
									i.ste.gl.show({
										de: l,
									}),
								)
							: e.sz
								? (n.push(i.sz.gl.show()),
									n.push(i.sz.fx.showCT()),
									n.push(
										i.sz.fx.show({
											de: l,
										}),
									))
								: e.p0
									? (n.push(
											i.p0.gl.show({
												de: l,
											}),
										),
										n.push(
											i.p0.fx.show({
												de: 200 + l,
											}),
										))
									: e.p1
										? (n.push(
												i.p1.gl.show({
													de: l,
												}),
											),
											n.push(
												i.p1.fx.show({
													de: l,
												}),
											))
										: e.ab
											? n.push(
													i.ab.gl.show({
														de: l,
													}),
												)
											: e.ho
												? (n.push(
														i.ho.gl.show({
															de: l,
														}),
													),
													n.push(
														i.ho.fx.show({
															de: 0,
														}),
													))
												: e.in
													? (n.push(
															i.in.fx.show({
																de: l,
															}),
														),
														n.push(
															i.in.gl.show({
																de: l,
															}),
														))
													: e.ab
														? n.push(
																i.ab.gl.show({
																	de: l,
																}),
															)
														: e.vi &&
															n.push(
																i.vi.fx.run({
																	a: "show",
																}),
															),
						(t = (o ? s.t.y.hideST0 : s.t.tr).d),
						new R.De(
							(t) => {
								i.on();
							},
							o ? 100 : 300,
						).run(),
						new R.De((t) => {
							(s.page.removeOld(), (s.mutating = !1));
						}, t))
				).run(),
				n.length);
		return {
			play: (t) => {
				for (let t = 0; t < d; t++) n[t].play();
			},
		};
	}
}
let Fx$1 = class {
	constructor() {
		var t = _A,
			s = t.config.isLocal,
			t = t.t.tr.d,
			s = s ? 0 : 300,
			i = new Page({
				intro: !0,
			}),
			e = new R.TL();
		(e.from({
			el: "#lo-bg",
			p: {
				y: [0, -100],
			},
			d: t,
			e: [0.76, 0, 0.2, 1],
			de: s,
		}),
			i.play(),
			e.play());
	}
};
class Act {
	constructor(t) {
		var s = _A;
		((this.t = t),
			(this.prop = Object.keys(s.data.gl.li)),
			(this._ = {}),
			(this._L = this.prop.length),
			this.static());
	}
	static() {
		var s = _A.route.new[this.t];
		for (let t = 0; t < this._L; t++) {
			var i = this.prop[t];
			R.isStory(i) ? (this._[i] = R.isStory(s)) : (this._[i] = i === s);
		}
	}
	mutation() {
		var s = _A.route;
		for (let t = 0; t < this._L; t++) {
			var i = this.prop[t];
			R.isStory(i)
				? (this._[i] = R.isStory(s.new[this.t]) || R.isStory(s.old[this.t]))
				: (this._[i] = i === s.new[this.t] || i === s.old[this.t]);
		}
	}
}
function create() {
	var t = new Float32Array(16);
	return ((t[0] = 1), (t[5] = 1), (t[10] = 1), (t[15] = 1), t);
}
function identity(t) {
	return (
		(t[0] = 1),
		(t[1] = 0),
		(t[2] = 0),
		(t[3] = 0),
		(t[4] = 0),
		(t[5] = 1),
		(t[6] = 0),
		(t[7] = 0),
		(t[8] = 0),
		(t[9] = 0),
		(t[10] = 1),
		(t[11] = 0),
		(t[12] = 0),
		(t[13] = 0),
		(t[14] = 0),
		(t[15] = 1),
		t
	);
}
function invert(t, s) {
	var i = s[0],
		e = s[1],
		r = s[2],
		h = s[3],
		a = s[4],
		o = s[5],
		l = s[6],
		n = s[7],
		d = s[8],
		p = s[9],
		c = s[10],
		v = s[11],
		u = s[12],
		m = s[13],
		f = s[14],
		s = s[15],
		R = c * s,
		g = f * v,
		y = l * s,
		w = f * n,
		x = l * v,
		L = c * n,
		_ = r * s,
		b = f * h,
		A = r * v,
		z = c * h,
		T = r * n,
		S = l * h,
		M = d * m,
		P = u * p,
		D = a * m,
		G = u * o,
		k = a * p,
		F = d * o,
		E = i * m,
		B = u * e,
		O = i * p,
		I = d * e,
		N = i * o,
		H = a * e,
		C = R * o + w * p + x * m - (g * o + y * p + L * m),
		q = g * e + _ * p + z * m - (R * e + b * p + A * m),
		m = y * e + b * o + T * m - (w * e + _ * o + S * m),
		e = L * e + A * o + S * p - (x * e + z * o + T * p),
		o = 1 / (i * C + a * q + d * m + u * e);
	return (
		(t[0] = o * C),
		(t[1] = o * q),
		(t[2] = o * m),
		(t[3] = o * e),
		(t[4] = o * (g * a + y * d + L * u - (R * a + w * d + x * u))),
		(t[5] = o * (R * i + b * d + A * u - (g * i + _ * d + z * u))),
		(t[6] = o * (w * i + _ * a + S * u - (y * i + b * a + T * u))),
		(t[7] = o * (x * i + z * a + T * d - (L * i + A * a + S * d))),
		(t[8] = o * (M * n + G * v + k * s - (P * n + D * v + F * s))),
		(t[9] = o * (P * h + E * v + I * s - (M * h + B * v + O * s))),
		(t[10] = o * (D * h + B * n + N * s - (G * h + E * n + H * s))),
		(t[11] = o * (F * h + O * n + H * v - (k * h + I * n + N * v))),
		(t[12] = o * (D * c + F * f + P * l - (k * f + M * l + G * c))),
		(t[13] = o * (O * f + M * r + B * c - (E * c + I * f + P * r))),
		(t[14] = o * (E * l + H * f + G * r - (N * f + D * r + B * l))),
		(t[15] = o * (N * c + k * r + I * l - (O * l + H * c + F * r))),
		t
	);
}
function perspective(t, s, i, e, r) {
	var s = 1 / Math.tan(0.5 * s),
		h = 1 / (e - r);
	return (
		(t[0] = s / i),
		(t[1] = 0),
		(t[2] = 0),
		(t[3] = 0),
		(t[4] = 0),
		(t[5] = s),
		(t[6] = 0),
		(t[7] = 0),
		(t[8] = 0),
		(t[9] = 0),
		(t[10] = (r + e) * h),
		(t[11] = -1),
		(t[12] = 0),
		(t[13] = 0),
		(t[14] = 2 * r * e * h),
		(t[15] = 0),
		t
	);
}
function multiplyFn(t, s) {
	return multiply(t, t, s);
}
function multiply(t, s, i) {
	var e = i[0],
		r = i[1],
		h = i[2],
		a = i[3],
		o = i[4],
		l = i[5],
		n = i[6],
		d = i[7],
		p = i[8],
		c = i[9],
		v = i[10],
		u = i[11],
		m = i[12],
		f = i[13],
		R = i[14],
		i = i[15],
		g = s[0],
		y = s[1],
		w = s[2],
		x = s[3],
		L = s[4],
		_ = s[5],
		b = s[6],
		A = s[7],
		z = s[8],
		T = s[9],
		S = s[10],
		M = s[11],
		P = s[12],
		D = s[13],
		G = s[14],
		s = s[15];
	return (
		(t[0] = e * g + r * L + h * z + a * P),
		(t[1] = e * y + r * _ + h * T + a * D),
		(t[2] = e * w + r * b + h * S + a * G),
		(t[3] = e * x + r * A + h * M + a * s),
		(t[4] = o * g + l * L + n * z + d * P),
		(t[5] = o * y + l * _ + n * T + d * D),
		(t[6] = o * w + l * b + n * S + d * G),
		(t[7] = o * x + l * A + n * M + d * s),
		(t[8] = p * g + c * L + v * z + u * P),
		(t[9] = p * y + c * _ + v * T + u * D),
		(t[10] = p * w + c * b + v * S + u * G),
		(t[11] = p * x + c * A + v * M + u * s),
		(t[12] = m * g + f * L + R * z + i * P),
		(t[13] = m * y + f * _ + R * T + i * D),
		(t[14] = m * w + f * b + R * S + i * G),
		(t[15] = m * x + f * A + R * M + i * s),
		t
	);
}
function translateFn(t, s) {
	return translate(t, t, s);
}
function translate(t, s, i) {
	var e,
		r,
		h,
		a,
		o,
		l,
		n,
		d,
		p,
		c,
		v,
		u,
		m = i[0],
		f = i[1],
		i = i[2];
	return (
		s === t
			? ((t[12] = s[0] * m + s[4] * f + s[8] * i + s[12]),
				(t[13] = s[1] * m + s[5] * f + s[9] * i + s[13]),
				(t[14] = s[2] * m + s[6] * f + s[10] * i + s[14]),
				(t[15] = s[3] * m + s[7] * f + s[11] * i + s[15]))
			: ((e = s[0]),
				(r = s[1]),
				(h = s[2]),
				(a = s[3]),
				(o = s[4]),
				(l = s[5]),
				(n = s[6]),
				(d = s[7]),
				(p = s[8]),
				(c = s[9]),
				(v = s[10]),
				(u = s[11]),
				(t[0] = e),
				(t[1] = r),
				(t[2] = h),
				(t[3] = a),
				(t[4] = o),
				(t[5] = l),
				(t[6] = n),
				(t[7] = d),
				(t[8] = p),
				(t[9] = c),
				(t[10] = v),
				(t[11] = u),
				(t[12] = e * m + o * f + p * i + s[12]),
				(t[13] = r * m + l * f + c * i + s[13]),
				(t[14] = h * m + n * f + v * i + s[14]),
				(t[15] = a * m + d * f + u * i + s[15])),
		t
	);
}
function scaleFn(t, s) {
	return scale(t, t, s);
}
function scale(t, s, i) {
	var e = i[0],
		r = i[1],
		i = i[2];
	return (
		(t[0] = s[0] * e),
		(t[1] = s[1] * e),
		(t[2] = s[2] * e),
		(t[3] = s[3] * e),
		(t[4] = s[4] * r),
		(t[5] = s[5] * r),
		(t[6] = s[6] * r),
		(t[7] = s[7] * r),
		(t[8] = s[8] * i),
		(t[9] = s[9] * i),
		(t[10] = s[10] * i),
		(t[11] = s[11] * i),
		(t[12] = s[12]),
		(t[13] = s[13]),
		(t[14] = s[14]),
		(t[15] = s[15]),
		t
	);
}
function rotateFn(t, s, i) {
	return rotate(t, t, s, i);
}
function rotate(t, s, i, e) {
	var r = e[0],
		h = e[1],
		e = e[2],
		a = Math.hypot(r, h, e);
	if (Math.abs(a) < 1e-6) return null;
	((r *= a = 1 / a), (h *= a), (e *= a));
	var a = Math.sin(i),
		i = Math.cos(i),
		o = 1 - i,
		l = s[0],
		n = s[1],
		d = s[2],
		p = s[3],
		c = s[4],
		v = s[5],
		u = s[6],
		m = s[7],
		f = s[8],
		R = s[9],
		g = s[10],
		y = s[11],
		w = r * r * o + i,
		x = h * r * o + e * a,
		L = e * r * o - h * a,
		_ = r * h * o - e * a,
		b = h * h * o + i,
		A = e * h * o + r * a,
		z = r * e * o + h * a,
		h = h * e * o - r * a,
		r = e * e * o + i;
	return (
		(t[0] = l * w + c * x + f * L),
		(t[1] = n * w + v * x + R * L),
		(t[2] = d * w + u * x + g * L),
		(t[3] = p * w + m * x + y * L),
		(t[4] = l * _ + c * b + f * A),
		(t[5] = n * _ + v * b + R * A),
		(t[6] = d * _ + u * b + g * A),
		(t[7] = p * _ + m * b + y * A),
		(t[8] = l * z + c * h + f * r),
		(t[9] = n * z + v * h + R * r),
		(t[10] = d * z + u * h + g * r),
		(t[11] = p * z + m * h + y * r),
		s !== t &&
			((t[12] = s[12]), (t[13] = s[13]), (t[14] = s[14]), (t[15] = s[15])),
		t
	);
}
class Cam {
	constructor() {
		((this.aspect = 1),
			(this.state = {
				x: null,
			}),
			(this.projectionM4 = create()),
			(this.camM4 = create()));
	}
	resize(t) {
		var s = _A,
			i = s.rgl,
			t = (t && (this.aspect = t.aspect), Math.PI),
			s =
				((this.projectionM4 = perspective(
					this.projectionM4,
					(t / 180) * 45,
					this.aspect,
					1,
					2500,
				)),
				s.winSemi);
		this.posOrigin = {
			x: s.w,
			y: -s.h,
			z: s.h / Math.tan((45 * t) / 360),
		};
		for (let t = 0; t < i.pgmL; t++)
			i.pgm[i.pgmType[t]].uniform.c.v = this.projectionM4;
		this.render({
			x: null,
		});
	}
	render(t) {
		return (
			this.state.x !== t.x &&
				((this.state.x = t.x),
				(this.camM4 = identity(this.camM4)),
				(this.camM4 = translateFn(this.camM4, [
					this.posOrigin.x + t.x,
					this.posOrigin.y,
					this.posOrigin.z + t.z,
				])),
				(this.viewM4 = invert(this.camM4, this.camM4))),
			this.viewM4
		);
	}
}
class Ren {
	constructor() {
		((this.gl = _A.rgl.gl),
			(this.first = !0),
			(this.state = {
				pgmCur: null,
				viewport: {
					x: 0,
					w: 0,
					h: 0,
				},
				framebuffer: null,
				face: null,
			}),
			this.blend(),
			this.gl.getExtension("OES_standard_derivatives"));
		var s = this.gl.getExtension("OES_vertex_array_object"),
			i = ["create", "bind"];
		this.vertexArray = {};
		for (let t = 0; t < 2; t++) {
			var e = i[t];
			this.vertexArray[e] = s[e + "VertexArrayOES"].bind(s);
		}
		((this.size = {
			w: 0,
			h: 0,
		}),
			(this.cam = new Cam()),
			(this.roRqd = !1));
	}
	viewport(t, s, i) {
		var e = this.state.viewport;
		(e.x === t && e.w === s && e.h === i) ||
			((e.x = t),
			(e.w = s),
			(e.h = i),
			this.gl.viewport(t * this.dpr, 0, s, i));
	}
	framebuffer(t) {
		this.state.framebuffer !== t &&
			((this.state.framebuffer = t),
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, t));
	}
	face(t) {
		this.state.face !== t &&
			((this.state.face = t),
			this.gl.enable(this.gl.CULL_FACE),
			this.gl.cullFace(this.gl[t]));
	}
	blend() {
		var t = this.gl;
		(t.enable(t.BLEND),
			t.blendFuncSeparate(
				t.SRC_ALPHA,
				t.ONE_MINUS_SRC_ALPHA,
				t.ONE,
				t.ONE_MINUS_SRC_ALPHA,
			));
	}
	resize() {
		var t = _A,
			s = t.win,
			i = this.gl;
		let e = 2;
		(s.w < 600 ? (e = 3) : 1920 < s.w && (e = 1.5),
			(this.dpr = Math.min(devicePixelRatio, e)));
		var r = s.w * this.dpr,
			s = s.h * this.dpr;
		((i.canvas.width = r),
			(i.canvas.height = s),
			(this.size.w === r && this.size.h === s) ||
				(this.cam.resize({
					aspect: i.canvas.width / i.canvas.height,
				}),
				t.rgl.clear(),
				(this.size.w = r),
				(this.size.h = s),
				(this.roRqd = !0)));
	}
	render(s) {
		var t = _A.rgl,
			i = t.act;
		t.rqd = !1;
		for (let t = 0; t < i._L; t++) {
			var e = i.prop[t];
			(i._[e] || this.first) && R.Def(s[e]) && s[e].moving();
		}
		for (let t = 0; t < i._L; t++) {
			var r = i.prop[t];
			(i._[r] || this.first) && R.Def(s[r]) && s[r].draw();
		}
		(this.first && (this.first = !1), this.roRqd && (this.roRqd = !1));
	}
}
class Pgm {
	constructor(t) {
		var s = _A.rgl,
			s =
				((this.gl = s.gl),
				(this.ren = s.ren),
				(this.uniform = t.uniform),
				(this.pts = t.pts),
				(this.name = t.name),
				(this.fbo = R.Def(t.fbo)),
				(this.pgm = this.crP(t.shader)),
				this.uniform);
		((s.c = {
			t: "Matrix4fv",
		}),
			(s.d = {
				t: "Matrix4fv",
			}),
			this.getL(s, "Uniform"));
	}
	crP(t) {
		var s = this.gl,
			i = [
				this.crS(t.vertex, s.VERTEX_SHADER),
				this.crS(t.fragment, s.FRAGMENT_SHADER),
			],
			e = s.createProgram();
		for (let t = 0; t < 2; t++) s.attachShader(e, i[t]);
		s.linkProgram(e);
		for (let t = 0; t < 2; t++) s.deleteShader(i[t]);
		return e;
	}
	crS(t, s) {
		s = this.gl.createShader(s);
		return (this.gl.shaderSource(s, t), this.gl.compileShader(s), s);
	}
	getL(t, s) {
		for (const i in t)
			R.Has(t, i) &&
				(t[i].location = this.gl["get" + s + "Location"](this.pgm, i));
	}
	setUniform() {
		for (const r in this.uniform) {
			var t, s, i, e;
			R.Has(this.uniform, r) &&
				((s = (t = this.uniform[r]).location),
				(e = "uniform" + (i = t.t)),
				"Matrix" === i.substring(0, 6)
					? this.gl[e](s, !1, t.v)
					: this.gl[e](s, t.v));
		}
	}
	run() {
		((this.texIndex = -1),
			this.ren.state.pgmCur !== this.name &&
				(this.gl.useProgram(this.pgm), (this.ren.state.pgmCur = this.name)));
	}
}
class Geo {
	constructor(t) {
		var s = _A.rgl;
		((this.gl = s.gl),
			(this.ren = s.ren),
			(this.pgm = t.pgm),
			(this.mode = t.mode),
			(this.face = t.face),
			(this.attrib = t.attrib),
			(this.type = t.type),
			this.ren.vertexArray.bind(null),
			this.pgm.getL(this.attrib, "Attrib"),
			(this.modelM4 = create()));
	}
	setVAO() {
		var t = this.ren;
		((this.vao = t.vertexArray.create()),
			t.vertexArray.bind(this.vao),
			this.setAttrib(),
			t.vertexArray.bind(null));
	}
	setAttrib() {
		var t,
			s,
			i,
			e = this.gl;
		for (const r in this.attrib)
			R.Has(this.attrib, r) &&
				((t = this.attrib[r]),
				(s = "index" === r),
				(i = t.data.constructor) === Float32Array
					? (t.type = e.FLOAT)
					: i === Uint16Array
						? (t.type = e.UNSIGNED_SHORT)
						: (t.type = e.UNSIGNED_INT),
				(t.count = t.data.length / t.size),
				(t.target = s ? e.ELEMENT_ARRAY_BUFFER : e.ARRAY_BUFFER),
				(t.normalize = !1),
				e.bindBuffer(t.target, e.createBuffer()),
				e.bufferData(t.target, t.data, e.STATIC_DRAW),
				s ||
					(e.enableVertexAttribArray(t.location),
					e.vertexAttribPointer(
						t.location,
						t.size,
						t.type,
						t.normalize,
						0,
						0,
					)));
	}
	draw(i) {
		var s = this.gl,
			t = this.ren,
			e = i.move,
			r = e.lerp,
			e = e.ease,
			h = e.view,
			t =
				(t.framebuffer(null),
				t.viewport(h, s.canvas.width, s.canvas.height),
				t.face(this.face),
				this.pgm.run(),
				(this.modelM4 = identity(this.modelM4)),
				t.cam.render({
					x: h,
					y: 0,
					z: 0,
				})),
			h = multiplyFn(this.modelM4, t),
			t = r.x + e.x,
			a = r.y + e.y + e.y1,
			o = r.w,
			l = r.h,
			n = t + o / 2,
			d = a + l / 2,
			n =
				((h = rotateFn(translateFn(h, [n, -d, 0]), e.rx * e.rf, [0, 1, 0])),
				(h = translateFn(rotateFn(h, e.ry * e.rf, [1, 0, 0]), [-n, d, 0])),
				(h = scaleFn(
					rotateFn(translateFn(h, [t, -a, 0]), r.rotate, [1, 0, 0]),
					[o, l, 1],
				)),
				this.pgm.uniform);
		if (0 < this.type) {
			let t = 1,
				s = i.media.wh / (o / l);
			s < 1 && ((t = 1 / s), (s = 1));
			d = r.scale + e.scale;
			n.e.v = [s * d, t * d];
		} else n.e.v = [1, 1];
		if (
			((n.z.v = -50 * e.z),
			(n.k.v = this.type),
			(n.l.v = r.opacity * e.opacity),
			(n.m.v = r.bw),
			(n.n.v = r.lumi),
			(n.p.v = [e.maskTB, e.maskBT]),
			(n.o.v = [e.maskLR, e.maskRL]),
			(n.q.v = e.maskYNorm),
			(n.g.v = [e.prlxx, e.prlxy]),
			(n.d.v = h),
			this.pgm.setUniform(),
			0 < this.type)
		) {
			var p,
				c = this.attrib.b.tex,
				v = c.length,
				u = i.media.data;
			for (let t = 0; t < v; t++)
				(this.tex(c[t]),
					u[t].v &&
						(p = u[t].element)._.isPlaying &&
						s.texImage2D(
							s.TEXTURE_2D,
							0,
							s.RGBA,
							s.RGBA,
							s.UNSIGNED_BYTE,
							p.dom,
						));
		}
		this.drawGL();
	}
	tex(t) {
		var s = this.gl,
			i = this.pgm;
		((i.texIndex = i.texIndex + 1),
			s.activeTexture(s["TEXTURE" + i.texIndex]),
			s.bindTexture(s.TEXTURE_2D, t));
	}
	drawGL() {
		this.ren.vertexArray.bind(this.vao);
		var t = this.attrib.index;
		this.gl.drawElements(this.gl[this.mode], t.count, t.type, 0);
	}
}
function Media(t) {
	var s = t.p,
		i = t.z,
		t = {
			mode: "TRIANGLE_STRIP",
		},
		e = "LINES" !== t.mode;
	const r = s.h,
		h = s.v,
		a = r - 1,
		o = h - 1,
		l = 1 / a,
		n = 1 / o;
	var d = [];
	let p = 0;
	if (e)
		for (let t = 0; t < h; t++) {
			var c = t * n - 1;
			for (let t = 0; t < r; t++)
				((d[p++] = t * l), (d[p++] = c), i && (d[p++] = 0));
		}
	else
		for (let s = 0; s < h; s++) {
			var v = s * n,
				u = v + n;
			for (let t = 0; t < r; t++) {
				var m = t * l,
					f = m + l;
				(t < a &&
					((d[p++] = m),
					(d[p++] = -v),
					i && (d[p++] = 0),
					(d[p++] = f),
					(d[p++] = -v),
					i) &&
					(d[p++] = 0),
					s < o &&
						((d[p++] = m),
						(d[p++] = -v),
						i && (d[p++] = 0),
						(d[p++] = m),
						(d[p++] = -u),
						i) &&
						(d[p++] = 0));
			}
		}
	t.pos = {
		arr: d,
		size: i ? 3 : 2,
	};
	var R = [];
	if (e) {
		let i = 0;
		var g = h - 1,
			y = h - 2,
			w = r - 1;
		for (let s = 0; s < g; s++) {
			var x = r * s,
				L = x + r,
				_ = r * (s + 1);
			for (let t = 0; t < r; t++) {
				var b = L + t;
				((R[i++] = x + t),
					(R[i++] = b),
					t === w && s < y && ((R[i++] = b), (R[i++] = _)));
			}
		}
	}
	t.index = R;
	var A = [];
	if (e) {
		let s = 0;
		for (let t = 0; t < h; t++) {
			var z = 1 - t / o;
			for (let t = 0; t < r; t++) ((A[s++] = t / a), (A[s++] = z));
		}
	}
	return ((t.uv = A), t);
}
class PMedia {
	constructor(t) {
		var s = _A,
			t =
				((this.pgm = t.p),
				(this.prop = t.prop),
				"/index" === this.prop ||
					"/story" === this.prop ||
					"/projects" === this.prop ||
					"/about" === this.prop),
			i =
				((this.mutli = t ? 5 : 1),
				(this._ = {
					lerp: {
						x: 0,
						y: 0,
						w: 0,
						h: 0,
						scale: 1,
						opacity: 1,
						bw: 0,
						lumi: 1,
						rotate: 0,
					},
					ease: {
						x: 0,
						y: 0,
						y1: 0,
						scale: 0,
						opacity: 1,
						maskLR: 0,
						maskRL: 0,
						maskTB: 0,
						maskBT: 0,
						maskYNorm: 0,
						prlxx: 0,
						prlxy: 0,
						z: 0,
						rx: 0,
						ry: 0,
						rf: 0,
						view: 0,
					},
				}),
				{
					lerp: ["scale", "opacity", "rotate"],
					ease: [
						"scale",
						"opacity",
						"maskLR",
						"maskRL",
						"maskTB",
						"maskBT",
						"maskYNorm",
						"prlxx",
						"prlxy",
						"z",
						"rx",
						"ry",
						"rf",
					],
				}),
			e =
				((this.data = Media({
					p: this.pgm.pts,
					z: !1,
				})),
				Object.keys(this._)),
			r = e.length;
		let h = 0;
		this.all = [];
		for (let t = 0; t < r; t++) {
			var a = e[t],
				o = Object.keys(this._[a]),
				l = o.length;
			for (let t = 0; t < l; t++) {
				var n = o[t];
				((this.all[h] = {
					type: a,
					prop: n,
					r: i[a].includes(n) ? 6 : 3,
				}),
					h++);
			}
		}
		((this.allL = h), (this.lerp = []));
		var d = Object.keys(this._.lerp),
			p = d.length;
		for (let t = 0; t < p; t++) {
			var c = d[t];
			this.lerp[t] = {
				prop: c,
				r: i.lerp.includes(c) ? 6 : 2,
			};
		}
		((this.media = s.rgl.media[this.prop]),
			(this.mediaName = Object.keys(this.media)),
			(this.mediaNameL = this.mediaName.length),
			(this.plane = {}),
			(this.planeL = {}),
			(this.wh = {}));
		for (let t = 0; t < this.mediaNameL; t++) {
			var v = this.mediaName[t],
				u = this.media[v],
				m = u.length;
			this.set(v, u, m);
		}
	}
	set(i, e, t) {
		var r = this._,
			h = this.data,
			a = "logo" === i;
		((this.plane[i] = []), (this.wh[i] = []));
		for (let s = 0; s < t; s++)
			for (let t = 0; t < this.mutli; t++) {
				var o = e[s],
					l = {
						move: R.Clone(r),
						save: R.Clone(r),
						visible: !1,
						out: !0,
						media: o,
						wh: 0,
						geo: new Geo({
							type: a ? 2 : 1,
							pgm: this.pgm,
							mode: h.mode,
							face: "FRONT",
							attrib: {
								a: {
									size: h.pos.size,
									data: new Float32Array(h.pos.arr),
								},
								index: {
									size: 1,
									data: new Uint16Array(h.index),
								},
								b: {
									size: 2,
									tex: o.attrib,
									data: new Float32Array(h.uv),
								},
							},
						}),
					};
				(l.geo.setVAO(), this.plane[i].push(l), this.wh[i].push(o.wh));
			}
		this.planeL[i] = this.plane[i].length;
	}
	moving() {
		var e = _A,
			r = e.win.w,
			h = e.win.h;
		let a = e.e.s.rqd || e.rgl.ren.roRqd;
		a || "/story" !== this.prop || (a = e.e.ste.gl.moving);
		for (let t = 0; t < this.mediaNameL; t++) {
			var o = this.mediaName[t],
				l = this.plane[o];
			for (let i = 0; i < this.planeL[o]; i++) {
				var n = l[i];
				let s = a;
				if (!s)
					for (let t = 0; t < this.allL; t++) {
						var d = this.all[t],
							p = d.type,
							c = d.prop;
						if (R.Une(n.move[p][c], n.save[p][c], d.r)) {
							s = !0;
							break;
						}
					}
				if (
					(s ||
						(n.media.wh !== this.wh[o][i] &&
							((this.wh[o][i] = n.media.wh), (s = !0))),
					!s)
				) {
					var v = n.media.layerL;
					for (let t = 0; t < v; t++) {
						var u = n.media.data[t];
						if (u.v && u.element._.isPlaying) {
							s = !0;
							break;
						}
					}
				}
				for (let t = 0; t < this.allL; t++) {
					var m = this.all[t],
						f = m.type,
						m = m.prop;
					n.save[f][m] = n.move[f][m];
				}
				var g = n.save.lerp,
					y = n.save.ease,
					w = g.x,
					x = g.y + y.y,
					L = g.w,
					_ = g.h,
					w = w < r && 0 < w + L,
					x = x < h && 0 < x + _,
					g = R.R(R.Clamp(g.opacity, 0, 1), 6);
				let t = w && x && 0 < g && 0 < _ && 0 < L;
				((t =
					t && y.maskTB < 1 && y.maskBT < 1 && y.maskLR < 1 && y.maskRL < 1) !==
					n.visible && ((n.visible = t), (e.rgl.pass = 2)),
					e.rgl.rqd || (s && n.visible && (e.rgl.rqd = !0)));
			}
		}
	}
	draw() {
		var s = _A.rgl,
			i = s.rqd;
		for (let t = 0; t < this.mediaNameL; t++) {
			var e = this.mediaName[t],
				r = this.plane[e];
			for (let t = 0; t < this.planeL[e]; t++) {
				var h = r[t];
				if (h.visible && (i || 0 < s.pass)) {
					h.out && (h.out = !1);
					var a = h.media.layerL;
					for (let t = 0; t < a; t++) {
						var o = h.media.data[t];
						o.v && o.element.play();
					}
					h.geo.draw(h);
				} else if (!h.visible && !h.out) {
					h.out = !0;
					var l = h.media.layerL;
					for (let t = 0; t < l; t++) {
						var n = h.media.data[t];
						n.v && n.element.pause();
					}
					h.geo.draw(h);
				}
			}
		}
		0 < s.pass && s.pass--;
	}
}
const vertex =
		"precision highp float;attribute vec2 a;attribute vec2 b;uniform mat4 c;uniform mat4 d;uniform float z;uniform vec2 e;uniform vec2 f;uniform vec2 g;varying vec2 h;varying vec2 i;void main(){vec4 p=d*vec4(a.x,a.y,z,1);gl_Position=c*p;h=(b-.5)/e+.5-g;i=(p.xy/f)+.5;}",
	fragment = `#extension GL_OES_standard_derivatives: enable
precision highp float;uniform sampler2D j;varying vec2 h;varying vec2 i;uniform int k;uniform float l;uniform float m;uniform float n;uniform vec2 p;uniform vec2 o;uniform float q;float r(float s,float t){float u=fwidth(t);return smoothstep(s-u,s+u,t);}float z(vec3 a){return max(min(a.r,a.g),min(max(a.r,a.g),a.b));}vec3 v(vec3 t){return vec3((t.r+t.g+t.b)/3.);}void main(){vec3 w;float x =1.;if(k==1){w=texture2D(j,h).rgb;w=mix(w,v(w),m);w=mix(vec3(0),w,n);x=r(p.x,1.-i.y)*r(p.y,i.y);x*=r(o.x,i.x)*r(o.y,1.-i.x);}else{w=texture2D(j,h).rgb;float y=z(w)-.5;float d=fwidth(y);x=smoothstep(-d,d,y);x*=step(p.x,1.-i.y)*step(p.y,i.y)*step(q,1.-h.y);w=vec3(1.);}gl_FragColor=vec4(w,l*x);}`;
var _Basic = {
	vertex: vertex,
	fragment: fragment,
};
class RGL {
	constructor() {
		((this._ = {}),
			(this.media = {}),
			(this.rqd = !1),
			(this.pass = 0),
			(this.act = new Act("url")),
			(this.gl = R.G.id("r").getContext("webgl", {
				antialias: !0,
				alpha: !0,
			})),
			R.BM(this, ["resize", "loop"]),
			(this.raf = new R.Raf(this.loop)));
	}
	load() {
		((this.ren = new Ren()),
			(this.pgm = {
				basic: new Pgm({
					name: "basic",
					shader: _Basic,
					pts: {
						h: 2,
						v: 2,
					},
					uniform: {
						j: {
							t: "1i",
							v: 0,
						},
						k: {
							t: "1i",
							v: 0,
						},
						e: {
							t: "2fv",
							v: [1, 1],
						},
						l: {
							t: "1f",
							v: 0,
						},
						m: {
							t: "1f",
							v: 0,
						},
						n: {
							t: "1f",
							v: 1,
						},
						g: {
							t: "2fv",
							v: [0, 0],
						},
						f: {
							t: "2fv",
							v: [0, 0],
						},
						o: {
							t: "2fv",
							v: [0, 0],
						},
						p: {
							t: "2fv",
							v: [0, 0],
						},
						q: {
							t: "1f",
							v: 0,
						},
						z: {
							t: "1f",
							v: 0,
						},
					},
				}),
			}),
			(this.pgmType = Object.keys(this.pgm)),
			(this.pgmL = this.pgmType.length));
	}
	intro() {
		var t = _A,
			s = this.act,
			i = t.route.new[s.t],
			e = t.data.gl.li;
		for (let t = 0; t < s._L; t++) {
			var r = s.prop[t];
			(r !== i && !e[r].tex.preload) ||
				(this._[r] = new PMedia({
					p: this.pgm.basic,
					prop: r,
				}));
		}
	}
	init() {
		var t = _A,
			s = t.route.new[this.act.t],
			t = t.data.gl.li[s];
		R.Und(this._[s]) &&
			t &&
			(this._[s] = new PMedia({
				p: this.pgm.basic,
				prop: s,
			}));
	}
	run() {
		(new R.RO(this.resize).on(), this.resize(), this.raf.run());
	}
	resize() {
		var t = _A,
			s = t.win.w,
			t = t.win.h;
		((this.pgm.basic.uniform.f.v = [s, t]), this.ren.resize());
	}
	loop() {
		this.ren.render(this._);
	}
	clear() {
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	}
}
class Tex {
	constructor(t) {
		var s = _A.rgl.gl,
			i = s.TEXTURE_2D,
			e = s.createTexture();
		s.bindTexture(i, e);
		let r;
		R.Def(t.color)
			? ((r = "NEAREST"),
				s.texImage2D(
					i,
					0,
					s.RGB,
					1,
					1,
					0,
					s.RGB,
					s.UNSIGNED_BYTE,
					new Uint8Array(t.color),
				))
			: R.Def(t.data)
				? ((r = "NEAREST"),
					s.texImage2D(
						i,
						0,
						s.RGB,
						t.data.vert,
						t.data.hori,
						0,
						s.RGB,
						s.FLOAT,
						new Float32Array(t.data.arr),
					))
				: R.Def(t.fbo)
					? ((r = "LINEAR"),
						s.texImage2D(
							i,
							0,
							s.RGBA,
							t.fbo.w,
							t.fbo.h,
							0,
							s.RGBA,
							s.FLOAT,
							null,
						))
					: ((r = "LINEAR"),
						s.texImage2D(i, 0, s.RGBA, s.RGBA, s.UNSIGNED_BYTE, t.obj));
		var h = ["S", "T", "MIN", "MAG"];
		for (let t = 0; t < 4; t++) {
			var a = t < 2 ? "WRAP_" + h[t] : h[t] + "_FILTER",
				o = t < 2 ? "CLAMP_TO_EDGE" : r;
			s.texParameteri(i, s["TEXTURE_" + a], s[o]);
		}
		return e;
	}
}
class Img {
	constructor(t) {
		((this.o = t),
			(this.src = t.src.url),
			(this.hasFormat = !R.Is.str(this.src)),
			(this.format = ""),
			(this.first = !0),
			this.hasFormat &&
				(R.BM(this, ["resize"]),
				(this.ro = new R.RO(this.resize)),
				this.ro.on()),
			this.resize());
	}
	resize() {
		var t = _A,
			s = this.o;
		const i = s.gl,
			e = s.tex,
			r = s.layer,
			h = s.cb;
		if (t.format !== this.format) {
			this.format = t.format;
			s = this.hasFormat ? this.src[this.format] : this.src;
			const a = new Image();
			((a.onload = (t) => {
				(i &&
					(0 === r && (e.wh = a.width / a.height),
					(e.data[r] = {
						v: !1,
						element: a,
					}),
					R.Def(e.attrib[r]) && _A.rgl.gl.deleteTexture(e.attrib[r]),
					(e.attrib[r] = new Tex({
						obj: a,
					}))),
					this.first && ((this.first = !1), h()));
			}),
				(a.crossOrigin = "anonymous"),
				(a.src = s));
		}
	}
}
class V {
	constructor(t) {
		((this.dom = R.Cr("video")),
			this.dom.setAttribute("crossorigin", "anonymous"),
			this.dom.setAttribute("preload", "metadata"),
			this.dom.setAttribute("playsinline", "true"),
			(this.dom.muted = !0),
			(this.dom.loop = !0),
			R.Def(t) &&
				(R.Def(t.id) && (this.dom.id = t.id), R.Def(t.class)) &&
				(this.dom.className = t.class),
			(this._ = new Video$1({
				dom: this.dom,
			})));
	}
	src(t) {
		this.dom.src = t;
	}
	play() {
		this._.play();
	}
	pause() {
		this._.pause();
	}
}
class Format {
	constructor(t) {
		((this.c = t.c),
			(this.src = t.src),
			(this.hasR = R.Def(this.src.portrait)),
			(this.v = new V(t.css)),
			(this.created = !1));
	}
	resize() {
		var s = _A.format;
		if (this.format !== s) {
			this.format = s;
			let t = this.src;
			this.hasR && (t = this.src[this.format]);
			s = R.Def(t.hls);
			((this.type = "mp4"),
				s && ((this.type = hls ? "hls" : "dash"), (t = t[this.type])),
				this.created ? this.hasR && this.srcUp(t) : this.create(t));
		}
	}
	srcUp(t) {
		("dash" === this.type ? this.player.attachSource(t) : this.v.src(t),
			this.v._.isPlaying && ((this.v._.isPlaying = !1), this.v.play()));
	}
	create(t) {
		((this.created = !0),
			"dash" === this.type
				? (this.add(),
					(this.player = dashjs.MediaPlayer().create()),
					this.player.initialize(this.v.dom),
					this.srcUp(t))
				: (this.srcUp(t), this.add()));
	}
	add() {
		this.c.appendChild(this.v.dom);
	}
	play() {
		this.v.play();
	}
	pause() {
		this.v.pause();
	}
	destroy() {
		(this.v.dom.remove(), "dash" === this.type && this.player.destroy());
	}
}
class Vid {
	constructor() {
		(R.BM(this, ["resize"]), (this.ro = new R.RO(this.resize)));
	}
	init(t) {
		((this.f = new Format(t)), this.resize(), this.ro.on());
	}
	resize() {
		this.f.resize();
	}
	play() {
		this.f.play();
	}
	pause() {
		this.f.pause();
	}
	destroy() {
		(this.ro.off(), R.Def(this.f.destroy) && this.f.destroy());
	}
}
class VLoad {
	constructor(t) {
		var s = t.v,
			i = R.Def(s.f);
		((this.cb = t.cb),
			i
				? ((this.action = s), (this.listen = s.f.v.dom))
				: ((this.action = new Video$1({
						dom: s,
					})),
					(this.listen = s)),
			R.BM(this, ["playFn", "timeFn"]),
			(this.playing = !1),
			(this.timeUp = !1),
			this.lPlay("a"),
			this.lTime("a"),
			this.action.play());
	}
	lPlay(t) {
		R.L(this.listen, t, "playing", this.playFn);
	}
	lTime(t) {
		R.L(this.listen, t, "timeupdate", this.timeFn);
	}
	playFn() {
		((this.playing = !0), this.lPlay("r"), this.checkReady());
	}
	timeFn() {
		((this.timeUp = !0), this.lTime("r"), this.checkReady());
	}
	checkReady() {
		this.playing && this.timeUp && (this.cb(), this.action.pause());
	}
	off() {
		(this.lPlay("r"), this.lTime("r"), this.action.pause());
	}
}
class Video {
	constructor(t) {
		var s = t.src;
		const i = t.gl,
			e = t.tex,
			r = t.layer,
			h = t.cb;
		t = R.G.id("r-v");
		const a = new Vid(),
			o =
				(a.init({
					c: t,
					src: s.url,
					css: {
						id: s.id,
						class: "tex",
					},
				}),
				a.f.v),
			l = o.dom;
		new VLoad({
			v: a,
			cb: (t) => {
				(i &&
					(0 === r && (e.wh = l.videoWidth / l.videoHeight),
					(e.data[r] = {
						v: !0,
						element: o,
						destroy: (t) => {
							a.destroy();
						},
					}),
					R.Def(e.attrib[r]) && _A.rgl.gl.deleteTexture(e.attrib[r]),
					(e.attrib[r] = new Tex({
						obj: l,
					}))),
					h());
			},
		});
	}
}
class Load {
	constructor(t) {
		this.cb = t;
		t = _A;
		((this.isTr = t.route.old.url),
			(this.isVi = t.is.vi),
			(this.dom_ = R.G.id("lo-pr")),
			(this.dom = this.dom_.children[0]),
			(this.dom_.style.transition = "none"),
			(this.dom.style.transition = "none"),
			R.T(this.dom_, 0, 0),
			R.T(this.dom, -110, 0),
			(this.domStart = this.isTr ? -60 : -100),
			(this.first = !0),
			(this.loading = !1),
			(this.no = 0),
			(this.prevNo = 0),
			R.BM(this, ["loop"]),
			(this.raf = new R.Raf(this.loop)),
			this.raf.run());
	}
	preload() {
		var t = _A,
			s = t.route,
			i = s.new.url,
			e = s.new.url,
			r = t.rgl,
			h = t.data.gl.li,
			a = Object.keys(h),
			o = a.length;
		if (
			((this.loading = !0),
			(this.texL = 0),
			this.isVi &&
				(this.texL++,
				new VLoad({
					v: R.G.class("vi-v", t.e.p("_"))[0],
					cb: (t) => {
						this.no++;
					},
				})),
			this.isTr)
		)
			this.isVi ||
				this._media({
					store: h[i].tex.store,
					url: i,
					gl: !0,
				});
		else
			for (let t = 0; t < o; t++) {
				var l = a[t],
					n = h[l].tex;
				(!n.preload && i !== l) ||
					this._media({
						store: n.store,
						url: l,
						gl: !0,
					});
			}
		if (this.isTr) {
			var d = t.data.gl.cacheMax;
			let s = 0;
			var p = Object.keys(r.media);
			for (let t = p.length - 1; -1 < t; t--) {
				var c = p[t],
					v = h[c].tex;
				if (v.delete && (s++, c !== i) && c !== e && s > d) {
					var u = r.media[c],
						m = Object.keys(u),
						f = m.length;
					for (let t = 0; t < f; t++) {
						var g = u[m[t]],
							y = g.length;
						for (let s = 0; s < y; s++) {
							var w = g[s].data,
								x = g[s].layerL;
							for (let t = 0; t < x; t++)
								(w[t].hasOwnProperty("destroy") && w[t].destroy(),
									r.gl.deleteTexture(g[s].attrib[t]));
						}
					}
					(delete r.media[c], delete r._[c]);
				}
			}
		}
	}
	_media(t) {
		var i = _A.rgl.media,
			e = t.url,
			s = t.store,
			r = Object.keys(s),
			h = r.length,
			a = t.gl;
		a && (i[e] = {});
		for (let t = 0; t < h; t++) {
			var o = r[t],
				l = (a && (i[e][o] = []), s[o]),
				n = l.length;
			for (let s = 0; s < n; s++) {
				var d = l[s],
					p = d.length;
				a &&
					(i[e][o][s] = {
						attrib: [],
						data: [],
						layerL: p,
					});
				for (let t = 0; t < p; t++)
					(this.media({
						src: d[t],
						url: e,
						element: o,
						index: s,
						layer: t,
						gl: a,
					}),
						this.texL++);
			}
		}
	}
	media(t) {
		var s = t.src,
			i = t.index,
			e = t.layer,
			r = t.gl;
		let h;
		r = {
			gl: r,
			tex: (h = r ? _A.rgl.media[t.url][t.element][i] : h),
			layer: e,
			src: s,
			cb: (t) => {
				this.no++;
			},
		};
		new ("img" === s.type ? Img : Video)(r);
	}
	loop() {
		if (
			(this.first &&
				((this.first = !1), this.isTr) &&
				(this.cssTr(this.dom, 3e3, ".25,1,.5,1"),
				R.T(this.dom, this.domStart, 0)),
			!this.loading)
		)
			if (this.isTr) {
				var s = _A;
				let t = !1;
				((s.was.p0 && s.is.p1) || (s.was.p1 && s.is.p1)
					? (t = s.canLoad)
					: ((s.was.ab && s.is.p1) || s.is.vi) && (t = !0),
					t && (this.cssTr(this.dom, 3500, ".16,1,.3,1"), this.preload()));
			} else (this.cssTr(this.dom, 3500, ".16,1,.3,1"), this.preload());
		(this.no !== this.prevNo &&
			((this.prevNo = this.no),
			(s = this.no / this.texL),
			R.T(this.dom, R.R(R.Lerp(this.domStart, 0, s)), 0)),
			0 < this.texL &&
				this.no === this.texL &&
				(R.T(this.dom_, 100.1, 0),
				this.cssTr(this.dom_, 1e3, ".76,0,.2,1"),
				this.raf.stop(),
				this.cb()));
	}
	cssTr(t, s, i) {
		t.style.transition = s + "ms transform cubic-bezier(" + i + ")";
	}
}
class Intro {
	constructor(t) {
		const s = _A;
		t((t) => {
			((s.rgl = new RGL()),
				new Load((t) => {
					this.cb();
				}),
				s.rgl.load());
		});
	}
	cb() {
		var t = _A;
		(t.rgl.intro(),
			t.e.intro(),
			t.rgl.init(),
			t.e.init(),
			t.rgl.run(),
			t.e.run(),
			new Fx$1());
	}
}
class Fx {
	in() {
		const e = _A;
		const s = e.rgl.act,
			r = e.t.e4.o2,
			h = e.t.e4.io.front,
			a = e.t.e4.io.back;
		var t = e.t.tr.d,
			i = R.G.class("p_")[0];
		const o = i.style,
			l = R.G.class("c", i)[0].style,
			n = R.G.class("p")[0].style;
		((i = new R.M({
			d: t,
			u: (t) => {
				var s = R.Lerp(0, e.tr.y, a(t.pr)),
					i = R.Lerp(0, e.win.h, h(t.pr)),
					t = R.Lerp(0, 1, r(t.pr));
				((l.opacity = R.R(t, 6)),
					(n.transform = "translate3d(0, " + R.R(s) + "px, 0)"),
					(o.clipPath = "inset(0 0 " + R.R(i) + "px 0)"));
			},
			cb: (t) => {
				s.static();
			},
		})),
			(t = new Page({
				intro: !1,
			})));
		(s.mutation(), i.play(), t.play());
	}
	ste() {
		var t = _A.rgl.act,
			s = new Page({
				intro: !1,
			});
		(t.static(), s.play());
	}
}
class Mutation {
	constructor() {
		this.mutationFx = new Fx();
	}
	out() {
		var t = _A;
		(t.e.off(), t.page.update());
	}
	in() {
		const s = _A;
		var t = s.route.new.url,
			i = (s.is.st || s.is.se) && (s.was.st || s.was.se) ? "ste" : "in";
		((this.m = this.mutationFx[i]),
			s.page.insertNew(),
			s.is.vi
				? new Load((t) => {
						(s.e.init(), this.m());
					})
				: R.Def(s.data.gl.li[t]) && R.Und(s.rgl._[t])
					? new Load((t) => {
							(s.rgl.init(), s.e.init(), this.m());
						})
					: (s.e.init(), this.m()));
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
	col: 12,
}),
	new Ctrl({
		device: "d",
		engine: E,
		transition: {
			intro: Intro,
			mutation: Mutation,
		},
	}));
