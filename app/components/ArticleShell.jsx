import SiteNav from "./SiteNav.jsx";

/**
 * Shared article template: site nav + one header pattern (kicker, title, lede,
 * meta line) for every story, report and editorial page. Page content goes in
 * `children`, normally wrapped in <div className="story-body">.
 */
export default function ArticleShell({ kicker, title, lede, meta, navActive = "stories", children }) {
  const metaItems = (Array.isArray(meta) ? meta : [meta]).filter(Boolean);
  return (
    <div className="page-with-nav">
      <SiteNav active={navActive} />
      <article className="story-page">
        <header className="article-head">
          {kicker ? <p className="story-kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          {lede ? <p className="story-lede">{lede}</p> : null}
          {metaItems.length ? (
            <p className="story-meta">
              {metaItems.map((m, i) => (
                <span key={i}>
                  {i > 0 ? <span aria-hidden="true"> · </span> : null}
                  {m}
                </span>
              ))}
            </p>
          ) : null}
        </header>
        {children}
      </article>
    </div>
  );
}
