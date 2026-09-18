import { getSiteUrl } from "./site-url.js";
import {
  formatSalaryInr,
  jobDescriptionForPage,
  jobValidThroughDate,
} from "./job-content.js";
import { slugify } from "./slug.js";

/** URL-safe base64 (avoids Node-only `base64url` encoding — breaks in browser Buffer polyfills). */
function toBase64Url(str) {
  const bytes = new TextEncoder().encode(String(str));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(bytes).toString("base64")
      : btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(urlId) {
  const b64 = String(urlId).replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64 + pad, "base64").toString("utf8");
  }
  const binary = atob(b64 + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** URL-safe encoding for arbitrary job ids (Adzuna numeric, careers URLs, etc.) */
export function jobUrlId(id) {
  return toBase64Url(id);
}

export function jobIdFromUrl(urlId) {
  try {
    return fromBase64Url(urlId);
  } catch {
    return null;
  }
}

export const JOB_SECTOR_LANDINGS = [
  {
    slug: "saas",
    sector: "SaaS",
    title: "SaaS Jobs in Hyderabad",
    description:
      "Open roles at Hyderabad SaaS startups — from early-stage to Series D — across Madhapur, HITEC City, and Gachibowli.",
    body:
      "Hyderabad's SaaS corridor is one of India's densest product-company clusters. Darwinbox, Zenoti, Keka, and hundreds of smaller builders hire engineers, PMs, CSMs, and GTM talent from offices in Madhapur and HITEC City. Use this page to scan live openings from mapped SaaS startups, then open any role for the permanent listing Google and candidates can share.",
  },
  {
    slug: "ai",
    sector: "AI",
    title: "AI & Machine Learning Jobs in Hyderabad",
    description:
      "AI, GenAI, machine learning, and data engineering jobs at top Hyderabad startups and AI labs.",
    body:
      "Hyderabad is rapidly emerging as a premier hub for applied AI, LLM tooling, computer vision, and machine learning infrastructure. Startups across HITEC City, Knowledge City, and Gachibowli are actively recruiting ML engineers, data scientists, AI product managers, and full-stack builders.",
  },
  {
    slug: "fintech",
    sector: "Fintech",
    title: "Fintech Jobs in Hyderabad",
    description:
      "Browse fintech startup careers in Hyderabad: payments, lending, neobanking, and B2B financial infrastructure.",
    body:
      "Fintech hiring in Hyderabad spans payments rails, lending platforms, insurance tech, and B2B finance tools. Most teams sit along the western IT belt and compete with Bengaluru for senior product and risk talent. Filter here for live fintech startup roles with permanent URLs and JobPosting markup.",
  },
  {
    slug: "healthtech",
    sector: "Healthtech",
    title: "Healthtech Jobs in Hyderabad",
    description:
      "Healthcare and medtech startup openings in Hyderabad — engineering, product, clinical ops, and growth roles.",
    body:
      "Healthtech and medtech startups in Hyderabad hire across clinical ops, healthcare engineering, and growth. The city pairs hospital density with a strong SaaS talent pool, so many roles blend product and domain expertise. Browse current openings from mapped healthtech companies below.",
  },
  {
    slug: "deeptech",
    sector: "Deeptech",
    title: "Deeptech Jobs in Hyderabad",
    description:
      "Deep technology startup roles in Hyderabad — aerospace, robotics, semiconductors, and frontier R&D.",
    body:
      "Deeptech in Hyderabad covers aerospace, robotics, semiconductors, and applied R&D. Roles often need specialised engineering backgrounds and cluster near research-friendly campuses and western corridor offices. This list tracks openings from mapped deeptech startups only.",
  },
  {
    slug: "edtech",
    sector: "Edtech",
    title: "Edtech Jobs in Hyderabad",
    description:
      "Education technology careers at Hyderabad startups building learning platforms, upskilling, and B2B edtech.",
    body:
      "Edtech startups in Hyderabad build K-12, upskilling, and B2B learning products. Hiring mixes content, engineering, and sales roles across central and western neighbourhoods. See live edtech openings from companies on the Hyderabad Startup Map.",
  },
];

export const JOB_AREA_LANDINGS = [
  {
    slug: "gachibowli",
    area: "Gachibowli",
    title: "Startup & IT Jobs in Gachibowli, Hyderabad",
    description:
      "Tech and startup jobs in Gachibowli — Nanakramguda, Financial District adjacents, and the western corridor ecosystem.",
    body:
      "Gachibowli anchors Hyderabad's western tech corridor — offices spill into Nanakramguda and the Financial District with strong Metro and ORR access. Product startups and GCCs both hire here for engineering, product, and operations. This page lists live roles from mapped companies based in or near Gachibowli.",
  },
  {
    slug: "madhapur",
    area: "Madhapur",
    title: "Startup Jobs in Madhapur, Hyderabad",
    description:
      "Open roles in Madhapur and the HITEC City belt — SaaS, fintech, and product companies hiring now.",
    body:
      "Madhapur sits next to HITEC City and hosts a dense mix of SaaS and product companies. Commutes are Metro-friendly and the area stays one of Hyderabad's highest-velocity hiring neighbourhoods for startup roles. Browse openings tagged to Madhapur employers on the map.",
  },
  {
    slug: "hitec-city",
    area: "HITEC City",
    title: "Startup & IT Jobs in HITEC City, Hyderabad",
    description:
      "Careers at startups and tech companies in HITEC City — India's largest IT hub outside Bengaluru.",
    body:
      "HITEC City is Hyderabad's primary IT campus cluster and a magnet for SaaS, fintech, and enterprise product teams. Thousands of tech workers commute here daily, and startup hiring stays competitive across engineering and GTM. Use this list for current openings from mapped HITEC City companies.",
  },
  {
    slug: "financial-district",
    area: "Financial District",
    title: "Jobs in Financial District, Hyderabad",
    description:
      "Jobs in Hyderabad's Financial District — fast-growing startups and GCCs along the ORR western stretch.",
    body:
      "The Financial District along the Outer Ring Road mixes GCCs with growth-stage startups. Roles skew mid-to-senior in engineering, risk, and operations, with newer campuses still filling out. Track live startup openings tied to this corridor below.",
  },
  {
    slug: "banjara-hills",
    area: "Banjara Hills",
    title: "Startup Jobs in Banjara Hills, Hyderabad",
    description:
      "Tech, healthcare, and startup roles in Banjara Hills and central Hyderabad.",
    body:
      "Banjara Hills hosts digital agencies, healthtech teams, and venture-backed offices in central Hyderabad. Explore active career openings in this area.",
  },
  {
    slug: "jubilee-hills",
    area: "Jubilee Hills",
    title: "Startup Jobs in Jubilee Hills, Hyderabad",
    description:
      "Startup and tech openings in Jubilee Hills and nearby central Hyderabad neighborhoods.",
    body:
      "Jubilee Hills and neighbouring central Hyderabad pockets host smaller product teams and creative-tech studios away from the western mega-campuses. Hiring volume is lower but roles are often generalist. See what's open from mapped companies in this area.",
  },
  {
    slug: "kondapur",
    area: "Kondapur",
    title: "IT & Tech Jobs in Kondapur, Hyderabad",
    description:
      "Software developer and startup openings in Kondapur, Hyderabad — minutes from Cyber Towers and Gachibowli.",
    body:
      "Kondapur bridges HITEC City and Gachibowli with high-growth SaaS, AI, and IT service companies actively hiring engineering and operations talent.",
  },
  {
    slug: "secunderabad",
    area: "Secunderabad",
    title: "IT & Tech Jobs in Secunderabad",
    description:
      "Software engineering and IT jobs in Secunderabad, Marredpally, and North-East Hyderabad.",
    body:
      "Secunderabad is home to engineering firms, enterprise tech vendors, and growing technology setups offering tech careers in the twin cities.",
  },
  {
    slug: "kukatpally",
    area: "Kukatpally",
    title: "IT & Software Jobs in Kukatpally, Hyderabad",
    description:
      "Tech and developer jobs in Kukatpally and KPHB with quick Metro access to HITEC City.",
    body:
      "Kukatpally houses tech ventures, consulting firms, and software houses with active openings for developers, testers, and operations roles.",
  },
  {
    slug: "begumpet",
    area: "Begumpet",
    title: "IT & Corporate Tech Jobs in Begumpet, Hyderabad",
    description:
      "Software and enterprise technology roles in Begumpet, Somajiguda, and Ameerpet.",
    body:
      "Begumpet and Somajiguda host corporate tech teams and IT service offices with engineering, financial tech, and client-facing careers.",
  },
  {
    slug: "uppal",
    area: "Uppal",
    title: "Tech & IT Jobs in Uppal, Hyderabad",
    description:
      "IT campus and technology jobs in Uppal, Pocharam, and East Hyderabad.",
    body:
      "Uppal anchors East Hyderabad's IT corridor with tech centers and software teams recruiting talent across tech and operations.",
  },
  {
    slug: "knowledge-city",
    area: "Knowledge City & Raidurgam",
    title: "Jobs in Knowledge City & Raidurgam, Hyderabad",
    description:
      "Product engineering, AI, and GCC jobs in Salarpuria Knowledge City and Raidurgam.",
    body:
      "Knowledge City and Raidurgam host global tech giants, T-Hub startups, and high-paying engineering and AI product teams.",
  },
  {
    slug: "nanakramguda",
    area: "Nanakramguda",
    title: "IT & Developer Jobs in Nanakramguda, Hyderabad",
    description:
      "Tech careers in Nanakramguda, Waverock, and the Financial District gateway.",
    body:
      "Nanakramguda is packed with tech campuses and enterprise product teams hiring software engineers, data specialists, and cloud architects.",
  },
];

export function sectorLanding(slug) {
  return JOB_SECTOR_LANDINGS.find((s) => s.slug === slug) || null;
}

export function areaLanding(slug) {
  return JOB_AREA_LANDINGS.find((a) => a.slug === slug) || null;
}


/** Local landmark blurbs for job/area landing copy. */
export const AREA_LOCAL_CONTEXT = {
  "HITEC City": {
    landmarks: "Cyber Towers, Inorbit Mall, and Durgam Cheruvu",
    transit: "HITEC City Metro (Blue Line)",
  },
  Madhapur: {
    landmarks: "Image Gardens, Ayyappa Society, and the HITEC City belt",
    transit: "Madhapur / HITEC City Metro access",
  },
  Gachibowli: {
    landmarks: "DLF Cyber City, ORR junction, and the Financial District approach",
    transit: "Gachibowli Metro / MMTS corridors nearby",
  },
  "Financial District": {
    landmarks: "Wave Rock, Phoenix Tower, and ORR western stretch",
    transit: "ORR-connected campuses with shuttle-heavy commuting",
  },
  "Banjara Hills": {
    landmarks: "Road No. 1, Road No. 12, and City Center Mall",
    transit: "Road links via Punjagutta & Banjara Hills",
  },
  "Jubilee Hills": {
    landmarks: "Road No. 36, Film Nagar, and central Hyderabad cafes",
    transit: "central Hyderabad road links (less Metro-dependent)",
  },
  Kondapur: {
    landmarks: "Botanical Garden Road, Kothaguda Junction, and Raghavendra Colony",
    transit: "Close to HITEC City Blue Line & MMTS",
  },
  Secunderabad: {
    landmarks: "JBS, Marredpally, Clock Tower, and Tarnaka",
    transit: "JBS Parade Ground Metro (Green & Blue Line Interchange) & Secunderabad Railway",
  },
  Kukatpally: {
    landmarks: "KPHB Colony, Forum Sujana Mall, and JNTU",
    transit: "KPHB Colony & JNTU Metro (Red Line)",
  },
  Begumpet: {
    landmarks: "Begumpet Airport, Rasoolpura, and Somajiguda Circle",
    transit: "Begumpet & Prakash Nagar Metro (Blue Line) & MMTS",
  },
  Uppal: {
    landmarks: "Uppal Stadium, Genpact SEZ, and Pocharam Infosys Campus",
    transit: "Uppal & Stadium Metro (Blue Line)",
  },
  "Knowledge City & Raidurgam": {
    landmarks: "Salarpuria Sattva Knowledge City, T-Hub 2.0, and Inorbit Mall",
    transit: "Raidurg Metro (Blue Line Terminal)",
  },
  Nanakramguda: {
    landmarks: "Wave Rock SEZ, US Consulate, and ORR Exit 1",
    transit: "ORR Outer Ring Road & Financial District shuttle routes",
  },
};

export function localContextForArea(area) {
  if (!area) return null;
  const key = Object.keys(AREA_LOCAL_CONTEXT).find((k) =>
    String(area).toLowerCase().includes(k.toLowerCase())
  );
  return key ? { area: key, ...AREA_LOCAL_CONTEXT[key] } : null;
}

/** Index only fresh openings; expired/stale jobs stay crawlable via follow. */
export function jobShouldIndex(job, { maxAgeDays = 30 } = {}) {
  if (!job || job.status === "closed") return false;
  const now = Date.now();
  if (job.validThrough) {
    const vt = Date.parse(job.validThrough);
    if (Number.isFinite(vt) && vt < now) return false;
  }
  const posted = Date.parse(job.postedAt || job.sourcePostedAt || job.fetchedAt || "");
  if (Number.isFinite(posted)) {
    const ageDays = (now - posted) / 86_400_000;
    if (ageDays > maxAgeDays) return false;
  }
  return true;
}

export function thinListingRobots(count, { min = 3 } = {}) {
  if (count >= min) return { index: true, follow: true };
  return { index: false, follow: true, googleBot: { index: false, follow: true } };
}

export function companyJobsPath(companyNameOrSlug) {
  const slug = companyNameOrSlug.includes(" ")
    ? slugify(companyNameOrSlug)
    : companyNameOrSlug;
  return `/jobs/company/${slug}`;
}

export function breadcrumbJsonLd(items) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.href ? `${site}${item.href}` : undefined,
    })),
  };
}

