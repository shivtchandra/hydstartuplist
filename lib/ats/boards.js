import fs from "fs";
import path from "path";
import { getAdminDb } from "../firebaseAdmin.js";
import { getApproved } from "../store.js";

function boardRegistryId(provider, slug) {
  return `${provider}:${String(slug).toLowerCase()}`;
}

const BOARDS_FILE = path.join(process.cwd(), "data", "ats-boards.json");

function readLocalBoards() {
  if (!fs.existsSync(BOARDS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(BOARDS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Merge local registry + startups with atsProvider/atsSlug + Firestore job_board/ats_boards.
 */
export async function loadActiveAtsBoards() {
  const byId = new Map();

  for (const b of readLocalBoards()) {
    if (!b?.atsProvider || !b?.atsSlug || b.active === false) continue;
    byId.set(boardRegistryId(b.atsProvider, b.atsSlug), {
      id: boardRegistryId(b.atsProvider, b.atsSlug),
      name: b.name || b.atsSlug,
      atsProvider: b.atsProvider,
      atsSlug: String(b.atsSlug).toLowerCase(),
      boardUrl: b.boardUrl || null,
      website: b.website || null,
      startupId: b.startupId || null,
      employerType: b.employerType || (b.startupId ? "startup" : "other"),
      active: true,
    });
  }

  try {
    const startups = await getApproved();
    for (const s of startups) {
      if (!s.atsProvider || !s.atsSlug || s.active === false) continue;
      const id = boardRegistryId(s.atsProvider, s.atsSlug);
      const prev = byId.get(id);
      byId.set(id, {
        id,
        name: s.name || prev?.name || s.atsSlug,
        atsProvider: s.atsProvider,
        atsSlug: String(s.atsSlug).toLowerCase(),
        boardUrl: s.atsBoardUrl || prev?.boardUrl || null,
        website: s.website || prev?.website || null,
        startupId: s.id,
        employerType: "startup",
        active: true,
      });
    }
  } catch (err) {
    console.error("loadActiveAtsBoards startups:", err);
  }

  try {
    const db = await getAdminDb();
    if (db) {
      const snap = await db.collection("job_board").doc("ats_boards").get();
      if (snap.exists) {
        for (const b of snap.data().boards || []) {
          if (!b?.atsProvider || !b?.atsSlug || b.active === false) continue;
          const id = boardRegistryId(b.atsProvider, b.atsSlug);
          const prev = byId.get(id) || {};
          byId.set(id, {
            id,
            name: b.name || prev.name || b.atsSlug,
            atsProvider: b.atsProvider,
            atsSlug: String(b.atsSlug).toLowerCase(),
            boardUrl: b.boardUrl || prev.boardUrl || null,
            website: b.website || prev.website || null,
            startupId: b.startupId || prev.startupId || null,
            employerType:
              b.employerType ||
              prev.employerType ||
              (b.startupId || prev.startupId ? "startup" : "other"),
            active: true,
          });
        }
      }
    }
  } catch (err) {
    console.error("loadActiveAtsBoards firestore:", err);
  }

  return [...byId.values()];
}
