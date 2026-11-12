#!/usr/bin/env node
// Scrape public CORS-proxy lists, test every gateway, and write proxies.json.
//
//   node tools/scrape-proxies.mjs
//
// The browser (app.js) loads proxies.json and tries the verified gateways
// before its built-in list. Re-run this whenever browsing through the fallback
// proxy starts failing.
//
// Note: proxyscrape.com-style HTTP/SOCKS proxies cannot be dialled from a web
// page, so this scrapes CORS *gateways* (URL in, HTML out) instead. See the
// README note in the final summary.
//
// Template placeholders:
//   %s  target URL, percent-encoded (use in query strings)
//   %u  target URL, raw (use in path-style gateways)
//   %p  target URL, parsed/absolute (same as %u, kept for compatibility)

import { writeFile } from "node:fs/promises";

const TEST_URL = "https://example.com/";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 9000);
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);

const LISTS = [
  "https://raw.githubusercontent.com/distribuyed/proxies/master/README.md",
  "https://gist.githubusercontent.com/jimmywarting/ac1be6ea0297c16c477e17f8fbe51347/raw",
];

// Gateways that have worked recently. The scraper still has to prove them.
const SEEDS = [
  { url: "https://cors.io/?url=%s", json: true },
  { url: "https://api.cors.lol/?url=%s" },
  { url: "https://api.allorigins.win/raw?url=%s" },
  { url: "https://api.allorigins.win/get?url=%s", json: true },
  { url: "https://api.codetabs.com/v1/proxy?quest=%s" },
  { url: "https://cors.eu.org/%u" },
  { url: "https://test.cors.workers.dev/?%u" },
  { url: "https://corsproxy.io/?url=%s" },
  { url: "https://cors-anywhere.azm.workers.dev/%u" },
  { url: "https://cors.x2u.in/%u" },
  { url: "https://thebugging.com/%u" },
  { url: "https://api.cors.lol/?url=%s" },
];

const EXCLUDED_HOSTS = [
  "github.com",
  "gist.github.com",
  "raw.githubusercontent.com",
  "githubusercontent.com",
  "example.com",
  "httpbin.org",
  "localhost",
  "127.0.0.1",
  "npmjs.com",
  "developer.mozilla.org",
  "docs.",
  "www.test-cors.org",
  "test-cors.org",
];

function isCandidate(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (EXCLUDED_HOSTS.some((h) => host === h || host.endsWith("." + h))) return false;
  if (/\.(png|jpe?g|gif|svg|ico|css|js|mjs|wasm|woff2?|ttf)(\?|$)/i.test(u.pathname)) return false;
  return true;
}

// Turn any gateway URL into a template with a placeholder.
function toTemplate(raw) {
  let s = raw.trim().replace(/[),.;]+$/, "");
  if (!s) return null;
  if (s.includes("%s") || s.includes("%u") || s.includes("%p")) return s;

  if (/[?&](?:url|quest|q|u|href|target|dest|destination)=$/i.test(s)) return s + "%s";
  if (s.endsWith("=")) return s + "%s";
  if (s.endsWith("?") || s.endsWith("&")) return s + "url=%s";
  if (s.endsWith("/")) return s + "%u";

  // Bare host or unknown shape: assume the common ?url= form.
  return s + (s.includes("?") ? "&url=%s" : "?url=%s");
}

function buildUrl(template, target) {
  return template
    .replace("%s", encodeURIComponent(target))
    .replace("%u", target)
    .replace("%p", target);
}

function extractUrls(text) {
  const out = new Set();
  // Quoted strings in the list sources, plus bare URLs in the bullet lists.
  const rx = /https?:\/\/[^\s"'<>`)\]]+/gi;
  for (const m of text.match(rx) || []) out.add(m);
  // "proxy: '…'" entries from the testing snippets in the gist.
  const proxyRx = /proxy:\s*['"]([^'"]+)['"]/gi;
  let hit;
  while ((hit = proxyRx.exec(text))) out.add(hit[1]);
  return [...out];
}

async function scrapeLists() {
  const found = [];
  for (const list of LISTS) {
    try {
      const r = await fetch(list, {
        headers: { "User-Agent": "mist-dev-proxy-scraper" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!r.ok) {
        console.warn(`list ${list}: HTTP ${r.status}`);
        continue;
      }
      const text = await r.text();
      const urls = extractUrls(text).filter(isCandidate).map(toTemplate).filter(Boolean);
      found.push(...urls);
      console.log(`list ${list}: ${urls.length} candidates`);
    } catch (e) {
      console.warn(`list ${list}: ${e.message}`);
    }
  }
  return found;
}

async function testProxy(entry) {
  // A unique probe keeps CDNs from returning a cached old answer.
  const target = TEST_URL + "?mist_probe=" + Date.now().toString(36);
  const url = buildUrl(entry.url, target);
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
    });
    if (!r.ok) return { ok: false, error: "HTTP " + r.status };
    const type = (r.headers.get("content-type") || "").toLowerCase();
    let text = await r.text();
    let isJson = false;
    // Some gateways wrap the page in JSON ({ body }, { contents }, ...).
    if (entry.json || type.includes("json") || /^\s*[[{]/.test(text)) {
      try {
        const data = JSON.parse(text);
        const inner = data && (data.body || data.contents || data.html || data.response);
        if (typeof inner === "string") {
          text = inner;
          isJson = true;
        }
      } catch {
        // Not actually JSON; keep the raw body.
      }
    }
    // The gateway must return the page itself, not its own documentation or
    // an error page. example.com always contains this sentence.
    if (!/example domain/i.test(text)) {
      return { ok: false, error: "did not return target" };
    }
    return { ok: true, ms: Date.now() - started, json: isJson };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(entries) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < entries.length) {
      const entry = entries[next++];
      const res = await testProxy(entry);
      results.push({ ...entry, ...res });
      const tag = res.ok ? `OK ${res.ms}ms` : res.error;
      console.log(`${res.ok ? "  ok  " : " fail "} ${tag.padEnd(20)} ${entry.url}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));
  return results;
}

const scraped = await scrapeLists();
const seen = new Set();
const candidates = [];
for (const entry of [...SEEDS, ...scraped.map((url) => ({ url }))]) {
  if (!entry || !entry.url || seen.has(entry.url)) continue;
  seen.add(entry.url);
  candidates.push(entry);
}

console.log(`\nTesting ${candidates.length} gateways against ${TEST_URL}\n`);
const results = await runPool(candidates);

const working = results
  .filter((r) => r.ok)
  .sort((a, b) => a.ms - b.ms)
  .map((r) => ({ url: r.url, ms: r.ms, ...(r.json ? { json: true } : {}) }));

const output = {
  generated: new Date().toISOString(),
  test: TEST_URL,
  proxies: working,
};

const target = new URL("../proxies.json", import.meta.url);
await writeFile(target, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log(`\n${working.length} working gateway(s) written to ${target.pathname}`);
for (const p of working) console.log(`  ${p.ms}ms  ${p.url}`);
if (!working.length) {
  console.error("\nNone responded. The built-in list in app.js is still used.");
  process.exitCode = 1;
}
