import { getSiteUrl } from "./site-url.js";
import { inferRoleType } from "./job-facets.js";

export const FRESHER_CATEGORIES = [
  {
    slug: "internships",
    categoryName: "Internships",
    title: "Tech & Startup Internships in Hyderabad (2026)",
    metaTitle: "Tech & Startup Internships in Hyderabad – 2026 Openings | Mapping HYD",
    description:
      "Browse current tech, AI, software, and product internships at mapped Hyderabad employers, with links to each source listing and employer application page when available.",
    headline: "Tech & Startup Internships in Hyderabad",
    subheading:
      "Direct internship postings from mapped Hyderabad startups and product companies across HITEC City, Gachibowli, Knowledge City, and Madhapur.",
    benchmarks: {
      typicalStipend: "Employer-disclosed listings only",
      duration: "3 to 6 months (PPO track)",
      topLocations: "Knowledge City, HITEC City, DLF Gachibowli",
      popularSkills: "React, Node.js, Python, GenAI / LLM APIs, SQL, DSA",
    },
    faq: [
      {
        question: "What is the average internship stipend in Hyderabad startups?",
        answer:
          "Mapping HYD does not estimate internship pay. Compensation is shown only when the employer discloses it in the source listing.",
      },
      {
        question: "Do Hyderabad startups offer Pre-Placement Offers (PPOs) after internships?",
        answer:
          "Some employers describe conversion or pre-placement opportunities in their internship postings. Check the individual source listing because duration and conversion policies vary by company.",
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
      "Entry-level software engineer, SDE-1, and Graduate Engineer Trainee jobs at mapped Hyderabad employers, with source and application links.",
    headline: "Software Engineer Fresher Jobs in Hyderabad",
    subheading:
      "Find genuine entry-level SDE-1, backend, full-stack, and graduate engineering roles at funded product startups and GCCs across Hyderabad.",
    benchmarks: {
      typicalStipend: "Employer-disclosed listings only",
      duration: "Full-Time (0–2 years exp / 2025–2026 batch)",
      topLocations: "HITEC City, Madhapur, Financial District, Gachibowli",
      popularSkills: "Java / Spring Boot, Python, Golang, React, PostgreSQL, Docker",
    },
    faq: [
      {
        question: "What is the starting salary for an SDE fresher in Hyderabad startups?",
        answer:
          "Mapping HYD shows compensation only when it is disclosed by the employer in the source job listing; undisclosed roles are not assigned an estimated salary.",
      },
      {
        question: "What interview rounds should freshers prepare for?",
        answer:
          "Interview processes vary by employer. Use the requirements in the official posting and the employer's careers guidance as the source of truth for assessments and interview stages.",
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
      "Entry-level data analyst, junior data scientist, and AI/ML intern openings at mapped Hyderabad startups and analytics employers.",
    headline: "Data Analyst & AI Fresher Jobs in Hyderabad",
    subheading:
      "Explore junior data analytics, BI reporting, data engineering, and generative AI trainee openings at Hyderabad's tech and SaaS startups.",
    benchmarks: {
      typicalStipend: "Employer-disclosed listings only",
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
          "Mapping HYD does not publish an estimated average. Pay is displayed only for roles where the employer includes compensation in the source listing.",
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
      "Entry-level frontend engineer, React.js developer, and UI developer jobs at mapped Hyderabad employers with source application links.",
    headline: "Frontend & React Developer Fresher Jobs in Hyderabad",
    subheading:
      "Kickstart your UI engineering career with active React, Next.js, TypeScript, and web development openings at fast-growing Hyderabad startups.",
    benchmarks: {
      typicalStipend: "Employer-disclosed listings only",
      duration: "Full-Time / Graduate Hire (0–2 years exp)",
      topLocations: "Madhapur, HITEC City, Gachibowli, Kondapur",
      popularSkills: "JavaScript (ES6+), TypeScript, React, Next.js, CSS/Tailwind, Web Vitals",
    },
    faq: [
      {
        question: "What do startups look for in a fresher Frontend Developer portfolio?",
        answer:
          "Portfolio expectations vary by employer. Match each application to the technologies, work samples, and experience requested in the official job description.",
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
      "Junior QA engineer, SDET-1, software test engineer, and automation testing fresher jobs at mapped Hyderabad tech employers.",
    headline: "QA & Automation Testing Fresher Jobs in Hyderabad",
    subheading:
      "Verified entry-level software testing, SDET-1, manual testing, and automated test engineer jobs across Hyderabad's SaaS and IT companies.",
    benchmarks: {
      typicalStipend: "Employer-disclosed listings only",
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
      typicalStipend: "Employer-disclosed listings only",
      duration: "Full-Time / Trainee (0–2 years exp)",
      topLocations: "Madhapur, Jubilee Hills, Banjara Hills, Gachibowli",
      popularSkills: "B2B Communication, CRM (HubSpot/Salesforce), Lead Gen, Content, Customer Success",
    },
    faq: [
      {
        question: "What are the most popular non-tech fresher roles at Hyderabad startups?",
        answer:
          "Common entry-level titles include Business Development Associate, Sales Development Representative, Customer Success Associate, Content Specialist, and HR Trainee; the live list above shows what is currently available.",
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
