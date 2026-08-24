import { NextResponse } from "next/server";
import { getApproved } from "../../../../lib/store.js";

export const dynamic = "force-dynamic";

function checkPasscode(req) {
  const passcode = req.headers.get("x-admin-passcode");
  return !!process.env.NEXT_PUBLIC_ADMIN_PASSCODE && passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
}

function meta(html, prop) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

// Fetch the buyer's site for a quick identity check (OG title/description/image)
// and suggest matching startup entries so the admin gets a startupId to place.
export async function GET(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  const name = (searchParams.get("name") || "").trim().toLowerCase();

  let preview = null;
  if (url) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; HydMapBot/1.0)" },
      });
      clearTimeout(t);
      const html = (await res.text()).slice(0, 200000);
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      preview = {
        ok: res.ok,
        title: meta(html, "og:title") || (titleTag ? titleTag[1].trim() : null),
        description: meta(html, "og:description") || meta(html, "description"),
        image: meta(html, "og:image"),
        siteName: meta(html, "og:site_name"),
      };
    } catch (e) {
      preview = { ok: false, error: e.name === "AbortError" ? "timed out" : e.message };
    }
  }

  // Suggest matching startups (by domain, then by name) so admin can grab the id.
  const dom = domainOf(url);
  const all = await getApproved();
  const matches = all
    .filter((s) => {
      const sDom = domainOf(s.website || "");
      if (dom && sDom && sDom === dom) return true;
      if (name && s.name && s.name.toLowerCase().includes(name)) return true;
      return false;
    })
    .slice(0, 6)
    .map((s) => ({ id: s.id, name: s.name, website: s.website || null, area: s.area || null }));

  return NextResponse.json({ preview, matches });
}
