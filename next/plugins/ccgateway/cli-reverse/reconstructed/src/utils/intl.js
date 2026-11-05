/**
 * utils/intl.ts
 *
 * Intl 缓存：字素/词分割器、相对时间格式、时区、系统语言，按词数统计
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/intl.ts
 * pieces: chunk-t3ta3dyx.js (24)
 * attribution: placement 12, fingerprint 6, callgraph-witnessed 1, layout 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-t3ta3dyx.js:191-216 placement
var INTL_CACHE = null;
var segmenterSingleton = null;
var displayNamesCache = null;
//@ chunk-t3ta3dyx.js:216-296 placement
function languageDisplayNames() {
  if (!displayNamesCache)
    displayNamesCache = new Intl.DisplayNames(["en"], {
      type: "language",
    });
  return displayNamesCache;
}
//@ chunk-t3ta3dyx.js:296-379 fingerprint (2.1.88 match: getGraphemeSegmenter, 1)
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
//@ chunk-t3ta3dyx.js:379-478 fingerprint (2.1.88 match: firstGrapheme, 1)
function firstGrapheme(text) {
  if (!text) return "";
  return getGraphemeSegmenter().segment(text)[Symbol.iterator]().next().value?.segment ?? "";
}
//@ chunk-t3ta3dyx.js:478-568 callgraph-witnessed (2.1.88 match: lastGrapheme, 1)
function lastGrapheme(text) {
  if (!text) return "";
  let last = "";
  for (let { segment } of getGraphemeSegmenter().segment(text)) last = segment;
  return last;
}
//@ chunk-t3ta3dyx.js:568-649 layout
function countGraphemes(text) {
  if (!text) return 0;
  let count = 0;
  for (let segment of getGraphemeSegmenter().segment(text)) count++;
  return count;
}
//@ chunk-t3ta3dyx.js:649-730 placement
function splitGraphemes(text) {
  if (!text) return [];
  return Array.from(getGraphemeSegmenter().segment(text), (grapheme) => grapheme.segment);
}
//@ chunk-t3ta3dyx.js:730-1000 placement
function mergeCombiningGraphemes(graphemes) {
  if (graphemes.length < 2) return graphemes;
  let text = graphemes.join("");
  if (!hasNonAsciiOrCr(text)) return graphemes;
  let merged = [];
  let currentGrapheme = "";
  let graphemeIndex = 0;
  let nextBoundary = graphemes[0].length;
  for (let { segment, index } of getGraphemeSegmenter().segment(text)) {
    while (index >= nextBoundary && graphemeIndex < graphemes.length - 1) {
      merged.push(currentGrapheme);
      currentGrapheme = "";
      graphemeIndex++;
      nextBoundary += graphemes[graphemeIndex].length;
    }
    currentGrapheme += segment;
  }
  merged.push(currentGrapheme);
  while (merged.length < graphemes.length) merged.push("");
  return merged;
}
//@ chunk-t3ta3dyx.js:1000-1100 placement
function hasNonAsciiOrCr(text) {
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 128 || code === 13) return true;
  }
  return false;
}
//@ chunk-t3ta3dyx.js:1100-1180 fingerprint (2.1.88 match: getWordSegmenter, 1)
function getWordSegmenter() {
  if (!segmenterSingleton)
    segmenterSingleton = new Intl.Segmenter(undefined, {
      granularity: "word",
    });
  return segmenterSingleton;
}
//@ chunk-t3ta3dyx.js:1180-1333 layout
/**
 * 统计词数：取空白切分数与 Intl.Segmenter 词段数中的较大者（兼顾中日文）。
 */
function countWords(text) {
  let trimmed = text.trim();
  if (trimmed === "") return 0;
  let whitespaceWordCount = trimmed.split(/\s+/).length;
  let wordLikeCount = 0;
  for (let segment of getWordSegmenter().segment(trimmed)) if (segment.isWordLike) wordLikeCount++;
  return Math.max(whitespaceWordCount, wordLikeCount);
}
//@ chunk-t3ta3dyx.js:1333-1347 layout
var relativeTimeFormatCache = new Map();
//@ chunk-t3ta3dyx.js:1347-1476 fingerprint (2.1.88 match: getRelativeTimeFormat, 1)
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
//@ chunk-t3ta3dyx.js:1476-1487 layout
var timeZoneCache = null;
//@ chunk-t3ta3dyx.js:1487-1568 fingerprint (2.1.88 match: getTimeZone, 1)
function getTimeZone() {
  if (!timeZoneCache) timeZoneCache = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZoneCache;
}
//@ chunk-t3ta3dyx.js:1568-1579 layout
var systemLocaleLanguageCache = null;
//@ chunk-t3ta3dyx.js:1579-1717 fingerprint (2.1.88 match: getSystemLocaleLanguage, 1)
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
//@ chunk-t3ta3dyx.js:1717-1735 placement
var weakMap = new WeakMap();
//@ chunk-t3ta3dyx.js:1735-1924 placement
function stableOptionsKey(options) {
  if (!options) return "";
  let cachedKey = weakMap.get(options);
  if (cachedKey !== undefined) return cachedKey;
  let sorted = Object.entries(options).sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0));
  let keyParts = "";
  for (let [key, value] of sorted) keyParts += `${key}=${String(value)};`;
  weakMap.set(options, keyParts);
  return keyParts;
}
//@ chunk-t3ta3dyx.js:1924-1938 placement
var dateTimeFormatCache = new Map();
//@ chunk-t3ta3dyx.js:1938-1985 placement
function withTimeZone(options, timeZone) {
  return timeZone
    ? {
        ...options,
        timeZone,
      }
    : options;
}
//@ chunk-t3ta3dyx.js:1985-2095 placement
function getDateTimeFormat(locales, options) {
  let cacheKey = `${locales ?? ""}|${stableOptionsKey(options)}`;
  let formatter = dateTimeFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locales, options);
    dateTimeFormatCache.set(cacheKey, formatter);
  }
  return formatter;
}
//@ chunk-t3ta3dyx.js:2095-2109 placement
var numberFormatCache = new Map();
//@ chunk-t3ta3dyx.js:2109-2218 placement
function getNumberFormat(locales, options) {
  let cacheKey = `${locales ?? ""}|${stableOptionsKey(options)}`;
  let formatter = numberFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locales, options);
    numberFormatCache.set(cacheKey, formatter);
  }
  return formatter;
}
export {
  getDateTimeFormat,
  countGraphemes,
  countWords,
  getGraphemeSegmenter,
  firstGrapheme,
  getWordSegmenter,
  getSystemLocaleLanguage,
  splitGraphemes,
  withTimeZone,
  lastGrapheme,
  getNumberFormat,
  getRelativeTimeFormat,
  getTimeZone,
  mergeCombiningGraphemes,
  languageDisplayNames,
};
