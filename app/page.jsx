"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const HYDERABAD_CENTER = { lat: 17.42, lng: 78.44 };

const TAG_COLORS = {
  AI: "#7c3aed", Fintech: "#0891b2", Edtech: "#ea580c", Healthtech: "#dc2626",
  SaaS: "#2f5bea", Gaming: "#db2777", Logistics: "#65a30d", D2C: "#c026d3",
  Deeptech: "#0d9488", Consumer: "#d97706", Other: "#64748b",
};

function domainOf(website) {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function faviconUrl(website) {
  const domain = domainOf(website);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
}

function colorFor(sector) {
  return TAG_COLORS[sector] || TAG_COLORS.Other;
}

// Registry names are legal ALL-CAPS ("X PRIVATE LIMITED"). Clean for display;
// leave already-branded names (Zenoti, RED.Health) untouched.
function prettyName(name) {
  let n = name
    .replace(/\(opc\)/gi, "")
    .replace(/[\s,]+(private limited|pvt\.?\s*ltd\.?|pvt\.?|ltd\.?|llp|limited)\.?$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const letters = name.replace(/[^A-Za-z]/g, "");
  const upper = name.replace(/[^A-Z]/g, "");
  if (letters && upper.length / letters.length > 0.7) {
    n = n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // Re-uppercase common acronyms that title-casing lower-cased.
  n = n.replace(/\b(it|ai|erp|hr|bpo|kpo|api|iot|ev|ml|crm|ui|ux|ar|vr|saas|b2b|b2c|hvac|led|ivf)\b/gi,
    (m) => m.toUpperCase());
  return n;
}

function careersUrl(website) {
  const domain = domainOf(website);
  if (!domain) return null;
  return `https://${domain}/careers`;
}

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

  return { ready, setMarkers, flyTo };
}

// Custom dropdown (replaces the native <select>).
function Dropdown({ value, onChange, options, placeholder }) {
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
            {placeholder}
          </button>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className={`dd-opt${o === value ? " sel" : ""}`}
              onClick={() => { onChange(o); setOpen(false); }}
            >
              {o}
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
          <a
            className="hiring-badge"
            href={detail.hiring.url || careers || "#"}
            target="_blank"
            rel="noreferrer"
          >
            <span className="hiring-dot" />
            Hiring now{detail.hiring.count ? ` · ${detail.hiring.count} open role${detail.hiring.count === 1 ? "" : "s"}` : ""} ↗
          </a>
        )}
        <p className="modal-desc">{detail ? detail.description : "…"}</p>
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
      </div>
    </div>
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

export default function Page() {
  const mapContainerRef = useRef(null);
  const { ready, setMarkers, flyTo } = useLeafletMap(mapContainerRef);

  const [all, setAll] = useState([]);
  const [sector, setSector] = useState("");
  const [fundingStage, setFundingStage] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [hiringOnly, setHiringOnly] = useState(false);

  useEffect(() => {
    // Public map reads ONLY the local dataset (in code) — never Firestore,
    // so map opens don't burn Firestore's read quota. Approved submissions
    // are written into startups.json by the admin approve step.
    fetch("/api/startups")
      .then((r) => r.json())
      .then(setAll)
      .catch(() => {});
  }, []);

  const sectors = useMemo(() => [...new Set(all.map((s) => s.sector))].sort(), [all]);
  const stages = useMemo(() => [...new Set(all.map((s) => s.fundingStage))].sort(), [all]);

  const filtered = useMemo(() => {
    return all.filter((s) => {
      if (hiringOnly && !s.hiring) return false;
      if (sector && s.sector !== sector) return false;
      if (fundingStage && s.fundingStage !== fundingStage) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${s.name} ${s.area || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, sector, fundingStage, q, hiringOnly]);

  const hiringInView = useMemo(() => filtered.filter((s) => s.hiring).length, [filtered]);

  useEffect(() => {
    if (ready) setMarkers(filtered, openStartup);
  }, [ready, filtered]);

  function openStartup(s) {
    setSelected(s);
    flyTo(s.lat, s.lng);
  }

  const CAP = 150;
  const visible = filtered.slice(0, CAP);

  return (
    <div className="app">
      <header className="topnav">
        <Link href="/" className="tn-brand">
          <span className="cmd-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
              <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" fill="currentColor" />
              <circle cx="12" cy="10" r="2.6" fill="#fff" />
            </svg>
          </span>
          <span className="tn-title">Hyderabad<b>StartupMap</b></span>
        </Link>

        <div className="tn-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input placeholder="Search startups, sectors, areas…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <Link className="btn cmd-submit tn-cta" href="/submit">Submit a startup</Link>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sb-head">
            <h2 className="sb-city">Hyderabad</h2>
            <div className="sb-stat">
              <strong>{filtered.length.toLocaleString()}</strong> startups
              {hiringInView > 0 && <span className="sb-hiring"> · {hiringInView} hiring now</span>}
            </div>
            <p className="sb-desc">Explore Hyderabad startups — filter by sector, stage and open roles on the map.</p>
          </div>
          <div className="sb-list">
            {visible.map((s) => (
              <StartupCard key={s.id} startup={s} active={selected?.id === s.id} onClick={() => openStartup(s)} />
            ))}
            {filtered.length > CAP && (
              <div className="sb-more">Showing {CAP} of {filtered.length.toLocaleString()} — search or filter to narrow.</div>
            )}
            {filtered.length === 0 && <div className="sb-empty">No startups match your filters.</div>}
          </div>
        </aside>

        <main className="map-area">
          <div className="filter-pills">
            <Dropdown value={sector} onChange={setSector} options={sectors} placeholder="All sectors" />
            <Dropdown value={fundingStage} onChange={setFundingStage} options={stages} placeholder="All stages" />
            <button
              className={`hiring-toggle${hiringOnly ? " on" : ""}`}
              onClick={() => setHiringOnly((v) => !v)}
              title="Show only startups with open roles"
            >
              <span className="hiring-dot" />
              Hiring now
            </button>
          </div>
          <div ref={mapContainerRef} className="map-full" />
        </main>
      </div>

      <DetailModal startup={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
