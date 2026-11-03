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
import { resolve } from "path";
import { env } from "../../utils/env.js";
import { jsonParse } from "../../utils/slowOperations.js";
import {
  setMemoryToggledOff,
  getAdditionalDirectoriesForClaudeMd,
  setAdditionalDirectoriesForClaudeMd,
} from "../../bootstrap/state.js";
import { hasRunnerToolSpec } from "../../services/selfHostedRunner/runnerToolNames.js";
import { enableWizardOperatorTools, getAllBaseTools } from "../../tools.js";
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
import { publishLaunchPermissions } from "../../utils/teleport/dirSync.js";
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { identity } from "../../utils/pathClassification.js";
import { publishAnnouncedDirs } from "../../utils/announcedDirectories.js";
import { isRemoteCoworkSession } from "../../utils/startupFlagWait.js";
import { getOrBuildUserContext } from "../../context.js";
import { setTranscriptLocalGcEnabled, setToolResultCopiesOnDisk } from "../../utils/sessionStorage.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";

//@ chunk-3wek6r2k.js:10937-11292 placement
function readBgSessionPermissionRules() {
  let CLAUDE_BG_SESSION_PERMISSION_RULES = env.CLAUDE_BG_SESSION_PERMISSION_RULES;
  if (!CLAUDE_BG_SESSION_PERMISSION_RULES || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  try {
    let parsed = JSON.parse(CLAUDE_BG_SESSION_PERMISSION_RULES);
    if (!Array.isArray(parsed.allow) || !Array.isArray(parsed.deny)) return;
    let n = Array.isArray(parsed.addDirs)
      ? parsed.addDirs.filter((addDir) => typeof addDir === "string")
      : undefined;
    return {
      allow: parsed.allow,
      deny: parsed.deny,
      ...(n !== undefined &&
        n.length > 0 && {
          addDirs: n,
        }),
    };
  } catch {
    return;
  }
}
//@ chunk-3wek6r2k.js:11292-11538 placement
/**
 * 读取并清掉 CLAUDE_RELAUNCH_SESSION_ADD_DIRS：解析为字符串数组返回（为空或格式不对返回 undefined）。
 */
function takeRelaunchAddDirs() {
  let CLAUDE_RELAUNCH_SESSION_ADD_DIRS = env.CLAUDE_RELAUNCH_SESSION_ADD_DIRS;
  if (CLAUDE_RELAUNCH_SESSION_ADD_DIRS === undefined) return;
  env.unset("CLAUDE_RELAUNCH_SESSION_ADD_DIRS");
  try {
    let o = jsonParse(CLAUDE_RELAUNCH_SESSION_ADD_DIRS);
    if (!Array.isArray(o)) return;
    let filtered = o.filter((r) => typeof r === "string");
    return filtered.length > 0 ? filtered : undefined;
  } catch {
    return;
  }
}
//@ chunk-3wek6r2k.js:11538-12913 placement
/**
 * 应用后台会话（bg）、基础工具、转录 GC、工具结果落盘等启动选项。
 */
async function applySessionLaunchOptions(e) {
  if (env.CLAUDE_BG_MEMORY_TOGGLED_OFF === "1" && env.CLAUDE_CODE_SESSION_KIND === "bg")
    setMemoryToggledOff(true);
  if (e.baseTools && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_SESSION_KIND !== "bg") {
    if (hasRunnerToolSpec(e.baseTools)) enableWizardOperatorTools();
  }
  let toolPermissionContext = await initializeToolPermissionContext({
    allowedToolsCli: e.allowedTools,
    disallowedToolsCli: e.disallowedTools,
    baseToolsCli: e.baseTools,
    getAllBaseTools,
    restricted: e.restricted,
    permissionMode: e.permissionMode,
    allowDangerouslySkipPermissions: e.allowDangerouslySkipPermissions,
    addDirs: e.addDirs,
    bgSessionPermissionRules: readBgSessionPermissionRules(),
    relaunchSessionAddDirs: takeRelaunchAddDirs(),
    storageV5: e.storageV5,
  });
  let toolPermissionContext_2 = toolPermissionContext.toolPermissionContext;
  let {
    warnings,
    securityWarnings,
    dangerousPermissions,
    overlyBroadBashPermissions,
    bypassCapabilityNotification,
  } = toolPermissionContext;
  noteRemovalWaiverRules(toolPermissionContext_2);
  holdRemovalWaiverOnAskAdjudicator(undefined);
  let y = checkBypassPermissionsEnv(toolPermissionContext_2);
  if (y !== undefined)
    securityWarnings.push({
      text: y,
    });
  let M = new Set(antBuiltinDenyRules());
  publishLaunchPermissions(toolPermissionContext_2, toolPermissionContext.inheritedSessionDirectories, {
    disallowedTools: splitRuleList(e.disallowedTools).filter((E) => !M.has(E)),
    tools: e.baseTools ?? [],
  });
  if (toolPermissionContext.inheritedSessionDirectories.length > 0) {
    let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
    let w = new Set(additionalDirectoriesForClaudeMd.map((A) => identity(resolve(A))));
    let filtered = toolPermissionContext.inheritedSessionDirectories.filter(
      (inheritedSessionDirectory) => !w.has(identity(resolve(inheritedSessionDirectory))),
    );
    if (filtered.length > 0)
      setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, ...filtered]);
  }
  latchPlanAutoModeAtLaunch();
  if (e.permissionMode === "auto")
    toolPermissionContext_2 = stripDangerousPermissionsForAutoMode(toolPermissionContext_2);
  if (e.permissionMode === "plan") {
    let E = activatePlanAutoMode(toolPermissionContext_2);
    if (E)
      toolPermissionContext_2 = {
        ...E,
        prePlanMode: "default",
      };
  }
  publishAnnouncedDirs(toolPermissionContext_2);
  return {
    toolPermissionContext: toolPermissionContext_2,
    warnings,
    securityWarnings,
    dangerousPermissions,
    overlyBroadBashPermissions,
    ...(bypassCapabilityNotification !== undefined && {
      bypassCapabilityNotification,
    }),
  };
}
//@ chunk-3wek6r2k.js:12913-12945 placement
function shouldPrefetchUserContext(e) {
  return e && isRemoteCoworkSession();
}
//@ chunk-3wek6r2k.js:12945-13001 placement
function prefetchUserContext(e, o, storageV5, credentials) {
  if (shouldPrefetchUserContext(o)) getOrBuildUserContext(e, storageV5, credentials).catch(() => {});
}
//@ chunk-3wek6r2k.js:13001-13131 placement
function enableTranscriptLocalGc({ sdkUrl, isNonInteractiveSession }) {
  if (
    isNonInteractiveSession &&
    !sdkUrl &&
    !env.CLAUDE_CODE_REMOTE &&
    env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC === true
  )
    setTranscriptLocalGcEnabled(true);
}
//@ chunk-3wek6r2k.js:13131-13260 placement
function setToolResultCopyMode({ sdkUrl, isNonInteractiveSession }) {
  if (isNonInteractiveSession && sdkUrl && isRemoteManagedEnvironment())
    setToolResultCopiesOnDisk(env.CLAUDE_CODE_TRANSCRIPT_SLIM_TOOL_RESULTS ? "slim" : "counted");
}
//@ chunk-3wek6r2k.js:13288-13368 placement
function unavailableReason(e) {
  return e.kind === "unavailable" && e.reason !== "mcp" ? e.reason : undefined;
}
//@ chunk-3wek6r2k.js:13368-13428 placement
function cloudUnavailableReason(e, o) {
  return o.explicitCloudLaunch ? undefined : unavailableReason(e);
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
