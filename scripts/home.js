// Page text: content/home.yml → the i18n strings for the home and blog pages
// (virtual:home-strings, merged by i18n.js) plus the "First visit" steps and FAQ at
// <!-- home:<block> --> markers. Elements whose data-i18n key is listed below also get
// their English text filled in at build time, so the HTML never holds a stale copy.
// The layout matches the CMS in public/admin/config.yml (ホームページの文章 / Page text).
import fs from "node:fs";
import path from "node:path";
import { esc } from "./blog.js";
import { el, parseFile, rich, text } from "./content.js";

export const FILE = path.resolve(import.meta.dirname, "..", "content", "home.yml");
const NAME = "content/home.yml";

// i18n key → field in home.yml. `rich` fields allow *emphasis*, line breaks and
// [links](…) and must be used with data-i18n-html; the rest are plain text.
export const KEYS = {
  "s.title": { path: "page.title" },
  "s.desc": { path: "page.description" },
  "s.eyebrow": { path: "hero.eyebrow" },
  "s.h1": { path: "hero.heading", rich: true },
  "s.lede": { path: "hero.lede" },
  "s.cta": { path: "hero.book_button" },
  "s.viewMenu": { path: "hero.menu_button" },
  "s.about.eyebrow": { path: "about.eyebrow" },
  "s.about.h2": { path: "about.heading", rich: true },
  "s.about.p": { path: "about.body" },
  "s.menu.eyebrow": { path: "menu.eyebrow" },
  "s.menu.h2": { path: "menu.heading", rich: true },
  "s.visit.eyebrow": { path: "visit.eyebrow" },
  "s.visit.h2": { path: "visit.heading", rich: true },
  "s.faq.eyebrow": { path: "faq.eyebrow" },
  "s.access.eyebrow": { path: "access.eyebrow" },
  "s.access.h2": { path: "access.heading", rich: true },
  "s.quote": { path: "closing.quote", rich: true },
  "s.footer": { path: "footer", rich: true, optional: true },
  "blog.title": { path: "blog.title" },
  "blog.desc": { path: "blog.description" },
  "blog.eyebrow": { path: "blog.eyebrow" },
  "blog.h1": { path: "blog.heading", rich: true },
  "blog.footer": { path: "blog.footer", rich: true, optional: true },
};

const get = (obj, p) => p.split(".").reduce((o, k) => o?.[k], obj);

function list(v, where, fields) {
  if (!Array.isArray(v) || !v.length) throw new Error(`${NAME}: add at least one item to ${where}`);
  return v.map((item, i) => Object.fromEntries(fields.map((f) => [f, text(item?.[f], `${where} ${i + 1} ${f}`, NAME)])));
}

export function parseHome(src) {
  const data = parseFile(src, NAME);
  const strings = { en: {}, ja: {} };
  for (const [key, { path: p, rich: isRich, optional }] of Object.entries(KEYS)) {
    const t = text(get(data, p), p, NAME, optional) ?? { en: "", ja: "" };
    for (const lang of ["en", "ja"]) strings[lang][key] = isRich ? rich(t[lang], `${p} (${lang})`, NAME) : t[lang];
  }
  return {
    strings,
    steps: list(data.visit?.steps, "visit.steps", ["title", "body"]),
    faq: list(data.faq?.items, "faq.items", ["question", "answer"]),
  };
}

export const loadHome = () => parseHome(fs.readFileSync(FILE, "utf8"));

const BLOCKS = {
  visit: (d) => d.steps.map((s, i) => `          <article class="card">
            <span class="card-num">${String(i + 1).padStart(2, "0")}</span>
            ${el("h3", "", s.title)}
            ${el("p", "", s.body)}
          </article>`).join("\n"),
  faq: (d) => d.faq.map((f) => `        <details>
          ${el("summary", "", f.question)}
          ${el("p", "", f.answer)}
        </details>`).join("\n"),
};

const ELEMENT = /<([a-z][a-z0-9]*)(\s[^>]*?\bdata-i18n(-html)?="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/gi;

export function renderHome(html, data) {
  const en = data.strings.en;
  return html
    .replace(/<!-- home:([a-z-]+) -->/g, (marker, name) => {
      if (!BLOCKS[name]) throw new Error(`unknown marker ${marker}`);
      return BLOCKS[name](data);
    })
    .replace(ELEMENT, (tag, name, attrs, isHtml, key) => {
      if (!(key in en)) return tag;
      return `<${name}${attrs}>${isHtml ? en[key] : esc(en[key])}</${name}>`;
    })
    .replace(/<meta\b[^>]*\bdata-i18n-content="([^"]+)"[^>]*>/g, (tag, key) =>
      key in en ? tag.replace(/(\s)content="[^"]*"/, `$1content="${esc(en[key])}"`) : tag)
    // Share-preview tags are read by crawlers, not by i18n.js: fixed to Japanese at build.
    .replace(/<meta\b[^>]*\bdata-fill-ja="([^"]+)"[^>]*>/g, (tag, key) => {
      if (!(key in data.strings.ja)) throw new Error(`data-fill-ja: unknown key ${key}`);
      return tag.replace(/(\s)content="[^"]*"/, `$1content="${esc(data.strings.ja[key])}"`);
    });
}
