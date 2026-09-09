import Link from "next/link";

export const metadata = {
  title: "Submit a startup | Mapping HYD",
  description: "Add a Hyderabad startup to the map. Free listings, reviewed before they go live.",
};

export default function SubmitLayout({ children }) {
  return (
    <div>
      <nav aria-label="Submit page" style={{ padding: "12px 16px", fontSize: 14 }}>
        <Link href="/">Map</Link>
        {" · "}
        <Link href="/jobs">Jobs</Link>
        {" · "}
        <Link href="/stories">Stories</Link>
        {" · "}
        <Link href="/more">More</Link>
      </nav>
      {children}
    </div>
  );
}
