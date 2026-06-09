// Temporary diagnostic: shows what Cloudflare Access actually sends to the
// Functions origin. Lives under /api/admin so Access protects it. Safe to delete
// once admin auth is confirmed working on the custom domain.
import { getAdminEmail } from "../../_lib/auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  const h = request.headers;
  const cookie = h.get("cookie") || "";

  let resolvedEmail = null;
  try { resolvedEmail = await getAdminEmail(request, env); } catch (e) { resolvedEmail = `error: ${e.message}`; }

  const cfAccessHeaders = {};
  for (const [k, v] of h.entries()) {
    if (k.toLowerCase().startsWith("cf-access")) {
      cfAccessHeaders[k] = k.toLowerCase().includes("jwt") ? `${v.slice(0, 12)}…(${v.length} chars)` : v;
    }
  }

  return Response.json({
    hostname: new URL(request.url).hostname,
    resolved_email: resolvedEmail,
    email_header: h.get("cf-access-authenticated-user-email") || null,
    jwt_assertion_header_present: !!h.get("cf-access-jwt-assertion"),
    cf_authorization_cookie_present: /(^|;\s*)CF_Authorization=/.test(cookie),
    cf_access_headers_seen: cfAccessHeaders,
  });
}
