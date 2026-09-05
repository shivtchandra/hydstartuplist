# Enrich stub /startups/<slug> pages — state

## Shipped (code, verified, `npm run build` passes)
- app/startups/[slug]/page.jsx — oneLiner subhead, services[] chips,
  descriptionLong preferred (About + metadata + Organization JSON-LD keywords),
  FAQ section + FAQPage JSON-LD, Related-startups section.
- lib/startupUi.js — relatedStartups(startup, all, n)
- app/globals.css — .startup-detail-oneliner, .tag-service, .startup-faq
- scripts/merge-enrichment.mjs  (`npm run enrich:merge`)
- scripts/enrich-profiles.mjs   (`npm run enrich:profiles`)
- data/enrichment.json — id -> {descriptionLong, oneLiner?, services[],
  founded?, logoUrl?, sources[], enrichedAt} | {skipped:true, reason}
  Hand-authored entries carry "manual":true and the scraper never touches them.
- All new page fields optional; un-enriched stub renders exactly as before.

## Stub set
Selector: /DIPP\d|DPIIT-recognised/i.test(description) && active!==false  => 987.
(Plan's "720" was a wrong desc<60 count.)

## Bulk enrichment — decided: SCRIPT does the bulk (user choice)
scripts/enrich-profiles.mjs: per company scrapes homepage + /about + /about-us
+ /company via Jina Reader (r.jina.ai, agent-reach read_url engine) -> plain fetch.
Extractor hardened: English-only gate, testimonial/cookie/GoDaddy/parked reject,
concrete-noun gate, case-insensitive service dedupe, founded regex (since/
established/incorporated YYYY). Junk -> {skipped:true} (keeps stub, no regression).

Progress: 16 in enrichment.json (2 manual: Tvisha, Web Era; 13 scraped-ok, 3
skipped). ~971 stubs remain.

## RUN THE FULL BULK (offline, cheap, resumable)
    cd hyderabad-startup-map
    node scripts/enrich-profiles.mjs --concurrency 3 --sleep 800   # keyless Jina ~20rpm
    npm run enrich:merge
    git add data/startups.json data/enrichment.json && git commit
Re-run enrich:profiles anytime — skips ids already in enrichment.json.
Spot-check: node -e on data/enrichment.json, eyeball ~10 descriptionLong.
Tune SERVICE_LEXICON / NOISE / CONCRETE in the script if quality dips.

## Optional: agent-reach polish for the head
For spotlight companies (startup.spotlight===true), hand-write higher-quality
descriptionLong + founded via mcp__agent-reach__search, add to enrichment.json
with "manual":true.

## RESULT (2026-09-02)
Full Jina bulk run done. 987/987 stubs processed.
- 681 enriched (descriptionLong + services, 100 with founded), merged into startups.json
- 306 skipped {no-content} — keep the DPIIT stub, no regression
- 743 stubs now have descriptionLong (incl earlier batches + 2 manual)
- npm run build: green (42/42). Nothing committed — working tree, for Shiva audit.

## Leftover / optional
- ~244 stubs still bare (skipped or thin scrape). Re-run wont help; would need agent-reach search per company.
- Spotlight polish: hand-write descriptionLong for startup.spotlight===true via agent-reach, mark manual:true.
- scripts/check-hiring.mjs still calls Firecrawl (manual runs only; cron route now gated behind FIRECRAWL_ENABLED=1).
