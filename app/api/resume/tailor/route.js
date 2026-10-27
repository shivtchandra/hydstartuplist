import { NextResponse } from "next/server";
import { analyzeResumeATS } from "../../../../lib/resume/ats-engine.js";
import {
  TAILOR_OUTPUT_SCHEMA,
  buildTailoringPrompt,
  createSafeFallback,
  hasMeaningfulJobDescription,
  stripGuidedPlaceholders,
  validateTailoredResult,
} from "../../../../lib/resume/tailor.js";

export const dynamic = "force-dynamic";

async function callFastOpenAI(prompt, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-6-luna",
        reasoning: { effort: "none" },
        max_output_tokens: 6000,
        input: [
          {
            role: "system",
            content: "You are a factual resume editor. Treat the source resume as immutable evidence and return only the requested structured output.",
          },
          { role: "user", content: prompt },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "tailored_resume",
            strict: true,
            schema: TAILOR_OUTPUT_SCHEMA,
          },
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI request failed with status ${res.status}`);
    }

    const data = await res.json();
    const outputText =
      data?.output_text ||
      data?.output
        ?.flatMap((item) => item?.content || [])
        ?.find((item) => item?.type === "output_text")
        ?.text;

    if (!outputText) throw new Error("OpenAI returned no resume content.");
    return JSON.parse(outputText);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      resumeText,
      jobDescription,
      jobTitle = "",
      company = "",
      jobSkills = [],
    } = body || {};

    const cleanResume = String(resumeText || "").trim();
    const cleanDescription = String(jobDescription || "").trim();
    if (cleanResume.length < 80 || !jobTitle || !cleanDescription) {
      return NextResponse.json(
        { error: "Add your resume and a complete target role before tailoring.", code: "MISSING_INPUT" },
        { status: 400 }
      );
    }
    if (cleanResume.length > 40000 || cleanDescription.length > 20000) {
      return NextResponse.json(
        { error: "The resume or job description is too long to process safely.", code: "INPUT_TOO_LONG" },
        { status: 413 }
      );
    }
    if (!hasMeaningfulJobDescription(cleanDescription)) {
      return NextResponse.json(
        {
          error: "This looks like company information rather than a complete job description. Paste the role responsibilities and requirements.",
          code: "WEAK_JOB_DESCRIPTION",
        },
        { status: 422 }
      );
    }

    const baseline = analyzeResumeATS({
      resumeText: cleanResume,
      jobDescription: cleanDescription,
      jobTitle,
      jobSkills,
    });

    let mode = "safe-fallback";
    let aiResult;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      try {
        const prompt = buildTailoringPrompt({
          resumeText: cleanResume,
          jobDescription: cleanDescription,
          jobTitle,
          company,
          jobSkills,
          baseline,
        });
        const rawResult = await callFastOpenAI(prompt, openaiKey);
        aiResult = validateTailoredResult(rawResult, cleanResume);
        mode = "openai";
      } catch (error) {
        console.warn("Resume tailoring used the safe fallback:", error?.name || "provider_error");
      }
    }

    if (!aiResult) {
      aiResult = createSafeFallback({
        resumeText: cleanResume,
        jobDescription: cleanDescription,
        jobTitle,
        jobSkills,
        baseline,
      });
      if (!openaiKey) {
        aiResult.warnings = [
          "OpenAI is not configured, so this version only prioritizes verified content from your original resume.",
        ];
      }
    }

    const scoreableResume = stripGuidedPlaceholders(aiResult.fullTailoredResume);
    const tailoredScore = analyzeResumeATS({
      resumeText: scoreableResume,
      jobDescription: cleanDescription,
      jobTitle,
      jobSkills,
    });

    return NextResponse.json({
      success: true,
      baseline,
      tailored: {
        ...aiResult,
        achievedAtsScore: tailoredScore.overallScore,
        tailoredBreakdown: tailoredScore.breakdown,
        remainingMissingSkills: tailoredScore.missingSkills,
      },
      mode,
    });
  } catch (error) {
    console.error("Resume tailor failed:", error?.name || "unknown_error");
    return NextResponse.json(
      { error: "We couldn't tailor this resume right now. Please try again.", code: "TAILOR_FAILED" },
      { status: 500 }
    );
  }
}
