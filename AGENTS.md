# Antigravity & Agent Guidelines: Hyderabad Startup Map

This repository is governed by strict operational rules designed to preserve free-tier zero-cost infrastructure and safeguard domain authority in search engines.

## Rule 1: Zero Tolerance for Thin Page Programmatic Sprawls
- A mass indexing push of thousands of scraped job pages in Oct 2026 triggered a Google Helpful Content / thin content demotion.
- **NEVER** set `index: true` on individual scraped job pages (`app/jobs/[id]/page.jsx`). They must remain `robots: { index: false, follow: true }`.
- **NEVER** submit ephemeral scraped job URLs to the Google Indexing API or external indexing pingers.
- **NEVER** re-enable `sitemap-jobs.xml` for ephemeral listings.
- Sitemaps and indexing are strictly reserved for consolidated, high-value canonical hubs (`/`, `/jobs`, `/jobs/fresher`, `/jobs/remote`, `/career`, `/product-companies`, `/gccs`, `/stories/*`).

## Rule 2: Title and Metadata Stability
- Never inject fluctuating database counts (e.g. `${jobs.length} Openings`) into `<title>` tags on hub pages. Frequent title mutations trigger search engine churn re-evaluations and fragment Google Analytics reporting.
- Keep canonical `<title>` tags stable and human-optimized.

## Rule 3: Zero Infrastructure Cost & Free-Tier Limits
- Cloudflare Pages static export is capped at 20,000 files. Never exceed this limit.
- Static generation for job detail pages in CI is capped at the top 6,000 newest listings (`build-static.sh`).
- All un-rendered or expired job URLs must be gracefully caught by the client-side smart fallback in `app/not-found.jsx`, providing relevant live search links instead of dead 404 drops.
- Heavy cron tasks run strictly in GitHub Actions, never on Vercel Fluid compute.
- Strictly NO emojis in code, commit messages, or chat responses.
