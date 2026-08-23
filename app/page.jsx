"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { normalizeArea, domainOf, faviconUrl, colorFor, prettyName, careersUrl } from "../lib/startupUi.js";

const HYDERABAD_CENTER = { lat: 17.42, lng: 78.44 };

// Circular logo marker via same-origin API route (embeds favicon server-side).
function circleIcon(startup) {
  const domain = domainOf(startup.website);
  const params = new URLSearchParams({
    color: colorFor(startup.sector),
    initial: startup.name.charAt(0) || "?",
  });
  if (domain) params.set("domain", domain);
  return `/api/marker?${params.toString()}`;
}

// Free OSM/CARTO tiles via Leaflet — no per-load Google charge for map opens.
// Google is only used at seed time (geocoding), never in the browser.
function useLeafletMap(containerRef) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const LRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      await import("leaflet.markercluster");
      await import("leaflet.markercluster/dist/MarkerCluster.css");
      await import("leaflet.markercluster/dist/MarkerCluster.Default.css");
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      mapRef.current = L.map(containerRef.current, {
        center: [HYDERABAD_CENTER.lat, HYDERABAD_CENTER.lng],
        zoom: 12,
        zoomControl: false,
        zoomSnap: 0.25,           // allow fractional zoom levels — no hard jumps
        zoomDelta: 0.5,           // +/- buttons and dblclick step half a level
        wheelPxPerZoomLevel: 140, // less sensitive wheel/trackpad — stops over-zoom
        wheelDebounceTime: 40,
        zoomAnimation: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      // CARTO Positron — clean light basemap (same family the reference uses).
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      }).addTo(mapRef.current);
      layerRef.current = L.markerClusterGroup({
        maxClusterRadius: 46,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            className: "cluster-bubble",
            html: `<div><span>${count}</span></div>`,
            iconSize: [40, 40],
          });
        },
      }).addTo(mapRef.current);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [containerRef]);

  function setMarkers(startups, onSelect) {
    const L = LRef.current;
    if (!L || !layerRef.current) return;
    layerRef.current.clearLayers();
    startups
      .filter((s) => s.lat && s.lng)
      .forEach((s) => {
        const icon = L.divIcon({
          className: "leaf-marker",
          html: `<img src="${circleIcon(s)}" width="44" height="44" alt="" />`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        L.marker([s.lat, s.lng], { icon, title: prettyName(s.name) })
          .addTo(layerRef.current)
          .on("click", () => onSelect(s));
      });
  }

  function flyTo(lat, lng) {
    if (mapRef.current && lat && lng) {
      mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 15), { duration: 0.7 });
    }
  }

  // Pan/zoom to fit the filtered results. Without this, narrowing a filter
  // (e.g. picking one area) can leave the map showing whatever it was
  // panned/zoomed to before — the correct marker renders, just off-screen,
  // which looks like the filter returned nothing.
  function fitToMarkers(startups) {
    const L = LRef.current;
    if (!L || !mapRef.current) return;
    const coords = startups.filter((s) => s.lat && s.lng).map((s) => [s.lat, s.lng]);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      mapRef.current.flyTo(coords[0], Math.max(mapRef.current.getZoom(), 14), { duration: 0.5 });
      return;
    }
    mapRef.current.flyToBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 15, duration: 0.5 });
  }

  function invalidateSize() {
    mapRef.current?.invalidateSize({ animate: true });
  }

  return { ready, setMarkers, flyTo, fitToMarkers, invalidateSize };
}

