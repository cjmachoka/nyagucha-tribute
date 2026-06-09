// Admin authentication via Cloudflare Access.
//
// On *.pages.dev, Access injects the `Cf-Access-Authenticated-User-Email`
// header and we can trust it directly. On a custom domain that header is not
// added, but Access still sends a signed JWT (`Cf-Access-Jwt-Assertion` header
// and the `CF_Authorization` cookie). We verify that JWT against the team's
// public keys and read the email from it — Cloudflare's recommended method.

const DEFAULT_TEAM_DOMAIN = "muddy-grass-a68f.cloudflareaccess.com";
const DEFAULT_AUD = "768f4cae0421d8637001af88c0852fbc449e2f3349fdd78c3fec1989f838afdd";

let cachedKeys = null;
let cachedAt = 0;
const KEY_TTL_MS = 60 * 60 * 1000;

function teamDomain(env) {
  return (env && env.ACCESS_TEAM_DOMAIN) || DEFAULT_TEAM_DOMAIN;
}

function expectedAud(env) {
  return (env && env.ACCESS_AUD) || DEFAULT_AUD;
}

function b64urlToBytes(str) {
  let s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToJson(str) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(str)));
}

async function getSigningKeys(env) {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < KEY_TTL_MS) return cachedKeys;
  const res = await fetch(`https://${teamDomain(env)}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error("Could not fetch Access certs");
  const data = await res.json();
  cachedKeys = Array.isArray(data.keys) ? data.keys : [];
  cachedAt = now;
  return cachedKeys;
}

function readCfAuthCookie(request) {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? m[1] : null;
}

async function verifyAccessJwt(token, env) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  let header, payload;
  try {
    header = b64urlToJson(headerB64);
    payload = b64urlToJson(payloadB64);
  } catch {
    return null;
  }

  if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null;

  const aud = expectedAud(env);
  if (aud) {
    const audClaim = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audClaim.includes(aud)) return null;
  }

  let keys;
  try {
    keys = await getSigningKeys(env);
  } catch {
    return null;
  }
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  let ok = false;
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64urlToBytes(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
  } catch {
    return null;
  }
  return ok ? payload : null;
}

export async function getAdminEmail(request, env) {
  const direct = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (direct) return direct;

  const jwt = request.headers.get("Cf-Access-Jwt-Assertion") || readCfAuthCookie(request);
  if (!jwt) return null;

  const payload = await verifyAccessJwt(jwt, env);
  return payload?.email || null;
}

export async function requireAdmin(request, env) {
  const email = await getAdminEmail(request, env);
  if (!email) {
    return new Response(
      JSON.stringify({ error: "Not authenticated. Sign in via Cloudflare Access." }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }
  return null;
}
