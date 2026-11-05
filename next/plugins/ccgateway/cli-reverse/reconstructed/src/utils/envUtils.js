/**
 * utils/envUtils.ts
 *
 * 环境变量工具：配置目录（CLAUDE_CONFIG_DIR 或 ~/.claude）、isEnvTruthy/isEnvDefinedFalsy、--bare/--safe-mode、Vertex 区域、CLAUDE_CODE_MAX_TURNS 等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/envUtils.ts
 * pieces: chunk-2k62t388.js (42), chunk-7kayq7nc.js (2), chunk-ndkzc8d3.js (2)
 * attribution: placement 19, fingerprint 9, layout 18
 */
import { resolve, join, dirname, basename } from "path";
import { identity as identity_2 } from "./identity.js";
import { isDiskless } from "./hostScoped.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { nativeRealpathLong } from "./windowsUncPaths.js";
import { identity } from "./pathClassification.js";
import { env } from "./env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ndkzc8d3.js:293-435 placement (2.1.88 match: isEnvTruthy, 1)
/**
 * 环境变量真值判断：1/true/yes/on（不区分大小写，布尔原样）。
 */
function isEnvTruthy(envVar) {
  if (!envVar) return false;
  if (typeof envVar === "boolean") return envVar;
  let normalizedValue = String(envVar).toLowerCase().trim();
  return ["1", "true", "yes", "on"].includes(normalizedValue);
}
//@ chunk-ndkzc8d3.js:435-586 placement (2.1.88 match: isEnvDefinedFalsy, 1)
/**
 * 环境变量是否明确设为假：0/false/no/off。
 */
function isEnvDefinedFalsy(envVar) {
  if (envVar === undefined) return false;
  if (typeof envVar === "boolean") return !envVar;
  let normalizedValue = String(envVar).toLowerCase().trim();
  return ["0", "false", "no", "off"].includes(normalizedValue);
}
//@ chunk-2k62t388.js:436-476 placement
var LANGUAGE_TAG_RE = /^[a-z]{2,}(?:-[a-z0-9]+){0,4}$/i;
//@ chunk-2k62t388.js:476-511 placement
function isLanguageTag(tag) {
  return !!tag && LANGUAGE_TAG_RE.test(tag);
}
//@ chunk-2k62t388.js:511-548 placement
/**
 * 非空字符串原样返回。
 */
function nonEmptyOrUndefined(value) {
  return isLanguageTag(value) ? value : undefined;
}
//@ chunk-2k62t388.js:548-673 placement
var SCIENTIFIC_NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)[eE][+-]?\d+$/;
var THOUSANDS_GROUPED_INT_RE = /^[+-]?\d{1,3}([_,\u00A0\u202F ])\d{3}(?:\1\d{3})*$/;
var THOUSANDS_SEPARATOR_RE = /[_,\u00A0\u202F ]/g;
//@ chunk-2k62t388.js:673-825 placement
/**
 * 宽松解析整数：支持科学计数法与千位分隔符（逗号、下划线、空格等），无法解析返回 undefined。
 */
function parseLooseInteger(text) {
  if (text.length <= 32) {
    if (SCIENTIFIC_NUMBER_RE.test(text)) {
      let number = Number(text);
      return Number.isInteger(number) ? number : NaN;
    }
    if (THOUSANDS_GROUPED_INT_RE.test(text)) return parseInt(text.replace(THOUSANDS_SEPARATOR_RE, ""), 10);
  }
  return;
}
//@ chunk-2k62t388.js:825-893 placement
/**
 * 宽松解析整数（科学计数法）。
 */
function parseIntLoose(value) {
  let text = String(value).trim();
  return parseLooseInteger(text) ?? parseInt(text, 10);
}
//@ chunk-2k62t388.js:893-1040 placement
/**
 * 解析带千位分隔符的数字。
 */