// Custom dropdown (replaces the native <select>).
function Dropdown({ value, onChange, options, placeholder, counts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className={`dd${open ? " open" : ""}`} ref={ref}>
      <button type="button" className="dd-btn" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dd-ph"}>{value || placeholder}</span>
        <svg className="dd-caret" viewBox="0 0 24 24" width="12" height="12" fill="none">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="dd-menu" role="listbox">
          <button
            type="button"
            className={`dd-opt${!value ? " sel" : ""}`}
            onClick={() => { onChange(""); setOpen(false); }}
          >
            <span>{placeholder}</span>
            {counts && <span className="dd-opt-count">{Object.values(counts).reduce((a, b) => a + b, 0)}</span>}
          </button>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className={`dd-opt${o === value ? " sel" : ""}`}
              onClick={() => { onChange(o); setOpen(false); }}
            >
              <span>{o}</span>
              {counts && <span className="dd-opt-count">{counts[o] || 0}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LogoBadge({ startup, size = 34 }) {
  const domain = domainOf(startup.website);
  // Try a real logo (Clearbit) first, then favicon, then the initial fallback.
  const srcs = domain
    ? [`https://logo.clearbit.com/${domain}?size=128`, faviconUrl(startup.website)]
    : [];
  const [stage, setStage] = useState(0);
  useEffect(() => { setStage(0); }, [startup.website]);
  if (stage < srcs.length) {
    return (
      <img
        className="card-logo"
        src={srcs[stage]}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setStage((s) => s + 1)}
      />
    );
  }
  return (
    <div
      className="card-logo-fallback"
      style={{ width: size, height: size, background: colorFor(startup.sector) }}
    >
      {startup.name.charAt(0).toUpperCase()}
    </div>
  );
}

function DetailModal({ startup, onClose }) {
  // Enriched fields (address, careers, description) are fetched per-record here,
  // only on open — they are not part of the bulk map payload.
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (!startup) { setDetail(null); return; }
    let cancelled = false;
    fetch(`/api/startups/${startup.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [startup]);

  if (!startup) return null;
  const site = detail?.website ?? startup.website;
  const careers = detail?.careers || careersUrl(site);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="modal-head">
          <LogoBadge startup={startup} size={56} />
          <div>
            <h2 className="modal-title">{prettyName(startup.name)}</h2>
            <div className="tags">
              <span className="tag" style={{ background: "#eef2ff", color: colorFor(startup.sector) }}>
                {startup.sector}
              </span>
              <span className="tag tag-stage">{startup.fundingStage}</span>
            </div>
          </div>
        </div>
        {detail?.hiring?.active && (
          <>
            <a
              className="hiring-badge"
              href={detail.hiring.url || careers || "#"}
              target="_blank"
              rel="noreferrer"
            >
              <span className="hiring-dot" />
              Hiring now{detail.hiring.count ? ` · ${detail.hiring.count} open role${detail.hiring.count === 1 ? "" : "s"}` : ""} ↗
            </a>
            {detail.hiring.roles?.length > 0 && (
              <ul className="roles-list">
                {detail.hiring.roles.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer">{r.title} ↗</a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <p className="modal-desc">{detail ? detail.description : "…"}</p>
        {detail?.news?.[0] && (
          <a className="modal-news" href={detail.news[0].url} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M7 9h10M7 12.5h10M7 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {detail.news[0].title}
          </a>
        )}
        <div className="modal-meta">
          <span className="meta-label">Location</span>
          <span>{detail ? (detail.address || detail.area) : startup.area}</span>
        </div>
        <div className="modal-actions">
          {site ? (
            <a className="btn" href={site} target="_blank" rel="noreferrer">
              Visit website ↗
            </a>
          ) : (
            <span className="btn btn-disabled">Website N/A</span>
          )}
          {careers && (
            <a className="btn btn-ghost" href={careers} target="_blank" rel="noreferrer">
              Careers ↗
            </a>
          )}
        </div>
        <Link className="modal-claim" href={`/submit?claim=${startup.id}&name=${encodeURIComponent(startup.name)}`}>
          Is this you? Claim this listing
        </Link>
      </div>
    </div>
  );
}

function NewsletterBar() {
  const [email, setEmail] = useState("");
  const [wantsJobAlerts, setWantsJobAlerts] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | saving | done | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("saving");
    try {
      await addDoc(collection(db, "subscribers"), {
        email: email.trim(),
        wantsJobAlerts,
        createdAt: serverTimestamp(),
      });
      setStatus("done");
    } catch (err) {
      console.error("newsletter subscribe failed:", err);
      setStatus("error");
    }
  }

  if (status === "done") {
    return <div className="nl-bar nl-done">Subscribed — we'll notify you once sending is live.</div>;
  }

  return (
    <form className="nl-bar" onSubmit={handleSubmit}>
      <div className="nl-copy">
        <strong>Get notified</strong> about new Hyderabad startups &amp; jobs — sending isn't live yet, this just saves your spot.
      </div>
      <div className="nl-row">
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="btn cmd-submit" type="submit" disabled={status === "saving"}>
          {status === "saving" ? "…" : "Notify me"}
        </button>
      </div>
      <label className="nl-check">
        <input type="checkbox" checked={wantsJobAlerts} onChange={(e) => setWantsJobAlerts(e.target.checked)} />
        <span>Also alert me about new job openings</span>
      </label>
      {status === "error" && <div className="nl-error">Couldn't save — try again.</div>}
    </form>
  );
}

function StartupCard({ startup, onClick, active }) {
  return (
    <div className={`s-card${active ? " s-card-on" : ""}`} onClick={onClick}>
      <div className="s-card-head">
        <LogoBadge startup={startup} size={40} />
        <div className="s-card-id">
          <div className="s-card-name">{prettyName(startup.name)}</div>
          <div className="s-card-sub">{startup.sector} · {startup.area}</div>
        </div>
      </div>
      <div className="s-card-foot">
        <span className="s-card-meta">
          <span className="s-chip">{startup.fundingStage}</span>
          {startup.founded && <span className="s-year">{startup.founded}</span>}
        </span>
        {startup.hiring && (
          <span className="s-open">
            <span className="hiring-dot" />
            {startup.hiring.count ? `${startup.hiring.count} open` : "hiring"}
          </span>
        )}
      </div>
    </div>
  );
}

function SpotlightShelf({ startups, onSelect }) {
  if (!startups.length) return null;
  return (
    <div className="spotlight-shelf">
      <div className="spotlight-head">
        <span className="spotlight-title">🌟 Spotlight</span>
        <span className="spotlight-sub">Well-known Hyderabad startups</span>
      </div>
      <div className="spotlight-row">
        {startups.map((s) => (
          <button key={s.id} className="spotlight-card" onClick={() => onSelect(s)}>
            <LogoBadge startup={s} size={32} />
            <div className="spotlight-name">{prettyName(s.name)}</div>
            <div className="spotlight-sector">{s.sector}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const saved = localStorage.getItem("hsm-theme") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("hsm-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggle}
      title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}

export default function Page() {
  const mapContainerRef = useRef(null);
  const { ready, setMarkers, flyTo, fitToMarkers, invalidateSize } = useLeafletMap(mapContainerRef);

  const [all, setAll] = useState([]);
  const [sector, setSector] = useState("");
  const [fundingStage, setFundingStage] = useState("");
  const [area, setArea] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [hiringOnly, setHiringOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState("list"); // "list" | "areas" — what the sidebar shows

  const CURRENT_YEAR = new Date().getFullYear();

  useEffect(() => {
    fetch("/api/startups")
      .then((r) => r.json())
      .then(setAll)
      .catch(() => {});
  }, []);

  const sectors = useMemo(() => [...new Set(all.map((s) => s.sector))].sort(), [all]);
  const stages = useMemo(() => [...new Set(all.map((s) => s.fundingStage))].sort(), [all]);
  const areas = useMemo(
    () => [...new Set(all.map((s) => normalizeArea(s.area)))].sort(),
    [all]
  );
  const spotlight = useMemo(() => all.filter((s) => s.spotlight), [all]);

  const filtered = useMemo(() => {
    return all.filter((s) => {
      if (hiringOnly && !s.hiring) return false;
      if (newOnly && !(s.founded && s.founded >= CURRENT_YEAR - 2)) return false;
      if (sector && s.sector !== sector) return false;
      if (fundingStage && s.fundingStage !== fundingStage) return false;
      if (area && normalizeArea(s.area) !== area) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${s.name} ${s.area || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, sector, fundingStage, area, q, hiringOnly, newOnly]);

  // Faceted counts per dropdown: how many results each option would leave,
  // given every OTHER active filter (but not the dropdown's own selection) —
  // matches the reference site's "Dublin 47" style option counts.
  function baseFilter(s, skip) {
    if (hiringOnly && !s.hiring) return false;
    if (newOnly && !(s.founded && s.founded >= CURRENT_YEAR - 2)) return false;
    if (skip !== "sector" && sector && s.sector !== sector) return false;
    if (skip !== "stage" && fundingStage && s.fundingStage !== fundingStage) return false;
    if (skip !== "area" && area && normalizeArea(s.area) !== area) return false;
    if (q) {
      const needle = q.toLowerCase();
      const hay = `${s.name} ${s.area || ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  }
  function countsFor(skip, keyFn) {
    const counts = {};
    for (const s of all) {
      if (!baseFilter(s, skip)) continue;
      const key = keyFn(s);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }
  const sectorCounts = useMemo(() => countsFor("sector", (s) => s.sector), [all, fundingStage, area, q, hiringOnly, newOnly]);
  const stageCounts = useMemo(() => countsFor("stage", (s) => s.fundingStage), [all, sector, area, q, hiringOnly, newOnly]);
  const areaCounts = useMemo(() => countsFor("area", (s) => normalizeArea(s.area)), [all, sector, fundingStage, q, hiringOnly, newOnly]);

  const areaGroups = useMemo(() => {
    const map = new Map();
    for (const s of filtered) {
      const key = normalizeArea(s.area);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return [...map.entries()]
      .map(([name, list]) => {
        const sectorCounts = {};
        for (const s of list) sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1;
        const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([sec]) => sec);
        const withCoords = list.filter((s) => s.lat && s.lng);
        const lat = withCoords.length ? withCoords.reduce((a, s) => a + s.lat, 0) / withCoords.length : null;
        const lng = withCoords.length ? withCoords.reduce((a, s) => a + s.lng, 0) / withCoords.length : null;
        return { name, count: list.length, topSectors, lat, lng };
      })
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const hiringInView = useMemo(() => filtered.filter((s) => s.hiring).length, [filtered]);

  useEffect(() => {
    if (ready) setMarkers(filtered, openStartup);
  }, [ready, filtered]);

  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstFilterRun.current) { firstFilterRun.current = false; return; }
    fitToMarkers(filtered);
  }, [ready, sector, fundingStage, area, hiringOnly, newOnly]);

  function openStartup(s) {
    setSelected(s);
    flyTo(s.lat, s.lng);
  }

  function toggleSidebar() {
    setSidebarOpen((v) => !v);
    setTimeout(invalidateSize, 260);
  }

  const hasActiveFilters = Boolean(sector || fundingStage || area || hiringOnly || newOnly || q);

  const CAP = 150;
  const visible = filtered.slice(0, CAP);

  return (
    <div className="app">
      <header className="topnav">
        <div className="topnav-row">
          <Link href="/" className="tn-brand">
            <span className="cmd-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" fill="currentColor" />
                <circle cx="12" cy="10" r="2.6" fill="#fff" />
              </svg>
            </span>
            <span className="tn-title">
              <span className="tn-title-full">Hyderabad<b>StartupMap</b></span>
              <span className="tn-title-short">Hyd<b>Map</b></span>
            </span>
          </Link>

          <div className="tn-search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input placeholder="Search startups, sectors, areas…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <nav className="tn-links">
            <Link href="/feed">Feed</Link>
            <Link href="/gccs">GCCs</Link>
            <Link href="/news">News</Link>
            <Link href="/insights">Insights</Link>
            <Link href="/newsletter">Newsletter</Link>
          </nav>

          <ThemeToggle />

          <Link className="btn cmd-submit tn-cta" href="/submit">Submit</Link>
        </div>

        <div className="topnav-filters filter-pills">
          <button
            type="button"
            className="sb-toggle-pill"
            onClick={toggleSidebar}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M9 3v18" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>{sidebarOpen ? "Hide list" : "Show list"}</span>
          </button>
          <Dropdown value={sector} onChange={setSector} options={sectors} placeholder="All sectors" counts={sectorCounts} />
          <Dropdown value={fundingStage} onChange={setFundingStage} options={stages} placeholder="All stages" counts={stageCounts} />
          <Dropdown value={area} onChange={setArea} options={areas} placeholder="All areas" counts={areaCounts} />
          <button
            className={`hiring-toggle${hiringOnly ? " on" : ""}`}
            onClick={() => setHiringOnly((v) => !v)}
            title="Detected via public job boards (Greenhouse, Lever, Ashby, Recruitee, Workable) or self-reported."
          >
            <span className="hiring-dot" />
            Hiring now
          </button>
          <button
            className={`hiring-toggle${newOnly ? " on" : ""}`}
            onClick={() => setNewOnly((v) => !v)}
            title="Founded in the last 2 years."
          >
            New
          </button>
          {hasActiveFilters && (
            <button
              className="hiring-toggle"
              style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
              onClick={() => {
                setSector("");
                setFundingStage("");
                setArea("");
                setHiringOnly(false);
                setNewOnly(false);
                setQ("");
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      </header>

      <div className={`app-body${sidebarOpen ? "" : " sidebar-closed"}`}>
        <aside className="sidebar">
          <div className="sb-inner">
            <div className="sb-head">
              <h2 className="sb-city">Hyderabad Startups</h2>
              <div className="sb-stat">
                <strong>{filtered.length.toLocaleString()}</strong> companies
                {hiringInView > 0 && <span className="sb-hiring"> · {hiringInView} hiring now</span>}
              </div>
              <p className="sb-desc">Filter startups by sector, funding stage, and open job roles on the map.</p>
              <div className="sb-tabs">
                <button className={sidebarView === "list" ? "on" : ""} onClick={() => setSidebarView("list")}>Startups</button>
                <button className={sidebarView === "areas" ? "on" : ""} onClick={() => setSidebarView("areas")}>Areas</button>
              </div>
            </div>
            {sidebarView === "list" && !hasActiveFilters && (
              <SpotlightShelf startups={spotlight} onSelect={openStartup} />
            )}
            {sidebarView === "list" ? (
              <div className="sb-list">
                {visible.map((s) => (
                  <StartupCard key={s.id} startup={s} active={selected?.id === s.id} onClick={() => openStartup(s)} />
                ))}
                {filtered.length > CAP && (
                  <div className="sb-more">Showing {CAP} of {filtered.length.toLocaleString()} — search or filter to narrow.</div>
                )}
                {filtered.length === 0 && <div className="sb-empty">No startups match your filters.</div>}
              </div>
            ) : (
              <div className="sb-list">
                {areaGroups.map((g) => (
                  <button
                    key={g.name}
                    className="area-card"
                    onClick={() => {
                      setArea(g.name);
                      setSidebarView("list");
                      if (g.lat && g.lng) flyTo(g.lat, g.lng);
                    }}
                  >
                    <div className="area-card-top">
                      <span className="area-card-name">{g.name}</span>
                      <span className="area-card-count">{g.count}</span>
                    </div>
                    <div className="tags">
                      {g.topSectors.map((sec) => <span key={sec} className="tag">{sec}</span>)}
                    </div>
                  </button>
                ))}
                {areaGroups.length === 0 && <div className="sb-empty">No areas match your filters.</div>}
              </div>
            )}
          </div>
          <NewsletterBar />
        </aside>

        <main className="map-area">
          <div ref={mapContainerRef} className="map-full" />
        </main>
      </div>

      <div className="mobile-view-toggle">
        <button
          type="button"
          className={`m-vt-btn${!sidebarOpen ? " active" : ""}`}
          onClick={() => {
            setSidebarOpen(false);
            setTimeout(invalidateSize, 260);
          }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          Map
        </button>
        <button
          type="button"
          className={`m-vt-btn${sidebarOpen ? " active" : ""}`}
          onClick={() => setSidebarOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          List ({filtered.length})
        </button>
      </div>

      <DetailModal startup={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
