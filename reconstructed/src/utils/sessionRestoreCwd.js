/**
 * utils/sessionRestoreCwd.ts
 *
 * 2.1.316 新增：恢复会话时的工作目录与工作树比对（是否同一位置、覆盖判断）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6bye9wca.js (5)
 * attribution: placement 5
 */
import { identityPath } from "./cwd.js";
import {
  resolveContainmentTarget,
  hasUnresolvedCanonicalPath,
  isOutsideContainment,
  isSameContainmentPath,
} from "./permissions/bgContainment.js";
import { isNonWslUncPath, isNetworkMountRoot } from "./networkPaths.js";
import { findCanonicalGitRoot } from "./git.js";
import { gitRootsForPath, compareSameContainment } from "./worktreeIsolation.js";

//@ chunk-6bye9wca.js:356-432 placement
/**
 * STARTUP_CWD_REALPATH：启动时解析出的 cwd。
 */
var STARTUP_CWD_REALPATH = (() => {
  try {
    return identityPath(process.cwd());
  } catch {
    return process.cwd();
  }
})();
//@ chunk-6bye9wca.js:432-545 placement
/**
 * 比较两个路径的包含目标（解析失败或一方被跳过视为相同）。
 */
function isSameRestoreLocation(r, worktreePath) {
  let containmentTarget = resolveContainmentTarget(r);
  let containmentTarget_2 = resolveContainmentTarget(worktreePath);
  if (hasUnresolvedCanonicalPath(containmentTarget) || hasUnresolvedCanonicalPath(containmentTarget_2))
    return true;
  if (containmentTarget.skipped !== containmentTarget_2.skipped) return true;
  return isOutsideContainment(containmentTarget, containmentTarget_2);
}
//@ chunk-6bye9wca.js:545-725 placement
/**
 * 恢复会话时要比对的根目录：规范 git 根或所在工作树，可排除与指定路径相同者。
 */
function restoreRootsFor(liveLaunchAnchor, worktreePath) {
  if (isNonWslUncPath(liveLaunchAnchor) || isNetworkMountRoot(liveLaunchAnchor)) return [];
  let canonicalGitRoot = findCanonicalGitRoot(liveLaunchAnchor);
  let t =
    canonicalGitRoot !== null && canonicalGitRoot !== undefined
      ? [canonicalGitRoot]
      : (() => {
          let o = gitRootsForPath(liveLaunchAnchor);
          return o.length > 0 ? o : [liveLaunchAnchor];
        })();
  return worktreePath === undefined ? t : t.filter((o) => compareSameContainment(o, worktreePath) !== "same");
}
//@ chunk-6bye9wca.js:725-865 placement
/**
 * 退出工作树时要比对的根目录：规范 git 根或所在工作树，可排除与指定路径相同者。
 */
function worktreeRootsFor(liveLaunchAnchor, worktreePath) {
  if (isNonWslUncPath(liveLaunchAnchor) || isNetworkMountRoot(liveLaunchAnchor)) return [];
  let canonicalGitRoot = findCanonicalGitRoot(liveLaunchAnchor);
  let t =
    canonicalGitRoot !== null && canonicalGitRoot !== undefined
      ? [canonicalGitRoot]
      : gitRootsForPath(liveLaunchAnchor);
  return worktreePath === undefined ? t : t.filter((s) => compareSameContainment(s, worktreePath) !== "same");
}
//@ chunk-6bye9wca.js:865-1222 placement
function isCoveredByWorktrees(r, e, n) {
  if (e.length === 0) return false;
  if (
    !e.every((s) => {
      let o = compareSameContainment(r, s);
      if (o === "indeterminate") return false;
      if (o === "same") return true;
      return !isSameRestoreLocation(s, r);
    })
  )
    return false;
  if (n?.requireCovered === true) {
    let containmentTarget = resolveContainmentTarget(r);
    if (hasUnresolvedCanonicalPath(containmentTarget)) return false;
    let o = (a) =>
      a.some((u) => {
        let containmentTarget_2 = resolveContainmentTarget(u);
        if (hasUnresolvedCanonicalPath(containmentTarget_2)) return false;
        return isSameContainmentPath(containmentTarget, containmentTarget_2);
      });
    return o(n.coveredWitnesses ?? e) || o(n.extraCoveredRoots ?? []);
  }
  return true;
}
export {
  isCoveredByWorktrees,
  restoreRootsFor,
  STARTUP_CWD_REALPATH,
  isSameRestoreLocation,
  worktreeRootsFor,
};
