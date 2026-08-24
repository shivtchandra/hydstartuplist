"use client";

import { useEffect, useState } from "react";
import SiteNav from "../components/SiteNav.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";
import { colorFor, logoSrcs, prettyName } from "../../lib/startupUi.js";

function FeedLogoBadge({ startup, size = 38 }) {
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

function Row({ s }) {
  return (
    <div className="feed-row">
      <FeedLogoBadge startup={s} size={40} />
      <div className="feed-row-body">
        <div className="feed-row-name">{prettyName(s.name)}</div>
        <div className="feed-row-sub">{s.sector} · {s.area}</div>
      </div>
      <div className="feed-row-right">
        {s.hiring && (
          <span className="s-open">
            <span className="hiring-dot" />
            {s.hiring.count ? `${s.hiring.count} open` : "hiring"}
          </span>
        )}
        {s.hiring?.roles?.length > 0 && (
          <div className="feed-row-roles">
            {s.hiring.roles.slice(0, 3).map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer">{r.title} ↗</a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/startups")
      .then((r) => r.json())
      .then((d) => { setAll(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const hiring = all.filter((s) => s.hiring);
  const recent = all.filter((s) => s.addedAt).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

  return (
    <div className="page-with-nav">
      <SiteNav active="feed" />
      <div className="feed-page">
      <div className="feed-head">
        <h1 className="form-title">Live Startup Feed</h1>
        <p className="form-sub">What's moving in the Hyderabad startup ecosystem right now.</p>
      </div>

      <section className="feed-section">
        <h2 className="feed-section-title">
          Hiring now <span className="feed-count">{hiring.length}</span>
        </h2>
        {loading && <LoadingScreen label="Waking up the hiring feed…" />}
        {!loading && hiring.length === 0 && (
          <p className="form-sub">No detected openings right now — check back soon, or search the map directly.</p>
        )}
        <div className="feed-list">
          {hiring.map((s) => <Row key={s.id} s={s} />)}
        </div>
      </section>

      <section className="feed-section">
        <h2 className="feed-section-title">
          Recently added <span className="feed-count">{recent.length}</span>
        </h2>
        {!loading && recent.length === 0 && (
          <p className="form-sub">No timestamped additions yet — this fills in as new listings and claims are approved.</p>
        )}
        <div className="feed-list">
          {recent.slice(0, 30).map((s) => <Row key={s.id} s={s} />)}
        </div>
      </section>
      </div>
    </div>
  );
}
