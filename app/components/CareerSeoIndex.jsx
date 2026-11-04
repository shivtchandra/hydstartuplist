import Link from "next/link";
import { getSiteUrl } from "../../lib/site-url.js";

export default function CareerSeoIndex() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Hyderabad Resume Hub & ATS Tailor",
    url: `${siteUrl}/career`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    description:
      "Free client-side ATS resume matching and tailoring tool for Hyderabad tech and remote jobs. Matches skills with verified evidence receipts and zero fabricated facts.",
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does the ATS resume matching engine work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The engine parses your uploaded resume, extracts your verified skills and accomplishments, and compares them against live requirements from over 5,000 active startup, GCC, and IT openings across Hyderabad and remote employers.",
        },
      },
      {
        "@type": "Question",
        name: "Does this AI resume rewriter invent fake experience or metrics?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Unlike generic AI wrappers that hallucinate achievements, our engine enforces an evidence-receipt rule: every tailored bullet point and highlighted qualification is strictly grounded in facts from your uploaded master resume.",
        },
      },
      {
        "@type": "Question",
        name: "Can freshers, graduates, and interns use this tool?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The Career Hub includes dedicated early-career logic that recognizes academic projects, hackathons, open-source work, and internships, matching them to entry-level and fresher tech roles in Hyderabad.",
        },
      },
      {
        "@type": "Question",
        name: "Is my resume private and secure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Your resume data is stored strictly in your local browser storage (localStorage). It is never sold, indexed, or shared with third-party recruiters.",
        },
      },
      {
        "@type": "Question",
        name: "Is this resume tailoring tool free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The Career Hub is 100% free with no paywalls, subscriptions, or credit card requirements.",
        },
      },
    ],
  };

  return (
    <footer className="jobs-dir-footer" aria-label="Resume Hub Guide and FAQ">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="jobs-dir-inner">
        <div className="jobs-dir-hero">
          <div className="jobs-dir-hero-text">
            <h2 className="jobs-dir-title">Evidence-Based Resume Tailoring &amp; ATS Matching</h2>
            <p className="jobs-dir-desc">
              Match your background against <strong>5,000+ live startup and GCC roles</strong> across Hyderabad with verified evidence receipts and zero hallucinated claims.
            </p>
          </div>
          <div className="jobs-dir-hero-chips">
            <Link href="/jobs" className="jobs-dir-hero-chip">
              Browse All Jobs
            </Link>
            <Link href="/jobs/fresher" className="jobs-dir-hero-chip">
              Fresher Openings
            </Link>
            <Link href="/jobs/remote" className="jobs-dir-hero-chip">
              Remote Tech Jobs
            </Link>
            <Link href="/product-companies" className="jobs-dir-hero-chip">
              Product Companies
            </Link>
            <Link href="/gccs" className="jobs-dir-hero-chip">
              GCC Employers
            </Link>
          </div>
        </div>

        <div className="jobs-dir-faq-section">
          <h3 className="jobs-dir-faq-heading">Frequently Asked Questions</h3>
          <div className="jobs-dir-faq-list">
            <details className="jobs-dir-faq-item" open>
              <summary className="jobs-dir-faq-summary">
                <span>How does the ATS resume matching engine work?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▼</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                <p>
                  The engine parses your uploaded resume, extracts your verified skills and accomplishments, and compares them against live requirements from over 5,000 active startup, GCC, and IT openings across Hyderabad and remote employers.
                </p>
              </div>
            </details>

            <details className="jobs-dir-faq-item">
              <summary className="jobs-dir-faq-summary">
                <span>Does this AI resume rewriter invent fake experience or metrics?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▼</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                <p>
                  No. Unlike generic AI wrappers that hallucinate achievements, our engine enforces an evidence-receipt rule: every tailored bullet point and highlighted qualification is strictly grounded in facts from your uploaded master resume.
                </p>
              </div>
            </details>

            <details className="jobs-dir-faq-item">
              <summary className="jobs-dir-faq-summary">
                <span>Can freshers, graduates, and interns use this tool?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▼</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                <p>
                  Yes. The Career Hub includes dedicated early-career logic that recognizes academic projects, hackathons, open-source work, and internships, matching them to entry-level and fresher tech roles in Hyderabad.
                </p>
              </div>
            </details>

            <details className="jobs-dir-faq-item">
              <summary className="jobs-dir-faq-summary">
                <span>Is my resume private and secure?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▼</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                <p>
                  Yes. Your resume data is stored strictly in your local browser storage (localStorage). It is never sold, indexed, or shared with third-party recruiters.
                </p>
              </div>
            </details>

            <details className="jobs-dir-faq-item">
              <summary className="jobs-dir-faq-summary">
                <span>Is this resume tailoring tool free?</span>
                <span className="jobs-dir-faq-arrow" aria-hidden="true">▼</span>
              </summary>
              <div className="jobs-dir-faq-answer">
                <p>
                  Yes. The Career Hub is 100% free with no paywalls, subscriptions, or credit card requirements.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </footer>
  );
}
