import { requireAdmin } from "../../../../_lib/auth.js";
import { uploadImage } from "../../../../_lib/upload.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const chapterId = Number(params.id);
  if (!Number.isInteger(chapterId) || chapterId <= 0) {
    return Response.json({ error: "Invalid chapter id" }, { status: 400 });
  }

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT id, caption, image_url, image_key, position
       FROM bio_chapter_photos WHERE chapter_id = ? ORDER BY position ASC, id ASC`
    ).bind(chapterId).all();
    return Response.json({ items: results });
  }

  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const exists = await env.DB.prepare(`SELECT id FROM bio_chapters WHERE id = ?`).bind(chapterId).first();
  if (!exists) return Response.json({ error: "Chapter not found" }, { status: 404 });

  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") || "").trim() || null;
  if (!file || typeof file === "string") return Response.json({ error: "No file" }, { status: 400 });

  let up;
  try { up = await uploadImage(env, file, `bio/${chapterId}`); }
  catch (err) { return Response.json({ error: err.message }, { status: 400 }); }

  const pos = await env.DB.prepare(
    `SELECT COALESCE(MAX(position),0)+1 AS n FROM bio_chapter_photos WHERE chapter_id = ?`
  ).bind(chapterId).first();

  const r = await env.DB.prepare(
    `INSERT INTO bio_chapter_photos (chapter_id, caption, image_key, image_url, position)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(chapterId, caption, up.key, up.url, pos.n).run();

  return Response.json({ ok: true, id: r.meta.last_row_id, ...up });
}
