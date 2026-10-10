// Per-site settings for the API Worker build (build.mjs) and router (src/index.js).
export default {
  // app/api routes NOT served by the Worker: static files or browser-side now
  // (scripts/build-static.sh, lib/opportunities-client.js), dropped (events,
  // marker), or GitHub-run cron.
  skip: [/^cron\//, /^events$/, /^marker$/, /^startups$/, /^startups\/\[id\]$/, /^placements$/, /^jobs$/, /^gccs$/, /^news$/, /^v2\//],
  // Browser writes are accepted only from these origins.
  origins: ["https://startups.mapmyhyd.com", "https://mapmyhyd-startups.pages.dev", "http://localhost:3000"],
  // Public GETs: edge cache seconds, shared (Firestore) cache seconds, tags that
  // revalidateTag() clears, and query params that make the answer per-visitor.
  cache: {},
  // data/*.json files the libs read with fs, and how to trim them.
  data: { exclude: ["legit-report.json", "verify-report.json"], trim: {} },
};
