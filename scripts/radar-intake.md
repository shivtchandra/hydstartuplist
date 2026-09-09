# Radar intake (Hyd discovery)

Weekly loop for hard-to-find Hyderabad companies. **Public map + job feed stay free.**

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

## Weekly verify loop

```bash
# 1) Diff seeded candidates vs map + radar
node scripts/radar-gap-sweep.mjs
node scripts/radar-gap-sweep.mjs --miss-only
node scripts/radar-gap-sweep.mjs --source fundediq-hyd-recent --csv > /tmp/radar-miss.csv

# 2) Human verifies each MISS (address, Hyd link, careers URL)

# 3) Append to data/radar.json (geo: "hyd") — do NOT auto-pin
#    Required fields: name or startupId, careers, why, missReasons[], jobMode, geo:"hyd"
#    Optional: website, tags, onMap:false until pinned

# 4) After address confirm → add/update startups.json pin (lat/lng)
#    Optional: board official ATS in data/ats-boards.json

# 5) Re-run gap sweep — MISS should become ON_MAP or ON_MAP+RADAR
```

## Candidate seeds

Edit [`data/radar-candidates.json`](../data/radar-candidates.json) to add Inc42 / FundedIQ / incubator / Gem-Zoho lists. The gap-sweep script only **reports**; it never writes pins.

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
  "onMap": false
}
```

After Places/address verify, set `startupId` to the new `startups.json` id and `onMap` becomes true via join.