function parseNumberWithSeparators(value) {
  let number = Number(value);
  if (!Number.isNaN(number)) return number;
  let trimmed = String(value).trim();
  return trimmed.length <= 32 && THOUSANDS_GROUPED_INT_RE.test(trimmed)
    ? parseInt(trimmed.replace(THOUSANDS_SEPARATOR_RE, ""), 10)
    : NaN;
}
//@ chunk-2k62t388.js:1040-2110 fingerprint (2.1.88 match: VERTEX_REGION_OVERRIDES, 0.624)
var VERTEX_REGION_OVERRIDES = [
  ["claude-3-5-sonnet", "VERTEX_REGION_CLAUDE_3_5_SONNET"],
  ["claude-3-7-sonnet", "VERTEX_REGION_CLAUDE_3_7_SONNET"],
  ["claude-sonnet-4-5", "VERTEX_REGION_CLAUDE_4_5_SONNET"],
  ["claude-sonnet-4-6", "VERTEX_REGION_CLAUDE_4_6_SONNET"],
  ["claude-sonnet-5-5", "VERTEX_REGION_CLAUDE_5_5_SONNET"],
  ["claude-3-5-haiku", "VERTEX_REGION_CLAUDE_3_5_HAIKU"],
  ["claude-fable-5-1", "VERTEX_REGION_CLAUDE_FABLE_5_1"],
  ["claude-haiku-4-5", "VERTEX_REGION_CLAUDE_HAIKU_4_5"],
  ["claude-haiku-5-5", "VERTEX_REGION_CLAUDE_HAIKU_5_5"],
  ["claude-opus-4-1", "VERTEX_REGION_CLAUDE_4_1_OPUS"],
  ["claude-opus-4-5", "VERTEX_REGION_CLAUDE_4_5_OPUS"],
  ["claude-opus-4-6", "VERTEX_REGION_CLAUDE_4_6_OPUS"],
  ["claude-opus-4-7", "VERTEX_REGION_CLAUDE_4_7_OPUS"],
  ["claude-opus-4-8", "VERTEX_REGION_CLAUDE_4_8_OPUS"],
  ["claude-opus-5-5", "VERTEX_REGION_CLAUDE_5_5_OPUS"],
  ["claude-sonnet-4", "VERTEX_REGION_CLAUDE_4_0_SONNET"],
  ["claude-sonnet-5", "VERTEX_REGION_CLAUDE_5_SONNET"],
  ["claude-fable-5", "VERTEX_REGION_CLAUDE_FABLE_5"],
  ["claude-opus-4", "VERTEX_REGION_CLAUDE_4_0_OPUS"],
  ["claude-opus-5", "VERTEX_REGION_CLAUDE_5_OPUS"],
];
//@ chunk-2k62t388.js:2110-2162 fingerprint (2.1.88 match: getClaudeConfigHomeDir, 0.357)
function getClaudeConfigHomeDir() {
  return process.env.CLAUDE_CONFIG_DIR;
}
//@ chunk-2k62t388.js:2162-2291 placement
/**
 * 读取环境变量并去掉首尾空白；空串返回 undefined。CLAUDE_CONFIG_DIR 走 getClaudeConfigHomeDir。
 */
function getTrimmedEnvValue(name) {
  let value = name === "CLAUDE_CONFIG_DIR" ? getClaudeConfigHomeDir() : process.env[name];
  if (value === undefined) return;
  let trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
}
//@ chunk-2k62t388.js:2291-2333 placement
function isEnvVarTruthy(name) {
  return isEnvTruthy(process.env[name]);
}
//@ chunk-2k62t388.js:2333-2508 placement
function memoizeByKey(compute, keyFn) {
  let cache = identity_2(new Map(), (map) => map.clear());
  function memoized() {
    let key = keyFn();
    let cached = cache.get(key);
    if (cached) return cached.value;
    let value = compute();
    cache.set(key, {
      value,
    });
    return value;
  }
  return Object.assign(memoized, {
    cache,
  });
}
//@ chunk-2k62t388.js:2569-2606 placement
/**
 * Claude 配置目录；diskless 进程返回 null（表示没有可用的本地配置目录）。
 */
