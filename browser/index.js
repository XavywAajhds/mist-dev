"use strict";
// Self-hosted Scramjet frontend for the Mist.Dev Home tab.
// Uses the epoxy transport (no SharedArrayBuffer / no COOP+COEP), so it can run
// inside an iframe on a static host such as GitHub Pages.
const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const status = document.getElementById("status");
const errorbox = document.getElementById("errorbox");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const landing = document.getElementById("landing");
const frameHolder = document.getElementById("frameHolder");
const backBtn = document.getElementById("backBtn");
const fwdBtn = document.getElementById("fwdBtn");
const reloadBtn = document.getElementById("reloadBtn");
const homeBtn = document.getElementById("homeBtn");
const popoutBtn = document.getElementById("popoutBtn");
const exitBtn = document.getElementById("exitBtn");

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
let frame = null;

function dbg(m) {
	if (location.search.indexOf("debug") < 0) return;
	(window.__log = window.__log || []).push(m);
}

function showStatus(msg) {
	if (msg) {
		status.hidden = false;
		status.textContent = msg;
	} else {
		status.hidden = true;
		status.textContent = "";
	}
}

function showError(msg, code) {
	errorbox.hidden = !msg;
	error.textContent = msg || "";
	errorCode.textContent = code || "";
	if (msg) showStatus("");
}

// Tell the host page (Mist.Dev) what this browser is doing so its tab strip
// and navigation stay in sync.
function post(type, extra) {
	try {
		if (window.parent && window.parent !== window) {
			window.parent.postMessage(Object.assign({ mist: type }, extra || {}), "*");
		}
	} catch (e) {}
}

window.addEventListener("unhandledrejection", (e) => {
	dbg("rejection:" + (e.reason && e.reason.stack ? e.reason.stack : e.reason));
	showError("Error: " + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

function currentUrl() {
	// Scramjet tracks the real (decoded) URL of whatever the frame is showing,
	// including pages reached by clicking links inside the frame.
	try {
		if (frame && frame.url && /^https?:/.test(frame.url)) return frame.url;
	} catch (e) {}
	return "";
}

// Push the URL the user actually sees into the omnibox and the host tab strip.
function syncFromFrame() {
	const url = currentUrl();
	if (!url) return;
	if (document.activeElement !== address) address.value = url;
	popoutBtn.hidden = false;
	popoutBtn.href = url;
	backBtn.disabled = false;
	fwdBtn.disabled = false;
	post("navigate", { url: url });
}

function openLanding() {
	landing.hidden = false;
	frameHolder.hidden = true;
	showStatus("");
	showError("");
}

async function go(input) {
	if (!input || !input.trim()) return;
	dbg("go:" + input);

	if (!scramjet) {
		showError(
			"This browser must be opened over HTTPS to work. Try https://" +
				location.host + location.pathname
		);
		return;
	}

	const url = search(input, SEARCH_ENGINE);
	dbg("url:" + url);

	showError("");
	showStatus("Connecting…");
	post("navigate", { url: url });

	const wisp = await pickWisp();
	dbg("wisp:" + wisp);
	if (!wisp) {
		showStatus("");
		showError("No Wisp relay reachable. Try ?wisp=wss://your-relay/");
		return;
	}

	// Set up the transport/worker before registering the service worker so the
	// bare-mux SharedWorker is created before the SW can start controlling
	// fetches for this scope.
	try {
		if (!connection) {
			connection = new BareMux.BareMuxConnection(BASE + "baremux/worker.js");
		}
		const current = await connection.getTransport();
		dbg("get:" + JSON.stringify(current));
		if (current !== TRANSPORT) {
			await connection.setTransport(TRANSPORT, [{ wisp: wisp }]);
		}
	} catch (err) {
		showStatus("");
		showError("Could not start the proxy transport.", String(err));
		return;
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
		showStatus("");
		showError("Failed to register service worker (https is required).", String(err));
		return;
	}
	dbg("sw");

	// The frame exists from the first navigation on; later navigations reuse it
	// so the browser keeps its history.
	if (!frame) {
		frame = scramjet.createFrame();
		frame.frame.id = "sj-frame";
		frame.frame.setAttribute(
			"allow",
			"autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture"
		);
		frame.frame.addEventListener("load", () => {
			clearTimeout(loadWatchdog);
			showStatus("");
			syncFromFrame();
		});
		frameHolder.appendChild(frame.frame);
	}

	landing.hidden = true;
	frameHolder.hidden = false;
	showStatus("Loading " + url + " …");
	frame.go(url);
	dbg("frame");

	// If nothing paints after a while the Wisp relay is probably blocked.
	clearTimeout(loadWatchdog);
	loadWatchdog = setTimeout(() => {
		if (frameHolder.hidden) return;
		showStatus("");
		showError(
			"This page is taking too long to load.\n" +
				"The relay may be blocked on this network. Try Settings \u2192 Browser Proxy and enter your own proxy.",
			"url: " + url + "\nwisp: " + wisp
		);
	}, 20000);
}

let loadWatchdog = null;

form.addEventListener("submit", (event) => {
	event.preventDefault();
	go(address.value);
});

backBtn.addEventListener("click", () => {
	if (!frame) return;
	showStatus("Loading…");
	frame.back();
	setTimeout(() => {
		showStatus("");
		syncFromFrame();
	}, 300);
});
fwdBtn.addEventListener("click", () => {
	if (!frame) return;
	showStatus("Loading…");
	frame.forward();
	setTimeout(() => {
		showStatus("");
		syncFromFrame();
	}, 300);
});
reloadBtn.addEventListener("click", () => {
	if (!frame) return;
	showStatus("Reloading…");
	frame.reload();
	setTimeout(() => {
		showStatus("");
		syncFromFrame();
	}, 300);
});
homeBtn.addEventListener("click", () => {
	post("home");
	openLanding();
	address.value = "";
});
exitBtn.addEventListener("click", () => post("exit"));

// Embedded in Mist.Dev: the host provides the toolbar (and its own exit).
// Standalone: there is nothing to exit to. Either way the button stays hidden.
document.body.classList.toggle("embedded", window.parent !== window);
exitBtn.hidden = true;

// The host asks this app to reload whatever its frame is showing.
window.addEventListener("message", (e) => {
	const d = e.data;
	if (!d || typeof d !== "object" || d.mist !== "reload") return;
	if (frame) {
		showStatus("Reloading…");
		frame.reload();
		setTimeout(() => {
			showStatus("");
			syncFromFrame();
		}, 300);
	}
});

(function autoGo() {
	const params = new URLSearchParams(location.search);
	const target = params.get("url") || params.get("goto") || params.get("q");
	if (target) {
		address.value = target;
		go(target);
	}
})();
