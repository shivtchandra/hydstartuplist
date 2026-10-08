import { config } from "dotenv";
import { JWT } from "google-auth-library";

config({ path: ".env.local" });

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const client = new JWT({
  email: sa.client_email,
  key: sa.private_key,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

async function run() {
  const token = (await client.getAccessToken()).token;
  const siteUrl = "https://startups.mapmyhyd.com/";

  const end = new Date();
  end.setDate(end.getDate() - 3);
  const start = new Date();
  start.setDate(start.getDate() - 31);
  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  // 1. Overall stats
  const totalsRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    }
  );
  const totalsData = await totalsRes.json();
  console.log("Overall Totals (Last 28 Days):", totalsData.rows?.[0] || {});

  // 2. Query level breakdown (top 250)
  const queryRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 250,
      }),
    }
  );
  const queryData = await queryRes.json();
  const rows = queryData.rows || [];

  console.log(`\nRetrieved ${rows.length} total distinct search queries.`);

  // Top by impressions
  const byImp = [...rows].sort((a, b) => b.impressions - a.impressions);
  console.log("\n--- Top 15 Highest Impression Queries (High Latent Demand) ---");
  console.table(
    byImp.slice(0, 15).map((r) => ({
      Query: r.keys[0],
      Impressions: r.impressions,
      Clicks: r.clicks,
      CTR: (r.ctr * 100).toFixed(1) + "%",
      Pos: r.position.toFixed(1),
    }))
  );

  // Striking distance: Position 4.0 to 15.0 with > 20 impressions
  const striking = rows.filter(
    (r) => r.position >= 4 && r.position <= 16 && r.impressions >= 20
  ).sort((a, b) => b.impressions - a.impressions);

  console.log("\n--- Striking Distance Opportunities (Rank 4-16, Imp >= 20) ---");
  console.table(
    striking.map((r) => ({
      Query: r.keys[0],
      Impressions: r.impressions,
      Clicks: r.clicks,
      CTR: (r.ctr * 100).toFixed(1) + "%",
      Pos: r.position.toFixed(1),
    }))
  );

  // 3. Pages breakdown
  const pagesRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 50,
      }),
    }
  );
  const pagesData = await pagesRes.json();
  const pageRows = pagesData.rows || [];

  console.log("\n--- Pages with High Impressions but Low CTR (< 2%) ---");
  const lowCtrPages = pageRows
    .filter((p) => p.impressions >= 100 && p.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions);

  console.table(
    lowCtrPages.map((p) => ({
      Page: p.keys[0].replace(siteUrl, "/"),
      Impressions: p.impressions,
      Clicks: p.clicks,
      CTR: (p.ctr * 100).toFixed(2) + "%",
      Pos: p.position.toFixed(1),
    }))
  );
}

run().catch(console.error);
