import Link from "next/link";
import { getJobMarketPulse } from "../../../lib/jobs.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import { articleJsonLd } from "../../../lib/jobs-seo.js";
import SiteNav from "../../components/SiteNav.jsx";

export const revalidate = 86400;

const SLUG = "hyderabad-job-market-pulse-2026";
const TITLE = "Hyderabad job market pulse — who's hiring, what roles, and how Hyd compares";
const DESCRIPTION =
  "A live read of Hyderabad's tech hiring market from Mapping HYD: role demand, experience bands, fresher supply, employer concentration, and how the city stacks up against Bengaluru and Pune.";

export async function generateMetadata() {
  const pulse = await getJobMarketPulse();
  const title = `${TITLE} (${pulse.totalRoles.toLocaleString()} roles)`;
  const url = `${getSiteUrl()}/stories/${SLUG}`;
  return {
    alternates: { canonical: url },
    title: `${title} | Mapping HYD`,
    description: DESCRIPTION,
    openGraph: { title, description: DESCRIPTION, url, type: "article" },
    twitter: { card: "summary_large_image", title, description: DESCRIPTION },
    keywords: [
      "hyderabad job market 2026",
      "hyderabad tech hiring trends",
      "fresher jobs hyderabad vs bangalore",
      "software engineer jobs hyderabad",
      "GCC hiring hyderabad",
      "hyderabad startup jobs analysis",
    ],
  };
}

function pct(n, d) {
  if (!d) return "0%";
  return `${Math.round((1000 * n) / d) / 10}%`;
}

