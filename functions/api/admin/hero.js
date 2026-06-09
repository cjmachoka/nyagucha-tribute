import { requireAdmin } from "../../_lib/auth.js";
import { uploadMedia } from "../../_lib/upload.js";

export async function onRequest(context) {
  const { request, env } = context;
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  if (request.method === "GET") return list(env);
  if (request.method === "POST") return create(request, env);
  return new Response("Method not allowed", { status: 405 });
}

async function list(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, type, image_url, fit, focus, position, created_at
     FROM hero_media ORDER BY position ASC, id ASC`
  ).all();
  return Response.json({ items: results });
}

async function create(request, env) {
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file" }, { status: 400 });
  }

  let uploaded;
  try {
    uploaded = await uploadMedia(env, file, "hero");
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const next = await env.DB.prepare(
    `SELECT COALESCE(MAX(position), 0) + 1 AS p FROM hero_media`
  ).first();

  const res = await env.DB.prepare(
    `INSERT INTO hero_media (type, image_key, image_url, position) VALUES (?, ?, ?, ?)`
  ).bind(uploaded.type, uploaded.key, uploaded.url, next.p).run();

  return Response.json({ ok: true, id: res.meta.last_row_id, ...uploaded });
}
