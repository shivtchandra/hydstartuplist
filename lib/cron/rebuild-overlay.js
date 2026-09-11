import { getAdminDb } from "../firebaseAdmin.js";
import { refreshDynamicOverlayRollup } from "../store.js";

export async function runRebuildOverlay() {
  const db = await getAdminDb();
  if (!db) return { ok: false, error: "Firebase not configured" };
  const result = await refreshDynamicOverlayRollup(db);
  return { ok: !!result?.ok, ...result };
}
