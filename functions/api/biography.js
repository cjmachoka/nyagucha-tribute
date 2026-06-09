export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const chapters = await env.DB.prepare(
    `SELECT id, slug, title, body, position
     FROM bio_chapters
     WHERE status = 'published'
     ORDER BY position ASC, id ASC`
  ).all();

  const photos = await env.DB.prepare(
    `SELECT id, chapter_id, caption, image_url, position
     FROM bio_chapter_photos
     ORDER BY position ASC, id ASC`
  ).all();

  const byChapter = {};
  for (const p of photos.results) {
    (byChapter[p.chapter_id] ||= []).push(p);
  }
  for (const c of chapters.results) c.photos = byChapter[c.id] || [];

  return Response.json({ chapters: chapters.results }, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
