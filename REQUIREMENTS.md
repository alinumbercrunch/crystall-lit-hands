# Requirements

## Engineering rules (all changes)

1. **Security first** — secrets never reach the repo or the browser; deny by default; validate every input at the boundary; least-privilege tokens.
2. **Minimal, correct syntax** — no unused code, flags or dependencies; pin versions; match the style of the surrounding code.
3. **Safeguards and edge cases** — invalid content fails the build with a clear message, so the live site keeps its last good version; handle empty, missing and malformed values explicitly.
4. **DRY, no duplicates** — one source of truth per fact (content in `content/`, strings in `i18n.js`, helpers exported and reused); no copied logic or config.
5. **Testing** — every module with logic has a `node:test` file next to it (`*.test.js`), run by `npm test` in CI before each deploy; tests cover the happy path, each rejection, and edge cases.
6. **File order and usage** — sources at the root, build scripts in `scripts/`, editable content in `content/`, static files in `public/`, Cloudflare code in `worker/`; generated output (`dist/`, `blog/`) is never edited or committed; local secrets only in gitignored `.env`.

## Editor sign-in without GitHub (`/admin/`)

**Goal:** the client signs in to `ayakahaku.com/admin/` with their Google account and edits the blog and salon info; they never see GitHub or a token.

**Design**

- **Cloudflare Access** guards `/admin/*` and `/cms/*` on `ayakahaku.com`. Only listed emails get in; nothing else is reachable without it.
- **Worker** on `ayakahaku.com/cms/*` (same origin, so no CORS):
  - `/cms/auth` — answers the CMS sign-in popup with a placeholder token (the Netlify-style `postMessage` handshake), sent only to `https://ayakahaku.com`.
  - `/cms/api/*` — forwards to `api.github.com` with the real token, which is held as a Worker secret.
- **CMS config** — `api_root` points at `/cms/api`, `base_url` at the Worker, and `auth_methods: [oauth]`.

**Security requirements**

| # | Requirement |
| --- | --- |
| S1 | The Worker verifies the `Cf-Access-Jwt-Assertion` signature, audience, issuer and expiry on every request; it rejects anything else with 403 (defence in depth if Access is misconfigured). |
| S2 | Paths are allowlisted: `GET /user`, `POST /graphql`, and `/repos/alinumbercrunch/crystall-lit-hands/**` only; everything else is rejected with 404. |
| S3 | The client's `Authorization` header is dropped; only the Worker's secret token is sent to GitHub. |
| S4 | Writes (`POST`/`PUT`/`PATCH`/`DELETE`) require `Origin: https://ayakahaku.com` (CSRF). |
| S5 | The GitHub token is fine-grained: this repo only, *Contents: Read and write*, with an expiry. It is stored only in `.env` (local) and as the Worker secret. |
| S6 | Responses never echo the token; errors carry no secrets. |

**Edge cases**

- Access session expired → 403, and the CMS shows sign-in again.
- GitHub token expired or revoked → GitHub's 401 is passed through, and the editor reports it; renew with `wrangler secret put`.
- GitHub rate limit (5,000 requests/hour per token) → passed through unchanged.
- The popup is opened from another origin → no token is posted.
- Local editing (`Work with Local Repository`) keeps working without the Worker.

**Tests (`worker/*.test.js`)** — JWT: valid, wrong audience, expired, bad signature, missing. Paths: each allowed path, traversal (`..`, encoded), other repos, other users. Methods and `Origin`. Handshake: target origin, message format.

**Done when** — a listed Google account can open `/admin/`, edit salon info and save, and the change deploys; an unlisted account, a direct request to `/cms/api` without Access, and a request for another repo are all refused.
