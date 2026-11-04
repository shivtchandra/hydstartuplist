function formatToken(w) {
  const lower = w.toLowerCase();
  if (/^(ii|iii|iv|vi|vii|viii|ix|x|sde|ai|ml|qa|hr|pr|ui|ux|ceo|cto|pm|swe)$/i.test(lower)) {
    return lower.toUpperCase();
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function decodeBase64Safe(encoded) {
  try {
    const b64 = String(encoded).replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    if (typeof Buffer !== "undefined") {
      return Buffer.from(b64 + pad, "base64").toString("utf8");
    }
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const binary = atob(b64 + pad);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
  } catch {
    // ignore malformed base64
  }
  return "";
}

export function parseFallbackContext(pathname) {
  if (!pathname || typeof pathname !== "string") return null;
  const p = pathname.replace(/\/$/, "");

  // Specific sub-routes under /jobs/
  const compMatch = p.match(/^\/jobs\/company\/([^/?#]+)/);
  if (compMatch) {
    const name = compMatch[1].split("-").map(formatToken).join(" ");
    return { type: "company_jobs", company: name, companyQuery: name };
  }

  const roleMatch = p.match(/^\/jobs\/role\/([^/?#]+)/);
  if (roleMatch) {
    const role = roleMatch[1].split("-").map(formatToken).join(" ");
    return { type: "role_jobs", role, roleQuery: role };
  }

  const areaMatch = p.match(/^\/jobs\/in\/([^/?#]+)/);
  if (areaMatch) {
    const area = areaMatch[1].split("-").map(formatToken).join(" ");
    return { type: "area_jobs", area, areaQuery: area };
  }

  // Startup profile: /startups/:slug or /startup/:slug
  const startMatch = p.match(/^\/(?:startups|startup)\/([^/?#]+)/);
  if (startMatch) {
    const name = startMatch[1].split("-").map(formatToken).join(" ");
    return { type: "startup", company: name, companyQuery: name };
  }

  // Individual job: /jobs/:slug
  const jobMatch = p.match(/^\/jobs\/([^/?#]+)/);
  if (jobMatch) {
    const raw = jobMatch[1];
    if (
      !["fresher", "remote"].includes(raw) &&
      !raw.startsWith("company/") &&
      !raw.startsWith("role/") &&
      !raw.startsWith("in/")
    ) {
      const parts = raw.split("~");
      let slug = parts[0];
      const decodedId = parts.length > 1 ? decodeBase64Safe(parts[1]) : "";

      slug = slug.replace(
        /-(hyderabad|remote|telangana|india|in|gachibowli|madhapur|hitec-city|financial-district|kondapur|begumpet|jubilee-hills|banjara-hills)$/i,
        ""
      );
      const tokens = slug.split("-").filter(Boolean);

      if (tokens.length > 0) {
        let company = "";
        if (decodedId) {
          if (tokens.length >= 2 && decodedId.toLowerCase().includes(tokens[0] + "-" + tokens[1])) {
            company = tokens[0] + " " + tokens[1];
          } else if (decodedId.toLowerCase().includes(tokens[0])) {
            company = tokens[0];
          }
        }
        if (!company) {
          company = tokens[0];
        }

        const compWords = company.toLowerCase().split(/\s+/);
        let i = 0;
        while (i < tokens.length && compWords.includes(tokens[i].toLowerCase())) {
          i++;
        }
        const roleTokens = tokens.slice(i);

        const companyFormatted = company.split(/\s+/).map(formatToken).join(" ");
        const roleFormatted = roleTokens.map(formatToken).join(" ");

        return {
          type: "job",
          company: companyFormatted,
          role: roleFormatted,
          companyQuery: companyFormatted,
          roleQuery: roleFormatted,
        };
      }
    }
  }

  return null;
}
