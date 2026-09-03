"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { normalizeArea, domainOf, hostnameOf, logoSrcs, colorFor, prettyName, careersUrl } from "../../lib/startupUi.js";
import { startupSlug } from "../../lib/slug.js";
import { jobUrlId } from "../../lib/jobs-seo.js";
import MobileTabBar from "../components/MobileTabBar.jsx";
import IntentModal from "../components/IntentModal.jsx";

const HYDERABAD_CENTER = { lat: 17.42, lng: 78.44 };

// Client-side pin: colored circle + initial renders instantly, logo overlays async.
// No server round-trip — eliminates the white-circle delay from /api/marker.
function pinCircleHtml(s, small = false) {
  const color = colorFor(s.sector);
  const initial = escHtml((s.name.charAt(0) || "?").toUpperCase());
  const domain = hostnameOf(s.website) || domainOf(s.website);
  const primary = s.logoUrl || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null);
  const fallback = (s.logoUrl && domain) ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null;
  const onerror = fallback
    ? `this.src='${fallback}';this.onerror=function(){this.style.display='none'}`
    : `this.style.display='none'`;
  const img = primary ? `<img class="s-pin-logo" src="${primary}" alt="" onerror="${onerror}"/>` : "";
  const size = small ? " s-pin-sm" : "";
  const hiring = s.hiring ? " s-pin-hiring" : "";
  const dot = s.hiring ? `<span class="s-pin-dot"></span>` : "";
  return `<div class="s-pin-circle${size}${hiring}" style="background:${color}">${img}<span class="s-pin-initial">${initial}</span>${dot}</div>`;
}

const SECTOR_COLOR = {
  "SaaS": "#5B6EF5", "FinTech": "#2E8B6B", "HealthTech": "#E05D7A",
  "EdTech": "#E27B3A", "AI/ML": "#9C5BF5", "DeepTech": "#3A8BE0",
  "E-commerce": "#E2622A", "HRTech": "#DFA43A", "PropTech": "#6B8E4A",
  "AgriTech": "#5B8E3A", "Gaming": "#C05D7A", "CyberSecurity": "#334155",
  "B2B SaaS": "#4B5EF5", "Consumer Tech": "#E2622A", "IoT": "#3A8BE0",
  "CleanTech": "#2E7A3A", "LegalTech": "#7A5B3A", "MarTech": "#E05D5D",
  "InsurTech": "#5B8E6A",
};

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Area values arrive as "Gachibowli, Hyderabad" — the city half is redundant
// on a Hyderabad map and eats the label width, so drop it before rendering.
function shortAreaName(area) {
  return String(area || "")
    .replace(/,\s*(Hyderabad|Telangana|India)\b.*$/i, "")
    .trim();
}

const AREA_ZOOM = 12;
// Hero pin footprint in px: 44px circle plus a label up to ~110px wide sitting
// under it. One hero per cell of this size, so labels can never overlap.
const CELL_PX_W = 155;
const CELL_PX_H = 96;
// Second grid for unlabelled logos — roughly the 32px pin footprint plus air.
// Distributing this tier spatially (rather than flipping the whole map to dots
// past a count threshold) is what keeps logo density readable at any zoom.
const SMALL_PX_W = 74;
const SMALL_PX_H = 58;

function buildStartupAreas(startups) {
  const groups = {};
  for (const s of startups) {
    if (!s.area || !s.lat || !s.lng) continue;
    if (!groups[s.area]) groups[s.area] = { area: s.area, spots: [] };
    groups[s.area].spots.push(s);
  }
  return Object.values(groups).map((g) => {
    const n = g.spots.length;
    return {
      ...g,
      count: n,
      lat: g.spots.reduce((acc, e) => acc + e.lat, 0) / n,
      lng: g.spots.reduce((acc, e) => acc + e.lng, 0) / n,
    };
  });
}

