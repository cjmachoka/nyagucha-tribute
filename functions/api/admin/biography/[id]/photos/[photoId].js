import { requireAdmin } from "../../../../../_lib/auth.js";
import { deleteImage } from "../../../../../_lib/upload.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  if (request.method !== "DELETE") return new Response("Method not allowed", { status: 405 });

  const chapterId = Number(params.id);
  const photoId = Number(params.photoId);
  if (!Number.isInteger(chapterId) || !Number.isInteger(photoId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const row = await env.DB.prepare(
    `SELECT image_key FROM bio_chapter_photos WHERE id = ? AND chapter_id = ?`
  ).bind(photoId, chapterId).first();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  await env.DB.prepare(`DELETE FROM bio_chapter_photos WHERE id = ?`).bind(photoId).run();
  await deleteImage(env, row.image_key);
  return Response.json({ ok: true, id: photoId, deleted: true });
}
