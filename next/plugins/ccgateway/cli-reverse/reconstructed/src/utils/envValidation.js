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
import { parseIntLoose } from "./envUtils.js";
import { logForDebugging } from "./debug.js";
import { PROVIDER_ENV_VARS } from "./managedEnvConstants.js";
import { jsonStringifyRaw } from "./slowOperations.js";

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
//@ chunk-q4qb1h08.js:1252-1382 placement
function envEntryProblem_2(name, value) {
  return PROVIDER_ENV_VARS.test(name)
    ? "invalid-name"
    : typeof value !== "string"
      ? "non-string-value"
      : value.includes("\x00")
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
function filterInvalidEnvEntries(entries) {
  let entries_2 = Object.entries(entries);
  let flattened = entries_2.flatMap(([name, value]) => {
    let problem = envEntryProblem_2(name, value);
    return problem === undefined
      ? []
      : [
          {
            name,
            problem,
          },
        ];
  });
  if (flattened.length === 0)
    return {
      kept: entries,
      dropped: flattened,
    };
  let invalidNames = new Set(flattened.map((entry) => entry.name));
  return {
    kept: Object.fromEntries(entries_2.filter(([name]) => !invalidNames.has(name))),
    dropped: flattened,
  };
}
//@ chunk-q4qb1h08.js:1814-1824 placement
var MAX_DISPLAYED_ENV_CHARS = 200;
//@ chunk-q4qb1h08.js:1824-1884 placement
function describeCharCount(count) {
  return count === 1 ? "1 character" : `${count} characters`;
}
//@ chunk-q4qb1h08.js:1884-2006 placement
function escapeForDisplay(text) {
  return jsonStringifyRaw(text)
    .slice(1, -1)
    .replace(/[^\x20-\x7e]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
//@ chunk-q4qb1h08.js:2006-2194 placement
/**
 * 生成环境变量条目的安全显示：转义并截断变量名，值不显示只给长度。
 */
function describeEnvEntryName(name) {
  let index = name.indexOf("=");
  let baseName = index === -1 ? name : name.slice(0, index);
  let isTruncated = baseName.length > MAX_DISPLAYED_ENV_CHARS;
  let display = `"${escapeForDisplay(isTruncated ? baseName.slice(0, MAX_DISPLAYED_ENV_CHARS) : baseName)}"${isTruncated ? "\u2026" : ""}`;
  return index === -1
    ? display
    : `${display} (then '=' and ${describeCharCount(name.length - index - 1)}, not shown)`;
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
function envEntryProblem(name, value) {
  return envEntryProblemCheck?.(name, value) ?? false;
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
