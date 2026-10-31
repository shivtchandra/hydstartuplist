// Browser-only resume text extraction: PDF via pdf.js, DOCX via mammoth (both
// lazy-loaded from CDN), plain text as-is. Nothing leaves the device here.

function loadScript(id, src, ready) {
  if (ready()) return Promise.resolve();
  const existing = document.getElementById(id);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Document reader failed to load.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Document reader failed to load.'));
    document.head.appendChild(script);
  });
}

async function extractPdfText(file) {
  await loadScript(
    'mapmyhyd-pdfjs',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    () => Boolean(window.pdfjsLib),
  );
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    // Keep line breaks pdf.js reports so bullets and sections survive.
    pages.push(content.items.map((item) => item.str + (item.hasEOL ? '\n' : ' ')).join(''));
  }
  return pages.join('\n\n');
}

async function extractDocxText(file) {
  await loadScript(
    'mapmyhyd-mammoth',
    'https://unpkg.com/mammoth@1.9.1/mammoth.browser.min.js',
    () => Boolean(window.mammoth),
  );
  const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

/** Text of a resume file (PDF, DOCX, TXT/MD). Throws with a user-facing message. */
export async function extractResumeText(file) {
  if (!file) throw new Error('Choose a file first.');
  if (file.size > 8 * 1024 * 1024) throw new Error('That file is over 8 MB. Export a smaller PDF or paste the text.');
  const name = String(file.name || '').toLowerCase();
  let text;
  if (name.endsWith('.pdf') || file.type === 'application/pdf') text = await extractPdfText(file);
  else if (name.endsWith('.docx')) text = await extractDocxText(file);
  else if (name.endsWith('.doc')) throw new Error('Old .doc files are not supported. Save as PDF or DOCX.');
  else text = await file.text();
  const clean = String(text || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length < 80) throw new Error("Couldn't read text from that file (scanned PDF?). Paste your resume instead.");
  return clean.slice(0, 40000);
}
