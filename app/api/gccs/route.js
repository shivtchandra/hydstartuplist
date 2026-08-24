import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { gccSpotlightIdSet } from "../../../lib/placements.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = path.join(process.cwd(), "data", "gccs.json");
  const list = JSON.parse(fs.readFileSync(file, "utf-8"));
  const spotlight = gccSpotlightIdSet();
  return NextResponse.json(
    list.map((g) => ({
      ...g,
      sponsored: spotlight.has(g.id) || g.sponsored === true,
    }))
  );
}
