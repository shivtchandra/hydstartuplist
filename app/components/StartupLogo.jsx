"use client";

import { useState } from "react";
import { colorFor, logoSrcs } from "../../lib/startupUi.js";

export default function StartupLogo({ name, website, logoUrl, sector, size = 56 }) {
  const srcs = logoSrcs(website, logoUrl);
  const [stage, setStage] = useState(0);

  if (stage < srcs.length) {
    return (
      <img
        className="card-logo startup-detail-logo"
        src={srcs[stage]}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 16 && e.currentTarget.naturalHeight <= 16) {
            setStage((s) => s + 1);
          }
        }}
        onError={() => setStage((s) => s + 1)}
      />
    );
  }

  return (
    <div
      className="card-logo-fallback startup-detail-logo"
      style={{ width: size, height: size, background: colorFor(sector) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
