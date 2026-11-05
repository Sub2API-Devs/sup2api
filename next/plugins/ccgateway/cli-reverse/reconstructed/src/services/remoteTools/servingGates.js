/**
 * services/remoteTools/servingGates.ts
 *
 * 2.1.316 新增（门面模块 remoteToolServingOffReason）。远程工具服务开关。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2214fejy.js (40)
 * attribution: placement 40
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstatSync, realpathSync } from "fs";
import { join, posix } from "path";
import { homedir } from "os";
import {
  isViolinWoodEnabled,
  isViolinWoodEnabledCached,
  isViolinWoodServedOff,
} from "../analytics/violinGates.js";
import { isRemoteToolsForwardEnabled } from "../../bridge/deviceRegistration.js";
import { getFeatureValue_CACHED_MAY_BE_STALE, onGrowthBookRefresh } from "../analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { env, antEnv } from "../../utils/env.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getPlatform } from "../../utils/platform.js";
import {
  isWslMountInfoUnreadable,
  pathWithMountAliases,
  listWslDrvfsMounts,
  touchesVolumeBesideUnreadMount,
} from "../../utils/wslMounts.js";
import { windowsProfileDirsUnread, windowsProfileDirsReadFailure } from "./windowsProfileDirs.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import {
  classifyMountForServing,
  isRemoteUncHost,
  profileMountPointsUnder,
  windowsRootMountPoints,
} from "./mountSafety.js";
import {
  findGitRootUncached,
  findCanonicalGitRootUncached,
  normalizeCommandForPlatform,
} from "../../utils/git.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { withPathAliases, getClaudeConfigDirs } from "../../utils/permissions/claudeStatePaths.js";

//@ chunk-2214fejy.js:15206-15251 placement
async function isRemoteToolForwardingEnabled() {
  return isRemoteToolForwardingSwitchOn() && (await isViolinWoodEnabled());
}
//@ chunk-2214fejy.js:15251-15283 placement
function isRemoteToolForwardingEnabledCached() {
  return isRemoteToolForwardingSwitchOn() && isViolinWoodEnabledCached();
}
//@ chunk-2214fejy.js:15283-15310 placement
function isRemoteToolForwardingSwitchOn() {
  return isRemoteToolsForwardEnabled();
}
//@ chunk-2214fejy.js:15310-15342 placement
var TENGU_VIOLIN_TAILPIECE = "tengu_violin_tailpiece";
//@ chunk-2214fejy.js:15342-15410 placement
function isForwardingOffNoticeOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_TAILPIECE, true) !== false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-2214fejy.js:15410-15473 placement
function isCloudSessionProcess() {
  return Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID);
}
//@ chunk-2214fejy.js:15473-15587 placement
function forwardingOffReasonNow() {
  if (!isCloudSessionProcess()) return;
  if (!isRemoteToolForwardingSwitchOn()) return "disabled_switch_off";
  return isViolinWoodServedOff() ? "disabled_flag_off" : "not_ready";
}
//@ chunk-2214fejy.js:15587-15611 placement
function remoteToolVmRequired() {
  return false;
}
//@ chunk-2214fejy.js:15611-15681 placement
function isSessionChannelDisabled() {
  return antEnv.CLAUDE_CODE_REMOTE_TOOLS_SESSION_CHANNEL === false;
}
//@ chunk-2214fejy.js:15681-15807 placement
function servedCallRequestsJumpQueueOn() {
  try {
    return (
      antEnv.CLAUDE_CODE_REMOTE_TOOLS_JUMP_QUEUE ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_rain", false) === true
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-2214fejy.js:15807-15843 placement
function isRemoteToolServingSwitchOn() {
  return remoteToolServingOffReason() === undefined;
}
//@ chunk-2214fejy.js:15843-15877 placement
function isRemoteToolServingOnForSettings() {
  return isViolinWoodEnabledCached() && isRemoteToolServingSwitchOn();
}
//@ chunk-2214fejy.js:15877-15925 placement
function isPersonFixableOffReason(reason) {
  return reason === "launched_from_home";
}
//@ chunk-2214fejy.js:15925-16038 placement
var TENGU_VIOLIN_MUTE = "tengu_violin_mute";
var SERVING_MUTED_NOTICE_KEY = "served-tools-muted";
var SERVING_UNMUTED_NOTICE_KEY = "served-tools-unmuted";
var TENGU_VIOLIN_PLAN_CLASSIFIER = "tengu_violin_plan_classifier";
//@ chunk-2214fejy.js:16038-16094 placement
function isPlanClassifierArmOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_PLAN_CLASSIFIER, true) !== false;
  } catch {
    return false;
  }
}
//@ chunk-2214fejy.js:16094-16127 placement
var TENGU_UNIFIED_WATERFALL = "tengu_unified_waterfall";
//@ chunk-2214fejy.js:16127-16262 placement
function areAskSeatsOn() {
  let CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS = antEnv.CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS;
  if (CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS !== undefined) return CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS;
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_UNIFIED_WATERFALL, true) !== false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-2214fejy.js:16262-16292 placement
var TENGU_EVENTUAL_HAVEN = "tengu_eventual_haven";
//@ chunk-2214fejy.js:16292-16360 placement
function isAttachAnnounceWaitOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_EVENTUAL_HAVEN, true) !== false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-2214fejy.js:16360-16390 placement
var TENGU_VIOLIN_BASSBAR = "tengu_violin_bassbar";
//@ chunk-2214fejy.js:16390-16458 placement
function isLinkPreparationOverlapOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_BASSBAR, true) !== false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-2214fejy.js:16458-16503 placement
var TENGU_VIOLIN_SPECULATIVE_CLASSIFIER = "tengu_violin_speculative_classifier";
//@ chunk-2214fejy.js:16503-16641 placement
function isSpeculativeClassifierOn(name) {
  try {
    if (!(
      antEnv.CLAUDE_CODE_REMOTE_TOOLS_SPECULATIVE_CLASSIFIER ??
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_SPECULATIVE_CLASSIFIER, false) === true
    ))
      return false;
    return false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-2214fejy.js:16641-16697 placement
function isRemoteToolServingMuted() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_MUTE, false) === true;
  } catch {
    return false;
  }
}
//@ chunk-2214fejy.js:16697-16711 placement
var SERVING_MUTE_RECHECK_INTERVAL_MS = 300000;
//@ chunk-2214fejy.js:16711-16752 placement
function logErrorSwallowed(fn) {
  try {
    fn();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-2214fejy.js:16752-16883 placement (2.1.88 match: addJitter, 0.693)
function onServingMuteRecheck(listener) {
  let unsubscribe = onGrowthBookRefresh(listener);
  let interval = setInterval(
    logErrorSwallowed,
    Math.round(SERVING_MUTE_RECHECK_INTERVAL_MS * (0.8 + Math.random() * 0.4)),
    listener,
  );
  interval.unref();
  return () => {
    clearInterval(interval);
    unsubscribe();
  };
}
//@ chunk-2214fejy.js:16883-17197 placement
function remoteToolServingOffReason(cwd = getOriginalCwd(), options = {}) {
  if (getPlatform() === "windows") return "windows";
  if (!options.ignoringMute && isRemoteToolServingMuted()) return "muted";
  if (!isRemoteToolsServingEnvOn()) return "switch_off";
  let mountInfoUnreadable = isWslMountInfoUnreadable();
  if (launchedFromHome(cwd)) return "launched_from_home";
  if (mountInfoUnreadable || isWslMountInfoUnreadable()) return "mount_table_unreadable";
  if (windowsProfileDirsUnread()) return "profile_dirs_unread";
  if (windowsProfileDirsReadFailure() !== undefined) return "profile_dirs_unreadable";
  return;
}
//@ chunk-2214fejy.js:17197-17281 placement
function adoptMcpOverChannelSwitchOn() {
  let CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP = antEnv.CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP;
  return CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP === undefined || isEnvTruthy(CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP);
}
//@ chunk-2214fejy.js:17281-17360 placement
function isRemoteToolsServingEnvOn() {
  let CLAUDE_CODE_REMOTE_TOOLS_SERVE = antEnv.CLAUDE_CODE_REMOTE_TOOLS_SERVE;
  return CLAUDE_CODE_REMOTE_TOOLS_SERVE === undefined || isEnvTruthy(CLAUDE_CODE_REMOTE_TOOLS_SERVE);
}
//@ chunk-2214fejy.js:17360-17399 placement (2.1.88 match: DATE_RANGE_ORDER, 0.538)
function launchedFromHome(cwd = getOriginalCwd()) {
  return classifyMountForServing(cwd, "all");
}
//@ chunk-2214fejy.js:17399-17472 placement
function refusedOnlyAsProfileOnMountWithoutDrive(cwd = getOriginalCwd()) {
  return (
    getPlatform() === "wsl" &&
    classifyMountForServing(cwd, "all") &&
    !classifyMountForServing(cwd, "drives_only")
  );
}
//@ chunk-2214fejy.js:17472-17846 placement
/**
 * 计算远程工具服务目录的基础路径集合（目录本身、规范化路径、所在 git 根与规范 git 根）；.git 是符号链接或 Windows 上落在远程 UNC 主机时直接拒绝。
 */
