/**
 * utils/glob.ts
 *
 * Glob 实现：绝对模式拆分、ripgrep --files 调用、deny 规则过滤与分页
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/glob.ts
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 4, fingerprint 2, layout 3
 */
import { normalize, join, relative, sep, isAbsolute, dirname, basename } from "path";
import { realpath } from "fs/promises";
import { projectPluginCacheDir } from "./plugins/pluginCachePaths.js";
import { getGlobExclusionsForPluginCache } from "./plugins/orphanedPluginFilter.js";
import { getPlatform } from "./platform.js";
import { expandPath } from "./path.js";
import {
  resolveRipgrepTarget,
  buildDenyRuleGlobs,
  getRipgrepDisplayRoot,
  ripGrep_2,
  assertDenyGlobsUnchanged,
  RipgrepTimeoutError,
  splitNulDelimitedOutput,
  hasUnsafeDenyGlob,
  mapRipgrepOutputPath,
  getAlternateRootSpellings,
} from "./ripgrep.js";
import {
  getFileReadIgnorePatterns,
  mayBeGuardedFileSyncCopy,
  matchingRuleForInput,
  mayEscapeExclusionGlobs,
  denyFoldVariantPaths,
} from "./permissions/filesystem.js";
import { isEnvTruthy } from "./envUtils.js";
import { getPathsForPermissionCheck, getFsImplementation } from "./fsOperations.js";
import { countCharInString } from "./stringUtils.js";

//@ chunk-5xgkngpb.js:1435078-1435211 placement
async function getPluginCacheExclusionDirs(searchPath) {
  let cacheDir = normalize(projectPluginCacheDir());
  let realCacheDir = await realpath(cacheDir).catch(() => cacheDir);
  return (await getGlobExclusionsForPluginCache(searchPath)).map((glob) =>
    join(realCacheDir, ...glob.slice(4, -3).split("/")),
  );
}
//@ chunk-5xgkngpb.js:1436100-1436352 placement
/**
 * 把一个排除目录转为相对搜索根的 rg --glob 否定模式；排除根本身返回 "!**"，无关返回 null。
 */
