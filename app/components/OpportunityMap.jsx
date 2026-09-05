'use client';
import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '../../lib/engagement-client.js';

const AREA_ZOOM_MAX = 12;
const COMPANY_ZOOM_MIN = 13;

export default function OpportunityMap({ companies, onSelect, onBounds }) {
  const node = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const leaflet = useRef(null);
  const callbacks = useRef({ onSelect, onBounds });
  callbacks.current = { onSelect, onBounds };

  const [zoom, setZoom] = useState(12);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance;
    setFailed(false);
    const timer = setTimeout(() => {
      if (!map.current) {
        setFailed(true);
        trackEvent('map_error');
      }
    }, 8000);

    import('leaflet')
      .then(async (module) => {
        await import('leaflet/dist/leaflet.css');
        if (cancelled) return;
        const L = module.default;
        leaflet.current = L;
        instance = L.map(node.current, {
          center: [17.448, 78.39],
          zoom: 12,
          scrollWheelZoom: false,
        });
        map.current = instance;
        const key = process.env.NEXT_PUBLIC_STADIA_KEY;
        const tiles = L.tileLayer(
          `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png${key ? '?api_key=' + key : ''}`,
          { attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap', maxZoom: 19 }
        );
        let errors = 0;
        tiles.on('tileerror', () => {
          if (++errors === 3) {
            setFailed(true);
            trackEvent('map_error');
          }
        });
        tiles.addTo(instance);
        layer.current = L.layerGroup().addTo(instance);
        instance.on('dragend zoomend', () => {
          setMoved(true);
          setZoom(instance.getZoom());
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          trackEvent('map_error');
        }
      });

    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    if (node.current) observer.observe(node.current);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer.disconnect();
      instance?.remove();
      map.current = null;
      setReady(false);
    };
  }, [attempt]);

  useEffect(() => {
    if (!ready || !layer.current || !leaflet.current || !map.current) return;

    const L = leaflet.current;
    layer.current.clearLayers();

    const located = companies.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
    const areas = new globalThis.Map();

    for (const c of located) {
      const areaKey = c.area || 'Hyderabad';
      if (!areas.has(areaKey)) {
        areas.set(areaKey, {
          name: areaKey,
          area: areaKey,
          count: 0,
          employers: 0,
          lat: 0,
          lng: 0,
          precision: 'area',
          isArea: true,
        });
      }
      const a = areas.get(areaKey);
      a.count += c.count;
      a.employers += 1;
      a.lat += c.lat;
      a.lng += c.lng;
    }

    const showCompanies = zoom >= COMPANY_ZOOM_MIN;
    const markers = showCompanies
      ? located
      : [...areas.values()].map((a) => ({
          ...a,
          lat: a.lat / a.employers,
          lng: a.lng / a.employers,
        }));

    function zoomToArea(areaName) {
      const members = located.filter((c) => (c.area || 'Hyderabad') === areaName);
      if (!members.length || !map.current) return;

      trackEvent('map_zoom_area');

      if (members.length === 1) {
        map.current.setView(
          [members[0].lat, members[0].lng],
          Math.max(map.current.getZoom(), COMPANY_ZOOM_MIN + 1),
          { animate: true }
        );
        return;
      }

      const bounds = L.latLngBounds(members.map((m) => [m.lat, m.lng]));
      if (bounds.getNorth() === bounds.getSouth() && bounds.getEast() === bounds.getWest()) {
        map.current.setView(
          [bounds.getNorth(), bounds.getEast()],
          Math.max(map.current.getZoom(), COMPANY_ZOOM_MIN + 1),
          { animate: true }
        );
        return;
      }

      map.current.once('moveend', () => {
        if (map.current && map.current.getZoom() < COMPANY_ZOOM_MIN) {
          map.current.setZoom(COMPANY_ZOOM_MIN, { animate: true });
        }
      });
      map.current.fitBounds(bounds.pad(0.4), {
        maxZoom: 15,
        animate: true,
      });
    }

    for (const c of markers) {
      const count = Number(c.count) || 0;
      const marker = L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          className: 'op-map-pin',
          html: `<span>${count}</span>`,
          iconSize: [36, 36],
        }),
      });

      if (c.isArea) {
        const tip = document.createElement('span');
        tip.textContent = `${c.name} · ${count} roles · ${c.employers} companies — click to zoom`;
        marker.bindTooltip(tip);
        marker.on('click', () => zoomToArea(c.area));
      } else {
        const tip = document.createElement('span');
        tip.textContent = `${c.name} · ${count} open role${count === 1 ? '' : 's'}`;
        marker.bindTooltip(tip);

        const popup = L.popup({ closeButton: true, offset: [0, -8], className: 'op-map-popup' });
        const body = document.createElement('div');
        body.className = 'op-map-popup-body';
        body.innerHTML = `<strong class="op-map-popup-name"></strong><p class="op-map-popup-meta"></p>`;
        body.querySelector('.op-map-popup-name').textContent = c.name;
        body.querySelector('.op-map-popup-meta').textContent =
          `${count} open role${count === 1 ? '' : 's'}` +
          (c.area ? ` · ${c.area}` : '') +
          (c.precision === 'office' ? ' · Verified office' : '');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'op-map-popup-btn';
        btn.textContent = 'Show roles';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          callbacks.current.onSelect?.(c);
        });
        body.appendChild(btn);
        popup.setContent(body);

        marker.bindPopup(popup);
        marker.on('click', () => {
          marker.openPopup();
        });
      }

      marker.addTo(layer.current);
    }
  }, [companies, ready, zoom]);

  return (
    <div className="op-map-wrap">
      <div className="op-map" ref={node} aria-label="Hiring companies map" />
      {(!ready || failed) && (
        <div className="op-map-status" role="status">
          {failed ? (
            <>
              <strong>Map unavailable</strong>
              <p>Your job results still work.</p>
              <button onClick={() => setAttempt((a) => a + 1)}>Retry map</button>
            </>
          ) : (
            <span>Loading area map…</span>
          )}
        </div>
      )}
      {moved && ready && !failed && (
        <button
          className="op-search-area"
          onClick={() => {
            const b = map.current.getBounds();
            callbacks.current.onBounds?.({
              south: b.getSouth(),
              north: b.getNorth(),
              west: b.getWest(),
              east: b.getEast(),
            });
            setMoved(false);
          }}
        >
          Search this area
        </button>
      )}
      <p className="op-map-caption">
        {zoom >= COMPANY_ZOOM_MIN
          ? 'Company pins show open roles. Click a pin to open that employer.'
          : 'Click a number to zoom in and see companies hiring there.'}
      </p>
    </div>
  );
}
