/**
 * utils/plugins/pluginConfigEnv.ts
 *
 * 2.1.316 新增：插件配置环境变量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqpks6nd.js (6)
 * attribution: placement 6
 */
import { Ar } from "../../../runtime/bun-runtime.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";

//@ chunk-aqpks6nd.js:266-277 placement
/**
 * emptyConfig：空配置对象。
 */
var emptyConfig = {};
//@ chunk-aqpks6nd.js:277-391 placement
Ar(emptyConfig, {
  booleanOfInput: () => truthyOrFalsyEnv,
  default: () => emptyConfig,
  isHeldTrue: () => isTrueOrTrueString,
  numberInputHint: () => getFormatHint,
  numberOfInput: () => parseBoundedNumber,
});
//@ chunk-aqpks6nd.js:391-429 placement
/**
 * truthyOrFalsyEnv：三态环境变量解析。
 */
var truthyOrFalsyEnv = (n) => (isEnvTruthy(n) ? true : isEnvDefinedFalsy(n) ? false : undefined);
//@ chunk-aqpks6nd.js:429-461 placement = _temp (1)
/**
 * isTrueOrTrueString：值为 true 或字符串 "true"。
 */
var isTrueOrTrueString = (n) => n === true || n === "true";
//@ chunk-aqpks6nd.js:461-594 placement = getFormatHint (0.456)
/**
 * 生成数字输入的格式提示文案（It takes a number between min and max），供 elicitation/插件配置表单显示。
 */
function getFormatHint(schema) {
  return `It takes a number${schema.min !== undefined || schema.max !== undefined ? ` between ${schema.min ?? "-\u221E"} and ${schema.max ?? "\u221E"}` : ""}.`;
}
//@ chunk-aqpks6nd.js:594-738 placement
/**
 * 解析数字字符串并检查 min/max，不合法返回 undefined。
 */
function parseBoundedNumber(n, e) {
  let trimmed = n.trim();
  let t = Number(trimmed);
  return trimmed !== "" &&
    Number.isFinite(t) &&
    (e.min === undefined || t >= e.min) &&
    (e.max === undefined || t <= e.max)
    ? t
    : undefined;
}
export { truthyOrFalsyEnv, isTrueOrTrueString, emptyConfig, parseBoundedNumber, getFormatHint };
