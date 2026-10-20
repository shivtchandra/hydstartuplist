import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../../components/JobsBreadcrumbs.jsx";
import VerificationNote from "../../../../components/VerificationNote.jsx";
import { getSiteUrl } from "../../../../../lib/site-url.js";
import { breadcrumbJsonLd, itemListJsonLd, jobUrlId } from "../../../../../lib/jobs-seo.js";
import { slugify } from "../../../../../lib/slug.js";
import { getQualifiedRoleAreaPairs, getRoleAreaData } from "../../../../../lib/role-area-jobs.js";

export const revalidate = 3600;

export async function generateStaticParams() {
  const pairs = await getQualifiedRoleAreaPairs().catch(() => []);
  return pairs.map((row) => ({ area: row.area.slug, role: row.role.slug }));
}

export async function generateMetadata({ params }) {
  const data = await getRoleAreaData(params.area, params.role);
  if (!data) return { title: "Job location or role not found" };
  const url = `${getSiteUrl()}/jobs/in/${data.area.slug}/${data.role.slug}`;
  const title = `${data.title} (${data.jobs.length} Open Roles)`;
  return {
    title,
    description: data.description,
    alternates: { canonical: url },
    robots: data.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: { title, description: data.description, url, type: "website" },
  };
}

function timeAgo(iso) {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const hours = Math.max(0, Math.floor((Date.now() - time) / 3_600_000));
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export default async function RoleAreaJobsPage({ params }) {
  const data = await getRoleAreaData(params.area, params.role);
  if (!data) notFound();
  const site = getSiteUrl();
  const pageUrl = `${site}/jobs/in/${data.area.slug}/${data.role.slug}`;
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: data.area.area, href: `/jobs/in/${data.area.slug}` },
    { name: data.role.role },
  ];
  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    itemListJsonLd(data.jobs, data.title),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${pageUrl}#page`,
      url: pageUrl,
      name: data.title,
      description: data.description,
      dateModified: data.updatedAt,
      spatialCoverage: { "@type": "Place", name: `${data.area.area}, Hyderabad` },
      about: { "@type": "Occupation", name: data.role.role },
    },
  ];

  return (
    <div className="page-with-nav">
      {jsonLd.map((row, index) => (
        <script key={`${row["@type"]}-${index}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(row) }} />
      ))}
      <SiteNav active="jobs" />
      <div className="feed-page">
        <JobsBreadcrumbs items={breadcrumbs} />
        <header className="feed-head">
          <h1>{data.title}</h1>
          <p className="jobs-intro">{data.description}</p>
          <VerificationNote updatedAt={data.updatedAt} />
        </header>

        {!data.indexable && (
          <p className="form-sub">
            This valid location and role combination does not yet meet Mapping HYD&apos;s indexing threshold of five current roles across three employers. Broader pages remain available below.
          </p>
        )}

        <div className="feed-list">
          {data.jobs.map((job) => (
            <Link key={job.id} className="feed-row feed-row-link" href={`/jobs/${jobUrlId(job)}`}>
              <div className="feed-row-body">
                <div className="feed-row-name">{job.title}</div>
                <div className="feed-row-sub">{job.company} · {job.location || data.area.area}{timeAgo(job.postedAt) ? ` · ${timeAgo(job.postedAt)}` : ""}</div>
              </div>
            </Link>
          ))}
        </div>

        {data.employers.length > 0 && (
          <section className="industry-section">
            <h2>Employers with matching roles</h2>
            <ul className="industry-facet-list">
              {data.employers.map((employer) => <li key={employer}><Link href={`/jobs/company/${slugify(employer)}`}>{employer}</Link></li>)}
            </ul>
          </section>
        )}

        <nav className="industry-other-links" aria-label="Broader job searches">
          <Link href={`/jobs/in/${data.area.slug}`}>All jobs in {data.area.area}</Link>
          <Link href={`/jobs/role/${data.role.slug}`}>All {data.role.role.toLowerCase()} jobs in Hyderabad</Link>
          <Link href="/jobs">All Hyderabad jobs</Link>
        </nav>
      </div>
    </div>
  );
}
