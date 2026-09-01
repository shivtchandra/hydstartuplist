import Link from "next/link";

export default function JobsBreadcrumbs({ items }) {
  return (
    <nav className="jobs-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={item.href || item.name}>
            {item.href && i < items.length - 1 ? (
              <Link href={item.href}>{item.name}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined}>{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
