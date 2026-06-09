export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const { results } = await env.DB.prepare(
    `SELECT id, caption, image_url, created_at
     FROM gallery_photos
     WHERE status = 'published'
     ORDER BY position ASC, id ASC`
  ).all();

  return Response.json({ items: results }, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
