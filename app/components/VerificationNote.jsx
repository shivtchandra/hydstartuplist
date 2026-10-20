import Link from "next/link";

export default function VerificationNote({ updatedAt, children }) {
  return (
    <p className="industry-section-sub" data-verified-content="true">
      {updatedAt ? <>Updated <time dateTime={updatedAt}>{updatedAt}</time>. </> : null}
      {children || (
        <>
          Counts come from the current Mapping HYD dataset and direct employer career sources.{" "}
          <Link href="/how-we-verify">How we verify listings →</Link>
        </>
      )}
    </p>
  );
}
