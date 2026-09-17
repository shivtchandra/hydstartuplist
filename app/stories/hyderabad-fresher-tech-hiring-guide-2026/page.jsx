import Link from "next/link";
import { getSiteUrl } from "../../../lib/site-url.js";
import { articleJsonLd } from "../../../lib/jobs-seo.js";
import SiteNav from "../../components/SiteNav.jsx";

const SLUG = "hyderabad-fresher-tech-hiring-guide-2026";
const TITLE = "Hyderabad Fresher Tech Hiring & Placement Report (2026 Ground Reality)";
const DESCRIPTION =
  "Exhaustive 2026 analysis of Hyderabad's fresher tech ecosystem: actual college placement numbers (CBIT, VNR, Vasavi, JNTU, IIIT-H), the 80,000+ unplaced graduate funnel, salary tiers (₹3.6L to ₹28L+), real roles distribution, and insights from r/hyderabad and r/developersIndia.";

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
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav active="stories" />
      <article className="story-article">
        <header className="story-header">
          <p className="story-kicker">Comprehensive Ecosystem Report · Hyderabad 2026</p>
          <h1>{TITLE}</h1>
          <p className="story-dek">{DESCRIPTION}</p>
          <div className="story-byline">
            <span>By Mapping HYD Research</span>
            <span aria-hidden="true">·</span>
            <span>Updated September 2026</span>
            <span aria-hidden="true">·</span>
            <span>12 min read</span>
          </div>
        </header>

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

          <div style={{
            background: "var(--accent-soft, rgba(255, 87, 34, 0.08))",
            border: "1px solid var(--accent-primary, rgba(255, 87, 34, 0.25))",
            borderRadius: "10px",
            padding: "16px 20px",
            margin: "24px 0",
          }}>
            <h4 style={{ margin: "0 0 6px", color: "var(--accent-primary, #ff5722)" }}>⚡ Direct Verified Openings</h4>
            <p style={{ margin: 0, fontSize: "14px" }}>
              Skip the agency middle-men. Browse our real-time <Link href="/jobs/fresher" style={{ fontWeight: 700, color: "var(--accent-primary, #ff5722)" }}>Hyderabad Fresher Jobs Hub</Link> or
              jump into <Link href="/jobs/fresher/software-engineer" style={{ fontWeight: 700, color: "var(--accent-primary, #ff5722)" }}>SDE-1 &amp; Fresher Roles</Link> and <Link href="/jobs/fresher/internships" style={{ fontWeight: 700, color: "var(--accent-primary, #ff5722)" }}>Tech Internships</Link> crawled directly from company ATS portals.
            </p>
          </div>

          <h2>1. The Real Funnel: How Many Freshers Actually Get Placed in Hyderabad?</h2>
          <p>
            Following the post-pandemic hiring cooldown and the reduction of mass-service campus intakes (WITCH companies
            reducing baseline campus offers by 40–60% since 2023), campus placement statistics across Hyderabad have bifurcated sharply:
          </p>

          <div style={{ overflowX: "auto", margin: "20px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.04)", borderBottom: "2px solid var(--border-glass, #e2e8f0)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Funnel Stage</th>
                  <th style={{ padding: "10px" }}>Estimated Annual Volume</th>
                  <th style={{ padding: "10px" }}>Share / Status</th>
                </tr>
              </thead>
              <tbody>
                {FUNNEL_DATA.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-glass, #e2e8f0)" }}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{row.stage}</td>
                    <td style={{ padding: "10px", color: "#059669", fontWeight: 700 }}>{row.count}</td>
                    <td style={{ padding: "10px", color: "var(--text-muted)" }}>{row.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>2. College-by-College Placement Reality in Hyderabad (2024–2026 Data)</h2>
          <p>
            Examining official NIRF submissions and Training &amp; Placement (T&amp;P) disclosures for top Hyderabad institutions reveals
            the true picture of on-campus placement rates, median packages, and top recruiter types:
          </p>

          <div style={{ overflowX: "auto", margin: "20px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.04)", borderBottom: "2px solid var(--border-glass, #e2e8f0)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Institution</th>
                  <th style={{ padding: "10px" }}>Tier / Category</th>
                  <th style={{ padding: "10px" }}>Placed Rate</th>
                  <th style={{ padding: "10px" }}>Median CTC</th>
                  <th style={{ padding: "10px" }}>Highest Package</th>
                  <th style={{ padding: "10px" }}>Key Recruiters</th>
                </tr>
              </thead>
              <tbody>
                {COLLEGE_PLACEMENTS.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-glass, #e2e8f0)" }}>
                    <td style={{ padding: "10px", fontWeight: 700 }}>{c.college}</td>
                    <td style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)" }}>{c.tier}</td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{c.placementRate}</td>
                    <td style={{ padding: "10px", color: "#059669", fontWeight: 700 }}>{c.medianCTC}</td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{c.highestCTC}</td>
                    <td style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)" }}>{c.topRecruiters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>3. What Kinds of Roles Are Freshers Actually Getting?</h2>
          <p>
            Discussions across tech communities frequently ask: <em>&quot;What jobs are actually available for entry-level candidates in Hyderabad right now?&quot;</em>
            Based on direct crawler data across mapped employers, roles fall into five key segments:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", margin: "20px 0" }}>
            {ROLES_BREAKDOWN.map((r, i) => (
              <div key={i} style={{
                border: "1px solid var(--border-glass, rgba(0,0,0,0.08))",
                borderRadius: "10px",
                padding: "16px 18px",
                background: "var(--bg-card, rgba(255,255,255,0.6))",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                  <h3 style={{ margin: 0, fontSize: "15.5px" }}>{r.category}</h3>
                  <span style={{ fontSize: "12px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", padding: "2px 8px", borderRadius: "100px", fontWeight: 700 }}>
                    {r.ctcRange}
                  </span>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: "12px", color: "var(--accent-primary, #ff5722)", fontWeight: 600 }}>
                  Volume: {r.share}
                </p>
                <p style={{ margin: "0 0 6px", fontSize: "13px" }}>
                  <strong>Typical Titles:</strong> {r.roles}
                </p>
                <p style={{ margin: "0 0 6px", fontSize: "12px", color: "var(--text-muted)" }}>
                  <strong>Core In-Demand Tech Stack:</strong> {r.topTech}
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
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
          <div style={{
            background: "rgba(239, 68, 68, 0.06)",
            borderLeft: "4px solid #ef4444",
            padding: "14px 18px",
            margin: "18px 0",
            borderRadius: "0 8px 8px 0",
          }}>
            <h4 style={{ margin: "0 0 4px", color: "#b91c1c" }}>⚠️ The Reality of Proxy / Fake Experience in 2026:</h4>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5 }}>
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
          <ol style={{ paddingLeft: "20px", lineHeight: 1.6 }}>
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

          <div style={{
            marginTop: 36,
            padding: "24px",
            background: "var(--bg-glass, rgba(255, 255, 255, 0.7))",
            borderRadius: "12px",
            border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.08))",
            textAlign: "center",
          }}>
            <h3 style={{ margin: "0 0 8px" }}>Explore 100% Verified Fresher Roles in Hyderabad</h3>
            <p style={{ margin: "0 0 18px", fontSize: "14px", color: "var(--text-muted)" }}>
              No consultancy middle-men, no registration fees. Only direct startup and product company ATS openings.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/jobs/fresher" className="op-primary" style={{ textDecoration: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: 700 }}>
                Open Fresher Jobs Hub →
              </Link>
              <Link href="/jobs/fresher/software-engineer" style={{ textDecoration: "none", padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--border-glass)", background: "var(--bg-card)" }}>
                Software Engineer Roles →
              </Link>
              <Link href="/jobs/fresher/internships" style={{ textDecoration: "none", padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--border-glass)", background: "var(--bg-card)" }}>
                Paid Internships →
              </Link>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
