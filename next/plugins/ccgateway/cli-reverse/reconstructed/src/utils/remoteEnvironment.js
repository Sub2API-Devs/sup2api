/**
 * utils/remoteEnvironment.ts
 *
 * 2.1.316 新增：远程环境判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wtzc5s1n.js (19)
 * attribution: placement 15, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute } from "path";
import { nativeRealpathLong } from "./windowsUncPaths.js";
import { isUncOrDevicePath, uncHostOf, hasBackslash } from "./pathClassification.js";
import { env } from "./env.js";
import { INITIAL_CWD_KEY } from "./cwd.js";
import {
  getRunnerDeclaredNestedRepositoryDiff,
  getRunnerDeclaredNoRepositoryCheckedOut,
} from "../bootstrap/state.js";
import { identity } from "./identity.js";
import { isOnForeignMount } from "./networkPaths.js";
import { isChildSession } from "./sessionShape.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-wtzc5s1n.js:458-672 placement
/**
 * Windows 映射盘路径与其网络共享路径（同一共享时）。
 */
function mappedDriveSpellings(drivePath) {
  if (!/^[A-Za-z]:[\\/]/.test(drivePath)) return [];
  let driveRootRealPath = nativeRealpathLong(drivePath.slice(0, 3));
  if (driveRootRealPath == null || !isUncOrDevicePath(driveRootRealPath)) return [];
  let fullRealPath = nativeRealpathLong(drivePath);
  if (fullRealPath == null || !isUncOrDevicePath(fullRealPath)) return [];
  let driveRootUncHost = uncHostOf(driveRootRealPath);
  let fullPathUncHost = uncHostOf(fullRealPath);
  if (driveRootUncHost == null || fullPathUncHost == null || driveRootUncHost !== fullPathUncHost) return [];
  return [drivePath, fullRealPath];
}
//@ chunk-wtzc5s1n.js:672-748 layout
function isSelfHostedRemoteEnvironment() {
  return env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted";
}
//@ chunk-wtzc5s1n.js:748-836 placement
/**
 * isRemoteManagedEnvironment：远程且未指定环境类型。
 */
function isRemoteManagedEnvironment() {
  return env.CLAUDE_CODE_REMOTE === true && env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined;
}
//@ chunk-wtzc5s1n.js:836-867 placement
/**
 * isRemoteOrFalse：远程环境（含兼容占位）。
 */
function isRemoteOrFalse() {
  return isRemoteManagedEnvironment() || false;
}
//@ chunk-wtzc5s1n.js:867-955 placement
/**
 * isByocEnvironment：远程且环境类型为 byoc。
 */
function isByocEnvironment() {
  return env.CLAUDE_CODE_REMOTE === true && env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc";
}
//@ chunk-wtzc5s1n.js:955-987 placement
/**
 * isRemoteEnvironmentAny：远程托管或 byoc。
 */
function isRemoteEnvironmentAny() {
  return isRemoteManagedEnvironment() || isByocEnvironment();
}
//@ chunk-wtzc5s1n.js:987-1020 layout
function isSelfHostedByocEnvironment() {
  return isByocEnvironment() && isSelfHostedRemoteEnvironment();
}
//@ chunk-wtzc5s1n.js:1020-1044 layout
function isRemoteEnvPlaceholder() {
  return false;
}
//@ chunk-wtzc5s1n.js:1044-1102 layout
function remoteEnvSystemPromptSections(appendSystemPromptHead) {
  return isSelfHostedByocEnvironment() && appendSystemPromptHead === undefined ? ["memory"] : undefined;
}
//@ chunk-wtzc5s1n.js:1102-1268 placement
/**
 * 远程会话工作目录同步是否接纳（not_admitted/admitted/moved_directory）。
 */
