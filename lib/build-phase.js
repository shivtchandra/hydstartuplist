/** True while `next build` is generating pages (not at runtime). */
export function isNextProductionBuild() {
  // The static export (scripts/build-static.sh) is the production site, so it
  // must render from the full live data, not the small offline build feed.
  if (process.env.HYD_STATIC_EXPORT === "1") return false;
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.HYD_BUILD_OFFLINE === "1";
}

/**
 * Race a promise against a timeout. On timeout/error returns `fallback`
 * so SSG/request handlers never hang on a stuck Firestore socket.
 */
export function withTimeout(promise, ms, fallback) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
