export function requireAdmin(request) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) {
    return new Response(
      JSON.stringify({ error: "Not authenticated. Sign in via Cloudflare Access." }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }
  return null;
}

export function getAdminEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email");
}
