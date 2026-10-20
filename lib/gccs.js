import fs from "node:fs";
import path from "node:path";

const GCC_FILE = path.join(process.cwd(), "data", "gccs.json");

export function readGccs() {
  return JSON.parse(fs.readFileSync(GCC_FILE, "utf-8"));
}

export function gccsUpdatedAt() {
  try {
    return fs.statSync(GCC_FILE).mtime.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export function isGccProfileEligible(gcc) {
  return Boolean(
    gcc?.id &&
      gcc?.name &&
      gcc?.careers &&
      gcc?.area &&
      gcc?.officialSourceUrl &&
      gcc?.verifiedAt &&
      Array.isArray(gcc?.functions) &&
      gcc.functions.length
  );
}

export function getGccBySlug(slug) {
  return readGccs().find((gcc) => gcc.id === slug) || null;
}

export function verifiedGccProfiles() {
  return readGccs().filter(isGccProfileEligible);
}
