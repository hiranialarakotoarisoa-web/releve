// Teste chaque flux de feeds.mjs et aide à réparer ceux qui ne répondent plus.
//   node scripts/check-feeds.mjs           → tableau de l'état de chaque flux
//   node scripts/check-feeds.mjs --strict  → code de sortie 1 si un flux est en échec (pour le workflow)
// Pour chaque flux en échec, le script cherche une adresse de remplacement :
//   1. la balise <link rel="alternate" type="application/rss+xml"> de la page d'accueil du média ;
//   2. les adresses usuelles : /feed, /feed/, /rss, /rss.xml, /rss/.
import { FEEDS } from "./feeds.mjs";
import { parseFeed, get } from "./lib.mjs";

const STALE_DAYS = 7;
const strict = process.argv.includes("--strict");
const DAY = 864e5;

async function probe(url) {
  const xml = await get(url, 15000);
  const items = parseFeed(xml);
  if (!items.length) throw new Error("réponse sans article (pas un flux RSS/Atom ?)");
  const dates = items.map((i) => (i.date ? new Date(i.date).getTime() : 0));
  return { count: items.length, last: Math.max(...dates) };
}

function age(ts) {
  if (!ts) return "date inconnue";
  const d = (Date.now() - ts) / DAY;
  if (d < 1) return `${Math.max(1, Math.round(d * 24))} h`;
  return `${Math.round(d)} j`;
}

async function discover(feed) {
  if (!feed.site) return [];
  const found = [];
  try {
    const html = await get(feed.site, 15000);
    for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
      const t = m[0];
      if (!/type=["']application\/(rss|atom)\+xml["']/i.test(t)) continue;
      const href = t.match(/href=["']([^"']+)["']/i)?.[1];
      if (href) found.push(new URL(href, feed.site).href);
    }
  } catch { /* la page d'accueil ne répond pas : on passe aux adresses usuelles */ }
  const origin = new URL(feed.site).origin;
  for (const p of ["/feed", "/feed/", "/rss", "/rss.xml", "/rss/"]) found.push(origin + p);
  return [...new Set(found)].filter((u) => u !== feed.url);
}

async function suggest(feed) {
  for (const candidate of await discover(feed)) {
    try {
      const r = await probe(candidate);
      return { url: candidate, ...r };
    } catch { /* essai suivant */ }
  }
  return null;
}

async function check(feed) {
  try {
    const r = await probe(feed.url);
    const stale = r.last && Date.now() - r.last > STALE_DAYS * DAY;
    return { feed, status: stale ? "ancien" : "ok", ...r };
  } catch (e) {
    return { feed, status: "échec", error: e.message, fix: await suggest(feed) };
  }
}

const results = await Promise.all(FEEDS.map(check));
const pad = (s, n) => String(s).padEnd(n);
const width = Math.max(...FEEDS.map((f) => f.source.length)) + 2;

console.log(`${pad("Source", width)}${pad("État", 8)}${pad("Articles", 10)}Dernier article`);
console.log("-".repeat(width + 34));
for (const r of results) {
  const icon = { ok: "OK", ancien: "ANCIEN", échec: "ÉCHEC" }[r.status];
  const detail = r.status === "échec" ? r.error : age(r.last);
  console.log(`${pad(r.feed.source, width)}${pad(icon, 8)}${pad(r.count ?? "-", 10)}${detail}`);
}

const problems = results.filter((r) => r.status !== "ok");
for (const r of problems) {
  console.log(`\n${r.feed.source} : ${r.feed.url}`);
  if (r.status === "ancien") {
    console.log(`  Le flux répond mais rien n'a été publié depuis plus de ${STALE_DAYS} jours : adresse abandonnée ?`);
  }
  if (r.fix) {
    console.log(`  Adresse qui fonctionne : ${r.fix.url} (${r.fix.count} articles, dernier il y a ${age(r.fix.last)})`);
    console.log(`  → remplacez l'url de « ${r.feed.source} » dans scripts/feeds.mjs.`);
  } else if (r.status === "échec") {
    console.log("  Aucune adresse de remplacement trouvée. Cherchez un lien « RSS » sur le site du média ou demandez-le à la rédaction.");
  }
}

const ok = results.filter((r) => r.status === "ok").length;
console.log(`\n${ok}/${results.length} flux en bon état.`);
if (strict && results.some((r) => r.status === "échec")) process.exit(1);
