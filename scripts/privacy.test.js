import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { FILE, parsePrivacy, privacyPage } from "./privacy.js";

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

test("the committed content/privacy.yml is valid and has both languages", () => {
  const p = parsePrivacy(fs.readFileSync(FILE, "utf8"));
  assert.notEqual(p.body.ja, p.body.en);
  assert.match(p.body.ja, /Google/);
});

test("rejects an empty title or body; a missing language falls back", () => {
  assert.throws(() => parsePrivacy("title: { ja: '' }\nbody: { ja: x }"), /title needs Japanese or English text/);
  assert.throws(() => parsePrivacy("title: { ja: x }\nbody: {}"), /body needs Japanese or English text/);
  assert.equal(parsePrivacy("title: { ja: 方針 }\nbody: { ja: 本文 }").body.en, "本文");
});

test("renders both languages in the shared layout, title escaped", () => {
  const html = privacyPage(parsePrivacy('title: { ja: "方針<b>", en: Policy }\nbody: { ja: "## 見出し", en: "## Heading" }'));
  assert.match(html, /data-text-ja="方針&lt;b&gt; — HAKU"/);
  assert.match(html, /<div data-lang-block="ja" lang="ja">[\s\S]*<h2>見出し<\/h2>/);
  assert.match(html, /<div data-lang-block="en" lang="en">[\s\S]*<h2>Heading<\/h2>/);
  assert.match(html, /<a href="\.\.\/blog\/" data-i18n="s.nav.blog">/);
  assert.match(html, /<!-- salon:social -->/);
});

test("CMS fields match the file; share tags use the site URL from the CMS config", () => {
  const cms = parseYaml(read("public/admin/config.yml"));
  const files = cms.collections.find((c) => c.name === "privacy").files[0];
  assert.equal(files.file, "content/privacy.yml");
  assert.deepEqual(files.fields.map((f) => f.name), ["title", "body"]);
  const index = read("index.html");
  assert.ok(index.includes(`<meta property="og:url" content="${cms.site_url}" />`));
  assert.ok(index.includes(`<meta property="og:image" content="${cms.site_url}og.png" />`));
  assert.ok(fs.existsSync(new URL("../public/og.png", import.meta.url)));
});
