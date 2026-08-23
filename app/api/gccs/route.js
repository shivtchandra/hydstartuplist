import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = path.join(process.cwd(), "data", "gccs.json");
  const list = JSON.parse(fs.readFileSync(file, "utf-8"));
  return NextResponse.json(list);
}
