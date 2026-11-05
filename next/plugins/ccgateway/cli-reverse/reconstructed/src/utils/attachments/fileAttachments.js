/**
 * utils/attachments/fileAttachments.ts
 *
 * 2.1.316 新增：文件附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 13
 */
import { sep, dirname, join, relative } from "path";
import { getRepoRootForWorktreePath } from "../permissions/protectedDirs.js";
import { getClaudeWorktreesDir } from "../worktreeIsolation.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { SessionRootSlot, isNoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import {
  isUntrustedUncPath,
  hasReadDenyRuleForPath,
  matchingDenyRuleForDirectoryContents,
} from "../permissions/filesystem.js";
import { expandPath } from "../path.js";
import { isNetworkOrDevicePath } from "../../plugins/functionHooks/ui/imageSource.js";
import { vetPathSpellingsOrChain } from "../permissions/pathVetting.js";
import { logEvent } from "../../services/analytics/index.js";
import { isRestrictedReadBlocked } from "../claudeInChrome/fileUpload.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3333728-3333797 placement
/**
 * 判断路径是否等于或在给定目录内。
 */
function isPathWithinOrEqual(path, basePath) {
  return path === basePath || path.startsWith(basePath.endsWith(sep) ? basePath : basePath + sep);
}
//@ chunk-5xgkngpb.js:3333797-3333965 placement
/**
 * 从路径向上查找它所在的 Claude worktree 及其对应的检出目录。
 */
function findWorktreeForPath(targetDir, originalCwd) {
  let worktree = null;
  for (let dir = targetDir; dir !== originalCwd && dir !== dirname(dir); dir = dirname(dir)) {
    let repoRootForWorktreePath = getRepoRootForWorktreePath(dir);
    if (
      repoRootForWorktreePath !== null &&
      (isPathWithinOrEqual(repoRootForWorktreePath, originalCwd) ||
        (isPathWithinOrEqual(originalCwd, repoRootForWorktreePath) &&
          !isPathWithinOrEqual(originalCwd, getClaudeWorktreesDir(repoRootForWorktreePath))))
    )
      worktree = {
        worktreeRoot: dir,
        checkout: repoRootForWorktreePath,
      };
  }
  return worktree;
}
//@ chunk-5xgkngpb.js:3333965-3334061 placement
/**
 * 把检出目录下的路径映射到对应 worktree 下的同一相对路径。
 */
function mapCheckoutPathIntoWorktree(path, worktree) {
  return worktree !== null && isPathWithinOrEqual(path, worktree.worktreeRoot)
    ? join(worktree.checkout, relative(worktree.worktreeRoot, path))
    : path;
}
//@ chunk-5xgkngpb.js:3334061-3334169 placement
/**
 * 把检出目录下的路径映射到对应 worktree 下的同一相对路径。
 */
function mapPathIntoWorktree(path, worktreeMapping) {
  return worktreeMapping !== null &&
    path !== worktreeMapping.checkout &&
    isPathWithinOrEqual(path, worktreeMapping.checkout)
    ? join(worktreeMapping.worktreeRoot, relative(worktreeMapping.checkout, path))
    : path;
}
//@ chunk-5xgkngpb.js:3334169-3334198 placement
/**
 * 附件路径的最大字符数（4000）。
 */
var MAX_ATTACHMENT_PATH_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet_6;
deferInit("chunk-5xgkngpb.js:3334169", () => {
  MAX_ATTACHMENT_PATH_CHARS = 4000;
  weakSet_6 = new WeakSet();
});
//@ chunk-5xgkngpb.js:3334198-3334223 placement
/**
 * 记录已记过日志的附件路径集合。
 */
class AttachmentLogState {
  logged = new Set();
}
//@ chunk-5xgkngpb.js:3334223-3334250 placement
/**
 * 按宿主隔离的附件日志状态。
 */
