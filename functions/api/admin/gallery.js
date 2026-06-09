import { requireAdmin } from "../../_lib/auth.js";
import { uploadImage } from "../../_lib/upload.js";
import { GALLERY_ALBUMS, normalizeAlbum } from "../../_lib/albums.js";

export async function onRequest(context) {
  const { request, env } = context;
  const denied = requireAdmin(request);
  if (denied) return denied;

  if (request.method === "GET") return list(env);
  if (request.method === "POST") return create(request, env);
  return new Response("Method not allowed", { status: 405 });
}

async function list(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, caption, album, image_key, image_url, position, status, created_at
     FROM gallery_photos
     ORDER BY position ASC, id ASC`
  ).all();
  return Response.json({ items: results, albums: GALLERY_ALBUMS });
}

async function create(request, env) {
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") || "").trim() || null;
  const album = normalizeAlbum(String(form.get("album") || "other"));
  if (!file || typeof file === "string") return Response.json({ error: "No file" }, { status: 400 });

  let up;
  try { up = await uploadImage(env, file, "gallery"); }
  catch (err) { return Response.json({ error: err.message }, { status: 400 }); }

  const pos = await env.DB.prepare(`SELECT COALESCE(MAX(position),0)+1 AS n FROM gallery_photos`).first();
  const r = await env.DB.prepare(
    `INSERT INTO gallery_photos (caption, album, image_key, image_url, position, status)
     VALUES (?, ?, ?, ?, ?, 'published')`
  ).bind(caption, album, up.key, up.url, pos.n).run();

  return Response.json({ ok: true, id: r.meta.last_row_id, album, ...up });
}
