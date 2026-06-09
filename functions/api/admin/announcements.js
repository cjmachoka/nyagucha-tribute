import { requireAdmin } from "../../_lib/auth.js";

const KINDS = ["family-notice", "funeral", "memorial", "condolence", "news", "general"];
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
  const { results } = await env.DB.prepare(
    `SELECT id, kind, title, body, link_url, pinned, position, status, created_at, updated_at
     FROM announcements
     ORDER BY pinned DESC, position ASC, created_at DESC`
  ).all();
  return Response.json({ items: results });
}

async function create(request, env) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const title = String(body.title || "").trim();
  const content = String(body.body || "").trim();
  if (!title || !content) return Response.json({ error: "Title and body are required" }, { status: 400 });

  const kind = KINDS.includes(body.kind) ? body.kind : "general";
  const status = STATUSES.includes(body.status) ? body.status : "published";
  const pinned = body.pinned ? 1 : 0;
  const link_url = body.link_url ? String(body.link_url).trim() : null;

  const r = await env.DB.prepare(
    `INSERT INTO announcements (kind, title, body, link_url, pinned, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(kind, title, content, link_url, pinned, status).run();

  return Response.json({ ok: true, id: r.meta.last_row_id });
}
