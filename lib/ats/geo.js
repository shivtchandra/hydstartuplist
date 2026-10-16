/** Hyderabad metro + Telangana only — no bare "India". */
export const HYD_TG_LOC_RE =
  /hyderabad|secunderabad|telangana|hitec|hitech\s*city|gachibowli|madhapur|financial\s*district|kondapur|kukatpally|raidurg|nanakramguda|jubilee\s*hills|banjara\s*hills|shameerpet|genome\s*valley|remote.{0,40}(hyderabad|telangana)/i;

export function isHydOrTelanganaLocation(text) {
  if (!text || typeof text !== "string") return false;
  return HYD_TG_LOC_RE.test(text);
}

/** Locations explicitly mentioning India, Hyderabad or Telangana. */
export const INDIA_LOC_RE = /\b(india|telangana|hyderabad)\b/i;

/** Locations open to Remote India or genuine Worldwide / Global Remote. */
export const CURATED_REMOTE_LOC_RE =
  /\b(worldwide|anywhere|global|home\s*based|work\s*from\s*home|remote\s*[-–,\s]\s*apac|remote\s*\(apac\)|work\s*from\s*anywhere|all\s*countries|any\s*location|remote\s*globally|global\s*[-–,\s]\s*remote|remote\s*[-–,\s]\s*global|^remote$|\bremote\b)(?!\w)/i;

/** Exclude US-only, Americas-only, or EMEA/EU-only geofenced postings or explicit foreign locations. */
export const GEOBLOCKED_REMOTE_RE =
  /\b(us\s*only|usa\s*only|united\s*states\s*only|north\s*america\s*only|canada\s*only|emea\s*only|europe\s*only|uk\s*only|us\s*citizen|san\s*francisco|bay\s*area|seattle|los\s*angeles|new\s*york|austin|chicago|boston)\b/i;

/** Foreign country, city, or regional bounds outside India. */
export const FOREIGN_LOC_RE =
  /(?:\bu\.s\.a?|\b(?:usa?|united\s*states|canada|ukraine|uk|united\s*kingdom|great\s*britain|london|europe|eu|emea|americas|latam|north\s*america|south\s*america|mexico|brazil|germany|berlin|poland|spain|portugal|france|paris|ireland|dublin|netherlands|amsterdam|austria|vienna|switzerland|zurich|sweden|stockholm|norway|oslo|denmark|copenhagen|finland|helsinki|australia|sydney|melbourne|new\s*zealand|japan|tokyo|singapore|philippines|manila|vietnam|hanoi|ho\s*chi\s*minh|indonesia|jakarta|malaysia|kuala\s*lumpur|thailand|bangkok|china|beijing|shanghai|hong\s*kong|taiwan|taipei|korea|seoul|pakistan|bangladesh|nigeria|kenya|colombia|argentina|chile|israel|tel\s*aviv|south\s*africa|italy|rome|milan|greece|czech|prague|hungary|budapest|romania|bucharest|uae|dubai|abu\s*dhabi|saudi\s*arabia|egypt|turkey|istanbul)\b)/i;

export function isCuratedRemoteEligibleLocation(text) {
  if (!text || typeof text !== "string") return false;
  // If explicitly hiring in India / Telangana / Hyderabad remotely, always permit (unless geoblocked)
  if (INDIA_LOC_RE.test(text) && /\bremote\b/i.test(text)) {
    return !GEOBLOCKED_REMOTE_RE.test(text);
  }
  if (GEOBLOCKED_REMOTE_RE.test(text)) return false;
  if (FOREIGN_LOC_RE.test(text)) return false;
  return CURATED_REMOTE_LOC_RE.test(text);
}

