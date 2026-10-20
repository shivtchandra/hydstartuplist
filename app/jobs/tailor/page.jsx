import Link from "next/link";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import TailorClient from "./TailorClient.jsx";
import { getAllJobs } from "../../../lib/jobs.js";
import { getSiteUrl } from "../../../lib/site-url.js";

export const dynamic = "force-static";

export async function generateMetadata() {
  const title = "ATS Resume Matcher & Reverse-Engineering Optimizer (Hyderabad Jobs)";
  const description =
    "Reverse-engineer ATS keyword algorithms, analyze missing skills, and tailor your resume into Google X-Y-Z action bullets to reach an 80%+ match rate.";
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
    { name: "Resume ATS Optimizer" },
  ];

  return (
    <main>
      <SiteNav active="jobs" />
      <div className="feed-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px 0' }}>
        <JobsBreadcrumbs items={breadcrumbs} />

        <header className="feed-head" style={{ marginBottom: '24px' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>ATS Resume Reverse-Engineer & Optimizer</span>
          </h1>
          <p className="jobs-intro" style={{ maxWidth: '750px', fontSize: '15px', lineHeight: '1.5' }}>
            Modern Applicant Tracking Systems filter resumes based on keyword frequency, technical skills coverage, and title alignment. This tool runs the same deterministic audit, isolates critical gaps, and reframes your experience using the <strong>Google X-Y-Z formula</strong> to hit an <strong>80%+ match target</strong>.
          </p>
        </header>

        <TailorClient sampleJobs={sampleJobs} />
      </div>
    </main>
  );
}
