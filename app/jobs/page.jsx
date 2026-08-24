"use client";

import { useEffect, useMemo, useState } from "react";
import SiteNav from "../components/SiteNav.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "startup", label: "Startups" },
  { key: "gcc", label: "GCCs" },
  { key: "other", label: "Other Hyderabad jobs" },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [sharedId, setSharedId] = useState(null);

  async function shareJob(j) {
    const site = `${window.location.origin}/jobs`;
    const text = `${j.title} at ${j.company} — ${j.location}\nApply: ${j.url}\n\nMore Hyderabad startup jobs → ${site}`;
    const data = { title: `${j.title} at ${j.company}`, text, url: j.url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return; // user dismissed the sheet
    }
    // Fallback for desktop / no Web Share: copy the shareable text.
    try {
      await navigator.clipboard.writeText(text);
      setSharedId(j.id);
      setTimeout(() => setSharedId((cur) => (cur === j.id ? null : cur)), 1600);
    } catch {
      window.prompt("Copy this to share:", text);
    }
  }

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => { setJobs(d.jobs || []); setFetchedAt(d.fetchedAt); setNote(d.note); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: jobs.length, startup: 0, gcc: 0, other: 0 };
    for (const j of jobs) c[j.category] = (c[j.category] || 0) + 1;
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    let list = tab === "all" ? jobs : jobs.filter((j) => j.category === tab);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((j) => j.title?.toLowerCase().includes(needle) || j.company?.toLowerCase().includes(needle));
    }
    return list;
  }, [jobs, q, tab]);

  return (
    <div className="page-with-nav">
      <SiteNav active="jobs" />
      <div className="feed-page">
      <div className="feed-head">
        <h1>Hyderabad tech jobs</h1>
        <p className="form-sub">
          Real open roles pulled straight from startups' own career pages, mixed with the broader
          Hyderabad IT market via Adzuna (a licensed job aggregator — not scraped from LinkedIn/Naukri,
          which their terms don't allow).
          {fetchedAt && ` Adzuna last updated ${timeAgo(fetchedAt)}.`}
        </p>
        {note && !jobs.length && <p className="form-sub">{note}</p>}
      </div>

      {jobs.length > 0 && (
        <>
          <div className="jobs-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={tab === t.key ? "on" : ""}
                onClick={() => setTab(t.key)}
              >
                {t.label} <span className="jobs-tab-count">{counts[t.key] || 0}</span>
              </button>
            ))}
          </div>
          <input
            className="jobs-search"
            placeholder="Filter by title or company…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </>
      )}

      {loading && <LoadingScreen label="Fetching today's openings…" />}
      {!loading && jobs.length > 0 && filtered.length === 0 && (
        <p className="form-sub">No jobs match this filter.</p>
      )}

      <div className="feed-list">
        {filtered.map((j) => (
          <div key={j.id} className={`feed-row${j.sponsored ? " feed-row-sponsored" : ""}`}>
            <a className="feed-row-body" href={j.url} target="_blank" rel="noreferrer">
              <div className="feed-row-name">
                {j.title}
                {j.sponsored && <span className="sponsored-badge">Sponsored</span>}
              </div>
              <div className="feed-row-sub">{j.company} · {j.location} · {timeAgo(j.postedAt)}</div>
            </a>
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
      </div>
    </div>
  );
}
