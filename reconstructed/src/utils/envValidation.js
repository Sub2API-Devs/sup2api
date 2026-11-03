/**
 * utils/envValidation.ts
 *
 * 有界整数型环境变量的校验（非法值回退默认并告警）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/envValidation.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-q4qb1h08.js (10)
 * attribution: fingerprint 1, placement 10
 */
import { PROVIDER_ENV_VARS } from "./managedEnvConstants.js";
import { jsonStringifyRaw } from "./slowOperations.js";
import { parseIntLoose } from "./envUtils.js";
import { logForDebugging } from "./debug.js";

//@ chunk-q4qb1h08.js:1252-1382 placement
function envEntryProblem(e, n) {
  return PROVIDER_ENV_VARS.test(e)
    ? "invalid-name"
    : typeof n !== "string"
      ? "non-string-value"
      : n.includes("\x00")
        ? "nul-in-value"
        : void 0;
}
/**
 * 环境变量条目被丢弃的原因文案：名称不合法、值不是字符串、值含 NUL 字符。
 */
//@ chunk-q4qb1h08.js:1382-1550 placement
var ENV_ENTRY_PROBLEM_TEXT = {
  "invalid-name": "it isn't a valid environment variable name",
  "non-string-value": "its value isn't a string",
  "nul-in-value": "its value contains a NUL character",
};
/**
 * 过滤环境变量对象中不合法的条目，返回保留的部分与被丢弃的条目及原因。
 */
//@ chunk-q4qb1h08.js:1550-1814 placement
function filterInvalidEnvEntries(e) {
  let entries = Object.entries(e),
    flattened = entries.flatMap(([s, C]) => {
      let _ = envEntryProblem(s, C);
      return _ === void 0 ? [] : [{ name: s, problem: _ }];
    });
  if (flattened.length === 0) return { kept: e, dropped: flattened };
  let E = new Set(flattened.map((s) => s.name));
  return { kept: Object.fromEntries(entries.filter(([s]) => !E.has(s))), dropped: flattened };
}
//@ chunk-q4qb1h08.js:1814-1824 placement
var X = 200;
//@ chunk-q4qb1h08.js:1824-1884 placement
function Se(e) {
  return e === 1 ? "1 character" : `${e} characters`;
}
//@ chunk-q4qb1h08.js:1884-2006 placement
function escapeForDisplay(e) {
  return jsonStringifyRaw(e)
    .slice(1, -1)
    .replace(/[^\x20-\x7e]/g, (n) => `\\u${n.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
/**
 * 生成环境变量条目的安全显示：转义并截断变量名，值不显示只给长度。
 */
//@ chunk-q4qb1h08.js:2006-2194 placement
function describeEnvEntryName(e) {
  let index = e.indexOf("="),
    r = index === -1 ? e : e.slice(0, index),
    E = r.length > X,
    s = `"${escapeForDisplay(E ? r.slice(0, X) : r)}"${E ? "\u2026" : ""}`;
  return index === -1 ? s : `${s} (then '=' and ${Se(e.length - index - 1)}, not shown)`;
}
//@ chunk-q4qb1h08.js:2194-2205 placement
var z = null;
//@ chunk-q4qb1h08.js:2205-2223 placement
function J(e) {
  z = e;
}
//@ chunk-q4qb1h08.js:2223-2261 placement
function e_i(e, n) {
  return z?.(e, n) ?? !1;
}
//@ chunk-aepeg2w5.js:341893-342255 fingerprint = validateBoundedIntEnvVar (1)
function validateBoundedIntEnvVar(name, value, defaultValue, upperLimit) {
  if (!value) return { effective: defaultValue, status: "valid" };
  let h = parseIntLoose(value);
  if (isNaN(h) || h <= 0) {
    let result = {
      effective: defaultValue,
      status: "invalid",
      message: `Invalid value "${value}" (using default: ${defaultValue})`,
    };
    return (logForDebugging(`${name} ${result.message}`), result);
  }
  if (h > upperLimit) {
    let result = { effective: upperLimit, status: "capped", message: `Capped from ${h} to ${upperLimit}` };
    return (logForDebugging(`${name} ${result.message}`), result);
  }
  return { effective: h, status: "valid" };
}

export {
  validateBoundedIntEnvVar,
  escapeForDisplay,
  e_i,
  describeEnvEntryName,
  filterInvalidEnvEntries,
  ENV_ENTRY_PROBLEM_TEXT,
  envEntryProblem,
  J,
};
