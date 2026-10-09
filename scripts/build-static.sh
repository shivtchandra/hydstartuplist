#!/usr/bin/env bash
# Builds the whole site as static files in out/ for Cloudflare Pages.
#
# Run on a throwaway checkout (CI): it deletes app/api and middleware.js, which
# stay on Vercel (/api/* is proxied by functions/api), and flips the long-tail
# routes from force-dynamic to force-static so every page is prebuilt.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${CI:-}" != "true" ] && [ "${ALLOW_DESTRUCTIVE_LOCAL:-}" != "1" ]; then
  echo "Refusing to run outside CI: this deletes app/api and middleware.js from the checkout." >&2
  exit 1
fi

# Read-only endpoints whose answer is the same for every visitor are exported
# as static files at their usual /api URL (out/_routes.json keeps the proxy
# function off them). Everything else under app/api is removed.
STATIC_API=("startups" "placements" "jobs" "gccs" "news")
keep=$(mktemp -d)
for r in "${STATIC_API[@]}"; do mkdir -p "$keep/$r" && cp "app/api/$r/route.js" "$keep/$r/route.js"; done
rm -rf app/api middleware.js out
for r in "${STATIC_API[@]}"; do
  f="app/api/$r/route.js"
  mkdir -p "app/api/$r" && cp "$keep/$r/route.js" "$f"
  if grep -q 'export const dynamic = ' "$f"; then
    perl -pi -e 's/export const dynamic = "force-dynamic";/export const dynamic = "force-static";/' "$f"
  else
    printf '\nexport const dynamic = "force-static";\n' >> "$f"
  fi
  # A static file can only answer GET.
  perl -0pi -e 's/\nexport async function (POST|PUT|PATCH|DELETE)\b/\nasync function $1/g' "$f"
done
rm -rf "${keep:?}"

for f in "app/jobs/[id]/page.jsx" "app/jobs/company/[slug]/page.jsx" "app/startups/[slug]/page.jsx" "app/sitemap-jobs.xml/route.js"; do
  grep -q 'export const dynamic = "force-dynamic";' "$f" || { echo "expected force-dynamic in $f" >&2; exit 1; }
  perl -pi -e 's/export const dynamic = "force-dynamic";/export const dynamic = "force-static";/' "$f"
done

# Page lists for the long-tail routes. Injected here rather than kept in the
# source: on Vercel, even an empty generateStaticParams makes Next cache these
# routes (ISR writes), which is exactly what force-dynamic is there to avoid.
add_params() {
  grep -q "generateStaticParams" "$1" && { echo "unexpected generateStaticParams in $1" >&2; exit 1; }
  printf '\n%s\n' "$2" >> "$1"
}
add_params "app/jobs/[id]/page.jsx" 'export async function generateStaticParams() {
  const { getAllJobs } = await import("../../../lib/jobs.js");
  const { jobUrlId } = await import("../../../lib/jobs-seo.js");
  return (await getAllJobs()).map((j) => ({ id: jobUrlId(j.id) }));
}'
COMPANY_PARAMS='export async function generateStaticParams() {
  const { getCompaniesWithJobs } = await import("../../../../lib/jobs.js");
  return (await getCompaniesWithJobs()).map((c) => ({ slug: c.slug }));
}'
add_params "app/jobs/company/[slug]/page.jsx" "$COMPANY_PARAMS"
add_params "app/jobs/company/[slug]/opengraph-image.jsx" "$COMPANY_PARAMS"
add_params "app/startups/[slug]/page.jsx" 'export async function generateStaticParams() {
  const { getApproved } = await import("../../../lib/store.js");
  const { startupSlug } = await import("../../../lib/slug.js");
  return (await getApproved()).filter((s) => s.active !== false).map((s) => ({ slug: startupSlug(s) }));
}'

HYD_STATIC_EXPORT=1 npx next build
node scripts/static-redirects.mjs > out/_redirects
node -e '
  const files = process.argv.slice(1).map((r) => "/api/" + r);
  console.log(JSON.stringify({ version: 1, include: ["/api/*"], exclude: files }));
' "${STATIC_API[@]}" > out/_routes.json

files=$(find out -type f | wc -l | tr -d ' ')
echo "static export: ${files} files, $(du -sh out | cut -f1)"
# Cloudflare Pages allows 20,000 files per deployment.
if [ "$files" -gt 19500 ]; then
  echo "Too close to Cloudflare Pages' 20,000-file limit; trim closed or old job pages." >&2
  exit 1
fi
