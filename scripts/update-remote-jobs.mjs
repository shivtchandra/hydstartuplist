#!/usr/bin/env node
/**
 * Harvest fresh remote roles from top modern developer tools, AI startups,
 * and remote-first product companies.
 *
 * Updates:
 *   - data/european-remote-jobs.json (curated global & European remote roles)
 *   - data/european-remote-companies.json (company directory metadata)
 *   - data/ats-boards.json (active ATS board registry with allowRemote: true)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchBoardJobs } from "../lib/ats/index.js";
import { inferRoleType } from "../lib/job-facets.js";
import { isInvalidJobListing, displayJobTitle } from "../lib/job-content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const EU_JOBS_FILE = path.join(ROOT, "data", "european-remote-jobs.json");
const EU_COMPS_FILE = path.join(ROOT, "data", "european-remote-companies.json");
const BOARDS_FILE = path.join(ROOT, "data", "ats-boards.json");

const REMOTE_COMPANIES = [
  { name: "Linear", provider: "ashby", slug: "linear", country: "Global Remote", hq: "San Francisco", sector: "Developer Tools", website: "https://linear.app", boardUrl: "https://jobs.ashbyhq.com/linear", maxRoles: 8 },
  { name: "Resend", provider: "ashby", slug: "resend", country: "Global Remote", hq: "San Francisco", sector: "Developer Tools & Email", website: "https://resend.com", boardUrl: "https://jobs.ashbyhq.com/resend", maxRoles: 8 },
  { name: "LiveKit", provider: "ashby", slug: "livekit", country: "Global Remote", hq: "San Francisco", sector: "AI & Real-Time Video", website: "https://livekit.io", boardUrl: "https://jobs.ashbyhq.com/livekit", maxRoles: 8 },
  { name: "Cursor", provider: "ashby", slug: "cursor", country: "Global Remote", hq: "San Francisco", sector: "AI & Developer Tools", website: "https://cursor.com", boardUrl: "https://jobs.ashbyhq.com/cursor", maxRoles: 8 },
  { name: "ElevenLabs", provider: "ashby", slug: "elevenlabs", country: "United Kingdom", hq: "London", sector: "Generative AI & Audio Models", website: "https://elevenlabs.io", boardUrl: "https://jobs.ashbyhq.com/elevenlabs", maxRoles: 8 },
  { name: "Supabase", provider: "ashby", slug: "supabase", country: "Global Remote", hq: "Singapore / Global", sector: "Open Source Backend & Database", website: "https://supabase.com", boardUrl: "https://jobs.ashbyhq.com/supabase", maxRoles: 8 },
  { name: "PostHog", provider: "ashby", slug: "posthog", country: "United Kingdom", hq: "London", sector: "Product OS & Analytics", website: "https://posthog.com", boardUrl: "https://posthog.com/careers", maxRoles: 8 },
  { name: "Railway", provider: "ashby", slug: "railway", country: "Global Remote", hq: "San Francisco", sector: "Cloud Platform", website: "https://railway.app", boardUrl: "https://jobs.ashbyhq.com/railway", maxRoles: 7 },
  { name: "SigNoz", provider: "ashby", slug: "signoz", country: "Global Remote", hq: "Bengaluru / Global", sector: "Open Source Observability", website: "https://signoz.io", boardUrl: "https://jobs.ashbyhq.com/signoz", maxRoles: 7 },
  { name: "LangChain", provider: "ashby", slug: "langchain", country: "Global Remote", hq: "San Francisco", sector: "LLM Orchestration Frameworks", website: "https://langchain.com", boardUrl: "https://jobs.ashbyhq.com/langchain", maxRoles: 8 },
  { name: "Replit", provider: "ashby", slug: "replit", country: "Global Remote", hq: "San Francisco", sector: "AI Software Creation", website: "https://replit.com", boardUrl: "https://jobs.ashbyhq.com/replit", maxRoles: 8 },
  { name: "Deepgram", provider: "ashby", slug: "deepgram", country: "Global Remote", hq: "Ann Arbor / Global", sector: "Speech AI Foundation Models", website: "https://deepgram.com", boardUrl: "https://jobs.ashbyhq.com/deepgram", maxRoles: 8 },
  { name: "Anyscale", provider: "ashby", slug: "anyscale", country: "Global Remote", hq: "San Francisco", sector: "Distributed Ray AI Infrastructure", website: "https://anyscale.com", boardUrl: "https://jobs.ashbyhq.com/anyscale", maxRoles: 8 },
  { name: "Vapi", provider: "ashby", slug: "vapi", country: "Global Remote", hq: "San Francisco", sector: "Voice AI Platform for Developers", website: "https://vapi.ai", boardUrl: "https://jobs.ashbyhq.com/vapi", maxRoles: 5 },
  { name: "Modal", provider: "ashby", slug: "modal", country: "Global Remote", hq: "New York", sector: "Serverless Cloud AI Compute", website: "https://modal.com", boardUrl: "https://jobs.ashbyhq.com/modal", maxRoles: 5 },
  { name: "Dust", provider: "ashby", slug: "dust", country: "France", hq: "Paris", sector: "Enterprise AI Agents", website: "https://dust.tt", boardUrl: "https://jobs.ashbyhq.com/dust", maxRoles: 5 },
  { name: "Lovable", provider: "ashby", slug: "lovable", country: "Sweden", hq: "Stockholm", sector: "AI Software Engineering", website: "https://lovable.dev", boardUrl: "https://jobs.ashbyhq.com/lovable", maxRoles: 7 },
  { name: "Braintrust", provider: "ashby", slug: "braintrust", country: "Global Remote", hq: "San Francisco", sector: "AI Evaluation & Observability", website: "https://braintrustdata.com", boardUrl: "https://jobs.ashbyhq.com/braintrust", maxRoles: 8 },
  { name: "Poolside", provider: "ashby", slug: "poolside", country: "France", hq: "Paris", sector: "Foundation AI for Code", website: "https://poolside.ai", boardUrl: "https://jobs.ashbyhq.com/poolside", maxRoles: 5 },
  { name: "Pinecone", provider: "ashby", slug: "pinecone", country: "Global Remote", hq: "New York", sector: "Vector Databases for AI", website: "https://pinecone.io", boardUrl: "https://jobs.ashbyhq.com/pinecone", maxRoles: 5 },
  { name: "Chainguard", provider: "greenhouse", slug: "chainguard", country: "Global Remote", hq: "Kirkland", sector: "Software Supply Chain Security", website: "https://chainguard.dev", boardUrl: "https://boards.greenhouse.io/chainguard", maxRoles: 8 },
  { name: "Netlify", provider: "greenhouse", slug: "netlify", country: "Global Remote", hq: "San Francisco", sector: "Web Development Cloud", website: "https://netlify.com", boardUrl: "https://boards.greenhouse.io/netlify", maxRoles: 6 },
  { name: "Fly.io", provider: "lever", slug: "fly", country: "Global Remote", hq: "Chicago", sector: "Global Application Cloud", website: "https://fly.io", boardUrl: "https://jobs.lever.co/fly", maxRoles: 5 },
  { name: "Cockroach Labs", provider: "greenhouse", slug: "cockroachlabs", country: "United States", hq: "New York", sector: "Distributed Cloud SQL", website: "https://cockroachlabs.com", boardUrl: "https://boards.greenhouse.io/cockroachlabs", maxRoles: 5 },
  { name: "ClickHouse", provider: "ashby", slug: "clickhouse", country: "Global Remote", hq: "San Francisco", sector: "Real-time Columnar Analytics", website: "https://clickhouse.com", boardUrl: "https://jobs.ashbyhq.com/clickhouse", maxRoles: 8 },
  { name: "Buffer", provider: "ashby", slug: "buffer", country: "Global Remote", hq: "Global Remote", sector: "Social Media Platform", website: "https://buffer.com", boardUrl: "https://jobs.ashbyhq.com/buffer", maxRoles: 5 },
  { name: "Mem0", provider: "ashby", slug: "mem0", country: "Global Remote", hq: "San Francisco", sector: "Memory Layer for AI", website: "https://mem0.ai", boardUrl: "https://jobs.ashbyhq.com/mem0", maxRoles: 5 },
  { name: "Axelera AI", provider: "ashby", slug: "axelera", country: "Netherlands", hq: "Eindhoven", sector: "Edge AI Hardware & SDK", website: "https://axelera.ai", boardUrl: "https://jobs.ashbyhq.com/axelera", maxRoles: 8 },
  { name: "Unstructured", provider: "ashby", slug: "unstructured", country: "United States", hq: "San Francisco", sector: "Data Ingestion for LLMs", website: "https://unstructured.io", boardUrl: "https://jobs.ashbyhq.com/unstructured", maxRoles: 6 },
  { name: "Prefect", provider: "ashby", slug: "prefect", country: "United States", hq: "Washington DC", sector: "Workflow Orchestration", website: "https://prefect.io", boardUrl: "https://jobs.ashbyhq.com/prefect", maxRoles: 6 },
];

async function run() {
  console.log(`Refreshing remote roles across ${REMOTE_COMPANIES.length} top tech startups...`);

  const existingJobs = fs.existsSync(EU_JOBS_FILE)
    ? JSON.parse(fs.readFileSync(EU_JOBS_FILE, "utf-8"))
    : [];
  const existingComps = fs.existsSync(EU_COMPS_FILE)
    ? JSON.parse(fs.readFileSync(EU_COMPS_FILE, "utf-8"))
    : [];
  const boards = fs.existsSync(BOARDS_FILE)
    ? JSON.parse(fs.readFileSync(BOARDS_FILE, "utf-8"))
    : [];

  const boardMap = new Map(boards.map(b => [b.id, b]));
  const compMap = new Map(existingComps.map(c => [c.name.toLowerCase(), c]));

  // Index existing jobs by company
  const jobsByCompany = new Map();
  for (const j of existingJobs) {
    const k = (j.company || "").toLowerCase();
    if (!jobsByCompany.has(k)) jobsByCompany.set(k, []);
    jobsByCompany.get(k).push(j);
  }

  let totalNewRoles = 0;

  for (const c of REMOTE_COMPANIES) {
    const boardId = `${c.provider}:${c.slug}`;
    if (!boardMap.has(boardId)) {
      boardMap.set(boardId, {
        id: boardId,
        name: c.name,
        atsProvider: c.provider,
        atsSlug: c.slug,
        boardUrl: c.boardUrl,
        website: c.website,
        startupId: null,
        employerType: "startup",
        active: true,
        allowRemote: true,
      });
      console.log(`  Added board to registry: ${boardId}`);
    } else {
      const b = boardMap.get(boardId);
      b.allowRemote = true;
      b.employerType = "startup";
      b.active = true;
    }

    if (!compMap.has(c.name.toLowerCase())) {
      compMap.set(c.name.toLowerCase(), {
        name: c.name,
        country: c.country,
        hq: c.hq,
        sector: c.sector,
        remoteScope: "100% Global Remote",
        atsProvider: c.provider,
        atsSlug: c.slug,
        boardUrl: c.boardUrl,
      });
    }

    try {
      const res = await fetchBoardJobs(c.provider, c.slug, { geoFilter: false, withContent: false });
      if (!res.ok || !res.jobs.length) {
        console.log(`  · ${c.name}: no jobs returned from API`);
        continue;
      }

      const remoteJobs = res.jobs.filter((j) => {
        if (isInvalidJobListing(j)) return false;
        const loc = String(j.location || "").toLowerCase();
        return /remote|anywhere|worldwide|distributed|home|apac|emea|global/i.test(loc) || j.workplaceType === "remote";
      });

      if (!remoteJobs.length) {
        console.log(`  · ${c.name}: 0 remote listings`);
        continue;
      }

      // Prioritize engineering, AI, product, data, design
      const prioritized = remoteJobs.sort((a, b) => {
        const roleA = inferRoleType(a.title) || "";
        const roleB = inferRoleType(b.title) || "";
        const scoreA = ["Engineering", "Product", "Data", "Design"].includes(roleA) ? 1 : 0;
        const scoreB = ["Engineering", "Product", "Data", "Design"].includes(roleB) ? 1 : 0;
        return scoreB - scoreA;
      });

      const selected = prioritized.slice(0, c.maxRoles || 8);
      const companyKey = c.name.toLowerCase();

      const normalizedRoles = selected.map((j) => {
        const cleanTitle = displayJobTitle(j.title);
        const role = inferRoleType(cleanTitle) || "Engineering";
        const id = `${c.provider}-${c.slug}-${String(j.id).replace(/[^a-z0-9_-]/gi, "").slice(0, 40)}`;
        return {
          id,
          title: cleanTitle,
          company: c.name,
          country: c.country,
          location: "Remote",
          work: "remote",
          url: j.url,
          atsProvider: c.provider,
          atsSlug: c.slug,
          role,
          status: "active",
          source: "ats",
        };
      });

      jobsByCompany.set(companyKey, normalizedRoles);
      totalNewRoles += normalizedRoles.length;
      console.log(`  ✓ ${c.name}: updated with ${normalizedRoles.length} remote roles`);
    } catch (err) {
      console.error(`  ✗ ${c.name}: ${err.message}`);
    }
  }

  // Flatten all jobs across all companies
  const finalJobs = [];
  for (const list of jobsByCompany.values()) {
    finalJobs.push(...list);
  }

  fs.writeFileSync(EU_JOBS_FILE, JSON.stringify(finalJobs, null, 2) + "\n");
  fs.writeFileSync(EU_COMPS_FILE, JSON.stringify([...compMap.values()], null, 2) + "\n");
  fs.writeFileSync(BOARDS_FILE, JSON.stringify([...boardMap.values()], null, 2) + "\n");

  console.log(`\nDone! Saved ${finalJobs.length} remote jobs across ${jobsByCompany.size} companies to ${EU_JOBS_FILE}`);
  console.log(`Saved ${compMap.size} companies to ${EU_COMPS_FILE}`);
  console.log(`Saved ${boardMap.size} boards to ${BOARDS_FILE}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
