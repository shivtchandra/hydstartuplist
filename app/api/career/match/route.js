import { NextResponse } from "next/server";
import { readGuardedJson } from "../../../../lib/career/guard.js";
import { AIUnavailableError, callOpenAIJson } from "../../../../lib/career/openai.js";
import {
  MATCH_BATCH,
  MATCH_SCHEMA,
  MATCH_SYSTEM,
  MIN_DESCRIPTION,
  buildMatchPrompt,
  validateMatches,
} from "../../../../lib/career/match-ai.js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  // 40 shortlisted jobs = 5 batches per run; allow a few runs per 10 minutes.
  const { body, response } = await readGuardedJson(req, { bucket: "match", max: 25, maxBytes: 120000 });
  if (response) return response;

  const resumeText = String(body?.resumeText || "").trim();
  const jobs = (Array.isArray(body?.jobs) ? body.jobs : [])
    .filter((j) => j && j.id && j.title && String(j.description || "").length >= MIN_DESCRIPTION)
    .slice(0, MATCH_BATCH)
    .map((j) => ({
      id: String(j.id),
      title: String(j.title).slice(0, 200),
      company: String(j.company || "").slice(0, 120),
      experience: j.experience ? String(j.experience).slice(0, 60) : "",
      description: String(j.description).slice(0, 6000),
    }));
  if (resumeText.length < 80 || !jobs.length) {
    return NextResponse.json({ error: "Need resume text and at least one job with a description.", code: "MISSING_INPUT" }, { status: 400 });
  }

  try {
    const raw = await callOpenAIJson({
      apiKey: process.env.OPENAI_API_KEY,
      system: MATCH_SYSTEM,
      prompt: buildMatchPrompt(resumeText, jobs),
      schemaName: "job_matches",
      schema: MATCH_SCHEMA,
      effort: "low",
      maxOutputTokens: 5000,
      timeoutMs: 28000,
    });
    return NextResponse.json({ matches: validateMatches(raw, resumeText, jobs.map((j) => j.id)) });
  } catch (err) {
    const code = err instanceof AIUnavailableError ? err.code : "AI_INVALID";
    console.warn("career match failed:", code);
    return NextResponse.json({ error: "Matching is unavailable right now.", code }, { status: code === "AI_INVALID" ? 502 : 503 });
  }
}
