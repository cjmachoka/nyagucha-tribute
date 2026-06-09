import { requireAdmin } from "../../../_lib/auth.js";

const KINDS = ["family-notice", "funeral", "memorial", "condolence", "news", "general"];
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
  if (body.kind !== undefined) {
    const v = KINDS.includes(body.kind) ? body.kind : "general";
    sets.push("kind = ?"); binds.push(v);
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    sets.push("status = ?"); binds.push(body.status);
  }
  if (body.pinned !== undefined) {
    sets.push("pinned = ?"); binds.push(body.pinned ? 1 : 0);
  }
  if (body.link_url !== undefined) {
    sets.push("link_url = ?"); binds.push(body.link_url ? String(body.link_url).trim() : null);
  }
  if (body.position !== undefined) {
    sets.push("position = ?"); binds.push(Number(body.position) || 0);
  }

  if (sets.length === 0) return Response.json({ error: "Nothing to update" }, { status: 400 });

  sets.push("updated_at = datetime('now')");
  binds.push(id);

  const r = await env.DB.prepare(
    `UPDATE announcements SET ${sets.join(", ")} WHERE id = ?`
  ).bind(...binds).run();

  if (r.meta.changes === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, id });
}

async function remove(env, id) {
  const r = await env.DB.prepare(`DELETE FROM announcements WHERE id = ?`).bind(id).run();
  if (r.meta.changes === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, id, deleted: true });
}
