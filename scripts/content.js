// Shared helpers for the CMS-edited files in content/ (scripts/salon.js, scripts/home.js).
import { parse as parseYaml } from "yaml";
import { esc } from "./blog.js";

export const str = (v) => (v == null ? "" : String(v).trim());

export function parseFile(src, name) {
  try {
    return parseYaml(src) ?? {};
  } catch (err) {
    throw new Error(`${name}: invalid YAML: ${err.message}`);
  }
}

// { ja, en } → both filled; a missing translation falls back to the other one.
// Throws (or returns null when optional) if both are empty.
export function text(v, where, name, optional = false) {
  const ja = str(v?.ja), en = str(v?.en);
  if (!ja && !en) {
    if (optional) return null;
    throw new Error(`${name}: ${where} needs Japanese or English text`);
  }
  return { ja: ja || en, en: en || ja };
}

// "//host" (and "/\host", which browsers read the same) is another site, so a bare "/"
// must not be followed by a slash, and backslashes are refused anywhere.
const SAFE_HREF = /^(https:\/\/|mailto:|#|\.{1,2}\/|\/(?![/\\]))[^\\]*$/;

// Editor-friendly formatting → HTML. Everything is escaped first, then:
// a new line → <br />, *words* → <em>, [label](link) → <a> (https, mailto, # or relative only).
export function rich(s, where, name) {
  return esc(s)
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      // href was escaped above; &amp; etc. are fine inside an attribute.
      if (!SAFE_HREF.test(href)) throw new Error(`${name}: ${where}: link "${href}" must start with https://, mailto:, # or /`);
      return `<a href="${href}">${label}</a>`;
    })
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/\r?\n/g, "<br />");
}

// English text inline (the HTML default); i18n.js swaps in data-text-<lang>.
export const el = (tag, cls, t) =>
  `<${tag}${cls ? ` class="${cls}"` : ""} data-text-en="${esc(t.en)}" data-text-ja="${esc(t.ja)}">${esc(t.en)}</${tag}>`;
