import Link from 'next/link';

export default function ExploreModes({active}) {
  return <nav className="explore-modes" aria-label="Explore Hyderabad">
    <Link href="/?view=companies" aria-current={active==='companies'?'page':undefined}>Startups</Link>
    <Link href="/?view=jobs" aria-current={active==='jobs'?'page':undefined}>Jobs</Link>
  </nav>;
}
