import { TM } from "@/global/Tab/TabManager";

let TabId = 0;

type TabTask = {
	start: (dt: number) => void;
	stop: () => void;
};

/**
 * Tab visibility wrapper
 * Wraps a task with start/stop handlers and registers it in TabManager.
 */
export class Tab {
	private readonly id: number;
	private on = false;

	constructor(private readonly _: TabTask) {
		this.id = TabId++;
	}

	a() {
		if (!this.on) {
			TM.a({
				id: this.id,
				start: this._.start,
				stop: this._.stop,
			});

			this.on = true;
		}
	}

	r() {
		if (this.on) {
			TM.r(this.id);
			this.on = false;
		}
	}
}
