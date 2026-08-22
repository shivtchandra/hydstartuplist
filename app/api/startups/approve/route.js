import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

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

// Approve a submission: geocode it to a real Hyderabad office, then append it
// to the in-code dataset (data/startups.json). No Firestore involved.
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
    if (!hit || lat == null || !IN_HYD(lat, lng)) {
      return NextResponse.json({ ok: false, reason: "no Hyderabad location found" });
    }

    let website = s.website || "";
    if (!website && hit.websiteUri) {
      try { website = new URL(hit.websiteUri).origin; } catch {}
    }

    const list = JSON.parse(fs.readFileSync(DB, "utf-8"));
    if (list.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) {
      return NextResponse.json({ ok: false, reason: "already on the map" });
    }

    const entry = {
      id: randomUUID(),
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
    };
    if (s.hiring) {
      entry.hiring = { active: true, count: null, source: "manual", checkedAt: new Date().toISOString() };
    }
    list.push(entry);
    fs.writeFileSync(DB, JSON.stringify(list, null, 2));

    return NextResponse.json({ ok: true, address: entry.address, total: list.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
