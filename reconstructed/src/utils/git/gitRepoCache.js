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
import { lstatSync, statSync } from "fs";
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { readLinkTextSafe, rawPointerPathIsUnsafe } from "./gitFilesystem.js";
import { isOnForeignMount } from "../networkPaths.js";

//@ chunk-t0gq9gyw.js:69612-69695 placement
/**
 * 表示"仓库不存在"的否定结果标记。
 */
var REPO_NEGATIVE_RESULT = Symbol("git-repo-negative-result");
var REPO_UNREADABLE_RESULT = Symbol("git-repo-unreadable-result");
//@ chunk-t0gq9gyw.js:69695-71157 placement
/**
 * git 仓库信息缓存（根目录、远程、monorepo、worktree 等）。
 */
class GitRepoCache {
  rootByPath = new LRUCache({
    max: 50,
  });
  canonicalRootByRoot = new LRUCache({
    max: 50,
  });
  remoteSlugByRoot = new LRUCache({
    max: 50,
  });
  monorepoRuledOutByRoot = new LRUCache({
    max: 50,
  });
  monorepoVerdictByDir = new LRUCache({
    max: 50,
  });
  gitDirByCwd = new Map();
  linkedFromRootByPin = new LRUCache({
    max: 64,
  });
  hostWorktreeReport;
  markersByRoot = new LRUCache({
    max: 50,
  });
  repositoryByCwd = new Map();
  remoteHostByCwd = new Map();
  repoClassByCanonicalRoot = new Map();
  linguistGeneratedByPath = new Map();
  wcRootByPath = new LRUCache({
    max: 50,
  });
  wcTrunkByRoot = new Map();
  wcWorktreesByRoot = new LRUCache({
    max: 50,
    ttl: 60000,
  });
  wcRemoteHashByRoot = new LRUCache({
    max: 50,
  });
  wcHeadByRoot = new Map();
  sessionRepoNameByCwd = new LRUCache({
    max: 50,
  });
  diffCheckoutIsRepo = new Map();
  gitExecutable = null;
  gitBehindLauncher = null;
  gitLauncherProbe = null;
  reportedHookInstallSkips = new Set();
  clear() {
    this.rootByPath.clear();
    this.canonicalRootByRoot.clear();
    this.remoteSlugByRoot.clear();
    this.monorepoRuledOutByRoot.clear();
    this.monorepoVerdictByDir.clear();
    this.gitDirByCwd.clear();
    this.linkedFromRootByPin.clear();
    this.hostWorktreeReport = undefined;
    this.markersByRoot.clear();
    this.repositoryByCwd.clear();
    this.remoteHostByCwd.clear();
    this.repoClassByCanonicalRoot.clear();
    this.linguistGeneratedByPath.clear();
    this.wcRootByPath.clear();
    this.wcTrunkByRoot.clear();
    this.wcWorktreesByRoot.clear();
    this.wcRemoteHashByRoot.clear();
    this.wcHeadByRoot.clear();
    this.sessionRepoNameByCwd.clear();
    this.diffCheckoutIsRepo.clear();
    this.gitExecutable = null;
    this.gitBehindLauncher = null;
    this.gitLauncherProbe = null;
    this.reportedHookInstallSkips.clear();
  }
}
//@ chunk-t0gq9gyw.js:71157-71246 placement
/**
 * 按 Map 缓存并惰性计算取值。
 */
function memoizeMap(e, n, r) {
  let o = e.get(n);
  if (o !== undefined) return o;
  let s = r(n);
  e.set(n, s);
  return s;
}
//@ chunk-t0gq9gyw.js:71246-71271 placement
var gitRepoCacheRegistry = new HostScoped(() => new GitRepoCache());
//@ chunk-t0gq9gyw.js:71271-71308 placement
/**
 * 取当前宿主的 git 仓库缓存。
 */
function getGitRepoCache() {
  return gitRepoCacheRegistry.of(getRootSession().host);
}
//@ chunk-t0gq9gyw.js:71308-71536 placement
function isUsableGitEntry(gitPath, dir) {
  try {
    let r = lstatSync(gitPath);
    if (r.isSymbolicLink()) {
      let linkText = readLinkTextSafe(gitPath);
      if (linkText === null) return false;
      if (isOnForeignMount(linkText, dir)) return false;
      if (rawPointerPathIsUnsafe(linkText, dir)) return false;
      let s = statSync(gitPath);
      return s.isDirectory() || s.isFile();
    }
    return r.isDirectory() || r.isFile();
  } catch {
    return false;
  }
}
export { REPO_NEGATIVE_RESULT, isUsableGitEntry, memoizeMap, getGitRepoCache, REPO_UNREADABLE_RESULT };
