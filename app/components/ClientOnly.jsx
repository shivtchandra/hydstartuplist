"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// "Posted 4h ago" in static HTML is already wrong by the time a visitor loads it, which
// failed hydration (React #425) and re-rendered the whole page. Render such text after
// hydration only. Takes a function so the value is computed in the browser.
export default function ClientOnly({ children }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated ? children() : null;
}
