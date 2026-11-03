/**
 * plugins/functionHooks/sites/promptSites.ts
 *
 * 钩子站点规则：提示词装饰与光标（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (8)
 * attribution: placement 8
 */
import { checkPinnedKeys, restoreMissingKeys_2, checkResultObject } from "./siteRules.js";
import { textLengthIfNotIn } from "./promptContextSites.js";
import { isPromptSectionMode, PROMPT_SECTION_MODES } from "../hookApiSurface.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import {
  TEXT_STYLE_KEYS,
  DECORATION_EDGE_KEYS,
  VIRTUALTEXT,
  TEXT_STYLE_PROPS,
  propValueProblem,
  primitiveOrEmpty,
} from "../ui/styleProps.js";
import { checkedListLength } from "../dispatch/valueSizing.js";

//@ chunk-4121qate.js:108493-108671 placement
/**
 * 校验 origin 未改动且 text 是字符串。
 */
function checkPromptOriginAndText(e, o) {
  if (checkPinnedKeys(["origin"], e, o) !== undefined)
    return "a changed origin (the engine set it; next(e) passes it on)";
  return typeof e.text === "string" ? undefined : "no { text } (a string)";
}
//@ chunk-4121qate.js:108671-108961 placement
/**
 * 输入框类站点规则工厂（prompt.fill/suggest 等）：恢复 origin 与指定字段，校验参数，结果须含布尔字段 o。
 */
var createPromptBoxSite = (
  event,
  o,
  r = {
    restored: [],
    passedProblem: () => {
      return;
    },
  },
) => ({
  event,
  restoreArgument: (n, s) => restoreMissingKeys_2(["origin", ...r.restored], n, s),
  checkArgument: (n, s) => checkPromptOriginAndText(n, s) ?? r.passedProblem(n),
  measureArgument: (n, s) => textLengthIfNotIn(n.text, s.text),
  check: checkResultObject((n) => (typeof n[o] === "boolean" ? undefined : `no { ${o} } (true or false)`)),
});
//@ chunk-4121qate.js:108961-109038 placement
/**
 * 段落模式校验
 */
var promptSectionModeError = (e) =>
  isPromptSectionMode(e.mode) ? undefined : `a mode that is not one of ${PROMPT_SECTION_MODES.join(", ")}`;
//@ chunk-4121qate.js:113028-113510 placement
/**
 * 校验提示词装饰段 { start, end }（UTF-16 偏移）
 */
function checkDecorationRun(e) {
  if (!isPlainObject(e)) return " must be an object with start and end";
  let found = Object.keys(e).find((key) => !TEXT_STYLE_KEYS.includes(key));
  if (found !== undefined) return `.${found} is not a decoration key (${TEXT_STYLE_KEYS.join(", ")})`;
  let found_2 = DECORATION_EDGE_KEYS.find((p) => !Number.isInteger(e[p]));
  if (found_2 !== undefined) return `.${found_2} must be an integer (a UTF-16 offset)`;
  let s = e[VIRTUALTEXT];
  if (!(s === undefined || typeof s === "string")) return `.${VIRTUALTEXT} must be a string`;
  for (let p of TEXT_STYLE_PROPS) {
    let f = e[p];
    let m = f === undefined ? undefined : propValueProblem(p, primitiveOrEmpty(f));
    if (m !== undefined) return `.${p} ${m}`;
  }
  return;
}
//@ chunk-4121qate.js:113510-113731 placement
function checkDecorations(decorations) {
  if (decorations === undefined) return;
  if (!Array.isArray(decorations)) return "decorations must be an array of { start, end } runs";
  let r = decorations;
  let n = checkedListLength(r);
  for (let s = 0; s < n; s += 1) {
    let i = checkDecorationRun(r[s]);
    if (i !== undefined) return `decorations[${s}]${i}`;
  }
  return;
}
//@ chunk-4121qate.js:113731-113821 placement
/**
 * 光标必须整数
 */
function checkCursorInteger(cursor) {
  return cursor === undefined || Number.isInteger(cursor) ? undefined : "cursor must be an integer";
}
//@ chunk-4121qate.js:113821-113942 placement
/**
 * prompt.fill 结果：仅保留下层给出过的拒绝原因。
 */
function keepFillRefusal(e, o) {
  let { refusal, ...n } = e;
  return refusal !== undefined && n.isFilled === false && o.some((i) => i.refusal === refusal)
    ? {
        ...n,
        refusal,
      }
    : n;
}
//@ chunk-4121qate.js:113942-114078 placement
/**
 * prompt.fill 站点规则：恢复 mode，校验文本、装饰段与光标，结果为 isFilled。
 */
var PROMPT_FILL_SITE = {
  ...createPromptBoxSite("prompt.fill", "isFilled", {
    restored: ["mode"],
    passedProblem: (e) =>
      promptSectionModeError(e) ?? checkDecorations(e.decorations) ?? checkCursorInteger(e.cursor),
  }),
  stripResult: keepFillRefusal,
};
export {
  PROMPT_FILL_SITE,
  createPromptBoxSite,
  checkPromptOriginAndText,
  promptSectionModeError,
  keepFillRefusal,
  checkDecorations,
  checkCursorInteger,
};
