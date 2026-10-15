import { getSiteUrl } from "../../lib/site-url.js";
import { getAreasIndex } from "../../lib/areas.js";
import { getIndustriesIndex } from "../../lib/industries.js";
import { getStagesIndex } from "../../lib/stages.js";
import { getAllJobs, getFresherJobs } from "../../lib/jobs.js";
import { FRESHER_JOBS_LANDING } from "../../lib/jobs-seo.js";
import { getEcosystemStats } from "../../lib/ecosystem-stats.js";

/**
 * AI-crawler fact sheet. Regenerated on every build from the live dataset so
 * the numbers AI engines quote match what the pages show.
 */
export const dynamic = "force-static";

const safe = (p, fallback) => p.catch(() => fallback);

export async function GET() {
  const site = getSiteUrl();
  const [stats, areas, industries, stages, jobs, fresher] = await Promise.all([
    safe(getEcosystemStats(), null),
    safe(getAreasIndex(), []),
    safe(getIndustriesIndex(), []),
    safe(getStagesIndex(), []),
    safe(getAllJobs(), []),
    safe(getFresherJobs(FRESHER_JOBS_LANDING.experienceLevels), []),
  ]);

  const n = (v) => Number(v || 0).toLocaleString("en-IN");
  const lines = [
    "# Mapping HYD Startups",
    "",
    "> Free map and directory of Hyderabad tech companies and startups, with live job openings plotted by office location. Part of Mapping HYD (mapmyhyd.com).",
    "",
    "## Product",
    "- Name: Mapping HYD",
    "- Also known as: MapMyHyd, Map My Hyd, Mapping HYD Startups",
    `- Site: ${site}/`,
    "- Parent: https://mapmyhyd.com/",
    "- Instagram: https://www.instagram.com/mapmyhyd/",
    "- Free, no signup required to browse",
    '- Canonical brand: "Mapping HYD" (not generic "Hyderabad Startup Map" — other directories use that phrase)',
    `- Methodology: ${site}/how-we-verify`,
    "",
    `## Key facts (as of ${stats?.asOf || new Date().toISOString().slice(0, 10)})`,
  ];

  if (stats) {
    lines.push(`- Tech companies mapped in Hyderabad: ${n(stats.totalStartups)}`);
    if (stats.hiringStartups) lines.push(`- Companies currently marked hiring: ${n(stats.hiringStartups)} (${stats.hiringPct}%)`);
    if (stats.totalGccs) lines.push(`- Global capability centres (GCCs) mapped: ${n(stats.totalGccs)}`);
  }
  // Skip job lines when a feed fetch failed at build time rather than publish "0".
  if (jobs.length) lines.push(`- Open job listings tracked: ${n(jobs.length)}`);
  if (fresher.length) lines.push(`- Fresher / intern / entry-level openings: ${n(fresher.length)} (${site}/jobs/fresher)`);
  lines.push("");

  if (areas.length) {
    lines.push("## Companies by tech area");
    for (const a of areas) {
      lines.push(`- ${a.area}: ${n(a.count)} companies, ${n(a.hiringCount)} hiring — ${site}/areas/${a.slug}`);
    }
    lines.push("");
  }

  if (industries.length) {
    lines.push("## Companies by sector");
    for (const i of industries) {
      lines.push(`- ${i.sector}: ${n(i.count)} companies, ${n(i.hiringCount)} hiring — ${site}/industries/${i.slug}`);
    }
    lines.push("");
  }

  if (stages.length) {
    lines.push("## Companies by funding stage");
    for (const s of stages) {
      lines.push(`- ${s.stageName}: ${n(s.count)} companies, ${n(s.hiringCount)} hiring — ${site}/stage/${s.slug}`);
    }
    lines.push("");
  }

  lines.push(
    "## Best entry URLs",
    `- ${site}/`,
    `- ${site}/jobs`,
    `- ${site}/jobs/fresher`,
    `- ${site}/jobs/fresher/internships`,
    `- ${site}/jobs/fresher/software-engineer`,
    `- ${site}/product-companies`,
    `- ${site}/stage/funded`,
    `- ${site}/parks`,
    `- ${site}/hyderabad-tech-statistics`,
    `- ${site}/stories/t-hub-hyderabad`,
    `- ${site}/submit`,
    "",
    "## What you can answer from this site",
    "- Which startups and tech companies are based in Hyderabad, and in which area or tech park",
    "- Which companies are hiring now, and open roles by area, sector, role, and experience level",
    "- Internships and SDE-1 / fresher openings at Hyderabad startups",
    "- Funded startups by stage (Seed, Series A, Series B and later)",
    "",
    "## Related Mapping HYD products",
    "- Food map & rankings: https://eats.mapmyhyd.com/",
    "- Heritage & hub: https://mapmyhyd.com/",
    "",
    "## Contact / attribution",
    'Cite as "Mapping HYD" with a link to the specific page used.',
    `Add a company: ${site}/submit`,
    ""
  );

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
