"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => { setJobs(d.jobs || []); setFetchedAt(d.fetchedAt); setNote(d.note); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return jobs;
    const needle = q.toLowerCase();
    return jobs.filter((j) => j.title?.toLowerCase().includes(needle) || j.company?.toLowerCase().includes(needle));
  }, [jobs, q]);

  return (
    <div className="feed-page">
      <div className="feed-head">
        <Link href="/" className="feed-back-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to map
        </Link>
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
        <input
          className="jobs-search"
          placeholder="Filter by title or company…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}

      {loading && <p className="form-sub">Loading…</p>}

      <div className="feed-list">
        {filtered.map((j) => (
          <a key={j.id} className="feed-row" href={j.url} target="_blank" rel="noreferrer">
            <div className="feed-row-body">
              <div className="feed-row-name">{j.title}</div>
              <div className="feed-row-sub">{j.company} · {j.location} · {timeAgo(j.postedAt)}</div>
            </div>
            <span className={`job-source-tag ${j.source === "careers" ? "job-source-careers" : "job-source-adzuna"}`}>
              {j.source === "careers" ? "Careers page" : "Adzuna"}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
