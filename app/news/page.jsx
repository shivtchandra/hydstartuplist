"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <a className="feed-row" href={item.url} target="_blank" rel="noreferrer">
      <NewsLogoBadge companyName={item.companyName} website={item.website} sector={item.sector} size={40} />
      <div className="feed-row-body">
        <div className="feed-row-name">{item.title}</div>
        <div className="feed-row-sub">
          {prettyName(item.companyName)}{item.source ? ` · ${item.source}` : ""}
          {age ? ` · ${age.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
        </div>
      </div>
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
    <div className="feed-page">
      <div className="feed-head">
        <Link href="/" className="feed-back-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to map
        </Link>
        <h1 className="form-title">Startup News</h1>
        <p className="form-sub">
          Recent coverage of Hyderabad startups pulled from verified news sources.
        </p>
      </div>

      {loading && <p className="form-sub">Loading news updates…</p>}
      {!loading && items.length === 0 && (
        <p className="form-sub">No recent news found yet — this refreshes periodically.</p>
      )}
      <div className="feed-list">
        {items.map((item, i) => <NewsRow key={item.url + i} item={item} />)}
      </div>
    </div>
  );
}

