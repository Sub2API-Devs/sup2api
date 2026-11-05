/**
 * hooks/fileSuggestions.ts
 *
 * @ 文件建议：git ls-files / ripgrep 建项目文件索引、.ignore/.rgignore、后台刷新、模糊匹配生成建议并应用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/fileSuggestions.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-dyt6bfca.js (35), chunk-f6syse64.js (1), chunk-mrcnh9sb.js (1)
 * attribution: fingerprint 9, sole-consumer 2, facade-exports 7, layout 14, callgraph-fingerprint 1, file-local 2, callgraph-witnessed 1, affinity 1, placement 1
 */
import * as pathModule from "path";
import { posix } from "path";
import { statSync } from "fs";
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_ignore } from "../../vendor/ignore/index.js";
import { createSignal } from "../utils/signal.js";
import { findGitRoot, gitExe } from "../utils/git.js";
import { getCwd } from "../utils/cwd.js";
import { CHUNK_MS, yieldToEventLoop, FileIndex } from "../native-ts/file-index/index.js";
import { logForDebugging } from "../utils/debug.js";
import { getFsImplementation } from "../utils/fsOperations.js";
import { normalizeCaseForComparison_2 } from "../utils/permissions/filesystem.js";
import { filterUsableIgnorePatterns, splitNonEmptyLines } from "../utils/ignorePatterns.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { logEvent } from "../services/analytics/index.js";
import { errorMessage } from "../utils/errors.js";
import { CLAUDE_CONFIG_DIRECTORIES, loadMarkdownFilesCached } from "../utils/markdownConfigLoader.js";
import { ripGrep_2, resolveRipgrepSpawnCwd, ripgrepCommand } from "../utils/ripgrep.js";
import { getInitialSettings } from "../utils/settings/settings.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-mrcnh9sb.js:960-1080 fingerprint (2.1.88 match: pathListSignature, 0.682)
function pathListSignature(paths) {
  return paths.replace(/[^\0-\x7f]/g, (char) => {
    let upper = char.toUpperCase();
    return upper.length === 1 && upper.charCodeAt(0) > 127 ? upper : char;
  });
}
//@ chunk-5xgkngpb.js:3381040-3381174 fingerprint (2.1.88 match: collectDirectoryNames, 0.672)
function collectDirectoryNames(mountRoot, path) {
  let names = [];
  let normalized = posix.normalize(posix.join("/", path));
  for (;;) {
    names.push(normalized === "/" ? mountRoot : posix.join(mountRoot, normalized));
    if (normalized === "/") return names;
    normalized = posix.dirname(normalized);
  }
}
//@ chunk-f6syse64.js:191-202 placement
/**
 * 导出值：MAX_FILE_SUGGESTIONS（15）；位于「@ 文件建议：git ls-files / ripgrep 建项目文件索引、.ignore/.rgignore、后台刷新、模糊匹配生成建议并应用」模块。
 */
var MAX_FILE_SUGGESTIONS = 15;
//@ chunk-dyt6bfca.js:933-951 sole-consumer
var fileSuggestionSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dyt6bfca.js:933", () => {
  fileSuggestionSignal = __toESM(require_ignore(), 1);
});
//@ chunk-dyt6bfca.js:1004-1529 sole-consumer
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
//@ chunk-dyt6bfca.js:1529-1541 facade-exports
var globalFileIndexCache; // deferred: uses createFileIndexCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dyt6bfca.js:1529", () => {
  globalFileIndexCache = createFileIndexCache();
});
//@ chunk-dyt6bfca.js:1541-2079 facade-exports
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
//@ chunk-dyt6bfca.js:2079-2232 fingerprint (2.1.88 match: getPathsForSuggestions, 0.354)
function getPathsForSuggestions(cache, index, paths, indexBaseDir) {
  let loadCount = ++cache.indexLoadCount;
  let load = index.loadFromFileListAsync(paths);
  load.queryable.then(() => {
    if (cache.indexLoadCount === loadCount) cache.indexBaseDir = indexBaseDir;
  });
  return load.done;
}
//@ chunk-dyt6bfca.js:2232-2533 layout
/**
 * 对路径列表做抽样 FNV 哈希，生成"数量:哈希"签名。
 */
