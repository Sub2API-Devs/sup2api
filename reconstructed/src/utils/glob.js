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
import {
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
import { projectPluginCacheDir } from "./plugins/pluginCachePaths.js";
import { getGlobExclusionsForPluginCache } from "./plugins/orphanedPluginFilter.js";
import { getPlatform } from "./platform.js";
import { expandPath } from "./path.js";
import {
  resolveRipgrepTarget,
  buildDenyRuleGlobs,
  getRipgrepDisplayRoot,
  ripGrep,
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
async function getPluginCacheExclusionDirs(e) {
  let n = normalize_5(projectPluginCacheDir()),
    r = await realpath_20(n).catch(() => n);
  return (await getGlobExclusionsForPluginCache(e)).map((h) => join_63(r, ...h.slice(4, -3).split("/")));
}
/**
 * 把一个排除目录转为相对搜索根的 rg --glob 否定模式；排除根本身返回 "!**"，无关返回 null。
 */
//@ chunk-e6aww6q8.js:1436520-1436772 placement
function toRipgrepExcludeGlob(e, n, r = !1) {
  let s = relative_23(n, e);
  if (s === "") return "!**";
  if (!(s === ".." || s.startsWith(`..${sep_38}`)) && !isAbsolute_30(s)) {
    let replaced = s.replaceAll("\\", "/");
    return r ? `!**/${replaced}/**` : `!/${replaced}/**`;
  }
  let h = relative_23(e, n);
  return !(h === ".." || h.startsWith(`..${sep_38}`)) && !isAbsolute_30(h) ? "!**" : null;
}
//@ chunk-e6aww6q8.js:1436772-1437164 fingerprint = extractGlobBaseDirectory (1)
function extractGlobBaseDirectory(pattern) {
  let globChars = /[*?[{]/,
    match = pattern.match(globChars);
  if (!match || match.index === void 0) {
    let dir = dirname_37(pattern),
      file = basename_33(pattern);
    return { baseDir: dir, relativePattern: file };
  }
  let staticPrefix = pattern.slice(0, match.index),
    lastSepIndex = Math.max(staticPrefix.lastIndexOf("/"), staticPrefix.lastIndexOf(sep_37));
  if (lastSepIndex === -1) return { baseDir: "", relativePattern: pattern };
  let baseDir = staticPrefix.slice(0, lastSepIndex),
    relativePattern = pattern.slice(lastSepIndex + 1);
  if (baseDir === "" && lastSepIndex === 0) baseDir = "/";
  if (getPlatform() === "windows" && /^[A-Za-z]:$/.test(baseDir)) baseDir = baseDir + sep_37;
  return { baseDir: baseDir, relativePattern: relativePattern };
}
/**
 * 绝对路径 glob 拆出静态前缀目录作为 searchDir，余下作为相对模式。
 */
//@ chunk-e6aww6q8.js:1437164-1437303 layout
function resolveAbsoluteGlobPattern(e) {
  if (!isAbsolute_29(e)) return null;
  let { baseDir: baseDir, relativePattern: relativePattern } = extractGlobBaseDirectory(e);
  if (!baseDir) return null;
  return { searchDir: expandPath(baseDir), relativePattern: relativePattern };
}
/**
 * Glob 主入口：处理绝对模式与和搜索目录重复的前缀，打开搜索根，调用 glob。
 */
//@ chunk-e6aww6q8.js:1437303-1437868 layout
async function globFiles(e, n, { limit: limit, offset: offset }, h, y, S, w) {
  let L = n,
    G = e,
    q = !1,
    Z = resolveAbsoluteGlobPattern(e);
  if (Z) ((L = Z.searchDir), (G = Z.relativePattern));
  else {
    let ke = stripPatternPrefixDuplicatingCwd(G, L);
    if (ke !== G && !(await isRealDirectoryChain(L, getPatternBaseSegments(G, ke)))) ((G = ke), (q = !0));
  }
  let Se = await resolveRipgrepTarget(L, S);
  if (Se === null) return { files: [], truncated: !1, totalMatches: 0, countIsComplete: !0 };
  if (q && G.startsWith("/") && !(Se.relativeOutput || Se.spawnCwd === Se.canonical)) {
    let replaced = relative_22(Se.spawnCwd, Se.target).replaceAll("\\", "/");
    G =
      replaced === "" || replaced === ".." || replaced.startsWith("../") || isAbsolute_29(replaced)
        ? G.slice(1)
        : `/${replaced}${G}`;
  }
  try {
    return await glob(Se, G, { limit: limit, offset: offset }, h, y, w);
  } finally {
    await Se.close();
  }
}
/**
 * 用 ripgrep --files --glob 列文件（--sort=modified，默认 --no-ignore 与 --hidden，可由 CLAUDE_CODE_GLOB_NO_IGNORE/CLAUDE_CODE_GLOB_HIDDEN 关闭），附读取忽略模式与排除目录，按 deny 规则过滤，分页返回。
 */
//@ chunk-e6aww6q8.js:1437868-1439124 fingerprint = glob (0.551)
async function glob(e, n, { limit: limit, offset: offset }, h, y, S) {
  let canonical = e.canonical,
    L = getFileReadIgnorePatterns(y),
    ignorePatterns = buildDenyRuleGlobs(L, e),
    noIgnore = isEnvTruthy(process.env.CLAUDE_CODE_GLOB_NO_IGNORE || "true"),
    hidden = isEnvTruthy(process.env.CLAUDE_CODE_GLOB_HIDDEN || "true"),
    Se = [
      "--files",
      "--null",
      "--glob",
      n,
      "--sort=modified",
      ...(noIgnore ? ["--no-ignore"] : []),
      ...(hidden ? ["--hidden"] : []),
    ];
  for (let pattern of ignorePatterns) Se.push("--iglob", pattern);
  for (let exclusion of await getPluginCacheExclusionDirs(canonical)) {
    let nt = toRipgrepExcludeGlob(exclusion, getRipgrepDisplayRoot(e));
    if (nt === null) continue;
    Se.push("--glob", nt);
  }
  let ke = null,
    we,
    Ee = !1;
  {
    let Je = S?.mark("external");
    ((we = await ripGrep(Se, e.target, h, {
      rawLines: !0,
      rejectOnInputError: !0,
      searchOtherAppsData: !0,
      cwd: e.spawnCwd,
      inheritFd: e.inheritFd,
      beforeSpawn: () => {
        (e.recheckBeforeSpawn(), assertDenyGlobsUnchanged(L, e, ignorePatterns));
      },
    }).finally(Je)),
      (we = splitNulDelimitedOutput(we, "files_with_matches")));
  }
  let Ae =
      e.judgeEveryResult === !0 ||
      hasUnsafeDenyGlob(L, e) ||
      (L.size > 0 && mayBeGuardedFileSyncCopy(e.canonical)),
    absolutePaths = we.map((Je) => mapRipgrepOutputPath(Je, e));
  if (
    !e.isDirectory &&
    [e.canonical, e.lexical, ...getPathsForPermissionCheck(e.lexical)].some(
      (Je) => matchingRuleForInput(Je, y, "read", "deny") !== null,
    )
  )
    absolutePaths = [];
  let Me,
    We,
    ze = absolutePaths.length,
    lt = !0;
  if (L.size === 0)
    ((We = Ee || absolutePaths.length > offset + limit), (Me = absolutePaths.slice(offset, offset + limit)));
  else {
    let Je = [],
      nt = 0,
      pt = 0;
    for (; pt < absolutePaths.length && Je.length < limit; pt++) {
      let Et = absolutePaths[pt];
      if (
        (Ae || mayEscapeExclusionGlobs(Et)) &&
        denyFoldVariantPaths([Et], y, (yt) => getAlternateRootSpellings(yt, e), Ae).size > 0
      )
        continue;
      if (nt++ < offset) continue;
      Je.push(Et);
    }
    ((Me = Je), (ze = nt), (lt = pt >= absolutePaths.length), (We = Ee || !lt));
  }
  return { files: Me, truncated: We, totalMatches: ze, countIsComplete: !Ee && lt };
}
/**
 * 模式开头几段与搜索目录末尾几段重复时去掉重复部分。
 */
//@ chunk-e6aww6q8.js:1439124-1439401 affinity
function stripPatternPrefixDuplicatingCwd(e, n) {
  let parts = e.split("/"),
    s = 0;
  while (s < parts.length - 1 && parts[s] !== "" && !/[*?[\]{}!]/.test(parts[s])) s++;
  let filtered = n.split(/[\\/]+/).filter(Boolean);
  for (let y = s; y > 0; y--) {
    let sliced = parts.slice(0, y),
      sliced_2 = filtered.slice(-y);
    if (sliced_2.length === y && sliced.every((L, G) => L === sliced_2[G]))
      return "/" + parts.slice(y).join("/");
  }
  return e;
}
//@ chunk-e6aww6q8.js:1439401-1439511 sole-consumer
function getPatternBaseSegments(e, n) {
  let parts = e.split("/"),
    s = countCharInString(n.replace(/^\//, ""), "/") + 1;
  return parts.slice(0, Math.max(1, parts.length - s));
}
//@ chunk-e6aww6q8.js:1439511-1439687 sole-consumer
async function isRealDirectoryChain(e, n) {
  let r = getFsImplementation(),
    s = e;
  for (let h of n) {
    s = join_62(s, h);
    try {
      let stats = await r.lstat(s);
      if (!stats.isDirectory() || stats.isSymbolicLink()) return !1;
    } catch {
      return !1;
    }
  }
  return n.length > 0;
}

export { resolveAbsoluteGlobPattern, globFiles, getPluginCacheExclusionDirs, toRipgrepExcludeGlob };
