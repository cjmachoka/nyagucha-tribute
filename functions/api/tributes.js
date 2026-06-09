const CATEGORIES = ["family", "friends", "colleagues", "patients", "community", "other"];

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "GET") {
    return getApprovedTributes(env);
  }

  if (request.method === "POST") {
    return createPendingTribute(request, env);
  }

  return new Response("Method not allowed", { status: 405 });
}

async function getApprovedTributes(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, message, category, image_url, created_at
     FROM tributes
     WHERE status = 'approved'
     ORDER BY created_at DESC`
  ).all();

  const grouped = Object.fromEntries(CATEGORIES.map((id) => [id, []]));

  for (const row of results) {
    const key = CATEGORIES.includes(row.category) ? row.category : "other";
    grouped[key].push(row);
  }

  return Response.json({ grouped, total: results.length });
}

async function createPendingTribute(request, env) {
  const contentType = request.headers.get("content-type") || "";

  let name, message, category, email;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    name = body.name?.trim();
    message = body.message?.trim();
    category = body.category || "other";
    email = body.email?.trim() || null;
  } else {
    const form = await request.formData();
    name = String(form.get("name") || "").trim();
    message = String(form.get("message") || "").trim();
    category = String(form.get("category") || "other");
    email = String(form.get("email") || "").trim() || null;
  }

  if (!name || !message) {
    return Response.json({ error: "Name and message are required." }, { status: 400 });
  }

  if (!CATEGORIES.includes(category)) {
    category = "other";
  }

  await env.DB.prepare(
    `INSERT INTO tributes (name, message, email, category, status)
     VALUES (?, ?, ?, ?, 'pending')`
  )
    .bind(name, message, email, category)
    .run();

  // TODO: upload image to R2, send Resend notification to family

  return Response.json({ ok: true, message: "Tribute received and pending approval." });
}
