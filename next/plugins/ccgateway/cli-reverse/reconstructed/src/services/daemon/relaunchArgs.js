/**
 * services/daemon/relaunchArgs.ts
 *
 * 2.1.316 新增：后台会话重启参数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y162pn60.js (19)
 * attribution: placement 19
 */
import {
  getMainLoopModelOverride,
  getRefusalFallbackModelLatch,
  getReplConfigArgv,
  getAccountMemoryLaunchMode,
  getChromeFlagOverride,
  getFlagSettingsInline,
} from "../../bootstrap/state.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isModelRemappedOrRetired } from "../../utils/model/deprecation.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { isAcceptableModelArg } from "./processLiveness.js";
import { isModelKeyAliasOrResolved } from "../../utils/model/modelIds.js";
import { effortLevelValue } from "../../utils/effort.js";
import { eagerParseCliFlag } from "../../utils/cliArgs.js";
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION } from "../../utils/sessionConfigFlags.js";
import { isNonWslUncPath } from "../../utils/networkPaths.js";
import { earlyArgsToArgv, parseEarlyArgs } from "../../cli/earlyArgs.js";
import { appliedSettingSourcesFlagValue } from "../../utils/settings/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-y162pn60.js:18205-18391 placement
/**
 * 重启时要携带的主模型：无覆盖或 mantle 时不带；null 为 default；已重映射/退役、等于拒绝回退模型或无法在命令行表示的不带。
 */
function getRelaunchModel() {
  let mainLoopModelOverride = getMainLoopModelOverride();
  if (mainLoopModelOverride === undefined || getAPIProvider() === "mantle") return;
  if (mainLoopModelOverride === null) return "default";
  if (!mainLoopModelOverride) return;
  if (isModelRemappedOrRetired(parseUserSpecifiedModel(mainLoopModelOverride))) return;
  if (getRefusalFallbackModelLatch()?.fallbackModel === mainLoopModelOverride) return;
  if (!isAcceptableModelArg(mainLoopModelOverride)) return;
  return mainLoopModelOverride;
}
//@ chunk-y162pn60.js:18391-18464 placement
/**
 * 判断模型参数是否合法（"default" 或已知模型）。
 */
function isValidModelArg(value) {
  let lower = value.trim().toLowerCase();
  return lower === "default" || isModelKeyAliasOrResolved(lower);
}
//@ chunk-y162pn60.js:18464-18516 placement
/**
 * 当前启动是否带 --restricted。
 */
function isRestrictedLaunch() {
  return getReplConfigArgv().includes("--restricted");
}
//@ chunk-y162pn60.js:18516-19325 placement
/**
 * 生成后台会话重启的 CLI 参数：保留原始参数（去掉 --add-dir，必要时过滤 --fallback-model），加上 Chrome、绕过权限、附加目录、模型、effort、快速模式与当前权限模式。
 */
