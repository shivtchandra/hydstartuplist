"use client";
import { useMemo, useState } from "react";

export default function SourceHealthPage() {
  const [pass, setPass] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load(e) {
    e.preventDefault();
    setError("");
    try {
      const r = await fetch("/api/admin/source-health", {
        headers: { "x-admin-passcode": pass },
      });
      if (!r.ok) throw Error();
      setData(await r.json());
    } catch {
      setError("Could not load source health. Check your admin credentials.");
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

  const usefulRate =
    totals?.landings > 0 ? Math.round((1000 * totals.useful) / totals.landings) / 10 : null;
  const applyRate =
    totals?.landings > 0 ? Math.round((1000 * totals.apply) / totals.landings) / 10 : null;

  return (
    <main className="op-shell">
      <h1>Source health &amp; useful visits</h1>
      <p className="form-sub" style={{ maxWidth: 640 }}>
        Anonymous 28-day funnel from <code>engagement_sessions</code>. For traffic and
        acquisition breakdowns, use GA4 property <code>G-WSV3VC8ESR</code> (Events:
        landing, detail, company, save, apply, share).
      </p>
      <form onSubmit={load}>
        <input
          type="password"
          aria-label="Admin passcode"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button>Load dashboard</button>
      </form>
      <p role="status">{error}</p>

      {data && (
        <>
          <h2>Background budget</h2>
          <p>
            {data.usage.calls || 0} scans · ₹{data.usage.estimatedInr || 0} estimated today
            (not a cloud billing total)
          </p>

          <h2>Landing funnel (28 days)</h2>
          {totals && (
            <p>
              <strong>{totals.landings}</strong> landings ·{" "}
              <strong>{totals.useful}</strong> useful
              {usefulRate != null ? ` (${usefulRate}%)` : ""} ·{" "}
              <strong>{totals.apply}</strong> apply exits
              {applyRate != null ? ` (${applyRate}%)` : ""}
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th>Variant / device / source</th>
                <th>Landings</th>
                <th>Useful visits</th>
                <th>Apply exits</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.funnel).map(([key, f]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{f.landings}</td>
                  <td>{f.useful}</td>
                  <td>{f.apply}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Career boards</h2>
          <table>
            <thead>
              <tr>
                <th>Board</th>
                <th>Last success</th>
                <th>State</th>
                <th>Failures</th>
                <th>Roles</th>
              </tr>
            </thead>
            <tbody>
              {data.boards.map((b) => (
                <tr key={b.boardId}>
                  <td>{b.boardId}</td>
                  <td>
                    {b.lastSuccessAt
                      ? new Date(b.lastSuccessAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td>{b.error || (b.overdue ? "Overdue" : "Current")}</td>
                  <td>{b.failures}</td>
                  <td>{b.activeJobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
