import { getSiteHostname } from "../lib/site-url.js";
import { ImageResponse } from "next/og";

export const alt = "Hyderabad Startup Map — 1,000+ startups across Hyderabad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // Solid dark canvas — never depend on a remote map tile for contrast.
  // (mapSrc was always null, so white text sat on cream and vanished in previews.)
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
          background: "#0f172a",
        }}
      >
        {/* Soft accent glow (right) — atmosphere without killing contrast */}
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -120,
            width: 520,
            height: 520,
            borderRadius: 999,
            background: "rgba(255,87,34,0.22)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 120,
            bottom: -160,
            width: 420,
            height: 420,
            borderRadius: 999,
            background: "rgba(37,99,235,0.16)",
          }}
        />

        {/* Brand + text block */}
        <div
          style={{
            position: "absolute",
            left: 68,
            top: 0,
            bottom: 0,
            width: 760,
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
            <div style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc", display: "flex" }}>
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
              color: "#cbd5e1",
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
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  color: "#f1f5f9",
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
            color: "#94a3b8",
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
