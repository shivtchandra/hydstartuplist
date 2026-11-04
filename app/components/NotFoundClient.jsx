'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { trackEvent } from '../../lib/engagement-client.js';
import { parseFallbackContext } from '../../lib/not-found-recovery.js';

export default function NotFoundClient() {
  const [context, setContext] = useState(null);

  useEffect(() => {
    try {
      const parsed = parseFallbackContext(window.location.pathname);
      if (parsed) {
        setContext(parsed);
        if (parsed.type === 'job') {
          trackEvent('expired_job_404_viewed', 'smart_fallback');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleRecoveryClick = (label) => {
    try {
      trackEvent('expired_job_404_recovered', label);
    } catch {
      // ignore
    }
  };

  if (context?.type === 'job') {
    const { company, role } = context;
    return (
      <section className="nf-container">
        <div className="nf-badge">Role Closed or Expired</div>
        <h1>This job opening has closed</h1>
        <p className="nf-lede">
          {role && company ? (
            <>
              The opening for <strong>{role}</strong> at <strong>{company}</strong> has either been filled or removed from the company careers portal. Job listings refresh daily straight from company career sites.
            </>
          ) : company ? (
            <>
              This role at <strong>{company}</strong> has expired or been filled. Browse currently active openings below.
            </>
          ) : (
            <>
              This listing has expired or closed. Browse live openings currently accepting applications in Hyderabad below.
            </>
          )}
        </p>

        <div className="nf-actions">
          {company && (
            <Link
              href={`/jobs?q=${encodeURIComponent(company)}`}
              className="nf-btn-primary"
              onClick={() => handleRecoveryClick('company_search')}
            >
              View open jobs at {company} &rarr;
            </Link>
          )}

          {role && (
            <Link
              href={`/jobs?q=${encodeURIComponent(role)}`}
              className="nf-btn-secondary"
              onClick={() => handleRecoveryClick('role_search')}
            >
              Search &ldquo;{role}&rdquo; roles in Hyderabad &rarr;
            </Link>
          )}

          <Link
            href="/jobs"
            className="nf-btn-secondary"
            onClick={() => handleRecoveryClick('all_jobs')}
          >
            Browse all 5,000+ live Hyderabad jobs &rarr;
          </Link>
        </div>

        <div className="nf-more-title">Explore curated categories</div>
        <div className="ui-chip-row">
          <Link href="/jobs/fresher" className="ui-chip">Freshers &amp; Entry-Level</Link>
          <Link href="/jobs/remote" className="ui-chip">Global &amp; India Remote</Link>
          <Link href="/gccs" className="ui-chip">GCC Employers</Link>
          <Link href="/" className="ui-chip">Startup Map</Link>
        </div>
      </section>
    );
  }

  if (context?.type === 'company_jobs') {
    const { company } = context;
    return (
      <section className="nf-container">
        <div className="nf-badge">Company Hub</div>
        <h1>Company listings updated</h1>
        <p className="nf-lede">
          We couldn&apos;t find a dedicated page for <strong>{company}</strong>, but active jobs and directory details may be available on the board.
        </p>
        <div className="nf-actions">
          <Link
            href={`/jobs?q=${encodeURIComponent(company)}`}
            className="nf-btn-primary"
            onClick={() => handleRecoveryClick('company_hub_search')}
          >
            Search jobs for {company} &rarr;
          </Link>
          <Link
            href="/jobs"
            className="nf-btn-secondary"
            onClick={() => handleRecoveryClick('company_hub_all')}
          >
            Browse all Hyderabad jobs &rarr;
          </Link>
        </div>
      </section>
    );
  }

  if (context?.type === 'startup') {
    const { company } = context;
    return (
      <section className="nf-container">
        <div className="nf-badge">Startup Directory</div>
        <h1>Startup profile not found</h1>
        <p className="nf-lede">
          The listing for <strong>{company}</strong> may have moved, merged, or been renamed. Search the map directory to find current office locations.
        </p>
        <div className="nf-actions">
          <Link
            href={`/?q=${encodeURIComponent(company)}`}
            className="nf-btn-primary"
            onClick={() => handleRecoveryClick('startup_search')}
          >
            Search for {company} on the startup map &rarr;
          </Link>
          <Link
            href="/"
            className="nf-btn-secondary"
            onClick={() => handleRecoveryClick('startup_home')}
          >
            Explore all Hyderabad startups &rarr;
          </Link>
        </div>
      </section>
    );
  }

  // Generic fallback (server-rendered or unrelated paths)
  return (
    <section className="ui-empty">
      <h1>We couldn&apos;t find that page</h1>
      <p>It may have moved, or the company is no longer listed. These are good places to start:</p>
      <div className="ui-chip-row">
        <Link href="/" className="ui-chip">Startup map</Link>
        <Link href="/jobs" className="ui-chip">Jobs in Hyderabad</Link>
        <Link href="/product-companies" className="ui-chip">Product companies</Link>
        <Link href="/stories" className="ui-chip">Stories</Link>
      </div>
    </section>
  );
}
