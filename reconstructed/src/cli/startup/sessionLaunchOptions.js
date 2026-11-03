/**
 * cli/startup/sessionLaunchOptions.ts
 *
 * 2.1.316 新增：应用会话启动选项（后台会话权限规则、记录本地回收、工具结果复制模式）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (9)
 * attribution: placement 9
 */
import { resolve, resolve as resolve_2, resolve as resolve_3, resolve as resolve_4 } from "path";
import { env } from "../../utils/env.js";
import { jsonParse } from "../../utils/slowOperations.js";
import {
  setMemoryToggledOff,
  getAdditionalDirectoriesForClaudeMd,
  setAdditionalDirectoriesForClaudeMd,
} from "../../bootstrap/state.js";
import { oWn } from "../../services/selfHostedRunner/runnerToolNames.js";
import { KLs, getAllBaseTools } from "../../tools.js";
import {
  initializeToolPermissionContext,
  antBuiltinDenyRules,
  latchPlanAutoModeAtLaunch,
  stripDangerousPermissionsForAutoMode,
  activatePlanAutoMode,
} from "../../utils/permissions/permissionSetup.js";
import {
  noteRemovalWaiverRules,
  checkBypassPermissionsEnv,
} from "../../utils/permissions/PermissionUpdate.js";
import { holdRemovalWaiverOnAskAdjudicator } from "../../utils/permissions/permissions.js";
import { q5s } from "../../utils/teleport/dirSync.js";
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { Mn } from "../../utils/pathClassification.js";
import { P4n } from "../../utils/announcedDirectories.js";
import { nbn } from "../../utils/startupFlagWait.js";
import { getOrBuildUserContext } from "../../context.js";
import { setTranscriptLocalGcEnabled, setToolResultCopiesOnDisk } from "../../utils/sessionStorage.js";
import { mn } from "../../utils/remoteEnvironment.js";

