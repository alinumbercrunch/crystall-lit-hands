// Tiny i18n: [data-i18n] → textContent, [data-i18n-html] → innerHTML (static,
// trusted strings only), [data-i18n-content] → content attribute.
// Generated blog pages carry per-page strings inline instead: data-text-<lang>,
// data-content-<lang>, and [data-lang-block] sections hidden by CSS.
// Page text edited in the CMS (content/home.yml) arrives as virtual:home-strings
// (scripts/home.js); its rich fields are already escaped HTML.
import home from "virtual:home-strings";
const STRINGS = {
  en: {
    "lang.switch": "日本語",

    "dark.title": "CRYSTALL — Hold the light",
    "dark.desc": "CRYSTALL — a quieter corner of the universe. Breathe, write, and find your stillness.",
    "dark.nav.practice": "Practice",
    "dark.nav.journal": "Journal",
    "dark.nav.crystals": "Crystals",
    "nav.signin": "Sign in",
    "dark.eyebrow": "A quieter corner of the universe",
    "dark.h1": "Hold the light.<br /><em>Find your stillness.</em>",
    "dark.lede": "Five quiet minutes a day. Breathe, write a little, and let the noise settle — at your own pace.",
    "dark.cta": "Begin a session",
    "dark.how": "How it works",
    "dark.scroll": "Scroll",
    "dark.practice.eyebrow": "The practice",
    "dark.practice.h2": "Three small rituals.<br /><em>One calmer mind.</em>",
    "dark.focus.h": "Focus",
    "dark.focus.p": "A guided breath that follows the light. Return to one thing, for five minutes.",
    "dark.journal.h": "Journal",
    "dark.journal.p": "No perfect words needed. Let a thought find its place, then let it go.",
    "dark.explore.h": "Explore",
    "dark.explore.p": "Amethyst, rose quartz, aquamarine — each brings its own colour and quiet character.",
    "dark.quote": "“Light moves at its own pace.<br />So can you.”",
    "dark.start": "Start free",
    "dark.footer": "© CRYSTALL · a prototype · <a href=\"./light.html\">light version</a>",

    "light.title": "LUMEN — Meditation in light",
    "light.desc": "LUMEN — short guided meditations. Breathe in, let the light settle.",
    "light.nav.sessions": "Sessions",
    "light.nav.about": "About",
    "light.eyebrow": "Meditation, made of light",
    "light.h1": "Breathe in.<br /><em>Let the light settle.</em>",
    "light.lede": "A few quiet minutes, guided by a single point of light. Nothing to fix — just follow it in, and let it go.",
    "light.cta": "Start breathing",
    "light.sessions": "Sessions",
    "light.sessions.h2": "Three moments<br /><em>in your day.</em>",
    "light.morning.t": "5 min",
    "light.morning.h": "Morning light",
    "light.morning.p": "Wake gently. Count ten slow breaths before the day begins.",
    "light.midday.t": "3 min",
    "light.midday.h": "Midday pause",
    "light.midday.p": "Step out of the noise. One breath in, one breath out, then back.",
    "light.evening.t": "10 min",
    "light.evening.h": "Evening release",
    "light.evening.p": "Let the day loosen its hold. Follow the light down into rest.",
    "light.quote": "“Nothing to fix.<br />Just this breath.”",
    "light.begin": "Begin",
    "light.footer": "LUMEN · a prototype · <a href=\"./crystall.html\">dark version</a>",

    "breath.in": "Breathe in",
    "breath.out": "Breathe out",
    "breath.slow": "Breathe slowly",
    "s.nav.blog": "Blog",
    "blog.back": "← All posts",
    "blog.empty": "No posts yet.",

    "s.nav.about": "About",
    "s.nav.menu": "Menu",
    "s.nav.visit": "First visit",
    "s.nav.access": "Access",
    "s.nav.book": "Book",
    "s.menu.book": "Book",
    "s.book.choose": "Choose a time",
    "s.book.soon": "Online booking coming soon",
    "s.book.newTab": "Open in new tab ↗",
    "s.book.close": "Close",
  },
  ja: {
    "lang.switch": "English",

    "dark.title": "CRYSTALL — 光を、そっと手に",
    "dark.desc": "CRYSTALL — 宇宙の静かな片隅で。呼吸して、書いて、静けさを見つける。",
    "dark.nav.practice": "プラクティス",
    "dark.nav.journal": "ジャーナル",
    "dark.nav.crystals": "クリスタル",
    "nav.signin": "ログイン",
    "dark.eyebrow": "宇宙の、静かな片隅で",
    "dark.h1": "光を、そっと手に。<br /><em>静けさを見つける。</em>",
    "dark.lede": "一日五分の静かな時間。呼吸をして、少しだけ書いて、ざわめきが落ち着くのを待つ。自分のペースで。",
    "dark.cta": "セッションを始める",
    "dark.how": "使い方",
    "dark.scroll": "スクロール",
    "dark.practice.eyebrow": "プラクティス",
    "dark.practice.h2": "三つの小さな習慣。<br /><em>穏やかな心へ。</em>",
    "dark.focus.h": "集中",
    "dark.focus.p": "光に合わせて呼吸する、五分間のガイド。ひとつのことに立ち返る。",
    "dark.journal.h": "ジャーナル",
    "dark.journal.p": "完璧な言葉はいらない。思いに居場所を与えて、そっと手放す。",
    "dark.explore.h": "探索",
    "dark.explore.p": "アメジスト、ローズクォーツ、アクアマリン。それぞれの色と、静かな個性。",
    "dark.quote": "「光は、自分のペースで進む。<br />あなたも、それでいい。」",
    "dark.start": "無料で始める",
    "dark.footer": "© CRYSTALL · プロトタイプ · <a href=\"./light.html\">ライト版</a>",

    "light.title": "LUMEN — 光の瞑想",
    "light.desc": "LUMEN — 短いガイド付き瞑想。息を吸って、光が静まるのを待つ。",
    "light.nav.sessions": "セッション",
    "light.nav.about": "概要",
    "light.eyebrow": "光でできた、瞑想",
    "light.h1": "息を吸って。<br /><em>光が静まるのを待つ。</em>",
    "light.lede": "ひとつの光に導かれる、数分間の静かな時間。直すことは何もない。光を追って吸い込み、そして手放すだけ。",
    "light.cta": "呼吸を始める",
    "light.sessions": "セッション",
    "light.sessions.h2": "一日の中の、<br /><em>三つの時間。</em>",
    "light.morning.t": "5分",
    "light.morning.h": "朝の光",
    "light.morning.p": "やさしく目覚める。一日が始まる前に、ゆっくり十回の呼吸を。",
    "light.midday.t": "3分",
    "light.midday.h": "昼のひと休み",
    "light.midday.p": "喧騒から一歩離れて。吸って、吐いて、また戻る。",
    "light.evening.t": "10分",
    "light.evening.h": "夜、手放す",
    "light.evening.p": "一日の緊張をゆるめて。光を追って、静かな眠りへ。",
    "light.quote": "「直すことは、何もない。<br />ただ、この呼吸だけ。」",
    "light.begin": "始める",
    "light.footer": "LUMEN · プロトタイプ · <a href=\"./crystall.html\">ダーク版</a>",

    "breath.in": "吸って",
    "breath.out": "吐いて",
    "breath.slow": "ゆっくり呼吸を",
    "s.nav.blog": "ブログ",
    "blog.back": "← 記事一覧",
    "blog.empty": "まだ記事はありません。",

    "s.nav.about": "サロンについて",
    "s.nav.menu": "メニュー",
    "s.nav.visit": "はじめての方へ",
    "s.nav.access": "アクセス",
    "s.nav.book": "予約する",
    "s.menu.book": "予約する",
    "s.book.choose": "日時を選ぶ",
    "s.book.soon": "オンライン予約は準備中です",
    "s.book.newTab": "新しいタブで開く ↗",
    "s.book.close": "閉じる",
  },
};

