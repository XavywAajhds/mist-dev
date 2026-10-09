// Mist.Dev browser server
//
// Based on MercuryWorkshop/Scramjet-App (AGPL-3.0). Two changes from upstream:
//   1. The epoxy transport is used instead of libcurl, so no SharedArrayBuffer
//      is needed and the Cross-Origin-Opener/Embedder-Policy headers can be
//      dropped. This lets the whole app run inside an iframe (the Mist.Dev
//      browser tab) instead of only as a top-level page.
//   2. epoxy is served from the package itself.
import { createServer } from "node:http";
import { fileURLToPath } from "url";
import path from "node:path";
import { createRequire } from "node:module";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const require = createRequire(import.meta.url);
const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

// Serve the epoxy-transport package root so any relative wasm/asset it loads
// resolves. The transport module itself lives at /epoxy/dist/index.mjs.
const epoxyMain = require.resolve("@mercuryworkshop/epoxy-transport");
const epoxyRoot = path.dirname(path.dirname(epoxyMain));

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				// Intentionally no Cross-Origin-Opener/Embedder-Policy here.
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: epoxyRoot,
	prefix: "/epoxy/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.setNotFoundHandler((res, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("Shutting down");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});
