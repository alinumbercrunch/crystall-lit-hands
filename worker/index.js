// CMS gateway on ayakahaku.com/cms/* (see REQUIREMENTS.md). Cloudflare Access signs
// editors in; this Worker re-checks that, answers the CMS sign-in popup, and forwards
// allowlisted GitHub API calls with a token the browser never sees.
//   /cms/auth         → sign-in popup (Netlify-style postMessage handshake)
//   /cms/api/v3/...   → https://api.github.com/...   (CMS api_root, GitHub Enterprise layout)
//   /cms/api/graphql  → https://api.github.com/graphql
// env: SITE_ORIGIN, REPO, TEAM_DOMAIN, ACCESS_AUD (wrangler.toml); GITHUB_TOKEN (secret).

const GITHUB = "https://api.github.com";
const REST_ROOT = "/cms/api/v3";
const GRAPHQL_PATH = "/cms/api/graphql";
const PROVIDER = "github";
// Not a secret: the CMS needs some token to send; the Worker drops it (S3).
const PLACEHOLDER_TOKEN = "cloudflare-access";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REQUEST_HEADERS = ["accept", "content-type", "if-none-match", "if-modified-since", "x-github-api-version"];
const RESPONSE_HEADERS = ["content-type", "etag", "last-modified", "link", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"];
const KEYS_TTL_MS = 60 * 60 * 1000;
// Unknown key IDs may refetch certs at most this often (S1 must not be a fetch amplifier).
const KEYS_REFETCH_MS = 60 * 1000;
const TEAM_DOMAIN = /^[a-z0-9-]+\.cloudflareaccess\.com$/;

const json = (status, error) =>
  new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// --- Access JWT (S1) ------------------------------------------------------

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const decodePart = (s) => JSON.parse(new TextDecoder().decode(b64url(s)));

let keyCache = { at: 0, keys: [] };
async function accessKeys(teamDomain, fetchFn, refetch = false) {
  const age = Date.now() - keyCache.at;
  if (age > KEYS_TTL_MS || (refetch && age > KEYS_REFETCH_MS)) {
    const res = await fetchFn(`https://${teamDomain}/cdn-cgi/access/certs`);
    if (!res.ok) throw new Error(`certs ${res.status}`);
    keyCache = { at: Date.now(), keys: (await res.json()).keys ?? [] };
  }
  return keyCache.keys;
}
export const resetKeyCache = () => { keyCache = { at: 0, keys: [] }; };

// Returns the token's claims, or null if anything about it is wrong.
export async function verifyAccessJwt(token, { teamDomain, aud, fetchFn = fetch, now = Date.now() }) {
  if (!token || !teamDomain || !aud) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = decodePart(parts[0]);
    const claims = decodePart(parts[1]);
    if (header.alg !== "RS256" || !header.kid) return null;
    let jwk = (await accessKeys(teamDomain, fetchFn)).find((k) => k.kid === header.kid);
    // Access rotates keys; an unknown kid may refetch (throttled).
    jwk ??= (await accessKeys(teamDomain, fetchFn, true)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]), signed))) return null;
    const secs = now / 1000;
    const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== `https://${teamDomain}` || !auds.includes(aud)) return null;
    if (!(claims.exp > secs) || (claims.nbf && claims.nbf > secs)) return null;
    return claims;
  } catch {
    return null;
  }
}

// --- GitHub API allowlist (S2) --------------------------------------------

// `path` is the GitHub API path (after REST_ROOT, or /graphql), still percent-encoded. The URL parser already
// resolves ../ and %2e%2e/; this also rejects them (and encoded or doubled separators)
// in case it is called on a raw path. File names such as notes..md stay allowed.
export function isAllowed(method, path, repo) {
  if (/%2f|%5c|\\|\/\/|\/(\.|%2e){1,2}(\/|$)/i.test(path)) return false;
  if (path === "/user") return method === "GET";
  if (path === "/graphql") return method === "POST";
  const base = `/repos/${repo}`;
  return (path === base || path.startsWith(`${base}/`)) && (method === "GET" || WRITE_METHODS.has(method));
}

async function proxy(request, env, path, fetchFn) {
  const { method } = request;
  if (!isAllowed(method, path, env.REPO)) return json(404, "not found");
  // CSRF (S4): writes only from the site itself.
  if (WRITE_METHODS.has(method) && request.headers.get("origin") !== env.SITE_ORIGIN) return json(403, "forbidden");

  const headers = new Headers({ authorization: `Bearer ${env.GITHUB_TOKEN}`, "user-agent": "haku-cms-worker" });
  for (const h of REQUEST_HEADERS) if (request.headers.has(h)) headers.set(h, request.headers.get(h));
  const res = await fetchFn(`${GITHUB}${path}${new URL(request.url).search}`, {
    method,
    headers,
    body: method === "GET" ? undefined : request.body,
  });

  const out = new Headers({ "cache-control": "no-store" });
  for (const h of RESPONSE_HEADERS) if (res.headers.has(h)) out.set(h, res.headers.get(h));
  return new Response(res.body, { status: res.status, headers: out });
}

// --- Sign-in popup --------------------------------------------------------

// JSON safe inside <script>: no "</script>" or "<!--" can close it.
const js = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

// Replies to the CMS window only if it is the site itself.
export function authPage(siteOrigin, nonce) {
  const message = `authorization:${PROVIDER}:success:${JSON.stringify({ provider: PROVIDER, token: PLACEHOLDER_TOKEN })}`;
  const html = `<!doctype html><meta charset="utf-8"><title>Signing in…</title>
<script nonce="${nonce}">
  const site = ${js(siteOrigin)};
  window.addEventListener("message", ({ data, origin, source }) => {
    if (source === window.opener && origin === site && data === ${js(`authorizing:${PROVIDER}`)}) window.opener.postMessage(${js(message)}, site);
  });
  window.opener?.postMessage(${js(`authorizing:${PROVIDER}`)}, site);
</script>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'`,
    },
  });
}

// --- Entry ----------------------------------------------------------------

export async function handle(request, env, fetchFn = fetch) {
  // Fail closed until every setting is present and well-formed.
  if (!env.SITE_ORIGIN || !env.REPO || !TEAM_DOMAIN.test(env.TEAM_DOMAIN ?? "") || !env.ACCESS_AUD || !env.GITHUB_TOKEN)
    return json(503, "not configured");

  const claims = await verifyAccessJwt(request.headers.get("cf-access-jwt-assertion"), {
    teamDomain: env.TEAM_DOMAIN,
    aud: env.ACCESS_AUD,
    fetchFn,
  });
  if (!claims) return json(403, "forbidden");

  const { pathname, searchParams } = new URL(request.url);
  if (pathname === "/cms/auth") {
    if (request.method !== "GET" || searchParams.get("provider") !== PROVIDER) return json(400, "bad request");
    return authPage(env.SITE_ORIGIN, crypto.randomUUID());
  }
  if (pathname === GRAPHQL_PATH) return proxy(request, env, "/graphql", fetchFn);
  if (pathname.startsWith(`${REST_ROOT}/`)) return proxy(request, env, pathname.slice(REST_ROOT.length), fetchFn);
  return json(404, "not found");
}

export default { fetch: (request, env) => handle(request, env) };
