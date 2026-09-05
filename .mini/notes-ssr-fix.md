# SSR fix (map / news / insights)

Root cause: those pages were `"use client"` + `useEffect(fetch)` so first HTML was empty loading UI.
`/jobs` already used Server Component → `initial*` props.

## Change
- `lib/news.js` `getNewsFeed()` + `lib/startups-public.js` `getPublicStartups()`
- `/news`, `/insights`, `/` are async server pages that pass `initialItems` / `initialStartups`
- Client files: `NewsClient.jsx`, `InsightsClient.jsx`, `HomeClient.jsx`
- Sitemap: `/jobs` priority 0.95 (right under home)

## Verified (next start :3055)
- `/` HTML: **1,098 companies**, Zenoti present, no "Loading…"
- `/news` HTML: real article titles, no "Catching up…"
- `/insights` HTML: "Live data across 1,098 tracked", no "Crunching…" / "0 tracked"
