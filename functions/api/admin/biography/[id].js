import { requireAdmin } from "../../../_lib/auth.js";
import { deleteImage } from "../../../_lib/upload.js";

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
  if (body.title !== undefined) {
    const v = String(body.title).trim();
    if (!v) return Response.json({ error: "Title cannot be empty" }, { status: 400 });
    sets.push("title = ?"); binds.push(v);
  }
  if (body.body !== undefined) {
    const v = String(body.body).trim();
    if (!v) return Response.json({ error: "Body cannot be empty" }, { status: 400 });
    sets.push("body = ?"); binds.push(v);
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    sets.push("status = ?"); binds.push(body.status);
  }
  if (body.position !== undefined) { sets.push("position = ?"); binds.push(Number(body.position) || 0); }
  if (sets.length === 0) return Response.json({ error: "Nothing to update" }, { status: 400 });

  sets.push("updated_at = datetime('now')");
  binds.push(id);
  const r = await env.DB.prepare(`UPDATE bio_chapters SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
  if (r.meta.changes === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, id });
}

async function remove(env, id) {
  const photos = await env.DB.prepare(`SELECT image_key FROM bio_chapter_photos WHERE chapter_id = ?`).bind(id).all();
  await env.DB.prepare(`DELETE FROM bio_chapter_photos WHERE chapter_id = ?`).bind(id).run();
  const r = await env.DB.prepare(`DELETE FROM bio_chapters WHERE id = ?`).bind(id).run();
  if (r.meta.changes === 0) return Response.json({ error: "Not found" }, { status: 404 });
  for (const p of photos.results) await deleteImage(env, p.image_key);
  return Response.json({ ok: true, id, deleted: true });
}
