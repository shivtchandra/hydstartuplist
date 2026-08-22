import fs from "fs";
import path from "path";

const APPROVED_FILE = path.join(process.cwd(), "data", "startups.json");
const PENDING_FILE = path.join(process.cwd(), "data", "pending.json");

function readJson(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function getApproved() {
  return readJson(APPROVED_FILE);
}

export function getStartupById(id) {
  return getApproved().find((s) => s.id === id) || null;
}

export function getPending() {
  return readJson(PENDING_FILE);
}

export function addPending(entry) {
  const pending = readJson(PENDING_FILE);
  pending.push(entry);
  writeJson(PENDING_FILE, pending);
  return entry;
}

export function filterStartups({ sector, fundingStage, area, q }) {
  let list = getApproved();
  if (sector) list = list.filter((s) => s.sector === sector);
  if (fundingStage) list = list.filter((s) => s.fundingStage === fundingStage);
  if (area) list = list.filter((s) => s.area.toLowerCase().includes(area.toLowerCase()));
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.description.toLowerCase().includes(needle)
    );
  }
  return list;
}
