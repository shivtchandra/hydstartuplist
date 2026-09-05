# Mapping HYD rollout gates

## Local verification

Run `node --test tests/*.test.mjs`, then `HYD_BUILD_OFFLINE=1 npm run build`. The offline build must succeed without Google Fonts, remote images, or Firestore. Test phone 390×844, tablet 820×1180 and desktop 1280×800; exercise search, clear, save, Back, filters by keyboard and blocked map tiles.

## Flags and credentials

- Startup exploration is the default homepage. The visible Startups / Jobs switch opens `/?view=companies` or `/?view=jobs`. `LANDING_V2=0` disables the new jobs workspace; `/jobs` retains its legacy fallback.
- Keep `LANDING_EXPERIMENT` off. The latest product direction restores startup exploration as the default; the previous jobs-first experiment no longer compares the intended variants. Rework its two startup-map variants before enrollment. Explicit startup and job intent must remain outside assignment.
- `JOBS_V2_READS=1` switches the new API to individual job documents; leave off until a complete migration and comparison have passed.
- `ALERTS_ENABLED=1` requires `RESEND_API_KEY`, a verified `NEWSLETTER_FROM`, and a random `ALERT_TOKEN_SECRET` of at least 32 bytes. Keep off until confirmation, preference links, quotas and suppression have been exercised with consenting test recipients.
- `HOURLY_ALERTS_ENABLED=1` permits hourly subscriptions. Default is daily. `MAIL_DAILY_LIMIT=100` and `MAIL_MONTHLY_LIMIT=3000` include reserved control-message capacity. Do not exceed the actual account allowance.
- Set `RESEND_WEBHOOK_SECRET` and configure the signed `/api/webhooks/resend` endpoint for bounced/complained messages. Historical newsletter opt-ins are never migrated to personalized alerts.
- The signed digest links manage one subscription. GET requests never change preferences.

## Data migration

Run `scripts/backfill-jobs-v2.mjs` first in dry-run mode, using the production project's existing service account through the normal environment loader. `--apply` writes missing documents only and emits no job events. The original snapshots remain untouched. Compare source IDs, counts, descriptions and ten records from each provider before enabling new reads. The worker's first complete scan also suppresses discovery events.

The worker registry uses canonical `provider:slug` board IDs. Add employer-specific polling restrictions through `minPollMinutes`. Unsupported or unproven-complete parsers retain prior records and show a source-health error; do not enable closure reconciliation until a parser proves its pagination terminates successfully.

## Cloud deployment

`infra/main.tf` defines a private Cloud Run worker, OIDC-authenticated Cloud Tasks and Scheduler, a two-instance cap and session TTL. Build `worker/Dockerfile` into the chosen project's registry, then pass the image, Firebase/GCP project and region explicitly to Terraform. Never use an unrelated CLI default project. Ingestion is disabled initially. IAM credentials and an authenticated project owner are required to apply infrastructure.

Verify worker `/dispatch` and `/scan` under OIDC, quota pause, retries, lease expiry and source failure in staging. Enable ingestion only after inspecting source-health results and reconciling IDs. Disable the legacy ATS scheduled job only when new reads and worker coverage pass; keep Adzuna ingestion scheduled until its replacement is validated.

Schedule `/api/cron/job-alerts` hourly at minute 30 UTC with `Authorization: Bearer CRON_SECRET`; this aligns the daily 08:00 IST slot as well. No real messages should be sent before sender verification and opt-in checks.

Partner Greenhouse integrations are server-only `ats_integrations` records containing `enabled`, `secret`, and canonical `boardId`. Configure only job-post events at `/api/webhooks/greenhouse/{integration}`. Provide `GCP_PROJECT_ID`, `GCP_REGION`, `WORKER_URL`, and `TASK_SERVICE_ACCOUNT` for enqueueing. No webhook payload or candidate data is stored; the event triggers a public-board check.

## Operations and cost

`/admin/sources` requires `ADMIN_PASSCODE` and reports board health, useful-visit counts, and estimated background cost. Quotas limit background work, not browsing. Daily defaults pause scans at 2,400 scans or ₹60 estimated ingestion cost; set the scan estimate from measured Cloud Run/Firestore usage. These estimates do not include all billing charges. Configure actual cloud billing alerts at ₹1,500/₹2,400/₹3,000 and include email/egress in the review; alerts are not hard caps. Keep enrollment within email capacity. Never silently change subscription frequency.

Use Firestore server-only rules for `jobs_v2`, `board_status`, `job_events`, `alert_subscriptions`, `alert_deliveries`, `email_suppressions`, `mail_usage`, `ats_integrations`, `engagement_sessions`, and `background_usage`; browser access is through authenticated or narrowly scoped API routes. The existing application's other rules must be preserved.

## Experiment

Collect a baseline. Once two startup-first variants are implemented and verified, run the 50/50 homepage experiment for at least 14 days. Primary outcome: landing sessions with a detail/company view, save, or application exit. Do not count map movement or elapsed time as success. Segment by device and coarse source. Never collect raw search strings, emails or personal coordinates in events. Session records expire after 35 days.

For baseline proportion p, use two-sided alpha .05 and power .8 to estimate required sessions per arm for p versus min(.999,1.2p). Do not claim significance at a fixed small sample. At 28 days without sufficient traffic, report uncertainty and conduct moderated task testing. Field Core Web Vitals and production conversion lift require real traffic; a local build cannot establish them.

Rollback: switch landing flag off; switch new reads off; disable alerts; pause the scheduler. Preserve the old snapshots and all subscriber preference records.
