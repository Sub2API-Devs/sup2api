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
import {
  win32,
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
} from "path";
import { Re } from "../../runtime/bun-runtime.js";
import { Vpe } from "../../vendor/ignore/index.js";
import { createSignal } from "../utils/signal.js";
import { findGitRoot, gitExe } from "../utils/git.js";
import { getCwd } from "../utils/cwd.js";
import { CHUNK_MS, yieldToEventLoop, FileIndex } from "../native-ts/file-index/index.js";
import { logForDebugging } from "../utils/debug.js";
import { getFsImplementation } from "../utils/fsOperations.js";
import { uniq } from "../utils/collections.js";
import { xst, wAt } from "../utils/ignorePatterns.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { logEvent } from "../services/analytics/index.js";
import { errorMessage } from "../utils/errors.js";
import { CLAUDE_CONFIG_DIRECTORIES, loadMarkdownFilesCached } from "../utils/markdownConfigLoader.js";
import { ripGrep, resolveRipgrepSpawnCwd, ripgrepCommand } from "../utils/ripgrep.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { getGlobalConfig } from "../utils/config.js";
import { isDiskless, getSessionId, getOriginalCwd, getProjectRoot } from "../bootstrap/state.js";
import { logError } from "../utils/log.js";
import { wt, Jn, ml } from "../remote/remoteMode.js";
import { NBr } from "../utils/hooks/hookPolicy.js";
import { createBaseHookInput, executeFileSuggestionCommand } from "../utils/hooks.js";
import { expandPath } from "../utils/path.js";
import { platformPath } from "../utils/posixPaths.js";

//@ chunk-x3qn5k1g.js:933-951 sole-consumer
var P = Re(Vpe(), 1);
/**
 * 创建文件建议索引缓存的初始状态。
 */
//@ chunk-x3qn5k1g.js:1004-1529 sole-consumer
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
function resetFileIndexCache(e) {
  ((e.fileIndex = null),
    (e.fileListRefreshPromise = null),
    e.cacheGeneration++,
    (e.untrackedFetchPromise = null),
    (e.cachedTrackedFiles = []),
    (e.cachedConfigFiles = []),
    (e.cachedTrackedDirs = []),
    (e.ignorePatternsCache = null),
    (e.ignorePatternsCacheKey = null),
    (e.ignoreReincludeGlobs = []),
    (e.lastReincludedFiles = []),
    (e.reincludeRetryAtMs = 0),
    (e.trackedBuildPromise = null),
    (e.lastRefreshMs = 0),
    (e.lastScanDurationMs = null),
    (e.lastGitIndexMtime = null),
    (e.loadedTrackedSignature = null),
    (e.loadedMergedSignature = null),
    (e.normalizedTrackedInputs = null),
    (e.indexBaseDir = null),
    e.indexLoadCount++);
}
//@ chunk-x3qn5k1g.js:2079-2232 fingerprint = getPathsForSuggestions (0.353)
function getPathsForSuggestions(e, i, s, n) {
  let o = ++e.indexLoadCount,
    fromFileListAsync = i.loadFromFileListAsync(s);
  return (
    fromFileListAsync.queryable.then(() => {
      if (e.indexLoadCount === o) e.indexBaseDir = n;
    }),
    fromFileListAsync.done
  );
}
/**
 * 对路径列表做抽样 FNV 哈希，生成"数量:哈希"签名。
 */
