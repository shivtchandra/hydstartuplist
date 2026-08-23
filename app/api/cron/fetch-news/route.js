import { NextResponse } from "next/server";
import { getApproved } from "../../../../lib/store.js";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UA = { "User-Agent": "Mozilla/5.0 (news-fetch)" };

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "");
}

function parseItems(xml) {
  const items = [];
  const blocks = xml.split("<item>").slice(1);
  for (const block of blocks) {
    const titleM = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkM = block.match(/<link>([\s\S]*?)<\/link>/);
    const pubM = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceM = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    if (!titleM || !linkM) continue;
    items.push({
      title: decodeEntities(titleM[1]).trim(),
      url: decodeEntities(linkM[1]).trim(),
      source: sourceM ? decodeEntities(sourceM[1]).trim() : null,
      publishedAt: pubM ? new Date(pubM[1]).toISOString() : null,
    });
  }
  return items;
}

const JUNK_TITLE = /number of employees|employee count|headcount data|zoominfo|rocketreach/i;

function looksRelevant(name, title) {
  if (JUNK_TITLE.test(title)) return false;
  if (name.replace(/\s/g, "").length > 5) return true;
  return /startup|funding|raised|raises\b|hyderabad|hiring|acqui|funding round|invest(or|ment|s in)|founder|series [a-e]\b/i.test(title);
}

async function newsFor(name) {
  const q = encodeURIComponent(`"${name}" Hyderabad`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseItems(xml)
      .filter((item) => looksRelevant(name, item.title))
      .slice(0, 2);
  } catch {
    return [];
  }
}

const TOO_GENERIC = new Set(["Adya"]);

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const all = await getApproved();
  const curated = all.filter((x) => x.locSource !== "startupindia+places" && !TOO_GENERIC.has(x.name));
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "30", 10);
  const db = await getAdminDb();

  const cursorRef = db ? db.collection("cron_state").doc("fetch_news") : null;
  let offset = parseInt(searchParams.get("offset") || "", 10);
  if (Number.isNaN(offset)) {
    const cursorSnap = cursorRef ? await cursorRef.get() : null;
    offset = cursorSnap?.exists ? cursorSnap.data().offset || 0 : 0;
  }
  const targets = curated.slice(offset, offset + limit);

  const results = [];
  let hits = 0;

  for (const entry of targets) {
    const items = await newsFor(entry.name);
    if (items.length) {
      hits++;
      results.push({ id: entry.id, name: entry.name, news: items });
      if (db) {
        try {
          await db.collection("startups_dynamic").doc(entry.id).set({ news: items, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (err) {
          console.error(`Firestore news write error for ${entry.name}:`, err);
        }
      }
    }
  }

  const nextOffset = offset + limit >= curated.length ? 0 : offset + limit;
  if (cursorRef) {
    try {
      await cursorRef.set({ offset: nextOffset, lastRunAt: new Date().toISOString() });
    } catch (err) {
      console.error("cursor write error:", err);
    }
  }

  return NextResponse.json({
    success: true,
    checked: targets.length,
    newsHits: hits,
    offset,
    nextOffset,
    results,
    timestamp: new Date().toISOString(),
  });
}
