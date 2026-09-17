import { getSiteUrl } from "./site-url.js";
import { inferRoleType } from "./job-facets.js";

export const FRESHER_CATEGORIES = [
  {
    slug: "internships",
    categoryName: "Internships",
    title: "Tech & Startup Internships in Hyderabad (2026)",
    metaTitle: "Tech & Startup Internships in Hyderabad – 2026 Openings | Mapping HYD",
    description:
      "Browse verified tech, AI, software, and product internships at Hyderabad startups. 100% direct company ATS listings with stipend details and 0% agency spam.",
    headline: "Tech & Startup Internships in Hyderabad",
    subheading:
      "Direct internship postings from mapped Hyderabad startups and product companies across HITEC City, Gachibowli, Knowledge City, and Madhapur.",
    benchmarks: {
      typicalStipend: "₹20,000 – ₹55,000 / month",
      duration: "3 to 6 months (PPO track)",
      topLocations: "Knowledge City, HITEC City, DLF Gachibowli",
      popularSkills: "React, Node.js, Python, GenAI / LLM APIs, SQL, DSA",
    },
    faq: [
      {
        question: "What is the average internship stipend in Hyderabad startups?",
        answer:
          "Tech startups in Hyderabad generally offer stipends between ₹20,000 and ₹55,000 per month for software engineering, AI, and product internships. High-growth product companies and GCCs can offer ₹50,000 to ₹1,00,000+ per month.",
      },
      {
        question: "Do Hyderabad startups offer Pre-Placement Offers (PPOs) after internships?",
        answer:
          "Yes, over 70% of product startups and GCCs in Hyderabad use 3 to 6 month internships as their primary evaluation pipeline to convert high-performing interns into full-time SDE-1 or Associate roles.",
      },
      {
        question: "How do I apply directly without going through consultancy middle-men?",
        answer:
          "Mapping HYD only tracks direct company ATS links (Greenhouse, Lever, Zoho, Freshteam, Keka, Rippling). Click through to apply directly on the company's verified hiring portal.",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return (
        job.level === "intern" ||
        /\bintern\b|\binterns\b|\binternship\b|\btrainee\b|\bapprentice\b|\bapprenticeship\b|\bsummer intern\b|\bwinter intern\b/.test(
          t
        )
      );
    },
  },
  {
    slug: "software-engineer",
    categoryName: "Software Engineer",
    title: "Software Engineer Fresher & SDE-1 Jobs in Hyderabad",
    metaTitle: "Software Engineer Fresher Jobs in Hyderabad (SDE-1 & GET) | Mapping HYD",
    description:
      "Entry-level software engineer, SDE-1, and Graduate Engineer Trainee (GET) jobs at Hyderabad startups. Direct ATS openings with 0% recruitment agency spam.",
    headline: "Software Engineer Fresher Jobs in Hyderabad",
    subheading:
      "Find genuine entry-level SDE-1, backend, full-stack, and graduate engineering roles at funded product startups and GCCs across Hyderabad.",
    benchmarks: {
      typicalStipend: "₹6.0 LPA – ₹16.0 LPA (Startups) | ₹12 – ₹24 LPA+ (GCCs)",
      duration: "Full-Time (0–2 years exp / 2025–2026 batch)",
      topLocations: "HITEC City, Madhapur, Financial District, Gachibowli",
      popularSkills: "Java / Spring Boot, Python, Golang, React, PostgreSQL, Docker",
    },
    faq: [
      {
        question: "What is the starting salary for an SDE fresher in Hyderabad startups?",
        answer:
          "Starting CTC for entry-level Software Engineers (SDE-1) in Hyderabad ranges from ₹6 LPA to ₹16 LPA at funded product startups (Darwinbox, Zenoti, Keka, HighRadius) and ₹12 LPA to ₹24 LPA+ at top GCCs and Tier-1 product giants.",
      },
      {
        question: "What interview rounds should freshers prepare for?",
        answer:
          "Most Hyderabad product companies conduct: 1) Online Coding Assessment (DSA, Problem Solving), 2) Technical Round 1 (Data Structures, Algorithms, Core CS: OS/DBMS), 3) Technical Round 2 (System Design basics, Project walkthrough, Live coding), and 4) Culture/Founders fit.",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      const role = inferRoleType(job.title);
      if (role !== "Engineering") return false;
      return (
        /\bsde\b|\bsoftware\b|\bdeveloper\b|\bengineer\b|\bbackend\b|\bfull.?stack\b|\bprogrammer\b|\bget\b|\bgraduate engineer\b/.test(
          t
        ) && !/\bfrontend\b|\bqa\b|\btest\b|\bdata\b/.test(t)
      );
    },
  },
  {
    slug: "data-analyst",
    categoryName: "Data & AI",
    title: "Data Analyst & AI Fresher Jobs in Hyderabad",
    metaTitle: "Data Analyst & AI Fresher Jobs in Hyderabad – 2026 Openings | Mapping HYD",
    description:
      "Entry-level data analyst, junior data scientist, and AI/ML intern openings at top Hyderabad startups and analytics centers. Verified direct company listings.",
    headline: "Data Analyst & AI Fresher Jobs in Hyderabad",
    subheading:
      "Explore junior data analytics, BI reporting, data engineering, and generative AI trainee openings at Hyderabad's tech and SaaS startups.",
    benchmarks: {
      typicalStipend: "₹5.5 LPA – ₹14.0 LPA",
      duration: "Full-Time / Paid Internship (0–2 years exp)",
      topLocations: "Knowledge City, Mindspace Madhapur, Financial District",
      popularSkills: "SQL, Python, Pandas, PowerBI / Tableau, Scikit-learn, LangChain",
    },
    faq: [
      {
        question: "What skills are required for a Data Analyst fresher in Hyderabad?",
        answer:
          "Core requirements typically include Advanced SQL (Joins, Window functions), Python/R for exploratory data analysis, and dashboarding with PowerBI or Tableau. Exposure to machine learning algorithms and business metrics is a huge plus.",
      },
      {
        question: "What is the average fresher Data Analyst salary in Hyderabad?",
        answer:
          "The average compensation for freshers in Data Analyst and Junior Analytics roles ranges between ₹5.5 LPA and ₹14 LPA depending on product versus service domain.",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      const role = inferRoleType(job.title);
      return (
        role === "Data" ||
        /\bdata\b|\banalyst\b|\banalytics\b|\bscientist\b|\bml\b|\bmachine learning\b|\bai\b|\bdeep learning\b|\bbi\b|\bpowerbi\b|\btableau\b/.test(
          t
        )
      );
    },
  },
  {
    slug: "frontend",
    categoryName: "Frontend & UI",
    title: "Frontend & React Developer Fresher Jobs in Hyderabad",
    metaTitle: "Frontend & React Developer Fresher Jobs in Hyderabad | Mapping HYD",
    description:
      "Entry-level frontend engineer, React.js developer, and UI developer jobs at Hyderabad startups. Direct ATS links with zero spam.",
    headline: "Frontend & React Developer Fresher Jobs in Hyderabad",
    subheading:
      "Kickstart your UI engineering career with active React, Next.js, TypeScript, and web development openings at fast-growing Hyderabad startups.",
    benchmarks: {
      typicalStipend: "₹5.5 LPA – ₹13.5 LPA",
      duration: "Full-Time / Graduate Hire (0–2 years exp)",
      topLocations: "Madhapur, HITEC City, Gachibowli, Kondapur",
      popularSkills: "JavaScript (ES6+), TypeScript, React, Next.js, CSS/Tailwind, Web Vitals",
    },
    faq: [
      {
        question: "What do startups look for in a fresher Frontend Developer portfolio?",
        answer:
          "Startups prioritize working live demo projects deployed on Vercel/Netlify with clean GitHub code: responsive design, state management, API integration, and modern frameworks (React/Next.js/Vue).",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return /\bfrontend\b|\bfront[\s-]*end\b|\breact\b|\bui\b|\bweb developer\b|\bvue\b|\bangular\b|\bjavascript developer\b/.test(
        t
      );
    },
  },
  {
    slug: "qa-testing",
    categoryName: "QA & SDET",
    title: "QA & Automation Testing Fresher Jobs in Hyderabad",
    metaTitle: "QA Tester & SDET-1 Fresher Jobs in Hyderabad – Entry Level | Mapping HYD",
    description:
      "Junior QA engineer, SDET-1, software test engineer, and automation testing fresher jobs at Hyderabad tech companies. 100% verified employer listings.",
    headline: "QA & Automation Testing Fresher Jobs in Hyderabad",
    subheading:
      "Verified entry-level software testing, SDET-1, manual testing, and automated test engineer jobs across Hyderabad's SaaS and IT companies.",
    benchmarks: {
      typicalStipend: "₹4.5 LPA – ₹11.0 LPA",
      duration: "Full-Time (0–2 years exp)",
      topLocations: "HITEC City, DLF Gachibowli, Begumpet, Uppal",
      popularSkills: "Selenium, Cypress, Playwright, Java / Python, Postman API Testing, JIRA",
    },
    faq: [
      {
        question: "What is the difference between Manual Testing and SDET fresher roles?",
        answer:
          "Manual QA roles focus on test case design, exploratory testing, and bug tracking. SDET (Software Development Engineer in Test) roles require programming proficiency (Java/Python/TypeScript) to write automated end-to-end and API test frameworks.",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return /\bqa\b|\btest\b|\btester\b|\btesting\b|\bsdet\b|\bquality\b|\bautomation engineer\b/.test(
        t
      );
    },
  },
  {
    slug: "non-tech",
    categoryName: "Non-Tech & GTM",
    title: "Non-Tech & Business Fresher Jobs in Hyderabad Startups",
    metaTitle: "Non-Tech & Business Fresher Jobs in Hyderabad Startups | Mapping HYD",
    description:
      "Entry-level business development, marketing, sales trainee, customer success, and operations jobs at Hyderabad startups.",
    headline: "Non-Tech & Business Fresher Jobs in Hyderabad",
    subheading:
      "Explore non-coding entry-level opportunities: BDA, Inside Sales, Growth Marketing, Customer Support, and Operations at Hyderabad startups.",
    benchmarks: {
      typicalStipend: "₹4.0 LPA – ₹9.5 LPA (+ Performance Incentives)",
      duration: "Full-Time / Trainee (0–2 years exp)",
      topLocations: "Madhapur, Jubilee Hills, Banjara Hills, Gachibowli",
      popularSkills: "B2B Communication, CRM (HubSpot/Salesforce), Lead Gen, Content, Customer Success",
    },
    faq: [
      {
        question: "What are the most popular non-tech fresher roles at Hyderabad startups?",
        answer:
          "High-volume non-tech roles include Business Development Associate (BDA), Sales Development Representative (SDR), Customer Success Associate, Content & Social Media Specialist, and Talent Acquisition / HR Trainee.",
      },
    ],
    matcher: (job) => {
      const role = inferRoleType(job.title);
      return ["Sales", "Marketing", "People/HR", "Operations", "Finance"].includes(role);
    },
  },
];

export function fresherCategoryBySlug(slug) {
  return FRESHER_CATEGORIES.find((c) => c.slug === slug) || null;
}

export function filterFresherJobsByCategory(jobs, slug) {
  const cat = fresherCategoryBySlug(slug);
  if (!cat) return jobs;
  return jobs.filter(cat.matcher);
}
