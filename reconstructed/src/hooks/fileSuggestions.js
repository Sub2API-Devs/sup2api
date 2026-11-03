/**
 * hooks/fileSuggestions.ts
 *
 * @ 文件建议：git ls-files / ripgrep 建项目文件索引、.ignore/.rgignore、后台刷新、模糊匹配生成建议并应用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/fileSuggestions.ts
 * pieces: chunk-1b5x3jje.js (1), chunk-axmbhcjg.js (1), chunk-czffketc.js (1), chunk-e6aww6q8.js (1), chunk-x3qn5k1g.js (35)
 * attribution: placement 1, fingerprint 10, sole-consumer 3, facade-exports 7, layout 14, callgraph-fingerprint 1, file-local 2, callgraph-witnessed 1
 */
import { statSync } from "fs";
import * as pathModule from "path";
import { win32, posix } from "path";
import { Re } from "../../runtime/bun-runtime.js";
import { require_ignore } from "../../vendor/ignore/index.js";
import { createSignal } from "../utils/signal.js";
import { findGitRoot, gitExe } from "../utils/git.js";
import { getCwd } from "../utils/cwd.js";
import { CHUNK_MS, yieldToEventLoop, FileIndex } from "../native-ts/file-index/index.js";
import { logForDebugging } from "../utils/debug.js";
import { getFsImplementation } from "../utils/fsOperations.js";
import { uniq } from "../utils/collections.js";
import { filterUsableIgnorePatterns, splitNonEmptyLines } from "../utils/ignorePatterns.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { logEvent } from "../services/analytics/index.js";
import { errorMessage } from "../utils/errors.js";
import { CLAUDE_CONFIG_DIRECTORIES, loadMarkdownFilesCached } from "../utils/markdownConfigLoader.js";
import { ripGrep_2, resolveRipgrepSpawnCwd, ripgrepCommand } from "../utils/ripgrep.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { getGlobalConfig } from "../utils/config.js";
import { isDiskless, getSessionId, getOriginalCwd, getProjectRoot } from "../bootstrap/state.js";
import { logError } from "../utils/log.js";
import {
  isRemoteSessionAvailable,
  getRemoteCaps,
  isRemoteControlChannelAvailable,
} from "../remote/remoteMode.js";
import { resolveFileSuggestionHook } from "../utils/hooks/hookPolicy.js";
import { createBaseHookInput, executeFileSuggestionCommand } from "../utils/hooks.js";
import { expandPath } from "../utils/path.js";
import { platformPath } from "../utils/posixPaths.js";

//@ chunk-x3qn5k1g.js:933-951 sole-consumer
var fileSuggestionSignal = Re(require_ignore(), 1);
//@ chunk-x3qn5k1g.js:1004-1529 sole-consumer
/**
 * 创建文件建议索引缓存的初始状态。
 */
function createFileIndexCache() {
  return {
    fileIndex: null,
    fileListRefreshPromise: null,
    cacheGeneration: 0,
    untrackedFetchPromise: null,
    cachedTrackedFiles: [],
    cachedConfigFiles: [],
    cachedTrackedDirs: [],
    ignorePatternsCache: null,
    ignorePatternsCacheKey: null,
    ignoreReincludeGlobs: [],
    lastReincludedFiles: [],
    reincludeRetryAtMs: 0,
    trackedBuildPromise: null,
    lastRefreshMs: 0,
    lastScanDurationMs: null,
    lastGitIndexMtime: null,
    loadedTrackedSignature: null,
    loadedMergedSignature: null,
    normalizedTrackedInputs: null,
    indexBuildComplete: createSignal(),
    indexBaseDir: null,
    indexLoadCount: 0,
  };
}
//@ chunk-x3qn5k1g.js:1529-1541 facade-exports
var globalFileIndexCache = createFileIndexCache();
//@ chunk-x3qn5k1g.js:1541-2079 facade-exports
function resetFileIndexCache(globalFileIndexCache) {
  globalFileIndexCache.fileIndex = null;
  globalFileIndexCache.fileListRefreshPromise = null;
  globalFileIndexCache.cacheGeneration++;
  globalFileIndexCache.untrackedFetchPromise = null;
  globalFileIndexCache.cachedTrackedFiles = [];
  globalFileIndexCache.cachedConfigFiles = [];
  globalFileIndexCache.cachedTrackedDirs = [];
  globalFileIndexCache.ignorePatternsCache = null;
  globalFileIndexCache.ignorePatternsCacheKey = null;
  globalFileIndexCache.ignoreReincludeGlobs = [];
  globalFileIndexCache.lastReincludedFiles = [];
  globalFileIndexCache.reincludeRetryAtMs = 0;
  globalFileIndexCache.trackedBuildPromise = null;
  globalFileIndexCache.lastRefreshMs = 0;
  globalFileIndexCache.lastScanDurationMs = null;
  globalFileIndexCache.lastGitIndexMtime = null;
  globalFileIndexCache.loadedTrackedSignature = null;
  globalFileIndexCache.loadedMergedSignature = null;
  globalFileIndexCache.normalizedTrackedInputs = null;
  globalFileIndexCache.indexBaseDir = null;
  globalFileIndexCache.indexLoadCount++;
}
//@ chunk-x3qn5k1g.js:2079-2232 fingerprint = getPathsForSuggestions (0.353)
function getPathsForSuggestions(e, i, s, indexBaseDir) {
  let o = ++e.indexLoadCount;
  let r = i.loadFromFileListAsync(s);
  r.queryable.then(() => {
    if (e.indexLoadCount === o) e.indexBaseDir = indexBaseDir;
  });
  return r.done;
}
//@ chunk-x3qn5k1g.js:2232-2533 layout
/**
 * 对路径列表做抽样 FNV 哈希，生成"数量:哈希"签名。
 */
