const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://hydmap.in");

const STATIC_ROUTES = [
  { path: "",         priority: 1.0, changeFrequency: "hourly"  },
  { path: "/feed",    priority: 0.9, changeFrequency: "hourly"  },
  { path: "/jobs",    priority: 0.9, changeFrequency: "hourly"  },
  { path: "/news",    priority: 0.8, changeFrequency: "daily"   },
  { path: "/gccs",    priority: 0.7, changeFrequency: "weekly"  },
  { path: "/insights",priority: 0.7, changeFrequency: "weekly"  },
  { path: "/submit",  priority: 0.5, changeFrequency: "monthly" },
];

export default function sitemap() {
  return STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
