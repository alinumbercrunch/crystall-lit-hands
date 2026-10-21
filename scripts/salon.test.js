import { test } from "node:test";
import assert from "node:assert/strict";
import { embedUrl, fmtMeta, loadSalon, parseSalon, renderSalon } from "./salon.js";

const SESSION = "sessions:\n  - name: { ja: レイキ, en: Reiki }\n    minutes: 60\n    price: 9800\n";

test("the committed content/salon.yml is valid", () => {
  assert.ok(loadSalon().sessions.length > 0);
});

test("a missing translation falls back to the other language", () => {
  const s = parseSalon("sessions:\n  - name: { ja: レイキ }\n    minutes: 60\n    price: 9800\n").sessions[0];
  assert.deepEqual(s.name, { ja: "レイキ", en: "レイキ" });
});

test("rejects missing names, bad numbers and non-https links", () => {
  assert.throws(() => parseSalon("sessions: []"), /at least one session/);
  assert.throws(() => parseSalon("sessions:\n  - minutes: 60\n    price: 1\n"), /session 1 name/);
  assert.throws(() => parseSalon("sessions:\n  - name: { en: A }\n    minutes: 0\n    price: 1\n"), /session 1 minutes/);
  assert.throws(() => parseSalon("sessions:\n  - name: { en: A }\n    minutes: 60\n    price: 9.5\n"), /session 1 price/);
  for (const bad of ["http://example.com", '"https://["', '"https://a b"', "calendar.app.google/x"])
    assert.throws(() => parseSalon(`${SESSION}    booking_url: ${bad}\n`), /session 1 booking link must be an https:\/\/ link/, bad);
  assert.throws(() => parseSalon("sessions: [unclosed"), /invalid YAML/);
});

test("formats duration and price per language", () => {
  assert.deepEqual(fmtMeta({ minutes: 60, price: 14000 }), { en: "60 min · ¥14,000", ja: "60分 · 14,000円" });
});

test("only Google appointment-schedule pages are framed, with ?gv=true", () => {
  assert.equal(
    embedUrl("https://calendar.google.com/calendar/appointments/schedules/AcZ123?gv=true"),
    "https://calendar.google.com/calendar/appointments/schedules/AcZ123?gv=true",
  );
  assert.equal(embedUrl("https://calendar.google.com/calendar/appointments/schedules/AcZ123"), "https://calendar.google.com/calendar/appointments/schedules/AcZ123?gv=true");
  assert.equal(embedUrl("https://calendar.app.google/abc123"), "");
});

test("renders markers with both languages, escaped, and booking links", () => {
  const data = parseSalon(`sessions:
  - name: { ja: "レイキ<b>", en: Reiki }
    minutes: 60
    price: 9800
    booking_url: https://calendar.google.com/calendar/appointments/schedules/AcZ1
  - name: { en: Sound }
    minutes: 45
    price: 7500
`);
  const html = renderSalon("<ul><!-- salon:menu --></ul><ul><!-- salon:booking --></ul>", data);
  assert.match(html, /data-text-ja="レイキ&lt;b&gt;"/);
  assert.match(html, /data-text-en="60 min · ¥9,800"/);
  assert.match(html, /data-embed="https:\/\/calendar\.google\.com\/calendar\/appointments\/schedules\/AcZ1\?gv=true"/);
  // No link yet: the menu points at #book and the booking card says "coming soon".
  assert.match(html, /<a class="menu-book" href="#book"/);
  assert.match(html, /is-soon[\s\S]*s\.book\.soon/);
  assert.throws(() => renderSalon("<!-- salon:nope -->", data), /unknown marker/);
});
