import { jobSummary, searchText } from '../../../lib/opportunities.js';
import { opportunityDataset } from '../../../lib/opportunity-store.js';

// The jobs board filters, searches and pages in the browser
// (lib/opportunities-client.js) from this file, built with the static site.
export const dynamic = 'force-static';

export async function GET() {
  const data = await opportunityDataset();
  const jobs = data.jobs.map((j) => ({
    ...jobSummary(j),
    searchText: searchText(`${j.title} ${j.company} ${String(j.description || '').slice(0, 2000)} ${(j.skills || []).join(' ')}`),
  }));
  return Response.json({ version: data.version, stale: data.stale, builtAt: new Date().toISOString(), jobs });
}
