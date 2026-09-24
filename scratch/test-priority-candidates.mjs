import { scrapePriorityEmployer } from '../lib/priority-careers.js';

const candidates = [
  { id: "dhruvaspace", name: "Dhruva Space", url: "https://www.dhruvaspace.com/careers" },
  { id: "jehaerospace", name: "JEH Aerospace", url: "https://www.jehaerospace.com/careers" },
  { id: "recykal", name: "Recykal", url: "https://www.recykal.com/careers" },
  { id: "pureev", name: "Pure EV", url: "https://www.pureev.in/careers" },
  { id: "bhanzu", name: "Bhanzu", url: "https://bhanzu.com/careers" },
  { id: "aganitha", name: "Aganitha AI", url: "https://www.aganitha.ai/careers" },
  { id: "turbohire", name: "TurboHire", url: "https://turbohire.co/careers" },
  { id: "hitwicket", name: "Hitwicket", url: "https://hitwicket.com/careers" },
  { id: "bluecopa", name: "Bluecopa", url: "https://bluecopa.com/careers" },
  { id: "adonmo", name: "AdOnMo", url: "https://adonmo.com/careers" },
  { id: "perceptyne", name: "Perceptyne", url: "https://www.perceptyne.com/career" },
  { id: "deccanai", name: "Deccan AI", url: "https://deccan.ai/careers" },
  { id: "altiushub", name: "AltiusHub", url: "https://altiushub.com/careers" },
  { id: "gtmbuddy", name: "GTM Buddy", url: "https://gtmbuddy.ai/careers#openroles" },
  { id: "marutdrones", name: "Marut Drones", url: "https://marutdrones.com/careers" },
  { id: "landeed", name: "Landeed", url: "https://www.landeed.com/careers" },
  { id: "makershive", name: "Makers Hive", url: "https://www.makershive.com/careers" }
];

async function run() {
  console.log(`Testing scraping for ${candidates.length} candidate startup career pages...`);
  const results = [];
  for (const c of candidates) {
    try {
      const r = await scrapePriorityEmployer(c);
      const rolesCount = r?.roles?.length || 0;
      console.log(`${c.name} (${c.url}) -> found ${rolesCount} roles (${r?.source || 'none'})`);
      if (rolesCount > 0) {
        results.push({
          id: c.id,
          name: c.name,
          url: c.url,
          source: r.source,
          rolesCount,
          roles: r.roles.map(x => x.title)
        });
      }
    } catch (e) {
      console.log(`${c.name} -> error:`, e.message);
    }
  }

  console.log('\n=== SCRAPED CANDIDATE RESULTS ===');
  console.log(`Live career feeds found: ${results.length}`);
  console.log(JSON.stringify(results, null, 2));
}

run();
