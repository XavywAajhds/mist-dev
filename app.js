/* ================= Mist.Dev ================= */
(function () {
  "use strict";

  const REAL_TITLE = "Mist.Dev";
  const FAVICON = "icons/favicon.png";
  const LS = "mistdev.settings";
  const DISCORD_URL = "https://discord.gg/TYbRtQRc7k";
  const ZONES_URLS = [
    "https://raw.githubusercontent.com/gn-math/assets/main/zones.json",
    "https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json",
  ];
  const HTML_BASE = "https://raw.githubusercontent.com/gn-math/html/main/";
  const COVER_FALLBACK = "https://cdn.jsdelivr.net/gh/gn-math/covers@main/";

  /* ---------- Settings ---------- */
  const defaults = { theme: "midnight", cloak: "google", cloakMode: "inactive", defaultTab: "browser", proxy: "", browserApp: "browser/index.html" };
  let settings = Object.assign({}, defaults);
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(LS) || "{}"));
  } catch (e) {}
  if (!settings.proxy) settings.proxy = defaults.proxy;
  if (settings.proxy === "http://localhost:8787/?url=") settings.proxy = "";
  if (!settings.browserApp || settings.browserApp === "/browser/" || settings.browserApp === "browser/" || settings.browserApp === "https://xavywaajhds.github.io/mist-browser/") settings.browserApp = defaults.browserApp;
  function save() {
    localStorage.setItem(LS, JSON.stringify(settings));
  }

  /* ---------- Themes (20) ---------- */
  const THEMES = [
    { key: "midnight", name: "Midnight", dots: ["#0f1117", "#171a23", "#6d8dff", "#a07bff"] },
    { key: "graphite", name: "Graphite", dots: ["#141414", "#1d1d1d", "#e0e0e0", "#9e9e9e"] },
    { key: "ocean", name: "Ocean", dots: ["#071019", "#0d1a26", "#2fc3ff", "#4f8dff"] },
    { key: "forest", name: "Forest", dots: ["#0a130d", "#101c13", "#43d17c", "#b6e35c"] },
    { key: "sunset", name: "Sunset", dots: ["#170d12", "#20131a", "#ff7a59", "#ff5fa2"] },
    { key: "synthwave", name: "Synthwave", dots: ["#12071c", "#1b0e29", "#ff4fd8", "#8a5bff"] },
    { key: "neon", name: "Neon", dots: ["#000000", "#070d0a", "#00ff9c", "#00e5ff"] },
    { key: "dracula", name: "Dracula", dots: ["#282a36", "#2f3241", "#bd93f9", "#ff79c6"] },
    { key: "nord", name: "Nord", dots: ["#2e3440", "#3b4252", "#88c0d0", "#81a1c1"] },
    { key: "gruvbox", name: "Gruvbox", dots: ["#1d2021", "#282828", "#fe8019", "#d3869b"] },
    { key: "mocha", name: "Catppuccin", dots: ["#1e1e2e", "#26273a", "#cba6f7", "#f5c2e7"] },
    { key: "solarized-light", name: "Solarized", dots: ["#fdf6e3", "#f7efdc", "#268bd2", "#cb4b16"] },
    { key: "light", name: "Light", dots: ["#f6f7fb", "#ffffff", "#4f6df5", "#8b5cf6"] },
    { key: "lavender", name: "Lavender", dots: ["#f4f1fb", "#ffffff", "#8b6df0", "#d16ba5"] },
    { key: "crimson", name: "Crimson", dots: ["#150708", "#1e0c0e", "#ff4d5e", "#ff8c5a"] },
    { key: "emerald", name: "Emerald", dots: ["#071412", "#0c1c19", "#2dd4bf", "#4ade80"] },
    { key: "cyberpunk", name: "Cyberpunk", dots: ["#0a0a12", "#12121c", "#fcee0a", "#00f0ff"] },
    { key: "arcade", name: "Arcade", dots: ["#120b1f", "#1a1130", "#ff9f1c", "#e53170"] },
    { key: "arctic", name: "Arctic", dots: ["#eef4f8", "#ffffff", "#2196f3", "#00bcd4"] },
    { key: "mango", name: "Mango", dots: ["#17100a", "#201609", "#ffb703", "#fb8500"] },
  ];

  /* ---------- Cloaks ---------- */
  const CLOAKS = [
    { id: "google", name: "Google (default)", title: "Google", icon: "https://www.google.com/favicon.ico" },
    { id: "youtube", name: "YouTube", title: "YouTube", icon: "https://www.youtube.com/favicon.ico" },
    { id: "github", name: "GitHub", title: "GitHub", icon: "https://github.com/favicon.ico" },
    { id: "classroom", name: "Google Classroom", title: "Google Classroom", icon: "https://classroom.google.com/favicon.ico" },
    { id: "drive", name: "Google Drive", title: "My Drive - Google Drive", icon: "https://drive.google.com/favicon.ico" },
    { id: "gmail", name: "Gmail", title: "Inbox (12) - Gmail", icon: "https://mail.google.com/favicon.ico" },
    { id: "docs", name: "Google Docs", title: "Untitled document - Google Docs", icon: "https://docs.google.com/favicon.ico" },
    { id: "meet", name: "Google Meet", title: "Meet", icon: "https://meet.google.com/favicon.ico" },
    { id: "discord", name: "Discord", title: "#general | Discord", icon: "https://discord.com/favicon.ico" },
    { id: "spotify", name: "Spotify", title: "Spotify - Web Player", icon: "https://open.spotify.com/favicon.ico" },
    { id: "netflix", name: "Netflix", title: "Netflix", icon: "https://www.netflix.com/favicon.ico" },
    { id: "wikipedia", name: "Wikipedia", title: "Wikipedia, the free encyclopedia", icon: "https://www.wikipedia.org/favicon.ico" },
    { id: "bing", name: "Bing", title: "Bing", icon: "https://www.bing.com/favicon.ico" },
    { id: "chatgpt", name: "ChatGPT", title: "ChatGPT", icon: "https://chatgpt.com/favicon.ico" },
    { id: "notion", name: "Notion", title: "Notion - Get organized", icon: "https://www.notion.so/favicon.ico" },
    { id: "canvas", name: "Classroom Dashboard", title: "Dashboard", icon: "https://canvas.instructure.com/favicon.ico" },
  ];

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- Navigation ---------- */
  let currentView = "browser";
  let lastBrowseView = "games";

  function showView(name) {
    if (name !== "player") lastBrowseView = name;
    if (currentView === "player" && name !== "player") $("#gameFrame").src = "about:blank";
    currentView = name;
    $$(".view").forEach((v) => v.classList.remove("active"));
    const el = $("#view-" + name);
    if (el) el.classList.add("active");
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    if (name !== "player") window.scrollTo(0, 0);
    if (name === "games") setTimeout(() => $("#searchInput").focus({ preventScroll: true }), 50);
    if (name === "browser") {
      setTimeout(() => {
        if (!browserTabs.length) newTab();
        const tab = activeTab();
        if (tab && tab.url) showBrowserPage();
        else showBrowserHome();
        bgResize();
        startBg();
        const focusEl = tab && tab.url ? $("#browserOmnibox") : $("#browserInput");
        focusEl.focus({ preventScroll: true });
      }, 50);
    } else {
      stopBg();
    }
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-view]");
    if (t) showView(t.dataset.view);
  });

  /* ---------- Themes ---------- */
  function applyTheme(key) {
    if (!THEMES.some((t) => t.key === key)) key = defaults.theme;
    document.documentElement.setAttribute("data-theme", key);
    settings.theme = key;
    save();
    bgColor = themePrimaryRgb();
    $$(".theme-card").forEach((c) => c.classList.toggle("active", c.dataset.theme === key));
  }

  function renderThemes() {
    const wrap = $("#themeGrid");
    wrap.innerHTML = "";
    THEMES.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "theme-card" + (t.key === settings.theme ? " active" : "");
      btn.dataset.theme = t.key;
      btn.innerHTML =
        '<div class="theme-dots">' +
        t.dots.map((c) => '<span style="background:' + c + '"></span>').join("") +
        '</div><div class="theme-name">' + t.name + "</div>";
      btn.addEventListener("click", () => applyTheme(t.key));
      wrap.appendChild(btn);
    });
  }

  /* ---------- Cloak ---------- */
  let cloakApplied = false;

  function setFavicon(href) {
    const link = $("#siteFavicon");
    link.href = href + (href.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now();
  }

  function currentCloak() {
    return CLOAKS.find((c) => c.id === settings.cloak) || CLOAKS[0];
  }

  function applyCloak() {
    const c = currentCloak();
    document.title = c.title;
    setFavicon(c.icon);
    cloakApplied = true;
  }

  function restoreSite() {
    document.title = REAL_TITLE;
    setFavicon(FAVICON);
    cloakApplied = false;
  }

  function updateCloak() {
    const mode = settings.cloakMode;
    if (mode === "off") {
      restoreSite();
      return;
    }
    if (mode === "always") {
      applyCloak();
      return;
    }
    // mode === "inactive"
    if (document.visibilityState === "hidden" || !document.hasFocus()) applyCloak();
    else restoreSite();
  }

  document.addEventListener("visibilitychange", updateCloak);
  window.addEventListener("blur", updateCloak);
  window.addEventListener("focus", updateCloak);
  window.addEventListener("pageshow", updateCloak);

  function renderCloakOptions() {
    const sel = $("#cloakSelect");
    sel.innerHTML = CLOAKS.map(
      (c) => '<option value="' + c.id + '">' + c.name + "</option>"
    ).join("");
    sel.value = settings.cloak;
    $("#cloakMode").value = settings.cloakMode;
    updateCloakPreview();
  }

  function updateCloakPreview() {
    const c = currentCloak();
    $("#cloakPreviewIcon").src = c.icon;
    $("#cloakPreviewTitle").textContent = c.title + "  (tab preview)";
  }

  /* ---------- Games ---------- */
  let games = [];
  let coverFallback = COVER_FALLBACK;

  function fixCover(img) {
    img.addEventListener("error", function onErr() {
      img.removeEventListener("error", onErr);
      const src = img.getAttribute("src") || "";
      if (src.indexOf("raw.githubusercontent.com") >= 0) {
        img.src = src.replace(
          "https://raw.githubusercontent.com/gn-math/covers/main/",
          coverFallback
        );
      }
    });
  }

  function cardHTML(g) {
    return (
      '<img class="card-cover" loading="lazy" src="' + g.cover + '" alt="' + esc(g.name) + '">' +
      '<div class="card-body"><div class="card-title">' + esc(g.name) + "</div>" +
      (g.author ? '<div class="card-author">' + esc(g.author) + "</div>" : "") +
      "</div>" +
      (g.featured ? '<span class="card-fav">FEATURED</span>' : "")
    );
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function makeCard(g) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = cardHTML(g);
    el.addEventListener("click", () => openGame(g));
    const img = el.querySelector("img");
    fixCover(img);
    return el;
  }

  function fillGrid(el, list) {
    el.innerHTML = "";
    const frag = document.createDocumentFragment();
    list.forEach((g) => frag.appendChild(makeCard(g)));
    el.appendChild(frag);
  }

  function renderGames() {
    const q = $("#searchInput").value.trim().toLowerCase();
    const sort = $("#sortSelect").value;
    const filter = ($(".chip.active") || {}).dataset ? $(".chip.active").dataset.filter : "all";

    let list = games;
    if (filter === "featured") list = list.filter((g) => g.featured);
    if (q) list = list.filter((g) => g.name.toLowerCase().includes(q) || (g.author || "").toLowerCase().includes(q));
    if (sort === "az") list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") list = list.slice().sort((a, b) => b.name.localeCompare(a.name));

    $("#gamesEmpty").hidden = list.length > 0;
    fillGrid($("#gamesGrid"), list.slice(0, 300));
    if (list.length > 300) $("#gamesEmpty").hidden = false, ($("#gamesEmpty").textContent = "Showing 300 of " + list.length + " matches - refine your search.");
    else $("#gamesEmpty").textContent = "No games match your search.";
  }

  /* ---------- Player ---------- */
  let currentGame = null;
  const SOUND_URL = "sound.mp3";
  let gameSound = null;

  function playGameOpenSound() {
    try {
      if (!gameSound) {
        gameSound = new Audio(SOUND_URL);
        gameSound.preload = "auto";
      }
      gameSound.currentTime = 0;
      const p = gameSound.play();
      if (p) p.catch(() => {});
    } catch (e) {}
  }

  async function loadGameHtml(g, attempt) {
    try {
      const r = await fetch(g.url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      let html = await r.text();
      if (html.indexOf("<base") === -1) {
        html = html.replace(/<head[^>]*>/i, (m) => m + '<base href="' + HTML_BASE + '">');
      }
      return html;
    } catch (e) {
      if (!attempt) {
        await new Promise((r) => setTimeout(r, 1500));
        return loadGameHtml(g, true);
      }
      throw e;
    }
  }

  function playerOverlay(msg) {
    const frame = $("#gameFrame");
    frame.removeAttribute("src");
    frame.srcdoc =
      '<style>body{background:#0f1117;color:#9aa3b5;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;font-size:15px}</style><div>' +
      msg +
      "</div>";
  }

  async function openGame(g) {
    if (!g) return;
    currentGame = g;
    playGameOpenSound();
    $("#playerTitle").textContent = g.name;
    showView("player");
    playerOverlay("Loading " + esc(g.name) + "...");
    try {
      const html = await loadGameHtml(g, 0);
      $("#gameFrame").srcdoc = html;
    } catch (e) {
      playerOverlay("Could not load this game (" + e.message + ").<br>Click reload to try again.");
    }
    focusGame();
  }

  $("#playerReload").addEventListener("click", () => openGame(currentGame));
  $("#playerPopout").addEventListener("click", async (e) => {
    e.preventDefault();
    if (!currentGame) return;
    try {
      const html = await loadGameHtml(currentGame, 0);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank");
    } catch (err) {
      alert("Could not load this game: " + err.message);
    }
  });
  $("#playerFullPage").addEventListener("click", async () => {
    if (!currentGame) return;
    try {
      const html = await loadGameHtml(currentGame, 0);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.location.href = url;
    } catch (err) {
      alert("Could not load this game: " + err.message);
    }
  });

  function focusGame() {
    const frame = $("#gameFrame");
    try {
      frame.focus();
      if (frame.contentWindow) frame.contentWindow.focus();
    } catch (e) {}
  }

  function closeGame() {
    const frame = $("#gameFrame");
    frame.src = "about:blank";
    showView(lastBrowseView === "player" ? "games" : lastBrowseView);
  }

  $("#playerBack").addEventListener("click", closeGame);
  $("#gameFrame").addEventListener("load", focusGame);
  $(".player-frame-wrap").addEventListener("mousedown", () => {
    if ($("#gameFrame").contentDocument || true) setTimeout(focusGame, 10);
  });
  document.addEventListener("keydown", (e) => {
    if (currentView === "player" && !document.fullscreenElement) {
      if (e.target === document.body || e.target === $(".player-frame-wrap")) {
        if (e.key.startsWith("Arrow") || e.key === " " || e.key === "Enter" || e.key === "Spacebar") focusGame();
      }
    }
    if (e.key === "Escape" && currentView === "player" && !document.fullscreenElement) closeGame();
  });
  $("#playerFull").addEventListener("click", () => {
    const wrap = $(".player-frame-wrap");
    if (document.fullscreenElement) document.exitFullscreen();
    else if (wrap.requestFullscreen) wrap.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", () => {
    $("#playerFull").innerHTML = document.fullscreenElement ? "&#x26F6; Exit" : "&#x26F6; Fullscreen";
  });

  /* ---------- Browser (BETA) ---------- */
  let browserTabs = [];
  let activeTabId = null;
  let tabSeq = 0;
  let usingAppBrowser = false;

  // CORS proxies used to pull a page's HTML so it can be rendered from srcdoc,
  // which sidesteps the X-Frame-Options / frame-ancestors blocks that stop
  // normal iframe embedding. A custom proxy (set in Settings) is tried first.
  const BUILTIN_PROXIES = [
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    (u) => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u),
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
    (u) => "https://api.cors.lol/?url=" + encodeURIComponent(u),
    (u) => "https://cors.eu.org/" + u,
    (u) => "https://thingproxy.freeboard.io/fetch/" + u,
  ];

  function browserProxies() {
    const list = [];
    const custom = (settings.proxy || "").trim();
    if (custom) {
      // "%s" is replaced by the target URL; otherwise the target is appended.
      list.push((u) => (custom.indexOf("%s") >= 0 ? custom.replace("%s", u) : custom + encodeURIComponent(u)));
    }
    return list.concat(BUILTIN_PROXIES);
  }

  function resolveBrowserUrl(value) {
    const v = value.trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    const looksLikeUrl = !/\s/.test(v) && /^[^\s]+\.[^\s]{2,}(\/\S*)?$/.test(v);
    if (looksLikeUrl) return "https://" + v;
    return "https://www.google.com/search?igu=1&q=" + encodeURIComponent(v);
  }

  function isSearchUrl(url) {
    return url.indexOf("https://www.google.com/search?igu=1") === 0;
  }

  async function fetchPageViaProxy(url) {
    let lastErr;
    for (const build of browserProxies()) {
      try {
        const r = await fetch(build(url));
        if (!r.ok) throw new Error("HTTP " + r.status);
        const text = await r.text();
        if (!text || !text.trim()) throw new Error("empty response");
        return text;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("proxy failed");
  }

  function baseHrefFor(url) {
    try {
      const u = new URL(url);
      if (/\.[a-z0-9]{1,6}$/i.test(u.pathname)) {
        return u.origin + u.pathname.replace(/[^/]*$/, "");
      }
      return u.origin + u.pathname + (u.pathname.endsWith("/") ? "" : "/");
    } catch (e) {
      return url;
    }
  }

  function preparePageHtml(html, url) {
    // Drop tags that would block framing or force a redirect.
    html = html
      .replace(/<meta[^>]+http-equiv=["']?(content-security-policy|x-frame-options|refresh)["']?[^>]*>/gi, "")
      .replace(/<base[^>]*>/gi, "");
    const base = '<base href="' + baseHrefFor(url) + '">';
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + base);
    else html = base + html;
    return html;
  }

  function updateBrowserButtons() {
    const tab = activeTab();
    $("#browserBack").disabled = !tab || tab.index <= 0;
    $("#browserForward").disabled = !tab || tab.index >= tab.history.length - 1;
  }

  /* ---------- Browser tabs ---------- */
  function activeTab() {
    return browserTabs.find((t) => t.id === activeTabId) || null;
  }

  function tabHost(url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, "");
    } catch (e) {
      return "";
    }
  }

  function tabTitleForUrl(url) {
    if (isSearchUrl(url)) return "Google Search";
    return tabHost(url) || url;
  }

  function faviconForUrl(url) {
    const host = tabHost(url);
    return host
      ? "https://www.google.com/s2/favicons?domain=" + host + "&sz=64"
      : "icons/globe.png";
  }

  function renderBrowserTabs() {
    const list = $("#browserTabList");
    list.innerHTML = "";
    browserTabs.forEach((tab) => {
      const el = document.createElement("div");
      el.className = "browser-tab" + (tab.id === activeTabId ? " active" : "");
      el.dataset.id = tab.id;
      el.innerHTML =
        '<img class="browser-tab-icon" alt="">' +
        '<div class="browser-tab-text">' +
        '<span class="browser-tab-title"></span>' +
        '<span class="browser-tab-url"></span>' +
        "</div>" +
        '<button class="browser-tab-close" title="Close tab">&times;</button>';
      const icon = el.querySelector(".browser-tab-icon");
      icon.addEventListener("error", function onErr() {
        icon.removeEventListener("error", onErr);
        icon.src = "icons/globe.png";
      });
      icon.src = tab.url ? faviconForUrl(tab.url) : "icons/globe.png";
      el.querySelector(".browser-tab-title").textContent = tab.title || "New Tab";
      el.querySelector(".browser-tab-url").textContent = tab.url || "Home";
      el.addEventListener("click", (e) => {
        if (e.target.closest(".browser-tab-close")) return;
        activateTab(tab.id);
      });
      el.querySelector(".browser-tab-close").addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });
      list.appendChild(el);
    });
  }

  function createTab(url, title) {
    const tab = { id: ++tabSeq, url: url || "", title: title || "", history: [], index: -1 };
    browserTabs.push(tab);
    return tab;
  }

  function newTab() {
    const tab = createTab();
    activeTabId = tab.id;
    renderBrowserTabs();
    showBrowserHome();
    $("#browserInput").focus({ preventScroll: true });
  }

  function activateTab(id) {
    if (id === activeTabId) return;
    activeTabId = id;
    renderBrowserTabs();
    const tab = activeTab();
    if (!tab) return;
    if (tab.url) loadBrowserUrl(tab.url, false);
    else showBrowserHome();
  }

  function closeTab(id) {
    const idx = browserTabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const wasActive = id === activeTabId;
    browserTabs.splice(idx, 1);
    if (!browserTabs.length) {
      newTab();
      return;
    }
    if (wasActive) {
      activeTabId = browserTabs[Math.min(idx, browserTabs.length - 1)].id;
      const tab = activeTab();
      if (tab.url) loadBrowserUrl(tab.url, false);
      else showBrowserHome();
    }
    renderBrowserTabs();
  }

  function showBrowserStatus(msg) {
    const box = $("#browserLoading");
    box.hidden = !msg;
    box.textContent = msg || "";
  }

  function showBrowserHome() {
    const tab = activeTab();
    if (tab) {
      tab.url = "";
      tab.title = "";
      tab.history = [];
      tab.index = -1;
    }
    $("#browserFrame").hidden = true;
    $("#browserNav").hidden = false;
    $("#browserNav").classList.add("home");
    $("#browserHomeView").hidden = false;
    showBrowserStatus("");
    renderBrowserTabs();
    updateBrowserButtons();
    $("#browserInput").value = "";
    $("#browserOmnibox").value = ""; $("#browserInput").value = ""; $("#browserInput").value = "";
  }

  function showBrowserPage() {
    $("#browserHomeView").hidden = true;
    $("#browserFrame").hidden = false;
    $("#browserNav").hidden = false;
    $("#browserNav").classList.remove("home");
  }

  async function loadBrowserUrl(url, pushHistory) {
    if (!url) return;
    const tab = activeTab();
    if (!tab) return;
    tab.url = url;
    tab.title = tabTitleForUrl(url);
    $("#browserInput").value = url; $("#browserOmnibox").value = url; $("#browserOmnibox").value = url;
    $("#browserOmnibox").value = url;
    $("#browserOpen").href = url;
    if (pushHistory) {
      tab.history = tab.history.slice(0, tab.index + 1);
      tab.history.push(url);
      tab.index = tab.history.length - 1;
    }
    renderBrowserTabs();
    updateBrowserButtons();
    showBrowserPage();

    const frame = $("#browserFrame");

    // A self-hosted proxy app (Settings -> Browser) handles everything itself.
    const appUrl = browserAppUrl(url);
    usingAppBrowser = !!appUrl;
    if (appUrl) {
      frame.removeAttribute("srcdoc");
      frame.src = appUrl;
      $("#browserOpen").href = appUrl;
      showBrowserStatus("");
      return;
    }

    // Searches use the frame-friendly Google endpoint directly.
    if (isSearchUrl(url)) {
      frame.removeAttribute("srcdoc");
      frame.src = url;
      showBrowserStatus("");
      return;
    }

    // Everything else: fetch the HTML through a proxy and render it ourselves.
    const localHint =
      location.protocol === "file:"
        ? " Serve this folder over http (e.g. python -m http.server) to enable the embedded browser."
        : "";
    showBrowserStatus("Loading " + url + " ...");
    // Opened from disk: cross-origin fetch is blocked, so go straight to a
    // plain iframe instead of waiting on proxies that cannot answer.
    if (location.protocol === "file:") {
      frame.removeAttribute("srcdoc");
      frame.src = url;
      showBrowserStatus("Loaded directly." + localHint);
      setTimeout(() => showBrowserStatus(""), 4000);
      return;
    }
    try {
      const html = await fetchPageViaProxy(url);
      frame.removeAttribute("src");
      frame.srcdoc = preparePageHtml(html, url);
      showBrowserStatus("");
    } catch (e) {
      // Fall back to a plain iframe in case the proxy is down.
      frame.removeAttribute("srcdoc");
      frame.src = url;
      showBrowserStatus("Loaded directly (proxy unavailable)." + localHint + " Some sites may refuse to display.");
      setTimeout(() => showBrowserStatus(""), 4000);
    }
  }

  function browserAppUrl(url) {
    const base = (settings.browserApp || "").trim();
    if (!base) return "";
    // Opened straight from disk (file://): the app cannot run there (service
    // workers need http/https), and a directory URL would just show a raw
    // file listing. Fall through to the plain-proxy renderer instead.
    if (location.protocol === "file:") return "";
    // A same-origin app needs a secure context (service workers). An absolute
    // https app works even when this page itself is served over http.
    const absoluteHttps = /^https:\/\//i.test(base);
    if (!absoluteHttps && !window.isSecureContext) return "";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "url=" + encodeURIComponent(url);
  }

  function browserGo(source) {
    const input = source === "home" ? $("#browserInput") : $("#browserOmnibox");
    const url = resolveBrowserUrl(input.value);
    if (!url) return;
    loadBrowserUrl(url, true);
  }

  $("#browserGo").addEventListener("click", () => browserGo("home"));
  $("#browserRandom").addEventListener("click", () => {
    const shortcuts = $$(".browser-shortcut");
    if (!shortcuts.length) return;
    const pick = shortcuts[Math.floor(Math.random() * shortcuts.length)];
    loadBrowserUrl(pick.dataset.url, true);
  });
  $("#browserOmniboxForm").addEventListener("submit", (event) => {
    event.preventDefault();
    browserGo();
  });
  $("#browserInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") browserGo("home");
  });
  $("#browserBack").addEventListener("click", () => {
    const tab = activeTab();
    if (tab && tab.index > 0) {
      tab.index--;
      loadBrowserUrl(tab.history[tab.index], false);
    }
  });
  $("#browserForward").addEventListener("click", () => {
    const tab = activeTab();
    if (tab && tab.index < tab.history.length - 1) {
      tab.index++;
      loadBrowserUrl(tab.history[tab.index], false);
    }
  });
  $("#browserReload").addEventListener("click", () => {
    const tab = activeTab();
    if (!tab || !tab.url) return;
    // The embedded app owns its own frame history; a reload there must not
    // restart the whole app.
    if (usingAppBrowser) {
      const frame = $("#browserFrame");
      if (frame && frame.contentWindow) frame.contentWindow.postMessage({ mist: "reload" }, "*");
      return;
    }
    loadBrowserUrl(tab.url, false);
  });
  $("#browserHome").addEventListener("click", showBrowserHome);
  $("#browserExit").addEventListener("click", () => showView("games"));
  $("#browserTabAdd").addEventListener("click", newTab);
  $$(".browser-shortcut").forEach((btn) => {
    btn.addEventListener("click", () => loadBrowserUrl(btn.dataset.url, true));
  });

  // Messages from the embedded browser app (browser/): it has its own toolbar,
  // so its omnibox keeps the active tab's URL in sync and its close button
  // exits back to Games.
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || typeof d !== "object" || !d.mist) return;
    if (d.mist === "exit") {
      showView("games");
    } else if (d.mist === "home") {
      showBrowserHome();
    } else if (d.mist === "navigate" && typeof d.url === "string") {
      const tab = activeTab();
      if (!tab) return;
      tab.url = d.url;
      tab.title = tabTitleForUrl(d.url);
      $("#browserInput").value = d.url;
      $("#browserOmnibox").value = d.url;
      renderBrowserTabs();
    }
  });

  /* ---------- Browser background (dot network) ---------- */
  const bgCanvas = $("#browserCanvas");
  const bgCtx = bgCanvas.getContext("2d");
  let bgColor = [109, 141, 255];
  let bgDots = [];
  let bgW = 0;
  let bgH = 0;
  let bgRAF = null;
  const bgMouse = { x: -9999, y: -9999 };

  function themePrimaryRgb() {
    const hex = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim().replace("#", "");
    if (hex.length === 3) return hex.split("").map((c) => parseInt(c + c, 16));
    if (hex.length >= 6) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    return [109, 141, 255];
  }

  function bgResize() {
    if (!bgCanvas) return;
    const rect = bgCanvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    bgW = rect.width;
    bgH = rect.height;
    bgCanvas.width = Math.max(1, Math.round(bgW * dpr));
    bgCanvas.height = Math.max(1, Math.round(bgH * dpr));
    bgCanvas.style.width = bgW + "px";
    bgCanvas.style.height = bgH + "px";
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(24, Math.min(110, Math.round((bgW * bgH) / 13000)));
    bgDots = [];
    for (let i = 0; i < count; i++) {
      bgDots.push({
        x: Math.random() * bgW,
        y: Math.random() * bgH,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        r: 1.4 + Math.random() * 1.6,
      });
    }
  }

  function bgStep() {
    if (!bgW || !bgH) {
      bgRAF = requestAnimationFrame(bgStep);
      return;
    }
    const [r, g, b] = bgColor;
    const linkDist = 130;
    const mouseDist = 190;
    bgCtx.clearRect(0, 0, bgW, bgH);

    for (const d of bgDots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x <= 0 || d.x >= bgW) d.vx *= -1;
      if (d.y <= 0 || d.y >= bgH) d.vy *= -1;
      d.x = Math.max(0, Math.min(bgW, d.x));
      d.y = Math.max(0, Math.min(bgH, d.y));
    }

    bgCtx.lineWidth = 1;
    for (let i = 0; i < bgDots.length; i++) {
      const a = bgDots[i];
      for (let j = i + 1; j < bgDots.length; j++) {
        const c = bgDots[j];
        const dist = Math.hypot(a.x - c.x, a.y - c.y);
        if (dist < linkDist) {
          bgCtx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + (1 - dist / linkDist) * 0.32 + ")";
          bgCtx.beginPath();
          bgCtx.moveTo(a.x, a.y);
          bgCtx.lineTo(c.x, c.y);
          bgCtx.stroke();
        }
      }
      const md = Math.hypot(a.x - bgMouse.x, a.y - bgMouse.y);
      if (md < mouseDist) {
        bgCtx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + (1 - md / mouseDist) * 0.5 + ")";
        bgCtx.beginPath();
        bgCtx.moveTo(a.x, a.y);
        bgCtx.lineTo(bgMouse.x, bgMouse.y);
        bgCtx.stroke();
      }
    }

    bgCtx.fillStyle = "rgba(" + r + "," + g + "," + b + ",0.75)";
    for (const d of bgDots) {
      bgCtx.beginPath();
      bgCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      bgCtx.fill();
    }

    bgRAF = requestAnimationFrame(bgStep);
  }

  function startBg() {
    if (bgRAF) return;
    bgRAF = requestAnimationFrame(bgStep);
  }

  function stopBg() {
    if (bgRAF) {
      cancelAnimationFrame(bgRAF);
      bgRAF = null;
    }
  }

  bgCanvas.parentElement.addEventListener("mousemove", (e) => {
    const rect = bgCanvas.getBoundingClientRect();
    bgMouse.x = e.clientX - rect.left;
    bgMouse.y = e.clientY - rect.top;
  });
  bgCanvas.parentElement.addEventListener("mouseleave", () => {
    bgMouse.x = -9999;
    bgMouse.y = -9999;
  });
  window.addEventListener("resize", () => {
    if (currentView === "browser") bgResize();
  });

  /* ---------- Load games ---------- */
  async function fetchJson(urls) {
    let lastErr;
    for (const u of urls) {
      try {
        const r = await fetch(u);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.json();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("fetch failed");
  }

  async function loadGames() {
    $("#gamesLoading").hidden = false;
    try {
      const data = await fetchJson(ZONES_URLS);
      games = (data || [])
        .filter((g) => g.id >= 0)
        .map((g) => {
          let cover = g.cover || "";
          let url = g.url || "";
          if (cover.includes("{COVER_URL}/")) cover = "https://raw.githubusercontent.com/gn-math/covers/main/" + cover.split("{COVER_URL}/")[1];
          if (url.includes("{HTML_URL}/")) url = url.replace("{HTML_URL}/", HTML_BASE);
          return { id: g.id, name: g.name, cover, url, author: g.author || "", featured: !!g.featured, special: g.special || null };
        });
      $("#gameCount").textContent = games.length;
      $("#gamesLoading").hidden = true;
      $("#searchInput").placeholder = "Search " + games.length + "+ games...";
      renderGames();
      localStorage.setItem("mistdev.games.cache", JSON.stringify({ at: Date.now(), list: games }));
    } catch (e) {
      try {
        const cached = JSON.parse(localStorage.getItem("mistdev.games.cache") || "{}");
        if (cached.list && cached.list.length) {
          games = cached.list;
          $("#gameCount").textContent = games.length;
          $("#gamesLoading").hidden = true;
          renderGames();
          return;
        }
      } catch (e2) {}
      $("#gamesLoading").textContent = "Could not load games: " + e.message + " - Retrying...";
      setTimeout(loadGames, 4000);
    }
  }

  /* ---------- Events ---------- */
  $("#searchInput").addEventListener("input", renderGames);
  $("#sortSelect").addEventListener("change", renderGames);
  $("#filterChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $$(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    renderGames();
  });

  $("#cloakSelect").addEventListener("change", (e) => {
    settings.cloak = e.target.value;
    save();
    updateCloakPreview();
    updateCloak();
  });
  $("#cloakMode").addEventListener("change", (e) => {
    settings.cloakMode = e.target.value;
    save();
    updateCloak();
  });
  $("#defaultTab").addEventListener("change", (e) => {
    settings.defaultTab = e.target.value;
    save();
  });
  $("#proxyInput").addEventListener("change", (e) => {
    settings.proxy = e.target.value.trim();
    save();
  });
  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Reset theme, cloak and tab settings to defaults?")) {
      localStorage.removeItem(LS);
      location.reload();
    }
  });

  /* ---------- Boot ---------- */
  applyTheme(settings.theme);
  renderThemes();
  renderCloakOptions();
  $("#defaultTab").value = settings.defaultTab;
  $("#proxyInput").value = settings.proxy || "";
  $("#browserAppInput").value = settings.browserApp || "";
  $("#browserAppInput").addEventListener("change", (e) => {
    settings.browserApp = e.target.value.trim();
    save();
  });
  if (!browserTabs.length) newTab();
  showView(settings.defaultTab === "games" ? "games" : "browser");
  document.title = REAL_TITLE;
  loadGames();
})();
