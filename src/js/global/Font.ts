type FontOptions = {
	n: string[];
	cb: () => void;
};

export class Font {
	constructor(opts: FontOptions) {
		const { n: names, cb } = opts;
		const total = names.length;

		if (total === 0) {
			cb();

			return;
		}

		let loaded = 0;

		for (const fontName of names) {
			if (!fontName) continue;

			const src = `/font/${fontName}.woff2`;
			const family = fontName.split("/").pop()!.replace(/\..+$/, "");

			const fontFace = new FontFace(family, `url(${src})`);

			fontFace
				.load()
				.then((f) => {
					(document.fonts as any).add(f);
					loaded++;

					if (loaded === total) cb();
				})
				.catch(() => {
					loaded++;
					if (loaded === total) cb();
				});
		}
	}
}