function workingSyncAdmission(gitSwitchEnabled, cwd) {
  return !(
    gitSwitchEnabled &&
    isSelfHostedByocEnvironment() &&
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
    !env.CLAUDE_CODE_DISABLE_WORKING_SYNC
  )
    ? "not_admitted"
    : cwd === INITIAL_CWD_KEY
      ? "admitted"
      : "moved_directory";
}
//@ chunk-wtzc5s1n.js:1268-1302 placement
/**
 * hasRunnerDeclaredNestedRepoDiff：byoc 且有嵌套仓库 diff。
 */
function hasRunnerDeclaredNestedRepoDiff() {
  return isByocEnvironment() && getRunnerDeclaredNestedRepositoryDiff();
}
//@ chunk-wtzc5s1n.js:1302-1328 placement
/**
 * initialCwdKey：初始 cwd 的存储键。
 */
function initialCwdKey() {
  return INITIAL_CWD_KEY;
}
//@ chunk-wtzc5s1n.js:1328-1369 placement
var sharedPathCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var sharedPathCacheTtlMs;
deferInit("chunk-wtzc5s1n.js:1328", () => {
  sharedPathCache = identity(new Map(), (cache) => cache.clear());
  sharedPathCacheTtlMs = 60000;
});
//@ chunk-wtzc5s1n.js:1369-1542 placement
/**
 * 缓存把映射盘路径解析为网络共享路径。
 */
function resolveNetworkShareCached(requestedPath) {
  let cachedEntry = sharedPathCache.get(requestedPath);
  if (
    cachedEntry !== undefined &&
    (cachedEntry.share !== undefined || Date.now() - cachedEntry.askedAt < sharedPathCacheTtlMs)
  )
    return cachedEntry.share ?? requestedPath;
  let sharePath = mappedDriveSpellings(requestedPath)[1];
  sharedPathCache.set(requestedPath, {
    share: sharePath,
    askedAt: Date.now(),
  });
  return sharePath ?? requestedPath;
}
//@ chunk-wtzc5s1n.js:1542-1590 placement
/**
 * isLocalAbsolutePath：绝对路径且不在外部挂载。
 */
function isLocalAbsolutePath(path, referenceDir) {
  return isAbsolute(path) && !hasBackslash(path) && !isOnForeignMount(path, referenceDir);
}
//@ chunk-wtzc5s1n.js:1590-1624 placement
/**
 * runnerDeclaredNoRepo：byoc 且未检出仓库。
 */
function runnerDeclaredNoRepo() {
  return isByocEnvironment() && getRunnerDeclaredNoRepositoryCheckedOut();
}
//@ chunk-wtzc5s1n.js:1624-1687 placement
/**
 * isBridgeEnvironment：环境类型为 bridge。
 */
function isBridgeEnvironment() {
  return env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge";
}
//@ chunk-wtzc5s1n.js:1687-1721 placement
/**
 * isTopLevelBridgeSession：bridge 环境且非子会话。
 */
function isTopLevelBridgeSession() {
  return isBridgeEnvironment() && !isChildSession();
}
//@ chunk-wtzc5s1n.js:1721-1791 placement
/**
 * persistsTransport：托管 worker 或 bridge 下传输持久。
 */
function persistsTransport(session) {
  return session.hostedWorker || (isBridgeEnvironment() && session.transportPersists !== false);
}
export {
  mappedDriveSpellings,
  isByocEnvironment,
  initialCwdKey,
  isLocalAbsolutePath,
  resolveNetworkShareCached,
  hasRunnerDeclaredNestedRepoDiff,
  isBridgeEnvironment,
  isSelfHostedRemoteEnvironment,
  isRemoteManagedEnvironment,
  isRemoteEnvironmentAny,
  workingSyncAdmission,
  isRemoteEnvPlaceholder,
  remoteEnvSystemPromptSections,
  persistsTransport,
  isSelfHostedByocEnvironment,
  isTopLevelBridgeSession,
  isRemoteOrFalse,
  runnerDeclaredNoRepo,
};
