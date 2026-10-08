import { getSiteUrl } from "./site-url.js";

export const REMOTE_CATEGORIES = [
  {
    slug: "software-engineer",
    categoryName: "Software Engineer",
    title: "Remote Software Engineer & SDE Jobs in India (2026)",
    metaTitle: "Remote Software Engineer Jobs in India (SDE, Backend, Fullstack 2026)",
    description:
      "Explore verified remote software engineer and developer openings at top product startups and tech companies in India. 100% direct company ATS links with zero placement spam.",
    headline: "Remote Software Engineer Jobs in India",
    subheading:
      "Direct work-from-home engineering openings from verified technology product companies and startups across India.",
    benchmarks: {
      typicalSalary: "₹10 LPA – ₹35 LPA+ (India Startups) | $40k – $120k+ (Global Remote)",
      experienceBands: "Junior (1-3y), Mid-Level (3-6y), Senior / Staff (6y+)",
      popularTech: "Python, Go, React, Node.js, AWS, Kubernetes, Distributed Systems",
    },
    faq: [
      {
        question: "How do I find legitimate remote software engineering jobs in India?",
        answer:
          "Hyderabad Startups Map indexes verified career portals (Greenhouse, Lever, Ashby, Workday) from audited startups and tech companies, ensuring 100% direct listings without consultancy fees.",
      },
      {
        question: "Do remote software engineering roles hire developers based in Hyderabad?",
        answer:
          "Yes. All remote listings on this page accept applicants located anywhere in India (including Hyderabad, Bengaluru, Pune, Delhi NCR, and tier-2/3 cities).",
      },
      {
        question: "What is the typical salary for a remote developer in India?",
        answer:
          "Indian startups offer ₹10 to ₹35 LPA depending on experience, while global remote companies (US/EU funded) typically offer ₹25 LPA to ₹75 LPA+ ($35k - $100k+).",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return (
        (/\b(engineer|developer|sde|architect|programmer|coding)\b/i.test(t) || job.role === "Engineering") &&
        !/\b(intern|internship|trainee)\b/i.test(t)
      );
    },
  },
  {
    slug: "frontend",
    categoryName: "Frontend & UI",
    title: "Remote Frontend Developer & UI Engineer Jobs in India",
    metaTitle: "Remote Frontend Developer Jobs in India (React, Next.js, TypeScript)",
    description:
      "Verified remote frontend developer and UI engineering roles at tech startups. Apply directly through official ATS portals with zero middleman spam.",
    headline: "Remote Frontend & Web Developer Jobs",
    subheading:
      "Work-from-home frontend developer opportunities building web apps, design systems, and modern UIs.",
    benchmarks: {
      typicalSalary: "₹9 LPA – ₹28 LPA+",
      experienceBands: "1 to 6+ years",
      popularTech: "React, Next.js, TypeScript, Tailwind CSS, Web Performance, State Management",
    },
    faq: [
      {
        question: "What skills are in demand for remote frontend roles?",
        answer:
          "Modern frontend teams look for deep experience in TypeScript, React 19 / Next.js App Router, state management, client-side caching, and responsive design systems.",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return /\b(frontend|front-end|ui|react|vue|angular|web developer|client-side)\b/i.test(t);
    },
  },
  {
    slug: "backend",
    categoryName: "Backend & Systems",
    title: "Remote Backend Engineer & Distributed Systems Jobs in India",
    metaTitle: "Remote Backend Engineer Jobs in India (Node.js, Go, Python, Java)",
    description:
      "Live remote backend and systems engineering jobs at product startups. Scale high-traffic services, distributed databases, and APIs from anywhere in India.",
    headline: "Remote Backend & Systems Engineering Jobs",
    subheading:
      "Work-from-home backend openings designing APIs, microservices, and database architectures.",
    benchmarks: {
      typicalSalary: "₹12 LPA – ₹38 LPA+",
      experienceBands: "2 to 8+ years",
      popularTech: "Go, Python, Java / Spring Boot, PostgreSQL, Kafka, Redis, Docker",
    },
    faq: [
      {
        question: "Can I work remotely as a backend engineer for global startups?",
        answer:
          "Yes. Many US and European startups hire remote engineers in India through Employer of Record (EOR) services like Deel or Remote.com with international compensation packages.",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return /\b(backend|back-end|node|golang|python|java|distributed|api|platform engineer|systems engineer)\b/i.test(t);
    },
  },
  {
    slug: "data-ai",
    categoryName: "Data, AI & ML",
    title: "Remote AI, Machine Learning & Data Jobs in India",
    metaTitle: "Remote AI & Data Science Jobs in India (GenAI, ML, Analytics 2026)",
    description:
      "Explore remote artificial intelligence, machine learning, and data science jobs at top startups and GCCs. Direct company applications with verified job descriptions.",
    headline: "Remote AI & Data Science Jobs in India",
    subheading:
      "Work-from-home careers in GenAI, large language models, data engineering, and predictive analytics.",
    benchmarks: {
      typicalSalary: "₹12 LPA – ₹42 LPA+",
      experienceBands: "1 to 7+ years",
      popularTech: "Python, PyTorch, LangChain / LlamaIndex, SQL, Snowflake, Pandas, Databricks",
    },
    faq: [
      {
        question: "Are remote AI and ML jobs available for candidates in India?",
        answer:
          "Yes, applied AI and GenAI tooling companies are actively hiring remote ML engineers, prompt engineers, and AI application developers across India.",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return (
        job.role === "Data & AI" ||
        /\b(data|ai|ml|machine learning|analytics|bi|deep learning|nlp|computer vision|llm|genai)\b/i.test(t)
      );
    },
  },
  {
    slug: "product-design",
    categoryName: "Product & Design",
    title: "Remote Product Manager & UI/UX Designer Jobs in India",
    metaTitle: "Remote Product Management & UI/UX Design Jobs in India (2026)",
    description:
      "Verified remote product management and UX/UI design openings at fast-growing product companies and tech startups across India.",
    headline: "Remote Product & Design Opportunities",
    subheading:
      "Work-from-home product manager, product designer, and UI/UX specialist careers.",
    benchmarks: {
      typicalSalary: "₹14 LPA – ₹40 LPA+",
      experienceBands: "2 to 8+ years",
      popularTech: "Figma, User Research, Wireframing, Product Analytics, SQL, PRDs",
    },
    faq: [
      {
        question: "How effective is remote product management?",
        answer:
          "High-growth startups rely on asynchronous communication (Slack, Loom, Notion, Linear) to run distributed product squads across India and global time zones.",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return (
        job.role === "Product" ||
        job.role === "Design" ||
        /\b(product manager|product management|designer|ux|ui\/ux|design lead|graphic designer)\b/i.test(t)
      );
    },
  },
  {
    slug: "internships",
    categoryName: "Internships & Fresher",
    title: "Remote Tech Internships & Entry-Level Jobs in India (2026)",
    metaTitle: "Remote Internships & Fresher Jobs in India – 2026 Openings",
    description:
      "Work-from-home internships and entry-level software jobs for college students and recent graduates at tech startups. Direct applications, 0% placement fees.",
    headline: "Remote Tech Internships for College Students & Freshers",
    subheading:
      "Get hands-on product startup experience from your home with verified stipend-paying internships.",
    benchmarks: {
      typicalStipend: "₹15,000 – ₹45,000 / month",
      duration: "3 to 6 months (Remote with PPO potential)",
      popularSkills: "JavaScript, Python, React, Git, Problem Solving, Good Communication",
    },
    faq: [
      {
        question: "Can college students work remotely during their semester?",
        answer:
          "Yes, many startups offer flexible remote internships (part-time or full-time) that accommodate academic schedules, with performance-based Pre-Placement Offers (PPOs).",
      },
    ],
    matcher: (job) => {
      const t = String(job.title || "").toLowerCase();
      return (
        job.level === "intern" ||
        job.level === "junior" ||
        /\b(intern|internship|trainee|fresher|graduate|apprentice)\b/i.test(t)
      );
    },
  },
];

export function remoteCategoryBySlug(slug) {
  return REMOTE_CATEGORIES.find((c) => c.slug === slug) || null;
}

export function filterRemoteJobsByCategory(jobs, slug) {
  const cat = remoteCategoryBySlug(slug);
  if (!cat) return jobs;
  return jobs.filter(cat.matcher);
}
