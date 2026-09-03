"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { jobUrlId } from "../../lib/jobs-seo.js";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function inferRoleType(title) {
  const t = (title || "").toLowerCase();
  if (/engineer|developer|\bdev\b|software|backend|frontend|full.?stack|sre\b|devops|infra/.test(t)) return "Engineering";
  if (/product manager|product owner|\bpm\b|product lead|product head/.test(t)) return "Product";
  if (/design|\bux\b|\bui\b|creative/.test(t)) return "Design";
  if (/\bdata\b|analyst|scientist|\bml\b|machine learning|analytics|bi\b/.test(t)) return "Data";
  if (/sales|business dev|account exec|\bacc exec\b|\bbd\b|account manager|revenue/.test(t)) return "Sales";
  if (/market|growth|\bseo\b|content|brand|social media/.test(t)) return "Marketing";
  if (/finance|accounting|\bca\b|\bcfo\b|controller|audit|payroll/.test(t)) return "Finance";
  if (/\bhr\b|people|talent|recrui|ops\b|operations|admin|support/.test(t)) return "Operations";
  return null; // don't force a bucket
}

const ROLE_CHIPS = ["Engineering", "Product", "Design", "Data", "Sales", "Marketing", "Finance", "Operations"];

const TABS = [
  { key: "all", label: "All" },
  { key: "startup", label: "Startups" },
  { key: "gcc", label: "GCCs" },
  { key: "other", label: "Other Hyderabad jobs" },
];

const RECENCY_OPTIONS = [
  { key: "all", label: "Any time" },
  { key: "today", label: "Today", ms: 86_400_000 },
  { key: "week", label: "This week", ms: 7 * 86_400_000 },
  { key: "month", label: "This month", ms: 30 * 86_400_000 },
];

