import SiteNav from "../components/SiteNav.jsx";
import CareerHub from "./CareerHub.jsx";
import { getSiteUrl } from "../../lib/site-url.js";
import "./career.css";

export const dynamic = "force-static";

export async function generateMetadata() {
  const title = "Resume Hub — Match, Tailor & Apply to Hyderabad Jobs";
  const description =
    "Upload your resume once. See which Hyderabad jobs actually fit and why, then get a tailored resume, cover letter and answers for each one before you apply.";
  const url = `${getSiteUrl()}/career`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Personal tool page: keep it out of the index while the site recovers.
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: { title, description, url, type: "website" },
  };
}

export default function CareerPage() {
  return (
    <main>
      <SiteNav active="jobs" />
      <CareerHub />
    </main>
  );
}
