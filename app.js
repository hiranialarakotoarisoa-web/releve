(() => {
  const REGIONS = [
    ["tout", "Monde entier"],
    ["monde", "International"],
    ["afrique", "Afrique"],
    ["madagascar", "Madagascar"],
    ["economie", "Économie"],
    ["planete", "Planète et sciences"],
  ];
  const TOPICS = {
    climat: "Climat et environnement",
    economie: "Économie",
    conflits: "Conflits",
    politique: "Politique",
    sante: "Santé",
    sciences: "Sciences et technologies",
    societe: "Société",
  };
  const POLL_MS = 10 * 60 * 1000;

  const $ = (s) => document.querySelector(s);
  const state = { items: [], archive: null, updated: null, region: "tout", q: "", view: "feed" };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : "#");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const fmtTime = (d) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dayKey = (d) => new Date(d).toLocaleDateString("fr-CA");
  const fmtDay = (d) =>
    new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function ago(iso) {
    const min = Math.round((Date.now() - new Date(iso)) / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 48) return `il y a ${h} h`;
    return `il y a ${Math.round(h / 24)} jours`;
  }

  function matches(it) {
    if (state.region !== "tout" && !(it.regions || []).includes(state.region)) return false;
    if (state.q && !norm(`${it.title} ${it.summary} ${it.source}`).includes(norm(state.q))) return false;
    return true;
  }

  function renderRegions() {
    $("#regions").innerHTML = REGIONS.map(([id, label]) => {
      const n = id === "tout" ? state.items.length : state.items.filter((i) => (i.regions || []).includes(id)).length;
      return `<li><button type="button" data-r="${id}" aria-pressed="${state.region === id}"><span>${label}</span><span class="count">${n}</span></button></li>`;
    }).join("");
  }

  function renderSync() {
    const el = $("#sync");
    if (!state.updated) {
      el.classList.remove("ok");
      $("#sync-text").textContent = "Pas encore de synchronisation";
      return;
    }
    el.classList.add("ok");
    $("#sync-text").textContent = `Synchronisé ${ago(state.updated)} · ${state.items.length} articles`;
  }

  function emptyState(reason) {
    return `<div class="empty"><h2>${esc(reason)}</h2>
      <p>La synchronisation remplit <code>data/news.json</code>. Pour la lancer à la main : <code>node scripts/update-news.mjs</code>, puis ouvrez le site via un serveur local (<code>npx serve .</code>), pas en double-cliquant sur le fichier.</p></div>`;
  }

  function renderFeed() {
    const list = state.items.filter(matches);
    const root = $("#view-feed");
    if (!state.items.length) { root.innerHTML = emptyState("Aucun article pour l'instant"); return; }
    if (!list.length) { root.innerHTML = emptyState("Aucun résultat pour ce filtre"); return; }

    const [lead, ...rest] = list;
    let html = `<article class="lead">
      <div class="meta"><strong>${esc(lead.source)}</strong><span>${ago(lead.date)}</span><span class="tag">${esc(TOPICS[lead.topic] || "Société")}</span></div>
      <h2><a href="${safeUrl(lead.url)}" target="_blank" rel="noopener noreferrer">${esc(lead.title)}</a></h2>
      ${lead.summary ? `<p>${esc(lead.summary)}</p>` : ""}
    </article>`;

    let current = "";
    for (const it of rest.slice(0, 120)) {
      const k = dayKey(it.date);
      if (k !== current) { current = k; html += `<h3 class="day">${esc(fmtDay(it.date))}</h3>`; }
      html += `<article class="row">
        <time datetime="${esc(it.date)}">${fmtTime(it.date)}</time>
        <div>
          <div class="meta"><strong>${esc(it.source)}</strong><span class="tag">${esc(TOPICS[it.topic] || "Société")}</span></div>
          <h3><a href="${safeUrl(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.title)}</a></h3>
          ${it.summary ? `<p>${esc(it.summary)}</p>` : ""}
        </div></article>`;
    }
    root.innerHTML = html;
  }

  function renderDossiers() {
    const root = $("#view-dossiers");
    const pool = (state.archive || state.items).filter(matches);
    if (!pool.length) { root.innerHTML = emptyState("Aucun dossier à afficher"); return; }
    const days = 14;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const cards = Object.entries(TOPICS).map(([id, label]) => {
      const its = pool.filter((i) => i.topic === id).sort((a, b) => new Date(b.date) - new Date(a.date));
      if (!its.length) return "";
      const buckets = Array(days).fill(0);
      for (const it of its) {
        const diff = Math.floor((today - new Date(new Date(it.date).setHours(0, 0, 0, 0))) / 864e5);
        if (diff >= 0 && diff < days) buckets[days - 1 - diff]++;
      }
      const max = Math.max(1, ...buckets);
      const spark = buckets.map((n) => `<i class="${n ? "" : "zero"}" style="height:${Math.max(4, (n / max) * 100)}%" title="${n} article(s)"></i>`).join("");
      const sources = new Set(its.map((i) => i.source)).size;
      return `<section class="dossier" aria-label="${esc(label)}">
        <h3>${esc(label)}</h3>
        <p class="big">${its.length} articles · ${sources} sources · 14 derniers jours</p>
        <div class="spark" role="img" aria-label="Volume d'articles par jour sur 14 jours">${spark}</div>
        <ol>${its.slice(0, 5).map((i) => `<li><a href="${safeUrl(i.url)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a><span>${esc(i.source)} · ${ago(i.date)}</span></li>`).join("")}</ol>
      </section>`;
    }).join("");

    root.innerHTML = `<h2 class="view-title">Dossiers thématiques</h2>
      <p class="view-lede">Les articles sont classés par thème à chaque synchronisation. La courbe montre le rythme de publication sur deux semaines.</p>
      <div class="dossier-grid">${cards}</div>`;
  }

  function render() {
    renderRegions(); renderSync();
    if (state.view === "feed") renderFeed(); else renderDossiers();
  }

  function setView(v) {
    state.view = v;
    $("#view-feed").hidden = v !== "feed";
    $("#view-dossiers").hidden = v !== "dossiers";
    $("#tab-feed").setAttribute("aria-selected", v === "feed");
    $("#tab-dossiers").setAttribute("aria-selected", v === "dossiers");
    if (v === "dossiers" && !state.archive) loadArchive().then(render); else render();
  }

  async function getJSON(path) {
    const r = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error(path + " " + r.status);
    return r.json();
  }
  async function load() {
    try {
      const d = await getJSON("data/news.json");
      state.items = (d.items || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      state.updated = d.updated || null;
    } catch (e) {
      state.items = []; state.updated = null;
      $("#sync-text").textContent = "Données introuvables";
    }
    render();
  }
  async function loadArchive() {
    try { state.archive = (await getJSON("data/archive.json")).items || null; } catch { state.archive = null; }
  }

  $("#regions").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-r]");
    if (!b) return;
    state.region = b.dataset.r; render();
  });
  $("#q").addEventListener("input", (e) => { state.q = e.target.value.trim(); render(); });
  $("#tab-feed").addEventListener("click", () => setView("feed"));
  $("#tab-dossiers").addEventListener("click", () => setView("dossiers"));

  load();
  setInterval(() => { load(); if (state.archive) loadArchive(); }, POLL_MS);
  setInterval(renderSync, 60 * 1000);
})();
