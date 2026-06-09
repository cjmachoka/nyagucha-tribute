import { uploadImage } from "../_lib/upload.js";

const CATEGORIES = ["family", "friends", "colleagues", "patients", "community", "other"];
const MAX_PHOTOS = 2;

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
    `SELECT id, name, message, category, image_url, image_url2, created_at
     FROM tributes
     WHERE status = 'approved'
     ORDER BY created_at DESC`
  ).all();

  const grouped = Object.fromEntries(CATEGORIES.map((id) => [id, []]));

  for (const row of results) {
    const key = CATEGORIES.includes(row.category) ? row.category : "other";
    row.photos = [row.image_url, row.image_url2].filter(Boolean);
    grouped[key].push(row);
  }

  return Response.json({ grouped, total: results.length });
}

async function createPendingTribute(request, env) {
  const contentType = request.headers.get("content-type") || "";

  let name, message, category, email;
  const files = [];

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
    for (const entry of form.getAll("photos")) {
      if (entry && typeof entry !== "string" && entry.size > 0) files.push(entry);
    }
  }

  if (!name || !message) {
    return Response.json({ error: "Name and message are required." }, { status: 400 });
  }

  if (!CATEGORIES.includes(category)) {
    category = "other";
  }

  if (files.length > MAX_PHOTOS) {
    return Response.json({ error: `You can attach up to ${MAX_PHOTOS} photos.` }, { status: 400 });
  }

  const uploaded = [];
  for (const file of files.slice(0, MAX_PHOTOS)) {
    try {
      uploaded.push(await uploadImage(env, file, "tributes"));
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  }

  await env.DB.prepare(
    `INSERT INTO tributes (name, message, email, category, image_key, image_url, image_key2, image_url2, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  )
    .bind(
      name,
      message,
      email,
      category,
      uploaded[0]?.key || null,
      uploaded[0]?.url || null,
      uploaded[1]?.key || null,
      uploaded[1]?.url || null
    )
    .run();

  // TODO: send Resend notification to family

  return Response.json({ ok: true, message: "Tribute received and pending approval." });
}
