// Fonctions communes : lecture d'un flux RSS/Atom.
export const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
export const clean = (s) => decode(decode(s)).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}
export function atomLink(block) {
  const m = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

export function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  return blocks.map((b) => {
    const title = clean(tag(b, "title"));
    const url = clean(tag(b, "link")) || atomLink(b) || clean(tag(b, "guid"));
    const dateRaw = clean(tag(b, "pubDate") || tag(b, "dc:date") || tag(b, "published") || tag(b, "updated"));
    const summary = clean(tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded") || tag(b, "content"));
    const date = new Date(dateRaw);
    return { title, url, summary, date: isNaN(date) ? null : date.toISOString() };
  });
}

export const HEADERS = {
  "User-Agent": "Releve/1.0 (+revue de presse statique)",
  Accept: "application/rss+xml, application/atom+xml, text/xml, */*",
};

export async function get(url, ms = 20000) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(ms), redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
