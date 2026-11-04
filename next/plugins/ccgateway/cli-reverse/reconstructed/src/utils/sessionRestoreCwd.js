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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6bye9wca.js:356-432 placement
/**
 * STARTUP_CWD_REALPATH：启动时解析出的 cwd。
 */
var STARTUP_CWD_REALPATH; // deferred: uses identityPath (./cwd.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6bye9wca.js:356", () => {
  STARTUP_CWD_REALPATH = (() => {
    try {
      return identityPath(process.cwd());
    } catch {
      return process.cwd();
    }
  })();
});
//@ chunk-6bye9wca.js:432-545 placement
/**
 * 比较两个路径的包含目标（解析失败或一方被跳过视为相同）。
 */
function isSameRestoreLocation(path, otherPath) {
  let containmentTarget = resolveContainmentTarget(path);
  let containmentTarget_2 = resolveContainmentTarget(otherPath);
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
  let roots =
    canonicalGitRoot !== null && canonicalGitRoot !== undefined
      ? [canonicalGitRoot]
      : (() => {
          let roots = gitRootsForPath(liveLaunchAnchor);
          return roots.length > 0 ? roots : [liveLaunchAnchor];
        })();
  return worktreePath === undefined
    ? roots
    : roots.filter((root) => compareSameContainment(root, worktreePath) !== "same");
}
//@ chunk-6bye9wca.js:725-865 placement
/**
 * 退出工作树时要比对的根目录：规范 git 根或所在工作树，可排除与指定路径相同者。
 */
function worktreeRootsFor(liveLaunchAnchor, worktreePath) {
  if (isNonWslUncPath(liveLaunchAnchor) || isNetworkMountRoot(liveLaunchAnchor)) return [];
  let canonicalGitRoot = findCanonicalGitRoot(liveLaunchAnchor);
  let roots =
    canonicalGitRoot !== null && canonicalGitRoot !== undefined
      ? [canonicalGitRoot]
      : gitRootsForPath(liveLaunchAnchor);
  return worktreePath === undefined
    ? roots
    : roots.filter((root) => compareSameContainment(root, worktreePath) !== "same");
}
//@ chunk-6bye9wca.js:865-1222 placement
function isCoveredByWorktrees(path, roots, options) {
  if (roots.length === 0) return false;
  if (
    !roots.every((root) => {
      let containment = compareSameContainment(path, root);
      if (containment === "indeterminate") return false;
      if (containment === "same") return true;
      return !isSameRestoreLocation(root, path);
    })
  )
    return false;
  if (options?.requireCovered === true) {
    let containmentTarget = resolveContainmentTarget(path);
    if (hasUnresolvedCanonicalPath(containmentTarget)) return false;
    let anyMatches = (roots) =>
      roots.some((root) => {
        let otherTarget = resolveContainmentTarget(root);
        if (hasUnresolvedCanonicalPath(otherTarget)) return false;
        return isSameContainmentPath(containmentTarget, otherTarget);
      });
    return anyMatches(options.coveredWitnesses ?? roots) || anyMatches(options.extraCoveredRoots ?? []);
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
