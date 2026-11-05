/**
 * utils/plugins/pluginConfigEnv.ts
 *
 * 2.1.316 新增：插件配置环境变量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-04qh4hx2.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../../runtime/bun-runtime.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-04qh4hx2.js:266-277 placement
/**
 * emptyConfig：空配置对象。
 */
var emptyConfig = {};
//@ chunk-04qh4hx2.js:277-391 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-04qh4hx2.js:277", () => {
  __export(emptyConfig, {
    booleanOfInput: () => truthyOrFalsyEnv,
    default: () => emptyConfig,
    isHeldTrue: () => isTrueOrTrueString,
    numberInputHint: () => getFormatHint,
    numberOfInput: () => parseBoundedNumber,
  });
});
//@ chunk-04qh4hx2.js:391-429 placement
/**
 * truthyOrFalsyEnv：三态环境变量解析。
 */
var truthyOrFalsyEnv = (raw) => (isEnvTruthy(raw) ? true : isEnvDefinedFalsy(raw) ? false : undefined);
//@ chunk-04qh4hx2.js:429-461 placement (2.1.88 match: _temp, 1)
/**
 * isTrueOrTrueString：值为 true 或字符串 "true"。
 */
var isTrueOrTrueString = (value) => value === true || value === "true";
//@ chunk-04qh4hx2.js:461-594 placement (2.1.88 match: getFormatHint, 0.455)
/**
 * 生成数字输入的格式提示文案（It takes a number between min and max），供 elicitation/插件配置表单显示。
 */
function getFormatHint(schema) {
  return `It takes a number${schema.min !== undefined || schema.max !== undefined ? ` between ${schema.min ?? "-\u221E"} and ${schema.max ?? "\u221E"}` : ""}.`;
}
//@ chunk-04qh4hx2.js:594-738 placement
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
export { truthyOrFalsyEnv, parseBoundedNumber, getFormatHint, isTrueOrTrueString, emptyConfig };
