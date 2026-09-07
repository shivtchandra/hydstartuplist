import Link from 'next/link';

export default function ExploreModes({active}) {
  return <nav className="explore-modes" aria-label="Explore Hyderabad">
    <Link href="/" aria-current={active==='companies'?'page':undefined}>Startups</Link>
    <Link href="/jobs" aria-current={active==='jobs'?'page':undefined}>Jobs</Link>
  </nav>;
}
