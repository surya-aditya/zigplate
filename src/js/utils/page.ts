import { Get } from "@/utils/dom";

export function GetPage(index: number = 0, suffix?: string): HTMLElement {
	const root = Get.t("main")[index];
	const matches = Get.c("pg" + (suffix || ""), root);
	return matches[matches.length - 1] as HTMLElement;
}
