import { NextResponse } from "next/server";
import { readGuardedJson } from "../../../../lib/career/guard.js";
import { AIUnavailableError, callOpenAIJson } from "../../../../lib/career/openai.js";
import {
  PROFILE_SCHEMA,
  PROFILE_SYSTEM,
  buildProfilePrompt,
  fallbackProfile,
  validateProfile,
} from "../../../../lib/career/profile-ai.js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { body, response } = await readGuardedJson(req, { bucket: "profile", max: 10, maxBytes: 60000 });
  if (response) return response;

  const resumeText = String(body?.resumeText || "").trim();
  if (resumeText.length < 80) {
    return NextResponse.json({ error: "Add your full resume text first.", code: "MISSING_INPUT" }, { status: 400 });
  }
  if (resumeText.length > 40000) {
    return NextResponse.json({ error: "Resume is too long to process.", code: "INPUT_TOO_LONG" }, { status: 413 });
  }

  try {
    const raw = await callOpenAIJson({
      apiKey: process.env.OPENAI_API_KEY,
      system: PROFILE_SYSTEM,
      prompt: buildProfilePrompt(resumeText),
      schemaName: "candidate_profile",
      schema: PROFILE_SCHEMA,
      effort: "low",
      maxOutputTokens: 3000,
    });
    return NextResponse.json({ profile: validateProfile(raw, resumeText), mode: "ai" });
  } catch (err) {
    console.warn("career profile fallback:", err?.code || err?.message);
    const code = err instanceof AIUnavailableError ? err.code : "AI_INVALID";
    return NextResponse.json({ profile: fallbackProfile(resumeText), mode: "fallback", code });
  }
}
