import { ImageResponse } from "next/og";
import { getJobsForStartupSlug } from "../../../../lib/jobs.js";
import { getSiteHostname } from "../../../../lib/site-url.js";
import { prettyName } from "../../../../lib/startupUi.js";

export const alt = "Startup jobs in Hyderabad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CompanyJobsOgImage({ params }) {
  const { startup, jobs } = await getJobsForStartupSlug(params.slug);
  const name = startup ? prettyName(startup.name) : "Hyderabad Startup";
  const count = jobs.length;
  const countLabel =
    count === 0 ? "Open roles" : `${count} open role${count === 1 ? "" : "s"}`;
  const sector = startup?.sector || "Startup";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          fontFamily: "Arial, sans-serif",
          background: "linear-gradient(135deg, #0a0e1e 0%, #141b33 55%, #1a2540 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#ff5722",
              color: "#fff",
              fontSize: 26,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            H
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", display: "flex" }}>
            Startup Jobs in Hyderabad
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "#ffffff",
              letterSpacing: "-1px",
              display: "flex",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#ff5722",
              display: "flex",
            }}
          >
            {countLabel}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.72)",
              display: "flex",
            }}
          >
            {sector} · Hyderabad startup careers
          </div>
        </div>

        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            display: "flex",
          }}
        >
          {getSiteHostname()}
        </div>
      </div>
    ),
    { ...size }
  );
}
