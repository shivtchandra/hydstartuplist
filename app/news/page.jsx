"use client";

import { useEffect, useState } from "react";
import SiteNav from "../components/SiteNav.jsx";
import { colorFor, faviconUrl, prettyName, domainOf } from "../../lib/startupUi.js";

function NewsLogoBadge({ companyName, website, sector, size = 38 }) {
  const domain = domainOf(website);
  const srcs = domain
    ? [`https://logo.clearbit.com/${domain}?size=128`, faviconUrl(website)]
    : [];
  const [stage, setStage] = useState(0);
  useEffect(() => { setStage(0); }, [website]);

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
      style={{ width: size, height: size, background: colorFor(sector) }}
    >
      {(companyName || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function NewsRow({ item }) {
  const age = item.publishedAt ? new Date(item.publishedAt) : null;
  return (
    <a className="news-card" href={item.url} target="_blank" rel="noreferrer">
      <div className="news-card-head">
        <NewsLogoBadge companyName={item.companyName} website={item.website} sector={item.sector} size={36} />
        <div className="news-card-company">{prettyName(item.companyName)}</div>
        {item.source && <span className="news-card-source">{item.source}</span>}
      </div>
      <div className="news-card-title">{item.title}</div>
      {age && (
        <div className="news-card-date">
          {age.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      )}
    </a>
  );
}

export default function NewsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => { setItems(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-with-nav">
      <SiteNav active="news" />
      <div className="feed-page">
      <div className="feed-head">
        <h1 className="form-title">Startup News</h1>
        <p className="form-sub">
          Recent coverage of Hyderabad startups pulled from verified news sources.
        </p>
      </div>

      {loading && <p className="form-sub">Loading news updates…</p>}
      {!loading && items.length === 0 && (
        <p className="form-sub">No recent news found yet — this refreshes periodically.</p>
      )}
      <div className="news-grid">
        {items.map((item, i) => <NewsRow key={item.url + i} item={item} />)}
      </div>
      </div>
    </div>
  );
}

