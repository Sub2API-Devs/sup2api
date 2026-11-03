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
import { checkPinnedKeys, restoreMissingKeys, M } from "./siteRules.js";
import { Ae } from "./promptContextSites.js";
import { isPromptSectionMode, PROMPT_SECTION_MODES } from "../hookApiSurface.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { vs, Ir, VIRTUALTEXT, TEXT_STYLE_PROPS, propValueProblem, yf } from "../ui/styleProps.js";
import { checkedListLength } from "../dispatch/valueSizing.js";

/**
 * 校验 origin 未改动且 text 是字符串。
 */
//@ chunk-4121qate.js:108493-108671 placement
function checkPromptOriginAndText(e, o) {
  if (checkPinnedKeys(["origin"], e, o) !== void 0)
    return "a changed origin (the engine set it; next(e) passes it on)";
  return typeof e.text === "string" ? void 0 : "no { text } (a string)";
}
/**
 * 输入框类站点规则工厂（prompt.fill/suggest 等）：恢复 origin 与指定字段，校验参数，结果须含布尔字段 o。
 */
//@ chunk-4121qate.js:108671-108961 placement
var createPromptBoxSite = (
  e,
  o,
  r = {
    restored: [],
    passedProblem: () => {
      return;
    },
  },
) => ({
  event: e,
  restoreArgument: (n, s) => restoreMissingKeys(["origin", ...r.restored], n, s),
  checkArgument: (n, s) => checkPromptOriginAndText(n, s) ?? r.passedProblem(n),
  measureArgument: (n, s) => Ae(n.text, s.text),
  check: M((n) => (typeof n[o] === "boolean" ? void 0 : `no { ${o} } (true or false)`)),
});
//@ chunk-4121qate.js:108961-109038 placement
var As = (e) =>
  isPromptSectionMode(e.mode) ? void 0 : `a mode that is not one of ${PROMPT_SECTION_MODES.join(", ")}`;
/**
 * 校验提示词装饰段 { start, end }（UTF-16 偏移）
 */
//@ chunk-4121qate.js:113028-113510 placement
function checkDecorationRun(e) {
  if (!isPlainObject(e)) return " must be an object with start and end";
  let found = Object.keys(e).find((p) => !vs.includes(p));
  if (found !== void 0) return `.${found} is not a decoration key (${vs.join(", ")})`;
  let found_2 = Ir.find((p) => !Number.isInteger(e[p]));
  if (found_2 !== void 0) return `.${found_2} must be an integer (a UTF-16 offset)`;
  let s = e[VIRTUALTEXT];
  if (!(s === void 0 || typeof s === "string")) return `.${VIRTUALTEXT} must be a string`;
  for (let p of TEXT_STYLE_PROPS) {
    let f = e[p],
      m = f === void 0 ? void 0 : propValueProblem(p, yf(f));
    if (m !== void 0) return `.${p} ${m}`;
  }
  return;
}
//@ chunk-4121qate.js:113510-113731 placement
function checkDecorations(e) {
  if (e === void 0) return;
  if (!Array.isArray(e)) return "decorations must be an array of { start, end } runs";
  let r = e,
    n = checkedListLength(r);
  for (let s = 0; s < n; s += 1) {
    let i = checkDecorationRun(r[s]);
    if (i !== void 0) return `decorations[${s}]${i}`;
  }
  return;
}
//@ chunk-4121qate.js:113731-113821 placement
function MAn(e) {
  return e === void 0 || Number.isInteger(e) ? void 0 : "cursor must be an integer";
}
/**
 * prompt.fill 结果：仅保留下层给出过的拒绝原因。
 */
//@ chunk-4121qate.js:113821-113942 placement
function keepFillRefusal(e, o) {
  let { refusal: refusal, ...n } = e;
  return refusal !== void 0 && n.isFilled === !1 && o.some((i) => i.refusal === refusal)
    ? { ...n, refusal: refusal }
    : n;
}
/**
 * prompt.fill 站点规则：恢复 mode，校验文本、装饰段与光标，结果为 isFilled。
 */
//@ chunk-4121qate.js:113942-114078 placement
var PROMPT_FILL_SITE = {
  ...createPromptBoxSite("prompt.fill", "isFilled", {
    restored: ["mode"],
    passedProblem: (e) => As(e) ?? checkDecorations(e.decorations) ?? MAn(e.cursor),
  }),
  stripResult: keepFillRefusal,
};

export {
  PROMPT_FILL_SITE,
  createPromptBoxSite,
  checkPromptOriginAndText,
  As,
  keepFillRefusal,
  checkDecorations,
  MAn,
};
