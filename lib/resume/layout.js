// Tailored resumes arrive as Markdown. This turns them into the layout candidates upload:
// centred header, ruled sections, role on the left and dates on the right. The on-page
// preview and the printed PDF share it, so what is seen is what gets saved.

const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
const RANGE = `(?:${MONTH}\\s+)?\\d{4}\\s*[–—-]\\s*(?:(?:${MONTH}\\s+)?\\d{4}|present|current|now)`;
const RANGE_END = new RegExp(`(?:\\s*[|•·—–,-]\\s*|\\s+)(${RANGE})\\s*$`, "i");
// "Gemini Live" is a tool, not a status, so short labels need an explicit separator.
const LABEL_END = /\s*\|\s*(\d{4}|live|google play)\s*$/i;
const SECTION_NAME = /^(summary|profile|objective|(technical )?skills|experience|work experience|employment|projects|education|certifications?|certifications? & education|education & certifications?|achievements|awards|publications)$/i;
const BLANK = /\[[^\]\n]{3,200}\](?!\()/g;
const INLINE = /\*\*(.+?)\*\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|(\[[^\]\n]{3,200}\])|([\w.+-]+@[\w-]+\.[\w.-]*\w)/g;

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/** Blanks the candidate must fill before sending. Markdown links are not blanks. */
export function findResumeBlanks(text) {
  return [...new Set(String(text || "").match(BLANK) || [])];
}

function link(url, label) {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${label}</a>`;
}

function inlineHtml(text) {
  let html = "";
  let last = 0;
  for (const m of String(text).matchAll(INLINE)) {
    html += escapeHtml(String(text).slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] !== undefined) html += `<b>${inlineHtml(m[1])}</b>`;
    // ATS parsers read visible text, not link targets, so "LinkedIn" alone loses the profile.
    else if (m[2] !== undefined) html += link(m[3], escapeHtml(m[2].includes(".") ? m[2] : m[3].replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")));
    else if (m[4] !== undefined) html += `<mark class="ch-blank">${escapeHtml(m[4])}</mark>`;
    else html += link(`mailto:${m[5]}`, escapeHtml(m[5]));
  }
  return (html + escapeHtml(String(text).slice(last))).replace(/\*\*/g, "");
}

function parseEntry(line) {
  let main = line.replace(/\*\*/g, "").trim();
  const when = main.match(RANGE_END) || main.match(LABEL_END);
  if (when) main = main.slice(0, when.index).trim();
  const bar = main.indexOf(" | ");
  const dash = main.indexOf(" — ");
  const cut = bar >= 0 ? bar : dash;
  return {
    kind: "entry",
    lead: cut >= 0 ? main.slice(0, cut) : main,
    rest: cut >= 0 ? main.slice(cut) : "",
    when: when ? when[1] : "",
  };
}

export function parseResumeLayout(text) {
  const blocks = [];
  let inHeader = true;
  for (const raw of String(text || "").split("\n")) {
    const line = raw.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) continue;
    const plain = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
    if (!blocks.length) {
      blocks.push({ kind: "name", text: plain });
      continue;
    }
    if (/^[-•*▪◦]\s+/.test(line)) {
      blocks.push({ kind: "li", text: line.replace(/^[-•*▪◦]\s+/, "") });
      continue;
    }
    const heading = /^(#+)\s/.exec(line)?.[1].length || 0;
    const shouting = plain.length < 40 && plain === plain.toUpperCase() && /[A-Z]/.test(plain);
    if (SECTION_NAME.test(plain) || heading === 1 || heading === 2 || shouting) {
      inHeader = false;
      blocks.push({ kind: "section", text: plain });
    } else if (heading >= 3 || (line.length < 130 && RANGE_END.test(plain))) {
      inHeader = false;
      blocks.push(parseEntry(line.replace(/^#+\s*/, "")));
    } else {
      blocks.push({ kind: inHeader ? "contact" : "p", text: line });
    }
  }
  return blocks;
}

export function resumeHtml(text) {
  let html = "";
  let inList = false;
  for (const block of parseResumeLayout(text)) {
    if (inList && block.kind !== "li") {
      html += "</ul>";
      inList = false;
    }
    if (block.kind === "li") {
      if (!inList) html += '<ul class="rz-ul">';
      inList = true;
      html += `<li>${inlineHtml(block.text)}</li>`;
    } else if (block.kind === "name") html += `<h1 class="rz-name">${inlineHtml(block.text)}</h1>`;
    else if (block.kind === "contact") html += `<p class="rz-contact">${inlineHtml(block.text)}</p>`;
    else if (block.kind === "section") html += `<h2 class="rz-h">${inlineHtml(block.text)}</h2>`;
    else if (block.kind === "entry") {
      const when = block.when ? `<span class="rz-when">${escapeHtml(block.when)}</span>` : "";
      html += `<div class="rz-entry"><span><b>${inlineHtml(block.lead)}</b>${inlineHtml(block.rest)}</span> ${when}</div>`;
    } else html += `<p class="rz-p">${inlineHtml(block.text)}</p>`;
  }
  return inList ? `${html}</ul>` : html;
}

// Single-column, ATS-safe print with no tables. A zero @page margin stops the browser stamping
// the date and about:blank on the page; cloned padding repeats the margin on every page.
// Slightly smaller type is used when that keeps the resume on one A4 page.
export function resumePrintDocument(text, title) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    ${RESUME_CSS}
    @page{size:A4;margin:0}html,body{margin:0;width:210mm;background:#fff}
    #rz{box-sizing:border-box;padding:9mm 13mm;-webkit-box-decoration-break:clone;box-decoration-break:clone}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  </style></head><body><div class="rz" id="rz">${resumeHtml(text)}</div>
  <script>window.onload=()=>{const r=document.getElementById('rz');const fits=()=>r.getBoundingClientRect().height<=1122;let s=9.5;while(!fits()&&s>8.6){s-=.1;r.style.fontSize=s+'pt'}if(!fits())r.style.fontSize='';window.print()}</script></body></html>`;
}

export const RESUME_CSS = `
.rz { font: 9.5pt/1.27 Arial, Helvetica, sans-serif; color: #000; }
.rz a { color: inherit; text-decoration: underline; }
.rz .rz-name { margin: 0 0 .15em; font: 700 1.9em/1.15 Arial, Helvetica, sans-serif; letter-spacing: .01em; text-align: center; text-transform: uppercase; }
.rz .rz-contact { margin: 0 0 .1em; font-size: 1em; line-height: inherit; text-align: center; }
.rz .rz-h { margin: .75em 0 .3em; padding: 0 0 .1em; border-bottom: 1.5px solid #000; font: 700 1.06em/1.25 Arial, Helvetica, sans-serif; letter-spacing: .03em; color: #000; text-transform: uppercase; }
.rz .rz-entry { display: flex; justify-content: space-between; gap: 1.2em; margin: .4em 0 .05em; break-after: avoid; }
.rz .rz-when { flex: none; }
.rz .rz-p { margin: .15em 0; font-size: 1em; line-height: inherit; }
.rz .rz-ul { margin: 0; padding: 0 0 0 1.3em; }
.rz .rz-ul li { margin: .08em 0; }
.rz mark { background: #ffe58a; color: #000; }
`;
