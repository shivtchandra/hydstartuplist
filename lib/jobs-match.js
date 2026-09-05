import { startupSlug } from "./slug.js";

const STRIP_SUFFIXES = [
  "private limited",
  "pvt ltd",
  "pvt. ltd",
  "pvt. ltd.",
  "limited",
  "ltd",
  "inc",
  "corp",
  "corporation",
  "technologies",
  "technology",
  "tech",
  "solutions",
  "services",
  "software",
  "systems",
  "labs",
  "india",
  "hyderabad",
];

/** Normalize company names for comparison — lowercase, strip legal suffixes and punctuation. */
export function normalizeCompanyName(name) {
  if (!name) return "";
  let s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const suffix of STRIP_SUFFIXES) {
    const re = new RegExp(`\\b${suffix.replace(/\./g, "\\.")}\\b`, "gi");
    s = s.replace(re, " ").replace(/\s+/g, " ").trim();
  }
  return s;
}

/** Levenshtein edit distance between two strings. */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost);
      row[j - 1] = prev;
      prev = next;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function similarityScore(a, b) {
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.92;

  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(na, nb);
  const ratio = 1 - dist / maxLen;

  const threshold = maxLen <= 6 ? 0.85 : 0.78;
  return ratio >= threshold ? ratio : 0;
}

/**
 * Build a resolver that maps arbitrary job company names to startup slugs.
 * Exact normalized matches win; fuzzy matches require a clear best candidate.
 */
export function buildCompanyMatcher(startups) {
  const active = startups.filter((s) => s.active !== false);
  const entries = active.map((s) => ({
    startup: s,
    slug: startupSlug(s),
    normalized: normalizeCompanyName(s.name),
  }));

  const exact = new Map();
  const byFirst = new Map();
  for (const e of entries) {
    if (!e.normalized) continue;
    exact.set(e.normalized, e);
    const ch = e.normalized[0];
    if (!byFirst.has(ch)) byFirst.set(ch, []);
    byFirst.get(ch).push(e);
  }

  // Cache by normalized name — getAllJobs calls resolve per job in multiple
  // passes; without this, fuzzy Levenshtein against ~1k startups is ~40s+.
  const cache = new Map();

  function scoreNormalized(na, nb) {
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (Math.min(na.length, nb.length) >= 3 && (na.includes(nb) || nb.includes(na))) return 0.92;
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen === 0) return 0;
    const ratio = 1 - levenshtein(na, nb) / maxLen;
    const threshold = maxLen <= 6 ? 0.85 : 0.78;
    return ratio >= threshold ? ratio : 0;
  }

  function resolve(companyName) {
    if (!companyName) return null;

    const normalized = normalizeCompanyName(companyName);
    if (!normalized) return null;
    if (cache.has(normalized)) return cache.get(normalized);

    const exactHit = exact.get(normalized);
    if (exactHit) {
      cache.set(normalized, exactHit);
      return exactHit;
    }

    // Same-initial bucket first; fall back to full list (length-gated) so we
    // don't miss renames that change the first character after normalize.
    const primary = byFirst.get(normalized[0]) || [];
    let best = null;
    let bestScore = 0;
    let runnerUp = 0;

    const consider = (list) => {
      for (const e of list) {
        if (!e.normalized) continue;
        const score = scoreNormalized(normalized, e.normalized);
        if (score > bestScore) {
          runnerUp = bestScore;
          bestScore = score;
          best = e;
        } else if (score > runnerUp) {
          runnerUp = score;
        }
      }
    };

    consider(primary);
    if (!best || bestScore < 0.78) consider(entries);

    let result = null;
    if (best && bestScore >= 0.78) {
      if (!(bestScore - runnerUp < 0.08 && runnerUp >= 0.78)) result = best;
    }
    cache.set(normalized, result);
    return result;
  }

  return { resolve, entries };
}

export function jobMatchesStartup(job, startup, matcher) {
  if (!job?.company || !startup) return false;
  const c = job.company.toLowerCase();
  const n = startup.name.toLowerCase();
  if (c === n || c.includes(n) || n.includes(c)) return true;
  const hit = matcher.resolve(job.company);
  return hit?.slug === startupSlug(startup);
}
