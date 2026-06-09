import { requireAdmin } from "../../../_lib/auth.js";
import { deleteImage } from "../../../_lib/upload.js";
import { GALLERY_ALBUMS } from "../../../_lib/albums.js";

const STATUSES = ["published", "draft"];

export async function onRequest(context) {
  const { request, env, params } = context;
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Invalid id" }, { status: 400 });

  if (request.method === "PATCH") return update(request, env, id);
  if (request.method === "DELETE") return remove(env, id);
  return new Response("Method not allowed", { status: 405 });
}

async function update(request, env, id) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const sets = [];
  const binds = [];
  if (body.caption !== undefined) { sets.push("caption = ?"); binds.push(String(body.caption).trim() || null); }
  if (body.album !== undefined) {
    if (!GALLERY_ALBUMS.includes(body.album)) return Response.json({ error: "Invalid album" }, { status: 400 });
    sets.push("album = ?"); binds.push(body.album);
  }
  if (body.position !== undefined) { sets.push("position = ?"); binds.push(Number(body.position) || 0); }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    sets.push("status = ?"); binds.push(body.status);
  }
  if (sets.length === 0) return Response.json({ error: "Nothing to update" }, { status: 400 });
  binds.push(id);
  const r = await env.DB.prepare(`UPDATE gallery_photos SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
  if (r.meta.changes === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, id });
}

async function remove(env, id) {
  const row = await env.DB.prepare(`SELECT image_key FROM gallery_photos WHERE id = ?`).bind(id).first();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  await env.DB.prepare(`DELETE FROM gallery_photos WHERE id = ?`).bind(id).run();
  await deleteImage(env, row.image_key);
  return Response.json({ ok: true, id, deleted: true });
}
