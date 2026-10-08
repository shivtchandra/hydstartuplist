import { config } from "dotenv";
import { JWT } from "google-auth-library";

config({ path: ".env.local" });

const saRaw = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
if (!saRaw) {
  console.error("No service account found in GOOGLE_INDEXING_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT");
  process.exit(1);
}

const sa = JSON.parse(saRaw);
console.log(`Using Service Account: ${sa.client_email} (Project: ${sa.project_id})`);

const client = new JWT({
  email: sa.client_email,
  key: sa.private_key,
  scopes: [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/webmasters"
  ],
});

async function main() {
  console.log("Authenticating...");
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  console.log("Access token acquired successfully.");

  // 1. List sites
  console.log("\n--- Listing Sites in Search Console ---");
  const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const sitesData = await sitesRes.json();
  console.log("Sites API response status:", sitesRes.status);
  console.log("Sites API response:", JSON.stringify(sitesData, null, 2));

  if (!sitesRes.ok || !sitesData.siteEntry || sitesData.siteEntry.length === 0) {
    console.log("\nNote: If siteEntry is empty or 403, make sure this service account email is added as a user/owner to your Search Console property.");
    return;
  }

  // 2. Query search analytics for verified sites
  for (const site of sitesData.siteEntry) {
    console.log(`\n==================================================`);
    console.log(`Property: ${site.siteUrl} (${site.permissionLevel})`);
    console.log(`==================================================`);

    // Date range: last 28 days (with 3-day reporting lag)
    const end = new Date();
    end.setDate(end.getDate() - 3);
    const start = new Date();
    start.setDate(start.getDate() - 31);
    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];
    console.log(`Date range: ${startDate} to ${endDate}\n`);

    // Top Queries
    const queriesRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 10,
        }),
      }
    );
    const queriesData = await queriesRes.json();

    console.log("--- Top 10 Search Queries ---");
    if (queriesData.rows?.length) {
      console.table(
        queriesData.rows.map((r) => ({
          Query: r.keys[0],
          Clicks: r.clicks,
          Impressions: r.impressions,
          "CTR %": (r.ctr * 100).toFixed(1) + "%",
          Position: r.position.toFixed(1),
        }))
      );
    } else {
      console.log("No query data found for this period.");
    }

    // Top Pages
    const pagesRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["page"],
          rowLimit: 10,
        }),
      }
    );
    const pagesData = await pagesRes.json();

    console.log("\n--- Top 10 Landing Pages ---");
    if (pagesData.rows?.length) {
      console.table(
        pagesData.rows.map((r) => ({
          Page: r.keys[0].replace(site.siteUrl, "/"),
          Clicks: r.clicks,
          Impressions: r.impressions,
          "CTR %": (r.ctr * 100).toFixed(1) + "%",
          Position: r.position.toFixed(1),
        }))
      );
    } else {
      console.log("No page data found for this period.");
    }

    // Sitemaps list
    const sitemapsRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.siteUrl)}/sitemaps`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const sitemapsData = await sitemapsRes.json();
    console.log("\n--- Submitted Sitemaps ---");
    if (sitemapsData.sitemap?.length) {
      console.table(
        sitemapsData.sitemap.map((s) => ({
          Path: s.path,
          LastDownloaded: s.lastDownloaded || "N/A",
          Status: s.isPending ? "Pending" : "Processed",
          Warnings: s.warnings || 0,
          Errors: s.errors || 0,
        }))
      );
    } else {
      console.log("No sitemaps found.");
    }
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
});
