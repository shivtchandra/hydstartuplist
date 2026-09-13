/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hobby builds were SIGTERM'd at the default 60s while /sitemap and heavy
  // routes competed for workers; keep a higher ceiling as a safety net.
  staticPageGenerationTimeout: 180,
  // Ensure curated JSON is available to serverless routes (Radar, GCC overlay, etc.)
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/**/*"],
    "/*": ["./data/**/*"],
  },
  async redirects() {
    return [
      // Redirect Vercel preview URL to canonical domain
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'hydstartuplist.vercel.app' }],
        destination: 'https://startups.mapmyhyd.com/:path*',
        permanent: true,
      },
      // Dead /industries/* labels linked from Insights (fold into real hubs)
      { source: "/industries/aerospace", destination: "/industries/deeptech", permanent: true },
      { source: "/industries/hardware", destination: "/industries/deeptech", permanent: true },
      { source: "/industries/cleantech", destination: "/industries/deeptech", permanent: true },
      { source: "/industries/agritech", destination: "/industries/deeptech", permanent: true },
      { source: "/industries/gcc-pharma", destination: "/gccs", permanent: true },
      { source: "/industries/gcc-energy", destination: "/gccs", permanent: true },
      { source: "/industries/gcc-consulting", destination: "/gccs", permanent: true },
      { source: "/industries/gcc-consumer", destination: "/gccs", permanent: true },
      { source: "/industries/gcc-insurance", destination: "/gccs", permanent: true },
      { source: "/industries/gcc-finance", destination: "/gccs", permanent: true },
      { source: "/industries/gcc-tech", destination: "/gccs", permanent: true },
      // Space story used UUID paths; profiles live under name slugs
      { source: "/startups/69202061-81b2-4f20-8e6b-00d43ed8f311", destination: "/startups/skyroot-aerospace", permanent: true },
      { source: "/startups/9d051ab6-67fd-4c4c-a31e-ec952ca7d636", destination: "/startups/dhruva-space", permanent: true },
      { source: "/startups/7a67e031-fb8b-4ad0-a5b9-13a2119fcd0b", destination: "/startups/cosmoserve-space", permanent: true },
      { source: "/startups/e8d2551b-4093-4b99-b129-76518b8c34ff", destination: "/startups/jeh-aerospace", permanent: true },
      { source: "/startups/6b025a05-9db3-4730-9584-9f1b7a06179a", destination: "/startups/raghu-vamsi-aerospace-group", permanent: true },
      { source: "/startups/fb5fd7a4-e468-46f0-9c9c-bbd1c4e7750d", destination: "/startups/apollo-micro-systems", permanent: true },
      { source: "/startups/079b948f-ff87-41a7-89af-1295ede5820e", destination: "/startups/indrajaal", permanent: true },
      { source: "/startups/2a0e9715-21af-43d9-89ff-f2ff7ee4fee5", destination: "/startups/marut-drones", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
