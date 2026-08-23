"use client";

import { useEffect, useMemo, useState } from "react";
import SiteNav from "../components/SiteNav.jsx";

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

      {loading && <p className="form-sub">Loading…</p>}
      {!loading && jobs.length > 0 && filtered.length === 0 && (
        <p className="form-sub">No jobs match this filter.</p>
      )}

      <div className="feed-list">
        {filtered.map((j) => (
          <a key={j.id} className="feed-row" href={j.url} target="_blank" rel="noreferrer">
            <div className="feed-row-body">
              <div className="feed-row-name">{j.title}</div>
              <div className="feed-row-sub">{j.company} · {j.location} · {timeAgo(j.postedAt)}</div>
            </div>
          </a>
        ))}
      </div>
      </div>
    </div>
  );
}
