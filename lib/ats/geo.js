/** Hyderabad metro + Telangana only — no bare "India". */
export const HYD_TG_LOC_RE =
  /hyderabad|secunderabad|telangana|hitec|hitech\s*city|gachibowli|madhapur|financial\s*district|kondapur|kukatpally|raidurg|nanakramguda|jubilee\s*hills|banjara\s*hills|shameerpet|genome\s*valley|remote.{0,40}(hyderabad|telangana)/i;

export function isHydOrTelanganaLocation(text) {
  if (!text || typeof text !== "string") return false;
  return HYD_TG_LOC_RE.test(text);
}

/** Locations open to Remote India or genuine Worldwide / Global Remote. */
export const CURATED_REMOTE_LOC_RE =
  /\b(worldwide|anywhere|global|remote\s*[-–]\s*india|remote\s*\(india\)|india\s*\(remote\)|remote\s*[-–]\s*apac|remote\s*\(apac\)|work\s*from\s*anywhere|all\s*countries|any\s*location)\b/i;

/** Exclude US-only, Americas-only, or EMEA/EU-only geofenced postings. */
export const GEOBLOCKED_REMOTE_RE =
  /\b(us\s*only|usa\s*only|united\s*states\s*only|north\s*america\s*only|canada\s*only|emea\s*only|europe\s*only|uk\s*only|us\s*citizen)\b/i;

export function isCuratedRemoteEligibleLocation(text) {
  if (!text || typeof text !== "string") return false;
  if (GEOBLOCKED_REMOTE_RE.test(text)) return false;
  return CURATED_REMOTE_LOC_RE.test(text);
}