function useLeafletMap(containerRef) {
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const areaLayerRef = useRef(null);
  const spotLayerRef = useRef(null);
  const heroMarkersRef = useRef(new Map());
  const dotMarkersRef = useRef(new Map());
  const startupsRef = useRef([]);
  const onSelectRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [viewTick, setViewTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      mapRef.current = L.map(containerRef.current, {
        center: [17.448, 78.374], // HITEC City core — densest startup cluster
        zoom: 14,
        zoomControl: false,
        // Integer levels: Stadia serves raster tiles, so fractional zoom scales
        // them in CSS and they render soft. One click = one level, crisp tiles.
        zoomSnap: 1,
        zoomDelta: 1,
        wheelPxPerZoomLevel: 140,
        wheelDebounceTime: 40,
        bounceAtZoomLimits: false,
        maxZoom: 19,
      });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      const stadiaKey = process.env.NEXT_PUBLIC_STADIA_KEY;
      const tileUrl = stadiaKey
        ? `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${stadiaKey}`
        : "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 20,
      }).addTo(mapRef.current);
      areaLayerRef.current = L.layerGroup().addTo(mapRef.current);
      spotLayerRef.current = L.layerGroup().addTo(mapRef.current);
      mapRef.current.on("moveend zoomend", () => setViewTick((t) => t + 1));
      setReady(true);
    })();
    return () => {
      cancelled = true;
      heroMarkersRef.current.clear();
      dotMarkersRef.current.clear();
    };
  }, [containerRef]);

  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const areaLayer = areaLayerRef.current;
    const spotLayer = spotLayerRef.current;
    if (!ready || !L || !map || !areaLayer || !spotLayer) return;

    const startups = startupsRef.current;
    const onSelect = onSelectRef.current;
    const zoom = map.getZoom();

    if (zoom < AREA_ZOOM) {
      spotLayer.clearLayers();
      heroMarkersRef.current.clear();
      dotMarkersRef.current.clear();
      areaLayer.clearLayers();
      // Densest areas win. Hyderabad's western corridor (Gachibowli, Jubilee
      // Hills, Banjara Hills, HITEC) sits close enough that drawing every blob
      // stacks them into an unreadable pile — so place biggest-first and skip
      // any whose circle would touch one already placed.
      const areas = buildStartupAreas(startups).sort((x, y) => y.count - x.count);
      const placed = [];
      for (const a of areas) {
        const size = a.count < 10 ? 50 : a.count < 30 ? 62 : a.count < 60 ? 74 : 88;
        const p = map.latLngToContainerPoint([a.lat, a.lng]);
        const clash = placed.some(
          (q) => Math.hypot(q.x - p.x, q.y - p.y) < (q.size + size) / 2 + 10
        );
        if (clash) continue;
        placed.push({ x: p.x, y: p.y, size });

        const label = shortAreaName(a.area);
        const html = `<div class="startup-area-blob" style="width:${size}px;height:${size}px"><div class="startup-area-inner"><div class="startup-area-count">${a.count}</div><div class="startup-area-name">${escHtml(label)}</div></div></div>`;
        const areaData = a;
        L.marker([a.lat, a.lng], {
          icon: L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          zIndexOffset: 500 + a.count,
        })
          .on("click", () => {
            const coords = areaData.spots.filter((s) => s.lat && s.lng).map((s) => [s.lat, s.lng]);
            if (coords.length === 1) map.flyTo(coords[0], 14, { duration: 0.5, easeLinearity: 0.22 });
            else if (coords.length > 1) map.flyToBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 15, duration: 0.5 });
          })
          .addTo(areaLayer);
      }
      return;
    }

    areaLayer.clearLayers();
    // Padded so pins exist just off-screen and pan in instead of popping.
    const b = map.getBounds().pad(0.25);
    const allCoords = startups.filter((s) => s.lat && s.lng);
    const inView = allCoords.filter(
      (s) => s.lat >= b.getSouth() && s.lat <= b.getNorth() && s.lng >= b.getWest() && s.lng <= b.getEast()
    );
    // Spatial grid, one hero per cell. A flat "top N in view" cap lets pins
    // stack wherever the data is dense; sizing a cell to the pin+label
    // footprint guarantees the winners can't collide. The grid is anchored to
    // absolute lat/lng (not the viewport), so panning doesn't reshuffle which
    // pin won its cell — that's what stops the labels flickering while dragging.
    const center = map.getCenter();
    const origin = map.latLngToContainerPoint(center);
    const corner = map.containerPointToLatLng([origin.x + CELL_PX_W, origin.y + CELL_PX_H]);
    const cellLng = Math.abs(corner.lng - center.lng) || 0.002;
    const cellLat = Math.abs(corner.lat - center.lat) || 0.002;

    const rankOf = (s) => (s.sponsored ? 2 : s.hiring ? 1 : 0);
    const cellWinners = new Map();
    for (const s of inView) {
      const key = `${Math.floor(s.lat / cellLat)}:${Math.floor(s.lng / cellLng)}`;
      const cur = cellWinners.get(key);
      if (!cur || rankOf(s) > rankOf(cur)) cellWinners.set(key, s);
    }
    // Both tiers are viewport-bounded. Building them from allCoords mounted a
    // marker (and a favicon request) for every startup in the dataset, not just
    // the ones on screen — ~1100 DOM nodes for a view that shows a few dozen.
    const heroIds = new Set([...cellWinners.values()].map((s) => s.id));
    const wantHeroes = heroIds;

    // Fine grid over everyone who didn't win a label. Winners here keep their
    // logo; the remainder become dots. Both tiers stay viewport-bounded.
    const smallCorner = map.containerPointToLatLng([origin.x + SMALL_PX_W, origin.y + SMALL_PX_H]);
    const smLng = Math.abs(smallCorner.lng - center.lng) || 0.001;
    const smLat = Math.abs(smallCorner.lat - center.lat) || 0.001;
    const smallWinners = new Map();
    for (const s of inView) {
      if (heroIds.has(s.id)) continue;
      const key = `${Math.floor(s.lat / smLat)}:${Math.floor(s.lng / smLng)}`;
      const cur = smallWinners.get(key);
      if (!cur || rankOf(s) > rankOf(cur)) smallWinners.set(key, s);
    }
    const smallIds = new Set([...smallWinners.values()].map((s) => s.id));
    const wantDots = new Set(inView.filter((s) => !heroIds.has(s.id)).map((s) => s.id));

    for (const [id, m] of heroMarkersRef.current) {
      if (!wantHeroes.has(id)) { spotLayer.removeLayer(m); heroMarkersRef.current.delete(id); }
    }
    for (const [id, m] of dotMarkersRef.current) {
      if (!wantDots.has(id)) { spotLayer.removeLayer(m); dotMarkersRef.current.delete(id); }
    }
    for (const id of wantHeroes) {
      if (dotMarkersRef.current.has(id)) {
        spotLayer.removeLayer(dotMarkersRef.current.get(id));
        dotMarkersRef.current.delete(id);
      }
    }

    for (const s of inView) {
      if (!wantHeroes.has(s.id) || heroMarkersRef.current.has(s.id)) continue;
      const featured = !!s.sponsored;
      const circle = pinCircleHtml(s);
      const iconHtml = featured
        ? `<div class="startup-hero-pin leaf-marker leaf-marker-sponsored"><div class="pin-sponsored-ring">${circle}<span class="pin-sponsored-label">Sponsored</span></div><div class="startup-pin-label">${escHtml(prettyName(s.name))}</div></div>`
        : `<div class="startup-hero-pin leaf-marker">${circle}<div class="startup-pin-label">${escHtml(prettyName(s.name))}</div></div>`;
      const m = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: "", html: iconHtml, iconSize: [44, 72], iconAnchor: [22, 22] }),
        title: prettyName(s.name),
        zIndexOffset: featured ? 600 : 200,
      }).on("click", () => onSelect?.(s));
      heroMarkersRef.current.set(s.id, m);
      spotLayer.addLayer(m);
    }

    // Overlapping logos still read fine — it's stacked *labels* that turn the
    // map to mush. So only coarse-grid winners get text, the fine grid keeps a
    // spread of unlabelled logos, and the remainder are dots.
    // A marker's tier can change as the view moves (logo <-> dot), and the
    // reconciler leaves existing markers untouched — so drop any whose tier no
    // longer matches, and let the add loop below rebuild it.
    for (const [id, m] of dotMarkersRef.current) {
      const wantsLogo = smallIds.has(id);
      if (m.__isLogo !== wantsLogo) {
        spotLayer.removeLayer(m);
        dotMarkersRef.current.delete(id);
      }
    }

    for (const s of inView) {
      if (!wantDots.has(s.id) || dotMarkersRef.current.has(s.id)) continue;
      const isLogo = smallIds.has(s.id);
      const html = isLogo
        ? `<div class="startup-hero-pin leaf-marker">${pinCircleHtml(s, true)}</div>`
        : `<div class="startup-mini-dot" style="--c:${SECTOR_COLOR[s.sector] || "#94a3b8"}"></div>`;
      const box = isLogo ? 32 : 10;
      const m = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: "", html, iconSize: [box, box], iconAnchor: [box / 2, box / 2] }),
        title: prettyName(s.name),
        zIndexOffset: isLogo ? 100 : 50,
      }).on("click", () => onSelect?.(s));
      m.__isLogo = isLogo;
      dotMarkersRef.current.set(s.id, m);
      spotLayer.addLayer(m);
    }
  }, [ready, viewTick]);

  function setMarkers(startups, onSelect) {
    startupsRef.current = startups;
    onSelectRef.current = onSelect;
    setViewTick((t) => t + 1);
  }

  function flyTo(lat, lng) {
    if (mapRef.current && lat && lng) {
      mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 15), { duration: 0.7, easeLinearity: 0.22 });
    }
  }

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
          <Link className="btn" href={`/startups/${startup.slug || startupSlug(startup)}`}>
            Full profile
          </Link>
          {site ? (
            <a className="btn btn-ghost" href={site} target="_blank" rel="noreferrer">
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
        <LogoBadge startup={startup} size={44} />
        <div className="s-card-id">
          <div className="s-card-name">
            <Link
              href={`/startups/${startup.slug || startupSlug(startup)}`}
              onClick={(e) => e.stopPropagation()}
              className="s-card-name-link"
            >
              {prettyName(startup.name)}
            </Link>
            {startup.sponsored && <span className="sponsored-badge">Sponsored</span>}
          </div>
          <div className="s-card-sub">{startup.sector} · {startup.area}</div>
        </div>
      </div>
      {startup.description && (
        <p className="s-card-desc">{startup.description}</p>
      )}
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
  const href = cta?.ctaHref || "/feature";
  const label = cta?.ctaLabel || "Get featured";

  // No sponsors yet — show a single quiet CTA line, not a full shelf of empty slots.
  if (!startups.length) {
    if (open <= 0) return null;
    return (
      <div className="sb-featured-cta">
        <span className="sb-featured-cta-dot" />
        <span>{open} featured pin{open !== 1 ? "s" : ""} available</span>
        <Link href={href} className="sb-featured-cta-link">{label} →</Link>
      </div>
    );
  }

  return (
    <div className="spotlight-shelf sponsored-shelf">
      <div className="spotlight-head">
        <span className="spotlight-title">Featured</span>
        <Link href={href} className="sb-featured-cta-link" style={{ fontSize: 11 }}>{label} →</Link>
      </div>
      <div className="spotlight-row">
        {startups.map((s) => (
          <button key={s.id} type="button" className="spotlight-card spotlight-card-sponsored" onClick={() => onSelect(s)}>
            <LogoBadge startup={s} size={32} />
            <div className="spotlight-name">{prettyName(s.name)}</div>
            <div className="spotlight-sector"><span className="sponsored-badge">Sponsored</span></div>
          </button>
        ))}
      </div>
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
  // Only auto-expand when real sponsors exist — empty expanded state wastes space
  const [expanded, setExpanded] = useState(preferOpen && startups.length > 0);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (preferOpen && startups.length > 0) setExpanded(true);
  }, [preferOpen, startups.length]);

  // Auto-advance carousel
  useEffect(() => {
    if (!expanded || startups.length <= 1) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % startups.length), 3500);
    return () => clearInterval(t);
  }, [expanded, startups.length]);

  if (!startups.length && open <= 0) return null;

  const href = cta?.ctaHref || "/feature";
  const label = cta?.ctaLabel || "Get featured";
  const filled = startups.length;
  const max = filled + open;
  const peek = startups.slice(0, 3);
  const active = startups[activeIdx] ?? null;

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
          {active ? (
            <div className="mfc-carousel">
              <button
                type="button"
                className="mfc-carousel-card"
                onClick={() => onSelect(active)}
              >
                <LogoBadge startup={active} size={36} />
                <div className="mfc-carousel-info">
                  <span className="mfc-carousel-name">{prettyName(active.name)}</span>
                  <span className="mfc-carousel-sector">{active.sector}</span>
                </div>
                <span className="sponsored-badge">Sponsored</span>
              </button>
              {startups.length > 1 && (
                <div className="mfc-dots">
                  {startups.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`mfc-dot${i === activeIdx ? " active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                      aria-label={`Go to sponsor ${i + 1}`}
                    />
                  ))}
                </div>
              )}
              {open > 0 && (
                <Link href={href} className="mfc-cta-inline">{label} · {open} open →</Link>
              )}
            </div>
          ) : (
            <div className="mfc-empty-line">
              <span className="mfc-sub">{open} spot{open !== 1 ? "s" : ""} available</span>
              <Link className="mfc-cta" href={href}>{label}</Link>
            </div>
          )}
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
  const [startupsFetched, setStartupsFetched] = useState(false);
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
  const [jobsList, setJobsList] = useState([]);
  const [jobsTotal, setJobsTotal] = useState(0);
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
      .then((data) => { setAll(data); setStartupsFetched(true); })
      .catch(() => { setStartupsFetched(true); });
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
    const params = new URLSearchParams(window.location.search);
    const startupParam = params.get("startup");
    const sectorParam = params.get("sector");
    if (sectorParam) setSector(sectorParam);
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

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => {
        const jobs = Array.isArray(d.jobs) ? d.jobs : [];
        setJobsList(jobs.slice(0, 12));
        setJobsTotal(jobs.length);
      })
      .catch(() => {});
  }, []);

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

      {jobsList.length > 0 && (
        <div className="jobs-ticker-strip">
          <a href="/jobs" className="jobs-ticker-badge">
            <span className="jobs-ticker-dot" />
            <strong>{hiringInView}</strong> hiring
          </a>
          <div className="jobs-ticker-track">
            <div className="jobs-ticker-inner">
              {[...jobsList, ...jobsList].map((job, i) => (
                <a key={i} href={`/jobs/${jobUrlId(job.id)}`} className="jobs-ticker-item">
                  <span className="jobs-ticker-co">{job.company}</span>
                  <span className="jobs-ticker-sep"> · </span>
                  {job.title}
                </a>
              ))}
            </div>
          </div>
          <a href="/jobs" className="jobs-ticker-cta">All jobs →</a>
        </div>
      )}

      <div className={`app-body${sidebarOpen ? "" : " sidebar-closed"}`}>
        <aside className="sidebar">
          <div className="sb-inner">
            <div className="sb-head">
              <h2 className="sb-city">Hyderabad Startups</h2>
              <div className="sb-stat">
                {startupsFetched
                  ? <><strong>{filtered.length.toLocaleString()}</strong> companies</>
                  : <span className="sb-loading-pulse">Loading…</span>
                }
                {hiringInView > 0 && <span className="sb-hiring"> · {hiringInView} hiring now</span>}
              </div>
              <p className="sb-desc">Filter startups by sector, funding stage, and open job roles on the map.</p>
              <div className="sb-tabs">
                <button className={sidebarView === "list" ? "on" : ""} onClick={() => setSidebarView("list")}>Startups</button>
                <button className={sidebarView === "areas" ? "on" : ""} onClick={() => setSidebarView("areas")}>Areas</button>
              </div>
            </div>
            {sidebarView === "list" && (
              <div className="sb-results-row">
                <span className="sb-results-label">STARTUPS</span>
                <span className="sb-results-count">{startupsFetched ? `${filtered.length.toLocaleString()} RESULTS` : "…"}</span>
              </div>
            )}
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
                {startupsFetched && filtered.length === 0 && <div className="sb-empty">No startups match your filters.</div>}
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
                {startupsFetched && areaGroups.length === 0 && <div className="sb-empty">No areas match your filters.</div>}
              </div>
            )}
          </div>
          {!newsletterHidden && <NewsletterBar onDismiss={() => setNewsletterHidden(true)} />}
        </aside>

        <main className="map-area">
          <div ref={mapContainerRef} className={`map-full${ready ? "" : " map-loading"}`} />
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

      <IntentModal jobsTotal={jobsTotal} hiringCount={hiringInView} />
    </div>
  );
}
