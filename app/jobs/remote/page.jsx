import Link from "next/link";
import fs from "fs";
import path from "path";
import { unstable_cache } from "next/cache";
import OpportunityExplorer from "../../components/OpportunityExplorer.jsx";
import EuropeanRemoteDirectory from "../../components/EuropeanRemoteDirectory.jsx";
import { searchOpportunities } from "../../../lib/opportunity-store.js";
import { getRemoteJobs } from "../../../lib/jobs.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import { isNextProductionBuild } from "../../../lib/build-phase.js";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  thinListingRobots,
  REMOTE_JOBS_LANDING,
} from "../../../lib/jobs-seo.js";
import { REMOTE_CATEGORIES } from "../../../lib/remote-seo.js";

export const revalidate = 604800;

export async function generateMetadata() {
  const jobs = await getRemoteJobs();
  const title = "Remote Tech & Startup Jobs in India – Verified Openings 2026";
  const description =
    "Looking for verified remote jobs in India? Explore remote software engineer, AI, product, and tech openings at product startups. 100% direct ATS portals, zero consultancy spam.";
  const url = `${getSiteUrl()}/jobs/remote`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: thinListingRobots(jobs.length, { min: 1 }),
    openGraph: { title, description, url, type: "website" },
    keywords: [
      "remote jobs india",
      "remote software engineer jobs india",
      "work from home tech jobs india",
      "remote tech jobs india",
      "remote startup jobs india",
      "remote software developer jobs",
      "remote product manager india",
      "remote frontend developer india",
      "remote backend developer india",
      "remote ai jobs india",
      "wfh tech jobs india",
      "remote jobs hyderabad",
    ],
  };
}

export default async function RemoteJobsPage() {
  const landing = REMOTE_JOBS_LANDING;
  const buildPhase = isNextProductionBuild();
  const getInitial = unstable_cache(
    () => searchOpportunities({ work: "remote" }),
    ["jobs-initial-remote-opportunities", buildPhase ? "build" : "runtime"],
    { revalidate: buildPhase ? 60 : 86400, tags: ["public-jobs"] }
  );
  const initial = await getInitial().catch(() => ({ jobs: [], total: 0, stale: true }));
  if (buildPhase) initial.stale = true;

  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: "Remote" },
  ];

  let euCompanies = [];
  let euJobs = [];
  try {
    const compFile = path.join(process.cwd(), "data", "european-remote-companies.json");
    if (fs.existsSync(compFile)) euCompanies = JSON.parse(fs.readFileSync(compFile, "utf8"));
    const jobsFile = path.join(process.cwd(), "data", "european-remote-jobs.json");
    if (fs.existsSync(jobsFile)) euJobs = JSON.parse(fs.readFileSync(jobsFile, "utf8"));
  } catch (err) {
    console.error("European remote data error:", err);
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Are these remote jobs open to candidates across India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Roles limited to another country are filtered out. Some postings only say \"Remote\" without naming who can apply, so check eligibility on the employer's page before applying.",
        },
      },
      {
        "@type": "Question",
        name: "How are these remote jobs verified?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Mapping HYD crawls direct ATS career portals (Greenhouse, Lever, Ashby, Workday, Keka) and filters out third-party staffing agencies, ensuring 100% direct company listings.",
        },
      },
      {
        "@type": "Question",
        name: "Do global and US startups hire engineers in India remotely?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Many US and European product startups hire Indian engineers directly or via Employer of Record (EOR) platforms like Deel and Remote with global compensation bands.",
        },
      },
      {
        "@type": "Question",
        name: "Are these remote jobs free to browse and apply?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All job postings and ATS links are 100% free with no login or subscription required.",
        },
      },
    ],
  };

  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    itemListJsonLd(initial.jobs || [], landing.title),
    faqLd,
  ];

  return (
    <>
      {jsonLd.map((data, i) => (
        <script
          key={data["@type"] + i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <OpportunityExplorer
        initial={initial}
        lockedFilters={{ work: "remote" }}
        title="Remote Startup & Tech Jobs in India"
        subtitle="Explore verified remote software engineer, AI, product, and tech openings across India. 100% direct ATS links with zero consultancy spam."
        breadcrumbs={breadcrumbs}
      >
        {/* Remote Specialization Category Hubs */}
        <div style={{ marginTop: 28, marginBottom: 20 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
            Filter Remote Specialization
          </p>
          <div className="fresher-chips">
            <Link href="/jobs/remote" className="fresher-chip is-active">
              All Remote Roles
            </Link>
            {REMOTE_CATEGORIES.map((cat) => (
              <Link key={cat.slug} href={`/jobs/remote/${cat.slug}`} className="fresher-chip">
                {cat.categoryName}
              </Link>
            ))}
          </div>
        </div>

        <EuropeanRemoteDirectory companies={euCompanies} jobs={euJobs} />

        <section className="industry-section" aria-label="FAQ" style={{ marginTop: 32 }}>
          <h2>Frequently Asked Questions About Remote Jobs</h2>
          <p className="industry-section-sub">
            <strong>Are these remote jobs open to candidates across India?</strong> Roles limited to another country are
            filtered out. Some postings only say &quot;Remote&quot; without naming who can apply, so check eligibility on the employer&apos;s page before applying.
          </p>
          <p className="industry-section-sub">
            <strong>How do you filter out fake consultancies and placement agencies?</strong> We crawl direct ATS career
            pages (Greenhouse, Lever, Ashby, Workday, Keka) and enforce an automated employer allowlist, scrubbing out
            unverified consultancies and paid placement scams.
          </p>
          <p className="industry-section-sub">
            <strong>What types of roles are available remotely?</strong> Engineering (frontend, backend, full-stack, DevOps),
            applied AI/ML, data science, product management, and UX design are the most common remote tech opportunities.
          </p>
        </section>
      </OpportunityExplorer>
    </>
  );
}
