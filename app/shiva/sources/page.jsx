"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

function pct(n, d) {
  if (!d) return null;
  return Math.round((1000 * n) / d) / 10;
}

function fmtPct(n) {
  return n == null ? "—" : `${n}%`;
}

function fmtWhen(ts) {
  if (!ts) return "Never";
  try {
    return new Date(ts).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function parseKey(key) {
  const [variant = "—", device = "—", source = "—"] = String(key).split("/");
  return { variant, device, source };
}

function rollup(funnel, field) {
  const map = {};
  for (const [key, f] of Object.entries(funnel || {})) {
    const parts = parseKey(key);
    const k = parts[field] || "—";
    const row = map[k] || { landings: 0, useful: 0, apply: 0 };
    row.landings += f.landings || 0;
    row.useful += f.useful || 0;
    row.apply += f.apply || 0;
    map[k] = row;
  }
  return Object.entries(map)
    .map(([name, f]) => ({
      name,
      ...f,
      usefulRate: pct(f.useful, f.landings),
      applyRate: pct(f.apply, f.landings),
    }))
    .sort((a, b) => b.landings - a.landings);
}

export default function SourceHealthPage() {
  const [pass, setPass] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(e) {
    e?.preventDefault?.();
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/admin/source-health", {
        headers: { "x-admin-passcode": pass },
      });
      if (!r.ok) throw Error();
      setData(await r.json());
    } catch {
      setError("Could not load. Check passcode.");
    } finally {
      setBusy(false);
    }
  }

  const totals = useMemo(() => {
    if (!data?.funnel) return null;
    return Object.values(data.funnel).reduce(
      (acc, f) => ({
        landings: acc.landings + (f.landings || 0),
        useful: acc.useful + (f.useful || 0),
        apply: acc.apply + (f.apply || 0),
      }),
      { landings: 0, useful: 0, apply: 0 }
    );
  }, [data]);

  const usefulRate = totals ? pct(totals.useful, totals.landings) : null;
  const applyRate = totals ? pct(totals.apply, totals.landings) : null;

  const rows = useMemo(() => {
    if (!data?.funnel) return [];
    return Object.entries(data.funnel)
      .map(([key, f]) => {
        const parts = parseKey(key);
        return {
          key,
          ...parts,
          landings: f.landings || 0,
          useful: f.useful || 0,
          apply: f.apply || 0,
          usefulRate: pct(f.useful || 0, f.landings || 0),
          applyRate: pct(f.apply || 0, f.landings || 0),
        };
      })
      .sort((a, b) => b.landings - a.landings);
  }, [data]);

  const byVariant = useMemo(() => rollup(data?.funnel, "variant"), [data]);
  const byDevice = useMemo(() => rollup(data?.funnel, "device"), [data]);
  const bySource = useMemo(() => rollup(data?.funnel, "source"), [data]);

  const boards = data?.boards || [];
  const overdueBoards = boards.filter((b) => b.overdue || b.error);
  const insights = useMemo(() => {
    if (!totals?.landings) return [];
    const out = [];
    if (usefulRate != null) {
      out.push(
        usefulRate >= 35
          ? `Engagement looks healthy — ${usefulRate}% of landings do something useful (role, company, save, or apply).`
          : `Useful-visit rate is ${usefulRate}%. Lift detail/company opens before chasing more traffic.`
      );
    }
    if (applyRate != null) {
      out.push(
        applyRate >= 8
          ? `Apply exits at ${applyRate}% of landings — solid for a discovery map.`
          : `Apply exits are ${applyRate}% of landings. Check job quality and apply CTA friction.`
      );
    }
    const phoneShare = byDevice.find((d) => d.name === "phone");
    if (phoneShare) {
      const phonePct = pct(phoneShare.landings, totals.landings);
      if (phonePct != null) out.push(`Phone is ~${phonePct}% of landings — mobile UX is the product.`);
    }
    const bestApply = [...rows]
      .filter((r) => r.landings >= 10)
      .sort((a, b) => (b.applyRate || 0) - (a.applyRate || 0))[0];
    if (bestApply) {
      out.push(
        `Best convert (≥10 landings): ${bestApply.variant} / ${bestApply.device} / ${bestApply.source} → ${fmtPct(bestApply.applyRate)} apply.`
      );
    }
    if (overdueBoards.length) {
      out.push(`${overdueBoards.length} career board(s) overdue or errored — job sync may be stale.`);
    }
    return out;
  }, [totals, usefulRate, applyRate, byDevice, rows, overdueBoards.length]);

  return (
    <div className="admin-page src-page">
      <div className="admin-head">
        <div>
          <h1 className="form-title" style={{ margin: 0 }}>
            Funnel &amp; sources
          </h1>
          <p className="form-sub" style={{ margin: "4px 0 0" }}>
            Anonymous 28-day sessions · deep traffic stays in GA4
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btn-ghost" href="/shiva">
            Ops
          </Link>
          <Link className="btn btn-ghost" href="/">
            Map
          </Link>
        </div>
      </div>

      {!data && (
        <form className="src-login" onSubmit={load}>
          <input
            type="password"
            aria-label="Admin passcode"
            placeholder="Passcode"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
          />
          <button className="btn cmd-submit" type="submit" disabled={busy}>
            {busy ? "Loading…" : "Load dashboard"}
          </button>
          {error && <p className="form-error">{error}</p>}
        </form>
      )}

      {data && (
        <>
          <div className="src-toolbar">
            <button className="btn btn-ghost" type="button" onClick={load} disabled={busy}>
              {busy ? "Refreshing…" : "Refresh"}
            </button>
            <span className="form-sub">
              Background today: {data.usage?.calls || 0} scans · ₹{data.usage?.estimatedInr || 0} est.
            </span>
          </div>

          {totals && (
            <section className="src-kpis" aria-label="28-day totals">
              <article className="src-kpi">
                <span className="src-kpi-label">Landings</span>
                <strong className="src-kpi-value">{totals.landings}</strong>
                <span className="src-kpi-hint">sessions with a landing event</span>
              </article>
              <article className="src-kpi">
                <span className="src-kpi-label">Useful visits</span>
                <strong className="src-kpi-value">{totals.useful}</strong>
                <span className="src-kpi-hint">{fmtPct(usefulRate)} of landings</span>
              </article>
              <article className="src-kpi">
                <span className="src-kpi-label">Apply exits</span>
                <strong className="src-kpi-value">{totals.apply}</strong>
                <span className="src-kpi-hint">{fmtPct(applyRate)} of landings</span>
              </article>
            </section>
          )}

          {insights.length > 0 && (
            <section className="src-insights" aria-label="Takeaways">
              <h2>What to make of this</h2>
              <ul>
                {insights.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="src-section">
            <h2>By slice</h2>
            <div className="src-rollups">
              {[
                ["Variant", byVariant],
                ["Device", byDevice],
                ["Source", bySource],
              ].map(([title, list]) => (
                <div key={title} className="src-card">
                  <h3>{title}</h3>
                  <table className="src-table">
                    <thead>
                      <tr>
                        <th>{title}</th>
                        <th>Land</th>
                        <th>Useful</th>
                        <th>Apply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr key={r.name}>
                          <td>{r.name}</td>
                          <td>{r.landings}</td>
                          <td>
                            {r.useful}
                            <span className="src-muted"> {fmtPct(r.usefulRate)}</span>
                          </td>
                          <td>
                            {r.apply}
                            <span className="src-muted"> {fmtPct(r.applyRate)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>

          <section className="src-section">
            <h2>Full breakdown</h2>
            <div className="src-table-wrap">
              <table className="src-table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Device</th>
                    <th>Source</th>
                    <th>Landings</th>
                    <th>Useful</th>
                    <th>Apply</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td>{r.variant}</td>
                      <td>{r.device}</td>
                      <td>{r.source}</td>
                      <td>{r.landings}</td>
                      <td>
                        {r.useful}
                        <span className="src-muted"> {fmtPct(r.usefulRate)}</span>
                      </td>
                      <td>
                        {r.apply}
                        <span className="src-muted"> {fmtPct(r.applyRate)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="src-section">
            <h2>Career boards</h2>
            {boards.length === 0 ? (
              <p className="form-sub">No board status docs yet.</p>
            ) : (
              <div className="src-table-wrap">
                <table className="src-table">
                  <thead>
                    <tr>
                      <th>Board</th>
                      <th>Last success</th>
                      <th>Status</th>
                      <th>Fails</th>
                      <th>Roles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boards.map((b) => {
                      const status = b.error || (b.overdue ? "Overdue" : "Current");
                      const bad = Boolean(b.error || b.overdue);
                      return (
                        <tr key={b.boardId}>
                          <td>{b.boardId}</td>
                          <td>{fmtWhen(b.lastSuccessAt)}</td>
                          <td>
                            <span className={`src-pill${bad ? " is-bad" : " is-ok"}`}>{status}</span>
                          </td>
                          <td>{b.failures || 0}</td>
                          <td>{b.activeJobs || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
