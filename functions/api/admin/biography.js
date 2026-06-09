import { requireAdmin } from "../../_lib/auth.js";

const STATUSES = ["published", "draft"];

export async function onRequest(context) {
  const { request, env } = context;
  const denied = requireAdmin(request);
  if (denied) return denied;

  if (request.method === "GET") return list(env);
  if (request.method === "POST") return create(request, env);
  return new Response("Method not allowed", { status: 405 });
}

async function list(env) {
  const chapters = await env.DB.prepare(
    `SELECT id, slug, title, body, position, status, created_at, updated_at
     FROM bio_chapters ORDER BY position ASC, id ASC`
  ).all();
  const photos = await env.DB.prepare(
    `SELECT id, chapter_id, caption, image_url, image_key, position
     FROM bio_chapter_photos ORDER BY position ASC, id ASC`
  ).all();
  const byChapter = {};
  for (const p of photos.results) (byChapter[p.chapter_id] ||= []).push(p);
  for (const c of chapters.results) c.photos = byChapter[c.id] || [];
  return Response.json({ chapters: chapters.results });
}

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "chapter";
}

async function create(request, env) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const title = String(body.title || "").trim();
  const content = String(body.body || "").trim();
  if (!title || !content) return Response.json({ error: "Title and body are required" }, { status: 400 });

  const status = STATUSES.includes(body.status) ? body.status : "published";
  const pos = await env.DB.prepare(`SELECT COALESCE(MAX(position),0)+1 AS n FROM bio_chapters`).first();

  let slug = body.slug ? slugify(body.slug) : slugify(title);
  const existing = await env.DB.prepare(`SELECT id FROM bio_chapters WHERE slug = ?`).bind(slug).first();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const r = await env.DB.prepare(
    `INSERT INTO bio_chapters (slug, title, body, position, status) VALUES (?, ?, ?, ?, ?)`
  ).bind(slug, title, content, pos.n, status).run();

  return Response.json({ ok: true, id: r.meta.last_row_id, slug });
}
