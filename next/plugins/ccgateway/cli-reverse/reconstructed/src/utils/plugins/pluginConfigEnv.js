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
import { __export } from "../../../runtime/bun-runtime.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aqpks6nd.js:266-277 placement
/**
 * emptyConfig：空配置对象。
 */
var emptyConfig = {};
//@ chunk-aqpks6nd.js:277-391 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aqpks6nd.js:277", () => {
  __export(emptyConfig, {
    booleanOfInput: () => truthyOrFalsyEnv,
    default: () => emptyConfig,
    isHeldTrue: () => isTrueOrTrueString,
    numberInputHint: () => getFormatHint,
    numberOfInput: () => parseBoundedNumber,
  });
});
//@ chunk-aqpks6nd.js:391-429 placement
/**
 * truthyOrFalsyEnv：三态环境变量解析。
 */
var truthyOrFalsyEnv = (raw) => (isEnvTruthy(raw) ? true : isEnvDefinedFalsy(raw) ? false : undefined);
//@ chunk-aqpks6nd.js:429-461 placement (2.1.88 match: _temp, 1)
/**
 * isTrueOrTrueString：值为 true 或字符串 "true"。
 */
var isTrueOrTrueString = (value) => value === true || value === "true";
//@ chunk-aqpks6nd.js:461-594 placement (2.1.88 match: getFormatHint, 0.456)
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
function parseBoundedNumber(input, bounds) {
  let trimmed = input.trim();
  let num = Number(trimmed);
  return trimmed !== "" &&
    Number.isFinite(num) &&
    (bounds.min === undefined || num >= bounds.min) &&
    (bounds.max === undefined || num <= bounds.max)
    ? num
    : undefined;
}
export { truthyOrFalsyEnv, isTrueOrTrueString, emptyConfig, parseBoundedNumber, getFormatHint };
