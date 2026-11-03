/**
 * utils/glob.ts
 *
 * Glob 实现：绝对模式拆分、ripgrep --files 调用、deny 规则过滤与分页
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/glob.ts
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 2, fingerprint 2, layout 2, affinity 1, sole-consumer 2
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

//@ chunk-e6aww6q8.js:1435498-1435631 placement
async function getPluginCacheExclusionDirs(searchPath) {
  let n = normalize(projectPluginCacheDir());
  let r = await realpath(n).catch(() => n);
  return (await getGlobExclusionsForPluginCache(searchPath)).map((h) =>
    join(r, ...h.slice(4, -3).split("/")),
  );
}
//@ chunk-e6aww6q8.js:1436520-1436772 placement
/**
 * 把一个排除目录转为相对搜索根的 rg --glob 否定模式；排除根本身返回 "!**"，无关返回 null。
 */
function toRipgrepExcludeGlob(e, ripgrepDisplayRoot, r = false) {
  let s = relative(ripgrepDisplayRoot, e);
  if (s === "") return "!**";
  if (!(s === ".." || s.startsWith(`..${sep}`)) && !isAbsolute(s)) {
    let replaced = s.replaceAll("\\", "/");
    return r ? `!**/${replaced}/**` : `!/${replaced}/**`;
  }
  let h = relative(e, ripgrepDisplayRoot);
  return !(h === ".." || h.startsWith(`..${sep}`)) && !isAbsolute(h) ? "!**" : null;
}
//@ chunk-e6aww6q8.js:1436772-1437164 fingerprint = extractGlobBaseDirectory (1)
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
//@ chunk-e6aww6q8.js:1437164-1437303 layout
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
//@ chunk-e6aww6q8.js:1437303-1437868 layout
/**
 * Glob 主入口：处理绝对模式与和搜索目录重复的前缀，打开搜索根，调用 glob。
 */
async function globFiles(pattern, n, { limit, offset }, abortSignal, y, S, timing) {
  let L = n;
  let G = pattern;
  let q = false;
  let absoluteGlobPattern = resolveAbsoluteGlobPattern(pattern);
  if (absoluteGlobPattern) {
    L = absoluteGlobPattern.searchDir;
    G = absoluteGlobPattern.relativePattern;
  } else {
    let ke = stripPatternPrefixDuplicatingCwd(G, L);
    if (ke !== G && !(await isRealDirectoryChain(L, getPatternBaseSegments(G, ke)))) {
      G = ke;
      q = true;
    }
  }
  let ripgrepTarget = await resolveRipgrepTarget(L, S);
  if (ripgrepTarget === null)
    return {
      files: [],
      truncated: false,
      totalMatches: 0,
      countIsComplete: true,
    };
  if (
    q &&
    G.startsWith("/") &&
    !(ripgrepTarget.relativeOutput || ripgrepTarget.spawnCwd === ripgrepTarget.canonical)
  ) {
    let replaced = relative(ripgrepTarget.spawnCwd, ripgrepTarget.target).replaceAll("\\", "/");
    G =
      replaced === "" || replaced === ".." || replaced.startsWith("../") || isAbsolute(replaced)
        ? G.slice(1)
        : `/${replaced}${G}`;
  }
  try {
    return await glob(
      ripgrepTarget,
      G,
      {
        limit,
        offset,
      },
      abortSignal,
      y,
      timing,
    );
  } finally {
    await ripgrepTarget.close();
  }
}
//@ chunk-e6aww6q8.js:1437868-1439124 fingerprint = glob (0.551)
/**
 * 用 ripgrep --files --glob 列文件（--sort=modified，默认 --no-ignore 与 --hidden，可由 CLAUDE_CODE_GLOB_NO_IGNORE/CLAUDE_CODE_GLOB_HIDDEN 关闭），附读取忽略模式与排除目录，按 deny 规则过滤，分页返回。
 */
