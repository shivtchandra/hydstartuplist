// Cloudflare Pages Function. Proxies /insights/* (script.js, view, event) to
// Vercel's native /_vercel/insights/* endpoints so Vercel Web Analytics continues
// to track real visitor traffic while the site is hosted statically on Cloudflare Pages.
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const rewrittenPath = url.pathname.replace(/^\/insights/, "/_vercel/insights");
  const target = new URL(rewrittenPath + url.search, env.API_ORIGIN || "https://hydstartuplist.vercel.app");
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers.set("x-real-ip", ip);
  return fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}
