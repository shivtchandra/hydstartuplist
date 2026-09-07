import LoadingScreen from "../components/LoadingScreen.jsx";

export default function Loading() {
  return (
    <div className="page-with-nav nav-route-loading">
      <LoadingScreen label="Loading jobs…" />
    </div>
  );
}