async function glob(ripgrepTarget, n, { limit, offset }, abortSignal, toolPermissionContext, S) {
  let canonical = ripgrepTarget.canonical;
  let fileReadIgnorePatterns = getFileReadIgnorePatterns(toolPermissionContext);
  let ignorePatterns = buildDenyRuleGlobs(fileReadIgnorePatterns, ripgrepTarget);
  let noIgnore = isEnvTruthy(process.env.CLAUDE_CODE_GLOB_NO_IGNORE || "true");
  let hidden = isEnvTruthy(process.env.CLAUDE_CODE_GLOB_HIDDEN || "true");
  let args = [
    "--files",
    "--null",
    "--glob",
    n,
    "--sort=modified",
    ...(noIgnore ? ["--no-ignore"] : []),
    ...(hidden ? ["--hidden"] : []),
  ];
  for (let pattern of ignorePatterns) args.push("--iglob", pattern);
  for (let exclusion of await getPluginCacheExclusionDirs(canonical)) {
    let ripgrepExcludeGlob = toRipgrepExcludeGlob(exclusion, getRipgrepDisplayRoot(ripgrepTarget));
    if (ripgrepExcludeGlob === null) continue;
    args.push("--glob", ripgrepExcludeGlob);
  }
  let ke = null;
  let we;
  let Ee = false;
  {
    let Je = S?.mark("external");
    we = await ripGrep_2(args, ripgrepTarget.target, abortSignal, {
      rawLines: true,
      rejectOnInputError: true,
      searchOtherAppsData: true,
      cwd: ripgrepTarget.spawnCwd,
      inheritFd: ripgrepTarget.inheritFd,
      beforeSpawn: () => {
        ripgrepTarget.recheckBeforeSpawn();
        assertDenyGlobsUnchanged(fileReadIgnorePatterns, ripgrepTarget, ignorePatterns);
      },
    }).finally(Je);
    we = splitNulDelimitedOutput(we, "files_with_matches");
  }
  let Ae =
    ripgrepTarget.judgeEveryResult === true ||
    hasUnsafeDenyGlob(fileReadIgnorePatterns, ripgrepTarget) ||
    (fileReadIgnorePatterns.size > 0 && mayBeGuardedFileSyncCopy(ripgrepTarget.canonical));
  let absolutePaths = we.map((Je) => mapRipgrepOutputPath(Je, ripgrepTarget));
  if (
    !ripgrepTarget.isDirectory &&
    [
      ripgrepTarget.canonical,
      ripgrepTarget.lexical,
      ...getPathsForPermissionCheck(ripgrepTarget.lexical),
    ].some((Je) => matchingRuleForInput(Je, toolPermissionContext, "read", "deny") !== null)
  )
    absolutePaths = [];
  let Me;
  let We;
  let totalMatches = absolutePaths.length;
  let lt = true;
  if (fileReadIgnorePatterns.size === 0) {
    We = Ee || absolutePaths.length > offset + limit;
    Me = absolutePaths.slice(offset, offset + limit);
  } else {
    let Je = [];
    let nt = 0;
    let pt = 0;
    for (; pt < absolutePaths.length && Je.length < limit; pt++) {
      let Et = absolutePaths[pt];
      if (
        (Ae || mayEscapeExclusionGlobs(Et)) &&
        denyFoldVariantPaths(
          [Et],
          toolPermissionContext,
          (yt) => getAlternateRootSpellings(yt, ripgrepTarget),
          Ae,
        ).size > 0
      )
        continue;
      if (nt++ < offset) continue;
      Je.push(Et);
    }
    Me = Je;
    totalMatches = nt;
    lt = pt >= absolutePaths.length;
    We = Ee || !lt;
  }
  return {
    files: Me,
    truncated: We,
    totalMatches,
    countIsComplete: !Ee && lt,
  };
}
//@ chunk-e6aww6q8.js:1439124-1439401 affinity
/**
 * 模式开头几段与搜索目录末尾几段重复时去掉重复部分。
 */
function stripPatternPrefixDuplicatingCwd(e, n) {
  let parts = e.split("/");
  let s = 0;
  while (s < parts.length - 1 && parts[s] !== "" && !/[*?[\]{}!]/.test(parts[s])) s++;
  let filtered = n.split(/[\\/]+/).filter(Boolean);
  for (let y = s; y > 0; y--) {
    let sliced = parts.slice(0, y);
    let sliced_2 = filtered.slice(-y);
    if (sliced_2.length === y && sliced.every((L, G) => L === sliced_2[G]))
      return "/" + parts.slice(y).join("/");
  }
  return e;
}
//@ chunk-e6aww6q8.js:1439401-1439511 sole-consumer
function getPatternBaseSegments(e, n) {
  let parts = e.split("/");
  let s = countCharInString(n.replace(/^\//, ""), "/") + 1;
  return parts.slice(0, Math.max(1, parts.length - s));
}
//@ chunk-e6aww6q8.js:1439511-1439687 sole-consumer
async function isRealDirectoryChain(e, patternBaseSegments) {
  let fsImplementation = getFsImplementation();
  let s = e;
  for (let h of patternBaseSegments) {
    s = join(s, h);
    try {
      let stats = await fsImplementation.lstat(s);
      if (!stats.isDirectory() || stats.isSymbolicLink()) return false;
    } catch {
      return false;
    }
  }
  return patternBaseSegments.length > 0;
}
export { resolveAbsoluteGlobPattern, globFiles, getPluginCacheExclusionDirs, toRipgrepExcludeGlob };
