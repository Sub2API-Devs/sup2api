/**
 * utils/envUtils.ts
 *
 * 环境变量工具：配置目录（CLAUDE_CONFIG_DIR 或 ~/.claude）、isEnvTruthy/isEnvDefinedFalsy、--bare/--safe-mode、Vertex 区域、CLAUDE_CODE_MAX_TURNS 等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/envUtils.ts
 * pieces: chunk-0777tkjc.js (2), chunk-bwbq4xvm.js (2), chunk-cgcrer2m.js (43)
 * attribution: fingerprint 11, placement 12, layout 24
 */
import { join, resolve, dirname, basename } from "path";
import { homedir } from "os";
import { ge } from "./identity.js";
import { Wre } from "./hostScoped.js";
import { Tm } from "./windowsUncPaths.js";
import { Mn } from "./pathClassification.js";
import { env } from "./env.js";

//@ chunk-cgcrer2m.js:436-476 placement
var m = /^[a-z]{2,}(?:-[a-z0-9]+){0,4}$/i;
//@ chunk-cgcrer2m.js:476-511 placement
function g(e) {
  return !!e && m.test(e);
}
/**
 * 非空字符串原样返回。
 */
//@ chunk-cgcrer2m.js:511-548 placement
function nonEmptyOrUndefined(e) {
  return g(e) ? e : void 0;
}
//@ chunk-cgcrer2m.js:548-673 placement
var SCIENTIFIC_NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)[eE][+-]?\d+$/,
  E = /^[+-]?\d{1,3}([_,\u00A0\u202F ])\d{3}(?:\1\d{3})*$/,
  d = /[_,\u00A0\u202F ]/g;
/**
 * 宽松解析整数：支持科学计数法与千位分隔符（逗号、下划线、空格等），无法解析返回 undefined。
 */
//@ chunk-cgcrer2m.js:673-825 placement
function parseLooseInteger(e) {
  if (e.length <= 32) {
    if (SCIENTIFIC_NUMBER_RE.test(e)) {
      let n = Number(e);
      return Number.isInteger(n) ? n : NaN;
    }
    if (E.test(e)) return parseInt(e.replace(d, ""), 10);
  }
  return;
}
/**
 * 宽松解析整数（科学计数法）。
 */
//@ chunk-cgcrer2m.js:825-893 placement
function parseIntLoose(e) {
  let trimmed = String(e).trim();
  return parseLooseInteger(trimmed) ?? parseInt(trimmed, 10);
}
/**
 * 解析带千位分隔符的数字。
 */
//@ chunk-cgcrer2m.js:893-1040 placement
function parseNumberWithSeparators(e) {
  let n = Number(e);
  if (!Number.isNaN(n)) return n;
  let trimmed = String(e).trim();
  return trimmed.length <= 32 && E.test(trimmed) ? parseInt(trimmed.replace(d, ""), 10) : NaN;
}
//@ chunk-cgcrer2m.js:1040-2110 fingerprint = VERTEX_REGION_OVERRIDES (0.624)
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
//@ chunk-cgcrer2m.js:2110-2162 fingerprint = getClaudeConfigHomeDir (0.357)
function getClaudeConfigHomeDir() {
  return process.env.CLAUDE_CONFIG_DIR;
}
/**
 * 读取环境变量并去掉首尾空白；空串返回 undefined。CLAUDE_CONFIG_DIR 走 getClaudeConfigHomeDir。
 */
//@ chunk-cgcrer2m.js:2162-2291 layout
function getTrimmedEnvValue(e) {
  let n = e === "CLAUDE_CONFIG_DIR" ? getClaudeConfigHomeDir() : process.env[e];
  if (n === void 0) return;
  let trimmed = String(n).trim();
  return trimmed ? trimmed : void 0;
}
//@ chunk-cgcrer2m.js:2291-2333 layout
function isEnvVarTruthy(e) {
  return isEnvTruthy(process.env[e]);
}
//@ chunk-cgcrer2m.js:2333-2508 layout
function memoizeByKey(e, n) {
  let r = ge(new Map(), (o) => o.clear());
  function t() {
    let o = n(),
      a = r.get(o);
    if (a) return a.value;
    let c = e();
    return (r.set(o, { value: c }), c);
  }
  return Object.assign(t, { cache: r });
}
/**
 * Claude 配置目录：$CLAUDE_CONFIG_DIR 或 ~/.claude，NFC 归一化，按 env 值缓存。
 */
//@ chunk-cgcrer2m.js:2508-2569 layout
var getClaudeConfigDir = memoizeByKey(
  () => (getClaudeConfigHomeDir() ?? join(homedir(), ".claude")).normalize("NFC"),
  getClaudeConfigHomeDir,
);
/**
 * Claude 配置目录；diskless 进程返回 null（表示没有可用的本地配置目录）。
 */