function servingBasesFor(dir) {
  let realDir = realpathOrSpelling_2(dir);
  let spellings = dir === realDir ? [dir] : [dir, realDir];
  let filtered = spellings
    .map((spelling) => findGitRootUncached(spelling))
    .filter((gitRoot) => gitRoot !== null);
  if (
    filtered.some((root) => {
      try {
        return lstatSync(join(root, ".git")).isSymbolicLink();
      } catch {
        return false;
      }
    })
  )
    return "refused_outright";
  let filtered_2 = filtered
    .flatMap((root) => [root, findCanonicalGitRootUncached(root)])
    .filter((root) => root !== null);
  let mapped = filtered_2.map((root) => realpathOrSpelling_2(root));
  let allRoots = [...filtered_2, ...mapped];
  if (
    getPlatform() === "windows" &&
    [realDir, ...mapped].some((path) => isRemoteUncHost(normalizeCommandForPlatform(path)))
  )
    return "refused_outright";
  return normalizeCaseForComparison_2([...spellings, ...allRoots]);
}
//@ chunk-2214fejy.js:17846-18108 placement
function wslServingFacts(dir) {
  let bases = getPlatform() === "wsl" ? servingBasesFor(dir) : undefined;
  if (bases === undefined || bases === "refused_outright") return;
  return {
    bases: bases.map((base) => posix.normalize(base)),
    mountPoints: [
      ...[...bases, ...withPathAliases(getClaudeConfigDirs())].flatMap((path) =>
        pathWithMountAliases(path).slice(1),
      ),
      ...profileMountPointsUnder([homedir(), realpathOrSpelling_2(homedir())], "all"),
      ...windowsRootMountPoints("all").map(({ mountPoint }) => mountPoint),
    ],
  };
}
//@ chunk-2214fejy.js:18108-18253 placement
function launchTouchesWindowsVolumeMountedTwice(cwd = getOriginalCwd()) {
  let facts = wslServingFacts(cwd);
  return (
    facts !== undefined &&
    (facts.bases.some((base) => listWslDrvfsMounts(base, "except_two_drive_mounts")) ||
      facts.mountPoints.some((mountPoint) => listWslDrvfsMounts(mountPoint, "all")))
  );
}
//@ chunk-2214fejy.js:18253-18345 placement
function launchTouchesWindowsVolumeBesideUnreadMount(cwd = getOriginalCwd()) {
  let facts = wslServingFacts(cwd);
  return facts !== undefined && [...facts.bases, ...facts.mountPoints].some(touchesVolumeBesideUnreadMount);
}
//@ chunk-2214fejy.js:21872-21921 placement
function realpathOrSpelling(path) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}
//@ chunk-2214fejy.js:21921-22013 placement
function realpathOrSpelling_2(path) {
  if (getPlatform() !== "windows") return realpathOrSpelling(path);
  try {
    return realpathSync.native(path);
  } catch {
    return realpathOrSpelling(path);
  }
}
//@ chunk-2214fejy.js:22013-22120 placement
function remoteToolServingPolicyName() {
  let CLAUDE_CODE_REMOTE_TOOLS_POLICY = antEnv.CLAUDE_CODE_REMOTE_TOOLS_POLICY;
  return CLAUDE_CODE_REMOTE_TOOLS_POLICY === undefined || CLAUDE_CODE_REMOTE_TOOLS_POLICY === "parity"
    ? "parity"
    : "interim";
}
//@ chunk-2214fejy.js:22120-22190 placement
function callerSessionsLimit() {
  return antEnv.CLAUDE_CODE_REMOTE_TOOLS_CALLER_SESSIONS_MAX;
}
export {
  isSessionChannelDisabled,
  isRemoteToolForwardingSwitchOn,
  isRemoteToolForwardingEnabled,
  isRemoteToolForwardingEnabledCached,
  servedCallRequestsJumpQueueOn,
  isCloudSessionProcess,
  isForwardingOffNoticeOn,
  forwardingOffReasonNow,
  servingBasesFor,
  realpathOrSpelling_2,
  remoteToolServingOffReason,
  onServingMuteRecheck,
  isRemoteToolServingMuted,
  isPersonFixableOffReason,
  SERVING_MUTED_NOTICE_KEY,
  remoteToolVmRequired,
  SERVING_UNMUTED_NOTICE_KEY,
  isRemoteToolServingSwitchOn,
  isSpeculativeClassifierOn,
  isAttachAnnounceWaitOn,
  realpathOrSpelling,
  launchedFromHome,
  refusedOnlyAsProfileOnMountWithoutDrive,
  launchTouchesWindowsVolumeMountedTwice,
  launchTouchesWindowsVolumeBesideUnreadMount,
  isRemoteToolServingOnForSettings,
  remoteToolServingPolicyName,
  isLinkPreparationOverlapOn,
  callerSessionsLimit,
  areAskSeatsOn,
  isPlanClassifierArmOn,
  adoptMcpOverChannelSwitchOn,
};
