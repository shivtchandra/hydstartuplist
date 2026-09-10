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

## Email alerts (retention)

On `/jobs/fresher`: **Email me new fresher roles** → `POST /api/alerts` with `{ level: "early" }`.

Confirm via `/alerts/manage`. Digests run from `/api/cron/job-alerts` (GitHub Actions hourly :30 UTC; daily subs fire ~08:00 IST).

Requires Vercel `ALERTS_ENABLED=1`, Resend, `ALERT_TOKEN_SECRET` — see `docs/upgrade-rollout.md`.

