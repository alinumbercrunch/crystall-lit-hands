import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { authPage, handle, isAllowed, resetKeyCache, verifyAccessJwt } from "./index.js";

const TEAM = "haku.cloudflareaccess.com";
const AUD = "aud-tag";
const REPO = "alinumbercrunch/crystall-lit-hands";
const SITE = "https://ayakahaku.com";
const ENV = { SITE_ORIGIN: SITE, REPO, TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, GITHUB_TOKEN: "ghp_secret" };

const { publicKey, privateKey } = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const jwk = { ...(await crypto.subtle.exportKey("jwk", publicKey)), kid: "k1" };
const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
async function sign(claims, header = { alg: "RS256", kid: "k1" }, key = privateKey) {
  const body = `${enc(header)}.${enc(claims)}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(body));
  return `${body}.${Buffer.from(sig).toString("base64url")}`;
}
const now = () => Math.floor(Date.now() / 1000);
const goodClaims = () => ({ iss: `https://${TEAM}`, aud: [AUD], email: "a@example.com", exp: now() + 600 });

// Stub for both the Access certs URL and GitHub; records GitHub calls.
function stubFetch() {
  const calls = [];
  const fn = async (url, init = {}) => {
    if (url === `https://${TEAM}/cdn-cgi/access/certs`) return Response.json({ keys: [jwk] });
    calls.push({ url, init });
    return new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json", "x-ratelimit-remaining": "4999", "set-cookie": "x=1", "x-github-request-id": "id" } });
  };
  return { fn, calls };
}
const opts = (fetchFn) => ({ teamDomain: TEAM, aud: AUD, fetchFn });

async function req(path, { method = "GET", jwt, origin, auth } = {}) {
  const headers = new Headers();
  if (jwt !== undefined) headers.set("cf-access-jwt-assertion", jwt);
  if (origin) headers.set("origin", origin);
  if (auth) headers.set("authorization", auth);
  return new Request(`${SITE}${path}`, { method, headers, body: method === "GET" ? undefined : "{}" });
}

beforeEach(resetKeyCache);

test("JWT: accepts a valid token", async () => {
  assert.equal((await verifyAccessJwt(await sign(goodClaims()), opts(stubFetch().fn))).email, "a@example.com");
});

test("JWT: rejects wrong audience, issuer, expiry, signature, alg, kid and junk", async () => {
  const { fn } = stubFetch();
  const other = (await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign"])).privateKey;
  const bad = [
    await sign({ ...goodClaims(), aud: ["other"] }),
    await sign({ ...goodClaims(), iss: "https://evil.cloudflareaccess.com" }),
    await sign({ ...goodClaims(), exp: now() - 1 }),
    await sign({ ...goodClaims(), nbf: now() + 600 }),
    await sign(goodClaims(), undefined, other),
    await sign(goodClaims(), { alg: "none", kid: "k1" }),
    await sign(goodClaims(), { alg: "RS256", kid: "unknown" }),
    "not.a.jwt",
    "",
    null,
  ];
  for (const t of bad) assert.equal(await verifyAccessJwt(t, opts(fn)), null, String(t).slice(0, 40));
});

test("JWT: fails closed when certs cannot be fetched", async () => {
  const down = async () => new Response("", { status: 500 });
  assert.equal(await verifyAccessJwt(await sign(goodClaims()), opts(down)), null);
});

test("allowlist: only /user, /graphql and this repo", () => {
  assert.ok(isAllowed("GET", "/user", REPO));
  assert.ok(isAllowed("POST", "/graphql", REPO));
  assert.ok(isAllowed("GET", `/repos/${REPO}`, REPO));
  assert.ok(isAllowed("PUT", `/repos/${REPO}/contents/content/salon.yml`, REPO));
  assert.ok(!isAllowed("DELETE", "/user", REPO));
  assert.ok(!isAllowed("GET", "/graphql", REPO));
  assert.ok(!isAllowed("GET", `/repos/${REPO}-evil/contents`, REPO));
  assert.ok(!isAllowed("GET", "/repos/alinumbercrunch/other", REPO));
  assert.ok(!isAllowed("GET", "/user/repos", REPO));
  assert.ok(!isAllowed("GET", "/orgs/x", REPO));
  for (const p of [`/repos/${REPO}/../other`, `/repos/${REPO}/%2e%2e/other`, `/repos/${REPO}/.%2E/x`, `/repos/${REPO}/./x`, `/repos/${REPO}/..`, `/repos/${REPO}%2F..`, `/repos/${REPO}/a%5cb`, `/repos/${REPO}//x`, `/repos/${REPO}\\x`])
    assert.ok(!isAllowed("GET", p, REPO), p);
  assert.ok(!isAllowed("OPTIONS", `/repos/${REPO}`, REPO));
  // Dots inside a file name are fine.
  assert.ok(isAllowed("GET", `/repos/${REPO}/contents/posts/notes..md`, REPO));
  assert.ok(isAllowed("GET", `/repos/${REPO}/contents/.github/workflows/pages.yml`, REPO));
});

test("JWT: unknown key IDs refetch certs at most once a minute", async () => {
  let fetches = 0;
  const fn = async () => (fetches++, Response.json({ keys: [jwk] }));
  for (let i = 0; i < 5; i++) await verifyAccessJwt(await sign(goodClaims(), { alg: "RS256", kid: `random-${i}` }), opts(fn));
  assert.equal(fetches, 1);
  assert.ok(await verifyAccessJwt(await sign(goodClaims()), opts(fn)));
  assert.equal(fetches, 1);
});

test("handler: fails closed when not configured or malformed", async () => {
  const jwt = await sign(goodClaims());
  const bad = [...Object.keys(ENV).map((k) => ({ [k]: "" })), { TEAM_DOMAIN: "haku" }, { TEAM_DOMAIN: "haku.cloudflareaccess.com.evil.example" }];
  for (const patch of bad) {
    const res = await handle(await req("/cms/api/user", { jwt }), { ...ENV, ...patch }, stubFetch().fn);
    assert.equal(res.status, 503, JSON.stringify(patch));
  }
});

test("handler: no or bad Access token → 403, GitHub never called", async () => {
  const { fn, calls } = stubFetch();
  assert.equal((await handle(await req("/cms/api/user"), ENV, fn)).status, 403);
  assert.equal((await handle(await req("/cms/api/user", { jwt: "x.y.z" }), ENV, fn)).status, 403);
  assert.equal(calls.length, 0);
});

test("handler: forwards with the secret token only, filters headers", async () => {
  const { fn, calls } = stubFetch();
  const res = await handle(await req(`/cms/api/repos/${REPO}/contents/x?ref=main`, { jwt: await sign(goodClaims()), auth: "token cloudflare-access" }), ENV, fn);
  assert.equal(res.status, 200);
  assert.equal(calls[0].url, `https://api.github.com/repos/${REPO}/contents/x?ref=main`);
  assert.equal(calls[0].init.headers.get("authorization"), "Bearer ghp_secret");
  assert.equal(res.headers.get("x-ratelimit-remaining"), "4999");
  assert.equal(res.headers.get("set-cookie"), null);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.ok(!(await res.text()).includes("ghp_secret"));
});

test("handler: writes need the site Origin (CSRF)", async () => {
  const { fn, calls } = stubFetch();
  const jwt = await sign(goodClaims());
  assert.equal((await handle(await req("/cms/api/graphql", { method: "POST", jwt }), ENV, fn)).status, 403);
  assert.equal((await handle(await req("/cms/api/graphql", { method: "POST", jwt, origin: "https://evil.example" }), ENV, fn)).status, 403);
  assert.equal(calls.length, 0);
  assert.equal((await handle(await req("/cms/api/graphql", { method: "POST", jwt, origin: SITE }), ENV, fn)).status, 200);
});

test("handler: disallowed paths → 404", async () => {
  const { fn, calls } = stubFetch();
  const jwt = await sign(goodClaims());
  for (const p of ["/cms/api/repos/someone/else", "/cms/api/user/emails", "/cms/other", "/cms/apix/user"])
    assert.equal((await handle(await req(p, { jwt }), ENV, fn)).status, 404, p);
  assert.equal(calls.length, 0);
});

test("auth popup: only for the github provider, posts only to the site", async () => {
  const jwt = await sign(goodClaims());
  const { fn } = stubFetch();
  assert.equal((await handle(await req("/cms/auth?provider=gitlab", { jwt }), ENV, fn)).status, 400);
  const res = await handle(await req("/cms/auth?provider=github&site_id=ayakahaku.com", { jwt }), ENV, fn);
  assert.equal(res.status, 200);
  const csp = res.headers.get("content-security-policy");
  const html = await res.text();
  const nonce = csp.match(/'nonce-([^']+)'/)[1];
  assert.match(html, new RegExp(`<script nonce="${nonce}">`));
  assert.match(html, /const site = "https:\/\/ayakahaku\.com"/);
  assert.match(html, /postMessage\("authorizing:github", site\)/);
  assert.ok(!html.includes('"*"'));
  assert.match(authPage(SITE, "n").headers.get("content-security-policy"), /default-src 'none'/);
});

// Runs the popup's script against a fake window, the way the CMS talks to it.
async function runPopup(siteOrigin = SITE) {
  const html = await authPage(siteOrigin, "n").text();
  const script = html.match(/<script nonce="n">([\s\S]*)<\/script>/)[1];
  const sent = [];
  let onMessage;
  const opener = { postMessage: (data, target) => sent.push({ data, target }) };
  const window = { opener, addEventListener: (type, fn) => { if (type === "message") onMessage = fn; } };
  new Function("window", script)(window);
  return { sent, opener, deliver: (e) => onMessage(e) };
}

test("auth popup: completes the CMS handshake only with the site window", async () => {
  const ok = await runPopup();
  assert.deepEqual(ok.sent, [{ data: "authorizing:github", target: SITE }]);
  ok.deliver({ data: "authorizing:github", origin: "https://evil.example", source: ok.opener });
  ok.deliver({ data: "authorizing:github", origin: SITE, source: {} });
  ok.deliver({ data: "something else", origin: SITE, source: ok.opener });
  assert.equal(ok.sent.length, 1);
  ok.deliver({ data: "authorizing:github", origin: SITE, source: ok.opener });
  assert.equal(ok.sent[1].target, SITE);
  const [, state, payload] = ok.sent[1].data.match(/^authorization:github:(success):(.+)$/);
  assert.equal(state, "success");
  assert.deepEqual(JSON.parse(payload), { provider: "github", token: "cloudflare-access" });
});

test("auth popup: config values cannot break out of the script", async () => {
  const html = await authPage('x"</script><script>alert(1)//', "n").text();
  assert.equal(html.match(/<\/script>/g).length, 1);
});

test("config: Worker REPO and SITE_ORIGIN match the CMS config", () => {
  const cms = parseYaml(fs.readFileSync(new URL("../public/admin/config.yml", import.meta.url), "utf8"));
  const toml = fs.readFileSync(new URL("./wrangler.toml", import.meta.url), "utf8");
  const v = (k) => toml.match(new RegExp(`^${k} = "(.*)"$`, "m"))?.[1];
  assert.equal(v("REPO"), cms.backend.repo);
  assert.equal(new URL(cms.backend.api_root).origin, v("SITE_ORIGIN"));
  assert.equal(cms.backend.base_url, v("SITE_ORIGIN"));
});
