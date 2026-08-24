import { NextResponse } from "next/server";
import { getFeaturedInventoryAsync, getChromeSlots } from "../../../lib/placements.js";

export const dynamic = "force-dynamic";

/** Public inventory summary for map chrome / Featured shelf (no secrets). */
export async function GET() {
  const inventory = await getFeaturedInventoryAsync();
  const chrome = getChromeSlots();
  const sidebarRaw = chrome.mapSidebar;
  const baseCta = inventory.cta;
  const filled = inventory.filled.length;
  const available = inventory.available;
  const max = inventory.maxActive;

  const defaultBody =
    available > 0
      ? `${available} of ${max} featured pins open — limited Sponsored spots on the map.`
      : `All ${max} featured pins are filled right now. Ask to join the waitlist.`;

  const sidebar =
    sidebarRaw && typeof sidebarRaw === "object"
      ? {
          headline: sidebarRaw.headline || baseCta.headline,
          body: sidebarRaw.body || defaultBody,
          ctaLabel: sidebarRaw.ctaLabel || baseCta.ctaLabel,
          ctaHref: sidebarRaw.ctaHref || sidebarRaw.href || baseCta.ctaHref,
          mode: sidebarRaw.mode || (available > 0 ? "available" : "live"),
        }
      : {
          headline: baseCta.headline,
          body: defaultBody,
          ctaLabel: baseCta.ctaLabel,
          ctaHref: baseCta.ctaHref,
          mode: available > 0 ? "available" : "live",
        };

  // Prefer live scarcity copy when inventory is empty / available mode
  if (sidebar.mode === "available" || available > 0) {
    sidebar.body = defaultBody;
    sidebar.mode = available > 0 ? "available" : "live";
  }

  return NextResponse.json(
    {
      featured: {
        maxActive: max,
        filledCount: filled,
        filled: inventory.filled,
        available,
        cta: baseCta,
      },
      chrome: {
        mapSidebar: sidebar,
        homepageBanner: chrome.homepageBanner ?? null,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
