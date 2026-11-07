// Which /startups/[slug] profiles Google should index.
//
// Most profiles are a name, a one-line description and an address drawn from the same
// template; a 2026-11-07 crawl found 1,130 of 1,218 with under 300 words of their own text.
// At that scale they read as thin, templated pages, which is the pattern Google demotes a
// whole site for. A profile stays indexable only when it carries something a searcher can't
// get from the company's own site: live roles, an ATS board, news, a founding year, a
// spotlight, or a long researched description. The rest stay crawlable (follow) for links.
const MIN_LONG_DESCRIPTION_WORDS = 60;

export function hasProfileSubstance(startup, roleCount = 0) {
  if (!startup) return false;
  if (roleCount > 0) return true;
  if (startup.hiring || startup.atsBoardUrl || startup.spotlight) return true;
  if (Array.isArray(startup.news) ? startup.news.length > 0 : startup.news) return true;
  if (startup.founded) return true;
  const words = String(startup.descriptionLong || "").trim().split(/\s+/).filter(Boolean).length;
  return words >= MIN_LONG_DESCRIPTION_WORDS;
}

export function profileRobots(startup, roleCount = 0) {
  if (hasProfileSubstance(startup, roleCount)) return { index: true, follow: true };
  return { index: false, follow: true, googleBot: { index: false, follow: true } };
}
