import { Suspense } from "react";
import SiteNav from "../components/SiteNav.jsx";
import CareerHub from "./CareerHub.jsx";
import CareerSeoIndex from "../components/CareerSeoIndex.jsx";
import { getSiteUrl } from "../../lib/site-url.js";
import "./career.css";

export const dynamic = "force-static";

export async function generateMetadata() {
  const title = "AI Resume Hub — Match & Tailor to Hyderabad Tech Jobs";
  const description =
    "Free ATS resume tailoring and job matching for Hyderabad tech roles. Match your background against 5,000+ startup and GCC openings with verified evidence receipts.";
  const url = `${getSiteUrl()}/career`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: { title, description, url, type: "website" },
    keywords: [
      "ai resume tailor",
      "ats resume tailor hyderabad",
      "free resume rewrite",
      "match resume to jobs",
      "hyderabad tech resume builder",
      "fresher resume matcher hyderabad",
      "startup resume tailor",
    ],
  };
}

export default function CareerPage() {
  return (
    <main>
      <SiteNav active="jobs" />
      <Suspense fallback={<div className="ch-shell"><div className="ch-skeleton" /></div>}>
        <CareerHub />
      </Suspense>
      <CareerSeoIndex />
    </main>
  );
}
