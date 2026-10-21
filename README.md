# CRYSTALL — Lit Hands

**Live:** https://ayakahaku.com/ (needs a WebGPU browser)

Experimental landing pages built around one WebGL/WebGPU scene: ~1,500 lit GPU tubes drawn over two hands or a diamond, around a glowing orb, behind a plain HTML page. English / Japanese.

| Page | |
| --- | --- |
| [`/`](https://ayakahaku.com/) | **HAKU** — energy healing salon in Kamakura (white-light theme, particle merkaba) |
| [`/light.html`](https://ayakahaku.com/light.html) | **LUMEN** — meditation page (white-light theme) |
| [`/blog/`](https://ayakahaku.com/blog/) | **HAKU Journal** — bilingual blog, generated from Markdown |
| [`/crystall.html`](https://ayakahaku.com/crystall.html) | **CRYSTALL** — the original dark version |

Built with Three.js `WebGPURenderer` and TSL. The tube technique is a from-scratch reimplementation of the approach described in Mathis Biabiany's Codrops article [Drawing With Light: An Exploration of Lit GPU Tubes with TSL and WebGPU](https://tympanus.net/codrops/2026/09/07/drawing-with-light-an-exploration-of-lit-gpu-tubes-with-tsl-and-webgpu/) ([original demo](https://luminhands.netlify.app/)).

## Run

Requires Node 20.11+ and a browser with WebGPU (recent Chrome, Edge or Safari).

```bash
npm install
npm run dev
```

`npm run build` writes a static site to `dist/`.

## Writing a blog post

### In the browser (for the salon owner)

Open **[/admin/](https://ayakahaku.com/admin/)**, sign in, and use **New Post / 新規作成**. Each post has a Japanese and an English tab; fill in title, date, description and body, then **Save**. Saving commits the post to `main` and the site updates about a minute later.

**Signing in:** editors sign in with their email through Cloudflare Access (a code is sent to their inbox), then click **Sign In with GitHub** — no GitHub account or token needed. The `worker/` gateway holds the GitHub token and only forwards calls for this repo; see [REQUIREMENTS.md](REQUIREMENTS.md).

**One-time setup (developer):**

1. Cloudflare Zero Trust → **Access → Applications → Add → Self-hosted** with destinations `ayakahaku.com/admin` and `ayakahaku.com/cms`, a policy allowing the editors' emails, and the **One-time PIN** login. Put the team domain and the application's **AUD** tag in `worker/wrangler.toml`.
2. Create a **fine-grained** GitHub token as the repo owner: *Only select repositories* → `crystall-lit-hands`, *Contents: Read and write*, nothing else, with an expiry (e.g. 90 days). Don't use a classic token — its `repo` scope reaches every repository the account can.
3. `npx wrangler secret put GITHUB_TOKEN -c worker/wrangler.toml` (paste the token), then `npx wrangler deploy -c worker/wrangler.toml`. Repeat the secret step when the token expires.

Add or remove editors in the Access policy.

> **記事の書き方（オーナー向け）** — [/admin/](https://ayakahaku.com/admin/) を開き、メールアドレスに届くコードでログインし、「Sign In with GitHub」を押してから「新規作成」。日本語・英語のタブにタイトル、公開日、概要、本文を入力して「保存」すると、約1分後にサイトへ反映されます。英語を書かない場合は、英語タブをオフにすれば日本語版が表示されます。

Developers can try the editor without signing in: open `/admin/` in Chrome or Edge and choose **Work with Local Repository**, then pick this folder.

### As files

Each post is a folder in `posts/` with `index.ja.md` and/or `index.en.md` — the same layout the editor writes:

```markdown
---
title: Resting with the autumn equinox
date: 2026-09-22
description: One or two sentences for the post list and search results.
---

Your post here. ~700 words reads in about 4 minutes.
```

The folder name is the URL (`posts/autumn-equinox/` → `/blog/autumn-equinox.html`): lowercase letters, numbers and dashes. Posts made in the editor get `date-shortid` names, since titles may be Japanese. `npm run dev` shows changes at `/blog/` as you save.

Posts are listed newest first. If one language is missing, readers of that language see the other version with a short note. A post with a missing title/date/description or invalid date fails the build (and the deploy), so it never half-publishes. `blog/` is generated — don't edit it by hand.

## Page text

Headings, intro texts, the first-visit steps, the FAQ, the quote, the footer, the page title/description and the blog list headings live in `content/home.yml`. Edit them at **/admin/ → ホームページの文章 / Page text**. In headings, the quote and the footer, `*words*` become italics, a new line is a line break, and `[text](link)` is a link (`https://`, `mailto:`, `#` or a relative path only). Empty required text, an empty step/FAQ list or an unsafe link fails the build. Interface labels (navigation, buttons in the booking panel) stay in `i18n.js`.

> **ホームページの文章の編集（オーナー向け）** — /admin/ の「ホームページの文章」から、見出し・紹介文・はじめての方へ・よくある質問・フッターなどを編集できます。見出しでは `*ことば*` が斜体、改行がそのまま改行、`[文字](リンク)` がリンクになります。

## Menu, booking and access

Session names, prices, booking links, access details and the booking notes live in `content/salon.yml`. Edit them at **[/admin/](https://ayakahaku.com/admin/) → サロン情報 / Salon info** (same sign-in as the blog), or edit the file directly. The build fills the menu, booking and access sections of `index.html` from it; a session without a name, a non-whole-number price/duration or a non-`https://` link fails the build (and the deploy). An empty English field shows the Japanese text.

> **メニュー・予約の編集（オーナー向け）** — [/admin/](https://ayakahaku.com/admin/) の「サロン情報」から、セッション名・時間・料金・予約リンク・アクセス情報を編集して「保存」すると、約1分後にサイトへ反映されます。予約リンクが空のセッションは「オンライン予約は準備中です」と表示されます。

**Booking links (Google Calendar appointment schedules).** Create one schedule per session in the salon's Google account: Google Calendar on the web → **Create → Appointment schedule**. Suggested settings, from the site's copy (one room, tea before and a quiet return after):

| Setting | Value |
| --- | --- |
| Appointment duration | session + 30 min (Reiki 90, Crystal light 120, Sound & breath 75) |
| General availability | Mon, Wed–Sun 10:00–18:00 (closed Tuesdays) |
| Booking window | up to 60 days ahead, at least 24 hours' notice |
| Buffer time | 15 min after |
| Max bookings per day | 4 |
| Calendars checked for availability | the salon calendar, in every schedule — one booking then blocks the other sessions |
| Booking form | name, email, phone; "First visit?" (¥2,000 off); "Anything we should know?" |
| Description | the cancellation policy |

Then **Share** the schedule and paste a link into the session's **予約リンク / Booking link**:

- **Website embed → Inline** link (`https://calendar.google.com/calendar/appointments/schedules/…`) — opens in a panel on the page (desktop) or a new tab (phones).
- **Booking page** link (`https://calendar.app.google/…`) — always opens in a new tab.

Free Google accounts take bookings and send confirmation emails; taking payment when booking needs Google Workspace, so the site says "payment at the salon".

## Maintenance

**Security checklist**

- Two-factor login on the Cloudflare account and on both GitHub accounts (`alinumbercrunch`, `alihaddi-dotcom`).
- Editors are the emails in the Cloudflare Access policy *Editors* (Zero Trust → Access → Applications → HAKU editor). Remove people who no longer edit.
- Secrets live only in gitignored `.env` / `.mcp.json` and as the Worker secret; never in the repo.

**Renewing the editor's GitHub token** (expires 2027-01-19; `.github/workflows/token-reminder.yml` opens an issue 3 weeks before, and GitHub also emails before a token expires). When it expires, saving in /admin/ stops; the website keeps running.

1. As `alinumbercrunch`: GitHub → Settings → Developer settings → Fine-grained tokens → new token: *Only select repositories* → `crystall-lit-hands`, *Contents: Read and write*, 90 days.
2. Put it in `.env` as `GITHUB_CMS_TOKEN` and upload it: `npx wrangler@4.148.0 secret put GITHUB_TOKEN -c worker/wrangler.toml` (with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from `.env` in the environment).
3. Update `TOKEN_EXPIRES` in `.github/workflows/token-reminder.yml`, delete the old token on GitHub, and close the reminder issue.

GitHub pauses scheduled workflows after 60 days without commits; editor saves count as commits, but check the workflow is enabled if the site has been quiet.

**Content files** — `content/salon.yml` (menu, booking, access, social links), `content/home.yml` (page text), `content/privacy.yml` (privacy policy, `/privacy/`). The privacy policy is a plain-language draft; have it reviewed before relying on it.

## How it works

- **Tubes on the GPU** — each tube is a static grid of `(progress, angle)`. A TSL `positionNode` samples a Catmull-Rom curve from a storage buffer, takes the tangent by central difference, builds the cross-section from a fixed +Z axis, and outputs position and normal. `MeshStandardNodeMaterial` lights it. All strands are one instanced draw.
- **Strand authoring** (`strands.js`, runs once on load) — the mesh (hand, or a code-built diamond via `<body data-shape="diamond">`) is welded into a graph and a Dijkstra geodesic field is computed from its lowest point (wrist / culet). *Flow* strands descend the field and trail off below; *wander* strands random-walk the surface, steered away from visited vertices.
- **Dust visual** (`dust.js`, `<body data-visual="dust">`) — ~40k GPU motes sampled on a merkaba (star tetrahedron, its two halves counter-rotating) or a diamond (`data-shape="merkaba|diamond"`; 45% edges, 50% faces, 5% inside). A TSL compute shader springs each to its target with slow noise, flows them around the pointer, bursts on click and loosens the shape as you scroll.
- **Look** — grow-in via a per-strand radius taper, travelling light pulses on ~12% of strands, selective bloom on the emissive MRT target, an orb that is also the key light.
- **Breathing** — the orb grows and brightens on a 4 s in / 4 s out cycle; the caption and dot follow it.
- **Page** — the canvas is a fixed backdrop. Scroll pulls the camera back and dims it; hovering a CTA brightens the orb; clicking flashes.
- **Fallbacks** — no WebGPU → the 3D never loads and a CSS glow stands in. Phones get about half the strands. `prefers-reduced-motion` renders a still frame.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `light.html`, `crystall.html` | The three pages (`data-theme` picks the scene palette) |
| `styles.css` | Shared styles, light theme, Japanese typography |
| `scripts/blog.js`, `posts/` | Blog generator (Markdown → static HTML at build time) and the posts |
| `scripts/salon.js`, `content/salon.yml` | Menu, booking and access details → `index.html` at build time |
| `scripts/home.js`, `content/home.yml` | Page text → every page at build time and to `i18n.js` (`virtual:home-strings`) |
| `scripts/privacy.js`, `content/privacy.yml` | Privacy policy → `privacy/index.html` (generated, like `blog/`) |
| `public/favicon.svg`, `apple-touch-icon.png`, `og.png` | Merkaba site icon and the share-preview image |
| `.github/workflows/token-reminder.yml` | Weekly check that opens an issue before the editor's token expires |
| `scripts/content.js` | Shared validation and formatting for `content/` |
| `booking.js` | Opens Google's booking page in a panel on wider screens |
| `worker/` | Cloudflare Worker: editor sign-in and GitHub API gateway (`wrangler.toml`, tests) |
| `REQUIREMENTS.md` | Engineering rules and the editor sign-in requirements |
| `public/admin/` | Site editor for the blog and salon info ([Sveltia CMS](https://sveltiacms.app/), MIT) and its config |
| `i18n.js` | EN/JA interface strings, merged with the page text, and the language toggle (`?lang=ja`, saved choice, or browser language) |
| `entry.js` | Loads the scene only when WebGPU is available |
| `main.js` | Shared stage: renderer, theme, orb, breathing, scroll, pointer |
| `tubes.js`, `dust.js` | The two visuals: lit GPU tubes, or compute-shader particles |
| `strands.js` | Builds the strand curves over a mesh: hands (`public/left.glb`) or a brilliant-cut diamond |
| `public/left.glb` | Hand mesh (mirrored for the right hand) |

## Credits

- Technique: Mathis Biabiany, Codrops (linked above). No code from the article was copied.
- Hand mesh: `generic-hand` from [@webxr-input-profiles/assets](https://github.com/immersive-web/webxr-input-profiles), MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
