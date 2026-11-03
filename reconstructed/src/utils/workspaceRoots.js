/**
 * utils/workspaceRoots.ts
 *
 * 2.1.316 新增：工作区根预热（外部构建为空实现）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-43p9vp1g.js (1), chunk-bwbq4xvm.js (1)
 * attribution: placement 2
 */
import { uniq } from "./collections.js";
import { getOriginalCwdOrNull } from "../bootstrap/state.js";
import { getCwdOrNull } from "./cwd.js";
import { primeGitRootMemo, seedGitRootMemo } from "./git.js";
import { logError } from "./log.js";

//@ chunk-43p9vp1g.js:411-634 placement
/**
 * 启动时预读工作区根（git 根）。
 */
async function primeWorkspaceRoots(r) {
  let filtered = uniq([getOriginalCwdOrNull(), getCwdOrNull()]).filter((t) => t !== null);
  for (let t of filtered)
    try {
      let o = await primeGitRootMemo(r, t);
      if (o !== undefined) {
        let i = await primeWorkspaceRootsNoop(t, o.gitRoot, r);
        if (typeof i === "string") seedGitRootMemo(i, o.gitRoot, o.canonicalRoot);
      }
    } catch (error) {
      logError(error);
    }
}
//@ chunk-bwbq4xvm.js:151270-151303 placement
/**
 * 外部构建下的空实现（async 返回 undefined），由 _new/primeWorkspaceRoots 调用。
 */
async function primeWorkspaceRootsNoop(e, gitRoot, n) {
  return;
}
export { primeWorkspaceRoots };
