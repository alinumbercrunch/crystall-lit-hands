// Salon details: content/salon.yml → the menu, booking and access sections of
// index.html, filled in at <!-- salon:<block> --> markers when Vite serves or builds it.
// The layout matches the CMS in public/admin/config.yml (サロン情報 / Salon info).
import fs from "node:fs";
import path from "node:path";
import { esc } from "./blog.js";
import { el, parseFile, str, text as textIn } from "./content.js";

export const FILE = path.resolve(import.meta.dirname, "..", "content", "salon.yml");
const NAME = "content/salon.yml";

const text = (v, where, optional) => textIn(v, where, NAME, optional);

function int(v, where, min) {
  if (!Number.isInteger(v) || v < min) throw new Error(`${NAME}: ${where} must be a whole number ≥ ${min}, got "${v ?? ""}"`);
  return v;
}

function url(v, where) {
  const s = str(v);
  if (!s) return s;
  let u;
  try { u = new URL(s); } catch {}
  if (u?.protocol !== "https:" || /\s/.test(s)) throw new Error(`${NAME}: ${where} must be an https:// link, got "${s}"`);
  return s;
}

export function parseSalon(src) {
  const data = parseFile(src, NAME);
  if (!Array.isArray(data.sessions) || !data.sessions.length) throw new Error(`${NAME}: add at least one session`);
  return {
    sessions: data.sessions.map((s, i) => {
      const where = `session ${i + 1}`;
      return {
        name: text(s?.name, `${where} name`),
        minutes: int(s?.minutes, `${where} minutes`, 1),
        price: int(s?.price, `${where} price`, 0),
        description: text(s?.description, `${where} description`, true),
        url: url(s?.booking_url, `${where} booking link`),
      };
    }),
    menuNote: text(data.menu_note, "menu note", true),
    info: (data.info ?? []).map((row, i) => ({ label: text(row?.label, `access row ${i + 1} label`), value: text(row?.value, `access row ${i + 1} value`) })),
    notes: [text(data.booking_note, "booking note", true), text(data.privacy_note, "privacy note", true)].filter(Boolean),
  };
}

export const loadSalon = () => parseSalon(fs.readFileSync(FILE, "utf8"));

export const fmtMeta = ({ minutes, price }) => ({
  en: `${minutes} min · ¥${price.toLocaleString("en-US")}`,
  ja: `${minutes}分 · ${price.toLocaleString("ja-JP")}円`,
});

// Only Google's appointment-schedule pages can be framed, and only with ?gv=true
// (the "Website embed" link). Anything else, e.g. calendar.app.google/…, opens in a new tab.
export function embedUrl(link) {
  const u = new URL(link);
  if (u.hostname !== "calendar.google.com" || !u.pathname.startsWith("/calendar/appointments/schedules/")) return "";
  u.searchParams.set("gv", "true");
  return u.href;
}

// Link attributes for a session's booking page, or null while it has none.
function bookAttrs(s) {
  if (!s.url) return null;
  const embed = embedUrl(s.url);
  return `href="${esc(s.url)}" target="_blank" rel="noopener" data-book${embed ? ` data-embed="${esc(embed)}"` : ""} data-name-en="${esc(s.name.en)}" data-name-ja="${esc(s.name.ja)}"`;
}

const BLOCKS = {
  menu: (d) => d.sessions.map((s) => `          <li>
            ${el("h3", "", s.name)}
            ${el("span", "menu-meta", fmtMeta(s))}
            ${s.description ? el("p", "", s.description) : ""}
            <a class="menu-book" ${bookAttrs(s) ?? `href="#book"`} data-i18n="s.menu.book">Book</a>
          </li>`).join("\n"),
  "menu-note": (d) => (d.menuNote ? el("p", "note", d.menuNote) : ""),
  info: (d) => d.info.map((row) => `          ${el("dt", "", row.label)}${el("dd", "", row.value)}`).join("\n"),
  booking: (d) => d.sessions.map((s) => {
    const attrs = bookAttrs(s);
    const go = attrs
      ? `<span data-i18n="s.book.choose">Choose a time</span> <span aria-hidden="true">→</span>`
      : `<span data-i18n="s.book.soon">Online booking coming soon</span>`;
    const inner = `${el("span", "book-name", s.name)}${el("span", "book-meta", fmtMeta(s))}<span class="book-go">${go}</span>`;
    return `          <li>${attrs ? `<a class="card book-option" ${attrs}>${inner}</a>` : `<div class="card book-option is-soon">${inner}</div>`}</li>`;
  }).join("\n"),
  "booking-notes": (d) => d.notes.map((t) => el("p", "note", t)).join("\n"),
};

export function renderSalon(html, data) {
  return html.replace(/<!-- salon:([a-z-]+) -->/g, (marker, name) => {
    if (!BLOCKS[name]) throw new Error(`index.html: unknown marker ${marker}`);
    return BLOCKS[name](data);
  });
}
