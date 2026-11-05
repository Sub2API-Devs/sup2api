/**
 * tools/REPLTool/unwritableArguments.ts
 *
 * 参数无法写成 JSON 的判定与说明，拒绝这类内层调用（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (8)
 * attribution: placement 8
 */
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-n51jggtb.js:81683-81717 placement
/**
 * UnwritableArgumentsError 的名字常量。
 */
var UNWRITABLEARGUMENTSERROR = "UnwritableArgumentsError";
//@ chunk-n51jggtb.js:81717-81778 placement
/**
 * 参数无法写成 JSON 时抛出的错误。
 */
class UnwritableArgumentsError extends Error {
  constructor(message) {
    super(message);
    this.name = UNWRITABLEARGUMENTSERROR;
  }
}
//@ chunk-n51jggtb.js:81778-81847 placement
/**
 * 不可写参数拒绝的开关。
 */
function isUnwritableArgsRefuseOn() {
  return codeModeAccepted() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_repl_unwritable_args_refuse", true);
}
//@ chunk-n51jggtb.js:81847-81894 placement
/**
 * 不可写参数检查的深度/大小阈值。
 */
var JSON_DEPTH_PROBE = 16;
var JSON_SIZE_LIMIT_BYTES = 1048576;
var MAX_STRING_LENGTH = 2147483647;
var MAX_FIELDS_CHECKED = 16;
var ARG_NAME_MAX_CHARS = 80;
//@ chunk-n51jggtb.js:81894-82114 placement
/**
 * 找出是哪个参数不可写（逐项检查顶层键）。
 */
function findUnwritableArgument(args) {
  if (codeModeAccepted()) {
    let reason = jsonWritability(args);
    if (reason === undefined) return;
    if (args !== null && typeof args === "object")
      for (let [key, value] of Object.entries(args).slice(0, MAX_FIELDS_CHECKED)) {
        let fieldReason = jsonWritability({
          [key]: value,
        });
        if (fieldReason !== undefined)
          return {
            name: key,
            ...fieldReason,
          };
      }
    return {
      name: undefined,
      ...reason,
    };
  }
  return;
}
//@ chunk-n51jggtb.js:82114-82173 placement
/**
 * 把值包 16 层做深度探测。
 */
function wrapDeep(value) {
  let wrapped = value;
  for (let j = 0; j < JSON_DEPTH_PROBE; j++) wrapped = [wrapped];
  return wrapped;
}
//@ chunk-n51jggtb.js:82173-82593 placement
/**
 * 判断值失败的原因（过大/过深/bigint/循环/未知）。
 */
function jsonWritability(value) {
  try {
    return jsonStringifyRaw(wrapDeep(value)).length > MAX_STRING_LENGTH - JSON_SIZE_LIMIT_BYTES
      ? {
          because: "too large",
        }
      : undefined;
  } catch (error) {
    if (!(error instanceof Error))
      return {
        because: "unknown",
        engineMessage: String(error),
      };
    if (error instanceof RangeError)
      return /call stack/i.test(error.message)
        ? {
            because: "too deep",
          }
        : {
            because: "too large",
          };
    if (/bigint/i.test(error.message))
      return {
        because: "bigint",
      };
    return /cyclic/i.test(error.message)
      ? {
          because: "circular",
        }
      : {
          because: "unknown",
          engineMessage: error.message,
        };
  }
}
//@ chunk-n51jggtb.js:82593-83566 placement
/**
 * 按失败原因生成“因为参数不可写所以未调用”的说明。
 */
function unwritableArgumentText(name, detail) {
  if (codeModeAccepted()) {
    let { name: argumentName } = detail;
    let subject =
      argumentName === undefined
        ? "its arguments"
        : argumentName.length > ARG_NAME_MAX_CHARS
          ? `its argument \`${truncateToLength(argumentName, ARG_NAME_MAX_CHARS)}\` (name cut to ${ARG_NAME_MAX_CHARS} characters)`
          : `its argument \`${argumentName}\``;
    let named = argumentName !== undefined;
    let lead = `${name} was not called, because`;
    switch (detail.because) {
      case "bigint":
        return `${lead} ${subject} ${named ? "is or contains" : "contain"} a BigInt, which can't be written as JSON. Pass a number or a string instead, such as Number(n) or String(n).`;
      case "circular":
        return `${lead} ${subject} ${named ? "contains" : "contain"} a circular reference, which can't be written as JSON. Copy the fields that the tool needs into a new object, and pass that.`;
      case "too deep":
        return `${lead} ${subject} ${named ? "is" : "are"} nested too deep to be written as JSON. Pass a flatter value.`;
      case "too large":
        return `${lead} ${subject} ${named ? "is" : "together are"} too large to be written as JSON. Pass less data in one call.`;
      case "unknown":
        return `${lead} JSON.stringify threw "${detail.engineMessage}" on ${subject}. Pass only strings, numbers, booleans, null, arrays and plain objects.`;
    }
  }
  return "";
}
export {
  isUnwritableArgsRefuseOn,
  findUnwritableArgument,
  unwritableArgumentText,
  UnwritableArgumentsError,
  UNWRITABLEARGUMENTSERROR,
};
