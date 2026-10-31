// Minimal OpenAI Responses API client for the career hub routes.
// Strict JSON-schema output only; callers validate the result against the
// candidate's own resume before trusting it.

const OPENAI_URL = "https://api.openai.com/v1/responses";
export const CAREER_MODEL = "gpt-6-luna";

export class AIUnavailableError extends Error {
  constructor(message, code = "AI_UNAVAILABLE") {
    super(message);
    this.code = code;
  }
}

export async function callOpenAIJson({
  apiKey,
  system,
  prompt,
  schemaName,
  schema,
  effort = "low",
  maxOutputTokens = 4000,
  timeoutMs = 25000,
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new AIUnavailableError("OpenAI is not configured.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: CAREER_MODEL,
        reasoning: { effort },
        max_output_tokens: maxOutputTokens,
        input: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
      }),
    });
    if (!res.ok) throw new AIUnavailableError(`OpenAI request failed (${res.status}).`);
    const data = await res.json();
    const text =
      data?.output_text ||
      data?.output?.flatMap((item) => item?.content || [])?.find((item) => item?.type === "output_text")?.text;
    if (!text) throw new AIUnavailableError("OpenAI returned no content.", "AI_INVALID");
    try {
      return JSON.parse(text);
    } catch {
      throw new AIUnavailableError("OpenAI returned malformed JSON.", "AI_INVALID");
    }
  } catch (err) {
    if (err instanceof AIUnavailableError) throw err;
    throw new AIUnavailableError(err?.name === "AbortError" ? "OpenAI timed out." : "OpenAI request failed.");
  } finally {
    clearTimeout(timer);
  }
}

/** Lowercased, whitespace-collapsed text for evidence lookups. */
export function normalizeForEvidence(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[‐-―]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when `quote` (or, for long quotes, a 40-char slice of it) appears in the
 * resume. Lets the model trim or re-space quotes without letting it invent them.
 */
export function evidenceInText(quote, normalizedSource) {
  const q = normalizeForEvidence(quote).replace(/^[-•*\s]+|[\s.]+$/g, "");
  if (q.length < 3) return false;
  if (normalizedSource.includes(q)) return true;
  if (q.length < 40) return false;
  for (let i = 0; i + 40 <= q.length; i += 20) {
    if (normalizedSource.includes(q.slice(i, i + 40))) return true;
  }
  return false;
}

export function profileHash(text) {
  let h = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
