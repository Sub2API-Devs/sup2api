/**
 * utils/permissions/_new/_new/getDirRemoteState.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (1)
 * attribution: sole-consumer-new 1
 */
import { checkCurrentRepoVisibility } from "../../../github/repoVisibility.js";

//@ chunk-s61vbvea.js:532001-532138 sole-consumer-new
async function getDirRemoteState(e, n) {
  if (e.hasDir(n)) {
    let dirState = e.dirState(n);
    return dirState ? { slug: dirState.slug, host: dirState.host, visibility: dirState.visibility } : null;
  }
  return checkCurrentRepoVisibility(n);
}

export { getDirRemoteState };
