import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { rich } from "./content.js";
import { KEYS, loadHome, parseHome, renderHome } from "./home.js";

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const committed = () => parseYaml(read("content/home.yml"));
const withField = (path, value) => {
  const data = committed();
  const keys = path.split(".");
  keys.slice(0, -1).reduce((o, k) => o[k], data)[keys.at(-1)] = value;
  return parseHome(JSON.stringify(data));
};

test("the committed content/home.yml is valid and fills every key in both languages", () => {
  const { strings, steps, faq } = loadHome();
  for (const lang of ["en", "ja"]) assert.deepEqual(Object.keys(strings[lang]).sort(), Object.keys(KEYS).sort());
  assert.ok(steps.length && faq.length);
});

test("rich text: escaped first, then *em*, line breaks and safe links", () => {
  assert.equal(rich("Come back\n*to your light.*", "x", "f"), "Come back<br /><em>to your light.</em>");
  assert.equal(rich("<script>alert(1)</script> & *a<b>*", "x", "f"), "&lt;script&gt;alert(1)&lt;/script&gt; &amp; <em>a&lt;b&gt;</em>");
  assert.equal(rich("[Home](../) · [Mail](mailto:a@b.c) · [x](https://a.b/?q=1&r=2)", "x", "f"),
    '<a href="../">Home</a> · <a href="mailto:a@b.c">Mail</a> · <a href="https://a.b/?q=1&amp;r=2">x</a>');
  assert.equal(rich('[x](./a"onmouseover="b)', "x", "f"), '<a href="./a&quot;onmouseover=&quot;b">x</a>');
  // Link addresses are never formatted; labels and the text around them are.
  assert.equal(rich("[*docs*](https://ex.com/a*b*c) *and*\nmore", "x", "f"), '<a href="https://ex.com/a*b*c"><em>docs</em></a> <em>and</em><br />more');
  assert.equal(rich("[a](/blog/) [b](#menu)", "x", "f"), '<a href="/blog/">a</a> <a href="#menu">b</a>');
  for (const bad of ["javascript:alert(1)", "http://a.b", "data:text/html,x", "//evil.example", "/\\evil.example"])
    assert.throws(() => rich(`[x](${bad})`, "footer", "content/home.yml"), /content\/home\.yml: footer: link/, bad);
});

test("rejects empty required text and empty lists; footers may be empty", () => {
  assert.throws(() => withField("hero.heading", { ja: "", en: " " }), /hero\.heading needs Japanese or English text/);
  assert.throws(() => withField("faq.items", []), /at least one item to faq\.items/);
  assert.throws(() => withField("visit.steps", [{ title: { en: "A" } }]), /visit\.steps 1 body/);
  assert.equal(withField("footer", { ja: "", en: "" }).strings.en["s.footer"], "");
  assert.throws(() => withField("footer", { ja: "[x](//evil.example)", en: "ok" }), /footer \(ja\): link/);
  assert.throws(() => parseHome("hero: [unclosed"), /invalid YAML/);
});

test("a missing translation falls back to the other language", () => {
  assert.equal(withField("hero.eyebrow", { ja: "鎌倉" }).strings.en["s.eyebrow"], "鎌倉");
});

test("renders steps and FAQ, fills keyed elements and meta, leaves other keys alone", () => {
  const data = withField("hero.heading", { en: "A & *B*", ja: "あ" });
  const html = renderHome(
    `<title data-i18n="s.title">old</title><meta name="description" content="old" data-i18n-content="s.desc" />
<h1 data-i18n-html="s.h1">old</h1><p data-i18n="s.lede">old</p><span data-i18n="lang.switch">日本語</span>
<div class="cards"><!-- home:visit --></div><!-- home:faq -->`,
    data,
  );
  assert.match(html, /<title data-i18n="s.title">HAKU — Energy healing salon in Kamakura<\/title>/);
  assert.match(html, /content="HAKU — a private energy healing salon/);
  assert.match(html, /<h1 data-i18n-html="s.h1">A &amp; <em>B<\/em><\/h1>/);
  assert.match(html, /<span data-i18n="lang.switch">日本語<\/span>/);
  assert.match(html, /card-num">01<\/span>[\s\S]*card-num">03<\/span>/);
  assert.match(html, /<summary data-text-en="Do I need any experience\?" data-text-ja="経験がなくても大丈夫ですか？">/);
  assert.throws(() => renderHome("<!-- home:nope -->", data), /unknown marker/);
  assert.match(renderHome('<meta property="og:title" data-fill-ja="s.title" content="" />', data), /content="HAKU — 鎌倉のエネルギーヒーリングサロン"/);
  assert.throws(() => renderHome('<meta data-fill-ja="nope" content="" />', data), /unknown key nope/);
});

// Keeps the four places in step: KEYS, the CMS fields, index.html/blog.js and i18n.js.
test("KEYS, the CMS config, the pages and i18n.js agree", () => {
  const cms = parseYaml(read("public/admin/config.yml")).collections.find((c) => c.name === "home").files[0];
  assert.equal(cms.file, "content/home.yml");
  const paths = (fields, prefix = "") => fields.flatMap((f) =>
    f.fields?.some((g) => g.name === "ja") ? [prefix + f.name] : f.fields ? paths(f.fields, `${prefix}${f.name}${f.widget === "list" ? "[]." : "."}`) : []);
  const listFields = ["visit.steps[].title", "visit.steps[].body", "faq.items[].question", "faq.items[].answer"];
  assert.deepEqual(paths(cms.fields).sort(), [...Object.values(KEYS).map((k) => k.path), ...listFields].sort());

  const pages = read("index.html") + read("scripts/blog.js");
  for (const [key, { rich: isRich }] of Object.entries(KEYS)) {
    const attr = key.endsWith("desc") ? "data-i18n-content" : isRich ? "data-i18n-html" : "data-i18n";
    assert.ok(pages.includes(`${attr}="${key}"`), `${key} is used as ${attr}`);
    // Rich text may contain <a>; renderHome's fill would end an <a> element at the first </a>.
    if (isRich) assert.ok(!new RegExp(`<a\\b[^>]*data-i18n-html="${key.replace(/\./g, "\\.")}"`).test(pages), `${key} must not sit on an <a>`);
  }
  const i18n = read("i18n.js");
  for (const key of Object.keys(KEYS)) assert.ok(!i18n.includes(`"${key}":`), `${key} must live only in content/home.yml`);
});