//@ chunk-cgcrer2m.js:2569-2606 layout
function getClaudeConfigDirOrNull() {
  return Wre() ? null : getClaudeConfigDir();
}
//@ chunk-cgcrer2m.js:2606-2677 layout
function isSameConfigDir(e) {
  let n = getClaudeConfigDirOrNull();
  return n === null || e === null ? n === e : resolve(n) === resolve(e);
}
//@ chunk-cgcrer2m.js:2677-2715 fingerprint = getTeamsDir (1)
function getTeamsDir() {
  return join(getClaudeConfigDir(), "teams");
}
//@ chunk-cgcrer2m.js:2715-2776 layout
function getProjectDirNameEnv() {
  return process.env.CLAUDE_CODE_PROJECT_DIR_NAME;
}
//@ chunk-cgcrer2m.js:2776-2851 layout
var PROJECT_DIR_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/,
  I = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
//@ chunk-cgcrer2m.js:2851-2912 layout
function validateProjectDirName(e) {
  if (!e || !PROJECT_DIR_NAME_PATTERN.test(e) || I.test(e)) return;
  return e;
}
//@ chunk-cgcrer2m.js:2912-2972 layout
function S() {
  return `${Wre()}\x00${getClaudeConfigHomeDir() ?? ""}\x00${getProjectDirNameEnv() ?? ""}`;
}
//@ chunk-cgcrer2m.js:2972-3018 layout
var getProjectDirNameOverride = memoizeByKey(
  () => (getClaudeConfigHomeDir() || Wre() ? validateProjectDirName(getProjectDirNameEnv()) : void 0),
  S,
);
//@ chunk-cgcrer2m.js:3018-3109 layout
function isPathConfigDir(e) {
  let n = getClaudeConfigDirOrNull();
  if (n === null) return !1;
  if (resolve(e) === resolve(n)) return !0;
  return getPhysicalPath(e) === getPhysicalPath(n);
}
//@ chunk-cgcrer2m.js:3109-3173 layout
function getPhysicalPath(e) {
  let n = resolve(e),
    r = dirname(n),
    t = Tm(r) ?? r;
  return Mn(join(t, basename(n)));
}
//@ chunk-cgcrer2m.js:3173-3269 fingerprint = hasNodeOption (1)
function hasNodeOption(flag) {
  let nodeOptions = process.env.NODE_OPTIONS;
  if (!nodeOptions) return !1;
  return nodeOptions.split(/\s+/).includes(flag);
}
//@ chunk-cgcrer2m.js:3269-3349 layout
function parseNumberOrDefault(e, n) {
  if (e === void 0) return n;
  let r = parseIntLoose(e);
  return Number.isNaN(r) ? n : r;
}
//@ chunk-cgcrer2m.js:3349-3576 layout
function getMaxTurnsFromEnv(e) {
  if (e !== void 0) return e;
  let n = process.env.CLAUDE_CODE_MAX_TURNS?.trim();
  if (!n) return;
  let r = parseNumberWithSeparators(n);
  if (!Number.isInteger(r) || r <= 0)
    throw Error(`CLAUDE_CODE_MAX_TURNS must be a positive integer; got "${n}"`);
  return r;
}
//@ chunk-cgcrer2m.js:3576-3639 layout
function parsePositiveNumber(e) {
  let n = Number(e);
  return isNaN(n) || n <= 0 ? void 0 : n;
}
//@ chunk-cgcrer2m.js:3639-3747 layout
function hasArgvFlag(e) {
  let argv = process.argv,
    index = argv.indexOf(e);
  if (index === -1) return !1;
  let index_2 = argv.indexOf("--");
  return index_2 === -1 || index < index_2;
}
/**
 * --bare 或 CLAUDE_CODE_SIMPLE：最小模式（跳过 CLAUDE.md、hooks、插件等）。
 */
//@ chunk-cgcrer2m.js:3747-3816 fingerprint = isBareMode (0.883)
function isBareMode() {
  return isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE) || hasArgvFlag("--bare");
}
/**
 * --safe-mode 或 CLAUDE_CODE_SAFE_MODE。
 */
