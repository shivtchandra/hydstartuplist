"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import StartupLogo from "./StartupLogo.jsx";
import { jobUrlId } from "../../lib/jobs-seo.js";
import { roleFacetKey } from "../../lib/job-facets.js";
import { capEmployerShare, employerShareKey } from "../../lib/opportunities.js";

function timeAgo(iso) {
  if (!iso) return "";
  const hrs = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const BANDS = [
  { key: "all", label: "All" },
  { key: "intern", label: "Intern & fresher" },
  { key: "junior", label: "Junior (0–2y)" },
];

/**
 * Filtering runs client-side over the full server-rendered list so the page stays
 * static and every role is still in the HTML for crawlers.
 */
export default function FresherJobsList({ jobs }) {
  const [band, setBand] = useState("all");
  const [role, setRole] = useState("all");
  const [expanded, setExpanded] = useState(() => new Set());

  const enriched = useMemo(
    () => jobs.map((j) => ({ ...j, _role: roleFacetKey(j.title) })),
    [jobs]
  );

  const bandCounts = useMemo(() => {
    const counts = { all: enriched.length, intern: 0, junior: 0 };
    for (const j of enriched) if (counts[j.level] != null) counts[j.level] += 1;
    return counts;
  }, [enriched]);

  const roleCounts = useMemo(() => {
    const pool = band === "all" ? enriched : enriched.filter((j) => j.level === band);
    const counts = new Map();
    for (const j of pool) counts.set(j._role, (counts.get(j._role) || 0) + 1);
    // "Other" is a catch-all, so it sorts last however big it gets.
    return [...counts.entries()].sort((a, b) => {
      if ((a[0] === "Other") !== (b[0] === "Other")) return a[0] === "Other" ? 1 : -1;
      return b[1] - a[1] || a[0].localeCompare(b[0]);
    });
  }, [enriched, band]);

  const matched = useMemo(() => {
    let list = enriched;
    if (band !== "all") list = list.filter((j) => j.level === band);
    if (role !== "all") list = list.filter((j) => j._role === role);
    return list;
  }, [enriched, band, role]);

  // Capping after the filters means the three rows kept are the three relevant to the
  // current band and role, not whichever three happened to come first overall.
  const visible = useMemo(
    () => capEmployerShare(matched, 3, (key) => expanded.has(key)),
    [matched, expanded]
  );

  function pickBand(key) {
    setBand(key);
    setRole("all");
    setExpanded(new Set());
  }

  function expand(key) {
    setExpanded((prev) => new Set(prev).add(key));
  }

  return (
    <>
      <div className="fresher-filters">
        <div className="fresher-seg" role="group" aria-label="Experience band">
          {BANDS.map((b) => (
            <button
              key={b.key}
              type="button"
              className={`fresher-seg-btn${band === b.key ? " is-active" : ""}`}
              aria-pressed={band === b.key}
              onClick={() => pickBand(b.key)}
            >
              {b.label} <span className="fresher-seg-count">{bandCounts[b.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {roleCounts.length > 1 && (
          <div className="fresher-chips" role="group" aria-label="Role type">
            <button
              type="button"
              className={`fresher-chip${role === "all" ? " is-active" : ""}`}
              aria-pressed={role === "all"}
              onClick={() => setRole("all")}
            >
              All roles
            </button>
            {roleCounts.map(([key, count]) => (
              <button
                key={key}
                type="button"
                className={`fresher-chip${role === key ? " is-active" : ""}`}
                aria-pressed={role === key}
                onClick={() => setRole(key)}
              >
                {key} <span className="fresher-seg-count">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="form-sub fresher-count" role="status">
        {`Showing ${visible.length} of ${enriched.length} role${enriched.length === 1 ? "" : "s"}.`}
      </p>

      {!visible.length && (
        <p className="form-sub">
          Nothing in that combination right now.{" "}
          <button type="button" className="link-btn" onClick={() => pickBand("all")}>
            Show all fresher roles
          </button>
        </p>
      )}

      <div className="feed-list jobs-feed">
        {visible.map((j) => {
          const place = j.area || j.location;
          const bandLabel = j.level === "intern" ? "Intern / fresher" : "Junior";
          return (
            <Fragment key={j.id}>
            <div className="feed-row jobs-feed-row">
              <StartupLogo
                name={j.company || "?"}
                website={j.website || j.boardUrl || null}
                logoUrl={j.logoUrl}
                sector={j.sector}
                size={40}
              />
              <Link className="feed-row-body" href={`/jobs/${jobUrlId(j.id)}`}>
                <div className="feed-row-name">
                  {j.title}
                  {j.openings > 1 && (
                    <span className="fresher-openings">{j.openings} openings</span>
                  )}
                </div>
                <div className="feed-row-sub">
                  <span className="jobs-co-line">{j.company}</span>
                  {place ? <> · {place}</> : null}
                  {j.postedAt ? <> · {timeAgo(j.postedAt)}</> : null}
                  <span className="jobs-row-badges">
                    <span className="jobs-facet-badge">{bandLabel}</span>
                    {j._role !== "Other" && <span className="jobs-facet-badge">{j._role}</span>}
                  </span>
                </div>
              </Link>
            </div>
            {j.moreAtCompany && (
              <button
                type="button"
                className="fresher-more-company"
                onClick={() => expand(j.moreAtCompany.key)}
              >
                {`+${j.moreAtCompany.count} more role${
                  j.moreAtCompany.count === 1 ? "" : "s"
                } at ${j.moreAtCompany.company}`}
              </button>
            )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