var attachmentLogStateByHost; // deferred: uses AttachmentLogState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3334223", () => {
  attachmentLogStateByHost = new HostScoped(() => new AttachmentLogState());
});
//@ chunk-5xgkngpb.js:3334250-3334296 placement
/**
 * 取出已记过日志的附件路径集合。
 */
function loggedAttachmentPaths() {
  return attachmentLogStateByHost.of(getRootSession().host).logged;
}
//@ chunk-5xgkngpb.js:3469007-3469044 placement
/**
 * 记录不可信网络路径被阻止事件的上限（1000）。
 */
var MAX_LOGGED_UNC_BLOCKED; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var uncBlockedLoggedByRoot;
deferInit("chunk-5xgkngpb.js:3469007", () => {
  MAX_LOGGED_UNC_BLOCKED = 1000;
  uncBlockedLoggedByRoot = new SessionRootSlot(() => new Set());
});
//@ chunk-5xgkngpb.js:3469044-3469323 placement
/**
 * 判断附件文件读取是否被阻止：不可信网络路径返回 network，命中读取拒绝规则返回 denied。
 */
function getAttachmentReadBlockReason(path, permissionContext, caller) {
  let trustedNetworkDirectories = permissionContext.trustedNetworkDirectories;
  if (isUntrustedUncPath(path, trustedNetworkDirectories)) return "network";
  let expandedPath = expandPath(path);
  if (caller === "person")
    return isAttachmentReadDeniedOrThrown(expandedPath, permissionContext) ? "denied" : undefined;
  if (isNetworkOrDevicePath(path) || isNetworkOrDevicePath(expandedPath)) return "network";
  let vetResult = vetPathSpellingsOrChain(path, expandedPath, trustedNetworkDirectories);
  if (!vetResult.ok) return "network";
  return [expandedPath, ...vetResult.pathsToCheck].some((candidatePath) =>
    isAttachmentReadDeniedOrThrown(candidatePath, permissionContext),
  )
    ? "denied"
    : undefined;
}
//@ chunk-5xgkngpb.js:3469323-3469397 placement
/**
 * 判断附件是否因读拒绝而被阻止（判断异常且属预期错误时也视为拒绝）。
 */
function isAttachmentReadDeniedOrThrown(path, permissionContext) {
  try {
    return isAttachmentReadDenied(path, permissionContext);
  } catch (error) {
    if (isNoProjectDirectoryError(error)) return true;
    throw error;
  }
}
//@ chunk-5xgkngpb.js:3469397-3469631 placement
function isAttachmentReadDenied(path, permissionContext) {
  if (isUntrustedUncPath(path, permissionContext.trustedNetworkDirectories)) {
    let loggedPaths = uncBlockedLoggedByRoot.of(getRootSession());
    if (!loggedPaths.has(path) && loggedPaths.size < MAX_LOGGED_UNC_BLOCKED) {
      loggedPaths.add(path);
      logEvent("tengu_attachment_unc_read_blocked", {});
    }
    return true;
  }
  if (hasReadDenyRuleForPath(path, permissionContext, [path])) return true;
  if (isRestrictedReadBlocked(path, permissionContext)) return true;
  return matchingDenyRuleForDirectoryContents(path, permissionContext, "read") !== null;
}
//@ chunk-5xgkngpb.js:3469631-3469721 placement
/**
 * 把某文件的读取记录标记为“内容不在模型上下文中”。
 */
function markContentNotInModelContext(readFileState, path) {
  let state = readFileState.get(path);
  if (!state) return;
  readFileState.set(path, {
    ...state,
    contentNotInModelContext: true,
  });
}
export {
  isAttachmentReadDeniedOrThrown,
  isPathWithinOrEqual,
  findWorktreeForPath,
  mapCheckoutPathIntoWorktree,
  mapPathIntoWorktree,
  getAttachmentReadBlockReason,
  markContentNotInModelContext,
  weakSet_6,
  loggedAttachmentPaths,
  MAX_ATTACHMENT_PATH_CHARS,
};
