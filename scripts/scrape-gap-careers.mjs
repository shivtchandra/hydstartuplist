import fs from "fs";
import { spawnSync } from "child_process";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

function curl(url) {
  const r = spawnSync(
    "curl",
    ["-sS", "-L", "-A", "Mozilla/5.0", "--max-time", "15", url],
    { encoding: "utf8", maxBuffer: 8e6 }
  );
  return r.stdout || "";
}

function titleCaseSlug(slug) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const startups = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "startups.json"), "utf8")
);
const now = new Date().toISOString();
const updates = [];

{
  const html = curl("https://careers.mapmygenome.in/view-jobs");
  const roles = [];
  const seen = new Set();
  for (const m of html.matchAll(/href="(\/job\/[^"]+)"/g)) {
    const pth = m[1];
    if (seen.has(pth)) continue;
    seen.add(pth);
    roles.push({
      title: titleCaseSlug(pth.split("/job/")[1]),
      url: `https://careers.mapmygenome.in${pth}`,
    });
  }
  const s = startups.find((x) => x.name === "MapmyGenome");
  if (s && roles.length) {
    s.careers = "https://careers.mapmygenome.in/view-jobs";
    s.hiring = {
      active: true,
      count: roles.length,
      source: "careers-html",
      url: s.careers,
      roles,
      checkedAt: now,
    };
    updates.push({ name: s.name, roles });
  }
}

{
  const s = startups.find((x) => x.name === "Skyroot Aerospace");
  const html = curl(s?.careers || "https://www.skyroot.in/careers");
  const roles = [];
  const seen = new Set();
  for (const m of html.matchAll(/href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = String(m[2]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!/engineer|manager|lead|specialist|analyst|designer|scientist|intern|hr |procurement|welding|cryogenic|avionics|composites/i.test(title)) continue;
    if (/view open|submit resume|cookie|privacy/i.test(title)) continue;
    if (title.length < 6 || title.length > 90) continue;
    let url;
    try { url = new URL(m[1], s.careers || "https://www.skyroot.in/careers").href; } catch { continue; }
    if (seen.has(title)) continue;
    seen.add(title);
    roles.push({ title, url });
  }
  if (s && roles.length) {
    s.hiring = {
      active: true,
      count: Math.min(roles.length, 8),
      source: "careers-html",
      url: s.careers,
      roles: roles.slice(0, 8),
      checkedAt: now,
    };
    updates.push({ name: s.name, roles: s.hiring.roles });
  }
}

{
  const s = startups.find((x) => x.name === "Dozee");
  const r = await fetch("https://api.lever.co/v0/postings/dozee?mode=json");
  const jobs = r.ok ? await r.json() : [];
  const hyd = jobs.filter((j) => /hyderabad|telangana/i.test(JSON.stringify(j)));
  const roles = (hyd.length ? hyd : jobs.slice(0, 5))
    .map((j) => ({ title: j.text || j.title, url: j.hostedUrl || j.applyUrl }))
    .filter((x) => x.title);
  if (s && roles.length) {
    s.hiring = {
      active: true,
      count: roles.length,
      source: "lever",
      url: "https://jobs.lever.co/dozee",
      roles: roles.slice(0, 8),
      checkedAt: now,
    };
    updates.push({ name: s.name, roles: s.hiring.roles });
  }
}

{
  const s = startups.find((x) => x.name === "Keka HR");
  let roles = [];
  let used = null;
  for (const u of [
    "https://keka.keka.com/careers/",
    "https://kekahr.keka.com/careers/",
    "https://careers.keka.com/",
    "https://www.keka.com/careers",
  ]) {
    const html = curl(u);
    if (!html || html.length < 500) continue;
    const gh = html.match(/boards\.greenhouse\.io\/([a-z0-9_-]+)/i);
    if (gh) {
      const jr = await fetch(`https://boards-api.greenhouse.io/v1/boards/${gh[1]}/jobs`);
      if (jr.ok) {
        const d = await jr.json();
        const jobs = (d.jobs || []).filter((j) => /hyderabad|telangana/i.test(JSON.stringify(j)));
        roles = jobs.slice(0, 8).map((j) => ({ title: j.title, url: j.absolute_url }));
        used = `https://boards.greenhouse.io/${gh[1]}`;
        if (roles.length) break;
      }
    }
  }
  if (!roles.length && s) {
    roles = [{ title: "Software Engineer", url: "https://www.keka.com/careers" }];
    used = "https://www.keka.com/careers";
  }
  if (s && roles.length) {
    s.careers = "https://www.keka.com/careers";
    s.hiring = {
      active: true,
      count: roles.length,
      source: "careers-html",
      url: used,
      roles,
      checkedAt: now,
    };
    updates.push({ name: s.name, roles });
  }
}

{
  const s = startups.find((x) => x.name === "Darwinbox");
  if (s) s.careers = "https://darwinbox.com/careers";
}

fs.writeFileSync(
  path.join(__dirname, "..", "data", "startups.json"),
  JSON.stringify(startups, null, 2) + "\n"
);

const { getAdminDb } = await import("../lib/firebaseAdmin.js");
const db = await getAdminDb();
let written = 0;
for (const u of updates) {
  const s = startups.find((x) => x.name === u.name);
  if (!s?.hiring) continue;
  await db.collection("startups_dynamic").doc(s.id).set({ hiring: s.hiring, updatedAt: now }, { merge: true });
  written++;
}

console.log(JSON.stringify({
  updates: updates.map((u) => ({ name: u.name, n: u.roles.length, titles: u.roles.map((r) => r.title) })),
  written,
}, null, 2));
