import { ImageResponse } from "next/og";

export const alt = "Hyderabad Startup Map — 1,000+ startups across Hyderabad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const clusters = [
  [660, 280, 241], [720, 330, 153], [795, 300, 107], [610, 230, 55],
  [545, 350, 35], [735, 390, 41], [845, 360, 23], [940, 300, 14],
  [1015, 365, 7], [510, 260, 9], [890, 435, 8], [980, 460, 16],
  [590, 430, 14], [690, 455, 17], [1045, 250, 6], [770, 205, 7],
];

const logoPins = [
  [500, 200, "H", "#0f9f8f"], [820, 210, "P", "#315be9"], [900, 515, "B", "#0e94a7"],
  [1040, 470, "T", "#0b8fab"], [575, 505, "Z", "#1f2937"], [710, 520, "D", "#0ea5e9"],
];

function Cluster({ x, y, count }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 58,
        height: 58,
        borderRadius: 999,
        background: "#ff5722",
        border: "4px solid rgba(255,255,255,0.88)",
        boxShadow: "0 10px 26px rgba(255,87,34,0.34)",
        color: "#fff",
        fontSize: count > 99 ? 20 : 23,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {count}
    </div>
  );
}

function LogoPin({ x, y, label, color }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 52,
        height: 52,
        borderRadius: 999,
        background: "#fff",
        border: `4px solid ${color}`,
        boxShadow: "0 10px 22px rgba(15,23,42,0.18)",
        color,
        fontSize: 22,
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          overflow: "hidden",
          background: "#eef3f2",
          fontFamily: "Arial, sans-serif",
          color: "#10172a",
        }}
      >
        <div style={{ position: "absolute", left: 880, top: -80, width: 420, height: 260, borderRadius: 999, background: "#d9edcf" }} />
        <div style={{ position: "absolute", left: 835, top: 395, width: 430, height: 285, borderRadius: 999, background: "#d8ead0" }} />
        <div style={{ position: "absolute", left: 390, top: 260, width: 250, height: 170, borderRadius: 999, background: "#d5e9e6" }} />
        {[
          [420, 96, 710, 4, 8],
          [500, 170, 610, 4, -16],
          [455, 360, 660, 4, 4],
          [520, 500, 570, 4, -10],
          [640, 70, 4, 520, 0],
          [750, 120, 4, 480, 0],
          [880, 90, 4, 500, 0],
          [990, 120, 4, 430, 0],
        ].map(([left, top, width, height, rotate]) => (
          <div
            key={`${left}-${top}`}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              background: "#f1dcae",
              opacity: 0.72,
              transform: `rotate(${rotate}deg)`,
              borderRadius: 99,
            }}
          />
        ))}

        {clusters.map(([x, y, count]) => <Cluster key={`${x}-${y}`} x={x} y={y} count={count} />)}
        {logoPins.map(([x, y, label, color]) => <LogoPin key={`${x}-${y}`} x={x} y={y} label={label} color={color} />)}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 38%, rgba(255,255,255,0.2) 70%, rgba(255,255,255,0) 100%)",
          }}
        />

        <div style={{ position: "absolute", left: 72, top: 66, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 15,
              background: "#ff5722",
              color: "#fff",
              fontSize: 30,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 28px rgba(255,87,34,0.32)",
            }}
          >
            H
          </div>
          <div style={{ fontSize: 33, fontWeight: 900, display: "flex" }}>
            Hyderabad<span style={{ color: "#ff5722" }}>StartupMap</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: 72, top: 205, width: 620, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, lineHeight: 1.02, fontWeight: 900, letterSpacing: "-1px" }}>
            Hyderabad Startup Map
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.28, color: "#334155", fontWeight: 600 }}>
            1,000+ startups across Gachibowli, HITEC City, Madhapur and more
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {["Hiring", "Funding stages", "Jobs", "News"].map((item) => (
              <div
                key={item}
                style={{
                  padding: "10px 15px",
                  borderRadius: 999,
                  background: "#fff",
                  border: "1px solid rgba(148,163,184,0.34)",
                  color: "#475569",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 56,
            bottom: 44,
            padding: "13px 18px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.9)",
            color: "#ff5722",
            fontSize: 21,
            fontWeight: 900,
            border: "1px solid rgba(255,87,34,0.24)",
          }}
        >
          hydstartuplist.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
