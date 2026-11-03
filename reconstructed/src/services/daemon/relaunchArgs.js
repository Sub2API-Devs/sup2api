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
import { Xse } from "./processLiveness.js";
import { pve } from "../../utils/model/modelIds.js";
import { effortLevelValue } from "../../utils/effort.js";
import { eagerParseCliFlag } from "../../utils/cliArgs.js";
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION } from "../../utils/sessionConfigFlags.js";
import { ai } from "../../utils/networkPaths.js";
import { earlyArgsToArgv, parseEarlyArgs } from "../../cli/earlyArgs.js";
import { appliedSettingSourcesFlagValue } from "../../utils/settings/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * 重启时要携带的主模型：无覆盖或 mantle 时不带；null 为 default；已重映射/退役、等于拒绝回退模型或无法在命令行表示的不带。
 */
//@ chunk-y162pn60.js:18205-18391 placement
function getRelaunchModel() {
  let e = getMainLoopModelOverride();
  if (e === void 0 || getAPIProvider() === "mantle") return;
  if (e === null) return "default";
  if (!e) return;
  if (isModelRemappedOrRetired(parseUserSpecifiedModel(e))) return;
  if (getRefusalFallbackModelLatch()?.fallbackModel === e) return;
  if (!Xse(e)) return;
  return e;
}
//@ chunk-y162pn60.js:18391-18464 placement
function Qe(e) {
  let lower = e.trim().toLowerCase();
  return lower === "default" || pve(lower);
}
//@ chunk-y162pn60.js:18464-18516 placement
function y7s() {
  return getReplConfigArgv().includes("--restricted");
}
/**
 * 生成后台会话重启的 CLI 参数：保留原始参数（去掉 --add-dir，必要时过滤 --fallback-model），加上 Chrome、绕过权限、附加目录、模型、effort、快速模式与当前权限模式。
 */
//@ chunk-y162pn60.js:18516-19325 placement
function buildRelaunchArgs(permissionContext, effort, { carryModel: carryModel = !0 } = {}) {
  let addDirs = getDirsFromSources(permissionContext.additionalWorkingDirectories, ["cliArg"]),
    args = [],
    replArgv = getReplConfigArgv();
  for (let O = 0; O < replArgv.length; O++) {
    let P = replArgv[O];
    if (P === "--add-dir") O++;
    else if (!carryModel && P === "--fallback-model") {
      let filtered = (replArgv[O + 1] ?? "")
        .split(",")
        .map((D) => D.trim())
        .filter((D) => Qe(D));
      if ((O++, filtered.length > 0)) args.push("--fallback-model", filtered.join(","));
    } else if (P !== void 0) args.push(P);
  }
  let effortValue = effortLevelValue(effort),
    fastMode = getFastModeFlag(),
    model = getRelaunchModel(),
    carriedModel = model !== void 0 && (carryModel || Qe(model)) ? model : void 0,
    allowBypass =
      permissionContext.isBypassPermissionsModeAvailable &&
      !args.includes("--allow-dangerously-skip-permissions"),
    memoryLaunchMode = getAccountMemoryLaunchMode(),
    chromeFlag = getChromeFlagOverride();
  return [
    ...[],
    ...[],
    ...[],
    ...args,
    ...(chromeFlag === void 0 ? [] : [chromeFlag ? "--chrome" : "--no-chrome"]),
    ...(allowBypass ? ["--allow-dangerously-skip-permissions"] : []),
    ...addDirs.flatMap((O) => ["--add-dir", O]),
    ...(carriedModel !== void 0 ? ["--model", carriedModel] : []),
    ...(effortValue !== void 0 ? ["--effort", effortValue] : []),
    ...(fastMode !== void 0 ? ["--fast-mode", fastMode] : []),
    "--permission-mode",
    permissionContext.mode,
  ];
}
//@ chunk-y162pn60.js:19325-19457 placement
function getFastModeFlag() {
  let e = eagerParseCliFlag("--fast-mode");
  if (e !== "on" && e !== "off") return;
  let n = getFlagSettingsInline()?.fastMode;
  return typeof n === "boolean" ? (n ? "on" : "off") : e;
}
//@ chunk-y162pn60.js:19457-19525 placement
function MKo(e) {
  let n = splitRuleList([e]);
  return n.length === 1 && n[0] === e && Xse(e);
}
/**
 * 列出重启时命令行无法完整携带的设置：受限启动标志、仅会话的规则、cliArg 的 ask 规则、无法表示的规则与附加目录。
 */
