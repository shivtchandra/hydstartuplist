/** Hyderabad metro + Telangana only — no bare "India". */
export const HYD_TG_LOC_RE =
  /hyderabad|secunderabad|telangana|hitec|hitech\s*city|gachibowli|madhapur|financial\s*district|kondapur|kukatpally|raidurg|nanakramguda|jubilee\s*hills|banjara\s*hills|shameerpet|genome\s*valley|remote.{0,40}(hyderabad|telangana)/i;

export function isHydOrTelanganaLocation(text) {
  if (!text || typeof text !== "string") return false;
  return HYD_TG_LOC_RE.test(text);
}
