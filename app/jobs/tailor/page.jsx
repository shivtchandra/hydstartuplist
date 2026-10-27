import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import TailorClient from "./TailorClient.jsx";
import { getAllJobs } from "../../../lib/jobs.js";
import { getSiteUrl } from "../../../lib/site-url.js";

export const dynamic = "force-static";

export async function generateMetadata() {
  const title = "Apply Copilot for Hyderabad Jobs";
  const description =
    "Prepare a truthful tailored resume, reusable application answers, and a private per-job application pack from one verified Candidate Passport.";
  const url = `${getSiteUrl()}/jobs/tailor`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    keywords: [
      "resume optimizer hyderabad",
      "ats resume checker hyderabad",
      "tailor resume for job",
      "reverse engineer resume ats",
      "ats match score",
      "google xyz resume formula",
      "startup resume matcher hyderabad",
    ],
  };
}

export default async function TailorPage() {
  const allJobs = await getAllJobs().catch(() => []);
  const sampleJobs = (Array.isArray(allJobs) ? allJobs : [])
    .filter((j) => j && j.title && (j.description || j.snippet))
    .slice(0, 10)
    .map((j) => ({
      title: j.title,
      company: j.company,
      description: j.description || j.snippet,
      url: j.url,
    }));

  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: "Apply Copilot" },
  ];

  return (
    <main>
      <SiteNav active="jobs" />
      <div className="feed-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px 0' }}>
        <JobsBreadcrumbs items={breadcrumbs} />

        <header className="feed-head rt-page-intro">
          <span>Application copilot</span>
          <h1>One career record. A better application every time.</h1>
          <p className="jobs-intro">
            Save your verified Candidate Passport once, then prepare the role-specific resume, answers, and follow-up record without rebuilding everything for each application.
          </p>
        </header>

        <TailorClient sampleJobs={sampleJobs} />
      </div>
    </main>
  );
}