export function jobPostingJsonLd(job, opts = {}) {
  const site = getSiteUrl();
  const pageUrl = opts.pageUrl || `${site}/jobs/${jobUrlId(job.id)}`;
  const posted = job.postedAt ? new Date(job.postedAt) : new Date();
  const validThrough = jobValidThroughDate(job);
  const description = opts.description || jobDescriptionForPage(job);
  // Careers/ATS links go straight to the employer's apply flow; Adzuna redirects do not.
  const directApply = opts.directApply ?? (job.source === "careers" || job.source === "ats");

  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${pageUrl}#job`,
    title: job.title,
    description,
    datePosted: posted.toISOString().slice(0, 10),
    validThrough: validThrough.toISOString().slice(0, 10),
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      sameAs: opts.companyUrl || undefined,
      ...(opts.logoUrl ? { logo: opts.logoUrl } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: opts.streetAddress || undefined,
        addressLocality: opts.addressLocality || job.location || "Hyderabad",
        addressRegion: "Telangana",
        addressCountry: "IN",
      },
      ...(Number.isFinite(opts.lat) && Number.isFinite(opts.lng)
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: opts.lat,
              longitude: opts.lng,
            },
          }
        : {}),
    },
    url: pageUrl,
    directApply: !!directApply,
    identifier: {
      "@type": "PropertyValue",
      name: "Hyderabad Startup Map",
      value: job.id,
    },
  };

  const min = job.salary?.min != null ? Number(job.salary.min) : null;
  const max = job.salary?.max != null ? Number(job.salary.max) : null;
  if (Number.isFinite(min) || Number.isFinite(max)) {
    const value = {
      "@type": "QuantitativeValue",
      unitText: "YEAR",
    };
    if (Number.isFinite(min)) value.minValue = min;
    if (Number.isFinite(max)) value.maxValue = max;
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "INR",
      value,
    };
  }

  return data;
}

