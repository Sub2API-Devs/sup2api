/**
 * utils/plugins/reservedPluginNames.ts
 *
 * 2.1.316 新增：插件名保留词检查（不能冒充 Anthropic 官方插件）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x8f8es1n.js (2)
 * attribution: placement 2
 */
import { splitAlnumWords, NON_ASCII_PATTERN, iterJoinedWordPrefixes, OFFICIAL_NAME_RE } from "./schemas.js";
import { foldConfusableCharacters } from "../confusables.js";

//@ chunk-x8f8es1n.js:276-896 placement
/**
 * 第三方插件名保留词（claude/anthropic、产品名）及提示文字。
 */
var RESERVED_NAME_PARTS = {
  marks: ["claude", "anthropic", "anthropics"],
  builtinLead: "cc-plugin",
  products: ["claude-code", "claude-mods"],
};
var RESERVED_PREFIX_WORDS = [...RESERVED_NAME_PARTS.marks, RESERVED_NAME_PARTS.builtinLead];
var RESERVED_EXACT_NAMES = [...RESERVED_NAME_PARTS.marks, ...RESERVED_NAME_PARTS.products];
var foldWordSet = (e) => new Set(e.map((s) => splitAlnumWords(s).join("")));
var RESERVED_PREFIX_SET = foldWordSet(RESERVED_PREFIX_WORDS);
var RESERVED_EXACT_SET = foldWordSet(RESERVED_EXACT_NAMES);
var max = Math.max(...[...RESERVED_PREFIX_SET, ...RESERVED_EXACT_SET].map((e) => e.length));
var formatOrList = (e) =>
  new Intl.ListFormat("en", {
    type: "disjunction",
  }).format(e.map((s) => `"${s}"`));
var RESERVED_PREFIX_LIST = formatOrList(RESERVED_PREFIX_WORDS.map((e) => `${e}-`));
var RESERVED_NAME_MESSAGE = `A third party's plugin name cannot start with ${RESERVED_PREFIX_LIST}, be ${formatOrList(RESERVED_EXACT_NAMES)}, or put "official" beside "claude" or "anthropic".`;
var RENAME_HINT = "Name it for what it does.";
var OFFICIAL_PLUGIN_HINT =
  "If this is one of Anthropic's own plugins, validate the marketplace that lists it.";
//@ chunk-x8f8es1n.js:896-1344 placement
function checkReservedPluginName(name) {
  let matches = NON_ASCII_PATTERN.test(name);
  let lower = (matches ? foldConfusableCharacters(name) : name).toLowerCase();
  let r = matches ? `"${name}" (read as "${lower}")` : `"${name}"`;
  let i = splitAlnumWords(lower);
  if (
    [...iterJoinedWordPrefixes(lower, max)].some(({ joined, isWhole }) =>
      (isWhole ? RESERVED_EXACT_SET : RESERVED_PREFIX_SET).has(joined),
    ) ||
    OFFICIAL_NAME_RE.test(lower) ||
    OFFICIAL_NAME_RE.test(i.join(""))
  )
    return {
      severity: "error",
      message:
        `Plugin name ${r} is reserved: it passes as one of Anthropic's own. ${RESERVED_NAME_MESSAGE} ` +
        RENAME_HINT,
    };
  return RESERVED_NAME_PARTS.marks.some((mark) => i.includes(mark))
    ? {
        severity: "warning",
        message: `Plugin name ${r} reads as one of Anthropic's own. ` + RENAME_HINT,
      }
    : undefined;
}
export { checkReservedPluginName, OFFICIAL_PLUGIN_HINT };
