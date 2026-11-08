// Synchronisation des actualités : lit les flux RSS/Atom, classe les articles
// et écrit data/news.json (fil récent) et data/archive.json (mémoire des dossiers).
// Node 18+ requis, aucune dépendance.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FEEDS } from "./feeds.mjs";
import { parseFeed, get } from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

const NEWS_LIMIT = 250;          // articles gardés dans le fil
const ARCHIVE_LIMIT = 4000;      // articles gardés dans l'archive
const ARCHIVE_DAYS = 120;        // durée de conservation
const SUMMARY_MAX = 220;         // extrait court, le texte complet reste chez l'éditeur

const TOPIC_RULES = [
  ["conflits", /guerre|conflit|arm[ée]e|attaque|frappes? (?:a[ée]riennes?|militaires?|russes?|isra[ée]liennes?)|cessez-le-feu|militaire|otages?|bombard|missile|terroris/i],
  ["climat", /climat|\bcop\s?\d*|r[ée]chauffement|biodiversit|[ée]missions|environnement|cyclone|inondation|s[ée]cheresse|canicule|incendie|ouragan|temp[êe]te/i],
  ["economie", /[ée]conomi|inflation|bourse|march[ée]s?|croissance|banque|p[ée]trole|commerce|douane|tarif|dette|\bFMI\b|taux d|entreprise|chômage|budget/i],
  ["sante", /sant[ée]|[ée]pid[ée]mie|virus|vaccin|\bOMS\b|ebola|paludisme|choléra|h[ôo]pital|maladie/i],
  ["sciences", /scien|intelligence artificielle|spatial|\bnasa\b|technolog|num[ée]rique|chercheurs?|d[ée]couverte|astronom|fus[ée]e|robot/i],
  ["politique", /[ée]lection|pr[ée]sident|gouvernement|parlement|ministre|\bvote|scrutin|coup d'[ée]tat|sommet|diplomat|premier ministre/i],
];
const MADAGASCAR = /madagascar|malgache|antananarivo|tananarive|nosy be|toamasina|mahajanga|toliara|antsiranana/i;

function shorten(s) {
  if (s.length <= SUMMARY_MAX) return s;
  const cut = s.slice(0, SUMMARY_MAX);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\s]+$/, "") + "…";
}

function classify(text) {
  for (const [id, re] of TOPIC_RULES) if (re.test(text)) return id;
  return "societe";
}

async function fetchFeed(feed) {
  const items = parseFeed(await get(feed.url));
  return items
    .filter((i) => i.title && /^https?:\/\//i.test(i.url))
    .map((i) => {
      const text = `${i.title} ${i.summary}`;
      const regions = [...feed.regions];
      if (MADAGASCAR.test(text)) regions.push("madagascar");
      return {
        id: createHash("sha1").update(i.url).digest("hex").slice(0, 16),
        title: i.title,
        url: i.url,
        source: feed.source,
        regions,
        topic: classify(text),
        date: i.date || new Date().toISOString(),
        summary: shorten(i.summary),
      };
    });
}

async function readJSON(file, fallback) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; }
}

async function main() {
  await mkdir(DATA, { recursive: true });
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  let fresh = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") { console.log(`OK    ${FEEDS[i].source}: ${r.value.length} articles`); fresh.push(...r.value); }
    else console.warn(`ÉCHEC ${FEEDS[i].source}: ${r.reason?.message || r.reason}`);
  });

  if (!fresh.length) {
    console.error("Aucun flux n'a répondu : les données existantes sont conservées.");
    process.exit(1);
  }

  const now = Date.now();
  const archivePrev = (await readJSON(join(DATA, "archive.json"), { items: [] })).items || [];
  const byId = new Map();
  for (const it of [...archivePrev, ...fresh]) {
    const old = byId.get(it.id);
    // Les articles récents remplacent les anciens ; les régions s'additionnent.
    byId.set(it.id, old ? { ...it, regions: [...new Set([...(old.regions || []), ...it.regions])] } : it);
  }
  const all = [...byId.values()]
    .filter((it) => now - new Date(it.date) < ARCHIVE_DAYS * 864e5 && new Date(it.date) <= now + 36e5)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const updated = new Date().toISOString();
  await writeFile(join(DATA, "news.json"), JSON.stringify({ updated, items: all.slice(0, NEWS_LIMIT) }));
  await writeFile(join(DATA, "archive.json"), JSON.stringify({ updated, items: all.slice(0, ARCHIVE_LIMIT) }));
  console.log(`Écrit : ${Math.min(all.length, NEWS_LIMIT)} articles dans le fil, ${Math.min(all.length, ARCHIVE_LIMIT)} dans l'archive.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
