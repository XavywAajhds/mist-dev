"use strict";
// Mist.Dev browser client (patched from MercuryWorkshop/Scramjet-App, AGPL-3.0).
// Uses the epoxy transport (no SharedArrayBuffer / no cross-origin isolation)
// and accepts ?url= / ?q= so Mist.Dev can drive it from the browser tab.
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");

const TRANSPORT = "/epoxy/dist/index.mjs";

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

function wispUrl() {
	return (
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/"
	);
}

async function go(input) {
	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	const url = search(input, searchEngine.value);

	if ((await connection.getTransport()) !== TRANSPORT) {
		await connection.setTransport(TRANSPORT, [{ wisp: wispUrl() }]);
	}

	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);
	frame.go(url);
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	await go(address.value);
});

(function autoGo() {
	const params = new URLSearchParams(location.search);
	const target = params.get("url") || params.get("q");
	if (target) {
		address.value = target;
		go(target);
	}
})();
