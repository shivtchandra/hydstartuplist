// Ported from hyderabad-eateries-map/lib/spotlight.js — same zoom behaviour:
// monotonic local-dominance heroes so zooming in only adds pins, never swaps them.

/** Zoom at which area blobs give way to individual startup pins. */
export const AREA_ZOOM_MAX = 13.2;

/** How far past AREA_ZOOM_MAX an area click should land (eateries: +1.4). */
export const AREA_ENTER_ZOOM = AREA_ZOOM_MAX + 1.4;

export function scoreOf(s) {
  let score = 1;
  if (s.sponsored) score += 100;
  if (s.hiring) score += 40 + Math.min(Number(s.hiring.count) || 0, 25);
  if (s.spotlight) score += 20;
  // Prefer better-known stages slightly so Series companies surface first.
  const stage = String(s.fundingStage || "").toLowerCase();
  if (stage.includes("series")) score += 8;
  else if (stage.includes("seed")) score += 4;
  return score;
}

let cache = { key: null, chosen: null };

function chooseHeroes(startups, cellLat, cellLng, key) {
  if (cache.key === key) return cache.chosen;

  const scored = startups.map((startup) => ({ startup, score: scoreOf(startup) }));
  const buckets = new Map();
  for (const candidate of scored) {
    const row = Math.floor(candidate.startup.lat / cellLat);
    const col = Math.floor(candidate.startup.lng / cellLng);
    const bucketKey = `${row}:${col}`;
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
    buckets.get(bucketKey).push(candidate);
  }

  const chosen = scored
    .filter(({ startup, score }) => {
      if (score <= 0) return false;
      const row = Math.floor(startup.lat / cellLat);
      const col = Math.floor(startup.lng / cellLng);
      let strongestNearbyScore = score;

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          const nearby = buckets.get(`${row + rowOffset}:${col + colOffset}`) ?? [];
          for (const candidate of nearby) {
            if (candidate.score <= strongestNearbyScore) continue;
            const dLat = (candidate.startup.lat - startup.lat) / cellLat;
            const dLng = (candidate.startup.lng - startup.lng) / cellLng;
            if (dLat * dLat + dLng * dLng < 1) {
              strongestNearbyScore = candidate.score;
            }
          }
        }
      }

      return score >= strongestNearbyScore * 0.9;
    })
    .map(({ startup }) => startup)
    .sort((a, b) => scoreOf(b) - scoreOf(a));

  cache = { key, chosen };
  return chosen;
}

export function spotlight(startups, bounds, { cellLat, cellLng, filterKey = "" } = {}) {
  if (!bounds || !cellLat || !cellLng) return { heroes: [], rest: startups };

  const key = `${cellLat.toFixed(6)}:${cellLng.toFixed(6)}:${filterKey}:${startups.length}`;
  const chosen = chooseHeroes(startups, cellLat, cellLng, key);

  const visible = (s) =>
    s.lat >= bounds.south &&
    s.lat <= bounds.north &&
    s.lng >= bounds.west &&
    s.lng <= bounds.east;

  const heroes = chosen.filter(visible);
  const heroIds = new Set(heroes.map((s) => s.id));

  return {
    heroes,
    rest: startups.filter((s) => visible(s) && !heroIds.has(s.id)),
  };
}
