/**
 * utils/remoteEnvironment.ts
 *
 * 2.1.316 新增：远程环境判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4vzb3taj.js (16)
 * attribution: placement 16
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

//@ chunk-4vzb3taj.js:458-672 placement
/**
 * Windows 映射盘路径与其网络共享路径（同一共享时）。
 */
function mappedDriveSpellings(e) {
  if (!/^[A-Za-z]:[\\/]/.test(e)) return [];
  let r = nativeRealpathLong(e.slice(0, 3));
  if (r == null || !isUncOrDevicePath(r)) return [];
  let n = nativeRealpathLong(e);
  if (n == null || !isUncOrDevicePath(n)) return [];
  let t = uncHostOf(r);
  let o = uncHostOf(n);
  if (t == null || o == null || t !== o) return [];
  return [e, n];
}
//@ chunk-4vzb3taj.js:672-760 placement
/**
 * isRemoteManagedEnvironment：远程且未指定环境类型。
 */
function isRemoteManagedEnvironment() {
  return env.CLAUDE_CODE_REMOTE === true && env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined;
}
//@ chunk-4vzb3taj.js:760-791 placement
/**
 * isRemoteOrFalse：远程环境（含兼容占位）。
 */
function isRemoteOrFalse() {
  return isRemoteManagedEnvironment() || false;
}
//@ chunk-4vzb3taj.js:791-879 placement
/**
 * isByocEnvironment：远程且环境类型为 byoc。
 */
function isByocEnvironment() {
  return env.CLAUDE_CODE_REMOTE === true && env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc";
}
//@ chunk-4vzb3taj.js:879-911 placement
/**
 * isRemoteEnvironmentAny：远程托管或 byoc。
 */
function isRemoteEnvironmentAny() {
  return isRemoteManagedEnvironment() || isByocEnvironment();
}
//@ chunk-4vzb3taj.js:911-993 placement
function isSelfHostedRemoteEnvironment() {
  return isByocEnvironment() && env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted";
}
//@ chunk-4vzb3taj.js:1052-1219 placement
/**
 * 远程会话工作目录同步是否接纳（not_admitted/admitted/moved_directory）。
 */
function workingSyncAdmission(e, cwd) {
  return !(
    e &&
    isSelfHostedRemoteEnvironment() &&
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
    !env.CLAUDE_CODE_DISABLE_WORKING_SYNC
  )
    ? "not_admitted"
    : cwd === INITIAL_CWD_KEY
      ? "admitted"
      : "moved_directory";
}
//@ chunk-4vzb3taj.js:1219-1253 placement
/**
 * hasRunnerDeclaredNestedRepoDiff：byoc 且有嵌套仓库 diff。
 */
function hasRunnerDeclaredNestedRepoDiff() {
  return isByocEnvironment() && getRunnerDeclaredNestedRepositoryDiff();
}
//@ chunk-4vzb3taj.js:1253-1279 placement
/**
 * initialCwdKey：初始 cwd 的存储键。
 */
function initialCwdKey() {
  return INITIAL_CWD_KEY;
}
//@ chunk-4vzb3taj.js:1279-1320 placement
var sharedPathCache = identity(new Map(), (e) => e.clear());
var sharedPathCacheTtlMs = 60000;
//@ chunk-4vzb3taj.js:1320-1493 placement
/**
 * 缓存把映射盘路径解析为网络共享路径。
 */
function resolveNetworkShareCached(e) {
  let r = sharedPathCache.get(e);
  if (r !== undefined && (r.share !== undefined || Date.now() - r.askedAt < sharedPathCacheTtlMs))
    return r.share ?? e;
  let n = mappedDriveSpellings(e)[1];
  sharedPathCache.set(e, {
    share: n,
    askedAt: Date.now(),
  });
  return n ?? e;
}
//@ chunk-4vzb3taj.js:1493-1541 placement
/**
 * isLocalAbsolutePath：绝对路径且不在外部挂载。
 */
function isLocalAbsolutePath(e, r) {
  return isAbsolute(e) && !hasBackslash(e) && !isOnForeignMount(e, r);
}
//@ chunk-4vzb3taj.js:1541-1575 placement
/**
 * runnerDeclaredNoRepo：byoc 且未检出仓库。
 */
function runnerDeclaredNoRepo() {
  return isByocEnvironment() && getRunnerDeclaredNoRepositoryCheckedOut();
}
//@ chunk-4vzb3taj.js:1575-1638 placement
/**
 * isBridgeEnvironment：环境类型为 bridge。
 */
function isBridgeEnvironment() {
  return env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge";
}
//@ chunk-4vzb3taj.js:1638-1672 placement
/**
 * isTopLevelBridgeSession：bridge 环境且非子会话。
 */
function isTopLevelBridgeSession() {
  return isBridgeEnvironment() && !isChildSession();
}
//@ chunk-4vzb3taj.js:1672-1742 placement
/**
 * persistsTransport：托管 worker 或 bridge 下传输持久。
 */
function persistsTransport(e) {
  return e.hostedWorker || (isBridgeEnvironment() && e.transportPersists !== false);
}
export {
  isRemoteManagedEnvironment,
  isBridgeEnvironment,
  isRemoteEnvironmentAny,
  isByocEnvironment,
  hasRunnerDeclaredNestedRepoDiff,
  workingSyncAdmission,
  runnerDeclaredNoRepo,
  initialCwdKey,
  resolveNetworkShareCached,
  isLocalAbsolutePath,
  mappedDriveSpellings,
  isSelfHostedRemoteEnvironment,
  persistsTransport,
  isTopLevelBridgeSession,
  isRemoteOrFalse,
};