function getClaudeConfigDirOrNull() {
  return isDiskless() ? null : getClaudeConfigDir();
}
//@ chunk-2k62t388.js:2606-2677 placement
function isSameConfigDir(configHome) {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  return claudeConfigDirOrNull === null || configHome === null
    ? claudeConfigDirOrNull === configHome
    : resolve(claudeConfigDirOrNull) === resolve(configHome);
}
//@ chunk-2k62t388.js:2677-2715 fingerprint (2.1.88 match: getTeamsDir, 1)
function getTeamsDir() {
  return join(getClaudeConfigDir(), "teams");
}
//@ chunk-2k62t388.js:2715-2776 layout
function getProjectDirNameEnv() {
  return process.env.CLAUDE_CODE_PROJECT_DIR_NAME;
}
//@ chunk-2k62t388.js:2776-2851 layout
var PROJECT_DIR_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
var RESERVED_WINDOWS_NAMES = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
//@ chunk-2k62t388.js:2851-2912 layout
function validateProjectDirName(name) {
  if (!name || !PROJECT_DIR_NAME_PATTERN.test(name) || RESERVED_WINDOWS_NAMES.test(name)) return;
  return name;
}
//@ chunk-2k62t388.js:2912-2972 layout
function configDirFingerprint() {
  return `${isDiskless()}\x00${getClaudeConfigHomeDir() ?? ""}\x00${getProjectDirNameEnv() ?? ""}`;
}
//@ chunk-2k62t388.js:2972-3018 layout
var getProjectDirNameOverride; // deferred: uses memoizeByKey of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2k62t388.js:2972", () => {
  getProjectDirNameOverride = memoizeByKey(
    () =>
      getClaudeConfigHomeDir() || isDiskless() ? validateProjectDirName(getProjectDirNameEnv()) : undefined,
    configDirFingerprint,
  );
});
//@ chunk-2k62t388.js:3018-3109 layout
function isPathConfigDir(path) {
  let path_2 = getClaudeConfigDirOrNull();
  if (path_2 === null) return false;
  if (resolve(path) === resolve(path_2)) return true;
  return getPhysicalPath(path) === getPhysicalPath(path_2);
}
//@ chunk-2k62t388.js:3109-3173 layout
function getPhysicalPath(path) {
  let resolvedPath = resolve(path);
  let parentDir = dirname(resolvedPath);
  let realParentDir = nativeRealpathLong(parentDir) ?? parentDir;
  return identity(join(realParentDir, basename(resolvedPath)));
}
//@ chunk-2k62t388.js:3173-3269 fingerprint (2.1.88 match: hasNodeOption, 1)
function hasNodeOption(flag) {
  let nodeOptions = process.env.NODE_OPTIONS;
  if (!nodeOptions) return false;
  return nodeOptions.split(/\s+/).includes(flag);
}
//@ chunk-2k62t388.js:3269-3349 layout
function parseNumberOrDefault(value, fallback) {
  if (value === undefined) return fallback;
  let intLoose = parseIntLoose(value);
  return Number.isNaN(intLoose) ? fallback : intLoose;
}
//@ chunk-2k62t388.js:3349-3576 layout
function getMaxTurnsFromEnv(maxTurns) {
  if (maxTurns !== undefined) return maxTurns;
  let trimmed = process.env.CLAUDE_CODE_MAX_TURNS?.trim();
  if (!trimmed) return;
  let numberWithSeparators = parseNumberWithSeparators(trimmed);
  if (!Number.isInteger(numberWithSeparators) || numberWithSeparators <= 0)
    throw Error(`CLAUDE_CODE_MAX_TURNS must be a positive integer; got "${trimmed}"`);
  return numberWithSeparators;
}
//@ chunk-2k62t388.js:3576-3639 layout
function parsePositiveNumber(text) {
  let number = Number(text);
  return isNaN(number) || number <= 0 ? undefined : number;
}
//@ chunk-2k62t388.js:3639-3747 layout
function hasArgvFlag(flag) {
  let argv = process.argv;
  let index = argv.indexOf(flag);
  if (index === -1) return false;
  let index_2 = argv.indexOf("--");
  return index_2 === -1 || index < index_2;
}
//@ chunk-2k62t388.js:3747-3816 fingerprint (2.1.88 match: isBareMode, 0.883)
/**
 * --bare 或 CLAUDE_CODE_SIMPLE：最小模式（跳过 CLAUDE.md、hooks、插件等）。
 */
function isBareMode() {
  return isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE) || hasArgvFlag("--bare");
}
//@ chunk-2k62t388.js:3816-3893 layout
/**
 * --safe-mode 或 CLAUDE_CODE_SAFE_MODE。
 */
