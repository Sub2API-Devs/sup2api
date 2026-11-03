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
var Gan = {};
//@ chunk-aqpks6nd.js:277-391 placement
Ar(Gan, {
  booleanOfInput: () => h7e,
  default: () => Gan,
  isHeldTrue: () => CHr,
  numberInputHint: () => getFormatHint,
  numberOfInput: () => parseBoundedNumber,
});
//@ chunk-aqpks6nd.js:391-429 placement
var h7e = (n) => (isEnvTruthy(n) ? !0 : isEnvDefinedFalsy(n) ? !1 : void 0);
//@ chunk-aqpks6nd.js:429-461 placement = _temp (1)
var CHr = (n) => n === !0 || n === "true";
/**
 * 生成数字输入的格式提示文案（It takes a number between min and max），供 elicitation/插件配置表单显示。
 */
//@ chunk-aqpks6nd.js:461-594 placement = getFormatHint (0.456)
function getFormatHint(schema) {
  return `It takes a number${schema.min !== void 0 || schema.max !== void 0 ? ` between ${schema.min ?? "-\u221E"} and ${schema.max ?? "\u221E"}` : ""}.`;
}
/**
 * 解析数字字符串并检查 min/max，不合法返回 undefined。
 */
//@ chunk-aqpks6nd.js:594-738 placement
function parseBoundedNumber(n, e) {
  let trimmed = n.trim(),
    t = Number(trimmed);
  return trimmed !== "" &&
    Number.isFinite(t) &&
    (e.min === void 0 || t >= e.min) &&
    (e.max === void 0 || t <= e.max)
    ? t
    : void 0;
}

export { h7e, CHr, Gan, parseBoundedNumber, getFormatHint };