export default function JobsClient({ initialJobs = [], fetchedAt = null, note = null, initialQuery = "" }) {
  const searchParams = useSearchParams();
  const [jobs] = useState(initialJobs);
  const [q, setQ] = useState(initialQuery);
  const [tab, setTab] = useState("all");
  const [roleType, setRoleType] = useState("");
  const [recency, setRecency] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [dedup, setDedup] = useState(true);
  const [sharedId, setSharedId] = useState(null);

  useEffect(() => {
    const company = searchParams.get("company");
    if (company) setQ(company.replace(/-/g, " "));
  }, [searchParams]);

  async function shareJob(j) {
    const site = `${window.location.origin}/jobs/${jobUrlId(j.id)}`;
    const text = `${j.title} at ${j.company} — ${j.location}\n${site}\nApply: ${j.url}`;
    const data = { title: `${j.title} at ${j.company}`, text, url: site };
    try {
      if (navigator.share) { await navigator.share(data); return; }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setSharedId(j.id);
      setTimeout(() => setSharedId((cur) => (cur === j.id ? null : cur)), 1600);
    } catch {
      window.prompt("Copy this to share:", text);
    }
  }

  // Deduplicate by title+company (catches syndication spam)
  const dedupedJobs = useMemo(() => {
    if (!dedup) return jobs;
    const seen = new Set();
    return jobs.filter((j) => {
      const key = `${(j.title || "").toLowerCase().trim()}|${(j.company || "").toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [jobs, dedup]);

  const counts = useMemo(() => {
    const c = { all: dedupedJobs.length, startup: 0, gcc: 0, other: 0 };
    for (const j of dedupedJobs) c[j.category] = (c[j.category] || 0) + 1;
    return c;
  }, [dedupedJobs]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = tab === "all" ? dedupedJobs : dedupedJobs.filter((j) => j.category === tab);

    if (roleType) list = list.filter((j) => inferRoleType(j.title) === roleType);

    if (recency !== "all") {
      const ms = RECENCY_OPTIONS.find((r) => r.key === recency)?.ms ?? Infinity;
      list = list.filter((j) => j.postedAt && now - new Date(j.postedAt).getTime() <= ms);
    }

    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (j) => j.title?.toLowerCase().includes(needle) || j.company?.toLowerCase().includes(needle)
      );
    }

    if (sortBy === "az") list = [...list].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sortBy === "company") list = [...list].sort((a, b) => (a.company || "").localeCompare(b.company || ""));
    // default "newest": server already returns newest-first

    return list;
  }, [dedupedJobs, tab, roleType, recency, q, sortBy]);

  const activeFilters = [roleType, recency !== "all" ? recency : ""].filter(Boolean).length;

  function clearAll() {
    setRoleType("");
    setRecency("all");
    setSortBy("newest");
    setQ("");
    setTab("all");
  }

  return (
    <>
      {searchParams.get("company") && (
        <p className="jobs-company-banner">
          Showing jobs for <strong>{searchParams.get("company").replace(/-/g, " ")}</strong>.{" "}
          <Link href={`/jobs/company/${searchParams.get("company")}`}>View company page</Link>
          {" · "}
          <Link href="/jobs">Clear filter</Link>
        </p>
      )}

      {jobs.length > 0 && (
        <>
          {/* Category tabs */}
          <div className="jobs-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={tab === t.key ? "on" : ""}
                onClick={() => setTab(t.key)}
                type="button"
              >
                {t.label} <span className="jobs-tab-count">{counts[t.key] || 0}</span>
              </button>
            ))}
          </div>

          {/* Role type chips */}
          <div className="jobs-role-chips">
            {ROLE_CHIPS.map((r) => (
              <button
                key={r}
                type="button"
                className={`jobs-role-chip${roleType === r ? " active" : ""}`}
                onClick={() => setRoleType((v) => (v === r ? "" : r))}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Search + sort + recency row */}
          <div className="jobs-filter-row">
            <input
              className="jobs-search"
              placeholder="Title or company…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Filter jobs"
            />
            <select
              className="jobs-select"
              value={recency}
              onChange={(e) => setRecency(e.target.value)}
              aria-label="Filter by recency"
            >
              {RECENCY_OPTIONS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <select
              className="jobs-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort jobs"
            >
              <option value="newest">Newest first</option>
              <option value="az">A → Z</option>
              <option value="company">By company</option>
            </select>
          </div>

          {/* Meta row: results count + dedup toggle + clear */}
          <div className="jobs-meta-row">
            <span className="jobs-result-count">{filtered.length} role{filtered.length !== 1 ? "s" : ""}</span>
            <label className="jobs-dedup-toggle">
              <input
                type="checkbox"
                checked={dedup}
                onChange={(e) => setDedup(e.target.checked)}
              />
              Hide duplicates
            </label>
            {activeFilters > 0 && (
              <button type="button" className="jobs-clear-btn" onClick={clearAll}>
                Clear filters
              </button>
            )}
          </div>
        </>
      )}

      {note && !jobs.length && <p className="form-sub">{note}</p>}
      {!jobs.length && !note && <p className="form-sub">No open roles right now — check back soon.</p>}
      {jobs.length > 0 && filtered.length === 0 && (
        <p className="form-sub">No jobs match — <button type="button" className="link-btn" onClick={clearAll}>clear filters</button></p>
      )}

      <div className="feed-list">
        {filtered.map((j) => (
          <div key={j.id} className={`feed-row${j.sponsored ? " feed-row-sponsored" : ""}`}>
            <Link className="feed-row-body" href={`/jobs/${jobUrlId(j.id)}`}>
              <div className="feed-row-name">
                {j.title}
                {j.sponsored && <span className="sponsored-badge">Sponsored</span>}
              </div>
              <div className="feed-row-sub">
                {j.company} · {j.location} · {timeAgo(j.postedAt)}
              </div>
            </Link>
            <button
              type="button"
              className="job-share-btn"
              onClick={() => shareJob(j)}
              aria-label={`Share ${j.title} at ${j.company}`}
              title="Share this job"
            >
              {sharedId === j.id ? (
                <>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L20 6" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
                  </svg>
                  Share
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {fetchedAt && jobs.length > 0 && (
        <p className="form-sub jobs-updated">Market listings last synced {timeAgo(fetchedAt)}.</p>
      )}
    </>
  );
}
