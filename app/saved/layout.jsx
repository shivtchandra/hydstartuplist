import Link from "next/link";

export const metadata = {
  title: "Saved roles | Mapping HYD",
  description: "Your shortlisted Hyderabad startup jobs on this device.",
  robots: { index: false, follow: true },
};

export default function SavedLayout({ children }) {
  return (
    <div>
      <nav aria-label="Saved page" style={{ padding: "12px 16px", fontSize: 14 }}>
        <Link href="/">Map</Link>
        {" · "}
        <Link href="/jobs">Jobs</Link>
        {" · "}
        <Link href="/gccs">GCCs</Link>
        {" · "}
        <Link href="/more">More</Link>
      </nav>
      {children}
    </div>
  );
}