//@ chunk-3wek6r2k.js:10937-11292 placement
function readBgSessionPermissionRules() {
  let CLAUDE_BG_SESSION_PERMISSION_RULES = env.CLAUDE_BG_SESSION_PERMISSION_RULES;
  if (!CLAUDE_BG_SESSION_PERMISSION_RULES || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  try {
    let parsed = JSON.parse(CLAUDE_BG_SESSION_PERMISSION_RULES);
    if (!Array.isArray(parsed.allow) || !Array.isArray(parsed.deny)) return;
    let n = Array.isArray(parsed.addDirs)
      ? parsed.addDirs.filter((addDir) => typeof addDir === "string")
      : void 0;
    return { allow: parsed.allow, deny: parsed.deny, ...(n !== void 0 && n.length > 0 && { addDirs: n }) };
  } catch {
    return;
  }
}
/**
 * 读取并清掉 CLAUDE_RELAUNCH_SESSION_ADD_DIRS：解析为字符串数组返回（为空或格式不对返回 undefined）。
 */
//@ chunk-3wek6r2k.js:11292-11538 placement
function takeRelaunchAddDirs() {
  let CLAUDE_RELAUNCH_SESSION_ADD_DIRS = env.CLAUDE_RELAUNCH_SESSION_ADD_DIRS;
  if (CLAUDE_RELAUNCH_SESSION_ADD_DIRS === void 0) return;
  env.unset("CLAUDE_RELAUNCH_SESSION_ADD_DIRS");
  try {
    let o = jsonParse(CLAUDE_RELAUNCH_SESSION_ADD_DIRS);
    if (!Array.isArray(o)) return;
    let filtered = o.filter((r) => typeof r === "string");
    return filtered.length > 0 ? filtered : void 0;
  } catch {
    return;
  }
}
/**
 * 应用后台会话（bg）、基础工具、转录 GC、工具结果落盘等启动选项。
 */
//@ chunk-3wek6r2k.js:11538-12913 placement
async function applySessionLaunchOptions(e) {
  if (env.CLAUDE_BG_MEMORY_TOGGLED_OFF === "1" && env.CLAUDE_CODE_SESSION_KIND === "bg")
    setMemoryToggledOff(!0);
  if (e.baseTools && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_SESSION_KIND !== "bg") {
    if (oWn(e.baseTools)) KLs();
  }
  let o = await initializeToolPermissionContext({
      allowedToolsCli: e.allowedTools,
      disallowedToolsCli: e.disallowedTools,
      baseToolsCli: e.baseTools,
      getAllBaseTools: getAllBaseTools,
      restricted: e.restricted,
      permissionMode: e.permissionMode,
      allowDangerouslySkipPermissions: e.allowDangerouslySkipPermissions,
      addDirs: e.addDirs,
      bgSessionPermissionRules: readBgSessionPermissionRules(),
      relaunchSessionAddDirs: takeRelaunchAddDirs(),
      storageV5: e.storageV5,
    }),
    toolPermissionContext = o.toolPermissionContext,
    {
      warnings: warnings,
      securityWarnings: securityWarnings,
      dangerousPermissions: dangerousPermissions,
      overlyBroadBashPermissions: overlyBroadBashPermissions,
      bypassCapabilityNotification: bypassCapabilityNotification,
    } = o;
  (noteRemovalWaiverRules(toolPermissionContext), holdRemovalWaiverOnAskAdjudicator(void 0));
  let y = checkBypassPermissionsEnv(toolPermissionContext);
  if (y !== void 0) securityWarnings.push({ text: y });
  let M = new Set(antBuiltinDenyRules());
  if (
    (q5s(toolPermissionContext, o.inheritedSessionDirectories, {
      disallowedTools: splitRuleList(e.disallowedTools).filter((E) => !M.has(E)),
      tools: e.baseTools ?? [],
    }),
    o.inheritedSessionDirectories.length > 0)
  ) {
    let E = getAdditionalDirectoriesForClaudeMd(),
      w = new Set(E.map((A) => Mn(resolve(A)))),
      filtered = o.inheritedSessionDirectories.filter(
        (inheritedSessionDirectory) => !w.has(Mn(resolve(inheritedSessionDirectory))),
      );
    if (filtered.length > 0) setAdditionalDirectoriesForClaudeMd([...E, ...filtered]);
  }
  if ((latchPlanAutoModeAtLaunch(), e.permissionMode === "auto"))
    toolPermissionContext = stripDangerousPermissionsForAutoMode(toolPermissionContext);
  if (e.permissionMode === "plan") {
    let E = activatePlanAutoMode(toolPermissionContext);
    if (E) toolPermissionContext = { ...E, prePlanMode: "default" };
  }
  return (
    P4n(toolPermissionContext),
    {
      toolPermissionContext: toolPermissionContext,
      warnings: warnings,
      securityWarnings: securityWarnings,
      dangerousPermissions: dangerousPermissions,
      overlyBroadBashPermissions: overlyBroadBashPermissions,
      ...(bypassCapabilityNotification !== void 0 && {
        bypassCapabilityNotification: bypassCapabilityNotification,
      }),
    }
  );
}
//@ chunk-3wek6r2k.js:12913-12945 placement
function shouldPrefetchUserContext(e) {
  return e && nbn();
}
//@ chunk-3wek6r2k.js:12945-13001 placement
function prefetchUserContext(e, o, n, r) {
  if (shouldPrefetchUserContext(o)) getOrBuildUserContext(e, n, r).catch(() => {});
}
//@ chunk-3wek6r2k.js:13001-13131 placement
function enableTranscriptLocalGc({ sdkUrl: sdkUrl, isNonInteractiveSession: isNonInteractiveSession }) {
  if (
    isNonInteractiveSession &&
    !sdkUrl &&
    !env.CLAUDE_CODE_REMOTE &&
    env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC === !0
  )
    setTranscriptLocalGcEnabled(!0);
}
//@ chunk-3wek6r2k.js:13131-13260 placement
function setToolResultCopyMode({ sdkUrl: sdkUrl, isNonInteractiveSession: isNonInteractiveSession }) {
  if (isNonInteractiveSession && sdkUrl && mn())
    setToolResultCopiesOnDisk(env.CLAUDE_CODE_TRANSCRIPT_SLIM_TOOL_RESULTS ? "slim" : "counted");
}
//@ chunk-3wek6r2k.js:13288-13368 placement
function unavailableReason(e) {
  return e.kind === "unavailable" && e.reason !== "mcp" ? e.reason : void 0;
}
//@ chunk-3wek6r2k.js:13368-13428 placement
function cloudUnavailableReason(e, o) {
  return o.explicitCloudLaunch ? void 0 : unavailableReason(e);
}

export {
  unavailableReason,
  shouldPrefetchUserContext,
  prefetchUserContext,
  applySessionLaunchOptions,
  enableTranscriptLocalGc,
  setToolResultCopyMode,
  cloudUnavailableReason,
};
