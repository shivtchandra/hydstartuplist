import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchBoardJobs, boardRegistryId } from '../lib/ats/index.js';
import { boardMeta } from '../lib/ats/providers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function main() {
  const allBoards = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ats-boards-priority-all.json'), 'utf8'));
  const existingBoards = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ats-boards.json'), 'utf8'));
  const startups = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/startups.json'), 'utf8'));
  const priorityCareers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/priority-careers.json'), 'utf8'));
  const radar = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/radar.json'), 'utf8'));
  const fresherSeeds = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fresher-employer-seeds.json'), 'utf8'));

  const existingBoardMap = new Map();
  for (const b of existingBoards) {
    const key = `${b.atsProvider}:${b.atsSlug}`.toLowerCase();
    existingBoardMap.set(key, b);
  }

  const startupNameMap = new Map();
  for (const s of startups) {
    startupNameMap.set(s.name.toLowerCase().trim(), s);
  }

  console.log(`Scanning ${allBoards.length} potential ATS boards...`);
  const activeHits = [];
  const concurrency = 8;

  for (let i = 0; i < allBoards.length; i += concurrency) {
    const chunk = allBoards.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (b) => {
      try {
        const r = await fetchBoardJobs(b.atsProvider, b.atsSlug, {
          companyName: b.name,
          geoFilter: true,
          withContent: false
        });
        if (r.ok && r.jobs && r.jobs.length > 0) {
          const key = `${b.atsProvider}:${b.atsSlug}`.toLowerCase();
          const alreadyInBoards = existingBoardMap.has(key);
          const matchedStartup = startupNameMap.get(b.name.toLowerCase().trim());
          activeHits.push({
            name: b.name,
            atsProvider: b.atsProvider,
            atsSlug: b.atsSlug,
            jobCount: r.jobs.length,
            totalRaw: r.totalRaw,
            alreadyInBoards,
            matchedStartupId: matchedStartup?.id || null,
            sampleJobs: r.jobs.slice(0, 3).map(j => ({ title: j.title, location: j.location, url: j.url }))
          });
          process.stdout.write(alreadyInBoards ? '.' : '+');
        } else {
          process.stdout.write('x');
        }
      } catch (err) {
        process.stdout.write('!');
      }
    }));
  }

  console.log('\n\n=== SCAN COMPLETE ===');
  console.log(`Total boards tested: ${allBoards.length}`);
  console.log(`Boards with active Hyd/TG jobs: ${activeHits.length}`);

  const newHits = activeHits.filter(h => !h.alreadyInBoards);
  console.log(`NEW boards with active Hyd/TG jobs not yet in ats-boards.json: ${newHits.length}\n`);

  for (const h of newHits) {
    console.log(`[NEW BOARD] ${h.name} (${h.atsProvider}/${h.atsSlug})`);
    console.log(`  Jobs: ${h.jobCount} (out of ${h.totalRaw} total)`);
    if (h.matchedStartupId) console.log(`  Matched Startup: ${h.matchedStartupId}`);
    console.log(`  Samples: ${h.sampleJobs.map(j => j.title).join(', ')}`);
  }

  fs.writeFileSync(
    path.join(__dirname, 'ats-scan-results.json'),
    JSON.stringify({ activeHits, newHits }, null, 2)
  );
}

main().catch(console.error);
