import { Suspense } from "react";
import LoadingScreen from "../components/LoadingScreen.jsx";

export default function Layout({ children }) {
  return (
    <Suspense fallback={<div className="page-with-nav"><LoadingScreen label="Loading jobs…" /></div>}>
      {children}
    </Suspense>
  );
}

