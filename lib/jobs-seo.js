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
    title: "Startup Jobs in Gachibowli, Hyderabad",
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
    title: "Startup Jobs in HITEC City, Hyderabad",
    description:
      "Careers at startups and tech companies in HITEC City — India's largest IT hub outside Bengaluru.",
    body:
      "HITEC City is Hyderabad's primary IT campus cluster and a magnet for SaaS, fintech, and enterprise product teams. Thousands of tech workers commute here daily, and startup hiring stays competitive across engineering and GTM. Use this list for current openings from mapped HITEC City companies.",
  },
  {
    slug: "financial-district",
    area: "Financial District",
    title: "Startup Jobs in Financial District, Hyderabad",
    description:
      "Jobs in Hyderabad's Financial District — fast-growing startups and GCCs along the ORR western stretch.",
    body:
      "The Financial District along the Outer Ring Road mixes GCCs with growth-stage startups. Roles skew mid-to-senior in engineering, risk, and operations, with newer campuses still filling out. Track live startup openings tied to this corridor below.",
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
];

export function sectorLanding(slug) {
  return JOB_SECTOR_LANDINGS.find((s) => s.slug === slug) || null;
}

export function areaLanding(slug) {
  return JOB_AREA_LANDINGS.find((a) => a.slug === slug) || null;
}


/** noindex thin listings so crawl budget stays on pages that can rank. */
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
  "Jubilee Hills": {
    landmarks: "Road No. 36, Film Nagar, and central Hyderabad cafes",
    transit: "central Hyderabad road links (less Metro-dependent)",
  },
};

export function localContextForArea(area) {
  if (!area) return null;
  const key = Object.keys(AREA_LOCAL_CONTEXT).find((k) =>
    String(area).toLowerCase().includes(k.toLowerCase())
  );
  return key ? { area: key, ...AREA_LOCAL_CONTEXT[key] } : null;
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

