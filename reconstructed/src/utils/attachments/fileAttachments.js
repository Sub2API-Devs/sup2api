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

//@ chunk-e6aww6q8.js:3249105-3249174 placement
/**
 * 判断路径是否等于或在给定目录内。
 */
function isPathWithinOrEqual(e, n) {
  return e === n || e.startsWith(n.endsWith(sep) ? n : n + sep);
}
//@ chunk-e6aww6q8.js:3249174-3249342 placement
/**
 * 从路径向上查找它所在的 Claude worktree 及其对应的检出目录。
 */
function findWorktreeForPath(targetDir, originalCwd) {
  let r = null;
  for (let s = targetDir; s !== originalCwd && s !== dirname(s); s = dirname(s)) {
    let repoRootForWorktreePath = getRepoRootForWorktreePath(s);
    if (
      repoRootForWorktreePath !== null &&
      (isPathWithinOrEqual(repoRootForWorktreePath, originalCwd) ||
        (isPathWithinOrEqual(originalCwd, repoRootForWorktreePath) &&
          !isPathWithinOrEqual(originalCwd, getClaudeWorktreesDir(repoRootForWorktreePath))))
    )
      r = {
        worktreeRoot: s,
        checkout: repoRootForWorktreePath,
      };
  }
  return r;
}
//@ chunk-e6aww6q8.js:3249342-3249438 placement
/**
 * 把检出目录下的路径映射到对应 worktree 下的同一相对路径。
 */
function mapCheckoutPathIntoWorktree(e, n) {
  return n !== null && isPathWithinOrEqual(e, n.worktreeRoot)
    ? join(n.checkout, relative(n.worktreeRoot, e))
    : e;
}
//@ chunk-e6aww6q8.js:3249438-3249546 placement
/**
 * 把检出目录下的路径映射到对应 worktree 下的同一相对路径。
 */
function mapPathIntoWorktree(e, worktreeForPath) {
  return worktreeForPath !== null &&
    e !== worktreeForPath.checkout &&
    isPathWithinOrEqual(e, worktreeForPath.checkout)
    ? join(worktreeForPath.worktreeRoot, relative(worktreeForPath.checkout, e))
    : e;
}
//@ chunk-e6aww6q8.js:3249546-3249575 placement
/**
 * 附件路径的最大字符数（4000）。
 */
var MAX_ATTACHMENT_PATH_CHARS = 4000;
var weakSet_5 = new WeakSet();
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
var attachmentLogStateByHost = new HostScoped(() => new AttachmentLogState());
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
var MAX_LOGGED_UNC_BLOCKED = 1000;
var uncBlockedLoggedByRoot = new SessionRootSlot(() => new Set());
//@ chunk-e6aww6q8.js:3381196-3381475 placement
/**
 * 判断附件文件读取是否被阻止：不可信网络路径返回 network，命中读取拒绝规则返回 denied。
 */
function getAttachmentReadBlockReason(e, n, r) {
  let trustedNetworkDirectories = n.trustedNetworkDirectories;
  if (isUntrustedUncPath(e, trustedNetworkDirectories)) return "network";
  let h = expandPath(e);
  if (r === "person") return isAttachmentReadDeniedOrThrown(h, n) ? "denied" : undefined;
  if (isNetworkOrDevicePath(e) || isNetworkOrDevicePath(h)) return "network";
  let y = vetPathSpellingsOrChain(e, h, trustedNetworkDirectories);
  if (!y.ok) return "network";
  return [h, ...y.pathsToCheck].some((S) => isAttachmentReadDeniedOrThrown(S, n)) ? "denied" : undefined;
}
//@ chunk-e6aww6q8.js:3381475-3381549 placement
/**
 * 判断附件是否因读拒绝而被阻止（判断异常且属预期错误时也视为拒绝）。
 */
function isAttachmentReadDeniedOrThrown(e, n) {
  try {
    return isAttachmentReadDenied(e, n);
  } catch (error) {
    if (isNoProjectDirectoryError(error)) return true;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3381549-3381783 placement
function isAttachmentReadDenied(e, n) {
  if (isUntrustedUncPath(e, n.trustedNetworkDirectories)) {
    let r = uncBlockedLoggedByRoot.of(getRootSession());
    if (!r.has(e) && r.size < MAX_LOGGED_UNC_BLOCKED) {
      r.add(e);
      logEvent("tengu_attachment_unc_read_blocked", {});
    }
    return true;
  }
  if (hasReadDenyRuleForPath(e, n, [e])) return true;
  if (isRestrictedReadBlocked(e, n)) return true;
  return matchingDenyRuleForDirectoryContents(e, n, "read") !== null;
}
//@ chunk-e6aww6q8.js:3381783-3381873 placement
/**
 * 把某文件的读取记录标记为“内容不在模型上下文中”。
 */
function markContentNotInModelContext(readFileState, n) {
  let r = readFileState.get(n);
  if (!r) return;
  readFileState.set(n, {
    ...r,
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
