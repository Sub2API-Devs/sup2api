/**
 * services/remoteTools/servingGates.ts
 *
 * 2.1.316 新增（门面模块 remoteToolServingOffReason）。远程工具服务开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e2fknt7w.js (40)
 * attribution: placement 40
 */
import { lstatSync, realpathSync } from "fs";
import { join, join as join_2, posix } from "path";
import { homedir, homedir as homedir_2 } from "os";
import {
  isViolinWoodEnabled,
  isViolinWoodEnabledCached,
  isViolinWoodServedOff,
} from "../analytics/violinGates.js";
import { Z2 } from "../../bridge/deviceRegistration.js";
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
import { uniq } from "../../utils/collections.js";
import { withPathAliases, getClaudeConfigDirs } from "../../utils/permissions/claudeStatePaths.js";

//@ chunk-e2fknt7w.js:15205-15249 placement
async function isRemoteToolForwardingEnabled() {
  return isRemoteToolForwardingSwitchOn() && (await isViolinWoodEnabled());
}
//@ chunk-e2fknt7w.js:15249-15281 placement
function isRemoteToolForwardingEnabledCached() {
  return isRemoteToolForwardingSwitchOn() && isViolinWoodEnabledCached();
}
//@ chunk-e2fknt7w.js:15281-15307 placement
function isRemoteToolForwardingSwitchOn() {
  return Z2();
}
//@ chunk-e2fknt7w.js:15307-15339 placement
var TENGU_VIOLIN_TAILPIECE = "tengu_violin_tailpiece";
//@ chunk-e2fknt7w.js:15339-15407 placement
function isForwardingOffNoticeOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_TAILPIECE, !0) !== !1;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e2fknt7w.js:15407-15470 placement
function isCloudSessionProcess() {
  return Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID);
}
//@ chunk-e2fknt7w.js:15470-15584 placement
function forwardingOffReasonNow() {
  if (!isCloudSessionProcess()) return;
  if (!isRemoteToolForwardingSwitchOn()) return "disabled_switch_off";
  return isViolinWoodServedOff() ? "disabled_flag_off" : "not_ready";
}
//@ chunk-e2fknt7w.js:15584-15608 placement
function remoteToolVmRequired() {
  return !1;
}
//@ chunk-e2fknt7w.js:15608-15678 placement
function isSessionChannelDisabled() {
  return antEnv.CLAUDE_CODE_REMOTE_TOOLS_SESSION_CHANNEL === !1;
}
//@ chunk-e2fknt7w.js:15678-15804 placement
function servedCallRequestsJumpQueueOn() {
  try {
    return (
      antEnv.CLAUDE_CODE_REMOTE_TOOLS_JUMP_QUEUE ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_rain", !1) === !0
    );
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e2fknt7w.js:15804-15840 placement
function isRemoteToolServingSwitchOn() {
  return remoteToolServingOffReason() === void 0;
}
//@ chunk-e2fknt7w.js:15840-15874 placement
function isRemoteToolServingOnForSettings() {
  return isViolinWoodEnabledCached() && isRemoteToolServingSwitchOn();
}
//@ chunk-e2fknt7w.js:15874-15922 placement
function isPersonFixableOffReason(e) {
  return e === "launched_from_home";
}
//@ chunk-e2fknt7w.js:15922-16035 placement
var TENGU_VIOLIN_MUTE = "tengu_violin_mute",
  SERVING_MUTED_NOTICE_KEY = "served-tools-muted",
  SERVING_UNMUTED_NOTICE_KEY = "served-tools-unmuted",
  TENGU_VIOLIN_PLAN_CLASSIFIER = "tengu_violin_plan_classifier";
//@ chunk-e2fknt7w.js:16035-16091 placement
function isPlanClassifierArmOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_PLAN_CLASSIFIER, !0) !== !1;
  } catch {
    return !1;
  }
}
//@ chunk-e2fknt7w.js:16091-16124 placement
var TENGU_UNIFIED_WATERFALL = "tengu_unified_waterfall";
//@ chunk-e2fknt7w.js:16124-16259 placement
function areAskSeatsOn() {
  let CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS = antEnv.CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS;
  if (CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS !== void 0) return CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS;
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_UNIFIED_WATERFALL, !0) !== !1;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e2fknt7w.js:16259-16289 placement
var TENGU_EVENTUAL_HAVEN = "tengu_eventual_haven";
//@ chunk-e2fknt7w.js:16289-16357 placement
function isAttachAnnounceWaitOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_EVENTUAL_HAVEN, !0) !== !1;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e2fknt7w.js:16357-16387 placement
var TENGU_VIOLIN_BASSBAR = "tengu_violin_bassbar";
//@ chunk-e2fknt7w.js:16387-16455 placement
function isLinkPreparationOverlapOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_BASSBAR, !0) !== !1;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e2fknt7w.js:16455-16500 placement
var TENGU_VIOLIN_SPECULATIVE_CLASSIFIER = "tengu_violin_speculative_classifier";
//@ chunk-e2fknt7w.js:16500-16638 placement
function isSpeculativeClassifierOn(e) {
  try {
    if (!(
      antEnv.CLAUDE_CODE_REMOTE_TOOLS_SPECULATIVE_CLASSIFIER ??
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_SPECULATIVE_CLASSIFIER, !1) === !0
    ))
      return !1;
    return !1;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e2fknt7w.js:16638-16694 placement
function isRemoteToolServingMuted() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_MUTE, !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-e2fknt7w.js:16694-16708 placement
var gn = 300000;
//@ chunk-e2fknt7w.js:16708-16749 placement
function wn(e) {
  try {
    e();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e2fknt7w.js:16749-16880 placement
function onServingMuteRecheck(e) {
  let n = onGrowthBookRefresh(e),
    o = setInterval(wn, Math.round(gn * (0.8 + Math.random() * 0.4)), e);
  return (
    o.unref(),
    () => {
      (clearInterval(o), n());
    }
  );
}
//@ chunk-e2fknt7w.js:16880-17194 placement
function remoteToolServingOffReason(e = getOriginalCwd(), n = {}) {
  if (getPlatform() === "windows") return "windows";
  if (!n.ignoringMute && isRemoteToolServingMuted()) return "muted";
  if (!Rn()) return "switch_off";
  let o = isWslMountInfoUnreadable();
  if (launchedFromHome(e)) return "launched_from_home";
  if (o || isWslMountInfoUnreadable()) return "mount_table_unreadable";
  if (windowsProfileDirsUnread()) return "profile_dirs_unread";
  if (windowsProfileDirsReadFailure() !== void 0) return "profile_dirs_unreadable";
  return;
}
//@ chunk-e2fknt7w.js:17194-17278 placement
function adoptMcpOverChannelSwitchOn() {
  let CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP = antEnv.CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP;
  return CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP === void 0 || isEnvTruthy(CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP);
}
//@ chunk-e2fknt7w.js:17278-17357 placement
function Rn() {
  let CLAUDE_CODE_REMOTE_TOOLS_SERVE = antEnv.CLAUDE_CODE_REMOTE_TOOLS_SERVE;
  return CLAUDE_CODE_REMOTE_TOOLS_SERVE === void 0 || isEnvTruthy(CLAUDE_CODE_REMOTE_TOOLS_SERVE);
}
//@ chunk-e2fknt7w.js:17357-17396 placement
function launchedFromHome(e = getOriginalCwd()) {
  return classifyMountForServing(e, "all");
}
//@ chunk-e2fknt7w.js:17396-17469 placement
function refusedOnlyAsProfileOnMountWithoutDrive(e = getOriginalCwd()) {
  return (
    getPlatform() === "wsl" && classifyMountForServing(e, "all") && !classifyMountForServing(e, "drives_only")
  );
}
/**
 * 计算远程工具服务目录的基础路径集合（目录本身、规范化路径、所在 git 根与规范 git 根）；.git 是符号链接或 Windows 上落在远程 UNC 主机时直接拒绝。
 */
//@ chunk-e2fknt7w.js:17469-17843 placement
function servingBasesFor(dir) {
  let n = b(dir),
    o = dir === n ? [dir] : [dir, n],
    filtered = o.map((a) => findGitRootUncached(a)).filter((a) => a !== null);
  if (
    filtered.some((a) => {
      try {
        return lstatSync(join(a, ".git")).isSymbolicLink();
      } catch {
        return !1;
      }
    })
  )
    return "refused_outright";
  let filtered_2 = filtered.flatMap((a) => [a, findCanonicalGitRootUncached(a)]).filter((a) => a !== null),
    mapped = filtered_2.map((a) => b(a)),
    d = [...filtered_2, ...mapped];
  if (
    getPlatform() === "windows" &&
    [n, ...mapped].some((a) => isRemoteUncHost(normalizeCommandForPlatform(a)))
  )
    return "refused_outright";
  return uniq([...o, ...d]);
}
//@ chunk-e2fknt7w.js:17843-18105 placement
function wslServingFacts(e) {
  let n = getPlatform() === "wsl" ? servingBasesFor(e) : void 0;
  if (n === void 0 || n === "refused_outright") return;
  return {
    bases: n.map((o) => posix.normalize(o)),
    mountPoints: [
      ...[...n, ...withPathAliases(getClaudeConfigDirs())].flatMap((o) => pathWithMountAliases(o).slice(1)),
      ...profileMountPointsUnder([homedir(), b(homedir())], "all"),
      ...windowsRootMountPoints("all").map(({ mountPoint: mountPoint }) => mountPoint),
    ],
  };
}
//@ chunk-e2fknt7w.js:18105-18250 placement
function launchTouchesWindowsVolumeMountedTwice(e = getOriginalCwd()) {
  let n = wslServingFacts(e);
  return (
    n !== void 0 &&
    (n.bases.some((base) => listWslDrvfsMounts(base, "except_two_drive_mounts")) ||
      n.mountPoints.some((mountPoint) => listWslDrvfsMounts(mountPoint, "all")))
  );
}
//@ chunk-e2fknt7w.js:18250-18342 placement
function launchTouchesWindowsVolumeBesideUnreadMount(e = getOriginalCwd()) {
  let n = wslServingFacts(e);
  return n !== void 0 && [...n.bases, ...n.mountPoints].some(touchesVolumeBesideUnreadMount);
}
//@ chunk-e2fknt7w.js:21869-21918 placement
function realpathOrSpelling(e) {
  try {
    return realpathSync(e);
  } catch {
    return e;
  }
}
//@ chunk-e2fknt7w.js:21918-22010 placement
function b(e) {
  if (getPlatform() !== "windows") return realpathOrSpelling(e);
  try {
    return realpathSync.native(e);
  } catch {
    return realpathOrSpelling(e);
  }
}
//@ chunk-e2fknt7w.js:22010-22117 placement
function remoteToolServingPolicyName() {
  let CLAUDE_CODE_REMOTE_TOOLS_POLICY = antEnv.CLAUDE_CODE_REMOTE_TOOLS_POLICY;
  return CLAUDE_CODE_REMOTE_TOOLS_POLICY === void 0 || CLAUDE_CODE_REMOTE_TOOLS_POLICY === "parity"
    ? "parity"
    : "interim";
}
//@ chunk-e2fknt7w.js:22117-22187 placement
function callerSessionsLimit() {
  return antEnv.CLAUDE_CODE_REMOTE_TOOLS_CALLER_SESSIONS_MAX;
}

export {
  remoteToolServingOffReason,
  isPersonFixableOffReason,
  SERVING_MUTED_NOTICE_KEY,
  remoteToolVmRequired,
  SERVING_UNMUTED_NOTICE_KEY,
  onServingMuteRecheck,
  isSessionChannelDisabled,
  isRemoteToolForwardingSwitchOn,
  isRemoteToolForwardingEnabled,
  isRemoteToolForwardingEnabledCached,
  isRemoteToolServingSwitchOn,
  isRemoteToolServingMuted,
  isRemoteToolServingOnForSettings,
  callerSessionsLimit,
  remoteToolServingPolicyName,
  isCloudSessionProcess,
  isForwardingOffNoticeOn,
  forwardingOffReasonNow,
  areAskSeatsOn,
  isSpeculativeClassifierOn,
  isPlanClassifierArmOn,
  servingBasesFor,
  b,
  isAttachAnnounceWaitOn,
  launchedFromHome,
  isLinkPreparationOverlapOn,
  refusedOnlyAsProfileOnMountWithoutDrive,
  launchTouchesWindowsVolumeMountedTwice,
  launchTouchesWindowsVolumeBesideUnreadMount,
  realpathOrSpelling,
  servedCallRequestsJumpQueueOn,
};