function isSafeMode() {
  return isEnvTruthy(process.env.CLAUDE_CODE_SAFE_MODE) || hasArgvFlag("--safe-mode");
}
//@ chunk-2k62t388.js:3893-3954 layout
function isRestrictedMode() {
  return isEnvTruthy(process.env.CLAUDE_CODE_RESTRICTED);
}
//@ chunk-2k62t388.js:3954-4092 layout
function getRestartHint(flag) {
  return process.env.CLAUDE_CODE_SESSION_KIND === "bg"
    ? "run /stop, then claude --resume from your shell"
    : `restart without ${flag}`;
}
//@ chunk-2k62t388.js:4092-4177 layout
function getSafeModeExitHint() {
  return hasArgvFlag("--safe-mode") ? getRestartHint("--safe-mode") : "unset CLAUDE_CODE_SAFE_MODE";
}
//@ chunk-2k62t388.js:4177-4250 layout
function getBareModeExitHint() {
  return hasArgvFlag("--bare") ? getRestartHint("--bare") : "unset CLAUDE_CODE_SIMPLE";
}
//@ chunk-2k62t388.js:4250-4311 layout
function isSupervisedMode() {
  return isEnvTruthy(process.env.CLAUDE_CODE_SUPERVISED);
}
//@ chunk-2k62t388.js:4311-4558 fingerprint (2.1.88 match: parseEnvVars, 1)
function parseEnvVars(rawEnvArgs) {
  let parsedEnv = {};
  if (rawEnvArgs)
    for (let envStr of rawEnvArgs) {
      let [key, ...valueParts] = envStr.split("=");
      if (!key || valueParts.length === 0)
        throw Error(
          `Invalid environment variable format: ${envStr}, environment variables should be added as: -e KEY1=value1 -e KEY2=value2`,
        );
      parsedEnv[key] = valueParts.join("=");
    }
  return parsedEnv;
}
//@ chunk-2k62t388.js:4558-4633 fingerprint (2.1.88 match: getDefaultVertexRegion, 1)
function getDefaultVertexRegion() {
  return nonEmptyOrUndefined(process.env.CLOUD_ML_REGION?.trim()) || "us-east5";
}
//@ chunk-2k62t388.js:4633-4839 layout
function getVertexBaseUrlForRegion(region) {
  switch (region) {
    case "global":
      return "https://aiplatform.googleapis.com";
    case "us":
    case "eu":
      return `https://aiplatform.${region}.rep.googleapis.com`;
    default:
      return `https://${region}-aiplatform.googleapis.com`;
  }
}
//@ chunk-2k62t388.js:4839-4918 fingerprint (2.1.88 match: shouldMaintainProjectWorkingDir, 1)
function shouldMaintainProjectWorkingDir() {
  return isEnvTruthy(process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR);
}
//@ chunk-2k62t388.js:4918-4941 placement
/**
 * 内部构建标志（外部构建恒 false）。
 */
function isAntBuild() {
  return false;
}
//@ chunk-2k62t388.js:4941-4964 placement
/**
 * 评测构建标志（外部构建恒 false）。
 */
function isEvalBuild() {
  return false;
}
//@ chunk-2k62t388.js:4964-5019 placement
/**
 * 返回空的 GKE 集群信息（未配置 namespace/cluster）。
 */
function emptyGkeCluster() {
  return {
    namespace: undefined,
    cluster: undefined,
  };
}
//@ chunk-2k62t388.js:5019-5141 placement
/**
 * 按模型取 Vertex 区域环境变量。
 */
function getVertexRegionForModel(model) {
  if (model) {
    let match = VERTEX_REGION_OVERRIDES.find(([prefix]) => model.startsWith(prefix));
    if (match) return nonEmptyOrUndefined(process.env[match[1]]?.trim()) || getDefaultVertexRegion();
  }
  return getDefaultVertexRegion();
}
//@ chunk-7kayq7nc.js:150125-150191 fingerprint (2.1.88 match: getAWSRegion, 0.702)
function getAWSRegion() {
  return nonEmptyOrUndefined(env.AWS_REGION) || nonEmptyOrUndefined(env.AWS_DEFAULT_REGION);
}
//@ chunk-7kayq7nc.js:150191-150231 placement
/**
 * 返回环境变量里的 AWS 区域，缺省 "us-east-1"。
 */
function getDefaultAwsRegion() {
  return getAWSRegion() || "us-east-1";
}
export {
  isEnvTruthy,
  isEvalBuild,
  isSafeMode,
  getVertexRegionForModel,
  parseIntLoose,
  nonEmptyOrUndefined,
  isEnvDefinedFalsy,
  isBareMode,
  getProjectDirNameOverride,
  parseNumberWithSeparators,
  isSupervisedMode,
  getClaudeConfigDirOrNull,
  isRestrictedMode,
  parsePositiveNumber,
  hasNodeOption,
  memoizeByKey,
  getClaudeConfigHomeDir,
  getTeamsDir,
  getVertexBaseUrlForRegion,
  getDefaultVertexRegion,
  getDefaultAwsRegion,
  getSafeModeExitHint,
  isPathConfigDir,
  isAntBuild,
  parseNumberOrDefault,
  shouldMaintainProjectWorkingDir,
  getBareModeExitHint,
  getAWSRegion,
  emptyGkeCluster,
  getMaxTurnsFromEnv,
  isSameConfigDir,
  parseLooseInteger,
  getTrimmedEnvValue,
  isEnvVarTruthy,
  validateProjectDirName,
  parseEnvVars,
};
