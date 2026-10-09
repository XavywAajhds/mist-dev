"use strict";
const stockSW = "./sw.js";

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
async function registerSW() {
	if (!navigator.serviceWorker) {
		if (
			location.protocol !== "https:" &&
			!swAllowedHostnames.includes(location.hostname)
		)
			throw new Error("Service workers require https://");
		throw new Error("Service workers are not supported");
	}
	await navigator.serviceWorker.register(stockSW);
}
