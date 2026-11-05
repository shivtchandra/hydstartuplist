import { NextResponse } from "next/server";
import { analyzeResumeATS } from "../../../../lib/resume/ats-engine.js";
import {
  TAILOR_OUTPUT_SCHEMA,
  buildTailoringPrompt,
  createSafeFallback,
  hasMeaningfulJobDescription,
  stripGuidedPlaceholders,
  generateValidatedTailoring,
} from "../../../../lib/resume/tailor.js";

export const dynamic = "force-dynamic";

async function callFastOpenAI(prompt, apiKey, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.RESUME_TAILOR_MODEL || "gpt-6.1-sol",
        reasoning: { effort: "medium" },
        max_output_tokens: 12000,
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
      allowFallback = false,
      rewriteMode = "job",
    } = body || {};
    if (!["job", "role"].includes(rewriteMode)) {
      return NextResponse.json({ error: "Choose a job-specific or role-general rewrite.", code: "INVALID_REWRITE_MODE" }, { status: 400 });
    }
    const general = rewriteMode === "role";

    const cleanResume = String(resumeText || "").trim();
    const cleanDescription = String(jobDescription || "").trim();
    if (cleanResume.length < 80 || !String(jobTitle).trim() || (!general && !cleanDescription)) {
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
    if (!general && !hasMeaningfulJobDescription(cleanDescription)) {
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
    let repairAttempts = 0;
    let compressionAttempts = 0;
    let qualityAttempts = 0;
    let qualityIssues = [];
    let aiFailure = null;
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
          rewriteMode,
        });
        const deadline = Date.now() + 85000;
        const generated = await generateValidatedTailoring({
          prompt,
          resumeText: cleanResume,
          jobTitle,
          company,
          jobDescription: cleanDescription,
          jobSkills,
          rewriteMode,
          generate: (requestPrompt) => callFastOpenAI(requestPrompt, openaiKey, Math.min(60000, Math.max(1, deadline - Date.now()))),
        });
        aiResult = generated.tailored;
        repairAttempts = generated.repairAttempts;
        compressionAttempts = generated.compressionAttempts;
        qualityAttempts = generated.qualityAttempts;
        qualityIssues = generated.qualityIssues;
        mode = "openai";
      } catch (error) {
        aiFailure = error?.name === "AbortError" || /OpenAI request failed/.test(error?.message || "") ? "AI_UNAVAILABLE" : "AI_INVALID";
        console.warn("Resume tailoring failed:", aiFailure, error?.message || "");
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
      aiResult.coverLetter = "";
      aiResult.screeningAnswers = [
        { question: "What is your notice period?", answer: "[add your notice period]" },
        { question: "What is your expected CTC?", answer: "[add your expected CTC]" },
      ];
      aiResult.warnings = [
        "AI tailoring is temporarily paused. This version prioritized and structured verified content from your original resume.",
      ];
    }

    if (general) {
      aiResult.coverLetter = "";
      aiResult.screeningAnswers = [];
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
      repairAttempts,
      compressionAttempts,
      qualityAttempts,
      qualityIssues,
      rewriteMode,
    });
  } catch (error) {
    console.error("Resume tailor failed:", error?.name || "unknown_error");
    return NextResponse.json(
      { error: "We couldn't tailor this resume right now. Please try again.", code: "TAILOR_FAILED" },
      { status: 500 }
    );
  }
}
