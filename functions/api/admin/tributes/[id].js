const STATUSES = ["pending", "approved", "rejected"];
const CATEGORIES = ["family", "friends", "colleagues", "patients", "community", "other"];

function requireAdmin(request) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) {
    return new Response(
      JSON.stringify({ error: "Not authenticated. Sign in via Cloudflare Access." }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }
  return null;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  if (request.method === "PATCH") {
    return updateTribute(request, env, id);
  }
  if (request.method === "DELETE") {
    return deleteTribute(env, id);
  }
  return new Response("Method not allowed", { status: 405 });
}

async function updateTribute(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sets = [];
  const binds = [];

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    sets.push("status = ?");
    binds.push(body.status);
  }

  if (body.category !== undefined) {
    const cat = CATEGORIES.includes(body.category) ? body.category : "other";
    sets.push("category = ?");
    binds.push(cat);
  }

  if (body.message !== undefined) {
    const msg = String(body.message).trim();
    if (!msg) return Response.json({ error: "Message cannot be empty" }, { status: 400 });
    sets.push("message = ?");
    binds.push(msg);
  }

  if (sets.length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  binds.push(id);
  const result = await env.DB.prepare(
    `UPDATE tributes SET ${sets.join(", ")} WHERE id = ?`
  )
    .bind(...binds)
    .run();

  if (!result.success || result.meta.changes === 0) {
    return Response.json({ error: "Tribute not found" }, { status: 404 });
  }

  return Response.json({ ok: true, id });
}

async function deleteTribute(env, id) {
  const result = await env.DB.prepare(`DELETE FROM tributes WHERE id = ?`).bind(id).run();
  if (!result.success || result.meta.changes === 0) {
    return Response.json({ error: "Tribute not found" }, { status: 404 });
  }
  return Response.json({ ok: true, id, deleted: true });
}