const LANGS = Object.keys(STRINGS);
for (const l of LANGS) Object.assign(STRINGS[l], home[l]);
const KEY = "lang";

function initialLang() {
  const param = new URLSearchParams(location.search).get(KEY);
  if (LANGS.includes(param)) return param;
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {}
  return navigator.language?.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export let lang = initialLang();
export const t = (key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key;

function apply() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-html]")) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll("[data-i18n-content]")) el.content = t(el.dataset.i18nContent);
  for (const el of document.querySelectorAll(`[data-text-${lang}]`)) el.textContent = el.getAttribute(`data-text-${lang}`);
  for (const el of document.querySelectorAll(`[data-content-${lang}]`)) el.content = el.getAttribute(`data-content-${lang}`);
}

export function setLang(next) {
  lang = next;
  try { localStorage.setItem(KEY, next); } catch {}
  apply();
}

for (const btn of document.querySelectorAll("[data-lang-toggle]"))
  btn.addEventListener("click", () => setLang(lang === "ja" ? "en" : "ja"));

apply();

// Self-check: both languages define the same keys.
if (import.meta.env?.DEV) {
  const missing = LANGS.flatMap((l) => Object.keys(STRINGS.en).filter((k) => !(k in STRINGS[l])).map((k) => `${l}:${k}`));
  console.assert(missing.length === 0, "i18n missing keys", missing);
}
