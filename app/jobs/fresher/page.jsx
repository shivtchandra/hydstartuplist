import Link from "next/link";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import FresherAlertCta from "../../components/FresherAlertCta.jsx";
import FresherJobsList from "../../components/FresherJobsList.jsx";
import CompanyScamShield from "../../components/CompanyScamShield.jsx";
import VerificationNote from "../../components/VerificationNote.jsx";
import { getFresherJobs, getFresherCompanies } from "../../../lib/jobs.js";
import { prettyName } from "../../../lib/startupUi.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  FRESHER_JOBS_LANDING,
  thinListingRobots,
} from "../../../lib/jobs-seo.js";

// This app redeploys multiple times a day, which already resets the ISR
// cache — see app/jobs/company/[slug]/page.jsx.
export const revalidate = 604800;

export async function generateMetadata() {
  const landing = FRESHER_JOBS_LANDING;
  const jobs = await getFresherJobs(landing.experienceLevels);
  const title = jobs.length > 0
    ? `Startup Companies in Hyderabad for Freshers (${jobs.length} Current Openings)`
    : "Startup Companies in Hyderabad for Freshers";
  const description = jobs.length > 0
    ? `Explore ${jobs.length} current intern, trainee, junior, and entry-level openings at mapped Hyderabad startups and technology employers.`
    : "Explore current intern, trainee, junior, and entry-level openings at mapped Hyderabad startups and technology employers.";
  const url = `${getSiteUrl()}/jobs/fresher`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: thinListingRobots(jobs.length, { min: 1 }),
    openGraph: { title, description, url, type: "website" },
    keywords: [
      "startup companies in hyderabad for freshers",
      "startups in hyderabad hiring freshers",
      "startup companies in hyderabad for freshers hiring",
      "startups in hyderabad for freshers",
      "startup companies in hyderabad recruitment",
      "hyderabad startup companies for freshers",
      "startup jobs in hyderabad",
      "startup jobs for freshers",
      "startup company jobs for freshers",
      "t hub internships",
      "fresher jobs in hyderabad",
      "fresher jobs hyderabad",
      "entry level jobs hyderabad",
      "internship jobs hyderabad startups",
    ],
  };
}

