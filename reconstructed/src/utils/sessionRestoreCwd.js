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
import { bks } from "./cwd.js";
import {
  resolveContainmentTarget,
  NW,
  isOutsideContainment,
  isSameContainmentPath,
} from "./permissions/bgContainment.js";
import { ai, yl } from "./networkPaths.js";
import { findCanonicalGitRoot } from "./git.js";
import { gitRootsForPath, R6 } from "./worktreeIsolation.js";

//@ chunk-6bye9wca.js:356-432 placement
var WLe = (() => {
  try {
    return bks(process.cwd());
  } catch {
    return process.cwd();
  }
})();
/**
 * 比较两个路径的包含目标（解析失败或一方被跳过视为相同）。
 */
//@ chunk-6bye9wca.js:432-545 placement
function isSameRestoreLocation(r, e) {
  let n = resolveContainmentTarget(r),
    t = resolveContainmentTarget(e);
  if (NW(n) || NW(t)) return !0;
  if (n.skipped !== t.skipped) return !0;
  return isOutsideContainment(n, t);
}
/**
 * 恢复会话时要比对的根目录：规范 git 根或所在工作树，可排除与指定路径相同者。
 */
//@ chunk-6bye9wca.js:545-725 placement
function restoreRootsFor(r, e) {
  if (ai(r) || yl(r)) return [];
  let n = findCanonicalGitRoot(r),
    t =
      n !== null && n !== void 0
        ? [n]
        : (() => {
            let o = gitRootsForPath(r);
            return o.length > 0 ? o : [r];
          })();
  return e === void 0 ? t : t.filter((o) => R6(o, e) !== "same");
}
/**
 * 退出工作树时要比对的根目录：规范 git 根或所在工作树，可排除与指定路径相同者。
 */
//@ chunk-6bye9wca.js:725-865 placement
function worktreeRootsFor(r, e) {
  if (ai(r) || yl(r)) return [];
  let n = findCanonicalGitRoot(r),
    t = n !== null && n !== void 0 ? [n] : gitRootsForPath(r);
  return e === void 0 ? t : t.filter((s) => R6(s, e) !== "same");
}
//@ chunk-6bye9wca.js:865-1222 placement
function isCoveredByWorktrees(r, e, n) {
  if (e.length === 0) return !1;
  if (
    !e.every((s) => {
      let o = R6(r, s);
      if (o === "indeterminate") return !1;
      if (o === "same") return !0;
      return !isSameRestoreLocation(s, r);
    })
  )
    return !1;
  if (n?.requireCovered === !0) {
    let s = resolveContainmentTarget(r);
    if (NW(s)) return !1;
    let o = (a) =>
      a.some((u) => {
        let i = resolveContainmentTarget(u);
        if (NW(i)) return !1;
        return isSameContainmentPath(s, i);
      });
    return o(n.coveredWitnesses ?? e) || o(n.extraCoveredRoots ?? []);
  }
  return !0;
}

export { isCoveredByWorktrees, restoreRootsFor, WLe, isSameRestoreLocation, worktreeRootsFor };
