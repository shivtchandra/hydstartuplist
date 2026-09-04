/**
 * Google Indexing API helper for time-sensitive job URLs.
 * Requires Indexing API enabled on the GCP project and the service account
 * added as Owner on the Search Console property.
 *
 * Uses GOOGLE_INDEXING_SERVICE_ACCOUNT if set, else FIREBASE_SERVICE_ACCOUNT.
 * No-ops cleanly when credentials or API access are missing.
 */

const INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const SCOPE = "https://www.googleapis.com/auth/indexing";
/** Soft cap per cron invocation to stay within daily quota. */
const MAX_PER_RUN = 100;

function loadCredentials() {
  const raw =
    process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error("google-indexing: invalid service account JSON", err);
    return null;
  }
}

async function getAccessToken() {
  const creds = loadCredentials();
  if (!creds?.client_email || !creds?.private_key) return null;
  try {
    const { JWT } = await import("google-auth-library");
    const client = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: [SCOPE],
    });
    const token = await client.getAccessToken();
    return token?.token || token || null;
  } catch (err) {
    console.error("google-indexing: auth failed", err?.message || err);
    return null;
  }
}

async function publishOne(accessToken, url, type) {
  const resp = await fetch(INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, type }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`${type} ${url} → ${resp.status} ${body.slice(0, 200)}`);
  }
  return true;
}

/**
 * Notify Google of job URL changes.
 * @param {{ updated?: string[], deleted?: string[] }} param0
 */
export async function notifyJobUrls({ updated = [], deleted = [] } = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { skipped: true, reason: "no_credentials_or_auth", updated: 0, deleted: 0 };
  }

  const queue = [
    ...updated.map((url) => ({ url, type: "URL_UPDATED" })),
    ...deleted.map((url) => ({ url, type: "URL_DELETED" })),
  ].slice(0, MAX_PER_RUN);

  let okUpdated = 0;
  let okDeleted = 0;
  const errors = [];

  for (const item of queue) {
    try {
      await publishOne(accessToken, item.url, item.type);
      if (item.type === "URL_UPDATED") okUpdated++;
      else okDeleted++;
    } catch (err) {
      errors.push(String(err.message || err));
    }
  }

  if (errors.length) {
    console.error("google-indexing errors:", errors.slice(0, 5));
  }

  return {
    skipped: false,
    updated: okUpdated,
    deleted: okDeleted,
    queued: queue.length,
    truncated: updated.length + deleted.length > MAX_PER_RUN,
    errors: errors.length,
  };
}