function LevelBars({ knownLevel }) {
  const order = ["intern", "junior", "mid", "senior", "lead", "manager"];
  const labels = {
    intern: "Intern / fresher",
    junior: "Junior (0–2y)",
    mid: "Mid-level",
    senior: "Senior",
    lead: "Lead",
    manager: "Manager+",
  };
  return (
    <ul className="story-stat-bars">
      {order.map((key) => {
        const row = knownLevel[key];
        if (!row?.count) return null;
        return (
          <li key={key}>
            <span className="story-stat-label">{labels[key]}</span>
            <span className="story-stat-track" aria-hidden="true">
              <span className="story-stat-fill" style={{ width: `${Math.min(row.pct, 100)}%` }} />
            </span>
            <span className="story-stat-value">
              {row.count} · {row.pct}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function HyderabadJobMarketPulseStory() {
  const pulse = await getJobMarketPulse();
  const pageUrl = `${getSiteUrl()}/stories/${SLUG}`;
  const published = "2026-09-25";
  const jsonLd = articleJsonLd({
    title: TITLE,
    description: DESCRIPTION,
    url: pageUrl,
    datePublished: published,
    dateModified: pulse.asOf,
  });

  const startupShare = pulse.byCategory.startup || 0;
  const gccShare = pulse.byCategory.gcc || 0;
  const enterpriseShare = pulse.byCategory.enterprise || 0;
  const engShare = pulse.byRole.find((r) => r.name === "Engineering")?.count || 0;
  const dataShare = pulse.byRole.find((r) => r.name === "Data")?.count || 0;

  return (
    <div className="page-with-nav">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav active="stories" />
      <article className="story-page">
        <p className="story-kicker">
          <Link href="/stories">Stories</Link> · Hiring
        </p>
        <h1>{TITLE}</h1>
        <p className="story-lede">
          Right now the Mapping HYD board shows{" "}
          <strong>{pulse.totalRoles.toLocaleString()} distinct open roles</strong> across{" "}
          <strong>{pulse.uniqueEmployers.toLocaleString()} employers</strong> — with{" "}
          <strong>{pulse.recent7.toLocaleString()}</strong> appearing in the last seven days.
          This piece reads that live feed: which roles are in demand, which experience bands
          companies prefer, how thin fresher hiring still is, and where Hyderabad sits against
          Bengaluru and Pune.
        </p>
        <p className="story-meta">
          Snapshot {new Date(pulse.asOf).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}{" "}
          · Live from career pages synced on Mapping HYD · Duplicate requisitions collapsed
        </p>

        <div className="story-body">
          <h2>The headline numbers</h2>
          <p>
            Hyderabad&apos;s open market on this board is not a pure startup feed. Of{" "}
            {pulse.totalRoles.toLocaleString()} roles,{" "}
            <strong>{startupShare.toLocaleString()} ({pct(startupShare, pulse.totalRoles)})</strong>{" "}
            are tagged startup,{" "}
            <strong>{enterpriseShare.toLocaleString()} ({pct(enterpriseShare, pulse.totalRoles)})</strong>{" "}
            enterprise, and{" "}
            <strong>{gccShare.toLocaleString()} ({pct(gccShare, pulse.totalRoles)})</strong> GCC —
            with the rest in a mixed &quot;other&quot; bucket. That mix matters: national GCC
            commentary keeps placing Hyderabad as India&apos;s fastest-growing capability-centre
            city after Bengaluru, and the board reflects that with banks, insurers, pharma, and
            retail tech hiring alongside SaaS and product startups.
          </p>
          <p>
            Geography is concentrated. Roughly{" "}
            <strong>{pulse.corridorPct}%</strong> of roles sit on the Gachibowli–Madhapur–
            Financial District–HITEC corridor. Hiring scale is concentrated too: the ten largest
            employers account for{" "}
            <strong>{pulse.top10Pct}%</strong> of all listings (
            {pulse.top10Share.toLocaleString()} of {pulse.totalRoles.toLocaleString()}), and{" "}
            <strong>{pulse.multiHire}</strong> employers currently hold five or more open roles.
          </p>

          <h2>What roles are in demand</h2>
          <p>
            Engineering still dominates —{" "}
            <strong>
              {engShare.toLocaleString()} roles ({pct(engShare, pulse.totalRoles)})
            </strong>
            , more than three times the next named specialty (Data at{" "}
            {dataShare.toLocaleString()}). After that the board fans out into operations, sales,
            finance, healthcare/nutrition, education, people/HR, marketing, product, and design —
            the shape of a city that is no longer only &quot;software parks hiring SDE-2s.&quot;
          </p>
          <ol>
            {pulse.byRole.slice(0, 8).map((r) => (
              <li key={r.name}>
                <strong>{r.name}</strong> — {r.count.toLocaleString()} role
                {r.count === 1 ? "" : "s"} ({pct(r.count, pulse.totalRoles)})
              </li>
            ))}
          </ol>
          <p>
            The last seven days tell a similar story with a slightly softer engineering skew: of{" "}
            {pulse.recent7.toLocaleString()} newly seen roles, engineering still leads, but sales,
            operations, education, and people/HR show up more often in the fresh slice than they
            do in the full stock — a sign that go-to-market and ops hiring is active even when the
            backlog is engineering-heavy.
          </p>
          {pulse.recent7Roles.length > 0 && (
            <ul>
              {pulse.recent7Roles.map((r) => (
                <li key={r.name}>
                  Last 7 days · {r.name}: {r.count}
                </li>
              ))}
            </ul>
          )}

          <h2>Experience bands: what companies actually prefer</h2>
          <p>
            Titles and descriptions only resolve a seniority band for{" "}
            <strong>{pulse.knownCount.toLocaleString()}</strong> of{" "}
            {pulse.totalRoles.toLocaleString()} roles. On that labelled set, the preference is
            clear — and it is not entry-level:
          </p>
          <LevelBars knownLevel={pulse.knownLevel} />
          <p>
            Senior, lead, and manager bands together are the majority of labelled demand.
            Mid-level is thin relative to how loudly recruiters talk about the &quot;4–8 year
            shortage&quot; nationally — partly because many mid roles never say &quot;mid&quot; in
            the title and land in our unknown bucket, and partly because Hyderabad GCCs and
            product teams keep posting for owners (seniors and leads) rather than generalists.
          </p>
          <p>
            For software engineering specifically, among labelled engineering roles,{" "}
            <strong>{pulse.engSeniorishPct}%</strong> sit in senior, lead, or manager titles.
            That matches the wider India pattern reported across Bengaluru, Pune, and Hyderabad:
            mid-career and senior IC hiring is where competition is fiercest, while pure fresher
            seats stay scarce outside structured campus programs.
          </p>

          <h2>Fresher and early-career hiring</h2>
          <p>
            Early-career roles (intern / fresher and junior 0–2y) are only{" "}
            <strong>{pulse.earlyCareer}</strong> of{" "}
            {pulse.totalRoles.toLocaleString()} distinct openings on this board — about{" "}
            {pct(pulse.earlyCareer, pulse.totalRoles)}. That is the ground reality for someone
            browsing Mapping HYD without a campus pipeline: the city is hiring, but not mostly
            for first jobs.
          </p>
          <p>
            Where early seats do exist, they concentrate. The largest early-career posters right
            now:
          </p>
          <ol>
            {pulse.earlyByCompany.map((c) => (
              <li key={c.name}>
                {c.name} — {c.count} early-career role{c.count === 1 ? "" : "s"}
              </li>
            ))}
          </ol>
          <p>
            See the dedicated{" "}
            <Link href="/jobs/fresher">fresher &amp; early-career board</Link> for the curated
            list (staffing funnels removed), and the deeper placement context in our{" "}
            <Link href="/stories/hyderabad-fresher-tech-hiring-guide-2026">
              fresher tech hiring guide
            </Link>
            .
          </p>

          <h2>Who is hiring at scale</h2>
          <p>
            Scale on this board is a mix of consulting GCCs, financial-services centres, product
            companies, and a few high-volume local employers. The current top ten by open roles:
          </p>
          <ol>
            {pulse.topCompanies.map((c) => (
              <li key={c.name}>
                <Link href={`/jobs?company=${encodeURIComponent(c.name)}`}>{c.name}</Link> —{" "}
                {c.count} role{c.count === 1 ? "" : "s"}
              </li>
            ))}
          </ol>
          <p>
            Read that list carefully. Deloitte, State Street, TJX, Cigna, Invesco, Wells Fargo,
            HSBC, Roche, and peers are the GCC / enterprise muscle. Sarvam AI, Jade Global,
            Twin Health, Wise, ServiceNow, Blue Yonder, Keka, and NxtWave are the product and
            services layer. Hyderabad&apos;s hiring story in 2026 is both: capability centres
            absorbing senior talent, and local product companies still posting — just not at the
            same raw volume.
          </p>

          <h2>How Hyderabad compares to other metros</h2>
          <p>
            Mapping HYD only measures Hyderabad, so metro share has to come from industry
            reporting — then we check whether our live board agrees with the narrative.
          </p>
          <ul>
            <li>
              <strong>National IT share.</strong> Industry write-ups still put Bengaluru near
              ~24% of India IT jobs, with Hyderabad around ~13.5% and Pune ~12%. Hyd is second
              or third depending on the dataset — never first, but no longer a footnote.
            </li>
            <li>
              <strong>Growth rate.</strong> Several 2025–26 hiring roundups flagged Hyderabad
              with the sharpest year-on-year rise in IT postings among the big three (one
              commonly cited window: ~41% posting growth vs slower growth in Bengaluru&apos;s
              larger base). Growth from a smaller base is easier — but the direction matches
              what we see in GCC announcements.
            </li>
            <li>
              <strong>GCC geography.</strong> Nasscom–Zinnov style tallies still crown Bengaluru
              (on the order of ~880–1,080 centres depending on the cut). Hyderabad is consistently
              #2 or the fastest adder — Vestian / Zinnov-linked snapshots have put Hyd at
              ~355+ centres with ~70 added in a recent fiscal, while 2025–26 pipelines keep
              naming Hyd for BFSI, pharma, retail tech, and consumer GCCs (Vanguard, Costco, Eli
              Lilly, Sanofi expansions, Marriott tech, Western Union, UBS plans, and more).
            </li>
            <li>
              <strong>Fresher vs experienced.</strong> Across metros, entry-level demand as a
              share of posted IT roles has compressed; mid and senior bands take most of the
              oxygen. Our board agrees: early-career is a small slice of Hyderabad openings,
              while senior/lead/manager dominate labelled engineering demand — closer to
              Bengaluru&apos;s &quot;hire for outcomes&quot; market than to a campus-placement
              city myth.
            </li>
            <li>
              <strong>Compensation positioning.</strong> Public city salary league tables for
              software engineers still put Bengaluru first and Hyderabad close behind, with
              Pune / NCR / Mumbai further back. That gap is one reason GCCs can staff Hyd
              aggressively without always matching Bengaluru cash — and why Hyd keeps winning
              expansions that need scale plus cost discipline.
            </li>
          </ul>
          <p>
            Bottom line versus peers: Bengaluru still wins depth and brand gravity; Pune wins
            steady engineering / ER&amp;D economics; Hyderabad wins <em>pace</em> — especially
            in GCC and BFSI/pharma tech — while its open board remains experience-weighted, not
            fresher-weighted.
          </p>

          <h2>What the last week suggests</h2>
          <p>
            Freshness on ATS data is imperfect — many roles lack a reliable posted date — but
            among dated listings we still see{" "}
            <strong>{pulse.freshness.today}</strong> roles from roughly the last day and{" "}
            <strong>{pulse.freshness.week}</strong> from days 2–7, on top of{" "}
            {pulse.freshness.month} from the rest of the month. The recent slice skews the same
            way as the stock: engineering and &quot;other / specialist&quot; titles first, with
            active manager and senior posting mixed into unknown-level titles that never say
            &quot;senior&quot; out loud.
          </p>
          <p>
            For job seekers: if you are early-career, use the{" "}
            <Link href="/jobs/fresher">fresher board</Link> and the early-career filter on{" "}
            <Link href="/jobs?level=early">/jobs</Link> — then widen to companies that hire
            juniors even when the title is not &quot;fresher.&quot; If you are mid or senior in
            engineering or data, the board is dense; the competition is other experienced
            candidates, not volume of openings.
          </p>
          <p>
            For founders and talent leads: concentration at the top ten employers means a
            handful of GCCs and large posters set the visible market. Differentiated startup
            roles still clear — they just do not move the aggregate count the way a Deloitte or
            State Street requisition wave does.
          </p>

          <h2>Browse the live data</h2>
          <ul>
            <li>
              <Link href="/jobs">All jobs in Hyderabad</Link>
            </li>
            <li>
              <Link href="/jobs?level=early">Early career filter</Link>
            </li>
            <li>
              <Link href="/jobs/fresher">Fresher &amp; early-career board</Link>
            </li>
            <li>
              <Link href="/stories/hyderabad-startup-hiring-report-2026">
                Startup hiring report (top companies &amp; sectors)
              </Link>
            </li>
            <li>
              <Link href="/stories/bengaluru-vs-hyderabad-startup-limelight">
                Bengaluru vs Hyderabad — limelight vs script
              </Link>
            </li>
          </ul>

          <div className="story-callout">
            Numbers refresh as career pages sync. Duplicate same-title requisitions are collapsed
            into one role with an openings count, so this pulse measures distinct jobs — not raw
            ATS rows. External metro share and GCC counts are industry estimates, not Mapping HYD
            measurements; treat them as context around the live Hyderabad board.
          </div>
        </div>
      </article>
    </div>
  );
}
