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
function envEntryProblem_2(e, n) {
  return PROVIDER_ENV_VARS.test(e)
    ? "invalid-name"
    : typeof n !== "string"
      ? "non-string-value"
      : n.includes("\x00")
        ? "nul-in-value"
        : undefined;
}
//@ chunk-q4qb1h08.js:1382-1550 placement
/**
 * 环境变量条目被丢弃的原因文案：名称不合法、值不是字符串、值含 NUL 字符。
 */
var ENV_ENTRY_PROBLEM_TEXT = {
  "invalid-name": "it isn't a valid environment variable name",
  "non-string-value": "its value isn't a string",
  "nul-in-value": "its value contains a NUL character",
};
//@ chunk-q4qb1h08.js:1550-1814 placement
/**
 * 过滤环境变量对象中不合法的条目，返回保留的部分与被丢弃的条目及原因。
 */
function filterInvalidEnvEntries(e) {
  let entries = Object.entries(e);
  let flattened = entries.flatMap(([s, C]) => {
    let _ = envEntryProblem_2(s, C);
    return _ === undefined
      ? []
      : [
          {
            name: s,
            problem: _,
          },
        ];
  });
  if (flattened.length === 0)
    return {
      kept: e,
      dropped: flattened,
    };
  let E = new Set(flattened.map((s) => s.name));
  return {
    kept: Object.fromEntries(entries.filter(([s]) => !E.has(s))),
    dropped: flattened,
  };
}
//@ chunk-q4qb1h08.js:1814-1824 placement
var MAX_DISPLAYED_ENV_CHARS = 200;
//@ chunk-q4qb1h08.js:1824-1884 placement
function describeCharCount(e) {
  return e === 1 ? "1 character" : `${e} characters`;
}
//@ chunk-q4qb1h08.js:1884-2006 placement
function escapeForDisplay(e) {
  return jsonStringifyRaw(e)
    .slice(1, -1)
    .replace(/[^\x20-\x7e]/g, (n) => `\\u${n.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
//@ chunk-q4qb1h08.js:2006-2194 placement
/**
 * 生成环境变量条目的安全显示：转义并截断变量名，值不显示只给长度。
 */
function describeEnvEntryName(e) {
  let index = e.indexOf("=");
  let r = index === -1 ? e : e.slice(0, index);
  let E = r.length > MAX_DISPLAYED_ENV_CHARS;
  let s = `"${escapeForDisplay(E ? r.slice(0, MAX_DISPLAYED_ENV_CHARS) : r)}"${E ? "\u2026" : ""}`;
  return index === -1 ? s : `${s} (then '=' and ${describeCharCount(e.length - index - 1)}, not shown)`;
}
//@ chunk-q4qb1h08.js:2194-2205 placement
var envEntryProblemCheck = null;
//@ chunk-q4qb1h08.js:2205-2223 placement
/**
 * 注册（或替换）环境项问题检查回调，供 envEntryProblem 调用。
 */
function setEnvEntryProblemCheck(isSettingsSourcedEnvValue) {
  envEntryProblemCheck = isSettingsSourcedEnvValue;
}
//@ chunk-q4qb1h08.js:2223-2261 placement
/**
 * 用已注册的检查回调判断某个环境变量项是否有问题，未注册时返回 false。
 */
function envEntryProblem(e, n) {
  return envEntryProblemCheck?.(e, n) ?? false;
}
//@ chunk-aepeg2w5.js:341893-342255 fingerprint = validateBoundedIntEnvVar (1)
function validateBoundedIntEnvVar(name, value, defaultValue, upperLimit) {
  if (!value)
    return {
      effective: defaultValue,
      status: "valid",
    };
  let parsed = parseIntLoose(value);
  if (isNaN(parsed) || parsed <= 0) {
    let result = {
      effective: defaultValue,
      status: "invalid",
      message: `Invalid value "${value}" (using default: ${defaultValue})`,
    };
    logForDebugging(`${name} ${result.message}`);
    return result;
  }
  if (parsed > upperLimit) {
    let result = {
      effective: upperLimit,
      status: "capped",
      message: `Capped from ${parsed} to ${upperLimit}`,
    };
    logForDebugging(`${name} ${result.message}`);
    return result;
  }
  return {
    effective: parsed,
    status: "valid",
  };
}
export {
  validateBoundedIntEnvVar,
  escapeForDisplay,
  envEntryProblem,
  describeEnvEntryName,
  filterInvalidEnvEntries,
  ENV_ENTRY_PROBLEM_TEXT,
  envEntryProblem_2,
  setEnvEntryProblemCheck,
};
