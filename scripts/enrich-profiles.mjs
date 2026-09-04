// Bulk-enrich the DPIIT-registry stub company pages by scraping each company's
// own website. Writes id -> {descriptionLong, oneLiner, services[], founded?,
// logoUrl?, sources[], enrichedAt} (or {skipped:true}) into data/enrichment.json.
// `npm run enrich:merge` then folds that into data/startups.json.
//
// Source per company: Jina Reader (r.jina.ai — same engine as the agent-reach
// read_url tool, no key, no credits) -> plain fetch fallback. Homepage first,
// then /about, /about-us, /company if the homepage yields nothing usable.
//
// Resumable: a company already keyed in enrichment.json is skipped. Flags:
//   --limit N        stop after N newly-processed companies
//   --ids a,b,c      only these startup ids
//   --concurrency N  parallel workers (default 5)
//   --sleep MS       delay between a worker's requests (default 400)
//   --force          re-process even if already in enrichment.json
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const DB = path.join(__dirname, "..", "data", "startups.json");
const ENRICH = path.join(__dirname, "..", "data", "enrichment.json");
const UA = { "User-Agent": "Mozilla/5.0 (profile-enrich)" };

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? def : argv[i + 1];
};
const LIMIT = parseInt(flag("limit", "0"), 10);
const CONCURRENCY = Math.max(1, parseInt(flag("concurrency", "5"), 10));
const SLEEP = parseInt(flag("sleep", "400"), 10);
const FORCE = argv.includes("--force");
const ONLY_IDS = flag("ids", "") ? new Set(flag("ids", "").split(",").map((s) => s.trim())) : null;

