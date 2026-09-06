import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { checkAdminPasscode } from "../../../../lib/admin-auth.js";

export const dynamic = "force-dynamic";

// The `subscribers` collection deliberately has no public Firestore read
// rule (keeps subscriber emails private — see lib/firebase.js notes). The
// admin panel reads it here via the admin SDK instead, gated by the same
// passcode the panel's login screen already checks client-side.
export async function GET(req) {
  if (!checkAdminPasscode(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ subscribers: [], note: "FIREBASE_SERVICE_ACCOUNT not configured" });

  try {
    const snap = await db.collection("subscribers").orderBy("createdAt", "desc").get();
    const subscribers = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        email: data.email,
        wantsJobAlerts: data.wantsJobAlerts ?? null,
        source: data.source ?? null,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
      };
    });
    return NextResponse.json({ subscribers });
  } catch (err) {
    console.error("admin subscribers read error:", err);
    return NextResponse.json({ subscribers: [], note: "read error" });
  }
}
