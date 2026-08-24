/**
 * Featured map pin pricing (Hyderabad-local).
 * Edit packages / dailyRate here — UI and quotes both read this file.
 * Approx. ₹200–250/day with light bulk discount on longer packages.
 */

export const FEATURED_PRICING = {
  currency: "INR",
  currencySymbol: "₹",
  maxPins: 5,
  /** Per-day rate when the buyer picks a custom length (not a package). */
  dailyRate: 249,
  minDays: 3,
  maxDays: 180,
  packages: [
    { days: 7, amount: 2199, label: "1 week", blurb: "Test the spotlight" },
    { days: 14, amount: 3799, label: "2 weeks", blurb: "Most popular" },
    { days: 30, amount: 6499, label: "1 month", blurb: "~₹217/day" },
    { days: 90, amount: 16499, label: "1 quarter", blurb: "~₹183/day" },
  ],
};

/** Format INR for display, e.g. ₹2,199 */
export function formatINR(amount) {
  const n = Math.round(Number(amount) || 0);
  return `${FEATURED_PRICING.currencySymbol}${n.toLocaleString("en-IN")}`;
}

/**
 * Resolve quote for a day count.
 * Exact package match uses the package amount; otherwise dailyRate × days.
 */
export function quoteFeatured(days) {
  const d = Math.floor(Number(days) || 0);
  const { packages, dailyRate, minDays, maxDays, currency } = FEATURED_PRICING;
  const clamped = Math.min(maxDays, Math.max(minDays, d));
  const pkg = packages.find((p) => p.days === clamped);
  const amount = pkg ? pkg.amount : clamped * dailyRate;
  const effectiveDaily = clamped > 0 ? Math.round(amount / clamped) : dailyRate;
  return {
    days: clamped,
    amount,
    currency,
    packageId: pkg ? pkg.days : null,
    effectiveDaily,
    label: pkg ? pkg.label : `${clamped} days`,
    display: formatINR(amount),
  };
}

/** Package table for UI / docs. */
export function featuredPricingTable() {
  return FEATURED_PRICING.packages.map((p) => ({
    ...p,
    display: formatINR(p.amount),
    perDay: formatINR(Math.round(p.amount / p.days)),
  }));
}
