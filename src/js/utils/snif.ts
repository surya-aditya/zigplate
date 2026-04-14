/**
 * Sniffer
 * Detects browser capabilities.
 */
const uA = navigator.userAgent.toLowerCase();
const iPadIOS13 =
	navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

export const isMobile = /mobi|android|tablet|ipad|iphone/.test(uA) || iPadIOS13;
export const isFirefox = uA.includes("firefox");
