"use client";

import { useEffect, useMemo, useRef, useState, useCallback, startTransition } from "react";
import Link from "next/link";
import ExploreModes from "../components/ExploreModes.jsx";
import AuthButton from "../components/AuthButton.jsx";
import { normalizeArea, domainOf, hostnameOf, logoSrcs, colorFor, prettyName } from "../../lib/startupUi.js";
import { startupSlug } from "../../lib/slug.js";
import { jobUrlId } from "../../lib/jobs-seo.js";
import MobileTabBar from "../components/MobileTabBar.jsx";
import { trackEvent } from "../../lib/engagement-client.js";
import { AREA_ZOOM_MAX, AREA_ENTER_ZOOM, spotlight, scoreOf } from "../../lib/startup-map-spotlight.js";

const HYDERABAD_CENTER = { lat: 17.42, lng: 78.44 };

// Client-side pin: colored circle + initial renders instantly, logo overlays async.
// No server round-trip — eliminates the white-circle delay from /api/marker.
function pinCircleHtml(s, small = false) {
  const color = colorFor(s.sector);
  const initial = escHtml((s.name.charAt(0) || "?").toUpperCase());
  const domain = hostnameOf(s.website) || domainOf(s.website);
  const submitted = s.logoUrl ? String(s.logoUrl).replace(/^http:\/\//i, "https://") : null;
  const primary = submitted || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null);
  const fallback = (submitted && domain) ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null;
  const onerror = fallback
    ? `this.src='${fallback}';this.onerror=function(){this.style.display='none'}`
    : `this.style.display='none'`;
  // Google returns a real favicon at 64px but its "no favicon" globe at 16px —
  // so a s2/favicons image that loads <=16px is the placeholder, not a logo.
  // Hide it and the coloured initial behind it shows through.
  const onload = `if(this.naturalWidth&&this.naturalWidth<=16&&this.src.indexOf('google.com/s2')>-1)this.style.display='none'`;
  const img = primary ? `<img class="s-pin-logo" src="${primary}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="${onload}" onerror="${onerror}"/>` : "";
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

// Eateries-map zoom contract (hyderabad-eateries-map):
// - zoomed out → area blobs
// - area click → flyTo(centroid, AREA_ENTER_ZOOM) past the blob threshold
// - zoomed in → monotonic spotlight heroes + dots (zoom only adds heroes)
const LABEL_GUTTER_BOTTOM = 78;

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
  const suppressTickRef = useRef(false);
  // Area blobs: only rebuild when the company set changes, not on every pan.
  // Rebuilding + CSS enter animation was the city-overview flicker.
  const areaModeKeyRef = useRef("");
  const [ready, setReady] = useState(false);
  const [mapError,setMapError]=useState(false),[retry,setRetry]=useState(0);
  const [viewTick, setViewTick] = useState(0);

  useEffect(() => {
    let cancelled = false;setMapError(false);setReady(false);
    const timer=setTimeout(()=>{if(!cancelled&&!mapRef.current)setMapError(true);},8000);
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      mapRef.current = L.map(containerRef.current, {
        center: [17.42, 78.44],
        zoom: 11.6, // city overview like eateries — area blobs first
        zoomControl: false,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 140,
        wheelDebounceTime: 40,
        bounceAtZoomLimits: false,
        minZoom: 10.5,
        maxZoom: 18,
      });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      let tileErrors=0;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 1,
      }).on("tileerror",()=>{if(!cancelled&&++tileErrors>=3)setMapError(true);}).addTo(mapRef.current);
      areaLayerRef.current = L.layerGroup().addTo(mapRef.current);
      spotLayerRef.current = L.layerGroup().addTo(mapRef.current);
      let tickRaf = 0;
      mapRef.current.on("moveend zoomend", () => {
        // Skip rebuilds while flyTo/fitBounds is animating — double passes made
        // Hiring / filter / card clicks feel laggy.
        if (suppressTickRef.current) return;
        if (tickRaf) cancelAnimationFrame(tickRaf);
        tickRaf = requestAnimationFrame(() => {
          tickRaf = 0;
          setViewTick((n) => n + 1);
        });
      });
      clearTimeout(timer);setReady(true);
    })().catch(()=>{if(!cancelled)setMapError(true);});
    return () => {
      cancelled = true;clearTimeout(timer);
      mapRef.current?.remove();mapRef.current=null;
      heroMarkersRef.current.clear();
      dotMarkersRef.current.clear();
    };
  }, [containerRef,retry]);

  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const areaLayer = areaLayerRef.current;
    const spotLayer = spotLayerRef.current;
    if (!ready || !L || !map || !areaLayer || !spotLayer) return;

    const startups = startupsRef.current;
    const onSelect = onSelectRef.current;
    const zoom = map.getZoom();

    // ---------- Neighbourhood view (eateries MapCanvas pattern) ----------
    if (zoom <= AREA_ZOOM_MAX) {
      if (heroMarkersRef.current.size || dotMarkersRef.current.size) {
        spotLayer.clearLayers();
        heroMarkersRef.current.clear();
        dotMarkersRef.current.clear();
      }

      // Stable key for the filtered company set — pan/zoom inside area mode
      // must NOT recreate blobs (that replayed the enter animation = flicker).
      const areaKey = `areas:${startups.length}:${startups[0]?.id ?? ""}:${startups[startups.length - 1]?.id ?? ""}`;
      if (areaModeKeyRef.current === areaKey && areaLayer.getLayers().length) {
        return;
      }
      const firstAreaPaint = !areaModeKeyRef.current;
      areaModeKeyRef.current = areaKey;
      areaLayer.clearLayers();

      const areas = buildStartupAreas(startups).sort((x, y) => y.count - x.count);
      // Place at geographic centroids (eateries). Screen-space nudge on every
      // rebuild made blobs jump; skipping rebuilds above is the main fix.
      // Drop only true screen overlaps at *build* time so labels stay readable.
      const placed = [];
      for (const a of areas) {
        const size = a.count < 15 ? 52 : a.count < 60 ? 66 : a.count < 120 ? 76 : 86;
        const origin = map.latLngToContainerPoint([a.lat, a.lng]);
        let spot = { x: origin.x, y: origin.y };
        let lat = a.lat;
        let lng = a.lng;
        for (let attempt = 0; attempt < 10; attempt++) {
          const clash = placed.some(
            (q) => Math.hypot(q.x - spot.x, q.y - spot.y) < (q.size + size) / 2 + 6
          );
          if (!clash) break;
          const angle = attempt * 2.513;
          const dist = 10 + attempt * 12;
          spot = { x: origin.x + Math.cos(angle) * dist, y: origin.y + Math.sin(angle) * dist };
          const ll = map.containerPointToLatLng([spot.x, spot.y]);
          lat = ll.lat;
          lng = ll.lng;
        }
        placed.push({ x: spot.x, y: spot.y, size });
        const label = shortAreaName(a.area);
        const enter = firstAreaPaint ? " startup-area-blob--enter" : "";
        const html = `<div class="startup-area-blob${enter}" style="width:${size}px;height:${size}px"><div class="startup-area-inner"><div class="startup-area-count">${a.count}</div><div class="startup-area-name">${escHtml(label)}</div></div></div>`;
        const areaData = a;
        L.marker([lat, lng], {
          icon: L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          zIndexOffset: 500 + a.count,
        })
          .on("click", () => {
            // Exact eateries behaviour: fly to area centre past blob threshold.
            suppressTickRef.current = true;
            areaModeKeyRef.current = ""; // force fresh pins after fly
            map.flyTo([areaData.lat, areaData.lng], AREA_ENTER_ZOOM, {
              duration: 0.45,
              easeLinearity: 0.22,
            });
            window.setTimeout(() => {
              suppressTickRef.current = false;
              setViewTick((n) => n + 1);
            }, 500);
          })
          .addTo(areaLayer);
      }
      return;
    }

    // ---------- Spot view: monotonic heroes + dots (eateries spotlight) ----------
    areaModeKeyRef.current = "";
    areaLayer.clearLayers();
    const b = map.getBounds();
    const southLimit = map.containerPointToLatLng([0, map.getSize().y - LABEL_GUTTER_BOTTOM]).lat;
    const bounds = {
      north: b.getNorth(),
      south: Math.max(b.getSouth(), southLimit),
      east: b.getEast(),
      west: b.getWest(),
    };

    const viewport = map.getSize();
    const usableH = Math.max(viewport.y - LABEL_GUTTER_BOTTOM, 200);
    const target = Math.max(12, Math.min(zoom > 15.5 ? 34 : 26,
      Math.round((viewport.x * usableH) / 42000)));
    const cellArea = (viewport.x * usableH) / target;
    const cellW = Math.max(124, Math.sqrt(cellArea * 1.5));
    const cellH = Math.max(94, cellArea / cellW);
    const c = map.getCenter();
    const origin = map.latLngToContainerPoint(c);
    const corner = map.containerPointToLatLng([origin.x + cellW, origin.y + cellH]);
    const cellLng = Math.abs(corner.lng - c.lng) || 0.002;
    const cellLat = Math.abs(corner.lat - c.lat) || 0.002;

    const located = startups.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
    const inBounds = (s) =>
      s.lat >= bounds.south && s.lat <= bounds.north &&
      s.lng >= bounds.west && s.lng <= bounds.east;
    const visible = located.filter(inBounds).sort((a, b) => scoreOf(b) - scoreOf(a));

    let { heroes, rest } = spotlight(located, bounds, {
      cellLat,
      cellLng,
      filterKey: `${located.length}:${located[0]?.id ?? ""}`,
    });

    // Directory map (not a ranked food map): once you zoom into a neighbourhood,
    // every company in view should pop as a real pin — not stay a grey dot forever.
    // Eateries does the same when a filter set is small enough to show in full.
    const SHOW_ALL_ZOOM = 14.4;
    const SHOW_ALL_CAP = 140;
    if (zoom >= SHOW_ALL_ZOOM || visible.length <= SHOW_ALL_CAP) {
      if (visible.length && visible.length <= 220) {
        heroes = visible;
        rest = [];
      }
    }

    // Fixed places: sponsored / spotlight always stay among heroes when in view.
    const fixed = visible.filter((s) => s.sponsored || s.spotlight);
    if (fixed.length) {
      const heroIds = new Set(heroes.map((s) => s.id));
      for (const s of fixed) {
        if (heroIds.has(s.id)) continue;
        heroes = [s, ...heroes];
        heroIds.add(s.id);
      }
      rest = rest.filter((s) => !heroIds.has(s.id));
    }

    const wantHeroes = new Set(heroes.map((s) => s.id));
    const wantDots = new Set(rest.map((s) => s.id));

    // Remove only pins that left the hero/dot sets. Never rebuild an existing
    // hero on zoom — that flicker is what eateries avoids with
    // `if (liveHeroes.has(id)) continue`.
    for (const [id, m] of heroMarkersRef.current) {
      if (!wantHeroes.has(id)) {
        spotLayer.removeLayer(m);
        heroMarkersRef.current.delete(id);
      }
    }
    for (const [id, m] of dotMarkersRef.current) {
      if (!wantDots.has(id)) {
        spotLayer.removeLayer(m);
        dotMarkersRef.current.delete(id);
      }
    }

    // When many companies are promoted, keep every logo visible but only label
    // the strongest few so names don't stack into mush.
    const labelBudget = heroes.length > 60 ? 18 : heroes.length > 35 ? 28 : heroes.length;
    const labelIds = new Set(
      [...heroes]
        .sort((a, b) => scoreOf(b) - scoreOf(a))
        .slice(0, labelBudget)
        .map((s) => s.id)
    );
    for (const s of fixed) labelIds.add(s.id);

    for (const s of heroes) {
      if (heroMarkersRef.current.has(s.id)) continue; // already on screen — leave alone
      if (dotMarkersRef.current.has(s.id)) {
        spotLayer.removeLayer(dotMarkersRef.current.get(s.id));
        dotMarkersRef.current.delete(s.id);
      }
      const featured = !!s.sponsored;
      const labelled = labelIds.has(s.id);
      const circle = pinCircleHtml(s, !labelled);
      const iconHtml = labelled
        ? (featured
          ? `<div class="startup-hero-pin leaf-marker leaf-marker-sponsored"><div class="pin-sponsored-ring">${circle}<span class="pin-sponsored-label">Sponsored</span></div><div class="startup-pin-label">${escHtml(prettyName(s.name))}</div></div>`
          : `<div class="startup-hero-pin leaf-marker">${circle}<div class="startup-pin-label">${escHtml(prettyName(s.name))}</div></div>`)
        : `<div class="startup-hero-pin leaf-marker">${circle}</div>`;
      const iconSize = labelled ? [44, 72] : [32, 32];
      const iconAnchor = labelled ? [22, 22] : [16, 16];
      const m = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: "", html: iconHtml, iconSize, iconAnchor }),
        title: prettyName(s.name),
        zIndexOffset: featured ? 600 : labelled ? 220 : 120 + Math.min(scoreOf(s), 80),
      }).on("click", () => onSelect?.(s));
      heroMarkersRef.current.set(s.id, m);
      spotLayer.addLayer(m);
    }

    for (const s of rest) {
      if (dotMarkersRef.current.has(s.id)) continue; // leave existing dots alone
      if (heroMarkersRef.current.has(s.id)) continue;
      const m = L.marker([s.lat, s.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="startup-mini-dot" title="${escHtml(prettyName(s.name))}"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
        title: prettyName(s.name),
        zIndexOffset: 50,
      }).on("click", () => onSelect?.(s));
      dotMarkersRef.current.set(s.id, m);
      spotLayer.addLayer(m);
    }
  }, [ready, viewTick]);

  function setMarkers(startups, onSelect) {
    startupsRef.current = startups;
    onSelectRef.current = onSelect;
    // Defer heavy marker reconcile so filter/toggle buttons paint immediately.
    requestAnimationFrame(() => setViewTick((n) => n + 1));
  }

  function withSuppressedTicks(run) {
    suppressTickRef.current = true;
    run();
    // One rebuild after the animation settles
    window.setTimeout(() => {
      suppressTickRef.current = false;
      setViewTick((n) => n + 1);
    }, 520);
  }

  function flyTo(lat, lng) {
    if (mapRef.current && lat && lng) {
      withSuppressedTicks(() => {
        mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), AREA_ENTER_ZOOM + 1.2), {
          duration: 0.45,
          easeLinearity: 0.22,
        });
      });
    }
  }

  function fitToMarkers(startups) {
    const L = LRef.current;
    if (!L || !mapRef.current) return;
    const coords = startups.filter((s) => s.lat && s.lng).map((s) => [s.lat, s.lng]);
    if (coords.length === 0) return;
    withSuppressedTicks(() => {
      if (coords.length === 1) {
        mapRef.current.flyTo(coords[0], Math.max(mapRef.current.getZoom(), 14), { duration: 0.45 });
        return;
      }
      mapRef.current.flyToBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 15, duration: 0.45 });
    });
  }

  function invalidateSize() {
    mapRef.current?.invalidateSize({ animate: true });
  }

  return { ready, mapError, retryMap:()=>setRetry(n=>n+1), setMarkers, flyTo, fitToMarkers, invalidateSize };
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
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
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

  useEffect(() => {
    if (!startup) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startup, onClose]);

  const profileHref = startup
    ? `/startups/${startup.slug || startupSlug(startup)}`
    : null;

  // Prefetch the profile document so "Full profile" isn't waiting on the map's JS thread.
  useEffect(() => {
    if (!profileHref || typeof document === "undefined") return undefined;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = profileHref;
    link.as = "document";
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [profileHref]);

  if (!startup) return null;
  const site = detail?.website ?? startup.website;
  const careers = detail?.careers || null;
  // Dedupe noisy career-page scrapes (same title listed twice).
  const roles = [];
  const seenRole = new Set();
  for (const r of detail?.hiring?.roles || []) {
    const key = (r.title || "").trim().toLowerCase();
    if (!key || seenRole.has(key)) continue;
    seenRole.add(key);
    roles.push(r);
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={prettyName(startup.name)}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="modal-scroll">
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
          <div className="hiring-block">
            <a
              className="hiring-badge"
              href={detail.hiring.url || careers || "#"}
              target="_blank"
              rel="noreferrer"
            >
              <span className="hiring-dot" />
              Hiring now{detail.hiring.count ? ` · ${detail.hiring.count} open role${detail.hiring.count === 1 ? "" : "s"}` : ""} ↗
            </a>
            {roles.length > 0 && (
              <ul className="roles-list" aria-label="Open roles">
                {roles.map((r, i) => (
                  <li key={`${r.title}-${i}`}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      <span className="roles-list-title">{r.title}</span>
                      <span className="roles-list-ext" aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
          {/* Plain <a>: full navigation unloads the map — Next <Link> soft-nav felt laggy here. */}
          <a className="btn" href={profileHref} onClick={onClose}>
            Full profile
          </a>
          {site ? (
            <a
              className="btn btn-ghost"
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              Visit website ↗
            </a>
          ) : (
            <span className="btn btn-disabled">Website N/A</span>
          )}
          {careers && (
            <a
              className="btn btn-ghost"
              href={careers}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              Careers ↗
            </a>
          )}
        </div>
        <a
          className="modal-claim"
          href={`/submit?claim=${startup.id}&name=${encodeURIComponent(startup.name)}`}
          onClick={onClose}
        >
          Is this you? Claim this listing
        </a>
        </div>
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
      const [{ collection, addDoc, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("../../lib/firebase.js"),
      ]);
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

export default function HomeClient({ initialStartups = [] }) {
  const mapContainerRef = useRef(null);
  const { ready, mapError, retryMap, setMarkers, flyTo, fitToMarkers, invalidateSize } = useLeafletMap(mapContainerRef);

  const [all, setAll] = useState(initialStartups);
  const [startupsFetched, setStartupsFetched] = useState(initialStartups.length > 0);
  const [sector, setSector] = useState("");
  const [fundingStage, setFundingStage] = useState("");
  const [area, setArea] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [hiringOnly, setHiringOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState("list"); // "list" | "areas" — what the sidebar shows
  const [featuredInv, setFeaturedInv] = useState(null); // from /api/placements
  const [newsletterHidden, setNewsletterHidden] = useState(true);
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
    if (initialStartups.length) {
      setAll(initialStartups);
      setStartupsFetched(true);
      return;
    }
    fetch("/api/startups")
      .then((r) => r.json())
      .then((data) => { setAll(data); setStartupsFetched(true); })
      .catch(() => { setStartupsFetched(true); });
  }, [initialStartups]);

  useEffect(() => {
    const run = () => {
      fetch("/api/placements")
        .then((r) => r.json())
        .then(setFeaturedInv)
        .catch(() => {});
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(run, 1200);
    return () => clearTimeout(t);
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

  const openStartup = useCallback((s) => {
    trackEvent("company", "control");
    // Paint modal/selection first; defer map fly so the click feels instant.
    startTransition(() => setSelected(s));
    requestAnimationFrame(() => {
      if (s?.lat && s?.lng) flyTo(s.lat, s.lng);
    });
  }, [flyTo]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setMarkers(filtered, openStartup), 80);
    return () => clearTimeout(id);
  }, [ready, filtered, openStartup]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startupParam = params.get("startup");
    const sectorParam = params.get("sector");
    const areaParam = params.get("area");
    if (sectorParam) setSector(sectorParam);
    if (areaParam) setArea(areaParam);
    if (!ready || !startupParam || openedFromUrlRef.current === startupParam) return;
    const startup = displayedStartups.find((s) => s.id === startupParam);
    if (!startup) return;
    openedFromUrlRef.current = startupParam;
    setSelected(startup);
    setSidebarOpen(false);
    setListOpen(false);
    flyTo(startup.lat, startup.lng);
    setTimeout(invalidateSize, 260);
  }, [ready, displayedStartups, flyTo, invalidateSize]);

  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstFilterRun.current) { firstFilterRun.current = false; return; }
    // Debounce fit — rapid filter taps were stacking flyToBounds animations.
    const id = window.setTimeout(() => fitToMarkers(filtered), 180);
    return () => clearTimeout(id);
  }, [ready, sector, fundingStage, area, hiringOnly, newOnly]);

  useEffect(() => {
    const run = () => {
      fetch("/api/jobs")
        .then((r) => r.json())
        .then((d) => {
          const jobs = Array.isArray(d.jobs) ? d.jobs : [];
          setJobsList(jobs.slice(0, 12));
          setJobsTotal(jobs.length);
        })
        .catch(() => {});
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(run, 1200);
    return () => clearTimeout(t);
  }, []);

  function toggleSidebar() {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    if (typeof window !== "undefined" && window.innerWidth <= 768) setListOpen(next);
    setTimeout(invalidateSize, 260);
  }

  const hasActiveFilters = Boolean(sector || fundingStage || area || hiringOnly || newOnly || q);

  const CAP = 150;
  const visible = listOrder.slice(0, CAP);

  return (
    <div className="app startup-workspace">
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
              <span className="tn-title-full">Mapping<b> HYD</b></span>
              <span className="tn-title-short">Mapping<b> HYD</b></span>
            </span>
          </Link>

          <ExploreModes active="companies" />
          <div className="tn-search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input placeholder="Search startups, sectors, areas…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <nav className="tn-links">
            <AuthButton />
            <Link href="/saved">Saved</Link>
            <Link href="/radar" title="Exclusive hard-to-find employers">Radar</Link>
            <Link href="/gccs">GCCs</Link>
            <Link href="/more">More</Link>
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
          <Dropdown value={sector} onChange={(v) => startTransition(() => setSector(v))} options={sectors} placeholder="All sectors" counts={sectorCounts} />
          <Dropdown value={fundingStage} onChange={(v) => startTransition(() => setFundingStage(v))} options={stages} placeholder="All stages" counts={stageCounts} />
          <Dropdown value={area} onChange={(v) => startTransition(() => setArea(v))} options={areas} placeholder="All areas" counts={areaCounts} />
          <button
            className={`hiring-toggle${hiringOnly ? " on" : ""}`}
            onClick={() => startTransition(() => setHiringOnly((v) => !v))}
            title="Detected via public job boards (Greenhouse, Lever, Ashby, Recruitee, Workable) or self-reported."
          >
            <span className="hiring-dot" />
            Hiring now
          </button>
          <button
            className={`hiring-toggle${newOnly ? " on" : ""}`}
            onClick={() => startTransition(() => setNewOnly((v) => !v))}
            title="Founded in the last 2 years."
          >
            New
          </button>
          {hasActiveFilters && (
            <button
              className="hiring-toggle"
              style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
              onClick={() => {
                startTransition(() => {
                  setSector("");
                  setFundingStage("");
                  setArea("");
                  setHiringOnly(false);
                  setNewOnly(false);
                  setQ("");
                });
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      </header>

      {false && jobsList.length > 0 && (
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

      <div className={`app-body${sidebarOpen ? "" : " sidebar-closed"}${listOpen ? " list-open" : ""}`}>
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
            {false && sidebarView === "list" && (
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
          <div ref={mapContainerRef} className="map-full" aria-label="Hyderabad startup map" />
          {!ready&&!mapError&&<p className="startup-map-loading" role="status">Loading startup map…</p>}
          {mapError&&<div className="startup-map-loading" role="status"><p>The map is unavailable. Startup results still work.</p><button onClick={retryMap}>Retry map</button><button onClick={()=>{setSidebarOpen(true);setListOpen(true);}}>Browse startups</button></div>}
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
          setListOpen(false);
          setTimeout(invalidateSize, 260);
        }}
      />

      <DetailModal startup={selected} onClose={() => setSelected(null)} />


    </div>
  );
}
