# Radar intake (Hyd discovery)

Weekly loop for hard-to-find Hyderabad companies. **Public map + job feed stay free.**

## Strategy: what “curated” means

Radar is not a scrape of Inc42 / Tracxn / LinkedIn “Hyderabad startups” / Greenhouse. Anyone can rebuild those lists in an afternoon. Curated means:

1. **Low visibility** — prefer employers that fail normal discovery channels: Gem/Zoho/Keka/Rippling boards, Remote India labels, US-HQ + India-entity offices, incubator pins (T-Hub / CIE / D-Labs), outskirts addresses, marketing-site careers, rebrands/aliases.
2. **Defensible depth** — each strong entry carries research a competitor cannot casually recreate: verified founder LinkedIns, why it’s hard to find (`stealthSignals`), office/ATS quirks, aliases, non-obvious funding breadcrumbs (`depth.sources` + `researchNotes`).

**Do NOT include:** famous HITEC SaaS already on every aggregator with a clear Greenhouse Hyd location and no stealth angle; unverified addresses; invented founder LinkedIns; SF/remote wipeouts of other geos.

Public list stays ungated (`why`, `missReasons`, `aliases`, founder **names**). Rich `depth` (LinkedIns, sources, researchNotes) is stored on the entry and can later require login via `getRadarEntries(geo, { includeDepth: true })` without breaking older rows that lack `depth`.

## Why companies get missed

Tracked as first-class `missReasons` on each Radar entry (see `data/radar.json` → `missReasons`):

| Code | Meaning |
|------|---------|
| `gem` | Careers on Gem (no public directory) |
| `zoho` | Zoho Recruit long-tail ATS |
| `remote-india` | Roles labeled Remote India / SF |
| `us-hq-hyd-office` | US brand + Hyd India entity office |
| `incubator` | T-Hub / CIE / D-Labs cohort |
| `outskirts` | Outside HITEC / Gachibowli corridor |
| `funding-list` | Below Inc42 Top-N / quiet raise |
| `marketing-careers` | Careers only on marketing site |
| `keka` / `rippling` | Other long-tail ATS |

## Curation bar (accept / reject)

**Accept only if most of these hold:**

- [ ] ≥1 `missReason` that is *not* “another Greenhouse Hyd SaaS”
- [ ] Real Hyd link (office pin, Remote India eng, or India entity) — not just a funding-article city tag
- [ ] Careers surface is non-obvious **or** geography/incubator/alias quirk is documented
- [ ] Depth started: founder LinkedIn(s) verified **or** aliases/rebrands **or** concrete stealthSignals
- [ ] `why` explains *how* someone would miss this, not just what the company does

**Reject if:**

- [ ] Only Greenhouse/Ashby + obvious Hyd location already scraped by aggregators
- [ ] Cannot verify address / Remote India link
- [ ] Founder LinkedIn not verified (omit the URL; do not invent)
- [ ] `funding-list` alone with zero stealth detail

## Entry schema (v2)

Public (always safe):

```json
{
  "startupId": "…",
  "tags": ["hard-to-find", "gem"],
  "why": "…",
  "careers": "https://…",
  "jobMode": "remote-india",
  "geo": "hyd",
  "missReasons": ["gem", "remote-india"],
  "aliases": ["OtherName"],
  "founderNames": ["Ada Lovelace"]
}
```

Depth (gateable later — additive; older entries without `depth` still work):

```json
{
  "depth": {
    "founders": [{ "name": "…", "role": "Co-founder", "linkedin": "https://www.linkedin.com/in/…" }],
    "stealthSignals": ["Gem board + Remote India eng"],
    "sources": [{ "type": "yc", "url": "https://…", "note": "optional" }],
    "researchNotes": "Internal curator notes",
    "lastVerified": "2026-09-09"
  }
}
```

## Weekly verify loop

```bash
# 1) Diff seeded candidates vs map + radar
node scripts/radar-gap-sweep.mjs
node scripts/radar-gap-sweep.mjs --miss-only
node scripts/radar-gap-sweep.mjs --source fundediq-hyd-recent --csv > /tmp/radar-miss.csv

# 2) Human verifies each MISS (address, Hyd link, careers URL)

# 3) Append to data/radar.json (geo: "hyd") — do NOT auto-pin
#    Required: name or startupId, careers, why, missReasons[], jobMode, geo:"hyd"
#    Optional: website, tags, aliases, depth{}, onMap:false until pinned

# 4) After address confirm → add/update startups.json pin (lat/lng)
#    Optional: board official ATS in data/ats-boards.json

# 5) Re-run gap sweep — MISS should become ON_MAP or ON_MAP+RADAR
```

## Candidate seeds

Edit [`data/radar-candidates.json`](../data/radar-candidates.json) to add Inc42 / FundedIQ / incubator / Gem-Zoho lists. The gap-sweep script only **reports**; it never writes pins.

Pending human-verify targets also live on `data/radar.json` → `discoveryQueue` (do not auto-pin).

## Radar append example

```json
{
  "name": "Example Labs",
  "website": "https://example.com",
  "careers": "https://jobs.gem.com/example-labs",
  "tags": ["hard-to-find", "gem"],
  "missReasons": ["gem", "remote-india"],
  "why": "Gem board with Remote India roles; Hyd-linked team.",
  "jobMode": "remote-india",
  "geo": "hyd",
  "onMap": false,
  "aliases": ["ExampleLabs"],
  "depth": {
    "founders": [{ "name": "…", "role": "Founder", "linkedin": "https://www.linkedin.com/in/…" }],
    "stealthSignals": ["Gem — no public directory"],
    "sources": [{ "type": "careers", "url": "https://jobs.gem.com/example-labs" }],
    "researchNotes": "…",
    "lastVerified": "2026-09-09"
  }
}
```

After Places/address verify, set `startupId` to the new `startups.json` id and `onMap` becomes true via join.


## Job-feed reconcile (data-first)

Weekly, before any product/paywall work:

```bash
npm run radar:reconcile        # writes job-feed-orphans + hiring-not-on-radar into radar-candidates.json
npm run radar:gap:miss -- --source job-feed-orphans
```

- **hiring-not-on-radar** — already on the map with live jobs; promote to Radar only if hard-to-find + real problem.
- **job-feed-orphans** — hiring in feeds but not matched to `startups.json` (enterprise/GCC filtered). Verify address before pin.
- Never auto-pin. Never invent founder LinkedIns.
