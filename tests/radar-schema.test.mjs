import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { radarMeta, getRadarEntries } from "../lib/radar.js";

const ROOT = process.cwd();

test("radar.json has valid structure, core entries, and no broken startup references", () => {
  const radar = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "radar.json"), "utf8"));
  assert.ok(Array.isArray(radar.entries), "radar.entries must be an array");
  assert.ok(radar.entries.length >= 70, `Expected at least 70 entries, got ${radar.entries.length}`);

  const startups = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "startups.json"), "utf8"));
  const startupIds = new Set(startups.map((s) => s.id));

  for (const entry of radar.entries) {
    assert.ok(entry.name || entry.startupId, "Entry must have a name or startupId");
    if (entry.startupId) {
      assert.ok(
        startupIds.has(entry.startupId),
        `startupId ${entry.startupId} for ${entry.name} must exist in startups.json`
      );
    }
    if (entry.geo === "hyd" && entry.exclusiveTier) {
      assert.ok(
        ["core", "watch"].includes(entry.exclusiveTier),
        `exclusiveTier for ${entry.name} must be core or watch`
      );
    }
  }

  const meta = radarMeta("hyd");
  assert.ok(meta.exclusiveList.coreCount >= 15, "Expected at least 15 core entries");
  assert.ok(meta.exclusiveList.watchCount >= 30, "Expected at least 30 watch entries");
});

test("getRadarEntries loads exclusive Hyderabad entries without throwing", async () => {
  const entries = await getRadarEntries("hyd", { exclusiveOnly: true, includeJobs: false, includeDepth: true });
  assert.ok(entries.length >= 50, `Expected at least 50 exclusive entries, got ${entries.length}`);

  const tensrai = entries.find((e) => e.name === "Tensrai");
  assert.ok(tensrai, "Tensrai must be present in radar entries");
  assert.equal(tensrai.exclusiveTier, "core");
  assert.ok(tensrai.depth?.founders?.length >= 1, "Tensrai must have founder details");

  const turocrates = entries.find((e) => e.name === "Turocrates AI");
  assert.ok(turocrates, "Turocrates AI must be present in radar entries");
  assert.equal(turocrates.exclusiveTier, "core");

  const hylenr = entries.find((e) => e.name === "HYLENR");
  assert.ok(hylenr, "HYLENR must be present in radar entries");
  assert.equal(hylenr.exclusiveTier, "core");
});
