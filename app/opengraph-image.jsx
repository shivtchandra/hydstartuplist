import { getSiteHostname } from "../lib/site-url.js";
import { ImageResponse } from "next/og";

export const alt = "Hyderabad Startup Map — 1,000+ startups across Hyderabad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // The branded fallback renders locally; metadata must never wait for a tile server.
  const mapSrc = null;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          overflow: "hidden",
          fontFamily: "Arial, sans-serif",
          background: "#f5f3ef",
        }}
      >
        {/* Real map background */}
        {mapSrc && (
          <img
            src={mapSrc}
            width={1200}
            height={630}
            style={{ position: "absolute", inset: 0, objectFit: "cover" }}
          />
        )}

        {/* Left gradient so text is legible over map */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(100deg, rgba(10,14,30,0.92) 0%, rgba(10,14,30,0.82) 42%, rgba(10,14,30,0.4) 68%, rgba(10,14,30,0.05) 100%)",
          }}
        />

        {/* Brand + text block */}
        <div
          style={{
            position: "absolute",
            left: 68,
            top: 0,
            bottom: 0,
            width: 640,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0,
          }}
        >
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
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
            <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", display: "flex" }}>
              Hyderabad<span style={{ color: "#ff5722" }}>StartupMap</span>
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 58,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "#ffffff",
              letterSpacing: "-1px",
              marginBottom: 20,
              display: "flex",
            }}
          >
            Every Hyderabad startup on one map
          </div>

          {/* Sub */}
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.35,
              fontWeight: 500,
              marginBottom: 32,
              display: "flex",
            }}
          >
            1,000+ startups · Hiring feed · Jobs · Funding stages
          </div>

          {/* Pills */}
          <div style={{ display: "flex", gap: 10 }}>
            {["SaaS", "FinTech", "HealthTech", "AI/ML", "DeepTech"].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 17,
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom-right attribution */}
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: 30,
            color: "rgba(255,255,255,0.55)",
            fontSize: 15,
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
