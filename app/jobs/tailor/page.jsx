import SiteNav from "../../components/SiteNav.jsx";
import RedirectToCareer from "./RedirectToCareer.jsx";

export const dynamic = "force-static";

// Apply Copilot moved into the Career Hub; static export has no server redirects.
export const metadata = {
  title: "Apply Copilot moved to Career Hub",
  robots: { index: false, follow: true },
};

export default function TailorPage() {
  return (
    <main>
      <SiteNav active="jobs" />
      <RedirectToCareer />
    </main>
  );
}
