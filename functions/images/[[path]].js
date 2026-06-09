export async function onRequest(context) {
  const { env, params, request } = context;
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!key) return new Response("Not found", { status: 404 });

  // Range requests (needed for video playback/seeking) — served directly from R2.
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (match) {
      const offset = Number(match[1]);
      const end = match[2] ? Number(match[2]) : undefined;
      const length = end !== undefined ? end - offset + 1 : undefined;
      const object = await env.IMAGES.get(key, {
        range: length !== undefined ? { offset, length } : { offset },
      });
      if (!object) return new Response("Not found", { status: 404 });

      const size = object.size;
      const realEnd = end !== undefined ? Math.min(end, size - 1) : size - 1;
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("accept-ranges", "bytes");
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("content-range", `bytes ${offset}-${realEnd}/${size}`);
      headers.set("content-length", String(realEnd - offset + 1));
      return new Response(object.body, { status: 206, headers });
    }
  }

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const object = await env.IMAGES.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  const response = new Response(object.body, { headers });
  context.waitUntil(cache.put(request, response.clone()));
  return response;
}
