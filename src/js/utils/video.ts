import { Pad } from "@/utils/dom";

export function sToHms(timeInSeconds: number | string): string {
	timeInSeconds = Number(timeInSeconds);
	const hours = Math.floor(timeInSeconds / 3600);
	const minutes = Math.floor((timeInSeconds % 3600) / 60);
	const seconds = Math.floor((timeInSeconds % 3600) % 60);
	return `${Pad(hours)}:${Pad(minutes)}:${Pad(seconds)}`;
}