function hashPathList(paths) {
  let n_2 = paths.length;
  let stride = Math.max(1, Math.floor(n_2 / 500));
  let n = -2128831035;
  for (let i = 0; i < n_2; i += stride) {
    let r = paths[i];
    for (let j = 0; j < r.length; j++) n = ((n ^ r.charCodeAt(j)) * 16777619) | 0;
    n = (n * 16777619) | 0;
  }
  if (n_2 > 0) {
    let last = paths[n_2 - 1];
    for (let j = 0; j < last.length; j++) n = ((n ^ last.charCodeAt(j)) * 16777619) | 0;
  }
  return `${n_2}:${(n >>> 0).toString(16)}`;
}
//@ chunk-x3qn5k1g.js:2533-2573 layout
function suggestionCacheKey(e, paths) {
  return `${e}\x00${hashPathList(paths)}`;
}
//@ chunk-x3qn5k1g.js:2573-2685 fingerprint = getGitIndexMtime (1)
function getGitIndexMtime() {
  let repoRoot = findGitRoot(getCwd());
  if (!repoRoot) return null;
  try {
    return statSync(pathModule.join(repoRoot, ".git", "index")).mtimeMs;
  } catch {
    return null;
  }
}
//@ chunk-x3qn5k1g.js:2685-2921 layout
async function rebasePaths(paths, fromDir, toDir) {
  if (toDir === fromDir) return paths;
  let n = Array(paths.length);
  let chunkStart = performance.now();
  for (let k = 0; k < paths.length; k++) {
    let joined = pathModule.join(fromDir, paths[k]);
    n[k] = pathModule.relative(toDir, joined);
    if ((k & 255) === 255 && performance.now() - chunkStart > CHUNK_MS) {
      await yieldToEventLoop();
      chunkStart = performance.now();
    }
  }
  return n;
}
//@ chunk-x3qn5k1g.js:2921-3419 fingerprint = mergeUntrackedIntoNormalizedCache (0.685)
async function mergeUntrackedIntoNormalizedCache(cache, files, indexBaseDir) {
  if (files.length === 0) return;
  if (!cache.fileIndex) return;
  let untrackedDirs = await getDirectoryNamesAsync(files);
  if (cache.normalizedTrackedInputs?.cwd !== indexBaseDir) return;
  let allPaths = [
    ...cache.cachedTrackedFiles,
    ...cache.cachedConfigFiles,
    ...cache.cachedTrackedDirs,
    ...files,
    ...untrackedDirs,
  ];
  let sig = suggestionCacheKey(indexBaseDir, allPaths);
  if (sig === cache.loadedMergedSignature) {
    logForDebugging("[FileIndex] skipped index rebuild \u2014 merged paths unchanged");
    return;
  }
  if (await getPathsForSuggestions(cache, cache.fileIndex, allPaths, indexBaseDir)) {
    cache.loadedMergedSignature = sig;
    logForDebugging(
      `[FileIndex] rebuilt index with ${cache.cachedTrackedFiles.length} tracked + ${files.length} untracked files`,
    );
  }
}
//@ chunk-x3qn5k1g.js:3419-4129 fingerprint = loadRipgrepIgnorePatterns (0.602)
async function loadRipgrepIgnorePatterns(e, repoRoot, s) {
  let cacheKey = `${repoRoot}:${s}`;
  if (e.ignorePatternsCacheKey === cacheKey) return e.ignorePatternsCache;
  let fs = getFsImplementation();
  let ignoreFiles = [".ignore", ".rgignore"];
  let c = uniq([repoRoot, s]);
  let p = fileSuggestionSignal.default();
  let u = false;
  let f = false;
  let g = [];
  let m = [];
  let paths = ignoreFiles.flatMap((dir) => c.map((C) => pathModule.join(C, dir)));
  let contents = await Promise.all(
    paths.map((path) =>
      fs
        .readFile(path, {
          encoding: "utf8",
        })
        .catch(() => null),
    ),
  );
  for (let [i, content] of contents.entries()) {
    if (content === null) continue;
    let lines = filterUsableIgnorePatterns(splitNonEmptyLines(content), "file_suggestions_ignore");
    p.add(lines);
    u = true;
    let ignoreFile = parseIgnoreFile(
      lines,
      pathModule.relative(repoRoot, pathModule.dirname(paths[i])).replaceAll(pathModule.sep, "/"),
    );
    f ||= ignoreFile.hasNegation;
    g.push(...ignoreFile.augmentations);
    m.push(...ignoreFile.rules);
    logForDebugging(`[FileIndex] loaded ignore patterns from ${paths[i]}`);
  }
  let result = u ? p : null;
  e.ignorePatternsCache = result;
  e.ignorePatternsCacheKey = cacheKey;
  e.ignoreReincludeGlobs = f ? [...g, ...m] : [];
  return result;
}
//@ chunk-x3qn5k1g.js:4129-4510 layout
/**
 * 把 .ignore/.rgignore 行转成 ripgrep 规则：注释与空行跳过、取反规则记录 re-include glob、其余规则加 "!" 前缀；返回规则、是否有取反、re-include 列表。
 */
