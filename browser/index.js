"use strict";
// Self-hosted Scramjet frontend for the Mist.Dev Home tab.
// Uses the epoxy transport (no SharedArrayBuffer / no COOP+COEP), so it can run
// inside an iframe on a static host such as GitHub Pages.
const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

const SEARCH_ENGINE = "https://www.google.com/search?q=%s";
// Resolve all asset paths relative to this document so the app works from any
// subpath (e.g. "/browser/" or "/mist-browser/" on a GitHub project page).
const BASE = new URL("./", location.href).pathname;
const TRANSPORT = BASE + "epoxy/index.js";
const SCRAM_FILES = {
	wasm: BASE + "scram/scramjet.wasm.wasm",
	all: BASE + "scram/scramjet.all.js",
	sync: BASE + "scram/scramjet.sync.js",
};

const { ScramjetController } = $scramjetLoadController();
let scramjet = null;
if (window.isSecureContext && navigator.serviceWorker) {
	scramjet = new ScramjetController({
		files: SCRAM_FILES,
		prefix: BASE + "scramjet/",
	});
	scramjet.init().catch(() => {});
}

function wispCandidates() {
	const params = new URLSearchParams(location.search);
	const fromQuery = params.getAll("wisp").filter(Boolean);
	if (fromQuery.length) return fromQuery;
	return (window.MIST_WISPS || []).slice();
}

function testWisp(url, timeout) {
	return new Promise((resolve) => {
		let settled = false;
		let ws = null;
		const finish = (ok) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				if (ws) ws.close();
			} catch (e) {}
			resolve(ok);
		};
		const timer = setTimeout(() => finish(false), timeout || 3000);
		try {
			ws = new WebSocket(url);
			ws.onopen = () => finish(true);
			ws.onerror = () => finish(false);
			ws.onclose = () => finish(false);
		} catch (e) {
			finish(false);
		}
	});
}

async function pickWisp() {
	const list = wispCandidates();
	for (const url of list) {
		if (await testWisp(url)) return url;
	}
	return list[0] || "";
}

let connection = null;

function dbg(m) {
	if (location.search.indexOf("debug") < 0) return;
	(window.__log = window.__log || []).push(m);
}

window.addEventListener("unhandledrejection", (e) => {
	dbg("rejection:" + (e.reason && e.reason.stack ? e.reason.stack : e.reason));
	error.textContent = "Error: " + (e.reason && e.reason.message ? e.reason.message : e.reason);
});

async function go(input) {
	if (!input || !input.trim()) return;
	dbg("go:" + input);

	if (!scramjet) {
		error.textContent =
			"This browser must be opened over HTTPS to work. Try https://" +
			location.host + location.pathname;
		errorCode.textContent = "";
		return;
	}

	const url = search(input, SEARCH_ENGINE);
	dbg("url:" + url);
	const wisp = await pickWisp();
	dbg("wisp:" + wisp);
	if (!wisp) {
		error.textContent = "No Wisp relay reachable. Try ?wisp=wss://your-relay/";
		return;
	}

	// Set up the transport/worker before registering the service worker so the
	// bare-mux SharedWorker is created before the SW can start controlling
	// fetches for this scope.
	if (!connection) {
		connection = new BareMux.BareMuxConnection(BASE + "baremux/worker.js");
	}
	const current = await connection.getTransport();
	dbg("get:" + JSON.stringify(current));
	if (current !== TRANSPORT) {
		await connection.setTransport(TRANSPORT, [{ wisp: wisp }]);
	}
	dbg("transport");

	try {
		await registerSW();
		await navigator.serviceWorker.ready;
		if (!navigator.serviceWorker.controller) {
			await new Promise((resolve) =>
				navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })
			);
		}
	} catch (err) {
		error.textContent = "Failed to register service worker (https is required).";
		errorCode.textContent = err.toString();
		return;
	}
	dbg("sw");

	error.textContent = "";
	errorCode.textContent = "";
	const loading = document.getElementById("sj-loading");
	if (loading) loading.style.display = "none";
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);
	frame.go(url);
	dbg("frame");
}

form.addEventListener("submit", (event) => {
	event.preventDefault();
	go(address.value);
});

(function autoGo() {
	const params = new URLSearchParams(location.search);
	const target = params.get("url") || params.get("goto") || params.get("q");
	if (target) {
		address.value = target;
		go(target);
	}
})();
