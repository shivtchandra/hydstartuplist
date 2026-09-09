import { Suspense } from "react";
import OpportunityExplorer from "../components/OpportunityExplorer.jsx";
import SoftLoginBanner from "../components/SoftLoginBanner.jsx";
import GoogleOneTap from "../components/GoogleOneTap.jsx";

export default function SavedPage() {
  return (
    <Suspense fallback={<p>Loading your shortlist…</p>}>
      <GoogleOneTap force />
      <SoftLoginBanner force />
      <OpportunityExplorer savedOnly initial={{ jobs: [], total: 0 }} />
    </Suspense>
  );
}
