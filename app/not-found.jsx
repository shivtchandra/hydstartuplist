import SiteNav from "./components/SiteNav.jsx";
import NotFoundClient from "./components/NotFoundClient.jsx";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="page-with-nav">
      <SiteNav />
      <NotFoundClient />
    </div>
  );
}