function buildRelaunchArgs(permissionContext, effort, { carryModel = true } = {}) {
  let addDirs = getDirsFromSources(permissionContext.additionalWorkingDirectories, ["cliArg"]);
  let args = [];
  let replArgv = getReplConfigArgv();
  for (let j = 0; j < replArgv.length; j++) {
    let arg = replArgv[j];
    if (arg === "--add-dir") j++;
    else if (!carryModel && arg === "--fallback-model") {
      let filtered = (replArgv[j + 1] ?? "")
        .split(",")
        .map((arg) => arg.trim())
        .filter((arg) => isValidModelArg(arg));
      j++;
      if (filtered.length > 0) args.push("--fallback-model", filtered.join(","));
    } else if (arg !== undefined) args.push(arg);
  }
  let effortValue = effortLevelValue(effort);
  let fastMode = getFastModeFlag();
  let model = getRelaunchModel();
  let carriedModel = model !== undefined && (carryModel || isValidModelArg(model)) ? model : undefined;
  let allowBypass =
    permissionContext.isBypassPermissionsModeAvailable &&
    !args.includes("--allow-dangerously-skip-permissions");
  let memoryLaunchMode = getAccountMemoryLaunchMode();
  let chromeFlag = getChromeFlagOverride();
  return [
    ...[],
    ...[],
    ...[],
    ...args,
    ...(chromeFlag === undefined ? [] : [chromeFlag ? "--chrome" : "--no-chrome"]),
    ...(allowBypass ? ["--allow-dangerously-skip-permissions"] : []),
    ...addDirs.flatMap((addDir) => ["--add-dir", addDir]),
    ...(carriedModel !== undefined ? ["--model", carriedModel] : []),
    ...(effortValue !== undefined ? ["--effort", effortValue] : []),
    ...(fastMode !== undefined ? ["--fast-mode", fastMode] : []),
    "--permission-mode",
    permissionContext.mode,
  ];
}
//@ chunk-y162pn60.js:19325-19457 placement
function getFastModeFlag() {
  let flagValue = eagerParseCliFlag("--fast-mode");
  if (flagValue !== "on" && flagValue !== "off") return;
  let fastMode = getFlagSettingsInline()?.fastMode;
  return typeof fastMode === "boolean" ? (fastMode ? "on" : "off") : flagValue;
}
//@ chunk-y162pn60.js:19457-19525 placement
/**
 * 判断一条权限规则能否原样写进重启命令行。
 */
function isCarriableRule(rule) {
  let parts = splitRuleList([rule]);
  return parts.length === 1 && parts[0] === rule && isAcceptableModelArg(rule);
}
//@ chunk-y162pn60.js:19525-20095 placement
/**
 * 列出重启时命令行无法完整携带的设置：受限启动标志、仅会话的规则、cliArg 的 ask 规则、无法表示的规则与附加目录。
 */
function listUncarriedLaunchSettings(permissionContext, hasRestrictedFlags) {
  return [
    ...(hasRestrictedFlags ? [`launch flags: ${FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION}`] : []),
    ...((permissionContext.alwaysDenyRules.session ?? []).length > 0 ||
    (permissionContext.alwaysAskRules.session ?? []).length > 0
      ? ["permission rules set for this session only"]
      : []),
    ...((permissionContext.alwaysAskRules.cliArg ?? []).length > 0
      ? ["ask-before-running rules with no command-line form"]
      : []),
    ...([
      ...(permissionContext.alwaysAllowRules.cliArg ?? []),
      ...(permissionContext.alwaysDenyRules.cliArg ?? []),
    ].some((rule) => !isCarriableRule(rule))
      ? ["permission rules a command line cannot carry intact"]
      : []),
    ...(getDirsFromSources(permissionContext.additionalWorkingDirectories, ["cliArg"]).some(
      (rule) => !isAcceptableModelArg(rule),
    )
      ? ["added directories a command line cannot carry intact"]
      : []),
  ];
}
//@ chunk-y162pn60.js:20095-20432 placement
/**
 * 把 cliArg 的 allow/deny 规则与 agent、agents、追加系统提示、系统提示快照转为命令行参数。
 */
function buildPermissionAndAgentArgs(toolPermissionContext, forkReplayLaunchConfig) {
  return [
    ...(toolPermissionContext.alwaysAllowRules.cliArg ?? []).flatMap((rule) => ["--allowed-tools", rule]),
    ...(toolPermissionContext.alwaysDenyRules.cliArg ?? []).flatMap((rule) => ["--disallowed-tools", rule]),
    ...flagArgs("--agent", forkReplayLaunchConfig.agent),
    ...flagArgs("--agents", forkReplayLaunchConfig.agents),
    ...flagArgs("--append-system-prompt", forkReplayLaunchConfig.appendSystemPrompt),
    ...flagArgs("--system-prompt-snapshot", onOffFlagValue(forkReplayLaunchConfig.systemPromptSnapshot)),
  ];
}
//@ chunk-y162pn60.js:20432-20498 placement
/**
 * 把标志与值拼成 argv 片段（含空格的值拆成两个参数）。
 */