export default async function FresherJobsPage() {
  const landing = FRESHER_JOBS_LANDING;
  const jobs = await getFresherJobs(landing.experienceLevels);
  const fresherCompanies = await getFresherCompanies(landing.experienceLevels).catch(() => []);
  const updatedAt = jobs.map((job) => Date.parse(job.postedAt || job.sourcePostedAt || job.fetchedAt || "")).filter(Number.isFinite).sort((a, b) => b - a)[0];
  const updatedDate = updatedAt ? new Date(updatedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const locationCounts = new Map();
  for (const job of jobs) {
    const location = String(job.location || "Hyderabad").split(",")[0].trim();
    if (location) locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
  }
  const topLocations = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: "Fresher" },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Which startup companies in Hyderabad are hiring freshers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Startups across SaaS, AI, and fintech in HITEC City, Madhapur, and Gachibowli regularly recruit fresh graduates for software engineering, QA, data analytics, and product operations.",
        },
      },
      {
        "@type": "Question",
        name: "Where can I find fresher jobs in Hyderabad?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Mapping HYD lists fresher jobs in Hyderabad from mapped startups — entry-level, intern, and early-career openings. Browse this page or open the full jobs board.",
        },
      },
      {
        "@type": "Question",
        name: "How can freshers apply to Hyderabad startups?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use Mapping HYD to filter current roles, then follow the source link or official employer application page shown on each listing.",
        },
      },
      {
        "@type": "Question",
        name: "Are these fresher jobs free to browse?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Fresher jobs in Hyderabad on Mapping HYD are free to browse with no signup required.",
        },
      },
      {
        "@type": "Question",
        name: "What counts as a fresher or early-career role?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We surface roles whose titles or descriptions signal intern, fresher, trainee, graduate, or junior experience bands.",
        },
      },
    ],
  };
  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    itemListJsonLd(jobs, landing.title),
    faqLd,
  ];

  return (
    <div className="page-with-nav">
      {jsonLd.map((data, i) => (
        <script
          key={data["@type"] + i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <SiteNav active="jobs" />
      <div className="feed-page">
        <JobsBreadcrumbs items={breadcrumbs} />
        <div className="feed-head">
          <h1>{landing.title}</h1>
          <p className="jobs-intro">{landing.description}</p>
          <p className="form-sub">
            {`${jobs.length} current fresher / early-career role${jobs.length === 1 ? "" : "s"} across ${fresherCompanies.length} employer${fresherCompanies.length === 1 ? "" : "s"}${topLocations.length ? `, led by ${topLocations.join(", ")}` : ""}. Newest listings appear first. `}
            <Link href="/stories/hyderabad-fresher-tech-hiring-guide-2026">Read the fresher hiring guide →</Link>
          </p>
          <VerificationNote updatedAt={updatedDate} />
        </div>

        {/* Specialized Fresher Category Hubs */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
            Filter by Specialization
          </p>
          <div className="fresher-chips">
            <Link href="/jobs/fresher" className="fresher-chip is-active">
              All Roles
            </Link>
            <Link href="/jobs/fresher/internships" className="fresher-chip">
              Internships
            </Link>
            <Link href="/jobs/fresher/software-engineer" className="fresher-chip">
              Software Engineer / SDE-1
            </Link>
            <Link href="/jobs/fresher/data-analyst" className="fresher-chip">
              Data & AI
            </Link>
            <Link href="/jobs/fresher/frontend" className="fresher-chip">
              Frontend & UI
            </Link>
            <Link href="/jobs/fresher/qa-testing" className="fresher-chip">
              QA & SDET
            </Link>
            <Link href="/jobs/fresher/non-tech" className="fresher-chip">
              Non-Tech / Business
            </Link>
          </div>
        </div>

        {jobs.length ? (
          <FresherJobsList jobs={jobs} />
        ) : (
          <div className="fresher-empty">
            <p className="form-sub">
              No fresher-tagged openings matched right now. Check{" "}
              <Link href="/jobs">all jobs in Hyderabad</Link> or get an email when new
              ones land.
            </p>
          </div>
        )}

        {fresherCompanies.length > 0 && (
          <section className="industry-section" aria-labelledby="fresher-companies-heading" style={{ marginTop: 28 }}>
            <h2 id="fresher-companies-heading">Startup &amp; tech companies in Hyderabad hiring freshers</h2>
            <p className="industry-section-sub">
              {`${fresherCompanies.length} companies have intern or entry-level openings in Hyderabad right now, from ${jobs.length} roles in total. Each links to that company's open jobs.`}
            </p>
            <ul className="industry-facet-list">
              {fresherCompanies.slice(0, 60).map((c) => (
                <li key={c.slug}>
                  <Link href={`/jobs/company/${c.slug}`}>{prettyName(c.name)}</Link>
                  <span className="industry-facet-count">{c.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Scam Shield / Company Legitimacy Checker */}
        <CompanyScamShield />

        <FresherAlertCta />

        <section className="industry-section" aria-label="FAQ" style={{ marginTop: 28 }}>
          <h2>Frequently Asked Questions</h2>
          <p className="industry-section-sub">{landing.body}</p>
          <p className="industry-section-sub">
            <strong>Where can I find verified fresher jobs in Hyderabad?</strong> This page lists entry-level
            openings at mapped startups — or browse the full{" "}
            <Link href="/jobs">jobs in Hyderabad</Link> board.
          </p>
          <p className="industry-section-sub">
            <strong>How do you filter out consultancies and training-placement ads?</strong> Mapping
            HYD applies employer and staffing-source filters, then links each accepted role to its source listing
            or employer application page. <Link href="/how-we-verify">Read the verification methodology.</Link>
          </p>
          <p className="industry-section-sub">
            <strong>What counts as a fresher role?</strong> Intern, fresher, trainee, GET (Graduate Engineer Trainee),
            and graduate postings sit under <em>Intern &amp; fresher</em>; roles asking for up to about two years
            sit under <em>Junior</em>. Senior, staff and lead postings are excluded.
          </p>
          <p className="industry-section-sub">
            <strong>Is it free?</strong> Yes. No signup to browse fresher jobs in Hyderabad on Mapping
            HYD.
          </p>
        </section>
      </div>
</div>
  );
}
