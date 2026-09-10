# Fresher / early-career intake

Keep `/jobs/fresher` dense without scraping spam aggregators.

## Weekly

```bash
npm run fresher:gap          # full report
npm run fresher:gap:miss     # OFF_MAP + MISS_CAREERS only
npm run fresher:gap:csv      # CSV for verify
```

Seeds: `data/fresher-employer-seeds.json`

1. `MISS_CAREERS` → add to `data/priority-careers.json` or `data/ats-boards.json` (official careers URL only)
2. `OFF_MAP` → verify Hyd office, then pin (never auto-pin)
3. Adzuna fresher pack runs inside `sync-adzuna` cron (`fresher` / `internship` / `graduate` + Hyd)
4. Tagging: `lib/job-facets.js` → `inferExperienceLevel` (intern + junior feed `/jobs/fresher`)

Do **not** ingest FresherOnly / Jooble / Way2Freshers as job sources — use listicles only to seed employer names.