//@ chunk-x3qn5k1g.js:2232-2533 layout
function hashPathList(e) {
  let i = e.length,
    max = Math.max(1, Math.floor(i / 500)),
    n = -2128831035;
  for (let o = 0; o < i; o += max) {
    let r = e[o];
    for (let c = 0; c < r.length; c++) n = ((n ^ r.charCodeAt(c)) * 16777619) | 0;
    n = (n * 16777619) | 0;
  }
  if (i > 0) {
    let o = e[i - 1];
    for (let r = 0; r < o.length; r++) n = ((n ^ o.charCodeAt(r)) * 16777619) | 0;
  }
  return `${i}:${(n >>> 0).toString(16)}`;
}
//@ chunk-x3qn5k1g.js:2533-2573 layout
function D(e, i) {
  return `${e}\x00${hashPathList(i)}`;
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
  let n = Array(paths.length),
    startTime = performance.now();
  for (let r = 0; r < paths.length; r++) {
    let joined = pathModule.join(fromDir, paths[r]);
    if (
      ((n[r] = pathModule.relative(toDir, joined)),
      (r & 255) === 255 && performance.now() - startTime > CHUNK_MS)
    )
      (await yieldToEventLoop(), (startTime = performance.now()));
  }
  return n;
}
//@ chunk-x3qn5k1g.js:2921-3419 fingerprint = mergeUntrackedIntoNormalizedCache (0.685)
async function mergeUntrackedIntoNormalizedCache(e, i, s) {
  if (i.length === 0) return;
  if (!e.fileIndex) return;
  let untrackedDirs = await getDirectoryNamesAsync(i);
  if (e.normalizedTrackedInputs?.cwd !== s) return;
  let allPaths = [
      ...e.cachedTrackedFiles,
      ...e.cachedConfigFiles,
      ...e.cachedTrackedDirs,
      ...i,
      ...untrackedDirs,
    ],
    r = D(s, allPaths);
  if (r === e.loadedMergedSignature) {
    logForDebugging("[FileIndex] skipped index rebuild \u2014 merged paths unchanged");
    return;
  }
  if (await getPathsForSuggestions(e, e.fileIndex, allPaths, s))
    ((e.loadedMergedSignature = r),
      logForDebugging(
        `[FileIndex] rebuilt index with ${e.cachedTrackedFiles.length} tracked + ${i.length} untracked files`,
      ));
}
//@ chunk-x3qn5k1g.js:3419-4129 fingerprint = loadRipgrepIgnorePatterns (0.602)
async function loadRipgrepIgnorePatterns(e, i, s) {
  let cacheKey = `${i}:${s}`;
  if (e.ignorePatternsCacheKey === cacheKey) return e.ignorePatternsCache;
  let fs = getFsImplementation(),
    ignoreFiles = [".ignore", ".rgignore"],
    c = uniq([i, s]),
    p = P.default(),
    u = !1,
    f = !1,
    g = [],
    m = [],
    paths = ignoreFiles.flatMap((dir) => c.map((C) => pathModule.join(C, dir))),
    contents = await Promise.all(paths.map((S) => fs.readFile(S, { encoding: "utf8" }).catch(() => null)));
  for (let [S, C] of contents.entries()) {
    if (C === null) continue;
    let b = xst(wAt(C), "file_suggestions_ignore");
    (p.add(b), (u = !0));
    let k = parseIgnoreFile(
      b,
      pathModule.relative(i, pathModule.dirname(paths[S])).replaceAll(pathModule.sep, "/"),
    );
    ((f ||= k.hasNegation),
      g.push(...k.augmentations),
      m.push(...k.rules),
      logForDebugging(`[FileIndex] loaded ignore patterns from ${paths[S]}`));
  }
  let result = u ? p : null;
  return (
    (e.ignorePatternsCache = result),
    (e.ignorePatternsCacheKey = cacheKey),
    (e.ignoreReincludeGlobs = f ? [...g, ...m] : []),
    result
  );
}
/**
 * 把 .ignore/.rgignore 行转成 ripgrep 规则：注释与空行跳过、取反规则记录 re-include glob、其余规则加 "!" 前缀；返回规则、是否有取反、re-include 列表。
 */
