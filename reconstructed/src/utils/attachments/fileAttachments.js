/**
 * utils/attachments/fileAttachments.ts
 *
 * 2.1.316 新增：文件附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
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

//@ chunk-e6aww6q8.js:3249105-3249174 placement
/**
 * 判断路径是否等于或在给定目录内。
 */
function isPathWithinOrEqual(path, basePath) {
  return path === basePath || path.startsWith(basePath.endsWith(sep) ? basePath : basePath + sep);
}
//@ chunk-e6aww6q8.js:3249174-3249342 placement
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
//@ chunk-e6aww6q8.js:3249342-3249438 placement
/**
 * 把检出目录下的路径映射到对应 worktree 下的同一相对路径。
 */
function mapCheckoutPathIntoWorktree(path, worktree) {
  return worktree !== null && isPathWithinOrEqual(path, worktree.worktreeRoot)
    ? join(worktree.checkout, relative(worktree.worktreeRoot, path))
    : path;
}
//@ chunk-e6aww6q8.js:3249438-3249546 placement
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
//@ chunk-e6aww6q8.js:3249546-3249575 placement
/**
 * 附件路径的最大字符数（4000）。
 */
var MAX_ATTACHMENT_PATH_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet_5;
deferInit("chunk-e6aww6q8.js:3249546", () => {
  MAX_ATTACHMENT_PATH_CHARS = 4000;
  weakSet_5 = new WeakSet();
});
//@ chunk-e6aww6q8.js:3249575-3249600 placement
/**
 * 记录已记过日志的附件路径集合。
 */
class AttachmentLogState {
  logged = new Set();
}
//@ chunk-e6aww6q8.js:3249600-3249627 placement
/**
 * 按宿主隔离的附件日志状态。
 */
var attachmentLogStateByHost; // deferred: uses AttachmentLogState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3249600", () => {
  attachmentLogStateByHost = new HostScoped(() => new AttachmentLogState());
});
//@ chunk-e6aww6q8.js:3249627-3249673 placement
/**
 * 取出已记过日志的附件路径集合。
 */
function loggedAttachmentPaths() {
  return attachmentLogStateByHost.of(getRootSession().host).logged;
}
//@ chunk-e6aww6q8.js:3381159-3381196 placement
/**
 * 记录不可信网络路径被阻止事件的上限（1000）。
 */
var MAX_LOGGED_UNC_BLOCKED; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var uncBlockedLoggedByRoot;
deferInit("chunk-e6aww6q8.js:3381159", () => {
  MAX_LOGGED_UNC_BLOCKED = 1000;
  uncBlockedLoggedByRoot = new SessionRootSlot(() => new Set());
});
//@ chunk-e6aww6q8.js:3381196-3381475 placement
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
//@ chunk-e6aww6q8.js:3381475-3381549 placement
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
//@ chunk-e6aww6q8.js:3381549-3381783 placement
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
//@ chunk-e6aww6q8.js:3381783-3381873 placement
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
  getAttachmentReadBlockReason,
  isPathWithinOrEqual,
  findWorktreeForPath,
  mapCheckoutPathIntoWorktree,
  mapPathIntoWorktree,
  markContentNotInModelContext,
  weakSet_5,
  loggedAttachmentPaths,
  MAX_ATTACHMENT_PATH_CHARS,
};
