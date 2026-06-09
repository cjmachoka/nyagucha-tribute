const PUBLIC_KEYS = [
  "hero_eyebrow",
  "hero_name",
  "hero_meta",
  "hero_image_url",
  "intro_heading",
  "intro_body",
  "family_notice_heading",
  "family_notice_body",
];

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }
  const placeholders = PUBLIC_KEYS.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT key, value FROM site_settings WHERE key IN (${placeholders})`
  ).bind(...PUBLIC_KEYS).all();

  const settings = Object.fromEntries(PUBLIC_KEYS.map((k) => [k, ""]));
  for (const row of results) settings[row.key] = row.value ?? "";

  return Response.json(settings, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
