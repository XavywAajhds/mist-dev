/* ================= Mist.Dev ================= */
(function () {
  "use strict";

  const REAL_TITLE = "Mist.Dev";
  const FAVICON = "/icons/favicon.png";
  const LS = "mistdev.settings";
  const DISCORD_URL = "https://discord.gg/TYbRtQRc7k";
  const ZONES_URLS = [
    "https://raw.githubusercontent.com/gn-math/assets/main/zones.json",
    "https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json",
  ];
  const HTML_BASE = "https://raw.githubusercontent.com/gn-math/html/main/";
  const COVER_FALLBACK = "https://cdn.jsdelivr.net/gh/gn-math/covers@main/";

  /* ---------- Settings ---------- */
  const defaults = { theme: "midnight", cloak: "google", cloakMode: "inactive", defaultTab: "home" };
  let settings = Object.assign({}, defaults);
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(LS) || "{}"));
  } catch (e) {}
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
  let currentView = "home";
  let lastBrowseView = "games";

  function showView(name) {
    if (name !== "player") lastBrowseView = name === "home" ? "home" : "games";
    if (currentView === "player" && name !== "player") $("#gameFrame").src = "about:blank";
    currentView = name;
    $$(".view").forEach((v) => v.classList.remove("active"));
    const el = $("#view-" + name);
    if (el) el.classList.add("active");
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    if (name !== "player") window.scrollTo(0, 0);
    if (name === "games") setTimeout(() => $("#searchInput").focus({ preventScroll: true }), 50);
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

  function renderHome() {
    const featured = games.filter((g) => g.featured);
    fillGrid($("#featuredGrid"), featured.slice(0, 10));
    fillGrid($("#popularGrid"), games.slice(0, 10));
    $("#heroStats").innerHTML =
      "<span><b>" + games.length + "</b>games</span>" +
      "<span><b>" + featured.length + "</b>featured</span>" +
      "<span><b>20</b>themes</span>" +
      "<span><b>Free</b>forever</span>";
    $("#discordBtn").href = DISCORD_URL;
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

  function openGame(g) {
    currentGame = g;
    $("#playerTitle").textContent = g.name;
    $("#playerPopout").href = g.url;
    const frame = $("#gameFrame");
    frame.src = g.url;
    showView("player");
    focusGame();
  }

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
  $("#playerReload").addEventListener("click", () => {
    if (currentGame) {
      $("#gameFrame").src = currentGame.url;
      focusGame();
    }
  });
  $("#playerFullPage").addEventListener("click", () => {
    if (currentGame) {
      const url = currentGame.url.split("?")[0] + "?fullpage=1";
      window.location.href = url;
    }
  });
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
      renderHome();
      renderGames();
      localStorage.setItem("mistdev.games.cache", JSON.stringify({ at: Date.now(), list: games }));
    } catch (e) {
      try {
        const cached = JSON.parse(localStorage.getItem("mistdev.games.cache") || "{}");
        if (cached.list && cached.list.length) {
          games = cached.list;
          $("#gameCount").textContent = games.length;
          $("#gamesLoading").hidden = true;
          renderHome();
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

  $("#heroPlay").addEventListener("click", () => showView("games"));
  $("#heroRandom").addEventListener("click", () => {
    if (games.length) openGame(games[Math.floor(Math.random() * games.length)]);
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
  showView(settings.defaultTab === "games" ? "games" : "home");
  document.title = REAL_TITLE;
  loadGames();
})();