//@ chunk-y162pn60.js:19525-20095 placement
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
    ].some((r) => !MKo(r))
      ? ["permission rules a command line cannot carry intact"]
      : []),
    ...(getDirsFromSources(permissionContext.additionalWorkingDirectories, ["cliArg"]).some((r) => !Xse(r))
      ? ["added directories a command line cannot carry intact"]
      : []),
  ];
}
/**
 * 把 cliArg 的 allow/deny 规则与 agent、agents、追加系统提示、系统提示快照转为命令行参数。
 */
//@ chunk-y162pn60.js:20095-20432 placement
function buildPermissionAndAgentArgs(e, n) {
  return [
    ...(e.alwaysAllowRules.cliArg ?? []).flatMap((r) => ["--allowed-tools", r]),
    ...(e.alwaysDenyRules.cliArg ?? []).flatMap((r) => ["--disallowed-tools", r]),
    ...xT("--agent", n.agent),
    ...xT("--agents", n.agents),
    ...xT("--append-system-prompt", n.appendSystemPrompt),
    ...xT("--system-prompt-snapshot", syn(n.systemPromptSnapshot)),
  ];
}
//@ chunk-y162pn60.js:20432-20498 placement
function xT(e, n) {
  if (!n) return [];
  return Xse(n) ? [e, n] : [`${e}=${n}`];
}
//@ chunk-y162pn60.js:20498-20552 placement
function syn(e) {
  return e === void 0 ? void 0 : e ? "on" : "off";
}
//@ chunk-y162pn60.js:20552-20675 placement
function getDirsFromSources(e, n) {
  return Array.from(e.values())
    .filter((r) => n.includes(r.source))
    .filter((r) => !ai(r.path))
    .map((r) => r.path);
}
//@ chunk-y162pn60.js:20675-20759 placement
function iyn(e) {
  return earlyArgsToArgv({
    ...parseEarlyArgs(getReplConfigArgv()).config,
    addDir: et(e),
    settingSources: appliedSettingSourcesFlagValue(),
  });
}
//@ chunk-y162pn60.js:20759-20833 placement
function _7s(e, n) {
  return [...stripAddDirArgs(e), ...et(n).flatMap((r) => ["--add-dir", r])];
}
//@ chunk-y162pn60.js:20833-20940 placement
function stripAddDirArgs(e) {
  let n = [],
    r = !1;
  for (let s of e)
    if (r) r = !1;
    else if (s === "--add-dir") r = !0;
    else n.push(s);
  return n;
}
//@ chunk-y162pn60.js:20940-20991 placement
function et(e) {
  return getDirsFromSources(e, ["cliArg"]).filter(Xse);
}
//@ chunk-y162pn60.js:20991-21044 placement
function xZn(e) {
  return getDirsFromSources(e, ["session"]).filter(Xse);
}
//@ chunk-y162pn60.js:21044-21087 placement
var CLAUDE_RELAUNCH_SESSION_ADD_DIRS = "CLAUDE_RELAUNCH_SESSION_ADD_DIRS";
//@ chunk-y162pn60.js:21087-21150 placement
function mvt(e) {
  let n = xZn(e);
  return n.length > 0 ? { [CLAUDE_RELAUNCH_SESSION_ADD_DIRS]: jsonStringify(n) } : {};
}
/**
 * 从参数中去掉 --channels 及其值。
 */
//@ chunk-y162pn60.js:21150-21307 placement
function stripChannelsArgs(e) {
  let n = [];
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (s === "--channels") {
      r++;
      continue;
    }
    if (s.startsWith("--channels=")) continue;
    n.push(s);
  }
  return n;
}

export {
  iyn,
  getRelaunchModel,
  xZn,
  MKo,
  _7s,
  stripChannelsArgs,
  xT,
  syn,
  buildRelaunchArgs,
  buildPermissionAndAgentArgs,
  mvt,
  listUncarriedLaunchSettings,
  y7s,
  CLAUDE_RELAUNCH_SESSION_ADD_DIRS,
};