function parseIgnoreFile(lines, baseDir) {
  let s = [];
  let n = [];
  let hasNegation = false;
  let r = urlPatternToRegex(baseDir);
  for (let line of lines) {
    let p = line.endsWith("\\ ") ? line : line.trimEnd();
    if (p === "" || p.startsWith("#")) continue;
    let u = p.startsWith("!");
    let f = u ? p.slice(1) : p;
    if (f === "") continue;
    let g = anchorIgnorePattern(f, r);
    if (u) {
      hasNegation = true;
      n.push(g);
      if (!g.endsWith("**")) {
        let replaced = g.replace(/\/+$/, "");
        s.push(isRelativeName(replaced) ? `**/${replaced}/**` : `${replaced}/**`);
      }
    } else n.push(`!${g}`);
  }
  return {
    hasNegation,
    augmentations: s,
    rules: n,
  };
}
//@ chunk-x3qn5k1g.js:4510-4586 layout
function isRelativeName(e) {
  return !e.startsWith("/") && !e.replace(/\/+$/, "").includes("/");
}
//@ chunk-x3qn5k1g.js:4586-4664 layout = urlPatternToRegex (1)
function urlPatternToRegex(pattern) {
  return pattern.replace(/[[\]{}*?\\]/g, "\\$&").replace(/^[!#]/, "\\$&");
}
//@ chunk-x3qn5k1g.js:4664-4776 layout
function anchorIgnorePattern(e, i) {
  if (i === "") return e;
  if (e.startsWith("/")) return `${i}${e}`;
  return isRelativeName(e) ? `${i}/**/${e}` : `${i}/${e}`;
}
//@ chunk-x3qn5k1g.js:4776-5002 layout
async function filterIgnored(e, i) {
  let s = [];
  let startTime = performance.now();
  for (let k = 0; k < i.length; k++) {
    let r = i[k];
    if (!fileSuggestionSignal.default.isPathValid(r) || !e.ignores(r)) s.push(r);
    if ((k & 255) === 255 && performance.now() - startTime > CHUNK_MS) {
      await yieldToEventLoop();
      startTime = performance.now();
    }
  }
  return s;
}
//@ chunk-x3qn5k1g.js:5002-6446 fingerprint = getFilesUsingGit (0.778)
/**
 * 用 git ls-files（含子模块，core.quotepath=false）列出已跟踪与未跟踪文件；非 git 仓库返回 null。
 */
async function getFilesUsingGit(cache, abortSignal, respectGitignore, n) {
  let startTime = Date.now();
  let cacheGeneration = cache.cacheGeneration;
  logForDebugging("[FileIndex] getFilesUsingGit called");
  let repoRoot = findGitRoot(n);
  if (!repoRoot) {
    logForDebugging("[FileIndex] not a git repo, returning null");
    return null;
  }
  try {
    let lsFilesStart = Date.now();
    let trackedResult = await execFileNoThrowWithCwd(
      gitExe(),
      ["-c", "core.quotepath=false", "ls-files", "--recurse-submodules"],
      {
        timeout: 5000,
        abortSignal,
        cwd: repoRoot,
      },
    );
    logForDebugging(`[FileIndex] git ls-files (tracked) took ${Date.now() - lsFilesStart}ms`);
    if (trackedResult.code !== 0) {
      logForDebugging(
        `[FileIndex] git ls-files failed (code=${trackedResult.code}, stderr=${trackedResult.stderr}), falling back to ripgrep`,
      );
      return null;
    }
    let normalizedTrackedInputs = cache.normalizedTrackedInputs;
    let g;
    let m = null;
    if (
      normalizedTrackedInputs !== null &&
      normalizedTrackedInputs.repoRoot === repoRoot &&
      normalizedTrackedInputs.cwd === n &&
      normalizedTrackedInputs.rawStdout === trackedResult.stdout &&
      cache.cachedTrackedFiles.length > 0
    ) {
      g = cache.cachedTrackedFiles;
      logForDebugging("[FileIndex] skipped path normalization \u2014 raw git paths unchanged");
    } else {
      let trackedFiles = trackedResult.stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      g = await rebasePaths(trackedFiles, repoRoot, n);
      let ignorePatterns = await loadRipgrepIgnorePatterns(cache, repoRoot, n);
      if (ignorePatterns) {
        let beforeCount = g.length;
        g = await filterIgnored(ignorePatterns, g);
        logForDebugging(`[FileIndex] applied ignore patterns: ${beforeCount} -> ${g.length} files`);
      }
      m = {
        repoRoot,
        cwd: n,
        rawStdout: trackedResult.stdout,
      };
    }
    if (cacheGeneration !== cache.cacheGeneration) {
      logForDebugging("[FileIndex] discarding refresh results \u2014 cache was reset mid-refresh");
      return g;
    }
    if (m !== null) cache.normalizedTrackedInputs = m;
    cache.cachedTrackedFiles = g;
    let duration = Date.now() - startTime;
    logForDebugging(`[FileIndex] git ls-files: ${g.length} tracked files in ${duration}ms`);
    logEvent("tengu_file_suggestions_git_ls_files", {
      file_count: g.length,
      tracked_count: g.length,
      untracked_count: 0,
      duration_ms: duration,
    });
    fetchUntrackedFiles(cache, repoRoot, n, respectGitignore);
    return g;
  } catch (error) {
    logForDebugging(`[FileIndex] git ls-files error: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-x3qn5k1g.js:6446-6644 callgraph-fingerprint = getDirectoryNamesAsync (1)
async function getDirectoryNamesAsync(files) {
  let directoryNames = new Set();
  let chunkStart = performance.now();
  for (let i = 0; i < files.length; i++) {
    addParentDirs(files, i, i + 1, directoryNames);
    if ((i & 255) === 255 && performance.now() - chunkStart > CHUNK_MS) {
      await yieldToEventLoop();
      chunkStart = performance.now();
    }
  }
  return [...directoryNames].map((directoryName) => directoryName + pathModule.sep);
}
//@ chunk-x3qn5k1g.js:6644-6782 layout
function addParentDirs(files, i, s, directoryNames) {
  for (let o = i; o < s; o++) {
    let dir = pathModule.dirname(files[o]);
    while (dir !== "." && !directoryNames.has(dir)) {
      let dir_2 = pathModule.dirname(dir);
      if (dir_2 === dir) break;
      directoryNames.add(dir);
      dir = dir_2;
    }
  }
}
//@ chunk-x3qn5k1g.js:6782-6893 layout
async function listClaudeConfigFiles(e, storage) {
  return (
    await Promise.all(CLAUDE_CONFIG_DIRECTORIES.map((n) => loadMarkdownFilesCached(n, e, storage)))
  ).flatMap((n) => n.map((o) => o.filePath));
}
//@ chunk-x3qn5k1g.js:6893-7015 layout = VCS_DIRECTORIES_TO_EXCLUDE (0.922)
/**
 * VCS 目录列表及对应的 rg --glob 排除参数（目录形式与名称形式）。
 */
var VCS_DIRECTORIES = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"];
var VCS_DIR_EXCLUDE_GLOB_ARGS = VCS_DIRECTORIES.flatMap((e) => ["--glob", `!${e}/`]);
var VCS_EXCLUDE_GLOB_ARGS = VCS_DIRECTORIES.flatMap((e) => ["--glob", `!${e}`]);
//@ chunk-x3qn5k1g.js:7015-7642 fingerprint = getProjectFiles (0.929)
/**
 * 获取项目文件列表：优先 git ls-files，失败回落 ripgrep --files（可选尊重 .gitignore）。
 */
async function getProjectFiles(abortSignal, abortSignal_2, s, n) {
  logForDebugging(`[FileIndex] getProjectFiles called, respectGitignore=${s}`);
  let gitFiles = await getFilesUsingGit(abortSignal, abortSignal_2, s, n);
  if (gitFiles !== null) {
    logForDebugging(`[FileIndex] using git ls-files result (${gitFiles.length} files)`);
    return gitFiles;
  }
  logForDebugging("[FileIndex] git ls-files returned null, falling back to ripgrep");
  abortSignal.normalizedTrackedInputs = null;
  let startTime = Date.now();
  let c = null;
  let files;
  {
    let rgArgs = ["--files", "--follow", "--hidden", ...VCS_DIR_EXCLUDE_GLOB_ARGS];
    if (!s) rgArgs.push("--no-ignore-vcs");
    files = await ripGrep_2(rgArgs, n, abortSignal_2, {
      searchOtherAppsData: true,
    });
  }
  let relativePaths = files.map((file) => pathModule.relative(n, file));
  let duration = Date.now() - startTime;
  logForDebugging(`[FileIndex] ripgrep: ${relativePaths.length} files in ${duration}ms`);
  logEvent("tengu_file_suggestions_ripgrep", {
    file_count: relativePaths.length,
    duration_ms: duration,
  });
  return relativePaths;
}
//@ chunk-x3qn5k1g.js:7642-8293 layout
/**
 * 建立已跟踪文件索引：取项目文件（git 或 ripgrep，尊重 gitignore 设置）与 .claude 配置文件，加入目录名；路径签名没变则跳过重建。10 秒超时。
 */
async function buildTrackedFileIndex(cache, storage) {
  let s = AbortSignal.timeout(1e4);
  let n = (cache.fileIndex ??= new FileIndex());
  let deferred = Promise.withResolvers();
  cache.trackedBuildPromise = deferred.promise;
  try {
    let initialSettings = getInitialSettings_2();
    let globalConfig = getGlobalConfig();
    let p = initialSettings.respectGitignore ?? globalConfig.respectGitignore ?? true;
    let indexBaseDir = getCwd();
    let [projectFiles, g] = await Promise.all([
      getProjectFiles(cache, s, p, indexBaseDir),
      listClaudeConfigFiles(indexBaseDir, storage),
    ]);
    cache.cachedConfigFiles = g;
    let files = [...projectFiles, ...g];
    let directoryNames = await getDirectoryNamesAsync(files);
    cache.cachedTrackedDirs = directoryNames;
    let F = [...directoryNames, ...files];
    let I = suggestionCacheKey(indexBaseDir, F);
    if (I !== cache.loadedTrackedSignature) {
      if (await getPathsForSuggestions(cache, n, F, indexBaseDir)) {
        cache.loadedTrackedSignature = I;
        cache.loadedMergedSignature = null;
      }
    } else logForDebugging("[FileIndex] skipped index rebuild \u2014 tracked paths unchanged");
  } catch (error) {
    logForDebugging(`[FileIndex] getPathsForSuggestions failed: ${errorMessage(error)}`, {
      level: "error",
    });
  } finally {
    deferred.resolve();
  }
  return n;
}
//@ chunk-x3qn5k1g.js:8293-8399 file-local
function commonPrefixLength(a, b) {
  let minLength = Math.min(a.length, b.length);
  let i = 0;
  while (i < minLength && a[i] === b[i]) i++;
  return a.substring(0, i);
}
//@ chunk-x3qn5k1g.js:8399-8556 facade-exports = _temp (1)
function findLongestCommonPrefix(item) {
  if (item.length === 0) return "";
  let mapped = item.map((n) => n.displayText);
  let s = mapped[0];
  for (let k = 1; k < mapped.length; k++) {
    let o = mapped[k];
    s = commonPrefixLength(s, o);
    if (s === "") return "";
  }
  return s;
}
//@ chunk-x3qn5k1g.js:8556-8646 fingerprint = createFileSuggestionItem (1)
function createFileSuggestionItem(filePath, score) {
  return {
    id: `file-${filePath}`,
    displayText: filePath,
    metadata:
      score !== undefined
        ? {
            score,
          }
        : undefined,
  };
}
//@ chunk-x3qn5k1g.js:8646-8730 layout
function scoreSuggestions(e) {
  let sliced = e.slice(0, MAX_FILE_SUGGESTIONS);
  return sliced.map((s, n) => createFileSuggestionItem(s, n / Math.max(sliced.length, 1)));
}
//@ chunk-x3qn5k1g.js:8730-8760 layout
var SUGGESTION_DEBOUNCE_MS = 5000;
var SUGGESTION_MIN_GAP_MS = 1000;
var SUGGESTION_CACHE_TTL_MS = 300000;
//@ chunk-x3qn5k1g.js:8760-9522 facade-exports = startBackgroundCacheRefresh (0.572)
/**
 * 后台刷新文件索引缓存（git ls-files + untracked 合并），完成或失败写调试日志。
 */
function startBackgroundCacheRefresh(cache, storage) {
  if (cache.fileListRefreshPromise || isDiskless()) return;
  let indexMtime = getGitIndexMtime();
  if (cache.fileIndex) {
    if (
      indexMtime === null &&
      cache.lastRefreshMs > 0 &&
      cache.lastScanDurationMs !== null &&
      cache.lastScanDurationMs > SUGGESTION_MIN_GAP_MS
    )
      return;
    if (
      !(indexMtime !== null && indexMtime !== cache.lastGitIndexMtime) &&
      Date.now() - cache.lastRefreshMs < SUGGESTION_DEBOUNCE_MS
    )
      return;
  }
  let generation = cache.cacheGeneration;
  let refreshStart = Date.now();
  cache.fileIndex ??= new FileIndex();
  cache.fileListRefreshPromise = buildTrackedFileIndex(cache, storage)
    .then((result) => {
      if (generation !== cache.cacheGeneration) return result;
      cache.fileListRefreshPromise = null;
      cache.indexBuildComplete.emit();
      cache.lastGitIndexMtime = indexMtime;
      let now = Date.now();
      cache.lastRefreshMs = now;
      cache.lastScanDurationMs = now - refreshStart;
      logForDebugging(`[FileIndex] cache refresh completed in ${cache.lastScanDurationMs}ms`);
      return result;
    })
    .catch((error) => {
      logForDebugging(`[FileIndex] Cache refresh failed: ${errorMessage(error)}`);
      logError(error);
      if (generation === cache.cacheGeneration) cache.fileListRefreshPromise = null;
      return (cache.fileIndex ??= new FileIndex());
    });
}
//@ chunk-x3qn5k1g.js:9522-9762 file-local
async function getDirectoryNames(cwd) {
  let fsImplementation = getFsImplementation();
  try {
    return (await fsImplementation.readdir(cwd)).map((entry) => {
      let fullPath = pathModule.join(cwd, entry.name);
      let relativePath = pathModule.relative(cwd, fullPath);
      return entry.isDirectory() ? relativePath + pathModule.sep : relativePath;
    });
  } catch (error) {
    logForDebugging(`[FileSuggestions] readdir failed for cwd: ${errorMessage(error)}`, {
      level: "error",
    });
    return [];
  }
}
//@ chunk-x3qn5k1g.js:9762-9834 facade-exports
async function generateFileSuggestions(e, partialPath, s = false, n) {
  let { items } = await generateFileSuggestionsWithBase(e, partialPath, s, n);
  return items;
}
//@ chunk-x3qn5k1g.js:9834-10861 facade-exports = generateFileSuggestions (0.84)
/**
 * 生成 @ 文件建议：用缓存的文件索引做模糊匹配（partial/full），远程会话时走 file_suggestions RPC；记录耗时。
 */
async function generateFileSuggestionsWithBase(e, partialPath, s, n, o = true) {
  if (isDiskless())
    return {
      items: [],
      baseDir: undefined,
    };
  if (isRemoteSessionAvailable()) {
    if (!partialPath && !s)
      return {
        items: [],
        baseDir: undefined,
      };
    return {
      items: await findMatchingFiles(partialPath),
      baseDir: undefined,
    };
  }
  let cwd = getCwd();
  if (!partialPath && !s)
    return {
      items: [],
      baseDir: cwd,
    };
  if (
    (o ? resolveFileSuggestionHook(getInitialSettings_2().fileSuggestion) : undefined)?.type === "command"
  ) {
    let input = {
      id: getSessionId(),
      project: {
        originalCwd: getOriginalCwd(),
        projectRoot: getProjectRoot(),
      },
    };
    let input_2 = {
      ...createBaseHookInput(input, cwd),
      query: partialPath,
    };
    let g = await executeFileSuggestionCommand(input, input_2);
    return {
      items: scoreSuggestions(g),
      baseDir: cwd,
    };
  }
  if (partialPath === "" || partialPath === "." || partialPath === "./") {
    let results = await getDirectoryNames(cwd);
    startBackgroundCacheRefresh(e, n);
    return {
      items: scoreSuggestions(results),
      baseDir: cwd,
    };
  }
  let startTime = Date.now();
  try {
    let wasBuilding = e.fileListRefreshPromise !== null;
    startBackgroundCacheRefresh(e, n);
    let normalizedPath = partialPath;
    let currentDirPrefix = "." + pathModule.sep;
    if (partialPath.startsWith(currentDirPrefix)) normalizedPath = partialPath.substring(2);
    if (normalizedPath.startsWith("~")) normalizedPath = expandPath(normalizedPath);
    let matches = e.fileIndex
      ? e.fileIndex
          .search(normalizedPath, MAX_FILE_SUGGESTIONS)
          .map((I) => createFileSuggestionItem(I.path, I.score))
      : [];
    let baseDir = e.indexBaseDir ?? cwd;
    let duration = Date.now() - startTime;
    logForDebugging(
      `[FileIndex] generateFileSuggestions: ${matches.length} results in ${duration}ms (${wasBuilding ? "partial" : "full"} index)`,
    );
    logEvent("tengu_file_suggestions_query", {
      duration_ms: duration,
      cache_hit: !wasBuilding,
      result_count: matches.length,
      query_length: partialPath.length,
    });
    return {
      items: matches,
      baseDir,
    };
  } catch (error) {
    logError(error);
    return {
      items: [],
      baseDir: cwd,
    };
  }
}
//@ chunk-x3qn5k1g.js:10861-11113 callgraph-witnessed = findMatchingFiles (0.19)
async function findMatchingFiles(query) {
  let remoteCaps = getRemoteCaps();
  if (!remoteCaps || !isRemoteControlChannelAvailable()) return [];
  try {
    return (
      await remoteCaps.sendControlRequest({
        subtype: "file_suggestions",
        query,
      })
    ).suggestions.map((result) => createFileSuggestionItem(result.path, result.score));
  } catch (error) {
    logForDebugging(`[FileIndex] remote file_suggestions RPC failed: ${errorMessage(error)}`);
    return [];
  }
}
//@ chunk-x3qn5k1g.js:11113-11332 facade-exports = applyFileSuggestion (0.385)
/**
 * 把选中的文件建议应用到输入：替换 @ token 并移动光标。
 */
function applyFileSuggestion({ suggestion, input, partialPath, startPos, onInputChange, setCursorOffset }) {
  let suggestionText = typeof suggestion === "string" ? suggestion : suggestion.displayText;
  let newInput =
    input.substring(0, startPos) + suggestionText + input.substring(startPos + partialPath.length);
  onInputChange(newInput);
  let newCursorPos = startPos + suggestionText.length;
  setCursorOffset(newCursorPos);
  return newInput;
}
//@ chunk-x3qn5k1g.js:11332-12752 sole-consumer
/**
 * 后台取未跟踪文件（git ls-files --others，可加 .ignore re-include 的 ripgrep 列表），转相对路径、套用 ignore 规则后并入索引；缓存代际变化时丢弃结果。
 */
function fetchUntrackedFiles(cache, repoRoot, cwd, respectGitignore) {
  if (cache.untrackedFetchPromise) return;
  let o = respectGitignore
    ? ["-c", "core.quotepath=false", "ls-files", "--others", "--exclude-standard"]
    : ["-c", "core.quotepath=false", "ls-files", "--others"];
  let cacheGeneration = cache.cacheGeneration;
  let c = respectGitignore && cache.ignoreReincludeGlobs.length > 0;
  let p =
    c && Date.now() >= cache.reincludeRetryAtMs
      ? ripGrep_2(
          [
            "--files",
            "--hidden",
            ...cache.ignoreReincludeGlobs.flatMap((ignoreReincludeGlob) => ["--glob", ignoreReincludeGlob]),
            ...VCS_EXCLUDE_GLOB_ARGS,
          ],
          ".",
          AbortSignal.timeout(1e4),
          {
            cwd: resolveRipgrepSpawnCwd(repoRoot, ripgrepCommand().rgPath),
            rejectOnPartial: true,
          },
        )
          .then((u) => {
            if (cacheGeneration === cache.cacheGeneration) cache.lastReincludedFiles = u;
            return u;
          })
          .catch((error) => {
            logForDebugging(`[FileIndex] .ignore re-include listing failed: ${errorMessage(error)}`);
            if (cacheGeneration === cache.cacheGeneration)
              cache.reincludeRetryAtMs = Date.now() + SUGGESTION_CACHE_TTL_MS;
            return cache.lastReincludedFiles;
          })
      : Promise.resolve(c ? cache.lastReincludedFiles : []);
  cache.untrackedFetchPromise = Promise.all([
    execFileNoThrowWithCwd(gitExe(), o, {
      timeout: 1e4,
      cwd: repoRoot,
    }),
    p,
  ])
    .then(async ([u, f]) => {
      await cache.trackedBuildPromise;
      if (cacheGeneration !== cache.cacheGeneration) return;
      if (u.code !== 0) return;
      let paths = u.stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      for (let F of f.map((I) => pathModule.normalize(I).replaceAll(pathModule.sep, "/")).sort())
        paths.push(F);
      let m = await rebasePaths(paths, repoRoot, cwd);
      let ripgrepIgnorePatterns = await loadRipgrepIgnorePatterns(cache, repoRoot, cwd);
      if (ripgrepIgnorePatterns && m.length > 0) {
        let F = m.length;
        m = await filterIgnored(ripgrepIgnorePatterns, m);
        logForDebugging(`[FileIndex] applied ignore patterns to untracked: ${F} -> ${m.length} files`);
      }
      logForDebugging(
        `[FileIndex] background untracked fetch: ${m.length} files (${f.length} re-included by .ignore)`,
      );
      return mergeUntrackedIntoNormalizedCache(cache, m, cwd);
    })
    .catch((error) => {
      logForDebugging(`[FileIndex] background untracked fetch failed: ${error}`);
    })
    .finally(() => {
      cache.untrackedFetchPromise = null;
    });
}
//@ chunk-1b5x3jje.js:191-202 placement
/**
 * 导出值：MAX_FILE_SUGGESTIONS（15）；位于「@ 文件建议：git ls-files / ripgrep 建项目文件索引、.ignore/.rgignore、后台刷新、模糊匹配生成建议并应用」模块。
 */
var MAX_FILE_SUGGESTIONS = 15;
//@ chunk-axmbhcjg.js:9150-9323 fingerprint = normalizeGitPaths (0.68)
function normalizeGitPaths(files, repoRoot, originalCwd = platformPath) {
  let relativePath = originalCwd.relative(files, repoRoot);
  if (originalCwd.isAbsolute(relativePath)) return null;
  let resolved = originalCwd.resolve(files, relativePath);
  let resolved_2 = originalCwd.resolve(repoRoot);
  return (
    originalCwd === win32 ? resolved.toLowerCase() === resolved_2.toLowerCase() : resolved === resolved_2
  )
    ? relativePath
    : null;
}
//@ chunk-czffketc.js:960-1080 fingerprint = pathListSignature (0.682)
function pathListSignature(paths) {
  return paths.replace(/[^\0-\x7f]/g, (e) => {
    let upper = e.toUpperCase();
    return upper.length === 1 && upper.charCodeAt(0) > 127 ? upper : e;
  });
}
//@ chunk-e6aww6q8.js:3295980-3296114 fingerprint = collectDirectoryNames (0.672)
function collectDirectoryNames(mountRoot, path) {
  let r = [];
  let normalized = posix.normalize(posix.join("/", path));
  for (;;) {
    r.push(normalized === "/" ? mountRoot : posix.join(mountRoot, normalized));
    if (normalized === "/") return r;
    normalized = posix.dirname(normalized);
  }
}
export {
  globalFileIndexCache,
  startBackgroundCacheRefresh,
  findLongestCommonPrefix,
  applyFileSuggestion,
  generateFileSuggestions,
  resetFileIndexCache,
  normalizeGitPaths,
  pathListSignature,
  collectDirectoryNames,
  MAX_FILE_SUGGESTIONS,
};
