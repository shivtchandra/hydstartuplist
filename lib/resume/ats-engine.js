/**
 * Deterministic ATS (Applicant Tracking System) Reverse-Engineering Engine.
 *
 * Simulates how modern ATS platforms (Greenhouse, Lever, Taleo, Workday, Ashby)
 * parse resumes, match keywords, score skills coverage, and evaluate metric density.
 */

// Comprehensive dictionary of high-signal tech skills, tools, and domain concepts
export const TECH_SKILLS = [
  // Languages
  "javascript", "typescript", "python", "java", "golang", "go", "c++", "c#", "rust",
  "ruby", "php", "swift", "kotlin", "sql", "bash", "shell", "r", "scala",

  // Frontend
  "react", "react.js", "next.js", "nextjs", "vue", "vue.js", "nuxt", "angular",
  "svelte", "sveltekit", "tailwind", "tailwind css", "html5", "css3", "sass", "redux",
  "zustand", "mobx", "webpack", "vite", "responsive design", "web vitals",

  // Backend & APIs
  "node.js", "nodejs", "express", "express.js", "fastapi", "flask", "django",
  "spring boot", "spring", "nest.js", "nestjs", "ruby on rails", "asp.net",
  "graphql", "rest api", "restful", "grpc", "microservices", "websockets",
  "serverless", "socket.io", "trpc",

  // Databases & Storage
  "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
  "dynamodb", "cassandra", "sqlite", "firebase", "firestore", "supabase",
  "prisma", "sqlalchemy", "hibernate", "data modeling", "indexing",

  // Cloud & DevOps & Infra
  "aws", "amazon web services", "gcp", "google cloud", "azure", "docker",
  "kubernetes", "k8s", "terraform", "ci/cd", "github actions", "gitlab ci",
  "jenkins", "ansible", "helm", "linux", "nginx", "cloud architecture",
  "serverless", "ecs", "eks", "lambda", "cloudwatch",

  // Monitoring & Observability
  "prometheus", "grafana", "datadog", "sentry", "new relic", "elk stack",
  "opentelemetry", "logging",

  // Data, AI & ML
  "artificial intelligence", "document intelligence", "machine learning", "deep learning",
  "pytorch", "tensorflow", "llm", "genai", "generative ai", "nlp", "ocr", "langchain",
  "llamaindex", "pandas", "numpy", "scikit-learn",
  "apache spark", "spark", "kafka", "apache kafka", "airflow", "vector database",
  "rag", "fine-tuning", "embeddings",

  // Testing & Quality
  "jest", "vitest", "cypress", "playwright", "selenium", "unit testing",
  "integration testing", "end-to-end", "e2e", "tdd", "ci testing",

  // Systems, Scale & Methodologies
  "system design", "distributed systems", "high availability", "scalability",
  "concurrency", "load balancing", "caching", "agile", "scrum", "kanban",
  "code review", "object-oriented programming", "oop", "functional programming"
];

const STOPWORDS = new Set([
  "a", "an", "and", "the", "in", "on", "at", "to", "for", "with", "by", "from",
  "up", "about", "into", "over", "after", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "but", "if", "or", "because",
  "as", "until", "while", "of", "it", "its", "you", "your", "we", "our", "he", "she",
  "they", "their", "this", "that", "these", "those", "can", "will", "would", "should",
  "could", "work", "working", "team", "teams", "experience", "years", "role", "roles",
  "candidate", "ideal", "opportunity", "looking", "responsible", "requirements"
]);

/**
 * Normalizes text and strips punctuation while preserving technical tokens like "node.js" or "c++".
 */
