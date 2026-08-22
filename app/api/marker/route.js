// Server-generated circular logo marker. Fetches the favicon server-side and
// base64-embeds it into an SVG ring, so the image renders inside a data-URI
// marker (external <image href> is blocked when an SVG is used as a map icon).
export const dynamic = "force-dynamic";

async function fetchDataUri(url) {
  try {
    const resp = await fetch(url, { cache: "force-cache", signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 100) return null; // blank/placeholder
    const type = resp.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/")) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// Real logo first (Clearbit), fall back to Google favicon.
async function fetchLogoDataUri(domain) {
  return (
    (await fetchDataUri(`https://logo.clearbit.com/${encodeURIComponent(domain)}?size=64`)) ||
    (await fetchDataUri(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`))
  );
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  const color = searchParams.get("color") || "#64748b";
  const initial = (searchParams.get("initial") || "?").slice(0, 1).toUpperCase();

  const dataUri = domain ? await fetchLogoDataUri(domain) : null;
  const inner = dataUri
    ? `<image href="${dataUri}" x="9" y="9" width="26" height="26" clip-path="url(#clip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<text x="22" y="28" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" font-family="Inter, sans-serif">${initial}</text>`;
  const bg = dataUri ? "#ffffff" : color;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <defs><clipPath id="clip"><circle cx="22" cy="22" r="13"/></clipPath></defs>
    <circle cx="22" cy="22" r="19" fill="${bg}" stroke="${color}" stroke-width="2.5"/>
    ${inner}
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
