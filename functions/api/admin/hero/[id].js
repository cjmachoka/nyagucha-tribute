import { requireAdmin } from "../../../_lib/auth.js";
import { deleteImage } from "../../../_lib/upload.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  if (request.method === "DELETE") return remove(id, env);
  if (request.method === "PATCH") return update(id, request, env);
  return new Response("Method not allowed", { status: 405 });
}

async function remove(id, env) {
  const row = await env.DB.prepare(`SELECT image_key FROM hero_media WHERE id = ?`).bind(id).first();
  if (row?.image_key) await deleteImage(env, row.image_key);
  await env.DB.prepare(`DELETE FROM hero_media WHERE id = ?`).bind(id).run();
  return Response.json({ ok: true });
}

const FITS = ["cover", "contain"];
const FOCI = ["center", "top", "bottom", "left", "right"];

async function update(id, request, env) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.position === "number") {
    await env.DB.prepare(`UPDATE hero_media SET position = ? WHERE id = ?`).bind(body.position, id).run();
  }
  if (typeof body.fit === "string" && FITS.includes(body.fit)) {
    await env.DB.prepare(`UPDATE hero_media SET fit = ? WHERE id = ?`).bind(body.fit, id).run();
  }
  if (typeof body.focus === "string" && FOCI.includes(body.focus)) {
    await env.DB.prepare(`UPDATE hero_media SET focus = ? WHERE id = ?`).bind(body.focus, id).run();
  }
  return Response.json({ ok: true });
}
