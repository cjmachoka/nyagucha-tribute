const STATUSES = ["pending", "approved", "rejected"];

function requireAdmin(request) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) {
    return new Response(
      JSON.stringify({ error: "Not authenticated. Sign in via Cloudflare Access." }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }
  return null;
}

export async function onRequest(context) {
  const { request, env } = context;
  const denied = requireAdmin(request);
  if (denied) return denied;

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") || "pending";
  const status = STATUSES.includes(statusParam) ? statusParam : "pending";

  const { results } = await env.DB.prepare(
    `SELECT id, name, message, email, category, image_url, image_url2, status, created_at
     FROM tributes
     WHERE status = ?
     ORDER BY created_at DESC`
  )
    .bind(status)
    .all();

  for (const row of results) {
    row.photos = [row.image_url, row.image_url2].filter(Boolean);
  }

  const counts = await env.DB.prepare(
    `SELECT status, COUNT(*) AS n FROM tributes GROUP BY status`
  ).all();

  const countMap = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const row of counts.results || []) countMap[row.status] = row.n;

  return Response.json({
    status,
    items: results,
    counts: countMap,
    admin: request.headers.get("Cf-Access-Authenticated-User-Email"),
  });
}
