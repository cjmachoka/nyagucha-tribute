import { requireAdmin } from "../../_lib/auth.js";
import { uploadImage, deleteImage } from "../../_lib/upload.js";

const EDITABLE_KEYS = new Set([
  "hero_eyebrow",
  "hero_name",
  "hero_meta",
  "hero_image_url",
  "hero_image_key",
  "intro_heading",
  "intro_body",
  "family_notice_heading",
  "family_notice_body",
]);

export async function onRequest(context) {
  const { request, env } = context;
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  if (request.method === "GET") return getAll(env);
  if (request.method === "PATCH") return patchSettings(request, env);
  if (request.method === "POST") return uploadHero(request, env);
  if (request.method === "DELETE") return deleteHero(env);
  return new Response("Method not allowed", { status: 405 });
}

async function getAll(env) {
  const { results } = await env.DB.prepare(`SELECT key, value FROM site_settings`).all();
  const out = {};
  for (const row of results) out[row.key] = row.value ?? "";
  return Response.json(out);
}

async function patchSettings(request, env) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const entries = Object.entries(body).filter(([k]) => EDITABLE_KEYS.has(k));
  if (entries.length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const stmts = entries.map(([k, v]) =>
    env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(k, v == null ? "" : String(v))
  );
  await env.DB.batch(stmts);

  return Response.json({ ok: true, updated: entries.length });
}

async function uploadHero(request, env) {
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
    uploaded = await uploadImage(env, file, "hero");
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const prev = await env.DB.prepare(`SELECT value FROM site_settings WHERE key = 'hero_image_key'`).first();
  if (prev?.value) await deleteImage(env, prev.value);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ('hero_image_key', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(uploaded.key),
    env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ('hero_image_url', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(uploaded.url),
  ]);

  return Response.json({ ok: true, ...uploaded });
}

async function deleteHero(env) {
  const prev = await env.DB.prepare(`SELECT value FROM site_settings WHERE key = 'hero_image_key'`).first();
  if (prev?.value) await deleteImage(env, prev.value);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ('hero_image_key', '', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = '', updated_at = datetime('now')`
    ),
    env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ('hero_image_url', '', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = '', updated_at = datetime('now')`
    ),
  ]);

  return Response.json({ ok: true });
}
