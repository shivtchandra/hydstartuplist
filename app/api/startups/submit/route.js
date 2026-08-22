import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { addPending } from "../../../../lib/store.js";

export async function POST(req) {
  const { name, website, sector, fundingStage, area, description } = await req.json();
  if (!name || !sector || !area) {
    return NextResponse.json({ error: "name, sector, area required" }, { status: 400 });
  }
  const entry = {
    id: randomUUID(),
    name,
    website: website || "",
    sector,
    fundingStage: fundingStage || "Undisclosed",
    area,
    description: description || "",
    lat: null,
    lng: null,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  addPending(entry);
  return NextResponse.json(entry, { status: 201 });
}
