/**
 * utils/git/gitRepoCache.ts
 *
 * 2.1.316 新增：git 仓库信息缓存（根目录、远程、monorepo、worktree 等）；取当前宿主的 git 仓库缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (6)
 * attribution: placement 6
 */
import { lstatSync, lstatSync as lstatSync_2, statSync, statSync as statSync_2 } from "fs";
import { Dc } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { readLinkTextSafe, rawPointerPathIsUnsafe } from "./gitFilesystem.js";
import { isOnForeignMount } from "../networkPaths.js";

//@ chunk-t0gq9gyw.js:69612-69695 placement
var lde = Symbol("git-repo-negative-result"),
  Ae = Symbol("git-repo-unreadable-result");
/**
 * git 仓库信息缓存（根目录、远程、monorepo、worktree 等）。
 */
//@ chunk-t0gq9gyw.js:69695-71157 placement
class GitRepoCache {
  rootByPath = new Dc({ max: 50 });
  canonicalRootByRoot = new Dc({ max: 50 });
  remoteSlugByRoot = new Dc({ max: 50 });
  monorepoRuledOutByRoot = new Dc({ max: 50 });
  monorepoVerdictByDir = new Dc({ max: 50 });
  gitDirByCwd = new Map();
  linkedFromRootByPin = new Dc({ max: 64 });
  hostWorktreeReport;
  markersByRoot = new Dc({ max: 50 });
  repositoryByCwd = new Map();
  remoteHostByCwd = new Map();
  repoClassByCanonicalRoot = new Map();
  linguistGeneratedByPath = new Map();
  wcRootByPath = new Dc({ max: 50 });
  wcTrunkByRoot = new Map();
  wcWorktreesByRoot = new Dc({ max: 50, ttl: 60000 });
  wcRemoteHashByRoot = new Dc({ max: 50 });
  wcHeadByRoot = new Map();
  sessionRepoNameByCwd = new Dc({ max: 50 });
  diffCheckoutIsRepo = new Map();
  gitExecutable = null;
  gitBehindLauncher = null;
  gitLauncherProbe = null;
  reportedHookInstallSkips = new Set();
  clear() {
    (this.rootByPath.clear(),
      this.canonicalRootByRoot.clear(),
      this.remoteSlugByRoot.clear(),
      this.monorepoRuledOutByRoot.clear(),
      this.monorepoVerdictByDir.clear(),
      this.gitDirByCwd.clear(),
      this.linkedFromRootByPin.clear(),
      (this.hostWorktreeReport = void 0),
      this.markersByRoot.clear(),
      this.repositoryByCwd.clear(),
      this.remoteHostByCwd.clear(),
      this.repoClassByCanonicalRoot.clear(),
      this.linguistGeneratedByPath.clear(),
      this.wcRootByPath.clear(),
      this.wcTrunkByRoot.clear(),
      this.wcWorktreesByRoot.clear(),
      this.wcRemoteHashByRoot.clear(),
      this.wcHeadByRoot.clear(),
      this.sessionRepoNameByCwd.clear(),
      this.diffCheckoutIsRepo.clear(),
      (this.gitExecutable = null),
      (this.gitBehindLauncher = null),
      (this.gitLauncherProbe = null),
      this.reportedHookInstallSkips.clear());
  }
}
//@ chunk-t0gq9gyw.js:71157-71246 placement
function uut(e, n, r) {
  let o = e.get(n);
  if (o !== void 0) return o;
  let s = r(n);
  return (e.set(n, s), s);
}
//@ chunk-t0gq9gyw.js:71246-71271 placement
var _s = new HostScoped(() => new GitRepoCache());
/**
 * 取当前宿主的 git 仓库缓存。
 */
//@ chunk-t0gq9gyw.js:71271-71308 placement
function getGitRepoCache() {
  return _s.of(getRootSession().host);
}
//@ chunk-t0gq9gyw.js:71308-71536 placement
function isUsableGitEntry(gitPath, dir) {
  try {
    let r = lstatSync_2(gitPath);
    if (r.isSymbolicLink()) {
      let o = readLinkTextSafe(gitPath);
      if (o === null) return !1;
      if (isOnForeignMount(o, dir)) return !1;
      if (rawPointerPathIsUnsafe(o, dir)) return !1;
      let s = statSync_2(gitPath);
      return s.isDirectory() || s.isFile();
    }
    return r.isDirectory() || r.isFile();
  } catch {
    return !1;
  }
}

export { lde, isUsableGitEntry, uut, getGitRepoCache, Ae };
