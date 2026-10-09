import { JOB_DETAIL_SHARDS, jobDetailShard } from '../../../../lib/opportunities.js';
import { opportunityDataset } from '../../../../lib/opportunity-store.js';

// Full job records (with descriptions), split into JOB_DETAIL_SHARDS files so
// opening one role downloads a small file, not every description.
export const dynamic = 'force-static';

export function generateStaticParams() {
  return Array.from({ length: JOB_DETAIL_SHARDS }, (_, i) => ({ shard: `${i}.json` }));
}

export async function GET(_req, { params }) {
  const shard = Number.parseInt(params.shard, 10);
  const data = await opportunityDataset();
  const jobs = {};
  for (const j of data.jobs) if (jobDetailShard(j.id) === shard) jobs[j.id] = j;
  return Response.json({ jobs });
}
