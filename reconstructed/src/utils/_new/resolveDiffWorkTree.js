/**
 * utils/_new/resolveDiffWorkTree.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1r5nz6dk.js (1)
 * attribution: sole-consumer-new 1
 */
import { standardRepoLayout, getRepoTopLevel } from "../gitDiff.js";
import { readGitConfigTexts } from "../git/gitDirResolution.js";
import { isCurrentDirectoryBareGitRepo_2 } from "../git.js";
import { S, C } from "../workspaceDiff.js";
import { resolveNetworkShareCached, kMt } from "../remoteEnvironment.js";

//@ chunk-1r5nz6dk.js:3074-3350 sole-consumer-new
async function resolveDiffWorkTree(e, r) {
  let n = standardRepoLayout(e);
  if (n === null) return null;
  if (r !== null) {
    if (readGitConfigTexts(n.gitDir) !== !1) return null;
    if (!(await isCurrentDirectoryBareGitRepo_2(n.gitDir))) return null;
  }
  let o = r === null ? await getRepoTopLevel(void 0, e) : n.workTree;
  if (o === null || r === null) return o;
  let a = await S(o, resolveNetworkShareCached(kMt()));
  return a !== null && C(a, r) ? a : null;
}

export { resolveDiffWorkTree };
