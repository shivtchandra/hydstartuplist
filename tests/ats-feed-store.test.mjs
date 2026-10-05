import test from "node:test";
import assert from "node:assert/strict";
import { splitIntoShards, getAtsFeedSnapshot, atsShardDocId, SHARD_MAX_BYTES, MAX_SHARDS } from "../lib/ats/feed-store.js";

const job = (i) => ({ id: `j${i}`, title: "Software Engineer", description: "x".repeat(600) });

test("splitIntoShards keeps every shard under the byte cap and preserves order", () => {
  const jobs = Array.from({ length: 3000 }, (_, i) => job(i));
  const shards = splitIntoShards(jobs);
  assert.ok(shards.length > 1);
  for (const s of shards) assert.ok(Buffer.byteLength(JSON.stringify({ jobs: s })) < SHARD_MAX_BYTES);
  assert.deepEqual(shards.flat().map((j) => j.id), jobs.map((j) => j.id));
});

test("splitIntoShards stops at MAX_SHARDS, dropping the tail", () => {
  const jobs = Array.from({ length: 20000 }, (_, i) => job(i));
  const shards = splitIntoShards(jobs);
  assert.equal(shards.length, MAX_SHARDS);
  assert.equal(shards.flat()[0].id, "j0");
});

function fakeDb(docs) {
  const ref = (id) => ({ id, get: async () => snap(id) });
  const snap = (id) => ({ exists: id in docs, data: () => docs[id] });
  return {
    collection: () => ({ doc: ref }),
    getAll: async (...refs) => refs.map((r) => snap(r.id)),
  };
}

test("getAtsFeedSnapshot concatenates shards and reads legacy single docs", async () => {
  const sharded = fakeDb({
    [atsShardDocId(0)]: { shardCount: 2, fetchedAt: "t", jobs: [{ id: "a" }] },
    [atsShardDocId(1)]: { jobs: [{ id: "b" }] },
    [atsShardDocId(2)]: { jobs: [{ id: "stale" }] },
  });
  const s = await getAtsFeedSnapshot(sharded);
  assert.deepEqual(s.data().jobs.map((j) => j.id), ["a", "b"]);
  assert.equal(s.data().fetchedAt, "t");

  const legacy = await getAtsFeedSnapshot(fakeDb({ [atsShardDocId(0)]: { jobs: [{ id: "only" }] } }));
  assert.deepEqual(legacy.data().jobs.map((j) => j.id), ["only"]);

  assert.equal((await getAtsFeedSnapshot(fakeDb({}))).exists, false);
});
