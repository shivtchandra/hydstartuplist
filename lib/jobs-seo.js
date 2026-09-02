import { getSiteUrl } from "./site-url.js";
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
  },
  {
    slug: "fintech",
    sector: "Fintech",
    title: "Fintech Jobs in Hyderabad",
    description:
      "Browse fintech startup careers in Hyderabad: payments, lending, neobanking, and B2B financial infrastructure.",
  },
  {
    slug: "healthtech",
    sector: "Healthtech",
    title: "Healthtech Jobs in Hyderabad",
    description:
      "Healthcare and medtech startup openings in Hyderabad — engineering, product, clinical ops, and growth roles.",
  },
  {
    slug: "deeptech",
    sector: "Deeptech",
    title: "Deeptech Jobs in Hyderabad",
    description:
      "Deep technology startup roles in Hyderabad — aerospace, robotics, semiconductors, and frontier R&D.",
  },
  {
    slug: "edtech",
    sector: "Edtech",
    title: "Edtech Jobs in Hyderabad",
    description:
      "Education technology careers at Hyderabad startups building learning platforms, upskilling, and B2B edtech.",
  },
];

export const JOB_AREA_LANDINGS = [
  {
    slug: "gachibowli",
    area: "Gachibowli",
    title: "Startup Jobs in Gachibowli, Hyderabad",
    description:
      "Tech and startup jobs in Gachibowli — Nanakramguda, Financial District adjacents, and the western corridor ecosystem.",
  },
  {
    slug: "madhapur",
    area: "Madhapur",
    title: "Startup Jobs in Madhapur, Hyderabad",
    description:
      "Open roles in Madhapur and the HITEC City belt — SaaS, fintech, and product companies hiring now.",
  },
  {
    slug: "hitec-city",
    area: "HITEC City",
    title: "Startup Jobs in HITEC City, Hyderabad",
    description:
      "Careers at startups and tech companies in HITEC City — India's largest IT hub outside Bengaluru.",
  },
  {
    slug: "financial-district",
    area: "Financial District",
    title: "Startup Jobs in Financial District, Hyderabad",
    description:
      "Jobs in Hyderabad's Financial District — fast-growing startups and GCCs along the ORR western stretch.",
  },
  {
    slug: "jubilee-hills",
    area: "Jubilee Hills",
    title: "Startup Jobs in Jubilee Hills, Hyderabad",
    description:
      "Startup and tech openings in Jubilee Hills and nearby central Hyderabad neighborhoods.",
  },
];

export function sectorLanding(slug) {
  return JOB_SECTOR_LANDINGS.find((s) => s.slug === slug) || null;
}

export function areaLanding(slug) {
  return JOB_AREA_LANDINGS.find((a) => a.slug === slug) || null;
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
  const validThrough = new Date(posted);
  validThrough.setDate(validThrough.getDate() + 30);

  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${pageUrl}#job`,
    title: job.title,
    description: opts.description || `${job.title} at ${job.company} in ${job.location || "Hyderabad"}.`,
    datePosted: posted.toISOString().slice(0, 10),
    validThrough: validThrough.toISOString().slice(0, 10),
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      sameAs: opts.companyUrl || undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location || "Hyderabad",
        addressRegion: "Telangana",
        addressCountry: "IN",
      },
    },
    url: pageUrl,
    directApply: false,
    identifier: {
      "@type": "PropertyValue",
      name: "Hyderabad Startup Map",
      value: job.id,
    },
  };

  if (job.salary?.min && job.salary?.max) {
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "INR",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary.min,
        maxValue: job.salary.max,
        unitText: "YEAR",
      },
    };
  }

  return data;
}

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

