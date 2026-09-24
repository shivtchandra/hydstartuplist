import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchBoardJobs } from '../lib/ats/index.js';
import { ATS_PROVIDERS } from '../lib/ats/providers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const startups = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/startups.json'), 'utf8'));
const existingBoards = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ats-boards.json'), 'utf8'));
const existingBoardIds = new Set(existingBoards.map(b => `${b.atsProvider}:${b.atsSlug}`.toLowerCase()));

// Candidates helper
function slugCandidates(entry) {
  const slugs = new Set();
  const nameSlug = entry.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (nameSlug.length >= 3) slugs.add(nameSlug);

  const nameSlugHyphen = entry.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (nameSlugHyphen.length >= 3) slugs.add(nameSlugHyphen);

  if (entry.website) {
    try {
      const host = new URL(entry.website).hostname.replace(/^www\./, '');
      const parts = host.split('.');
      const label = parts[0]?.toLowerCase();
      if (label && label.length >= 3 && !['app', 'get', 'the', 'use', 'try', 'in'].includes(label)) {
        slugs.add(label);
        if (label.includes('-')) slugs.add(label.replace(/-/g, ''));
      }
    } catch {}
  }
  if (entry.careers) {
    try {
      const u = new URL(entry.careers);
      for (const provider of Object.keys(ATS_PROVIDERS)) {
        const m = entry.careers.match(new RegExp(`${provider}[^/]*[/.]([a-z0-9-_]+)`, 'i'));
        if (m && m[1]) slugs.add(m[1].toLowerCase());
      }
    } catch {}
  }
  return [...slugs];
}

async function probeAllStartups() {
  console.log(`Probing ATS boards for ${startups.length} startups...`);
  const hits = [];
  const providersToTest = ['greenhouse', 'lever', 'ashby', 'recruitee', 'workable', 'freshteam', 'smartrecruiters'];

  const concurrency = 15;
  for (let i = 0; i < startups.length; i += concurrency) {
    const chunk = startups.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (st) => {
      const slugs = slugCandidates(st);
      for (const provider of providersToTest) {
        for (const slug of slugs) {
          const boardKey = `${provider}:${slug}`.toLowerCase();
          if (existingBoardIds.has(boardKey)) continue;

          try {
            const r = await fetchBoardJobs(provider, slug, {
              companyName: st.name,
              geoFilter: true,
              withContent: false
            });
            if (r.ok && r.jobs && r.jobs.length > 0) {
              hits.push({
                startupId: st.id,
                startupName: st.name,
                sector: st.sector,
                area: st.area,
                provider,
                slug,
                jobCount: r.jobs.length,
                totalRaw: r.totalRaw,
                sampleJobs: r.jobs.slice(0, 3).map(j => j.title)
              });
              console.log(`[DISCOVERED] ${st.name} -> ${provider}:${slug} (${r.jobs.length} Hyd jobs)`);
              break; // found for this provider
            }
          } catch (e) {}
        }
      }
    }));
    if (i % 100 === 0 && i > 0) {
      console.log(`Checked ${i}/${startups.length} startups... found ${hits.length} hits so far.`);
    }
  }

  console.log(`\n=== PROBE COMPLETE ===`);
  console.log(`Total new active ATS boards discovered from startups: ${hits.length}`);
  fs.writeFileSync(
    path.join(__dirname, 'startup-ats-hits.json'),
    JSON.stringify(hits, null, 2)
  );
}

probeAllStartups().catch(console.error);