/** Human-readable salary for job detail UI (re-export). */
export { formatSalaryInr };

export function itemListJsonLd(jobs, listName = "Hyderabad startup jobs") {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: jobs.length,
    itemListElement: jobs.slice(0, 50).map((job, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${job.title} at ${job.company}`,
      url: `${site}/jobs/${jobUrlId(job.id)}`,
    })),
  };
}

export const JOB_ROLE_LANDINGS = [
  {
    slug: "software-engineer",
    role: "Software Engineer",
    title: "Software Engineer Jobs in Hyderabad",
    description:
      "Software engineering roles at Hyderabad startups — backend, platform, and generalist SDE openings across the western corridor.",
    keywords: ["software engineer", "software developer", "sde", "engineer ii", "staff engineer"],
  },
  {
    slug: "product-manager",
    role: "Product Manager",
    title: "Product Manager Jobs in Hyderabad",
    description:
      "Product management careers at Hyderabad startups — PM, APM, and product lead roles at SaaS, fintech, and enterprise companies.",
    keywords: ["product manager", "product management", "associate product manager", "product lead", "product owner"],
  },
  {
    slug: "data-scientist",
    role: "Data Scientist",
    title: "Data Scientist Jobs in Hyderabad",
    description:
      "Data science and analytics roles at Hyderabad startups — ML, AI, and data engineering adjacent openings.",
    keywords: ["data scientist", "data science", "machine learning engineer", "ml engineer", "data analyst"],
  },
  {
    slug: "designer",
    role: "Designer",
    title: "Designer Jobs in Hyderabad",
    description:
      "Design roles at Hyderabad startups — product design, UX/UI, and visual design openings.",
    keywords: ["product designer", "ux designer", "ui designer", "designer", "ux/ui"],
  },
  {
    slug: "sales",
    role: "Sales",
    title: "Sales Jobs in Hyderabad Startups",
    description:
      "Sales and business development roles at Hyderabad startups — AE, SDR, and enterprise sales openings.",
    keywords: ["sales", "business development", "account executive", "sdr", "bdr"],
  },
  {
    slug: "marketing",
    role: "Marketing",
    title: "Marketing Jobs in Hyderabad Startups",
    description:
      "Marketing roles at Hyderabad startups — growth, content, brand, and demand-gen openings.",
    keywords: ["marketing", "growth marketing", "content marketing", "digital marketing", "brand manager"],
  },
  {
    slug: "devops",
    role: "DevOps",
    title: "DevOps Jobs in Hyderabad",
    description:
      "DevOps and platform engineering roles at Hyderabad startups — SRE, cloud, and infrastructure openings.",
    keywords: ["devops", "site reliability", "sre", "platform engineer", "cloud engineer"],
  },
  {
    slug: "backend-engineer",
    role: "Backend Engineer",
    title: "Backend Engineer Jobs in Hyderabad",
    description:
      "Backend engineering roles at Hyderabad startups — APIs, distributed systems, and server-side development.",
    keywords: ["backend engineer", "backend developer", "server engineer", "java developer", "node.js developer"],
  },
  {
    slug: "frontend-engineer",
    role: "Frontend Engineer",
    title: "Frontend Engineer Jobs in Hyderabad",
    description:
      "Frontend engineering roles at Hyderabad startups — React, web, and UI engineering openings.",
    keywords: ["frontend engineer", "frontend developer", "react developer", "web developer", "ui engineer"],
  },
  {
    slug: "full-stack-engineer",
    role: "Full Stack Engineer",
    title: "Full Stack Engineer Jobs in Hyderabad",
    description:
      "Full stack engineering roles at Hyderabad startups — end-to-end product engineering across web and API layers.",
    keywords: ["full stack", "full-stack", "fullstack", "full stack engineer", "full stack developer"],
  },
  {
    slug: "nutritionist",
    role: "Nutritionist & Dietitian",
    title: "Dietitian & Nutritionist Jobs in Hyderabad",
    description:
      "Clinical dietitian, nutritionist, and health coach openings in Hyderabad across top multi-specialty hospitals, healthtech startups, and wellness clinics.",
    keywords: [
      "dietitian",
      "dietician",
      "nutritionist",
      "clinical nutritionist",
      "health coach",
      "metabolic coach",
      "sports nutritionist",
      "lifestyle consultant",
      "diet counselor",
    ],
  },
  {
    slug: "dietitian",
    role: "Dietitian",
    title: "Dietitian Jobs in Hyderabad",
    description:
      "Verified dietitian careers in Hyderabad: hospital clinical nutrition, metabolic health coaching, and maternal dietetics.",
    keywords: ["dietitian", "dietician", "clinical dietitian", "therapeutic dietitian"],
  },
];

export function roleLanding(slug) {
  return JOB_ROLE_LANDINGS.find((r) => r.slug === slug) || null;
}

/** Dedicated landing for "fresher jobs in Hyderabad" (high India search volume). */
export const FRESHER_JOBS_LANDING = {
  slug: "fresher",
  title: "Fresher Jobs in Hyderabad",
  description:
    "Fresher jobs in Hyderabad at mapped startups — entry-level, intern, and early-career openings across SaaS, fintech, and product companies. Free to browse, no signup.",
  body:
    "Looking for fresher jobs in Hyderabad? This page lists entry-level and early-career roles at companies on Mapping HYD — internships, graduate hires, and junior openings pulled from live ATS and job boards. Filter further on the main jobs map by area (Gachibowli, Madhapur, HITEC City) when you are ready to commute.",
  experienceLevels: ["intern", "junior"],
};

export function fresherJobsLanding() {
  return FRESHER_JOBS_LANDING;
}

export function articleJsonLd({ title, description, url, datePublished, dateModified }) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Organization",
      name: "Hyderabad Startup Map",
      url: site,
    },
    publisher: {
      "@type": "Organization",
      name: "Hyderabad Startup Map",
      url: site,
    },
  };
}

