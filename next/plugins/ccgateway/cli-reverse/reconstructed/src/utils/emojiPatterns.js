/**
 * utils/emojiPatterns.ts
 *
 * 2.1.316 新增：独立符号/emoji 匹配正则
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-784n84wr.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-784n84wr.js:191-380 placement
var regExp = new RegExp(
  "(^|\\s)(?:[^\\p{L}\\s]|[\\u02D0\\u02D1\\u0887\\u0971\\u1427\\u18DF\\uA4F8-\\uA4FD\\uA78F\\u318D\\u119E\\u11A2\\u{10781}\\u{10782}\\u{1BC84}\\u{1BC94}])+(?=\\s|$)",
  "gu",
);
//@ chunk-784n84wr.js:380-989 placement
/**
 * 独立符号/emoji 匹配用的正则：标点与符号类字符（排除常见 ASCII 标点与 emoji 表现形式）、空白外观字符、不可见符号、组合记号。
 */
var STANDALONE_SYMBOL_PATTERN =
  "(?:[\\u{26AB}]|(?![\\u0021-\\u007E\\u00A1\\u00BF\\u055D\\u060C\\u061B\\u061F\\u0964\\u0965\\u0F0B\\u0F0C\\u2026\\u22EF\\u3001\\uFE19\\uFF01\\uFF0C\\uFF1F]|\\p{Emoji_Presentation})[\\p{Po}\\p{Sm}\\p{Sk}\\p{So}\\u02D0\\u02D1\\u0887\\u0971\\u1427\\u18DF\\uA4F8-\\uA4FD\\uA78F\\u318D\\u119E\\u11A2\\u{10781}\\u{10782}\\u{1BC84}\\u{1BC94}])";
var BLANK_LOOKALIKE_RE = /[\u2800\u3164\u115F\u1160\uFFA0]/gu;
var INVISIBLE_SYMBOL_RE = /[\u{1D159}\u{13441}\u{13442}\uFFFC]/gu;
var COMBINING_MARK_RE = new RegExp(
  "(^|[^\\p{L}\\p{M}]|[\\u02D0\\u02D1\\u0887\\u0971\\u1427\\u18DF\\uA4F8-\\uA4FD\\uA78F\\u318D\\u119E\\u11A2\\u{10781}\\u{10782}\\u{1BC84}\\u{1BC94}])\\p{M}+",
  "gu",
);
export { STANDALONE_SYMBOL_PATTERN, BLANK_LOOKALIKE_RE, INVISIBLE_SYMBOL_RE, regExp, COMBINING_MARK_RE };
