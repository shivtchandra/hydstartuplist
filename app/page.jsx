"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { normalizeArea, domainOf, hostnameOf, logoSrcs, colorFor, prettyName, careersUrl } from "../lib/startupUi.js";
import MobileTabBar from "./components/MobileTabBar.jsx";

const HYDERABAD_CENTER = { lat: 17.42, lng: 78.44 };

// Circular logo marker via same-origin API route (embeds favicon server-side).
function circleIcon(startup) {
  const domain = hostnameOf(startup.website) || domainOf(startup.website);
  const params = new URLSearchParams({
    color: colorFor(startup.sector),
    initial: startup.name.charAt(0) || "?",
  });
  if (domain) params.set("domain", domain);
  if (startup.logoUrl) params.set("logoUrl", startup.logoUrl);
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
    // Sponsored featured pins render above free pins (higher z-index) with a ring.
    const ordered = [...startups.filter((s) => s.lat && s.lng)].sort(
      (a, b) => Number(!!b.sponsored) - Number(!!a.sponsored)
    );
    ordered.forEach((s) => {
        const featured = !!s.sponsored;
        const size = featured ? 52 : 44;
        const icon = L.divIcon({
          className: `leaf-marker${featured ? " leaf-marker-sponsored" : ""}`,
          html: featured
            ? `<div class="pin-sponsored-ring"><img src="${circleIcon(s)}" width="44" height="44" alt="" /><span class="pin-sponsored-label">Sponsored</span></div>`
            : `<img src="${circleIcon(s)}" width="44" height="44" alt="" />`,
          iconSize: [size, featured ? 64 : size],
          iconAnchor: [size / 2, size / 2],
        });
        L.marker([s.lat, s.lng], {
          icon,
          title: prettyName(s.name),
          zIndexOffset: featured ? 600 : 0,
        })
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
  const srcs = logoSrcs(startup.website, startup.logoUrl);
  const [stage, setStage] = useState(0);
  useEffect(() => { setStage(0); }, [startup.website, startup.logoUrl]);
  if (stage < srcs.length) {
    return (
      <img
        className="card-logo"
        src={srcs[stage]}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 16 && e.currentTarget.naturalHeight <= 16) {
            setStage((s) => s + 1);
          }
        }}
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
            <h2 className="modal-title">
              {prettyName(startup.name)}
              {(startup.sponsored || detail?.sponsored) && (
                <span className="sponsored-badge">Sponsored</span>
              )}
            </h2>
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

function NewsletterBar({ onDismiss }) {
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
      <button type="button" className="promo-dismiss nl-dismiss" onClick={onDismiss} aria-label="Hide newsletter signup">
        x
      </button>
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
    <div className={`s-card${active ? " s-card-on" : ""}${startup.sponsored ? " s-card-sponsored" : ""}`} onClick={onClick}>
      <div className="s-card-head">
        <LogoBadge startup={startup} size={40} />
        <div className="s-card-id">
          <div className="s-card-name">
            {prettyName(startup.name)}
            {startup.sponsored && <span className="sponsored-badge">Sponsored</span>}
          </div>
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

/** Paid featured inventory — live Sponsored pins + honest Available placeholders. */
function SponsoredShelf({ startups, available = 0, cta, onSelect }) {
  const open = Math.max(0, available);
  if (!startups.length && open <= 0) return null;
  const href = cta?.ctaHref || "/feature";
  const label = cta?.ctaLabel || "Get featured";
  const filled = startups.length;
  const max = filled + open;
  const shownOpen = Math.min(open, 3);
  return (
    <div className="spotlight-shelf sponsored-shelf">
      <div className="spotlight-head">
        <span className="spotlight-title">Featured</span>
        <span className="spotlight-sub">
          Limited featured pins · {filled}/{max || "—"} filled
          {open > 0 ? ` · ${open} open` : ""}
        </span>
      </div>
      <div className="spotlight-row">
        {startups.map((s) => (
          <button key={s.id} type="button" className="spotlight-card spotlight-card-sponsored" onClick={() => onSelect(s)}>
            <LogoBadge startup={s} size={32} />
            <div className="spotlight-name">{prettyName(s.name)}</div>
            <div className="spotlight-sector"><span className="sponsored-badge">Sponsored</span></div>
          </button>
        ))}
        {Array.from({ length: shownOpen }, (_, i) => (
          <Link
            key={`avail-${i}`}
            href={href}
            className="spotlight-card spotlight-card-available"
            title="Featured pin available"
          >
            <span className="avail-slot-mark" aria-hidden="true">+</span>
            <div className="spotlight-name">Your startup here</div>
            <div className="spotlight-sector">{label}</div>
          </Link>
        ))}
      </div>
      <p className="sponsored-shelf-note">
        Basic map listings stay free. Featured pins get a Sponsored badge and priority on the map.
      </p>
    </div>
  );
}

/** Subtle map-sidebar chrome for paid inventory (from placements chromeSlots). */
function FeaturedPartnerStrip({ chrome, onDismiss }) {
  if (!chrome) return null;
  const href = chrome.ctaHref || "/feature";
  return (
    <div className={`featured-partner-strip${chrome.mode === "available" ? " is-available" : ""}`}>
      <button type="button" className="promo-dismiss fps-dismiss" onClick={onDismiss} aria-label="Hide featured partner promo">
        x
      </button>
      <div className="fps-copy">
        <span className="fps-kicker">Featured partner</span>
        <strong className="fps-headline">{chrome.headline || "Feature this pin"}</strong>
        {chrome.body ? <span className="fps-body">{chrome.body}</span> : null}
      </div>
      <Link className="fps-cta" href={href}>
        {chrome.ctaLabel || "Reserve a spot"}
      </Link>
    </div>
  );
}

/**
 * Always-on Featured inventory on the map pane — survives sidebar/list closed.
 * Collapsed pill keeps sellable signal; expands for live pins + open slots.
 */
function MapFeaturedChrome({ startups, available = 0, cta, onSelect, preferOpen = false }) {
  const open = Math.max(0, available);
  const [expanded, setExpanded] = useState(preferOpen);
  useEffect(() => {
    if (preferOpen) setExpanded(true);
  }, [preferOpen]);
  if (!startups.length && open <= 0) return null;

  const href = cta?.ctaHref || "/feature";
  const label = cta?.ctaLabel || "Get featured";
  const filled = startups.length;
  const max = filled + open;
  const shownOpen = Math.min(open, 2);
  const peek = startups.slice(0, 3);

  return (
    <div
      className={`map-featured-chrome${expanded ? " is-expanded" : ""}${open > 0 ? " has-open" : ""}`}
      role="region"
      aria-label="Featured map placements"
    >
      <button
        type="button"
        className="mfc-pill"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="mfc-pill-mark" aria-hidden="true" />
        <span className="mfc-pill-title">Featured</span>
        {peek.length > 0 && (
          <span className="mfc-peek" aria-hidden="true">
            {peek.map((s) => (
              <span key={s.id} className="mfc-peek-logo">
                <LogoBadge startup={s} size={18} />
              </span>
            ))}
          </span>
        )}
        <span className="mfc-pill-meta">
          {open > 0 ? `${open} open` : `${filled}/${max || filled} filled`}
        </span>
        <span className="mfc-caret" aria-hidden="true">{expanded ? "▾" : "▴"}</span>
      </button>

      {expanded && (
        <div className="mfc-panel">
          <div className="mfc-head">
            <span className="mfc-sub">
              Limited pins · {filled}/{max || "—"} filled
              {open > 0 ? ` · ${open} open` : ""}
            </span>
            <Link className="mfc-cta" href={href}>
              {label}
            </Link>
          </div>
          <div className="mfc-row">
            {startups.map((s) => (
              <button
                key={s.id}
                type="button"
                className="mfc-chip mfc-chip-live"
                onClick={() => onSelect(s)}
                title={prettyName(s.name)}
              >
                <LogoBadge startup={s} size={28} />
                <span className="mfc-chip-name">{prettyName(s.name)}</span>
                <span className="sponsored-badge">Sponsored</span>
              </button>
            ))}
            {Array.from({ length: shownOpen }, (_, i) => (
              <Link
                key={`mfc-avail-${i}`}
                href={href}
                className="mfc-chip mfc-chip-avail"
                title="Featured pin available"
              >
                <span className="avail-slot-mark mfc-avail-mark" aria-hidden="true">+</span>
                <span className="mfc-chip-name">Your startup here</span>
              </Link>
            ))}
          </div>
          <p className="mfc-note">Listings stay free. Featured pins get a Sponsored ring on the map.</p>
        </div>
      )}
    </div>
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
  const [featuredInv, setFeaturedInv] = useState(null); // from /api/placements
  const [newsletterHidden, setNewsletterHidden] = useState(false);
  const [featuredPartnerHidden, setFeaturedPartnerHidden] = useState(false);
  const openedFromUrlRef = useRef(null);

  // Use the inventory response as the source of truth for paid pins too. The
  // startups and placements requests are independent; if one Firestore read
  // briefly fails, the UI must not say a slot is filled while hiding its card.
  const displayedStartups = useMemo(() => {
    const ids = new Set((featuredInv?.featured?.filled || []).map((slot) => slot.startupId));
    if (!ids.size) return all;
    return all.map((startup) =>
      ids.has(startup.id) && !startup.sponsored ? { ...startup, sponsored: true } : startup
    );
  }, [all, featuredInv]);

  const CURRENT_YEAR = new Date().getFullYear();

  // On mobile the list is a full-screen overlay over the map, so default it
  // closed — land on the map, open the list via "Show list" / the pull-up.
  // Desktop keeps the sidebar open beside the map.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/startups")
      .then((r) => r.json())
      .then(setAll)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/placements")
      .then((r) => r.json())
      .then(setFeaturedInv)
      .catch(() => {});
  }, []);

  const sectors = useMemo(() => [...new Set(displayedStartups.map((s) => s.sector))].sort(), [displayedStartups]);
  const stages = useMemo(() => [...new Set(displayedStartups.map((s) => s.fundingStage))].sort(), [displayedStartups]);
  const areas = useMemo(
    () => [...new Set(displayedStartups.map((s) => normalizeArea(s.area)))].sort(),
    [displayedStartups]
  );
  const spotlight = useMemo(() => displayedStartups.filter((s) => s.spotlight), [displayedStartups]);
  const sponsoredPins = useMemo(() => displayedStartups.filter((s) => s.sponsored), [displayedStartups]);

  const filtered = useMemo(() => {
    return displayedStartups.filter((s) => {
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
  }, [displayedStartups, sector, fundingStage, area, q, hiringOnly, newOnly]);

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
    for (const s of displayedStartups) {
      if (!baseFilter(s, skip)) continue;
      const key = keyFn(s);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }
  const sectorCounts = useMemo(() => countsFor("sector", (s) => s.sector), [displayedStartups, fundingStage, area, q, hiringOnly, newOnly]);
  const stageCounts = useMemo(() => countsFor("stage", (s) => s.fundingStage), [displayedStartups, sector, area, q, hiringOnly, newOnly]);
  const areaCounts = useMemo(() => countsFor("area", (s) => normalizeArea(s.area)), [displayedStartups, sector, fundingStage, q, hiringOnly, newOnly]);

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

  const listOrder = useMemo(
    () => [...filtered].sort((a, b) => Number(!!b.sponsored) - Number(!!a.sponsored)),
    [filtered]
  );
  const hiringInView = useMemo(() => filtered.filter((s) => s.hiring).length, [filtered]);

  useEffect(() => {
    if (ready) setMarkers(filtered, openStartup);
  }, [ready, filtered]);

  useEffect(() => {
    const startupParam = new URLSearchParams(window.location.search).get("startup");
    if (!ready || !startupParam || openedFromUrlRef.current === startupParam) return;
    const startup = displayedStartups.find((s) => s.id === startupParam);
    if (!startup) return;
    openedFromUrlRef.current = startupParam;
    setSelected(startup);
    setSidebarOpen(false);
    flyTo(startup.lat, startup.lng);
    setTimeout(invalidateSize, 260);
  }, [ready, displayedStartups, flyTo, invalidateSize]);

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
  const visible = listOrder.slice(0, CAP);

  return (
    <div className="app">
      <header className="topnav">
        <div className="topnav-row">
          <Link href="/" className="tn-brand">
            <span className="cmd-mark" aria-hidden="true">
              <svg viewBox="0 0 100 120" width="17" height="20" fill="none">
                <rect x="21" y="18" width="15" height="64" rx="3" fill="currentColor" />
                <rect x="21" y="42" width="58" height="15" rx="3" fill="currentColor" />
                <path d="M64 18 H79 V57 C79 63 77 68 73.5 72.5 L71.5 75 L69 111 L66.3 75.5 L64.3 72.8 C61 68.2 64 63.4 64 57 Z" fill="currentColor" />
                <circle cx="71.5" cy="40" r="7" fill="#ff5722" />
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
            <Link href="/jobs">Jobs</Link>
            <Link href="/gccs">GCCs</Link>
            <Link href="/news">News</Link>
            <Link href="/insights">Insights</Link>
            <Link href="/newsletter">Newsletter</Link>
          </nav>

          <Link className="btn cmd-submit tn-cta" href="/submit" aria-label="Submit a startup">Submit a startup</Link>
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
            {sidebarView === "list" && (
              <SponsoredShelf
                startups={sponsoredPins}
                available={
                  featuredInv?.featured?.available ??
                  Math.max(0, (featuredInv?.featured?.maxActive ?? 5) - sponsoredPins.length)
                }
                cta={featuredInv?.featured?.cta || { ctaLabel: "Get featured", ctaHref: "/feature" }}
                onSelect={openStartup}
              />
            )}
            {/*
              Free editorial Spotlight is intentionally hidden while Featured
              pins are sold as paid placements.
            */}
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
          {!featuredPartnerHidden && (
            <FeaturedPartnerStrip
              chrome={
                featuredInv?.chrome?.mapSidebar || {
                  headline: "Feature this pin",
                  body: "Limited featured pins open — Sponsored placement on the map.",
                  ctaLabel: "Reserve a spot",
                  ctaHref: "/feature",
                  mode: "available",
                }
              }
              onDismiss={() => setFeaturedPartnerHidden(true)}
            />
          )}
          {!newsletterHidden && <NewsletterBar onDismiss={() => setNewsletterHidden(true)} />}
        </aside>

        <main className="map-area">
          <div ref={mapContainerRef} className="map-full" />
          {!sidebarOpen && (
            <MapFeaturedChrome
              startups={sponsoredPins}
              available={
                featuredInv?.featured?.available ??
                Math.max(0, (featuredInv?.featured?.maxActive ?? 5) - sponsoredPins.length)
              }
              cta={featuredInv?.featured?.cta || { ctaLabel: "Get featured", ctaHref: "/feature" }}
              onSelect={openStartup}
              preferOpen
            />
          )}
        </main>
      </div>

      <MobileTabBar
        onMapTab={() => {
          setSidebarOpen(false);
          setTimeout(invalidateSize, 260);
        }}
      />

      <DetailModal startup={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
