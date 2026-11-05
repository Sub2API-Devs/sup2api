/**
 * utils/workspaceRoots.ts
 *
 * 2.1.316 新增：工作区根预热（外部构建为空实现）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (1), chunk-c6x4yb20.js (1)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { getOriginalCwdOrNull } from "../bootstrap/state.js";
import { getCwdOrNull } from "./cwd.js";
import { primeGitRootMemo, seedGitRootMemo } from "./git.js";
import { logError } from "./log.js";

//@ chunk-7kayq7nc.js:150092-150125 placement
/**
 * 外部构建下的空实现（async 返回 undefined），由 _new/primeWorkspaceRoots 调用。
 */
async function primeWorkspaceRootsNoop(a, gitRoot, b) {
  return;
}
//@ chunk-c6x4yb20.js:411-634 placement
/**
 * 启动时预读工作区根（git 根）。
 */
async function primeWorkspaceRoots(hostFiles) {
  let filtered = normalizeCaseForComparison_2([getOriginalCwdOrNull(), getCwdOrNull()]).filter(
    (root) => root !== null,
  );
  for (let root of filtered)
    try {
      let primed = await primeGitRootMemo(hostFiles, root);
      if (primed !== undefined) {
        let memoKey = await primeWorkspaceRootsNoop(root, primed.gitRoot, hostFiles);
        if (typeof memoKey === "string") seedGitRootMemo(memoKey, primed.gitRoot, primed.canonicalRoot);
      }
    } catch (error) {
      logError(error);
    }
}
export { primeWorkspaceRoots };
