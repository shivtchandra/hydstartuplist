/** Hyderabad metro + Telangana only — no bare "India". */
export const HYD_TG_LOC_RE =
  /hyderabad|secunderabad|telangana|hitec|hitech\s*city|gachibowli|madhapur|financial\s*district|kondapur|kukatpally|raidurg|nanakramguda|jubilee\s*hills|banjara\s*hills|shameerpet|genome\s*valley|remote.{0,40}(hyderabad|telangana)/i;

export function isHydOrTelanganaLocation(text) {
  if (!text || typeof text !== "string") return false;
  return HYD_TG_LOC_RE.test(text);
}

/** Locations open to Remote India or genuine Worldwide / Global Remote. */
export const CURATED_REMOTE_LOC_RE =
  /\b(worldwide|anywhere|global|home\s*based|work\s*from\s*home|remote\s*[-–,\s]\s*india|remote\s*\(india\)|india\s*\(remote\)|india\s*[-–,\s]\s*remote|remote\s*[-–,\s]\s*apac|remote\s*\(apac\)|work\s*from\s*anywhere|all\s*countries|any\s*location|remote\s*[-–,\s]\s*in|in\s*\(remote\)|remote\s*globally|global\s*[-–,\s]\s*remote|remote\s*[-–,\s]\s*global|^remote$|\bremote\b)(?!\w)/i;

/** Exclude US-only, Americas-only, or EMEA/EU-only geofenced postings. */
export const GEOBLOCKED_REMOTE_RE =
  /\b(us\s*only|usa\s*only|united\s*states\s*only|north\s*america\s*only|canada\s*only|emea\s*only|europe\s*only|uk\s*only|us\s*citizen|san francisco|bay area|seattle|los angeles|new york|austin|chicago|boston)\b/i;

/** "U.S. Anywhere" / "Canada Remote" — remote, but only inside that foreign country. */
const COUNTRY_SCOPED_REMOTE_RE =
  /\b(?:u\.?s\.?a?\.?|united\s*states|canada|ukraine|uk|united\s*kingdom|europe|eu|emea|americas|latam|north\s*america|mexico|brazil|germany|poland|spain|portugal|france|ireland|netherlands|australia|japan|singapore|philippines|vietnam|indonesia|malaysia|pakistan|bangladesh|nigeria|kenya|colombia|argentina|chile|israel|new\s*zealand|taiwan|korea|south\s*africa)\s*[-–,\s]?\s*(?:anywhere|remote)\b/gi;

export function isCuratedRemoteEligibleLocation(text) {
  if (!text || typeof text !== "string") return false;
  if (GEOBLOCKED_REMOTE_RE.test(text)) return false;
  return CURATED_REMOTE_LOC_RE.test(text.replace(COUNTRY_SCOPED_REMOTE_RE, " "));
}
