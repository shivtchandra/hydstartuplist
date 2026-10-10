// Cloudflare Pages Function. The site is served as static files from Cloudflare
// Pages; /api/* (admin, payments, alerts, follows) runs on the startups-api
// Worker (api-worker/). This forwards those requests unchanged so the browser
// code keeps calling same-origin /api paths.
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, env.API_ORIGIN || "https://startups-api.shivachandra9490.workers.dev");
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