function toRipgrepExcludeGlob(excludedPath, ripgrepDisplayRoot, insideWorktree = false) {
  let relPath = relative(ripgrepDisplayRoot, excludedPath);
  if (relPath === "") return "!**";
  if (!(relPath === ".." || relPath.startsWith(`..${sep}`)) && !isAbsolute(relPath)) {
    let replaced = relPath.replaceAll("\\", "/");
    return insideWorktree ? `!**/${replaced}/**` : `!/${replaced}/**`;
  }
  let upPath = relative(excludedPath, ripgrepDisplayRoot);
  return !(upPath === ".." || upPath.startsWith(`..${sep}`)) && !isAbsolute(upPath) ? "!**" : null;
}
//@ chunk-5xgkngpb.js:1436352-1436744 fingerprint (2.1.88 match: extractGlobBaseDirectory, 1)
function extractGlobBaseDirectory(pattern) {
  let globChars = /[*?[{]/;
  let match = pattern.match(globChars);
  if (!match || match.index === undefined) {
    let dir = dirname(pattern);
    let file = basename(pattern);
    return {
      baseDir: dir,
      relativePattern: file,
    };
  }
  let staticPrefix = pattern.slice(0, match.index);
  let lastSepIndex = Math.max(staticPrefix.lastIndexOf("/"), staticPrefix.lastIndexOf(sep));
  if (lastSepIndex === -1)
    return {
      baseDir: "",
      relativePattern: pattern,
    };
  let baseDir = staticPrefix.slice(0, lastSepIndex);
  let relativePattern = pattern.slice(lastSepIndex + 1);
  if (baseDir === "" && lastSepIndex === 0) baseDir = "/";
  if (getPlatform() === "windows" && /^[A-Za-z]:$/.test(baseDir)) baseDir = baseDir + sep;
  return {
    baseDir,
    relativePattern,
  };
}
//@ chunk-5xgkngpb.js:1436744-1436883 layout
/**
 * 绝对路径 glob 拆出静态前缀目录作为 searchDir，余下作为相对模式。
 */
function resolveAbsoluteGlobPattern(pattern) {
  if (!isAbsolute(pattern)) return null;
  let { baseDir, relativePattern } = extractGlobBaseDirectory(pattern);
  if (!baseDir) return null;
  return {
    searchDir: expandPath(baseDir),
    relativePattern,
  };
}
//@ chunk-5xgkngpb.js:1436883-1437464 layout
/**
 * Glob 主入口：处理绝对模式与和搜索目录重复的前缀，打开搜索根，调用 glob。
 */
async function globFiles(pattern, cwd, { limit, offset }, abortSignal, permissionContext, timing, timing_2) {
  let searchDir = cwd;
  let effectivePattern = pattern;
  let rewrotePattern = false;
  let absoluteGlobPattern = resolveAbsoluteGlobPattern(pattern);
  if (absoluteGlobPattern) {
    searchDir = absoluteGlobPattern.searchDir;
    effectivePattern = absoluteGlobPattern.relativePattern;
  } else {
    let strippedPattern = stripPatternPrefixDuplicatingCwd(effectivePattern, searchDir);
    if (
      strippedPattern !== effectivePattern &&
      !(await isRealDirectoryChain(searchDir, getPatternBaseSegments(effectivePattern, strippedPattern)))
    ) {
      effectivePattern = strippedPattern;
      rewrotePattern = true;
    }
  }
  let ripgrepTarget = await resolveRipgrepTarget(searchDir, timing);
  if (ripgrepTarget === null)
    return {
      files: [],
      truncated: false,
      totalMatches: 0,
      countIsComplete: true,
      timedOut: false,
    };
  if (
    rewrotePattern &&
    effectivePattern.startsWith("/") &&
    !(ripgrepTarget.relativeOutput || ripgrepTarget.spawnCwd === ripgrepTarget.canonical)
  ) {
    let replaced = relative(ripgrepTarget.spawnCwd, ripgrepTarget.target).replaceAll("\\", "/");
    effectivePattern =
      replaced === "" || replaced === ".." || replaced.startsWith("../") || isAbsolute(replaced)
        ? effectivePattern.slice(1)
        : `/${replaced}${effectivePattern}`;
  }
  try {
    return await glob(
      ripgrepTarget,
      effectivePattern,
      {
        limit,
        offset,
      },
      abortSignal,
      permissionContext,
      timing_2,
    );
  } finally {
    await ripgrepTarget.close();
  }
}
//@ chunk-5xgkngpb.js:1437464-1438937 fingerprint (2.1.88 match: glob, 0.517)
/**
 * 用 ripgrep --files --glob 列文件（--sort=modified，默认 --no-ignore 与 --hidden，可由 CLAUDE_CODE_GLOB_NO_IGNORE/CLAUDE_CODE_GLOB_HIDDEN 关闭），附读取忽略模式与排除目录，按 deny 规则过滤，分页返回。
 */
async function glob(target, pattern, { limit, offset }, abortSignal, toolPermissionContext, timing) {
  let canonical = target.canonical;
  let patternsByRoot = getFileReadIgnorePatterns(toolPermissionContext);
  let ignorePatterns = buildDenyRuleGlobs(patternsByRoot, target);
  let noIgnore = isEnvTruthy(process.env.CLAUDE_CODE_GLOB_NO_IGNORE || "true");
  let hidden = isEnvTruthy(process.env.CLAUDE_CODE_GLOB_HIDDEN || "true");
  let args = [
    "--files",
    "--null",
    "--glob",
    pattern,
    "--sort=modified",
    ...(noIgnore ? ["--no-ignore"] : []),
    ...(hidden ? ["--hidden"] : []),
  ];
  for (let pattern of ignorePatterns) args.push("--iglob", pattern);
  for (let exclusion of await getPluginCacheExclusionDirs(canonical)) {
    let ripgrepExcludeGlob = toRipgrepExcludeGlob(exclusion, getRipgrepDisplayRoot(target));
    if (ripgrepExcludeGlob === null) continue;
    args.push("--glob", ripgrepExcludeGlob);
  }
  let span = null;
  let paths;
  let perhapsIncomplete = false;
  let timedOut = false;
  {
    let endSpan = timing?.mark("external");
    let result = await ripGrep_2(args, target.target, abortSignal, {
      rawLines: true,
      rejectOnInputError: true,
      searchOtherAppsData: true,
      cwd: target.spawnCwd,
      spawnDirFd: target.spawnDirFd,
      inheritFd: target.inheritFd,
      beforeSpawn: () => {
        target.recheckBeforeSpawn();
        assertDenyGlobsUnchanged(patternsByRoot, target, ignorePatterns);
      },
    })
      .then(
        (lines) => ({
          lines,
          timedOut: false,
        }),
        (error) => {
          if (error instanceof RipgrepTimeoutError && error.partialResults.length > 0)
            return {
              lines: error.partialResults,
              timedOut: true,
            };
          throw error;
        },
      )
      .finally(endSpan);
    timedOut = result.timedOut;
    paths = splitNulDelimitedOutput(result.lines, "files_with_matches");
  }
  let needsDenyCheck =
    target.judgeEveryResult === true ||
    hasUnsafeDenyGlob(patternsByRoot, target) ||
    (patternsByRoot.size > 0 && mayBeGuardedFileSyncCopy(target.canonical));
  let absolutePaths = paths.map((line) => mapRipgrepOutputPath(line, target));
  if (
    !target.isDirectory &&
    [target.canonical, target.lexical, ...getPathsForPermissionCheck(target.lexical)].some(
      (path) => matchingRuleForInput(path, toolPermissionContext, "read", "deny") !== null,
    )
  )
    absolutePaths = [];
  let files;
  let truncated;
  let totalMatches = absolutePaths.length;
  let countIsComplete = true;
  if (patternsByRoot.size === 0) {
    truncated = perhapsIncomplete || absolutePaths.length > offset + limit;
    files = absolutePaths.slice(offset, offset + limit);
  } else {
    let kept = [];
    let seenCount = 0;
    let index = 0;
    for (; index < absolutePaths.length && kept.length < limit; index++) {
      let filePath = absolutePaths[index];
      if (
        (needsDenyCheck || mayEscapeExclusionGlobs(filePath)) &&
        denyFoldVariantPaths(
          [filePath],
          toolPermissionContext,
          (path) => getAlternateRootSpellings(path, target),
          needsDenyCheck,
        ).size > 0
      )
        continue;
      if (seenCount++ < offset) continue;
      kept.push(filePath);
    }
    files = kept;
    totalMatches = seenCount;
    countIsComplete = index >= absolutePaths.length;
    truncated = perhapsIncomplete || !countIsComplete;
  }
  return {
    files,
    truncated,
    totalMatches,
    countIsComplete: !perhapsIncomplete && countIsComplete && !timedOut,
    timedOut,
  };
}
//@ chunk-5xgkngpb.js:1438937-1439214 layout
/**
 * 模式开头几段与搜索目录末尾几段重复时去掉重复部分。
 */
function stripPatternPrefixDuplicatingCwd(pattern, cwd) {
  let parts = pattern.split("/");
  let prefixLength = 0;
  while (
    prefixLength < parts.length - 1 &&
    parts[prefixLength] !== "" &&
    !/[*?[\]{}!]/.test(parts[prefixLength])
  )
    prefixLength++;
  let filtered = cwd.split(/[\\/]+/).filter(Boolean);
  for (let length = prefixLength; length > 0; length--) {
    let sliced = parts.slice(0, length);
    let sliced_2 = filtered.slice(-length);
    if (sliced_2.length === length && sliced.every((part, index) => part === sliced_2[index]))
      return "/" + parts.slice(length).join("/");
  }
  return pattern;
}
//@ chunk-5xgkngpb.js:1439214-1439324 placement
function getPatternBaseSegments(pattern, strippedPattern) {
  let parts = pattern.split("/");
  let droppedCount = countCharInString(strippedPattern.replace(/^\//, ""), "/") + 1;
  return parts.slice(0, Math.max(1, parts.length - droppedCount));
}
//@ chunk-5xgkngpb.js:1439324-1439500 placement
async function isRealDirectoryChain(baseDir, patternBaseSegments) {
  let fsImplementation = getFsImplementation();
  let currentDir = baseDir;
  for (let segment of patternBaseSegments) {
    currentDir = join(currentDir, segment);
    try {
      let stats = await fsImplementation.lstat(currentDir);
      if (!stats.isDirectory() || stats.isSymbolicLink()) return false;
    } catch {
      return false;
    }
  }
  return patternBaseSegments.length > 0;
}
export { getPluginCacheExclusionDirs, toRipgrepExcludeGlob, resolveAbsoluteGlobPattern, globFiles };
