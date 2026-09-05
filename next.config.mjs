/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hobby builds were SIGTERM'd at the default 60s while /sitemap and heavy
  // routes competed for workers; keep a higher ceiling as a safety net.
  staticPageGenerationTimeout: 180,
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
