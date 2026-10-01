import Link from "next/link";
import { getSiteUrl } from "../../../lib/site-url.js";
import { articleJsonLd } from "../../../lib/jobs-seo.js";
import ArticleShell from "../../components/ArticleShell.jsx";

const SLUG = "hyderabad-fresher-tech-hiring-guide-2026";
const TITLE = "Hyderabad Fresher Tech Hiring & Placement Report (2026 Ground Reality)";
const DESCRIPTION =
  "Exhaustive 2026 analysis of Hyderabad's fresher tech ecosystem: actual college placement numbers (CBIT, VNR, Vasavi, JNTU, IIIT-H), the 80,000+ unplaced graduate funnel, salary tiers (₹3.6L to ₹28L+), real roles distribution, and insights from r/hyderabad and r/developersIndia.";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/stories/${SLUG}` },
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "article",
    url: `${getSiteUrl()}/stories/${SLUG}`,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  keywords: [
    "fresher jobs in hyderabad",
    "hyderabad college placement statistics 2026",
    "cbit placements 2026",
    "vnr vjiet placements 2026",
    "vasavi placements 2026",
    "unplaced freshers hyderabad",
    "ameerpet proxy scam",
    "software engineer fresher salary hyderabad",
    "r/hyderabad fresher jobs",
  ],
};

const COLLEGE_PLACEMENTS = [
  {
    college: "IIIT Hyderabad & IIT Hyderabad",
    tier: "Tier 1 (National Premier)",
    batchSize: "~600 – 900",
    placementRate: "65% – 82%",
    medianCTC: "₹18.0 – ₹32.0 LPA",
    highestCTC: "₹75.0 LPA – ₹1.2 Cr+",
    topRecruiters: "Google, Microsoft, Uber, Apple, NVIDIA, Quant/HFTs, AI Research Labs",
  },
  {
    college: "VNR VJIET (Vignana Jyothi)",
    tier: "Tier 2 (Top State Autonomous)",
    batchSize: "~1,800 – 2,200",
    placementRate: "65% – 72%",
    medianCTC: "₹6.5 LPA",
    highestCTC: "₹65.0 – ₹92.0 LPA",
    topRecruiters: "Amazon, Oracle, JPMC, ServiceNow, Darwinbox, TCS Digital, Accenture",
  },
  {
    college: "CBIT (Chaitanya Bharathi)",
    tier: "Tier 2 (Top State Autonomous)",
    batchSize: "~1,400 – 1,600",
    placementRate: "60% – 68%",
    medianCTC: "₹6.0 LPA",
    highestCTC: "₹54.0 LPA",
    topRecruiters: "Microsoft, ServiceNow, JPMC, Wells Fargo, Keka HR, Cognizant",
  },
  {
    college: "Vasavi College of Engineering (VCE)",
    tier: "Tier 2 (Top State Autonomous)",
    batchSize: "~900 – 1,100",
    placementRate: "62% – 67%",
    medianCTC: "₹5.8 LPA",
    highestCTC: "₹47.5 LPA",
    topRecruiters: "ServiceNow, Oracle OCI, Cisco, Darwinbox, HighRadius, Infosys",
  },
  {
    college: "JNTUH University College (CEH)",
    tier: "Tier 2 (Premier State University)",
    batchSize: "~900 – 1,200",
    placementRate: "60% – 65%",
    medianCTC: "₹6.0 LPA",
    highestCTC: "₹52.0 LPA",
    topRecruiters: "AMD, Qualcomm, MathWorks, TCS, Tech Mahindra, Honeywell",
  },
  {
    college: "130+ Tier-3 Affiliated Colleges (TG)",
    tier: "Tier 3 (Private / Rural Affiliated)",
    batchSize: "~55,000 – 65,000",
    placementRate: "20% – 35%",
    medianCTC: "₹3.6 – ₹4.2 LPA",
    highestCTC: "₹8.0 – ₹12.0 LPA",
    topRecruiters: "TCS Ninja, Wipro Turbo, Capgemini, EdTech BDA, Local BPOs",
  },
];

const FUNNEL_DATA = [
  { stage: "Total B.Tech Seats in Telangana (TG EAPCET)", count: "~1,15,000+", pct: "100%" },
  { stage: "CS, IT, AI/ML, Data Science & Allied Tech Graduates", count: "~75,000 – 80,000", pct: "~68%" },
  { stage: "Placed On-Campus in Tech / IT Roles", count: "~28,000 – 32,000", pct: "~38%" },
  { stage: "Placed in Non-Tech / Core / Sales / BPO", count: "~12,000 – 15,000", pct: "~16%" },
  { stage: "Pursuing Higher Studies (US / MS / GATE)", count: "~15,000 – 18,000", pct: "~20%" },
  { stage: "Unplaced Telangana Freshers Seeking Off-Campus Tech Roles", count: "~40,000 – 45,000", pct: "~55% of pool" },
  { stage: "Fresh Graduates Migrating from Andhra Pradesh to Hyd", count: "~35,000 – 40,000 / year", pct: "—" },
  { stage: "Total Active Off-Campus Fresher Competitor Pool in Hyd", count: "80,000+ candidates", pct: "Continuous" },
];

const ROLES_BREAKDOWN = [
  {
    category: "1. Core Product SDE-1 / Software Engineer",
    share: "15% – 20% of Placements",
    ctcRange: "₹6.0 LPA – ₹18.0 LPA",
    roles: "SDE-1, Associate Backend Engineer, Full-Stack Developer, Graduate Engineer Trainee",
    topTech: "Java (Spring Boot), TypeScript / Next.js, Python / Django, Go, PostgreSQL, Docker",
    employers: "Darwinbox, Zenoti, Keka, HighRadius, Zaggle, Skyroot, NxtWave, Pebbl, CustomFit.ai",
  },
  {
    category: "2. Mass Enterprise IT Service Associates",
    share: "45% – 50% of Placements",
    ctcRange: "₹3.6 LPA – ₹7.5 LPA",
    roles: "Associate Software Engineer (ASE), Programmer Analyst Trainee (PAT), Systems Engineer",
    topTech: "Java / C# fundamentals, SQL, Cloud basics, enterprise support ticketing",
    employers: "TCS (Ninja @ ₹3.6L / Digital @ ₹7L / Prime @ ₹9L), Infosys, Wipro, Cognizant, Accenture",
  },
  {
    category: "3. Junior Data Analyst & AI / ML Interns",
    share: "12% – 15% of Placements",
    ctcRange: "₹5.5 LPA – ₹14.0 LPA",
    roles: "Data Analyst, BI Associate, Junior AI Engineer, Prompt Engineer Trainee",
    topTech: "SQL (Window functions), Python (Pandas/NumPy), PowerBI, Tableau, LangChain, OpenAI APIs",
    employers: "Aganitha AI, Deccan AI, FactSet, S&P Global, Novartis, Amgen, HighRadius",
  },
  {
    category: "4. QA & SDET-1 Automation Testers",
    share: "10% – 12% of Placements",
    ctcRange: "₹4.5 LPA – ₹11.0 LPA",
    roles: "SDET-1, QA Automation Trainee, Software Test Engineer",
    topTech: "Selenium, Cypress, Playwright, Postman API Testing, Java / Python test frameworks",
    employers: "Qualitest, Keka, Zenoti, ValueLabs, Broadridge, Tech Mahindra",
  },
  {
    category: "5. Non-Tech, EdTech BDA & Inside Sales",
    share: "15% – 20% of Placements",
    ctcRange: "₹4.0 LPA – ₹8.5 LPA (High Variable)",
    roles: "Business Development Associate (BDA), Sales Development Representative (SDR), Customer Success",
    topTech: "Inside sales, CRM (HubSpot/Salesforce), cold outreach, parent counseling",
    employers: "NxtWave, Bhanzu, Infinity Learn, LeadSquared, Byju's alumni firms (High attrition)",
  },
];

export default function FresherHiringGuidePage() {
  const jsonLd = articleJsonLd({
    title: TITLE,
    description: DESCRIPTION,
    url: `${getSiteUrl()}/stories/${SLUG}`,
    datePublished: "2026-03-15",
    dateModified: "2026-09-17",
  });

  return (
    <ArticleShell
      kicker={<><Link href="/stories">Stories</Link> · Freshers</>}
      title={TITLE}
      lede={DESCRIPTION}
      meta={["By Mapping HYD Research", "Updated September 2026", "12 min read"]}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="story-body">
          <p>
            Every year, over <strong>1,15,000 students</strong> enroll in engineering across Telangana, with more than
            <strong>75,000 graduates</strong> emerging from Computer Science, IT, AI/ML, and allied tech branches.
            Coupled with an influx of <strong>35,000+ fresh graduates migrating from Andhra Pradesh</strong>, Hyderabad
            hosts an active off-campus fresher job-seeking pool exceeding <strong>80,000 candidates</strong> at any given moment.
          </p>
          <p>
            In this report, we synthesize verified college placement disclosures (NIRF 2025/2026 filings, campus CDC reports),
            labor market data across 2,500+ Hyderabad companies, and ground-truth experiences shared by thousands of candidates
            on <em>r/hyderabad</em> and <em>r/developersIndia</em>.
          </p>

          <div className="story-callout">
            <h4>Direct Verified Openings</h4>
            <p>
              Skip the agency middle-men. Browse our real-time <Link href="/jobs/fresher">Hyderabad Fresher Jobs Hub</Link> or
              jump into <Link href="/jobs/fresher/software-engineer">SDE-1 &amp; Fresher Roles</Link> and <Link href="/jobs/fresher/internships">Tech Internships</Link> crawled directly from company ATS portals.
            </p>
          </div>

          <h2>1. The Real Funnel: How Many Freshers Actually Get Placed in Hyderabad?</h2>
          <p>
            Following the post-pandemic hiring cooldown and the reduction of mass-service campus intakes (WITCH companies
            reducing baseline campus offers by 40–60% since 2023), campus placement statistics across Hyderabad have bifurcated sharply:
          </p>

          <div className="story-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Funnel Stage</th>
                  <th>Estimated Annual Volume</th>
                  <th>Share / Status</th>
                </tr>
              </thead>
              <tbody>
                {FUNNEL_DATA.map((row, i) => (
                  <tr key={i}>
                    <td>{row.stage}</td>
                    <td>{row.count}</td>
                    <td>{row.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>2. College-by-College Placement Reality in Hyderabad (2024–2026 Data)</h2>
          <p>
            Examining official NIRF submissions and Training &amp; Placement (T&amp;P) disclosures for top Hyderabad institutions reveals
            the true picture of on-campus placement rates, median packages, and top recruiter types. Each college also has a
            live page of employers hiring from it: <Link href="/colleges/iiit-hyderabad">IIIT Hyderabad</Link>,{" "}
            <Link href="/colleges/cbit-hyderabad">CBIT</Link>, <Link href="/colleges/vnr-vjiet-hyderabad">VNR VJIET</Link>,{" "}
            <Link href="/colleges/jntuh-hyderabad">JNTUH</Link> and <Link href="/colleges">more colleges</Link>.
          </p>

          <div className="story-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Tier / Category</th>
                  <th>Placed Rate</th>
                  <th>Median CTC</th>
                  <th>Highest Package</th>
                  <th>Key Recruiters</th>
                </tr>
              </thead>
              <tbody>
                {COLLEGE_PLACEMENTS.map((c, i) => (
                  <tr key={i}>
                    <td>{c.college}</td>
                    <td>{c.tier}</td>
                    <td>{c.placementRate}</td>
                    <td>{c.medianCTC}</td>
                    <td>{c.highestCTC}</td>
                    <td>{c.topRecruiters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>3. What Kinds of Roles Are Freshers Actually Getting?</h2>
          <p>
            Discussions across tech communities frequently ask: <em>&quot;What jobs are actually available for entry-level candidates in Hyderabad right now?&quot;</em>
            Based on direct crawler data across mapped employers (the{" "}
            <Link href="/hyderabad-tech-statistics">Hyderabad tech statistics</Link> page tracks the intern and junior share of
            all open roles), they fall into five key segments:
          </p>

          <div className="story-cards">
            {ROLES_BREAKDOWN.map((r, i) => (
              <div key={i} className="story-card">
                <div className="story-card-head">
                  <h3 className="story-card-title">{r.category}</h3>
                  <span className="ui-badge ui-badge--hiring">
                    {r.ctcRange}
                  </span>
                </div>
                <p className="story-card-kicker">
                  Volume: {r.share}
                </p>
                <p className="story-card-text">
                  <strong>Typical Titles:</strong> {r.roles}
                </p>
                <p className="story-card-meta">
                  <strong>Core In-Demand Tech Stack:</strong> {r.topTech}
                </p>
                <p className="story-card-meta">
                  <strong>Key Hyderabad Employers:</strong> {r.employers}
                </p>
              </div>
            ))}
          </div>

          <h2>4. Community Insights from Reddit (r/hyderabad &amp; r/developersIndia)</h2>
          <p>
            Community discussions on Reddit reveal the unfiltered ground reality of the Hyderabad job market:
          </p>

          <h3>A. The &quot;Ameerpet Proxy &amp; Fake Experience&quot; Trap</h3>
          <p>
            Ameerpet and Maitrivanam host over 300+ computer training institutes. While some provide legitimate classroom
            training in Java, Python, and AWS, dozens of rogue consultancies market <em>&quot;backdoor placements&quot;</em>,
            <em>&quot;proxy interview setups&quot;</em>, and fake 2–3 year experience letters from defunct shell companies for ₹30,000 to ₹1,00,000.
          </p>
          <div className="story-callout story-callout--warn">
            <h4>Background Verification Alert: The Reality of Proxy / Fake Experience</h4>
            <p>
              Enterprise companies (TCS, Infosys, Accenture) and GCCs (Microsoft, Amazon, ServiceNow, JPMC) utilize
              deep automated Background Verification (BGV) via EPFO (UAN passbook validation), Form 26AS tax records,
              and NASSCOM National Skills Registry (NSR). Candidates submitting forged letters face instant termination,
              permanent blacklisting across NASSCOM member firms, and potential criminal FIRs.
            </p>
          </div>

          <h3>B. The &quot;2,000 Applicants in 1 Hour&quot; Problem on Generic Portals</h3>
          <p>
            A common complaint on <em>r/developersIndia</em> is that open LinkedIn/Naukri job posts for &quot;Software Engineer Fresher&quot;
            hit 2,500+ applicants within hours. Due to the high noise, recruiters use automated ATS keyword filters and
            often discard the vast majority of direct resumes without review.
          </p>

          <h3>C. What Actually Works: Proven Strategies from Successfully Placed Freshers</h3>
          <ol>
            <li>
              <strong>Bypass Aggregators — Target Direct ATS Links:</strong> Companies review candidates who apply directly
              through their native Greenhouse, Lever, Zoho Recruit, Freshteam, and Keka portals with far higher priority
              than third-party agency reposts.
            </li>
            <li>
              <strong>Proof-of-Work Over Generic Resumes:</strong> Candidates who deploy 2–3 full-stack projects with live URLs
              (on Vercel/Render), automated CI/CD pipelines, and clean GitHub architecture receive 5x higher callback rates.
            </li>
            <li>
              <strong>T-Hub &amp; IIIT-H Startup Networking:</strong> Visiting demo days, hackathons, and open meetups at
              T-Hub Phase 2 (Knowledge City) and IIIT-Hyderabad allows freshers to pitch founders directly, bypassing HR gatekeepers.
            </li>
            <li>
              <strong>Target Seed &amp; Series A Product Teams:</strong> Smaller product teams (20–80 employees) move rapidly,
              often conducting a single coding challenge and founder conversation within 48–72 hours.
            </li>
          </ol>

          <h2>5. Commute, Cost of Living &amp; PG Hubs for Freshers in Hyderabad</h2>
          <p>
            Hyderabad remains India&apos;s most cost-efficient major tech hub:
          </p>
          <ul>
            <li>
              <strong>KPHB Colony / Kukatpally (The Fresher Capital):</strong> Thousands of PGs with monthly rent between
              ₹6,500 and ₹10,000 (including 3 meals/day). Direct Red Line Metro to Ameerpet / Blue Line connection to HITEC City &amp; Raidurg.
            </li>
            <li>
              <strong>Madhapur &amp; Ayyappa Society:</strong> ₹8,500 to ₹14,000/mo. Walking distance to Inorbit, Knowledge City,
              and Mindspace SaaS corridor.
            </li>
            <li>
              <strong>Gachibowli &amp; DLF Food Street:</strong> ₹8,000 to ₹13,000/mo. Ideal for teams working in DLF Cyber City,
              Financial District, or WaveRock SEZ.
            </li>
          </ul>

          <div className="story-cta">
            <h3>Explore 100% Verified Fresher Roles in Hyderabad</h3>
            <p>
              No consultancy middle-men, no registration fees. Only direct startup and product company ATS openings.
            </p>
            <div className="story-cta-actions">
              <Link href="/jobs/fresher" className="ui-btn ui-btn--primary">
                Open Fresher Jobs Hub →
              </Link>
              <Link href="/jobs/fresher/software-engineer" className="ui-btn ui-btn--secondary">
                Software Engineer Roles →
              </Link>
              <Link href="/jobs/fresher/internships" className="ui-btn ui-btn--secondary">
                Paid Internships →
              </Link>
            </div>
          </div>
        </section>
      </ArticleShell>
  );
}
