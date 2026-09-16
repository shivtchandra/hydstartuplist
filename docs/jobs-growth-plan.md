# Jobs growth and recovery plan

Status: proposed, 2026-09-09. Planning only; no production flags, schedules,
infrastructure, billing settings, or job records changed.

## Evidence and scope

- The September 9 ATS run `34323960786` reported `feedSize: 1821`,
  `truncated: true`, `descMax: 400`. The saved ATS snapshot held 1,116 records.
  The difference is 705 records, not necessarily 705 active jobs: lifecycle
  records may include closed roles. Historical 2,000-role recovery is unproven.
- `app/api/cron/sync-ats-jobs/route.js` packs everything into one document,
  dropping rows to meet its 720 KB JSON budget. Its description retries run
  only after packing has already reduced the row count.
- Cache recovery in `f01d1b1` fixes degraded cache replacement, not ingestion loss.
- Existing `jobs_v2`, lifecycle helpers, worker, and migration scripts are useful
  foundations. Do not enable `JOBS_V2_READS` as-is: `opportunity-store.js` first
  loads the old feed and then scans all `jobs_v2` documents on a cache miss.
- Existing migration verification covers ATS and Adzuna only, not all providers.

Objective: preserve every eligible source job, explain every exclusion, and
keep request work bounded as jobs, employers, and visitors increase. No UI
redesign, unrelated data changes, email rollout, or paid-service activation.

## Target design

Source scan → staged per-job revisions → validated publication → cached public pages.

1. **Durable per-job storage.** Reuse `jobs_v2` after auditing its schema and
   write semantics. Stable provider IDs and employer IDs; separate source identity
   from cross-provider duplicate grouping. Preserve current public URLs and saved
   IDs through aliases where necessary. Keep descriptions out of listing payloads.
   Oversized individual content gets separate bounded content records, never
   silent job deletion. Only write changed content/status; track scan freshness
   separately where possible.
2. **Atomic publication, not one huge transaction.** Stage each board scan under
   a generation ID using bounded batches. Validate completion, counts and checksums
   before publishing a small manifest pointer, guarded by the worker lease token.
   Public readers must not observe partially updated canonical documents: use
   immutable published revisions/projections. Keep unaffected boards on their last
   successful generation. Retain the previous public generation for rollback.
3. **Small, versioned read models.** Publish compact listing/search projections,
   company/area aggregates, and detail references outside visitor requests. Split
   artifacts by measured serialized bytes with headroom, not a fixed number of jobs.
   Cache shards independently; no single all-jobs cache item or cold-request
   Firestore collection scan. Paginate results with a stable tie-breaker and
   generation-bound cursors. Company matching is computed at ingestion or when
   company metadata changes, not rebuilt for every page.
4. **Bounded search.** Use indexed server queries for supported structured filters
   and a precomputed, partitioned text-search index for existing search behavior.
   Benchmark intersecting filters, text search, counts, and pagination before
   selecting partition sizes. A dedicated search service is a later decision only
   if measured latency/cost requires it; do not add one by default.
5. **Background ingestion.** Audit/reuse the existing worker, leases, retries and
   budget controls. Move scraping and publication off visitor-serving Vercel
   requests. The current GitHub schedule calls Vercel routes, so scheduling there
   alone does not move compute. Validate deployment access and costs before any
   worker infrastructure activation. One active writer per provider during handoff.

## Delivery sequence and gates

### 1. Establish a recoverable baseline

- Preserve current source snapshots and source metadata in a controlled backup.
- Add per-run counts: fetched, retained, new, updated, closed, duplicate,
  rejected (with reason), staged, published, and failed. Exclusions must reconcile.
- Treat `truncated: true`, incomplete publication, HTTP failure, and malformed
  sync responses as workflow failures, not green successful refreshes.
- Do not delete the existing size guard before a lossless replacement exists;
  retain the last good published data on failure.

Gate: reproduce the oversized-feed failure in a test; detect it automatically.

### 2. Build the lossless storage/publication path in shadow mode

- Implement staged revisions and byte-bounded publication for ATS, Adzuna,
  priority careers, and curated/startup career records.
- Backfill existing jobs without sending alerts or discovery events. Rescan live
  boards to recover records already omitted from the old snapshot: copying the
  truncated snapshot cannot recover those jobs.
- Preserve descriptions, links, metadata, and stable IDs. Failed/incomplete scans
  must not close jobs. Confirm absence using complete successful scans and a
  documented provider-specific grace policy; an outage is not a closure.
- Flag unusually large count drops for review before publishing closures.

Gate: all fetched eligible IDs are accounted for, no size-based omissions, all
providers covered, repeated scans idempotent, no duplicate events or emails.

### 3. Replace expensive readers before rollout

- Update explorer, legacy API, detail pages, company pages, maps, counts, saved
  job lookups, and sitemap readers to use the same published generation.
- Remove the full-collection scan path; fetch descriptions only for detail views.
- Cache invalidation occurs after publication succeeds. Failed refreshes retain
  the previous complete generation, including on new/cold function instances.
- Preserve filters, search behavior, pagination, URLs and saved-job semantics.

Gate: compare ID sets and exclusion reasons, not only totals, against shadow
source data; integration-test all reader types and version changes between pages.

### 4. Verify scale and failure recovery

- Fixtures: 2k, 10k, and 50k distinct jobs across up to 5k employers, with realistic
  varied descriptions, Unicode, oversized records, duplicates, and closed jobs.
  Repeating identical jobs is not a sufficient scale test.
- Faults: source timeout, database error, worker crash between batches, overlapping
  scans, expired lease, missing shard, cache failure, quota pause, rollback.
- Measure warm/cold p95 latency, CPU per request/refresh, DB reads/writes, bytes,
  cache hit rate, and source freshness at current and higher request concurrency.
- Proposed initial gates: zero unexplained omissions; no collection scans on
  serving paths; no cross-generation pages; warm API p95 under 500 ms and cold
  under 2 seconds in the deployment region. Confirm achievable cost/latency
  budgets from measurements before rollout rather than treating these as promises.

### 5. Cut over reversibly

- Enable new reads for internal/canary verification, then public traffic only
  after count parity/explanations and resource checks pass across a full source
  refresh cycle. Verify the public page and API, not just deployment status.
- Switch provider writers individually; disable their legacy schedules only when
  replacement coverage is confirmed. Do not disable Adzuna or priority scans as
  a side effect of the ATS migration.
- Roll back the publication pointer/read flag if counts, freshness, errors, or
  costs regress. Preserve old snapshots through an agreed rollback window; cleanup
  is a separate, explicitly reviewed operation.
- Report recovered active roles and remaining unavailable sources honestly; do
  not restore closed jobs just to make the counter reach 2,000.

## Operating guardrails

Source-health dashboard: last successful complete scan, counts, errors, next retry,
and publication generation. Alert on unexplained count drops, publication failure,
source-specific freshness breaches, and usage thresholds. Define thresholds against
the actual account allowance; background work pauses before exhausting the budget,
while public pages retain the last successful data. Alerts/monitoring are proposed,
not scheduled by this plan. More jobs and traffic still require measured capacity
and possibly budget changes; this design removes silent size truncation, not limits
on cost or infrastructure.

Next implementation scope: phases 1–2, then prove the reader/performance gates
before any production switch. Infrastructure activation and spending require a
separate explicit approval with the measured budget proposal.
