const PUBLIC_KEYS = [
  "hero_eyebrow",
  "hero_name",
  "hero_meta",
  "hero_image_url",
  "intro_heading",
  "intro_body",
  "family_notice_heading",
  "family_notice_body",
  "notice_image_url",
  "biography_image_url",
  "tributes_image_url",
  "gallery_image_url",
  "guestbook_image_url",
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

  settings.hero_media = [];
  try {
    const { results: media } = await env.DB.prepare(
      `SELECT type, image_url, fit, focus FROM hero_media ORDER BY position ASC, id ASC`
    ).all();
    settings.hero_media = (media || []).map((m) => ({
      type: m.type,
      url: m.image_url,
      fit: m.fit || "cover",
      focus: m.focus || "center",
    }));
  } catch (_) {
    // hero_media table not created yet — fall back to single hero image
  }

  return Response.json(settings, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
