import { Suspense } from "react";
import LoadingScreen from "../components/LoadingScreen.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export default function Layout({ children }) {
  return (
    <Suspense fallback={<div className="page-with-nav"><LoadingScreen label="Loading jobs…" /></div>}>
      {children}
      <SiteFooter />
    </Suspense>
  );
}