//@ chunk-x3qn5k1g.js:4129-4510 layout
function parseIgnoreFile(lines, baseDir) {
  let s = [],
    n = [],
    o = !1,
    r = urlPatternToRegex(baseDir);
  for (let c of lines) {
    let p = c.endsWith("\\ ") ? c : c.trimEnd();
    if (p === "" || p.startsWith("#")) continue;
    let startsWith = p.startsWith("!"),
      f = startsWith ? p.slice(1) : p;
    if (f === "") continue;
    let g = anchorIgnorePattern(f, r);
    if (startsWith) {
      if (((o = !0), n.push(g), !g.endsWith("**"))) {
        let replaced = g.replace(/\/+$/, "");
        s.push(M(replaced) ? `**/${replaced}/**` : `${replaced}/**`);
      }
    } else n.push(`!${g}`);
  }
  return { hasNegation: o, augmentations: s, rules: n };
}
//@ chunk-x3qn5k1g.js:4510-4586 layout
function M(e) {
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
  return M(e) ? `${i}/**/${e}` : `${i}/${e}`;
}
//@ chunk-x3qn5k1g.js:4776-5002 layout
async function filterIgnored(e, i) {
  let s = [],
    startTime = performance.now();
  for (let o = 0; o < i.length; o++) {
    let r = i[o];
    if (!P.default.isPathValid(r) || !e.ignores(r)) s.push(r);
    if ((o & 255) === 255 && performance.now() - startTime > CHUNK_MS)
      (await yieldToEventLoop(), (startTime = performance.now()));
  }
  return s;
}
/**
 * 用 git ls-files（含子模块，core.quotepath=false）列出已跟踪与未跟踪文件；非 git 仓库返回 null。
 */
//@ chunk-x3qn5k1g.js:5002-6446 fingerprint = getFilesUsingGit (0.778)
async function getFilesUsingGit(e, i, s, n) {
  let startTime = Date.now(),
    cacheGeneration = e.cacheGeneration;
  logForDebugging("[FileIndex] getFilesUsingGit called");
  let repoRoot = findGitRoot(n);
  if (!repoRoot) return (logForDebugging("[FileIndex] not a git repo, returning null"), null);
  try {
    let lsFilesStart = Date.now(),
      trackedResult = await execFileNoThrowWithCwd(
        gitExe(),
        ["-c", "core.quotepath=false", "ls-files", "--recurse-submodules"],
        { timeout: 5000, abortSignal: i, cwd: repoRoot },
      );
    if (
      (logForDebugging(`[FileIndex] git ls-files (tracked) took ${Date.now() - lsFilesStart}ms`),
      trackedResult.code !== 0)
    )
      return (
        logForDebugging(
          `[FileIndex] git ls-files failed (code=${trackedResult.code}, stderr=${trackedResult.stderr}), falling back to ripgrep`,
        ),
        null
      );
    let normalizedTrackedInputs = e.normalizedTrackedInputs,
      g,
      m = null;
    if (
      normalizedTrackedInputs !== null &&
      normalizedTrackedInputs.repoRoot === repoRoot &&
      normalizedTrackedInputs.cwd === n &&
      normalizedTrackedInputs.rawStdout === trackedResult.stdout &&
      e.cachedTrackedFiles.length > 0
    )
      ((g = e.cachedTrackedFiles),
        logForDebugging("[FileIndex] skipped path normalization \u2014 raw git paths unchanged"));
    else {
      let trackedFiles = trackedResult.stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      g = await rebasePaths(trackedFiles, repoRoot, n);
      let I = await loadRipgrepIgnorePatterns(e, repoRoot, n);
      if (I) {
        let beforeCount = g.length;
        ((g = await filterIgnored(I, g)),
          logForDebugging(`[FileIndex] applied ignore patterns: ${beforeCount} -> ${g.length} files`));
      }
      m = { repoRoot: repoRoot, cwd: n, rawStdout: trackedResult.stdout };
    }
    if (cacheGeneration !== e.cacheGeneration)
      return (
        logForDebugging("[FileIndex] discarding refresh results \u2014 cache was reset mid-refresh"),
        g
      );
    if (m !== null) e.normalizedTrackedInputs = m;
    e.cachedTrackedFiles = g;
    let duration = Date.now() - startTime;
    return (
      logForDebugging(`[FileIndex] git ls-files: ${g.length} tracked files in ${duration}ms`),
      logEvent("tengu_file_suggestions_git_ls_files", {
        file_count: g.length,
        tracked_count: g.length,
        untracked_count: 0,
        duration_ms: duration,
      }),
      fetchUntrackedFiles(e, repoRoot, n, s),
      g
    );
  } catch (error) {
    return (logForDebugging(`[FileIndex] git ls-files error: ${errorMessage(error)}`), null);
  }
}
//@ chunk-x3qn5k1g.js:6446-6644 callgraph-fingerprint = getDirectoryNamesAsync (1)
async function getDirectoryNamesAsync(files) {
  let directoryNames = new Set(),
    chunkStart = performance.now();
  for (let n = 0; n < files.length; n++)
    if (
      (addParentDirs(files, n, n + 1, directoryNames),
      (n & 255) === 255 && performance.now() - chunkStart > CHUNK_MS)
    )
      (await yieldToEventLoop(), (chunkStart = performance.now()));
  return [...directoryNames].map((n) => n + pathModule.sep);
}
//@ chunk-x3qn5k1g.js:6644-6782 layout
function addParentDirs(e, i, s, n) {
  for (let o = i; o < s; o++) {
    let dir = pathModule.dirname(e[o]);
    while (dir !== "." && !n.has(dir)) {
      let dir_2 = pathModule.dirname(dir);
      if (dir_2 === dir) break;
      (n.add(dir), (dir = dir_2));
    }
  }
}
//@ chunk-x3qn5k1g.js:6782-6893 layout
async function listClaudeConfigFiles(e, i) {
  return (await Promise.all(CLAUDE_CONFIG_DIRECTORIES.map((n) => loadMarkdownFilesCached(n, e, i)))).flatMap(
    (n) => n.map((o) => o.filePath),
  );
}
/**
 * VCS 目录列表及对应的 rg --glob 排除参数（目录形式与名称形式）。
 */