function flagArgs(name, value) {
  if (!value) return [];
  return isAcceptableModelArg(value) ? [name, value] : [`${name}=${value}`];
}
//@ chunk-y162pn60.js:20498-20552 placement
/**
 * 布尔值转 "on"/"off"（undefined 原样返回）。
 */
function onOffFlagValue(enabled) {
  return enabled === undefined ? undefined : enabled ? "on" : "off";
}
//@ chunk-y162pn60.js:20552-20675 placement
function getDirsFromSources(dirsByKey, sources) {
  return Array.from(dirsByKey.values())
    .filter((dirEntry) => sources.includes(dirEntry.source))
    .filter((dirEntry) => !isNonWslUncPath(dirEntry.path))
    .map((dirEntry) => dirEntry.path);
}
//@ chunk-y162pn60.js:20675-20759 placement
/**
 * 生成重启时要保留的早期参数 argv。
 */
function earlyArgsArgv(dirs) {
  return earlyArgsToArgv({
    ...parseEarlyArgs(getReplConfigArgv()).config,
    addDir: cliAddDirs(dirs),
    settingSources: appliedSettingSourcesFlagValue(),
  });
}
//@ chunk-y162pn60.js:20759-20833 placement
/**
 * 去掉旧的 --add-dir 参数后加上新的附加目录。
 */
function replaceAddDirArgs(args, dirs) {
  return [...stripAddDirArgs(args), ...cliAddDirs(dirs).flatMap((dir) => ["--add-dir", dir])];
}
//@ chunk-y162pn60.js:20833-20940 placement
function stripAddDirArgs(args) {
  let kept = [];
  let skipNext = false;
  for (let arg of args)
    if (skipNext) skipNext = false;
    else if (arg === "--add-dir") skipNext = true;
    else kept.push(arg);
  return kept;
}
//@ chunk-y162pn60.js:20940-20991 placement
/**
 * 取命令行来源的附加目录（过滤非法路径）。
 */
function cliAddDirs(dirs) {
  return getDirsFromSources(dirs, ["cliArg"]).filter(isAcceptableModelArg);
}
//@ chunk-y162pn60.js:20991-21044 placement
/**
 * 取会话来源的附加目录。
 */
function sessionAddDirs(dirs) {
  return getDirsFromSources(dirs, ["session"]).filter(isAcceptableModelArg);
}
//@ chunk-y162pn60.js:21044-21087 placement
var CLAUDE_RELAUNCH_SESSION_ADD_DIRS = "CLAUDE_RELAUNCH_SESSION_ADD_DIRS";
//@ chunk-y162pn60.js:21087-21150 placement
/**
 * 把会话附加目录写进重启环境变量。
 */
function sessionAddDirsEnv(additionalWorkingDirectories) {
  let addDirs = sessionAddDirs(additionalWorkingDirectories);
  return addDirs.length > 0
    ? {
        [CLAUDE_RELAUNCH_SESSION_ADD_DIRS]: jsonStringify(addDirs),
      }
    : {};
}
//@ chunk-y162pn60.js:21150-21307 placement
/**
 * 从参数中去掉 --channels 及其值。
 */
function stripChannelsArgs(args) {
  let kept = [];
  for (let j = 0; j < args.length; j++) {
    let arg = args[j];
    if (arg === "--channels") {
      j++;
      continue;
    }
    if (arg.startsWith("--channels=")) continue;
    kept.push(arg);
  }
  return kept;
}
export {
  earlyArgsArgv,
  getRelaunchModel,
  sessionAddDirs,
  isCarriableRule,
  replaceAddDirArgs,
  stripChannelsArgs,
  flagArgs,
  onOffFlagValue,
  buildRelaunchArgs,
  buildPermissionAndAgentArgs,
  sessionAddDirsEnv,
  listUncarriedLaunchSettings,
  isRestrictedLaunch,
  CLAUDE_RELAUNCH_SESSION_ADD_DIRS,
};
