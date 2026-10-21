// Privacy policy: content/privacy.yml (Markdown per language) → privacy/index.html,
// in the blog layout. Runs from vite.config.js like the blog; privacy/ is generated output.
// The layout matches the CMS in public/admin/config.yml (プライバシーポリシー / Privacy policy).
import fs from "node:fs";
import path from "node:path";
import { esc, page, renderMarkdown } from "./blog.js";
import { parseFile, text } from "./content.js";

const ROOT = path.resolve(import.meta.dirname, "..");
export const FILE = path.join(ROOT, "content", "privacy.yml");
const OUT = path.join(ROOT, "privacy");
const NAME = "content/privacy.yml";
const LANGS = ["en", "ja"];

export function parsePrivacy(src) {
  const data = parseFile(src, NAME);
  return { title: text(data.title, "title", NAME), body: text(data.body, "body", NAME) };
}

export function privacyPage({ title, body }) {
  const full = (lang) => `${title[lang]} — HAKU`;
  const attrs = (name, pick) => LANGS.map((l) => `data-${name}-${l}="${esc(pick(l))}"`).join(" ");
  return page({
    title: full("en"),
    titleAttrs: attrs("text", full),
    desc: title.en,
    descAttrs: attrs("content", (l) => title[l]),
    body: `      <article class="post">
${LANGS.map((lang) => `        <div data-lang-block="${lang}" lang="${lang}">
          <header class="post-head"><h1>${esc(title[lang])}</h1></header>
          <div class="prose">${renderMarkdown(body[lang])}</div>
        </div>`).join("\n")}
      </article>`,
  });
}

// Writes privacy/index.html and returns its path (for Vite's build input).
export function buildPrivacy() {
  const html = privacyPage(parsePrivacy(fs.readFileSync(FILE, "utf8")));
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, "index.html");
  fs.writeFileSync(file, html);
  return [file];
}