function hashPathList(paths) {
  let n_2 = paths.length;
  let stride = Math.max(1, Math.floor(n_2 / 500));
  let hash = -2128831035;
  for (let i = 0; i < n_2; i += stride) {
    let path = paths[i];
    for (let j = 0; j < path.length; j++) hash = ((hash ^ path.charCodeAt(j)) * 16777619) | 0;
    hash = (hash * 16777619) | 0;
  }
  if (n_2 > 0) {
    let last = paths[n_2 - 1];
    for (let j = 0; j < last.length; j++) hash = ((hash ^ last.charCodeAt(j)) * 16777619) | 0;
  }
  return `${n_2}:${(hash >>> 0).toString(16)}`;
}
//@ chunk-dyt6bfca.js:2533-2573 layout
function suggestionCacheKey(baseDir, paths) {
  return `${baseDir}\x00${hashPathList(paths)}`;
}
//@ chunk-dyt6bfca.js:2573-2685 fingerprint (2.1.88 match: getGitIndexMtime, 1)
function getGitIndexMtime() {
  let repoRoot = findGitRoot(getCwd());
  if (!repoRoot) return null;
  try {
    return statSync(pathModule.join(repoRoot, ".git", "index")).mtimeMs;
  } catch {
    return null;
  }
}
//@ chunk-dyt6bfca.js:2685-2921 layout
async function rebasePaths(paths, fromDir, toDir) {
  if (toDir === fromDir) return paths;
  let out = Array(paths.length);
  let chunkStart = performance.now();
  for (let k = 0; k < paths.length; k++) {
    let joined = pathModule.join(fromDir, paths[k]);
    out[k] = pathModule.relative(toDir, joined);
    if ((k & 255) === 255 && performance.now() - chunkStart > CHUNK_MS) {
      await yieldToEventLoop();
      chunkStart = performance.now();
    }
  }
  return out;
}
//@ chunk-dyt6bfca.js:2921-3419 fingerprint (2.1.88 match: mergeUntrackedIntoNormalizedCache, 0.685)
async function mergeUntrackedIntoNormalizedCache(cache, files, cwd) {
  if (files.length === 0) return;
  if (!cache.fileIndex) return;
  let untrackedDirs = await getDirectoryNamesAsync(files);
  if (cache.normalizedTrackedInputs?.cwd !== cwd) return;
  let allPaths = [
    ...cache.cachedTrackedFiles,
    ...cache.cachedConfigFiles,
    ...cache.cachedTrackedDirs,
    ...files,
    ...untrackedDirs,
  ];
  let sig = suggestionCacheKey(cwd, allPaths);
  if (sig === cache.loadedMergedSignature) {
    logForDebugging("[FileIndex] skipped index rebuild \u2014 merged paths unchanged");
    return;
  }
  if (await getPathsForSuggestions(cache, cache.fileIndex, allPaths, cwd)) {
    cache.loadedMergedSignature = sig;
    logForDebugging(
      `[FileIndex] rebuilt index with ${cache.cachedTrackedFiles.length} tracked + ${files.length} untracked files`,
    );
  }
}
//@ chunk-dyt6bfca.js:3419-4129 fingerprint (2.1.88 match: loadRipgrepIgnorePatterns, 0.602)
async function loadRipgrepIgnorePatterns(cache, repoRoot, cwd) {
  let cacheKey = `${repoRoot}:${cwd}`;
  if (cache.ignorePatternsCacheKey === cacheKey) return cache.ignorePatternsCache;
  let fs = getFsImplementation();
  let ignoreFiles = [".ignore", ".rgignore"];
  let roots = normalizeCaseForComparison_2([repoRoot, cwd]);
  let signal = fileSuggestionSignal.default();
  let found = false;
  let hasNegation = false;
  let augmentations = [];
  let rules = [];
  let paths = ignoreFiles.flatMap((dir) => roots.map((root) => pathModule.join(root, dir)));
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
    signal.add(lines);
    found = true;
    let ignoreFile = parseIgnoreFile(
      lines,
      pathModule.relative(repoRoot, pathModule.dirname(paths[i])).replaceAll(pathModule.sep, "/"),
    );
    hasNegation ||= ignoreFile.hasNegation;
    augmentations.push(...ignoreFile.augmentations);
    rules.push(...ignoreFile.rules);
    logForDebugging(`[FileIndex] loaded ignore patterns from ${paths[i]}`);
  }
  let result = found ? signal : null;
  cache.ignorePatternsCache = result;
  cache.ignorePatternsCacheKey = cacheKey;
  cache.ignoreReincludeGlobs = hasNegation ? [...augmentations, ...rules] : [];
  return result;
}
//@ chunk-dyt6bfca.js:4129-4510 layout
/**
 * 把 .ignore/.rgignore 行转成 ripgrep 规则：注释与空行跳过、取反规则记录 re-include glob、其余规则加 "!" 前缀；返回规则、是否有取反、re-include 列表。
 */