//@ chunk-x3qn5k1g.js:6893-7015 layout = VCS_DIRECTORIES_TO_EXCLUDE (0.922)
var VCS_DIRECTORIES = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"],
  VCS_DIR_EXCLUDE_GLOB_ARGS = VCS_DIRECTORIES.flatMap((e) => ["--glob", `!${e}/`]),
  VCS_EXCLUDE_GLOB_ARGS = VCS_DIRECTORIES.flatMap((e) => ["--glob", `!${e}`]);
/**
 * 获取项目文件列表：优先 git ls-files，失败回落 ripgrep --files（可选尊重 .gitignore）。
 */
//@ chunk-x3qn5k1g.js:7015-7642 fingerprint = getProjectFiles (0.929)
async function getProjectFiles(e, i, s, n) {
  logForDebugging(`[FileIndex] getProjectFiles called, respectGitignore=${s}`);
  let o = await getFilesUsingGit(e, i, s, n);
  if (o !== null) return (logForDebugging(`[FileIndex] using git ls-files result (${o.length} files)`), o);
  (logForDebugging("[FileIndex] git ls-files returned null, falling back to ripgrep"),
    (e.normalizedTrackedInputs = null));
  let startTime = Date.now(),
    c = null,
    p;
  {
    let g = ["--files", "--follow", "--hidden", ...VCS_DIR_EXCLUDE_GLOB_ARGS];
    if (!s) g.push("--no-ignore-vcs");
    p = await ripGrep(g, n, i, { searchOtherAppsData: !0 });
  }
  let relativePaths = p.map((g) => pathModule.relative(n, g)),
    duration = Date.now() - startTime;
  return (
    logForDebugging(`[FileIndex] ripgrep: ${relativePaths.length} files in ${duration}ms`),
    logEvent("tengu_file_suggestions_ripgrep", { file_count: relativePaths.length, duration_ms: duration }),
    relativePaths
  );
}
/**
 * 建立已跟踪文件索引：取项目文件（git 或 ripgrep，尊重 gitignore 设置）与 .claude 配置文件，加入目录名；路径签名没变则跳过重建。10 秒超时。
 */
