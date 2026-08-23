import { NextResponse } from "next/server";
import { filterStartups } from "../../../lib/store.js";
import { db } from "../../../lib/firebase.js";
import { collection, getDocs } from "firebase/firestore";

export const dynamic = "force-dynamic";

async function getDynamicOverrides() {
  try {
    const snap = await getDocs(collection(db, "startups_dynamic"));
    const map = new Map();
    snap.forEach((doc) => {
      map.set(doc.id, doc.data());
    });
    return map;
  } catch {
    return new Map();
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const list = filterStartups({
    sector: searchParams.get("sector") || "",
    fundingStage: searchParams.get("fundingStage") || "",
    area: searchParams.get("area") || "",
    q: searchParams.get("q") || "",
  });

  const overrides = await getDynamicOverrides();

  const slim = list.map((s) => {
    const dynamicData = overrides.get(s.id);
    const hiring = dynamicData?.hiring || s.hiring;
    return {
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      sector: s.sector,
      fundingStage: s.fundingStage,
      website: s.website,
      area: s.area,
      hiring: hiring?.active ? { count: hiring.count ?? null, roles: hiring.roles || [] } : null,
      founded: s.founded ?? null,
      active: s.active !== false,
      addedAt: s.addedAt ?? null,
    };
  });

  return NextResponse.json(slim);
}
