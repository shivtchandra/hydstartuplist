import { ImageResponse } from "next/og";

// Branded social-share card. Next's file-based convention auto-adds this as
// both og:image and twitter:image (summary_large_image) on every page that
// doesn't override it.
export const alt = "HydMap — Every Hyderabad startup on one map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #ff7a45 0%, #ff5722 55%, #e8460f 100%)",
          padding: "76px 84px",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: "26px" }}>
          <div
            style={{
              display: "flex",
              width: "104px",
              height: "104px",
              borderRadius: "26px",
              background: "rgba(255,255,255,0.16)",
              border: "2px solid rgba(255,255,255,0.35)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "68px",
              fontWeight: 800,
            }}
          >
            H
          </div>
          <div style={{ fontSize: "56px", fontWeight: 800, letterSpacing: "-1px" }}>HydMap</div>
        </div>

        {/* Headline + stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ fontSize: "82px", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-2px", maxWidth: "1000px" }}>
            Every Hyderabad startup, on one map.
          </div>
          <div style={{ fontSize: "34px", fontWeight: 500, opacity: 0.94 }}>
            1,000+ startups · who's hiring · funding · news · jobs
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