export function normalizeText(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts recognized skills from arbitrary text.
 */
export function extractSkills(text) {
  const norm = normalizeText(text);
  const found = new Set();

  for (const skill of TECH_SKILLS) {
    // Regex boundary check supporting punctuation like .js, c++, etc.
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-z0-9#+])${escaped}(?:$|[^a-z0-9#+])`, "i");
    if (regex.test(norm)) {
      found.add(skill);
    }
  }

  return Array.from(found);
}

/**
 * Extracts frequent high-signal keywords and phrases from text.
 */
export function extractKeyTokens(text, limit = 25) {
  const norm = normalizeText(text);
  const words = norm
    .split(/[^a-z0-9+#.-]+/)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const counts = new Map();
  for (const w of words) {
    counts.set(w, (counts.get(w) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Detects quantified metrics and impact statements (Google X-Y-Z formula indicator).
 */
export function measureImpactMetrics(text) {
  if (!text) return { score: 0, metricCount: 0, examples: [] };

  const norm = String(text);
  // Match percentages (e.g. 35%), numbers with k/m/b, latency (ms/s), dollar/INR values, scale indicators
  const metricRegex = /(?:\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:k|m|b|ms|sec|x|users|req\/s|rps|million|crore|lakh)\b|[$₹€]\s*\d+(?:\.\d+)?|\breduced\s+by|\bincreased\s+by|\bimproved\s+by|\bscaled\s+to)/gi;

  const matches = norm.match(metricRegex) || [];
  const count = matches.length;

  // 1-2 metrics: low (40%), 3-5: medium (70%), 6+: high (100%)
  const score = Math.min(100, Math.round(count >= 6 ? 100 : count >= 3 ? 75 : count >= 1 ? 45 : 15));

  return {
    score,
    metricCount: count,
    examples: matches.slice(0, 5)
  };
}

/**
 * Evaluates how well the resume title or target role aligns with the job title.
 */
export function evaluateTitleAlignment(jobTitle, resumeText) {
  if (!jobTitle) return 70;
  const normJob = normalizeText(jobTitle);
  const normResume = normalizeText(resumeText);

  // Exact title match in the resume
  if (normResume.includes(normJob)) return 100;

  // Token overlap check
  const titleWords = normJob
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !["senior", "junior", "lead", "staff"].includes(w));

  if (titleWords.length === 0) return 75;

  let hits = 0;
  for (const w of titleWords) {
    if (normResume.includes(w)) hits++;
  }

  return Math.round((hits / titleWords.length) * 100);
}

/**
 * Main reverse-engineering analysis function.
 * Computes deterministic ATS score, matched skills, gaps, and recommendations.
 */
export function analyzeResumeATS({ resumeText, jobDescription = "", jobTitle = "", jobSkills = [] }) {
  const combinedJd = `${jobTitle || ""} ${(jobSkills || []).join(" ")} ${jobDescription || ""}`.trim();

  if (!resumeText || !combinedJd) {
    return {
      overallScore: 0,
      matchedSkills: [],
      missingSkills: [],
      matchedTokens: [],
      missingTokens: [],
      breakdown: {
        keywordMatch: 0,
        skillsCoverage: 0,
        titleAlignment: 0,
        impactMetrics: 0,
      },
      suggestions: ["Provide both your resume and the target job description to run the ATS analysis."]
    };
  }

  // 1. Skill Extraction from combined JD text + explicit skills list
  const extractedJdSkills = extractSkills(combinedJd);
  const explicitSkills = (jobSkills || []).map((s) => s.toLowerCase());
  const jdSkills = Array.from(new Set([...extractedJdSkills, ...explicitSkills]));
  const resumeSkills = new Set(extractSkills(resumeText));

  const normResume = normalizeText(resumeText);
  const matchedSkills = jdSkills.filter((s) => {
    if (resumeSkills.has(s)) return true;
    const normS = s.toLowerCase();
    if (normResume.includes(normS)) return true;
    if (normS.includes('/')) {
      const parts = normS.split('/').map((p) => p.trim()).filter(Boolean);
      if (parts.some((p) => resumeSkills.has(p) || normResume.includes(p))) return true;
    }
    return false;
  });
  const missingSkills = jdSkills.filter((s) => !matchedSkills.includes(s));

  const skillsCoverageScore = jdSkills.length > 0
    ? Math.round((matchedSkills.length / jdSkills.length) * 100)
    : 70;

  // 2. High-Frequency Keyword Overlap
  const jdTokens = extractKeyTokens(combinedJd, 30);
  const matchedTokens = jdTokens.filter((token) => normResume.includes(token));
  const missingTokens = jdTokens.filter((token) => !normResume.includes(token));

  const keywordMatchScore = jdTokens.length > 0
    ? Math.round((matchedTokens.length / jdTokens.length) * 100)
    : 60;

  // 3. Title Alignment
  const titleScore = evaluateTitleAlignment(jobTitle, resumeText);

  // 4. Impact Metrics (X-Y-Z formula)
  const impactMetrics = measureImpactMetrics(resumeText);

  // 5. Composite Weighted ATS Score
  // Weights: 40% Keyword Match, 30% Hard Skills Coverage, 15% Title Alignment, 15% Impact Metrics
  const overallScore = Math.min(
    100,
    Math.round(
      keywordMatchScore * 0.40 +
      skillsCoverageScore * 0.30 +
      titleScore * 0.15 +
      impactMetrics.score * 0.15
    )
  );

  // 6. Actionable Suggestions to reach 80%+
  const suggestions = [];
  if (missingSkills.length > 0) {
    const topMissing = missingSkills.slice(0, 5).join(", ");
    suggestions.push(`Add or reframe experience with required tools: ${topMissing}.`);
  }
  if (impactMetrics.score < 60) {
    suggestions.push("Quantify your achievements using the Google X-Y-Z formula (e.g., 'Reduced p95 latency by 35% across 200k users').");
  }
  if (titleScore < 80 && jobTitle) {
    suggestions.push(`Ensure the target title ('${jobTitle}') or related role is clearly stated in your summary or recent experience.`);
  }
  if (keywordMatchScore < 70 && missingTokens.length > 0) {
    suggestions.push(`Include high-frequency job keywords in your bullet points: ${missingTokens.slice(0, 4).join(", ")}.`);
  }

  return {
    overallScore,
    matchedSkills,
    missingSkills,
    matchedTokens,
    missingTokens,
    breakdown: {
      keywordMatch: keywordMatchScore,
      skillsCoverage: skillsCoverageScore,
      titleAlignment: titleScore,
      impactMetrics: impactMetrics.score,
    },
    metricsSummary: impactMetrics,
    suggestions,
    isTargetAchieved: overallScore >= 80
  };
}
