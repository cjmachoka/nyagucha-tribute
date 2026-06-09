import { GALLERY_ALBUMS } from "../_lib/albums.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const { results } = await env.DB.prepare(
    `SELECT id, caption, album, image_url, created_at
     FROM gallery_photos
     WHERE status = 'published'
     ORDER BY position ASC, id ASC`
  ).all();

  const albumsPresent = [];
  const seen = new Set();
  for (const r of results) {
    const a = GALLERY_ALBUMS.includes(r.album) ? r.album : "other";
    if (!seen.has(a)) { seen.add(a); albumsPresent.push(a); }
  }
  const ordered = GALLERY_ALBUMS.filter((a) => seen.has(a));

  return Response.json({ items: results, albums: ordered }, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
