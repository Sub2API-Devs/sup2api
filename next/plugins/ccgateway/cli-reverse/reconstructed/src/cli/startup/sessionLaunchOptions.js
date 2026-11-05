/**
 * cli/startup/sessionLaunchOptions.ts
 *
 * 2.1.316 新增：应用会话启动选项（后台会话权限规则、记录本地回收、工具结果复制模式）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (11)
 * attribution: placement 9, layout 2
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
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { setTranscriptLocalGcEnabled, setToolResultCopiesOnDisk } from "../../utils/sessionStorage.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";

//@ chunk-hjswk319.js:11370-11725 placement
function readBgSessionPermissionRules() {
  let CLAUDE_BG_SESSION_PERMISSION_RULES = env.CLAUDE_BG_SESSION_PERMISSION_RULES;
  if (!CLAUDE_BG_SESSION_PERMISSION_RULES || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  try {
    let parsed = JSON.parse(CLAUDE_BG_SESSION_PERMISSION_RULES);
    if (!Array.isArray(parsed.allow) || !Array.isArray(parsed.deny)) return;
    let addDirs = Array.isArray(parsed.addDirs)
      ? parsed.addDirs.filter((addDir) => typeof addDir === "string")
      : undefined;
    return {
      allow: parsed.allow,
      deny: parsed.deny,
      ...(addDirs !== undefined &&
        addDirs.length > 0 && {
          addDirs,
        }),
    };
  } catch {
    return;
  }
}
//@ chunk-hjswk319.js:11725-11971 placement
/**
 * 读取并清掉 CLAUDE_RELAUNCH_SESSION_ADD_DIRS：解析为字符串数组返回（为空或格式不对返回 undefined）。
 */
function takeRelaunchAddDirs() {
  let CLAUDE_RELAUNCH_SESSION_ADD_DIRS = env.CLAUDE_RELAUNCH_SESSION_ADD_DIRS;
  if (CLAUDE_RELAUNCH_SESSION_ADD_DIRS === undefined) return;
  env.unset("CLAUDE_RELAUNCH_SESSION_ADD_DIRS");
  try {
    let parsedDirs = jsonParse(CLAUDE_RELAUNCH_SESSION_ADD_DIRS);
    if (!Array.isArray(parsedDirs)) return;
    let filtered = parsedDirs.filter((dir) => typeof dir === "string");
    return filtered.length > 0 ? filtered : undefined;
  } catch {
    return;
  }
}
//@ chunk-hjswk319.js:11971-13346 placement
/**
 * 应用后台会话（bg）、基础工具、转录 GC、工具结果落盘等启动选项。
 */
async function applySessionLaunchOptions(options) {
  if (env.CLAUDE_BG_MEMORY_TOGGLED_OFF === "1" && env.CLAUDE_CODE_SESSION_KIND === "bg")
    setMemoryToggledOff(true);
  if (options.baseTools && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_SESSION_KIND !== "bg") {
    if (hasRunnerToolSpec(options.baseTools)) enableWizardOperatorTools();
  }
  let toolPermissionContext = await initializeToolPermissionContext({
    allowedToolsCli: options.allowedTools,
    disallowedToolsCli: options.disallowedTools,
    baseToolsCli: options.baseTools,
    getAllBaseTools,
    restricted: options.restricted,
    permissionMode: options.permissionMode,
    allowDangerouslySkipPermissions: options.allowDangerouslySkipPermissions,
    addDirs: options.addDirs,
    bgSessionPermissionRules: readBgSessionPermissionRules(),
    relaunchSessionAddDirs: takeRelaunchAddDirs(),
    storageV5: options.storageV5,
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
  let bypassCheck = checkBypassPermissionsEnv(toolPermissionContext_2);
  if (bypassCheck !== undefined)
    securityWarnings.push({
      text: bypassCheck,
    });
  let builtinDeny = new Set(antBuiltinDenyRules());
  publishLaunchPermissions(toolPermissionContext_2, toolPermissionContext.inheritedSessionDirectories, {
    disallowedTools: splitRuleList(options.disallowedTools).filter((rule) => !builtinDeny.has(rule)),
    tools: options.baseTools ?? [],
  });
  if (toolPermissionContext.inheritedSessionDirectories.length > 0) {
    let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
    let claudeMdDirs = new Set(additionalDirectoriesForClaudeMd.map((dir) => identity(resolve(dir))));
    let filtered = toolPermissionContext.inheritedSessionDirectories.filter(
      (inheritedSessionDirectory) => !claudeMdDirs.has(identity(resolve(inheritedSessionDirectory))),
    );
    if (filtered.length > 0)
      setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, ...filtered]);
  }
  latchPlanAutoModeAtLaunch();
  if (options.permissionMode === "auto")
    toolPermissionContext_2 = stripDangerousPermissionsForAutoMode(toolPermissionContext_2);
  if (options.permissionMode === "plan") {
    let planModeContext = activatePlanAutoMode(toolPermissionContext_2);
    if (planModeContext)
      toolPermissionContext_2 = {
        ...planModeContext,
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
//@ chunk-hjswk319.js:13346-13378 placement
function shouldPrefetchUserContext(options) {
  return options && isRemoteCoworkSession();
}
//@ chunk-hjswk319.js:13378-13434 placement
function prefetchUserContext(options, storageV5, storageV5_2, credentials) {
  if (shouldPrefetchUserContext(storageV5))
    getOrBuildUserContext(options, storageV5_2, credentials).catch(() => {});
}
//@ chunk-hjswk319.js:13434-13486 layout
function shouldSkipHooksForPluginInstall(flag) {
  return flag && getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_sluice", false);
}
//@ chunk-hjswk319.js:13486-13582 layout
function scanCommandsAfterMcpConfig(mcpConfigsPromise, scan) {
  return mcpConfigsPromise
    .catch(() => {})
    .then(() => withFeatureTelemetry("startup_command_scan_after_mcp_config", scan));
}
//@ chunk-hjswk319.js:13582-13712 placement
function enableTranscriptLocalGc({ sdkUrl, isNonInteractiveSession }) {
  if (
    isNonInteractiveSession &&
    !sdkUrl &&
    !env.CLAUDE_CODE_REMOTE &&
    env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC === true
  )
    setTranscriptLocalGcEnabled(true);
}
//@ chunk-hjswk319.js:13712-13841 placement
function setToolResultCopyMode({ sdkUrl, isNonInteractiveSession }) {
  if (isNonInteractiveSession && sdkUrl && isRemoteManagedEnvironment())
    setToolResultCopiesOnDisk(env.CLAUDE_CODE_TRANSCRIPT_SLIM_TOOL_RESULTS ? "slim" : "counted");
}
//@ chunk-hjswk319.js:13869-13949 placement
function unavailableReason(reason) {
  return reason.kind === "unavailable" && reason.reason !== "mcp" ? reason.reason : undefined;
}
//@ chunk-hjswk319.js:13949-14009 placement
function cloudUnavailableReason(caps, options) {
  return options.explicitCloudLaunch ? undefined : unavailableReason(caps);
}
export {
  prefetchUserContext,
  shouldPrefetchUserContext,
  unavailableReason,
  applySessionLaunchOptions,
  enableTranscriptLocalGc,
  setToolResultCopyMode,
  cloudUnavailableReason,
  shouldSkipHooksForPluginInstall,
  scanCommandsAfterMcpConfig,
};