//@ chunk-cgcrer2m.js:3816-3893 layout
function isSafeMode() {
  return isEnvTruthy(process.env.CLAUDE_CODE_SAFE_MODE) || hasArgvFlag("--safe-mode");
}
//@ chunk-cgcrer2m.js:3893-3954 layout
function isRestrictedMode() {
  return isEnvTruthy(process.env.CLAUDE_CODE_RESTRICTED);
}
//@ chunk-cgcrer2m.js:3954-4092 layout
function getRestartHint(e) {
  return process.env.CLAUDE_CODE_SESSION_KIND === "bg"
    ? "run /stop, then claude --resume from your shell"
    : `restart without ${e}`;
}
//@ chunk-cgcrer2m.js:4092-4177 layout
function getSafeModeExitHint() {
  return hasArgvFlag("--safe-mode") ? getRestartHint("--safe-mode") : "unset CLAUDE_CODE_SAFE_MODE";
}
//@ chunk-cgcrer2m.js:4177-4250 layout
function getBareModeExitHint() {
  return hasArgvFlag("--bare") ? getRestartHint("--bare") : "unset CLAUDE_CODE_SIMPLE";
}
//@ chunk-cgcrer2m.js:4250-4311 layout
function isSupervisedMode() {
  return isEnvTruthy(process.env.CLAUDE_CODE_SUPERVISED);
}
//@ chunk-cgcrer2m.js:4311-4558 fingerprint = parseEnvVars (1)
function parseEnvVars(rawEnvArgs) {
  let parsedEnv = {};
  if (rawEnvArgs)
    for (let envStr of rawEnvArgs) {
      let [t, ...o] = envStr.split("=");
      if (!t || o.length === 0)
        throw Error(
          `Invalid environment variable format: ${envStr}, environment variables should be added as: -e KEY1=value1 -e KEY2=value2`,
        );
      parsedEnv[t] = o.join("=");
    }
  return parsedEnv;
}
//@ chunk-cgcrer2m.js:4558-4633 fingerprint = getDefaultVertexRegion (1)
function getDefaultVertexRegion() {
  return nonEmptyOrUndefined(process.env.CLOUD_ML_REGION?.trim()) || "us-east5";
}
//@ chunk-cgcrer2m.js:4633-4839 layout
function getVertexBaseUrlForRegion(e) {
  switch (e) {
    case "global":
      return "https://aiplatform.googleapis.com";
    case "us":
    case "eu":
      return `https://aiplatform.${e}.rep.googleapis.com`;
    default:
      return `https://${e}-aiplatform.googleapis.com`;
  }
}
//@ chunk-cgcrer2m.js:4839-4918 fingerprint = shouldMaintainProjectWorkingDir (1)
function shouldMaintainProjectWorkingDir() {
  return isEnvTruthy(process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR);
}
/**
 * 内部构建标志（外部构建恒 false）。
 */
//@ chunk-cgcrer2m.js:4918-4941 placement
function isAntBuild() {
  return !1;
}
/**
 * 评测构建标志（外部构建恒 false）。
 */
//@ chunk-cgcrer2m.js:4941-4964 placement
function isEvalBuild() {
  return !1;
}
//@ chunk-cgcrer2m.js:4964-5019 placement
function cLi() {
  return { namespace: void 0, cluster: void 0 };
}
/**
 * 按模型取 Vertex 区域环境变量。
 */
//@ chunk-cgcrer2m.js:5019-5141 placement
function getVertexRegionForModel(model) {
  if (model) {
    let match = VERTEX_REGION_OVERRIDES.find(([r]) => model.startsWith(r));
    if (match) return nonEmptyOrUndefined(process.env[match[1]]?.trim()) || getDefaultVertexRegion();
  }
  return getDefaultVertexRegion();
}
/**
 * 环境变量真值判断：1/true/yes/on（不区分大小写，布尔原样）。
 */
//@ chunk-0777tkjc.js:292-434 fingerprint = isEnvTruthy (1)
function isEnvTruthy(envVar) {
  if (!envVar) return !1;
  if (typeof envVar === "boolean") return envVar;
  let normalizedValue = String(envVar).toLowerCase().trim();
  return ["1", "true", "yes", "on"].includes(normalizedValue);
}
/**
 * 环境变量是否明确设为假：0/false/no/off。
 */
//@ chunk-0777tkjc.js:434-585 fingerprint = isEnvDefinedFalsy (1)
function isEnvDefinedFalsy(envVar) {
  if (envVar === void 0) return !1;
  if (typeof envVar === "boolean") return !envVar;
  let normalizedValue = String(envVar).toLowerCase().trim();
  return ["0", "false", "no", "off"].includes(normalizedValue);
}
//@ chunk-bwbq4xvm.js:151303-151369 fingerprint = getAWSRegion (0.702)
function getAWSRegion() {
  return nonEmptyOrUndefined(env.AWS_REGION) || nonEmptyOrUndefined(env.AWS_DEFAULT_REGION);
}
/**
 * 返回环境变量里的 AWS 区域，缺省 "us-east-1"。
 */
//@ chunk-bwbq4xvm.js:151369-151409 placement
function getDefaultAwsRegion() {
  return getAWSRegion() || "us-east-1";
}

export {
  isSafeMode,
  getSafeModeExitHint,
  getClaudeConfigDir,
  isEnvTruthy,
  isEnvDefinedFalsy,
  getDefaultVertexRegion,
  getDefaultAwsRegion,
  isEvalBuild,
  isBareMode,
  getProjectDirNameOverride,
  parseIntLoose,
  hasNodeOption,
  isSupervisedMode,
  parsePositiveNumber,
  parseNumberWithSeparators,
  isRestrictedMode,
  isAntBuild,
  parseNumberOrDefault,
  getClaudeConfigDirOrNull,
  getVertexRegionForModel,
  nonEmptyOrUndefined,
  getMaxTurnsFromEnv,
  getTeamsDir,
  isSameConfigDir,
  getClaudeConfigHomeDir,
  parseEnvVars,
  isPathConfigDir,
  getVertexBaseUrlForRegion,
  shouldMaintainProjectWorkingDir,
  getAWSRegion,
  getBareModeExitHint,
  parseLooseInteger,
  getTrimmedEnvValue,
  cLi,
  isEnvVarTruthy,
  validateProjectDirName,
};
