import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { getApproved } from "../../../../lib/store.js";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";

const DB = path.join(process.cwd(), "data", "startups.json");
const IN_HYD = (lat, lng) => lat > 17.0 && lat < 17.75 && lng > 78.0 && lng < 78.85;

async function search(query) {
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.websiteUri",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1, regionCode: "IN" }),
  });
  const d = await resp.json();
  return d.places?.[0] || null;
}

// Approve a submission: geocode it to a real Hyderabad office, then persist it.
// Vercel's filesystem is read-only at request time, so we write to Firestore's
// `startups_dynamic` overlay (merged onto data/startups.json by getApproved).
// Claims (s.claimFor) store field overrides on the existing id; new approvals
// store the full record (_full:true) under a fresh id. Falls back to a local
// file write only when no admin DB is configured (offline dev).
export async function POST(req) {
  const s = await req.json();
  if (!s?.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    let hit = await search(`${s.name} ${s.area || "Hyderabad"}`);
    let lat = hit?.location?.latitude, lng = hit?.location?.longitude;
    if (!hit || lat == null || !IN_HYD(lat, lng)) {
      hit = await search(`${s.area || s.name}, Hyderabad`);
      lat = hit?.location?.latitude; lng = hit?.location?.longitude;
    }
    const foundLocation = hit && lat != null && IN_HYD(lat, lng);

    let website = s.website || "";
    if (!website && hit?.websiteUri) {
      try { website = new URL(hit.websiteUri).origin; } catch {}
    }

    const db = await getAdminDb();
    const all = await getApproved();

    // ── Claim: merge overrides onto an existing listing ──────────────────
    if (s.claimFor) {
      const existing = all.find((x) => x.id === s.claimFor);
      if (!existing) return NextResponse.json({ ok: false, reason: "claimed listing not found" });

      const overrides = {
        website: website || existing.website,
        sector: s.sector || existing.sector,
        fundingStage: s.fundingStage || existing.fundingStage,
        area: s.area || existing.area,
        description: s.description || existing.description,
        careers: website ? `${website}/careers` : existing.careers,
        address: foundLocation ? hit.formattedAddress : existing.address,
        lat: foundLocation ? lat : existing.lat,
        lng: foundLocation ? lng : existing.lng,
        verified: true,
      };
      if (s.hiring) {
        overrides.hiring = { active: true, count: null, source: "manual", checkedAt: new Date().toISOString() };
      }

      if (db) {
        await db.collection("startups_dynamic").doc(s.claimFor).set(overrides, { merge: true });
      } else {
        const list = JSON.parse(fs.readFileSync(DB, "utf-8"));
        const idx = list.findIndex((x) => x.id === s.claimFor);
        if (idx !== -1) { list[idx] = { ...list[idx], ...overrides }; fs.writeFileSync(DB, JSON.stringify(list, null, 2)); }
      }
      return NextResponse.json({ ok: true, address: overrides.address, total: all.length, claimed: true });
    }

    // ── New approval: needs a real Hyderabad location ────────────────────
    if (!foundLocation) {
      return NextResponse.json({ ok: false, reason: "no Hyderabad location found" });
    }
    if (all.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) {
      return NextResponse.json({ ok: false, reason: "already on the map" });
    }

    const id = randomUUID();
    const entry = {
      id,
      name: s.name,
      website,
      sector: s.sector || "Other",
      fundingStage: s.fundingStage || "Recognised",
      area: s.area || "Hyderabad",
      description: s.description || "",
      careers: website ? `${website}/careers` : `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(s.name)}`,
      address: hit.formattedAddress || null,
      lat, lng,
      locSource: "submission+places",
      status: "approved",
      addedAt: new Date().toISOString(),
    };
    if (s.hiring) {
      entry.hiring = { active: true, count: null, source: "manual", checkedAt: new Date().toISOString() };
    }

    if (db) {
      await db.collection("startups_dynamic").doc(id).set({ ...entry, _full: true });
    } else {
      const list = JSON.parse(fs.readFileSync(DB, "utf-8"));
      list.push(entry);
      fs.writeFileSync(DB, JSON.stringify(list, null, 2));
    }

    return NextResponse.json({ ok: true, address: entry.address, total: all.length + 1 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
