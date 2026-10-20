import Link from "next/link";
import VerificationNote from "./VerificationNote.jsx";
import {
  JOB_AREA_LANDINGS,
  JOB_SECTOR_LANDINGS,
  JOB_ROLE_LANDINGS,
} from "../../lib/jobs-seo.js";

/**
 * Crawlable jobs footer & directory index.
 * Styled as a sleek, integrated 4-column directory with accordion FAQ and bottom copyright.
 */
export default function JobsSeoIndex({ jobCount = 0, updatedAt = null }) {
  const countLabel = jobCount ? `${jobCount.toLocaleString()} current` : "current";
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where can I find startup and tech jobs in Hyderabad?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Mapping HYD tracks ${countLabel} startup, GCC, and product-company openings across Hyderabad, searchable by locality, experience level, and sector with links to the source listing.`,
        },
      },
      {
        "@type": "Question",
        name: "Are fresher and early-career jobs available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Use the dedicated fresher & early career filter or visit /jobs/fresher to find entry-level software engineering, data analyst, and product roles.",
        },
      },
      {
        "@type": "Question",
        name: "Which tech hubs in Hyderabad have the most hiring?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use the live area directories for Gachibowli, HITEC City, Madhapur, Financial District, Nanakramguda, and other Hyderabad hubs; each page displays its current role count.",
        },
      },
      {
        "@type": "Question",
        name: "Is this job board free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The directory is free to browse and each role links to its source listing or official employer application page when available.",
        },
      },
    ],
  };

  return (
    <footer className="jobs-dir-footer" aria-label="Hyderabad Jobs Directory & FAQ">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="jobs-dir-inner">
        {/* Intro banner */}
        <div className="jobs-dir-hero">
          <div className="jobs-dir-hero-text">
            <h2 className="jobs-dir-title">Explore Hyderabad Tech Careers</h2>
            <p className="jobs-dir-desc">
              Tracking <strong>{countLabel} open roles</strong> across mapped startups, GCCs, and product companies in Hyderabad.
            </p>
            <VerificationNote updatedAt={updatedAt} />
          </div>
          <div className="jobs-dir-hero-chips">
            <Link href="/jobs/remote" className="jobs-dir-hero-chip" style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", fontWeight: 700 }}>
              🌐 Remote Jobs (India)
            </Link>
            <Link href="/jobs/fresher" className="jobs-dir-hero-chip">
              Fresher & Early Career
            </Link>
            <Link href="/product-companies" className="jobs-dir-hero-chip">
              Product Companies
            </Link>
            <Link href="/gccs" className="jobs-dir-hero-chip">
              GCCs in Hyderabad
            </Link>
            <Link href="/" className="jobs-dir-hero-chip">
              Startup Map
            </Link>
          </div>
        </div>

        {/* 4-Column Directory Grid */}
        <div className="jobs-dir-grid">
          {/* Col 1: By Sector */}
          <div className="jobs-dir-col">
            <h3 className="jobs-dir-col-title">Jobs by Sector</h3>
            <ul className="jobs-dir-links">
              {JOB_SECTOR_LANDINGS.map((s) => (
                <li key={s.slug}>
                  <Link href={`/jobs/sector/${s.slug}`}>
                    {s.sector || s.title.replace(/ Jobs in Hyderabad$/i, "")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: By Tech Hub / Area */}
          <div className="jobs-dir-col">
            <h3 className="jobs-dir-col-title">Jobs by Area</h3>
            <ul className="jobs-dir-links">
              {JOB_AREA_LANDINGS.slice(0, 8).map((a) => (
                <li key={a.slug}>
                  <Link href={`/jobs/in/${a.slug}`}>{a.area}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Popular Roles */}
          <div className="jobs-dir-col">
            <h3 className="jobs-dir-col-title">Popular Roles</h3>
            <ul className="jobs-dir-links">
              {JOB_ROLE_LANDINGS.map((r) => (
                <li key={r.slug}>
                  <Link href={`/jobs/role/${r.slug}`}>{r.role}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Resources & Reports */}
          <div className="jobs-dir-col">
            <h3 className="jobs-dir-col-title">Resources</h3>
            <ul className="jobs-dir-links">
              <li>
                <Link href="/jobs/fresher">Fresher Hiring Board</Link>
              </li>
              <li>
                <Link href="/stories/hyderabad-startup-hiring-report-2026">Hiring Report 2026</Link>
              </li>
              <li>
                <Link href="/stories/hyderabad-tech-parks-guide">Tech Parks Guide</Link>
              </li>
              <li>
                <Link href="/stories/top-product-companies-hyderabad">Top Product Companies</Link>
              </li>
              <li>
                <Link href="/radar">Radar (Hard-to-Find Employers)</Link>
              </li>
              <li>
                <Link href="/saved">My Saved Shortlist</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Accordion FAQ */}
        <div className="jobs-dir-faq-section">
          <h3 className="jobs-dir-faq-heading">Frequently Asked Questions</h3>
          <div className="jobs-dir-faq-list">
            <details className="jobs-dir-faq-item">
              <summary className="jobs-dir-faq-summary">
                <span>Where can I find startup and tech jobs in Hyderabad?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▾</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                Mapping HYD tracks {countLabel} startup, GCC, and product-company openings across Hyderabad — searchable by locality, experience level, and sector with links to the source listing.
              </div>
            </details>

            <details className="jobs-dir-faq-item">
              <summary className="jobs-dir-faq-summary">
                <span>Are fresher and early-career jobs available?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▾</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                Yes. Use the &ldquo;Early career&rdquo; quick chip above or visit the{" "}
                <Link href="/jobs/fresher">Fresher & Early Career board</Link> to browse entry-level software engineering, data analyst, and design roles.
              </div>
            </details>

            <details className="jobs-dir-faq-item">
              <summary className="jobs-dir-faq-summary">
                <span>Which tech hubs in Hyderabad have the most hiring?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▾</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                Use the live area directories for HITEC City, Madhapur, Gachibowli, Financial District, Nanakramguda, and other hubs. Each directory shows its current role and employer counts.
              </div>
            </details>

            <details className="jobs-dir-faq-item">
              <summary className="jobs-dir-faq-summary">
                <span>Is this job board free to use?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▾</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                Yes. The directory is free to browse, and each job links to its source listing or official employer application page when available.
              </div>
            </details>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="jobs-dir-bottom-bar">
          <div className="jobs-dir-bottom-left">
            <span>Mapping <strong>HYD</strong> · Hyderabad Startup & Opportunities Directory</span>
            <span className="jobs-dir-sep">·</span>
            <span>Saved items stay on this device</span>
          </div>
          <div className="jobs-dir-bottom-right">
            <Link href="/?view=companies">Startups</Link>
            <Link href="/gccs">GCCs</Link>
            <Link href="/more">Insights & News</Link>
            <Link href="/submit">Submit a Role</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