function parseIgnoreFile(lines, baseDir) {
  let augmentations = [];
  let rules = [];
  let hasNegation = false;
  let pattern = urlPatternToRegex(baseDir);
  for (let line of lines) {
    let line_2 = line.endsWith("\\ ") ? line : line.trimEnd();
    if (line_2 === "" || line_2.startsWith("#")) continue;
    let isNegation = line_2.startsWith("!");
    let body = isNegation ? line_2.slice(1) : line_2;
    if (body === "") continue;
    let anchored = anchorIgnorePattern(body, pattern);
    if (isNegation) {
      hasNegation = true;
      rules.push(anchored);
      if (!anchored.endsWith("**")) {
        let name = anchored.replace(/\/+$/, "");
        augmentations.push(isRelativeName(name) ? `**/${name}/**` : `${name}/**`);
      }
    } else rules.push(`!${anchored}`);
  }
  return {
    hasNegation,
    augmentations,
    rules,
  };
}
//@ chunk-dyt6bfca.js:4510-4586 layout
function isRelativeName(name) {
  return !name.startsWith("/") && !name.replace(/\/+$/, "").includes("/");
}
//@ chunk-dyt6bfca.js:4586-4664 layout (2.1.88 match: urlPatternToRegex, 1)
function urlPatternToRegex(pattern) {
  return pattern.replace(/[[\]{}*?\\]/g, "\\$&").replace(/^[!#]/, "\\$&");
}
//@ chunk-dyt6bfca.js:4664-4776 layout
function anchorIgnorePattern(pattern, baseDir) {
  if (baseDir === "") return pattern;
  if (pattern.startsWith("/")) return `${baseDir}${pattern}`;
  return isRelativeName(pattern) ? `${baseDir}/**/${pattern}` : `${baseDir}/${pattern}`;
}
//@ chunk-dyt6bfca.js:4776-5002 layout
async function filterIgnored(ignore, paths) {
  let kept = [];
  let startTime = performance.now();
  for (let k = 0; k < paths.length; k++) {
    let path = paths[k];
    if (!fileSuggestionSignal.default.isPathValid(path) || !ignore.ignores(path)) kept.push(path);
    if ((k & 255) === 255 && performance.now() - startTime > CHUNK_MS) {
      await yieldToEventLoop();
      startTime = performance.now();
    }
  }
  return kept;
}
//@ chunk-dyt6bfca.js:5002-6446 fingerprint (2.1.88 match: getFilesUsingGit, 0.779)
/**
 * 用 git ls-files（含子模块，core.quotepath=false）列出已跟踪与未跟踪文件；非 git 仓库返回 null。
 */
async function getFilesUsingGit(cache, abortSignal, respectGitignore, cwd) {
  let startTime = Date.now();
  let cacheGeneration = cache.cacheGeneration;
  logForDebugging("[FileIndex] getFilesUsingGit called");
  let repoRoot = findGitRoot(cwd);
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
    let files;
    let normalizedInputs = null;
    if (
      normalizedTrackedInputs !== null &&
      normalizedTrackedInputs.repoRoot === repoRoot &&
      normalizedTrackedInputs.cwd === cwd &&
      normalizedTrackedInputs.rawStdout === trackedResult.stdout &&
      cache.cachedTrackedFiles.length > 0
    ) {
      files = cache.cachedTrackedFiles;
      logForDebugging("[FileIndex] skipped path normalization \u2014 raw git paths unchanged");
    } else {
      let trackedFiles = trackedResult.stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      files = await rebasePaths(trackedFiles, repoRoot, cwd);
      let ignorePatterns = await loadRipgrepIgnorePatterns(cache, repoRoot, cwd);
      if (ignorePatterns) {
        let beforeCount = files.length;
        files = await filterIgnored(ignorePatterns, files);
        logForDebugging(`[FileIndex] applied ignore patterns: ${beforeCount} -> ${files.length} files`);
      }
      normalizedInputs = {
        repoRoot,
        cwd,
        rawStdout: trackedResult.stdout,
      };
    }
    if (cacheGeneration !== cache.cacheGeneration) {
      logForDebugging("[FileIndex] discarding refresh results \u2014 cache was reset mid-refresh");
      return files;
    }
    if (normalizedInputs !== null) cache.normalizedTrackedInputs = normalizedInputs;
    cache.cachedTrackedFiles = files;
    let duration = Date.now() - startTime;
    logForDebugging(`[FileIndex] git ls-files: ${files.length} tracked files in ${duration}ms`);
    logEvent("tengu_file_suggestions_git_ls_files", {
      file_count: files.length,
      tracked_count: files.length,
      untracked_count: 0,
      duration_ms: duration,
    });
    fetchUntrackedFiles(cache, repoRoot, cwd, respectGitignore);
    return files;
  } catch (error) {
    logForDebugging(`[FileIndex] git ls-files error: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-dyt6bfca.js:6446-6644 callgraph-fingerprint (2.1.88 match: getDirectoryNamesAsync, 1)
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
//@ chunk-dyt6bfca.js:6644-6782 layout
function addParentDirs(files, from, to, directoryNames) {
  for (let index = from; index < to; index++) {
    let dir = pathModule.dirname(files[index]);
    while (dir !== "." && !directoryNames.has(dir)) {
      let dir_2 = pathModule.dirname(dir);
      if (dir_2 === dir) break;
      directoryNames.add(dir);
      dir = dir_2;
    }
  }
}
//@ chunk-dyt6bfca.js:6782-6893 layout
async function listClaudeConfigFiles(cwd, storage) {
  return (
    await Promise.all(CLAUDE_CONFIG_DIRECTORIES.map((dir) => loadMarkdownFilesCached(dir, cwd, storage)))
  ).flatMap((files) => files.map((file) => file.filePath));
}
//@ chunk-dyt6bfca.js:6893-7015 layout (2.1.88 match: VCS_DIRECTORIES_TO_EXCLUDE, 0.922)
/**
 * VCS 目录列表及对应的 rg --glob 排除参数（目录形式与名称形式）。
 */
var VCS_DIRECTORIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var VCS_DIR_EXCLUDE_GLOB_ARGS;
var VCS_EXCLUDE_GLOB_ARGS;
deferInit("chunk-dyt6bfca.js:6893", () => {
  VCS_DIRECTORIES = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"];
  VCS_DIR_EXCLUDE_GLOB_ARGS = VCS_DIRECTORIES.flatMap((dir) => ["--glob", `!${dir}/`]);
  VCS_EXCLUDE_GLOB_ARGS = VCS_DIRECTORIES.flatMap((dir) => ["--glob", `!${dir}`]);
});
//@ chunk-dyt6bfca.js:7015-7642 fingerprint (2.1.88 match: getProjectFiles, 0.929)
/**
 * 获取项目文件列表：优先 git ls-files，失败回落 ripgrep --files（可选尊重 .gitignore）。
 */
async function getProjectFiles(abortSignal, abortSignal_2, respectGitignore, cwd) {
  logForDebugging(`[FileIndex] getProjectFiles called, respectGitignore=${respectGitignore}`);
  let gitFiles = await getFilesUsingGit(abortSignal, abortSignal_2, respectGitignore, cwd);
  if (gitFiles !== null) {
    logForDebugging(`[FileIndex] using git ls-files result (${gitFiles.length} files)`);
    return gitFiles;
  }
  logForDebugging("[FileIndex] git ls-files returned null, falling back to ripgrep");
  abortSignal.normalizedTrackedInputs = null;
  let startTime = Date.now();
  let cacheKey = null;
  let files;
  {
    let rgArgs = ["--files", "--follow", "--hidden", ...VCS_DIR_EXCLUDE_GLOB_ARGS];
    if (!respectGitignore) rgArgs.push("--no-ignore-vcs");
    files = await ripGrep_2(rgArgs, cwd, abortSignal_2, {
      searchOtherAppsData: true,
    });
  }
  let relativePaths = files.map((file) => pathModule.relative(cwd, file));
  let duration = Date.now() - startTime;
  logForDebugging(`[FileIndex] ripgrep: ${relativePaths.length} files in ${duration}ms`);
  logEvent("tengu_file_suggestions_ripgrep", {
    file_count: relativePaths.length,
    duration_ms: duration,
  });
  return relativePaths;
}
//@ chunk-dyt6bfca.js:7642-8293 layout
/**
 * 建立已跟踪文件索引：取项目文件（git 或 ripgrep，尊重 gitignore 设置）与 .claude 配置文件，加入目录名；路径签名没变则跳过重建。10 秒超时。
 */
async function buildTrackedFileIndex(cache, storage) {
  let timeoutSignal = AbortSignal.timeout(1e4);
  let index = (cache.fileIndex ??= new FileIndex());
  let deferred = Promise.withResolvers();
  cache.trackedBuildPromise = deferred.promise;
  try {
    let initialSettings = getInitialSettings();
    let globalConfig = getGlobalConfig();
    let respectGitignore = initialSettings.respectGitignore ?? globalConfig.respectGitignore ?? true;
    let cwd = getCwd();
    let [projectFiles, configFiles] = await Promise.all([
      getProjectFiles(cache, timeoutSignal, respectGitignore, cwd),
      listClaudeConfigFiles(cwd, storage),
    ]);
    cache.cachedConfigFiles = configFiles;
    let files = [...projectFiles, ...configFiles];
    let directoryNames = await getDirectoryNamesAsync(files);
    cache.cachedTrackedDirs = directoryNames;
    let allPaths = [...directoryNames, ...files];
    let signature = suggestionCacheKey(cwd, allPaths);
    if (signature !== cache.loadedTrackedSignature) {
      if (await getPathsForSuggestions(cache, index, allPaths, cwd)) {
        cache.loadedTrackedSignature = signature;
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
  return index;
}
//@ chunk-dyt6bfca.js:8293-8399 file-local
function commonPrefixLength(a, b) {
  let minLength = Math.min(a.length, b.length);
  let i = 0;
  while (i < minLength && a[i] === b[i]) i++;
  return a.substring(0, i);
}
//@ chunk-dyt6bfca.js:8399-8556 facade-exports (2.1.88 match: _temp, 1)
function findLongestCommonPrefix(item) {
  if (item.length === 0) return "";
  let mapped = item.map((item) => item.displayText);
  let prefix = mapped[0];
  for (let k = 1; k < mapped.length; k++) {
    let text = mapped[k];
    prefix = commonPrefixLength(prefix, text);
    if (prefix === "") return "";
  }
  return prefix;
}
//@ chunk-dyt6bfca.js:8556-8646 fingerprint (2.1.88 match: createFileSuggestionItem, 1)
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
//@ chunk-dyt6bfca.js:8646-8730 layout
function scoreSuggestions(paths) {
  let sliced = paths.slice(0, MAX_FILE_SUGGESTIONS);
  return sliced.map((path, index) => createFileSuggestionItem(path, index / Math.max(sliced.length, 1)));
}
//@ chunk-dyt6bfca.js:8730-8760 layout
var SUGGESTION_DEBOUNCE_MS = 5000;
var SUGGESTION_MIN_GAP_MS = 1000;
var SUGGESTION_CACHE_TTL_MS = 300000;
//@ chunk-dyt6bfca.js:8760-9522 facade-exports (2.1.88 match: startBackgroundCacheRefresh, 0.572)
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
//@ chunk-dyt6bfca.js:9522-9762 file-local
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
//@ chunk-dyt6bfca.js:9762-9834 facade-exports
async function generateFileSuggestions(cwd, partialPath, includeDirectories = false, context) {
  let { items } = await generateFileSuggestionsWithBase(cwd, partialPath, includeDirectories, context);
  return items;
}
//@ chunk-dyt6bfca.js:9834-10861 facade-exports (2.1.88 match: generateFileSuggestions, 0.84)
/**
 * 生成 @ 文件建议：用缓存的文件索引做模糊匹配（partial/full），远程会话时走 file_suggestions RPC；记录耗时。
 */
async function generateFileSuggestionsWithBase(
  cwd,
  partialPath,
  includeDirectories,
  context,
  useHook = true,
) {
  if (isDiskless())
    return {
      items: [],
      baseDir: undefined,
    };
  if (isRemoteSessionAvailable()) {
    if (!partialPath && !includeDirectories)
      return {
        items: [],
        baseDir: undefined,
      };
    return {
      items: await findMatchingFiles(partialPath),
      baseDir: undefined,
    };
  }
  let cwd_2 = getCwd();
  if (!partialPath && !includeDirectories)
    return {
      items: [],
      baseDir: cwd_2,
    };
  if (
    (useHook ? resolveFileSuggestionHook(getInitialSettings().fileSuggestion) : undefined)?.type === "command"
  ) {
    let input = {
      id: getSessionId(),
      project: {
        originalCwd: getOriginalCwd(),
        projectRoot: getProjectRoot(),
      },
    };
    let input_2 = {
      ...createBaseHookInput(input, cwd_2),
      query: partialPath,
    };
    let hooked = await executeFileSuggestionCommand(input, input_2);
    return {
      items: scoreSuggestions(hooked),
      baseDir: cwd_2,
    };
  }
  if (partialPath === "" || partialPath === "." || partialPath === "./") {
    let results = await getDirectoryNames(cwd_2);
    startBackgroundCacheRefresh(cwd, context);
    return {
      items: scoreSuggestions(results),
      baseDir: cwd_2,
    };
  }
  let startTime = Date.now();
  try {
    let wasBuilding = cwd.fileListRefreshPromise !== null;
    startBackgroundCacheRefresh(cwd, context);
    let normalizedPath = partialPath;
    let currentDirPrefix = "." + pathModule.sep;
    if (partialPath.startsWith(currentDirPrefix)) normalizedPath = partialPath.substring(2);
    if (normalizedPath.startsWith("~")) normalizedPath = expandPath(normalizedPath);
    let matches = cwd.fileIndex
      ? cwd.fileIndex
          .search(normalizedPath, MAX_FILE_SUGGESTIONS)
          .map((item) => createFileSuggestionItem(item.path, item.score))
      : [];
    let baseDir = cwd.indexBaseDir ?? cwd_2;
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
      baseDir: cwd_2,
    };
  }
}
//@ chunk-dyt6bfca.js:10861-11113 callgraph-witnessed (2.1.88 match: findMatchingFiles, 0.19)
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
//@ chunk-dyt6bfca.js:11113-11332 facade-exports (2.1.88 match: applyFileSuggestion, 0.385)
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
//@ chunk-dyt6bfca.js:11332-12752 affinity
/**
 * 后台取未跟踪文件（git ls-files --others，可加 .ignore re-include 的 ripgrep 列表），转相对路径、套用 ignore 规则后并入索引；缓存代际变化时丢弃结果。
 */
function fetchUntrackedFiles(cache, repoRoot, cwd, respectGitignore) {
  if (cache.untrackedFetchPromise) return;
  let ignorePrefix = respectGitignore
    ? ["-c", "core.quotepath=false", "ls-files", "--others", "--exclude-standard"]
    : ["-c", "core.quotepath=false", "ls-files", "--others"];
  let cacheGeneration = cache.cacheGeneration;
  let hasReinclude = respectGitignore && cache.ignoreReincludeGlobs.length > 0;
  let untrackedPromise =
    hasReinclude && Date.now() >= cache.reincludeRetryAtMs
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
          .then((untracked) => {
            if (cacheGeneration === cache.cacheGeneration) cache.lastReincludedFiles = untracked;
            return untracked;
          })
          .catch((error) => {
            logForDebugging(`[FileIndex] .ignore re-include listing failed: ${errorMessage(error)}`);
            if (cacheGeneration === cache.cacheGeneration)
              cache.reincludeRetryAtMs = Date.now() + SUGGESTION_CACHE_TTL_MS;
            return cache.lastReincludedFiles;
          })
      : Promise.resolve(hasReinclude ? cache.lastReincludedFiles : []);
  cache.untrackedFetchPromise = Promise.all([
    execFileNoThrowWithCwd(gitExe(), ignorePrefix, {
      timeout: 1e4,
      cwd: repoRoot,
    }),
    untrackedPromise,
  ])
    .then(async ([tracked, untrackedRaw]) => {
      await cache.trackedBuildPromise;
      if (cacheGeneration !== cache.cacheGeneration) return;
      if (tracked.code !== 0) return;
      let paths = tracked.stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      for (let path of untrackedRaw
        .map((path_) => pathModule.normalize(path_).replaceAll(pathModule.sep, "/"))
        .sort())
        paths.push(path);
      let rebased = await rebasePaths(paths, repoRoot, cwd);
      let ignore = await loadRipgrepIgnorePatterns(cache, repoRoot, cwd);
      if (ignore && rebased.length > 0) {
        let count_ = rebased.length;
        rebased = await filterIgnored(ignore, rebased);
        logForDebugging(
          `[FileIndex] applied ignore patterns to untracked: ${count_} -> ${rebased.length} files`,
        );
      }
      logForDebugging(
        `[FileIndex] background untracked fetch: ${rebased.length} files (${untrackedRaw.length} re-included by .ignore)`,
      );
      return mergeUntrackedIntoNormalizedCache(cache, rebased, cwd);
    })
    .catch((error) => {
      logForDebugging(`[FileIndex] background untracked fetch failed: ${error}`);
    })
    .finally(() => {
      cache.untrackedFetchPromise = null;
    });
}
export {
  collectDirectoryNames,
  generateFileSuggestions,
  globalFileIndexCache,
  resetFileIndexCache,
  startBackgroundCacheRefresh,
  findLongestCommonPrefix,
  applyFileSuggestion,
  pathListSignature,
  MAX_FILE_SUGGESTIONS,
  generateFileSuggestionsWithBase,
};
