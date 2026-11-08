// Liste des sources, partagée par update-news.mjs et check-feeds.mjs.
// "regions" : filtres du site auxquels le flux appartient.
// "site" (facultatif) : page d'accueil du média, utilisée par check-feeds.mjs
//   pour retrouver le flux si l'adresse ne répond plus.
export const FEEDS = [
  { source: "RFI", url: "https://www.rfi.fr/fr/rss", site: "https://www.rfi.fr/fr/", regions: ["monde"] },
  { source: "RFI Afrique", url: "https://www.rfi.fr/fr/afrique/rss", site: "https://www.rfi.fr/fr/afrique/", regions: ["afrique"] },
  { source: "RFI Économie", url: "https://www.rfi.fr/fr/economie/rss", site: "https://www.rfi.fr/fr/economie/", regions: ["economie"] },
  { source: "France 24", url: "https://www.france24.com/fr/rss", site: "https://www.france24.com/fr/", regions: ["monde"] },
  { source: "Le Monde International", url: "https://www.lemonde.fr/international/rss_full.xml", site: "https://www.lemonde.fr/international/", regions: ["monde"] },
  { source: "Le Monde Afrique", url: "https://www.lemonde.fr/afrique/rss_full.xml", site: "https://www.lemonde.fr/afrique/", regions: ["afrique"] },
  { source: "Le Monde Économie", url: "https://www.lemonde.fr/economie/rss_full.xml", site: "https://www.lemonde.fr/economie/", regions: ["economie"] },
  { source: "Le Monde Planète", url: "https://www.lemonde.fr/planete/rss_full.xml", site: "https://www.lemonde.fr/planete/", regions: ["planete"] },
  { source: "Le Monde Sciences", url: "https://www.lemonde.fr/sciences/rss_full.xml", site: "https://www.lemonde.fr/sciences/", regions: ["planete"] },
  { source: "ONU Info", url: "https://news.un.org/feed/subscribe/fr/news/all/rss.xml", site: "https://news.un.org/fr/", regions: ["monde"] },
  { source: "BBC Afrique", url: "https://feeds.bbci.co.uk/afrique/rss.xml", site: "https://www.bbc.com/afrique", regions: ["afrique"] },
  // Adresse à confirmer avec `node scripts/check-feeds.mjs` : site WordPress probable.
  { source: "Midi Madagasikara", url: "https://www.midi-madagasikara.mg/feed/", site: "https://www.midi-madagasikara.mg/", regions: ["madagascar"] },
];
