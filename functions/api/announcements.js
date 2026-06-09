export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const { results } = await env.DB.prepare(
    `SELECT id, kind, title, body, link_url, pinned, created_at
     FROM announcements
     WHERE status = 'published'
     ORDER BY pinned DESC, position ASC, created_at DESC`
  ).all();

  return Response.json({ items: results }, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