const IS_STUB = (s) => /DIPP\d|DPIIT-recognised/i.test(s.description || "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- extraction helpers ---------------------------------------------------

const BRAND_TAIL = /\s*[|\-–—:·]\s*[^|\-–—:·]{2,60}$/;
const BRAND_HEAD = /^(home|welcome( to)?|about( us)?|index)\s*[|\-–—:·]\s*/i;
const NOISE =
  /cookie|consent|javascript is (dis|not en)abled|loading\.\.\.|enable javascript|403 forbidden|404 not found|access denied|are you a robot|just a moment|godaddy|domain (is )?for sale|this domain|by submitting|you agree that|privacy policy|all rights reserved|lorem ipsum|url source|references to any specific company|disclaimer:|i am (very )?happy|highly recommend|really (excellent|great|good)|thank you|testimonial|great job|excellent (company|team|service|work)/i;
// A usable blurb must read like English prose.
const EN_WORDS = /\b(the|and|for|with|our|we|is|are|that|this|to|of|in|on|as|from|your|their|it)\b/gi;

function cleanText(t) {
  return (t || "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "") // markdown links -> drop
    .replace(/https?:\/\/\S+/g, " ") // bare urls
    .replace(/\[[^\]]*…?\]/g, " ") // [ … ] leftovers
    .replace(/[#*_>`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Reject non-English / boilerplate / junk candidates.
function looksLikeProse(s) {
  if (!s || s.length < 80 || s.length > 900) return false;
  if (NOISE.test(s)) return false;
  if (/^[^A-Za-z0-9]/.test(s)) return false; // starts with punctuation/quote
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  const nonAscii = (s.match(/[^\x00-\x7F]/g) || []).length;
  if (letters / s.length < 0.6) return false; // too many symbols
  if (nonAscii / s.length > 0.08) return false; // likely another language/script
  const enHits = (s.match(EN_WORDS) || []).length;
  if (enHits < 4) return false; // not English enough
  if ((s.match(/ /g) || []).length < 12) return false;
  return true;
}

// Best 2-4 sentence "about" blurb from metadata description or first real
// paragraph of the page markdown.
function pickDescription(meta, markdown, name) {
  const cands = [];
  if (meta?.description) cands.push(meta.description);
  if (meta?.ogDescription) cands.push(meta.ogDescription);

  if (markdown) {
    const paras = markdown
      .split(/\n{2,}/)
      .map(cleanText)
      .filter((p) => /[.!?]/.test(p) && looksLikeProse(p));
    // Prefer a paragraph that names the company or says what "we"/"is a" do.
    const first = name.split(/\s+/)[0].toLowerCase();
    paras.sort((a, b) => {
      const score = (p) =>
        (p.toLowerCase().includes(first) ? 2 : 0) +
        (/\b(we|our|is a|provides?|builds?|offers?|helps?|platform|company|solutions?)\b/i.test(p) ? 1 : 0);
      return score(b) - score(a);
    });
    if (paras[0]) cands.push(paras[0]);
  }

  const nameNorm = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const first = name.split(/\s+/)[0].toLowerCase();
  const CONCRETE = /\b(software|platform|service|solution|app|application|technolog|consult|agency|studio|product|manufactur|design|develop|data|cloud|network|system|market|engineer|survey|logistic|health|educat|learning|security|commerce|automat|infrastructure)\w*/i;
  for (const c of cands.map(cleanText)) {
    if (!looksLikeProse(c)) continue;
    if (c.toLowerCase().replace(/[^a-z0-9]/g, "") === nameNorm) continue;
    // Must say something concrete — not just "we go above and beyond for you".
    if (!c.toLowerCase().includes(first) && !CONCRETE.test(c)) continue;
    // Trim to <= 4 sentences.
    const sentences = c.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 4) return sentences.slice(0, 4).join(" ").trim();
    return c;
  }
  return null;
}

function pickOneLiner(meta, name) {
  let t = cleanText(meta?.ogTitle || meta?.title || "");
  t = t.replace(BRAND_HEAD, "").replace(BRAND_TAIL, "").trim();
  const norm = (x) =>
    x
      .toLowerCase()
      .replace(/\b(pvt|private|ltd|limited|llp|inc|technolog\w*|solutions?|infotech|systems?|labs?|software|digital|services?|global|india)\b/g, "")
      .replace(/[^a-z0-9]/g, "");
  if (t.length < 12 || t.length > 110) return null;
  if (!/ /.test(t) || NOISE.test(t) || /^https?:/i.test(t)) return null;
  if (norm(t) === norm(name || "")) return null; // just the company name
  if ((t.match(/[A-Za-z]/g) || []).length / t.length < 0.6) return null;
  if (/[|]/.test(t)) return null; // unstripped page-title cruft
  if (/\b(best|top|#1|leading)\b[\s\S]*\b(in hyderabad|company|agency|services?)\b/i.test(t)) return null;
  return t;
}

const SERVICE_LEXICON = [
  ["Mobile app development", /\bmobile app|android app|ios app|react native|flutter\b/i],
  ["Web development", /\bweb (app|application|development|design)|frontend|full[- ]stack|website design\b/i],
  ["Custom software", /\bcustom software|bespoke software|product engineering|software development\b/i],
  ["Cloud & DevOps", /\bcloud (migration|services|computing)|devops|aws|azure|gcp|kubernetes\b/i],
  ["AI & ML", /\b(artificial intelligence|machine learning|\bAI\b|\bML\b|generative ai|data science|nlp)\b/i],
  ["Data & analytics", /\bdata (analytics|engineering|warehouse)|business intelligence|\bBI\b|power bi|tableau\b/i],
  ["UI/UX design", /\bui\/ux|ux design|user experience|product design\b/i],
  ["QA & testing", /\b(quality assurance|\bQA\b|software testing|test automation)\b/i],
  ["Staffing & IT consulting", /\bstaff(ing| augmentation)|it consulting|resource augmentation|talent solutions\b/i],
  ["E-commerce", /\be-?commerce|magento|shopify|woocommerce\b/i],
  ["Digital marketing & SEO", /\bdigital marketing|seo\b|search engine optimi|social media marketing\b/i],
  ["ERP", /\berp\b|sap\b|odoo|netsuite\b/i],
  ["CRM & Salesforce", /\bcrm\b|salesforce|dynamics 365\b/i],
  ["E-learning & LMS", /\be-?learning|lms\b|learning management|edtech\b/i],
  ["Blockchain", /\bblockchain|web3|smart contract|crypto\b/i],
  ["IoT & embedded", /\biot\b|internet of things|embedded (systems|software)|firmware\b/i],
  ["Cybersecurity", /\bcyber ?security|infosec|penetration test|vapt\b/i],
  ["Healthcare IT", /\bhealthcare (it|technology)|hipaa|ehr|emr|telehealth\b/i],
];

const ACRONYM = /\b(it|ai|ml|ui|ux|qa|erp|crm|api|iot|bi|seo|saas|hr|kpo|bpo|lms)\b/gi;
const fixCase = (s) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
    .replace(ACRONYM, (m) => m.toUpperCase());

function pickServices(stubDesc, markdown) {
  const out = [];
  const seen = new Set();
  const key = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
  const add = (label) => {
    const k = key(label);
    // Skip if a near-duplicate is already in (e.g. "Web development" vs "Web Development").
    if (seen.has(k)) return;
    for (const e of seen) if (e.includes(k) || k.includes(e)) return;
    seen.add(k);
    out.push(label);
  };
  // From the registry stub itself: "IT Services — Application Development."
  const m = /—\s*([A-Za-z /&,]+?)\.\s/.exec(stubDesc + " ");
  if (m) {
    for (const part of m[1].split(/[/,]| and /).map((s) => s.trim()).filter(Boolean)) {
      const norm = fixCase(part);
      if (norm.length > 2 && !/^(IT services|others?)$/i.test(norm)) add(norm);
    }
  }
  const hay = (markdown || "").slice(0, 8000);
  for (const [label, re] of SERVICE_LEXICON) {
    if (out.length >= 6) break;
    if (re.test(hay)) add(label);
  }
  return out.slice(0, 6);
}

function pickFounded(markdown, existing) {
  if (existing) return existing;
  const hay = (markdown || "").slice(0, 12000);
  const pats = [
    /\b(?:since|established|founded|incorporated)\s+(?:in\s+)?((?:19|20)\d\d)\b/i,
    /\b((?:19|20)\d\d)\s*[-–]\s*(?:present|now|today)\b/i,
    /\bin the year\s+((?:19|20)\d\d)\b/i,
  ];
  const now = new Date().getFullYear();
  for (const re of pats) {
    const m = re.exec(hay);
    if (m) {
      const y = parseInt(m[1], 10);
      if (y >= 1990 && y <= now) return y;
    }
  }
  return null;
}

// ---- fetchers -----------------------------------------------------------

async function viaJina(url) {
  try {
    const resp = await fetch(`https://r.jina.ai/${url}`, {
      headers: { ...UA, "X-Return-Format": "markdown" },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return null;
    const text = await resp.text();
    // Jina prefixes "Title: ...\nURL Source: ...\nMarkdown Content:\n"
    const titleM = /^Title:\s*(.+)$/m.exec(text);
    const body = text.split(/Markdown Content:\s*\n/).slice(1).join("") || text;
    return { markdown: body, meta: { title: titleM?.[1] || "" } };
  } catch {
    return null;
  }
}

async function viaPlain(url) {
  try {
    const resp = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return null;
    const html = await resp.text();
    const grab = (re) => (re.exec(html) || [])[1];
    const meta = {
      title: grab(/<title[^>]*>([^<]+)<\/title>/i),
      description: grab(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
      ogDescription: grab(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i),
      ogTitle: grab(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i),
      ogImage: grab(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i),
    };
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    return { markdown: text, meta };
  } catch {
    return null;
  }
}

async function scrape(url) {
  return (await viaJina(url)) || (await viaPlain(url));
}

// ---- per-company --------------------------------------------------------

async function enrichOne(s) {
  const base = (s.website || "").replace(/\/$/, "");
  if (!base) return { skipped: true, reason: "no-website", enrichedAt: new Date().toISOString() };

  const urls = [base, `${base}/about`, `${base}/about-us`, `${base}/company`];
  let best = null;
  const sources = [];
  for (const u of urls) {
    const r = await scrape(u);
    await sleep(SLEEP);
    if (!r || (!r.markdown && !r.meta?.description)) continue;
    sources.push(u);
    const desc = pickDescription(r.meta, r.markdown, s.name);
    if (desc && (!best || desc.length > (best.desc?.length || 0))) {
      best = { ...r, desc };
    }
    if (best && best.desc && best.desc.length > 160 && u === base) break; // homepage was enough
  }

  if (!best || !best.desc) {
    return { skipped: true, reason: "no-content", sources, enrichedAt: new Date().toISOString() };
  }

  const entry = {
    descriptionLong: best.desc,
    oneLiner: pickOneLiner(best.meta, s.name),
    services: pickServices(s.description, best.markdown),
    sources,
    enrichedAt: new Date().toISOString(),
  };
  const founded = pickFounded(best.markdown, null);
  if (founded && !s.founded) entry.founded = founded;
  const img = best.meta?.ogImage;
  if (img && /^https?:\/\//.test(img)) entry.logoUrl = img;
  if (!entry.oneLiner) delete entry.oneLiner;
  return entry;
}

// ---- driver -----------------------------------------------------------

const startups = JSON.parse(fs.readFileSync(DB, "utf-8"));
const enrichment = fs.existsSync(ENRICH) ? JSON.parse(fs.readFileSync(ENRICH, "utf-8")) : {};

let queue = startups.filter((s) => s.active !== false && IS_STUB(s));
if (ONLY_IDS) queue = queue.filter((s) => ONLY_IDS.has(s.id));
// Hand-authored entries (manual:true) are never touched by the scraper.
queue = queue.filter((s) => !enrichment[s.id]?.manual);
if (!FORCE) queue = queue.filter((s) => !enrichment[s.id]);
if (LIMIT > 0) queue = queue.slice(0, LIMIT);

console.log(
  `stubs total ${startups.filter((s) => s.active !== false && IS_STUB(s)).length} | ` +
    `already enriched ${Object.keys(enrichment).length} | this run ${queue.length} | source: jina`
);

let done = 0,
  ok = 0,
  skip = 0;
const SAVE_EVERY = 20;

function save() {
  fs.writeFileSync(ENRICH, JSON.stringify(enrichment, null, 2) + "\n");
}

async function worker(items) {
  for (const s of items) {
    try {
      const entry = await enrichOne(s);
      enrichment[s.id] = entry;
      entry.skipped ? skip++ : ok++;
    } catch (err) {
      enrichment[s.id] = { skipped: true, reason: String(err).slice(0, 120), enrichedAt: new Date().toISOString() };
      skip++;
    }
    done++;
    if (done % SAVE_EVERY === 0) {
      save();
      console.log(`  …${done}/${queue.length}  (ok ${ok}, skip ${skip})`);
    }
  }
}

const chunks = Array.from({ length: CONCURRENCY }, () => []);
queue.forEach((s, i) => chunks[i % CONCURRENCY].push(s));
await Promise.all(chunks.map(worker));
save();

console.log(`\nDone. processed ${done}: enriched ${ok}, skipped ${skip}. -> data/enrichment.json`);
console.log(`Next: npm run enrich:merge`);
