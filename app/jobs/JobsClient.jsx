"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import StartupLogo from "../components/StartupLogo.jsx";
import { jobUrlId } from "../../lib/jobs-seo.js";
import {
  AREA_OPTIONS,
  EXPERIENCE_OPTIONS,
  ROLE_OPTIONS,
  SECTOR_OPTIONS,
  areaLabel,
  experienceLabel,
  inferArea,
  inferExperienceLevel,
  jobExperienceDisplay,
  roleFacetKey,
  sectorFacetKey,
} from "../../lib/job-facets.js";

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

const TABS = [
  { key: "all", label: "All" },
  { key: "startup", label: "Startups" },
  { key: "gcc", label: "GCCs" },
  { key: "other", label: "Enterprise & other" },
];

function tabMatches(category, tab) {
  if (tab === "all") return true;
  if (tab === "other") return category === "other" || category === "enterprise";
  return category === tab;
}

function categoryLabel(category) {
  switch (category) {
    case "startup":
      return "Startup";
    case "gcc":
      return "GCC";
    case "enterprise":
      return "Enterprise";
    default:
      return "Other";
  }
}

const RECENCY_OPTIONS = [
  { key: "all", label: "Any time" },
  { key: "today", label: "Today", ms: 86_400_000 },
  { key: "week", label: "This week", ms: 7 * 86_400_000 },
  { key: "month", label: "This month", ms: 30 * 86_400_000 },
];

function paramOrEmpty(params, key) {
  const v = params.get(key);
  return v && v.trim() ? v.trim() : "";
}

