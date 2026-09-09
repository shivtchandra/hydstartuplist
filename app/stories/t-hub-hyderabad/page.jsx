import Link from "next/link";
import { getSiteUrl } from "../../../lib/site-url.js";
import { articleJsonLd } from "../../../lib/jobs-seo.js";
import SiteNav from "../../components/SiteNav.jsx";

const SLUG = "t-hub-hyderabad";
const TITLE = "T-Hub Hyderabad — what it is and how startups use it";
const DESCRIPTION =
  "T-Hub Hyderabad is Telangana’s flagship innovation hub in Madhapur. Here’s what T-Hub Hyderabad is for, who it serves, and how it connects to the Mapping HYD startup map and jobs board.";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/stories/${SLUG}` },
  title: `${TITLE} | Mapping HYD`,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "article",
    url: `${getSiteUrl()}/stories/${SLUG}`,
  },
};

export default function THubHyderabadStory() {
  const pageUrl = `${getSiteUrl()}/stories/${SLUG}`;
  const published = "2026-09-07";
  const jsonLd = [
    articleJsonLd({
      title: TITLE,
      description: DESCRIPTION,
      url: pageUrl,
      datePublished: published,
      dateModified: published,
    }),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is T-Hub Hyderabad?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "T-Hub Hyderabad is Telangana’s public-private innovation hub in Madhapur, built to support startups with space, programmes, and corporate connections.",
          },
        },
        {
          "@type": "Question",
          name: "Where is T-Hub Hyderabad located?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "T-Hub Hyderabad sits in the Madhapur / HITEC City tech belt — the same corridor where many mapped startups and jobs cluster on Mapping HYD.",
          },
        },
        {
          "@type": "Question",
          name: "How does T-Hub relate to the Hyderabad startup map?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Mapping HYD plots startups and jobs across Hyderabad, including companies around Madhapur near T-Hub Hyderabad. Use the map and jobs board to explore the surrounding ecosystem.",
          },
        },
      ],
    },
  ];

  return (
    <div className="page-with-nav">
      {jsonLd.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <SiteNav active="insights" />
      <article className="feed-page story-article" style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 64px" }}>
        <p className="story-kicker">Hyderabad · Ecosystem</p>
        <h1>{TITLE}</h1>
        <p className="jobs-intro">{DESCRIPTION}</p>

        <p>
          <strong>T-Hub Hyderabad</strong> (Technology Hub) is one of the city’s most visible startup
          institutions — a large Madhapur campus where founders, mentors, and corporate partners
          meet. When people search for T-Hub Hyderabad, they usually want a plain answer: what it
          is, where it sits, and whether it matters for finding companies or jobs nearby.
        </p>

        <h2>What T-Hub Hyderabad does</h2>
        <p>
          T-Hub Hyderabad runs programmes, coworking-style space, and corporate innovation
          partnerships aimed at early and growth-stage startups. It is not a full list of every
          Hyderabad company — it is a hub inside a much larger tech corridor that also includes
          HITEC City, Gachibowli, and the Financial District.
        </p>

        <h2>How to explore startups near T-Hub</h2>
        <p>
          On Mapping HYD, browse the{" "}
          <Link href="/areas/madhapur">Madhapur startups</Link> and{" "}
          <Link href="/areas/hitec-city">HITEC City</Link> area hubs, then open{" "}
          <Link href="/jobs">jobs in Hyderabad</Link> if you are hunting roles in the same belt.
          Early-career candidates can also check{" "}
          <Link href="/jobs/fresher">fresher jobs in Hyderabad</Link>.
        </p>

        <section aria-label="FAQ">
          <h2>FAQ</h2>
          <p>
            <strong>What is T-Hub Hyderabad?</strong> Telangana’s flagship innovation hub in
            Madhapur for startups and corporate partners.
          </p>
          <p>
            <strong>Is every Hyderabad startup at T-Hub?</strong> No. T-Hub Hyderabad is one node;
            thousands of companies sit across the city map.
          </p>
          <p>
            <strong>Where next?</strong>{" "}
            <Link href="/">Open the startup map</Link> · <Link href="/jobs">Jobs</Link> ·{" "}
            <Link href="/insights">Insights</Link>
          </p>
        </section>
      </article>
</div>
  );
}
