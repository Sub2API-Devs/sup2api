/**
 * utils/git/gitRepoCache.ts
 *
 * 2.1.316 新增：git 仓库信息缓存（根目录、远程、monorepo、worktree 等）；取当前宿主的 git 仓库缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-85eyj5gy.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstatSync, statSync } from "fs";
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { readLinkTextSafe, rawPointerPathIsUnsafe } from "./gitFilesystem.js";
import { isOnForeignMount } from "../networkPaths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-85eyj5gy.js:70419-70502 placement
/**
 * 表示"仓库不存在"的否定结果标记。
 */
var REPO_NEGATIVE_RESULT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REPO_UNREADABLE_RESULT;
deferInit("chunk-85eyj5gy.js:70419", () => {
  REPO_NEGATIVE_RESULT = Symbol("git-repo-negative-result");
  REPO_UNREADABLE_RESULT = Symbol("git-repo-unreadable-result");
});
//@ chunk-85eyj5gy.js:70502-72006 placement
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
  lastRemoteHash;
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
    this.lastRemoteHash = undefined;
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
//@ chunk-85eyj5gy.js:72006-72095 placement
/**
 * 按 Map 缓存并惰性计算取值。
 */
function memoizeMap(map, key, compute) {
  let cached = map.get(key);
  if (cached !== undefined) return cached;
  let value = compute(key);
  map.set(key, value);
  return value;
}
//@ chunk-85eyj5gy.js:72095-72120 placement
var gitRepoCacheRegistry; // deferred: uses GitRepoCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-85eyj5gy.js:72095", () => {
  gitRepoCacheRegistry = new HostScoped(() => new GitRepoCache());
});
//@ chunk-85eyj5gy.js:72120-72157 placement
/**
 * 取当前宿主的 git 仓库缓存。
 */
function getGitRepoCache() {
  return gitRepoCacheRegistry.of(getRootSession().host);
}
//@ chunk-85eyj5gy.js:72157-72385 placement
function isUsableGitEntry(gitPath, dir) {
  try {
    let stats = lstatSync(gitPath);
    if (stats.isSymbolicLink()) {
      let linkText = readLinkTextSafe(gitPath);
      if (linkText === null) return false;
      if (isOnForeignMount(linkText, dir)) return false;
      if (rawPointerPathIsUnsafe(linkText, dir)) return false;
      let targetStats = statSync(gitPath);
      return targetStats.isDirectory() || targetStats.isFile();
    }
    return stats.isDirectory() || stats.isFile();
  } catch {
    return false;
  }
}
export { getGitRepoCache, REPO_NEGATIVE_RESULT, isUsableGitEntry, memoizeMap, REPO_UNREADABLE_RESULT };
