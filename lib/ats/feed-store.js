/**
 * The ATS feed is stored as one or more Firestore docs in `job_board`:
 * `ats_latest` (shard 0, carries `shardCount`) plus `ats_latest_1..N`.
 * Firestore caps a doc at 1 MiB, and one doc stopped fitting once the board
 * list grew. All shards are written in one transaction, so readers always see
 * a consistent set. Docs written before sharding have no `shardCount` (= 1).
 */

export const ATS_FEED_DOC = "ats_latest";
// JSON UTF-8 understates Firestore's encoded size, so keep a fat margin under 1 MiB.
export const SHARD_MAX_BYTES = 720_000;
export const MAX_SHARDS = 6;

export function atsShardDocId(index) {
  return index === 0 ? ATS_FEED_DOC : `${ATS_FEED_DOC}_${index}`;
}

/**
 * Read every shard and return a snapshot-like `{ exists, data() }` with all
 * jobs concatenated, so callers written for the single doc keep working.
 */
export async function getAtsFeedSnapshot(db) {
  const col = db.collection("job_board");
  const head = await col.doc(ATS_FEED_DOC).get();
  if (!head.exists) return { exists: false, data: () => undefined };
  const meta = head.data() || {};
  const count = Math.min(Math.max(1, meta.shardCount || 1), MAX_SHARDS);
  let jobs = meta.jobs || [];
  if (count > 1) {
    const rest = await db.getAll(...Array.from({ length: count - 1 }, (_, i) => col.doc(atsShardDocId(i + 1))));
    for (const snap of rest) jobs = jobs.concat(snap.exists ? snap.data().jobs || [] : []);
  }
  const merged = { ...meta, jobs };
  return { exists: true, data: () => merged };
}

/** Greedily split `jobs` into shards whose JSON stays under SHARD_MAX_BYTES. */
export function splitIntoShards(jobs, overheadBytes = 512) {
  const shards = [[]];
  let size = overheadBytes;
  for (const job of jobs) {
    const bytes = Buffer.byteLength(JSON.stringify(job), "utf8") + 1;
    if (size + bytes > SHARD_MAX_BYTES && shards[shards.length - 1].length) {
      if (shards.length === MAX_SHARDS) break;
      shards.push([]);
      size = overheadBytes;
    }
    shards[shards.length - 1].push(job);
    size += bytes;
  }
  return shards;
}
