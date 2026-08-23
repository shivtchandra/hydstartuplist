"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { colorFor, faviconUrl, prettyName, normalizeArea } from "../../lib/startupUi.js";

function LogoBadge({ name, website, sector, size = 36 }) {
  const fav = faviconUrl(website);
  const [failed, setFailed] = useState(false);
  if (fav && !failed) {
    return <img className="card-logo" src={fav} alt="" width={size} height={size} style={{ width: size, height: size }} onError={() => setFailed(true)} />;
  }
  return (
    <div className="card-logo-fallback" style={{ width: size, height: size, background: colorFor(sector) }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function SubscribeForm({ variant = "" }) {
  const [email, setEmail] = useState("");
  const [wantsJobAlerts, setWantsJobAlerts] = useState(true);
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("saving");
    try {
      await addDoc(collection(db, "subscribers"), {
        email: email.trim(),
        wantsJobAlerts,
        source: "newsletter-page",
        createdAt: serverTimestamp(),
      });
      setStatus("done");
    } catch (err) {
      console.error("newsletter subscribe failed:", err);
      setStatus("error");
    }
  }

  if (status === "done") {
    return <div className={`nls-done ${variant}`}>Subscribed — we'll notify you once sending is live.</div>;
  }

  return (
    <form className={`nls-form ${variant}`} onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button className="btn cmd-submit" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "…" : "Notify me →"}
      </button>
      {status === "error" && <div className="nl-error">Couldn't save — try again.</div>}
      <label className="nl-check">
        <input type="checkbox" checked={wantsJobAlerts} onChange={(e) => setWantsJobAlerts(e.target.checked)} />
        <span>Also alert me about new job openings</span>
      </label>
    </form>
  );
}

export default function NewsletterPage() {
  const [startups, setStartups] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/startups").then((r) => r.json()),
      fetch("/api/news").then((r) => r.json()),
    ])
      .then(([s, n]) => { setStartups(s); setNews(n); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const hiring = startups.filter((s) => s.hiring);
    const areas = new Set(startups.map((s) => normalizeArea(s.area)));
    const sectors = new Set(startups.map((s) => s.sector));
    const openRoles = hiring.reduce((a, s) => a + (s.hiring.count || 0), 0);
    return {
      total: startups.length,
      hiring: hiring.length,
      openRoles,
      areas: areas.size,
      sectors: sectors.size,
    };
  }, [startups]);

  const topHiring = useMemo(
    () => startups.filter((s) => s.hiring).sort((a, b) => (b.hiring.count || 0) - (a.hiring.count || 0)).slice(0, 5),
    [startups]
  );
  const recentNews = news.slice(0, 5);

  return (
    <div className="page-with-nav">
      <SiteNav active="newsletter" />
      <div className="nls-page">
      <section className="nls-hero">
        <div className="nls-hero-eyebrow">Hyderabad Startup Map · Newsletter</div>
        <h1 className="nls-hero-title">
          We track {loading ? "…" : stats.total.toLocaleString()}+ Hyderabad startups so you don't have to.
        </h1>
        <p className="nls-hero-sub">
          Real companies, real job openings, real funding news — sourced and verified, not scraped and dumped.
          Sign up and we'll notify you once sending goes live.
        </p>
        <SubscribeForm variant="nls-hero-form" />
        <p className="nls-hero-note">Free · No spam · Sending not live yet — this saves your spot for launch.</p>
      </section>

      <section className="nls-stats">
        <div className="nls-stat"><strong>{loading ? "—" : stats.total.toLocaleString()}</strong><span>startups tracked</span></div>
        <div className="nls-stat"><strong>{loading ? "—" : stats.hiring}</strong><span>hiring right now</span></div>
        <div className="nls-stat"><strong>{loading ? "—" : stats.openRoles}</strong><span>open roles detected</span></div>
        <div className="nls-stat"><strong>{loading ? "—" : stats.areas}</strong><span>Hyderabad localities</span></div>
        <div className="nls-stat"><strong>{loading ? "—" : stats.sectors}</strong><span>sectors covered</span></div>
      </section>

      <section className="nls-section">
        <h2 className="nls-section-title">This week's hiring picks</h2>
        <p className="nls-section-sub">Real open roles, detected from public job boards — not a guess.</p>
        {!loading && topHiring.length === 0 && <p className="form-sub">No hiring detected right now — check back soon.</p>}
        <div className="feed-list">
          {topHiring.map((s) => (
            <a key={s.id} className="feed-row" style={{ "--row-accent": colorFor(s.sector) }} href={`/?company=${s.id}`}>
              <LogoBadge name={s.name} website={s.website} sector={s.sector} />
              <div className="feed-row-body">
                <div className="feed-row-name">{prettyName(s.name)}</div>
                <div className="feed-row-sub">{s.sector} · {s.area}</div>
              </div>
              <span className="s-open"><span className="hiring-dot" />{s.hiring.count} open</span>
            </a>
          ))}
        </div>
      </section>

      <section className="nls-section">
        <h2 className="nls-section-title">Recent startup news</h2>
        <p className="nls-section-sub">Pulled from verified public news sources, matched to real companies.</p>
        {!loading && recentNews.length === 0 && <p className="form-sub">No recent news yet — check back soon.</p>}
        <div className="feed-list">
          {recentNews.map((item, i) => (
            <a key={item.url + i} className="feed-row" href={item.url} target="_blank" rel="noreferrer">
              <LogoBadge name={item.companyName} website={item.website} sector={item.sector} />
              <div className="feed-row-body">
                <div className="feed-row-name">{item.title}</div>
                <div className="feed-row-sub">{prettyName(item.companyName)}{item.source ? ` · ${item.source}` : ""}</div>
              </div>
            </a>
          ))}
        </div>
        <Link href="/news" className="nls-more-link">See all news →</Link>
      </section>

      <section className="nls-cta">
        <h2>Get the next update</h2>
        <p>One place for Hyderabad's startup jobs, funding news and new launches.</p>
        <SubscribeForm variant="nls-cta-form" />
      </section>
      </div>
    </div>
  );
}