//@ chunk-x3qn5k1g.js:7642-8293 layout
async function buildTrackedFileIndex(cache, storage) {
  let timeout = AbortSignal.timeout(1e4),
    n = (cache.fileIndex ??= new FileIndex()),
    withResolvers = Promise.withResolvers();
  cache.trackedBuildPromise = withResolvers.promise;
  try {
    let r = getInitialSettings_2(),
      c = getGlobalConfig(),
      p = r.respectGitignore ?? c.respectGitignore ?? !0,
      u = getCwd(),
      [f, g] = await Promise.all([getProjectFiles(cache, timeout, p, u), listClaudeConfigFiles(u, storage)]);
    cache.cachedConfigFiles = g;
    let m = [...f, ...g],
      x = await getDirectoryNamesAsync(m);
    cache.cachedTrackedDirs = x;
    let F = [...x, ...m],
      I = D(u, F);
    if (I !== cache.loadedTrackedSignature) {
      if (await getPathsForSuggestions(cache, n, F, u))
        ((cache.loadedTrackedSignature = I), (cache.loadedMergedSignature = null));
    } else logForDebugging("[FileIndex] skipped index rebuild \u2014 tracked paths unchanged");
  } catch (error) {
    logForDebugging(`[FileIndex] getPathsForSuggestions failed: ${errorMessage(error)}`, { level: "error" });
  } finally {
    withResolvers.resolve();
  }
  return n;
}
//@ chunk-x3qn5k1g.js:8293-8399 file-local
function commonPrefixLength(a, b) {
  let minLength = Math.min(a.length, b.length),
    n = 0;
  while (n < minLength && a[n] === b[n]) n++;
  return a.substring(0, n);
}
//@ chunk-x3qn5k1g.js:8399-8556 facade-exports = _temp (1)
function findLongestCommonPrefix(item) {
  if (item.length === 0) return "";
  let mapped = item.map((n) => n.displayText),
    s = mapped[0];
  for (let n = 1; n < mapped.length; n++) {
    let o = mapped[n];
    if (((s = commonPrefixLength(s, o)), s === "")) return "";
  }
  return s;
}
//@ chunk-x3qn5k1g.js:8556-8646 fingerprint = createFileSuggestionItem (1)
function createFileSuggestionItem(filePath, score) {
  return {
    id: `file-${filePath}`,
    displayText: filePath,
    metadata: score !== void 0 ? { score: score } : void 0,
  };
}
//@ chunk-x3qn5k1g.js:8646-8730 layout
function y(e) {
  let sliced = e.slice(0, Byt);
  return sliced.map((s, n) => createFileSuggestionItem(s, n / Math.max(sliced.length, 1)));
}
//@ chunk-x3qn5k1g.js:8730-8760 layout
var ne = 5000,
  ie = 1000,
  re = 300000;
/**
 * 后台刷新文件索引缓存（git ls-files + untracked 合并），完成或失败写调试日志。
 */
//@ chunk-x3qn5k1g.js:8760-9522 facade-exports = startBackgroundCacheRefresh (0.572)
function startBackgroundCacheRefresh(e, i) {
  if (e.fileListRefreshPromise || isDiskless()) return;
  let indexMtime = getGitIndexMtime();
  if (e.fileIndex) {
    if (
      indexMtime === null &&
      e.lastRefreshMs > 0 &&
      e.lastScanDurationMs !== null &&
      e.lastScanDurationMs > ie
    )
      return;
    if (!(indexMtime !== null && indexMtime !== e.lastGitIndexMtime) && Date.now() - e.lastRefreshMs < ne)
      return;
  }
  let cacheGeneration = e.cacheGeneration,
    refreshStart = Date.now();
  ((e.fileIndex ??= new FileIndex()),
    (e.fileListRefreshPromise = buildTrackedFileIndex(e, i)
      .then((result) => {
        if (cacheGeneration !== e.cacheGeneration) return result;
        ((e.fileListRefreshPromise = null), e.indexBuildComplete.emit(), (e.lastGitIndexMtime = indexMtime));
        let now = Date.now();
        return (
          (e.lastRefreshMs = now),
          (e.lastScanDurationMs = now - refreshStart),
          logForDebugging(`[FileIndex] cache refresh completed in ${e.lastScanDurationMs}ms`),
          result
        );
      })
      .catch((error) => {
        if (
          (logForDebugging(`[FileIndex] Cache refresh failed: ${errorMessage(error)}`),
          logError(error),
          cacheGeneration === e.cacheGeneration)
        )
          e.fileListRefreshPromise = null;
        return (e.fileIndex ??= new FileIndex());
      })));
}
//@ chunk-x3qn5k1g.js:9522-9762 file-local
async function getDirectoryNames(files) {
  let i = getFsImplementation();
  try {
    return (await i.readdir(files)).map((n) => {
      let joined = pathModule.join(files, n.name),
        relativePath = pathModule.relative(files, joined);
      return n.isDirectory() ? relativePath + pathModule.sep : relativePath;
    });
  } catch (error) {
    return (
      logForDebugging(`[FileSuggestions] readdir failed for cwd: ${errorMessage(error)}`, { level: "error" }),
      []
    );
  }
}
//@ chunk-x3qn5k1g.js:9762-9834 facade-exports
async function generateFileSuggestions(e, i, s = !1, n) {
  let { items: items } = await generateFileSuggestionsWithBase(e, i, s, n);
  return items;
}
/**
 * 生成 @ 文件建议：用缓存的文件索引做模糊匹配（partial/full），远程会话时走 file_suggestions RPC；记录耗时。
 */
