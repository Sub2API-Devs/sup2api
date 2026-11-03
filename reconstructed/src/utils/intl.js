/**
 * utils/intl.ts
 *
 * Intl 缓存：字素/词分割器、相对时间格式、时区、系统语言，按词数统计
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/intl.ts
 * pieces: chunk-bfrv6ttc.js (23)
 * attribution: placement 12, fingerprint 6, callgraph-witnessed 1, layout 4
 */
//@ chunk-bfrv6ttc.js:191-216 placement
var INTL_CACHE = null;
var segmenterSingleton = null;
var displayNamesCache = null;
//@ chunk-bfrv6ttc.js:216-296 placement
function languageDisplayNames() {
  if (!displayNamesCache)
    displayNamesCache = new Intl.DisplayNames(["en"], {
      type: "language",
    });
  return displayNamesCache;
}
//@ chunk-bfrv6ttc.js:296-379 fingerprint = getGraphemeSegmenter (1)
/**
 * 惰性创建并复用 Intl.Segmenter（grapheme 粒度），用于按用户可见字符切分字符串。
 */
function getGraphemeSegmenter() {
  if (!INTL_CACHE)
    INTL_CACHE = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
  return INTL_CACHE;
}
//@ chunk-bfrv6ttc.js:379-478 fingerprint = firstGrapheme (1)
function firstGrapheme(text) {
  if (!text) return "";
  return getGraphemeSegmenter().segment(text)[Symbol.iterator]().next().value?.segment ?? "";
}
//@ chunk-bfrv6ttc.js:478-567 callgraph-witnessed = lastGrapheme (1)
function lastGrapheme(text) {
  if (!text) return "";
  let last = "";
  for (let { segment } of getGraphemeSegmenter().segment(text)) last = segment;
  return last;
}
//@ chunk-bfrv6ttc.js:648-729 placement
function splitGraphemes(e) {
  if (!e) return [];
  return Array.from(getGraphemeSegmenter().segment(e), (t) => t.segment);
}
//@ chunk-bfrv6ttc.js:729-999 placement
function mergeCombiningGraphemes(e) {
  if (e.length < 2) return e;
  let joined = e.join("");
  if (!hasNonAsciiOrCr(joined)) return e;
  let r = [];
  let n = "";
  let i = 0;
  let o = e[0].length;
  for (let { segment, index } of getGraphemeSegmenter().segment(joined)) {
    while (index >= o && i < e.length - 1) {
      r.push(n);
      n = "";
      i++;
      o += e[i].length;
    }
    n += segment;
  }
  r.push(n);
  while (r.length < e.length) r.push("");
  return r;
}
//@ chunk-bfrv6ttc.js:999-1099 placement
function hasNonAsciiOrCr(e) {
  for (let i = 0; i < e.length; i++) {
    let code = e.charCodeAt(i);
    if (code >= 128 || code === 13) return true;
  }
  return false;
}
//@ chunk-bfrv6ttc.js:1099-1179 fingerprint = getWordSegmenter (1)
function getWordSegmenter() {
  if (!segmenterSingleton)
    segmenterSingleton = new Intl.Segmenter(undefined, {
      granularity: "word",
    });
  return segmenterSingleton;
}
//@ chunk-bfrv6ttc.js:1179-1332 layout
/**
 * 统计词数：取空白切分数与 Intl.Segmenter 词段数中的较大者（兼顾中日文）。
 */
function countWords(text) {
  let trimmed = text.trim();
  if (trimmed === "") return 0;
  let r = trimmed.split(/\s+/).length;
  let n = 0;
  for (let i of getWordSegmenter().segment(trimmed)) if (i.isWordLike) n++;
  return Math.max(r, n);
}
//@ chunk-bfrv6ttc.js:1332-1346 layout
var relativeTimeFormatCache = new Map();
//@ chunk-bfrv6ttc.js:1346-1475 fingerprint = getRelativeTimeFormat (1)
function getRelativeTimeFormat(style, numeric) {
  let key = `${style}:${numeric}`;
  let rtf = relativeTimeFormatCache.get(key);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat("en", {
      style,
      numeric,
    });
    relativeTimeFormatCache.set(key, rtf);
  }
  return rtf;
}
//@ chunk-bfrv6ttc.js:1475-1486 layout
var timeZoneCache = null;
//@ chunk-bfrv6ttc.js:1486-1567 fingerprint = getTimeZone (1)
function getTimeZone() {
  if (!timeZoneCache) timeZoneCache = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZoneCache;
}
//@ chunk-bfrv6ttc.js:1567-1578 layout
var systemLocaleLanguageCache = null;
//@ chunk-bfrv6ttc.js:1578-1716 fingerprint = getSystemLocaleLanguage (1)
function getSystemLocaleLanguage() {
  if (systemLocaleLanguageCache === null)
    try {
      let locale = Intl.DateTimeFormat().resolvedOptions().locale;
      systemLocaleLanguageCache = new Intl.Locale(locale).language;
    } catch {
      systemLocaleLanguageCache = undefined;
    }
  return systemLocaleLanguageCache;
}
//@ chunk-bfrv6ttc.js:1716-1734 placement
var weakMap = new WeakMap();
//@ chunk-bfrv6ttc.js:1734-1923 placement
function stableOptionsKey(e) {
  if (!e) return "";
  let t = weakMap.get(e);
  if (t !== undefined) return t;
  let sorted = Object.entries(e).sort(([i], [o]) => (i < o ? -1 : i > o ? 1 : 0));
  let n = "";
  for (let [i, o] of sorted) n += `${i}=${String(o)};`;
  weakMap.set(e, n);
  return n;
}
//@ chunk-bfrv6ttc.js:1923-1937 placement
var dateTimeFormatCache = new Map();
//@ chunk-bfrv6ttc.js:1937-1984 placement
function withTimeZone(e, t) {
  return t
    ? {
        ...e,
        timeZone: t,
      }
    : e;
}
//@ chunk-bfrv6ttc.js:1984-2094 placement
function getDateTimeFormat(e, t) {
  let r = `${e ?? ""}|${stableOptionsKey(t)}`;
  let n = dateTimeFormatCache.get(r);
  if (!n) {
    n = new Intl.DateTimeFormat(e, t);
    dateTimeFormatCache.set(r, n);
  }
  return n;
}
//@ chunk-bfrv6ttc.js:2094-2108 placement
var numberFormatCache = new Map();
//@ chunk-bfrv6ttc.js:2108-2217 placement
function getNumberFormat(e, t) {
  let r = `${e ?? ""}|${stableOptionsKey(t)}`;
  let n = numberFormatCache.get(r);
  if (!n) {
    n = new Intl.NumberFormat(e, t);
    numberFormatCache.set(r, n);
  }
  return n;
}
export {
  getSystemLocaleLanguage,
  splitGraphemes,
  getGraphemeSegmenter,
  firstGrapheme,
  getDateTimeFormat,
  withTimeZone,
  getNumberFormat,
  getRelativeTimeFormat,
  getTimeZone,
  getWordSegmenter,
  lastGrapheme,
  mergeCombiningGraphemes,
  languageDisplayNames,
  countWords,
};