export default function JobsClient({ initialJobs = [], fetchedAt = null, note = null, initialQuery = "" }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [jobs] = useState(initialJobs);

  const [q, setQ] = useState(() => paramOrEmpty(searchParams, "q") || initialQuery || "");
  const [tab, setTab] = useState("all");
  const [roleType, setRoleType] = useState(() => paramOrEmpty(searchParams, "role"));
  const [level, setLevel] = useState(() => paramOrEmpty(searchParams, "level"));
  const [area, setArea] = useState(() => paramOrEmpty(searchParams, "area"));
  const [sector, setSector] = useState(() => paramOrEmpty(searchParams, "sector"));
  const [recency, setRecency] = useState(() => paramOrEmpty(searchParams, "when") || "all");
  const [sortBy, setSortBy] = useState("newest");
  const [dedup, setDedup] = useState(true);
  const [sharedId, setSharedId] = useState(null);

  // Seed search from ?company= (legacy) once
  useEffect(() => {
    const company = searchParams.get("company");
    if (company && !searchParams.get("q")) {
      setQ(company.replace(/-/g, " "));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncUrl = useCallback(
    (next) => {
      const params = new URLSearchParams();
      // Preserve company banner param if present
      const company = searchParams.get("company");
      if (company) params.set("company", company);

      if (next.q?.trim()) params.set("q", next.q.trim());
      if (next.roleType) params.set("role", next.roleType);
      if (next.level) params.set("level", next.level);
      if (next.area) params.set("area", next.area);
      if (next.sector) params.set("sector", next.sector);
      if (next.recency && next.recency !== "all") params.set("when", next.recency);

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  function updateFilters(patch) {
    const next = {
      q,
      roleType,
      level,
      area,
      sector,
      recency,
      ...patch,
    };
    if ("q" in patch) setQ(patch.q);
    if ("roleType" in patch) setRoleType(patch.roleType);
    if ("level" in patch) setLevel(patch.level);
    if ("area" in patch) setArea(patch.area);
    if ("sector" in patch) setSector(patch.sector);
    if ("recency" in patch) setRecency(patch.recency);
    // Debounce search query in URL; other facets sync immediately
    if ("q" in patch && Object.keys(patch).length === 1) return;
    syncUrl(next);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      syncUrl({ q, roleType, level, area, sector, recency });
    }, 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  async function shareJob(j) {
    const site = `${window.location.origin}/jobs/${jobUrlId(j.id)}`;
    const text = `${j.title} at ${j.company} — ${j.location}\n${site}\nApply: ${j.url}`;
    const data = { title: `${j.title} at ${j.company}`, text, url: site };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
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

  const enriched = useMemo(() => {
    return dedupedJobs.map((j) => ({
      ...j,
      _role: roleFacetKey(j.title),
      _level: inferExperienceLevel(j.title, j.description),
      _area: inferArea(j.area || j.location),
      _sector: sectorFacetKey(j.sector),
    }));
  }, [dedupedJobs]);

  const counts = useMemo(() => {
    const c = { all: enriched.length, startup: 0, gcc: 0, other: 0 };
    for (const j of enriched) {
      if (j.category === "startup") c.startup += 1;
      else if (j.category === "gcc") c.gcc += 1;
      else c.other += 1; // enterprise + other
    }
    return c;
  }, [enriched]);

  const facetPool = useMemo(() => {
    return enriched.filter((j) => tabMatches(j.category, tab));
  }, [enriched, tab]);

  const facetCounts = useMemo(() => {
    const roles = Object.fromEntries(ROLE_OPTIONS.map((r) => [r, 0]));
    const levels = Object.fromEntries(EXPERIENCE_OPTIONS.map((o) => [o.key, 0]));
    const areas = Object.fromEntries(AREA_OPTIONS.map((o) => [o.key, 0]));
    const sectors = Object.fromEntries(SECTOR_OPTIONS.map((o) => [o.key, 0]));
    for (const j of facetPool) {
      roles[j._role] = (roles[j._role] || 0) + 1;
      if (j._level) levels[j._level] = (levels[j._level] || 0) + 1;
      areas[j._area] = (areas[j._area] || 0) + 1;
      sectors[j._sector] = (sectors[j._sector] || 0) + 1;
    }
    return { roles, levels, areas, sectors };
  }, [facetPool]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = facetPool;

    if (roleType) list = list.filter((j) => j._role === roleType);
    if (level) list = list.filter((j) => j._level === level);
    if (area) list = list.filter((j) => j._area === area);
    if (sector) list = list.filter((j) => j._sector === sector);

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
    else if (sortBy === "company") {
      list = [...list].sort((a, b) => (a.company || "").localeCompare(b.company || ""));
    }

    return list;
  }, [facetPool, roleType, level, area, sector, recency, q, sortBy]);

  const activeFilterParts = [];
  if (roleType) activeFilterParts.push(`Role: ${roleType}`);
  if (level) activeFilterParts.push(`Level: ${experienceLabel(level) || level}`);
  if (area) activeFilterParts.push(`Area: ${areaLabel(area) || area}`);
  if (sector) {
    const lab = SECTOR_OPTIONS.find((s) => s.key === sector)?.label || sector;
    activeFilterParts.push(`Sector: ${lab}`);
  }
  if (recency !== "all") {
    activeFilterParts.push(RECENCY_OPTIONS.find((r) => r.key === recency)?.label || recency);
  }
  if (q.trim()) activeFilterParts.push(`Search: ${q.trim()}`);

  function clearAll() {
    setRoleType("");
    setLevel("");
    setArea("");
    setSector("");
    setRecency("all");
    setSortBy("newest");
    setQ("");
    setTab("all");
    syncUrl({ q: "", roleType: "", level: "", area: "", sector: "", recency: "all" });
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

          <div className="jobs-filter-row">
            <input
              className="jobs-search"
              placeholder="Title or company…"
              value={q}
              onChange={(e) => updateFilters({ q: e.target.value })}
              aria-label="Filter jobs"
            />
            <select
              className="jobs-select"
              value={roleType}
              onChange={(e) => updateFilters({ roleType: e.target.value })}
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} ({facetCounts.roles[r] || 0})
                </option>
              ))}
            </select>
            <select
              className="jobs-select"
              value={level}
              onChange={(e) => updateFilters({ level: e.target.value })}
              aria-label="Filter by experience"
            >
              <option value="">All levels</option>
              {EXPERIENCE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} ({facetCounts.levels[o.key] || 0})
                </option>
              ))}
            </select>
            <select
              className="jobs-select"
              value={area}
              onChange={(e) => updateFilters({ area: e.target.value })}
              aria-label="Filter by area"
            >
              <option value="">All areas</option>
              {AREA_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} ({facetCounts.areas[o.key] || 0})
                </option>
              ))}
            </select>
            <select
              className="jobs-select"
              value={sector}
              onChange={(e) => updateFilters({ sector: e.target.value })}
              aria-label="Filter by sector"
            >
              <option value="">All sectors</option>
              {SECTOR_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} ({facetCounts.sectors[o.key] || 0})
                </option>
              ))}
            </select>
            <select
              className="jobs-select"
              value={recency}
              onChange={(e) => updateFilters({ recency: e.target.value })}
              aria-label="Filter by recency"
            >
              {RECENCY_OPTIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
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

          <div className="jobs-meta-row">
            <span className="jobs-result-count">
              {filtered.length} role{filtered.length !== 1 ? "s" : ""}
            </span>
            {activeFilterParts.length > 0 && (
              <span className="jobs-active-filters" title={activeFilterParts.join(" · ")}>
                {activeFilterParts.join(" · ")}
              </span>
            )}
            <label className="jobs-dedup-toggle">
              <input type="checkbox" checked={dedup} onChange={(e) => setDedup(e.target.checked)} />
              Hide duplicates
            </label>
            {activeFilterParts.length > 0 && (
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
        <p className="form-sub">
          No jobs match —{" "}
          <button type="button" className="link-btn" onClick={clearAll}>
            clear filters
          </button>
        </p>
      )}

      <div className="feed-list jobs-feed">
        {filtered.map((j) => {
          const expLab = jobExperienceDisplay(j) || experienceLabel(j._level);
          const roleLab = j._role && j._role !== "Other" ? j._role : null;
          const sectorLab =
            j._sector && j._sector !== "other"
              ? SECTOR_OPTIONS.find((s) => s.key === j._sector)?.label
              : j.sector && sectorFacetKey(j.sector) !== "other"
                ? j.sector
                : null;
          const place = j.area || (j._area && j._area !== "hyderabad" ? areaLabel(j._area) : null) || j.location;
          const typeLab = categoryLabel(j.category);
          const logoWebsite = j.website || j.boardUrl || null;
          return (
            <div key={j.id} className={`feed-row jobs-feed-row${j.sponsored ? " feed-row-sponsored" : ""}`}>
              <StartupLogo
                name={j.company || "?"}
                website={logoWebsite}
                logoUrl={j.logoUrl}
                sector={j.sector}
                size={40}
              />
              <Link className="feed-row-body" href={`/jobs/${jobUrlId(j.id)}`}>
                <div className="feed-row-name">
                  {j.title}
                  {j.sponsored && <span className="sponsored-badge">Sponsored</span>}
                </div>
                <div className="feed-row-sub">
                  <span className="jobs-co-line">
                     {j.company}
                    <span className={`jobs-type-badge jobs-type-${j.category || "other"}`}>{typeLab}</span>
                  </span>
                  {place ? <> · {place}</> : null}
                  {j.postedAt ? <> · {timeAgo(j.postedAt)}</> : null}
                  {(roleLab || expLab || sectorLab || j.fundingStage) && (
                    <span className="jobs-row-badges">
                      {roleLab && <span className="jobs-facet-badge">{roleLab}</span>}
                      {expLab && <span className="jobs-facet-badge">{expLab}</span>}
                      {sectorLab && <span className="jobs-facet-badge">{sectorLab}</span>}
                      {j.fundingStage && <span className="jobs-facet-badge">{j.fundingStage}</span>}
                    </span>
                  )}
                </div>
              </Link>
              <button
                type="button"
                className="job-share-btn job-share-btn-quiet"
                onClick={() => shareJob(j)}
                aria-label={`Share ${j.title} at ${j.company}`}
                title={sharedId === j.id ? "Copied" : "Share"}
              >
                {sharedId === j.id ? (
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12 5 5L20 6" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {fetchedAt && jobs.length > 0 && (
        <p className="form-sub jobs-updated">Market listings last synced {timeAgo(fetchedAt)}.</p>
      )}
    </>
  );
}
