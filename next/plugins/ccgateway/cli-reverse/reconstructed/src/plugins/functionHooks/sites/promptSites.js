/**
 * plugins/functionHooks/sites/promptSites.ts
 *
 * 钩子站点规则：提示词装饰与光标（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (8)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:89099-89277 placement
/**
 * 校验 origin 未改动且 text 是字符串。
 */
function checkPromptOriginAndText(passed, received) {
  if (checkPinnedKeys(["origin"], passed, received) !== undefined)
    return "a changed origin (the engine set it; next(e) passes it on)";
  return typeof passed.text === "string" ? undefined : "no { text } (a string)";
}
//@ chunk-j8f885h1.js:89277-89567 placement
/**
 * 输入框类站点规则工厂（prompt.fill/suggest 等）：恢复 origin 与指定字段，校验参数，结果须含布尔字段 o。
 */
var createPromptBoxSite = (
  event,
  resultField,
  options = {
    restored: [],
    passedProblem: () => {
      return;
    },
  },
) => ({
  event,
  restoreArgument: (passed, received) =>
    restoreMissingKeys_2(["origin", ...options.restored], passed, received),
  checkArgument: (passed, received) =>
    checkPromptOriginAndText(passed, received) ?? options.passedProblem(passed),
  measureArgument: (passed, received) => textLengthIfNotIn(passed.text, received.text),
  check: checkResultObject((result) =>
    typeof result[resultField] === "boolean" ? undefined : `no { ${resultField} } (true or false)`,
  ),
});
//@ chunk-j8f885h1.js:89567-89644 placement
/**
 * 段落模式校验
 */
var promptSectionModeError = (args) =>
  isPromptSectionMode(args.mode) ? undefined : `a mode that is not one of ${PROMPT_SECTION_MODES.join(", ")}`;
//@ chunk-j8f885h1.js:93634-94116 placement
/**
 * 校验提示词装饰段 { start, end }（UTF-16 偏移）
 */
function checkDecorationRun(run) {
  if (!isPlainObject(run)) return " must be an object with start and end";
  let found = Object.keys(run).find((key) => !TEXT_STYLE_KEYS.includes(key));
  if (found !== undefined) return `.${found} is not a decoration key (${TEXT_STYLE_KEYS.join(", ")})`;
  let found_2 = DECORATION_EDGE_KEYS.find((key) => !Number.isInteger(run[key]));
  if (found_2 !== undefined) return `.${found_2} must be an integer (a UTF-16 offset)`;
  let virtualText = run[VIRTUALTEXT];
  if (!(virtualText === undefined || typeof virtualText === "string"))
    return `.${VIRTUALTEXT} must be a string`;
  for (let key of TEXT_STYLE_PROPS) {
    let value = run[key];
    let problem = value === undefined ? undefined : propValueProblem(key, primitiveOrEmpty(value));
    if (problem !== undefined) return `.${key} ${problem}`;
  }
  return;
}
//@ chunk-j8f885h1.js:94116-94337 placement
function checkDecorations(decorations) {
  if (decorations === undefined) return;
  if (!Array.isArray(decorations)) return "decorations must be an array of { start, end } runs";
  let list = decorations;
  let length = checkedListLength(list);
  for (let index = 0; index < length; index += 1) {
    let problem = checkDecorationRun(list[index]);
    if (problem !== undefined) return `decorations[${index}]${problem}`;
  }
  return;
}
//@ chunk-j8f885h1.js:94337-94427 placement
/**
 * 光标必须整数
 */
function checkCursorInteger(cursor) {
  return cursor === undefined || Number.isInteger(cursor) ? undefined : "cursor must be an integer";
}
//@ chunk-j8f885h1.js:94427-94548 placement
/**
 * prompt.fill 结果：仅保留下层给出过的拒绝原因。
 */
function keepFillRefusal(result, answers) {
  let { refusal, ...rest } = result;
  return refusal !== undefined &&
    rest.isFilled === false &&
    answers.some((answer) => answer.refusal === refusal)
    ? {
        ...rest,
        refusal,
      }
    : rest;
}
//@ chunk-j8f885h1.js:94548-94684 placement
/**
 * prompt.fill 站点规则：恢复 mode，校验文本、装饰段与光标，结果为 isFilled。
 */
var PROMPT_FILL_SITE; // deferred: uses createPromptBoxSite of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:94548", () => {
  PROMPT_FILL_SITE = {
    ...createPromptBoxSite("prompt.fill", "isFilled", {
      restored: ["mode"],
      passedProblem: (args) =>
        promptSectionModeError(args) ?? checkDecorations(args.decorations) ?? checkCursorInteger(args.cursor),
    }),
    stripResult: keepFillRefusal,
  };
});
export {
  checkDecorations,
  checkCursorInteger,
  PROMPT_FILL_SITE,
  createPromptBoxSite,
  checkPromptOriginAndText,
  promptSectionModeError,
  keepFillRefusal,
};
