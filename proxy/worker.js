// Mist.Dev proxy - Cloudflare Worker
//
// Deploy (no install, works on any device):
//   1. Sign in at https://dash.cloudflare.com (free account).
//   2. Workers & Pages -> Create -> Create Worker.
//   3. Delete the sample code, paste this whole file, click Deploy.
//   4. Copy the worker URL (e.g. https://mist-proxy.you.workers.dev) and
//      paste "https://mist-proxy.you.workers.dev/?url=" into
//      Mist.Dev -> Settings -> Browser Proxy.
//
// Usage:
//   https://<worker>/?url=https://example.com
//   https://<worker>/https://example.com

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Expose-Headers": "*",
};

export default {
  async fetch(request) {
    const cors = (body, init) => new Response(body, { ...init, headers: { ...CORS, ...(init && init.headers) } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const origin = new URL(request.url).origin;
    const target = getTarget(new URL(request.url));
    if (!target) {
      return cors(
        "Mist.Dev proxy is running.\n\nUsage:\n  " + origin + "/https://example.com\n  " + origin + "/?url=https://example.com\n",
        { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    try {
      const upstream = await fetch(target, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      const type = (upstream.headers.get("content-type") || "").toLowerCase();

      if (type.includes("text/html") || type.includes("application/xhtml+xml")) {
        let html = await upstream.text();
        html = rewriteHtml(html, target, origin);
        return cors(html, { status: upstream.status, headers: { "content-type": "text/html; charset=utf-8" } });
      }

      if (type.includes("text/css")) {
        let css = await upstream.text();
        css = rewriteCss(css, target, origin);
        return cors(css, { status: upstream.status, headers: { "content-type": "text/css; charset=utf-8" } });
      }

      const buf = await upstream.arrayBuffer();
      const headers = {};
      if (type) headers["content-type"] = type;
      return cors(buf, { status: upstream.status, headers });
    } catch (err) {
      return cors("Proxy error: " + err.message, { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
  },
};

function getTarget(u) {
  const fromQuery = u.searchParams.get("url");
  if (fromQuery && fromQuery.trim()) return fromQuery.trim();

  let raw = decodeURIComponent(u.pathname || "");
  if (raw.startsWith("/")) raw = raw.slice(1);
  if (!raw || raw.startsWith("?")) return null;

  if (raw.startsWith("https:/") && !raw.startsWith("https://")) raw = "https://" + raw.slice(7);
  else if (raw.startsWith("http:/") && !raw.startsWith("http://")) raw = "http://" + raw.slice(6);

  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return null;
  return raw;
}

const META_RX = /<meta[^>]+http-equiv\s*=\s*["']?(?:content-security-policy|x-frame-options|refresh)["']?[^>]*>/gis;
const INTEGRITY_RX = /\sintegrity\s*=\s*(?:"[^"]*"|'[^']*')/gi;
const ATTR_RX = /(\b(?:href|src|action|poster|data-src|data-href|formaction)\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/gi;
const SRCSET_RX = /(\bsrcset\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/gi;
const CSS_URL_RX = /url\(\s*(["']?)([^"')]+?)\1\s*\)/gi;

function rewriteHtml(html, base, origin) {
  html = html.replace(META_RX, "");
  html = html.replace(INTEGRITY_RX, "");
  html = html.replace(ATTR_RX, (m, pre, val) => pre + requote(val, (v) => resolve(v, base, origin)));
  html = html.replace(SRCSET_RX, (m, pre, val) => pre + requote(val, (v) => rewriteSrcset(v, base, origin)));
  html = rewriteCss(html, base, origin);
  return html;
}

function rewriteCss(css, base, origin) {
  return css.replace(CSS_URL_RX, (m, q, url) => "url(" + q + resolve(url, base, origin) + q + ")");
}

function rewriteSrcset(value, base, origin) {
  return value
    .split(",")
    .map((part) => {
      const p = part.trim();
      if (!p) return part;
      const sp = p.split(/\s+/, 2);
      const url = resolve(sp[0], base, origin);
      return sp.length > 1 ? url + " " + sp[1] : url;
    })
    .join(", ");
}

function requote(val, fn) {
  const first = val[0];
  if (first === '"' || first === "'") return first + fn(val.slice(1, -1)) + first;
  return fn(val);
}

function resolve(raw, base, origin) {
  raw = (raw || "").trim();
  if (!raw) return raw;
  if (/^(data:|javascript:|mailto:|tel:|blob:|about:|#)/i.test(raw)) return raw;
  try {
    const abs = new URL(raw, base);
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return raw;
    return origin + "/" + abs.href;
  } catch {
    return raw;
  }
}
