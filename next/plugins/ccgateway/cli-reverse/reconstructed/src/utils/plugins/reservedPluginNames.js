/**
 * utils/plugins/reservedPluginNames.ts
 *
 * 2.1.316 新增：插件名保留词检查（不能冒充 Anthropic 官方插件）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-65bt0307.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { splitAlnumWords, NON_ASCII_PATTERN, iterJoinedWordPrefixes, OFFICIAL_NAME_RE } from "./schemas.js";
import { foldConfusableCharacters } from "../confusables.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-65bt0307.js:276-753 placement
/**
 * 第三方插件名保留词（claude/anthropic、产品名）及提示文字。
 */
var RESERVED_NAME_PARTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RESERVED_PREFIX_WORDS;
var RESERVED_EXACT_NAMES;
var foldWordSet;
var RESERVED_PREFIX_SET;
var RESERVED_EXACT_SET;
var max;
var formatOrList;
var RENAME_HINT;
var OFFICIAL_PLUGIN_HINT;
deferInit("chunk-65bt0307.js:276", () => {
  RESERVED_NAME_PARTS = {
    marks: ["claude", "anthropic", "anthropics"],
    builtinLead: "cc-plugin",
    products: ["claude-code", "claude-mods"],
  };
  RESERVED_PREFIX_WORDS = [...RESERVED_NAME_PARTS.marks, RESERVED_NAME_PARTS.builtinLead];
  RESERVED_EXACT_NAMES = [...RESERVED_NAME_PARTS.marks, ...RESERVED_NAME_PARTS.products];
  foldWordSet = (list) => new Set(list.map((word) => splitAlnumWords(word).join("")));
  RESERVED_PREFIX_SET = foldWordSet(RESERVED_PREFIX_WORDS);
  RESERVED_EXACT_SET = foldWordSet(RESERVED_EXACT_NAMES);
  max = Math.max(...[...RESERVED_PREFIX_SET, ...RESERVED_EXACT_SET].map((word) => word.length));
  formatOrList = (list) =>
    new Intl.ListFormat("en", {
      type: "disjunction",
    }).format(list.map((word) => `"${word}"`));
  RENAME_HINT = "Name it for what it does.";
  OFFICIAL_PLUGIN_HINT = "If this is one of Anthropic's own plugins, validate the marketplace that lists it.";
});
//@ chunk-65bt0307.js:753-1331 placement
function checkReservedPluginName(name) {
  let matches = NON_ASCII_PATTERN.test(name);
  let name_2 = (matches ? foldConfusableCharacters(name) : name).toLowerCase();
  let name_3 = matches ? `"${name}" (read as "${name_2}")` : `"${name}"`;
  let words = splitAlnumWords(name_2);
  if (
    [...iterJoinedWordPrefixes(name_2, max)].some(({ joined, isWhole }) =>
      (isWhole ? RESERVED_EXACT_SET : RESERVED_PREFIX_SET).has(joined),
    ) ||
    OFFICIAL_NAME_RE.test(name_2) ||
    OFFICIAL_NAME_RE.test(words.join(""))
  )
    return {
      severity: "error",
      message:
        `Plugin name ${name_3} is reserved: it passes as one of Anthropic's own. A third party's plugin name cannot start with ${formatOrList(RESERVED_PREFIX_WORDS.map((word) => `${word}-`))}, be ${formatOrList(RESERVED_EXACT_NAMES)}, or put "official" beside "claude" or "anthropic". ` +
        RENAME_HINT,
    };
  return RESERVED_NAME_PARTS.marks.some((mark) => words.includes(mark))
    ? {
        severity: "warning",
        message: `Plugin name ${name_3} reads as one of Anthropic's own. ` + RENAME_HINT,
      }
    : undefined;
}
export { checkReservedPluginName, OFFICIAL_PLUGIN_HINT };