//@ chunk-x3qn5k1g.js:9834-10861 facade-exports = generateFileSuggestions (0.84)
async function generateFileSuggestionsWithBase(e, i, s, n, o = !0) {
  if (isDiskless()) return { items: [], baseDir: void 0 };
  if (wt()) {
    if (!i && !s) return { items: [], baseDir: void 0 };
    return { items: await findMatchingFiles(i), baseDir: void 0 };
  }
  let r = getCwd();
  if (!i && !s) return { items: [], baseDir: r };
  if ((o ? NBr(getInitialSettings_2().fileSuggestion) : void 0)?.type === "command") {
    let u = { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
      input = { ...createBaseHookInput(u, r), query: i },
      g = await executeFileSuggestionCommand(u, input);
    return { items: y(g), baseDir: r };
  }
  if (i === "" || i === "." || i === "./") {
    let results = await getDirectoryNames(r);
    return (startBackgroundCacheRefresh(e, n), { items: y(results), baseDir: r });
  }
  let startTime = Date.now();
  try {
    let u = e.fileListRefreshPromise !== null;
    startBackgroundCacheRefresh(e, n);
    let normalizedPath = i,
      g = "." + pathModule.sep;
    if (i.startsWith(g)) normalizedPath = i.substring(2);
    if (normalizedPath.startsWith("~")) normalizedPath = expandPath(normalizedPath);
    let matches = e.fileIndex
        ? e.fileIndex.search(normalizedPath, Byt).map((I) => createFileSuggestionItem(I.path, I.score))
        : [],
      x = e.indexBaseDir ?? r,
      F = Date.now() - startTime;
    return (
      logForDebugging(
        `[FileIndex] generateFileSuggestions: ${matches.length} results in ${F}ms (${u ? "partial" : "full"} index)`,
      ),
      logEvent("tengu_file_suggestions_query", {
        duration_ms: F,
        cache_hit: !u,
        result_count: matches.length,
        query_length: i.length,
      }),
      { items: matches, baseDir: x }
    );
  } catch (error) {
    return (logError(error), { items: [], baseDir: r });
  }
}
//@ chunk-x3qn5k1g.js:10861-11113 callgraph-witnessed = findMatchingFiles (0.19)
async function findMatchingFiles(e) {
  let i = Jn();
  if (!i || !ml()) return [];
  try {
    return (await i.sendControlRequest({ subtype: "file_suggestions", query: e })).suggestions.map((result) =>
      createFileSuggestionItem(result.path, result.score),
    );
  } catch (error) {
    return (logForDebugging(`[FileIndex] remote file_suggestions RPC failed: ${errorMessage(error)}`), []);
  }
}
/**
 * 把选中的文件建议应用到输入：替换 @ token 并移动光标。
 */
//@ chunk-x3qn5k1g.js:11113-11332 facade-exports = applyFileSuggestion (0.385)
function applyFileSuggestion({
  suggestion: suggestion,
  input: input,
  partialPath: partialPath,
  startPos: startPos,
  onInputChange: onInputChange,
  setCursorOffset: setCursorOffset,
}) {
  let suggestionText = typeof suggestion === "string" ? suggestion : suggestion.displayText,
    p = input.substring(0, startPos) + suggestionText + input.substring(startPos + partialPath.length);
  onInputChange(p);
  let u = startPos + suggestionText.length;
  return (setCursorOffset(u), p);
}
/**
 * 后台取未跟踪文件（git ls-files --others，可加 .ignore re-include 的 ripgrep 列表），转相对路径、套用 ignore 规则后并入索引；缓存代际变化时丢弃结果。
 */
//@ chunk-x3qn5k1g.js:11332-12752 sole-consumer
function fetchUntrackedFiles(cache, repoRoot, cwd, respectGitignore) {
  if (cache.untrackedFetchPromise) return;
  let o = respectGitignore
      ? ["-c", "core.quotepath=false", "ls-files", "--others", "--exclude-standard"]
      : ["-c", "core.quotepath=false", "ls-files", "--others"],
    cacheGeneration = cache.cacheGeneration,
    c = respectGitignore && cache.ignoreReincludeGlobs.length > 0,
    p =
      c && Date.now() >= cache.reincludeRetryAtMs
        ? ripGrep(
            [
              "--files",
              "--hidden",
              ...cache.ignoreReincludeGlobs.flatMap((ignoreReincludeGlob) => ["--glob", ignoreReincludeGlob]),
              ...VCS_EXCLUDE_GLOB_ARGS,
            ],
            ".",
            AbortSignal.timeout(1e4),
            { cwd: resolveRipgrepSpawnCwd(repoRoot, ripgrepCommand().rgPath), rejectOnPartial: !0 },
          )
            .then((u) => {
              if (cacheGeneration === cache.cacheGeneration) cache.lastReincludedFiles = u;
              return u;
            })
            .catch((u) => {
              if (
                (logForDebugging(`[FileIndex] .ignore re-include listing failed: ${errorMessage(u)}`),
                cacheGeneration === cache.cacheGeneration)
              )
                cache.reincludeRetryAtMs = Date.now() + re;
              return cache.lastReincludedFiles;
            })
        : Promise.resolve(c ? cache.lastReincludedFiles : []);
  cache.untrackedFetchPromise = Promise.all([
    execFileNoThrowWithCwd(gitExe(), o, { timeout: 1e4, cwd: repoRoot }),
    p,
  ])
    .then(async ([u, f]) => {
      if ((await cache.trackedBuildPromise, cacheGeneration !== cache.cacheGeneration)) return;
      if (u.code !== 0) return;
      let filtered = u.stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      for (let F of f.map((I) => pathModule.normalize(I).replaceAll(pathModule.sep, "/")).sort())
        filtered.push(F);
      let m = await rebasePaths(filtered, repoRoot, cwd),
        x = await loadRipgrepIgnorePatterns(cache, repoRoot, cwd);
      if (x && m.length > 0) {
        let F = m.length;
        ((m = await filterIgnored(x, m)),
          logForDebugging(`[FileIndex] applied ignore patterns to untracked: ${F} -> ${m.length} files`));
      }
      return (
        logForDebugging(
          `[FileIndex] background untracked fetch: ${m.length} files (${f.length} re-included by .ignore)`,
        ),
        mergeUntrackedIntoNormalizedCache(cache, m, cwd)
      );
    })
    .catch((u) => {
      logForDebugging(`[FileIndex] background untracked fetch failed: ${u}`);
    })
    .finally(() => {
      cache.untrackedFetchPromise = null;
    });
}
//@ chunk-1b5x3jje.js:191-202 placement
var Byt = 15;
//@ chunk-axmbhcjg.js:9150-9323 fingerprint = normalizeGitPaths (0.68)
function normalizeGitPaths(files, repoRoot, originalCwd = platformPath) {
  let relativePath = originalCwd.relative(files, repoRoot);
  if (originalCwd.isAbsolute(relativePath)) return null;
  let resolved = originalCwd.resolve(files, relativePath),
    resolved_2 = originalCwd.resolve(repoRoot);
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
function collectDirectoryNames(e, n) {
  let r = [],
    normalized = posix_9.normalize(posix_9.join("/", n));
  for (;;) {
    if ((r.push(normalized === "/" ? e : posix_9.join(e, normalized)), normalized === "/")) return r;
    normalized = posix_9.dirname(normalized);
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
  Byt,
};
