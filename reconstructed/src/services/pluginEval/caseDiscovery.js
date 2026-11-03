/**
 * services/pluginEval/caseDiscovery.ts
 *
 * 2.1.316 新增：plugin eval 用例发现：从目标目录向下扫描套件与用例（case.yaml / prompt.md），检查符号链接、.git 与信任
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (55)
 * attribution: placement 55
 */
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  rmdir,
  rmdir as rmdir_2,
  chmod,
  stat,
  stat as stat_2,
  stat as stat_3,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
} from "fs/promises";
import os_2, { tmpdir, tmpdir as tmpdir_2, default as os_2_2, default as os_3 } from "os";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
import {
  fa,
  pa,
  logManifestNotConsulted,
  checkEntryOwnership,
  checkTreeTrust,
  Un,
} from "./ownershipChecks.js";
import {
  errorMessage,
  getErrnoCode,
  isENOENT,
  isFsInaccessible,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { getFileKind } from "../../utils/fileKind.js";
import { escapeNonAscii } from "../../utils/resultError.js";
import { toEvalPathError, EVALS_DIR_NAME, foldPathCase, ao, qs, pathEndsWith, ro, hr } from "./evalDir.js";
import { checkRepoAuthoredPath, Rm } from "../../cli/handlers/pluginEval/mockGuards.js";
import { getPlatform } from "../../utils/platform.js";
import { getCwd } from "../../utils/cwd.js";
import { parsePromptMdCase, normalizeCaseObject, parseCaseYaml, tn } from "./caseSchema.js";
import {
  isZipPathCaseInsensitive,
  MANIFEST_IDENTITY_READ_RELPATHS,
  loadPluginManifest,
} from "../../utils/plugins/pluginLoader.js";
import { PLUGIN_MANIFEST_PATH } from "../../utils/plugins/commandSource.js";
import { MANIFEST_ERROR_CLASSES } from "../../utils/plugins/pluginManifestRead.js";
import { isNetworkMountRoot, Qg } from "../../utils/networkPaths.js";
import { parseYaml } from "../../utils/yaml.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { CL } from "../../utils/fsJunctions.js";
import { enumeratePluginMcpServers } from "./mocks/pluginMcpEnumeration.js";

/**
 * （切分错误，属插件评测）按 "模式:目录" 缓存插件目录的属主/权限检查结果；已信任时直接 true。
 */
//@ chunk-qchp9vrd.js:75370-75527 placement = BASH_LIST_COMMANDS (0.768)
function getCachedPluginDirVerdict(e, n, r = "tree") {
  if (fa(n, e)) return Promise.resolve(!0);
  let a = `${r}:${e}`,
    s = n.verdicts.get(a);
  if (s === void 0) ((s = checkPluginDirTrust(e, n, r)), n.verdicts.set(a, s));
  return s;
}
//@ chunk-qchp9vrd.js:75527-76060 placement
async function checkPluginDirTrust(e, n, r) {
  if (typeof process.getuid !== "function") return !0;
  await pa(n);
  let a = [
      [e, "dir"],
      [path_8.join(e, ".claude-plugin"), "dir-or-absent"],
    ],
    s = [
      [path_8.join(e, ".claude-plugin", "plugin.json"), "file"],
      [path_8.join(e, "plugin.json"), "file"],
      [path_8.join(e, "SKILL.md"), "file"],
    ];
  if (!(await probeEntriesInBatches(e, a, n, r)) || !(await probeEntriesInBatches(e, s, n, r))) return !1;
  if (r === "core") return !0;
  let h;
  try {
    h = await examineTreeLimits(e, n);
  } catch (error) {
    return logManifestNotConsulted(e, n, `its tree could not be examined (${errorMessage(error)})`);
  }
  if (h.kind === "problem") return logManifestNotConsulted(e, n, h.problem);
  return probeEntriesInBatches(
    e,
    h.entries.map((entry) => [entry, "in-tree"]),
    n,
    r,
  );
}
//@ chunk-qchp9vrd.js:76060-76139 placement
var sa = 12,
  jn = 100,
  aa = jn + 8,
  Zu = new Set(["objects", "lfs"]),
  ui = 200000,
  la = 8,
  ua = 20000;
//@ chunk-qchp9vrd.js:76139-76300 placement
function getGroupWritableHint(e) {
  return e === "tree"
    ? "chmod -R g-w it, or run from / name the plugin directory"
    : "chmod -R g-w it, or pass --eval-dir to name the directory yourself";
}
//@ chunk-qchp9vrd.js:76300-76484 placement
function isNestedModulesPath(e, n) {
  if (e === null) return !1;
  let relativePath = path_8.relative(e, n);
  if (relativePath === "") return !0;
  let parts = relativePath.split(path_8.sep);
  return (
    parts.length % 2 === 0 && parts.every((s, h) => (h % 2 === 0 ? s.toLowerCase() === "modules" : s !== ""))
  );
}
//@ chunk-qchp9vrd.js:76484-76531 placement
function kr(e) {
  return e.toLowerCase() === ".git";
}
/**
 * 检查目录树能否完整检查（不可读目录、条目/层级上限、.git 对象库大小）。
 */
//@ chunk-qchp9vrd.js:76531-78920 placement
async function examineTreeLimits(e, n) {
  let r = `its tree cannot be fully examined (a directory is unreadable, or it holds more than ${n.treeMaxEntries} entries / ${sa} levels \u2014 name the plugin directory itself to evaluate it)`,
    a = `its .git object stores hold more than ${ui} entries, nest deeper than ${la} levels, or one is unreadable \u2014 they cannot be fully examined; name the plugin directory itself to evaluate it`,
    s = [],
    h = [],
    w = null,
    b = [[e, 0]],
    y = (R) => fa(n, R);
  while (b.length > 0) {
    let [R, S] = b.pop();
    if (y(R)) continue;
    let T;
    try {
      T = await readdir_6(R, { withFileTypes: !0 });
    } catch (error) {
      let x = getErrnoCode(error);
      if (x === "ENOENT" || x === "ENOTDIR") continue;
      return { kind: "problem", problem: r };
    }
    for (let N of T) {
      let joined = path_8.join(R, N.name);
      if (kr(N.name)) {
        let j = await getFileKind(N, joined, "unknown");
        if (j === "unknown")
          return {
            kind: "problem",
            problem: `${escapeNonAscii(joined)} could not be examined (its type could not be read); name the plugin directory itself to evaluate it`,
          };
        if (R !== e || j !== "dir")
          return {
            kind: "problem",
            problem: `${escapeNonAscii(joined)} \u2014 the tree contains repository metadata that was not created here (${j === "symlink" ? "a symlinked .git" : j === "file" ? "a gitdir file" : j === "other" ? "a .git that is not a directory" : "a nested .git directory"}); name the plugin directory itself to evaluate it`,
          };
        if (!y(joined)) s.push(joined);
        if (s.length > n.treeMaxEntries) return { kind: "problem", problem: r };
        ((w = joined), b.push([joined, jn]));
        continue;
      }
      if (S >= jn && Zu.has(N.name.toLowerCase()) && isNestedModulesPath(w, R) && (await di(N, joined))) {
        if ((h.push(joined), h.length > ui)) return { kind: "problem", problem: a };
        let j = [[joined, 1]];
        while (j.length > 0) {
          let [K, X] = j.pop(),
            W;
          try {
            W = await readdir_6(K, { withFileTypes: !0 });
          } catch (error) {
            let J = getErrnoCode(error);
            if (J === "ENOENT" || J === "ENOTDIR") continue;
            return { kind: "problem", problem: a };
          }
          for (let G of W) {
            let joined = path_8.join(K, G.name);
            if (kr(G.name))
              return {
                kind: "problem",
                problem: `${escapeNonAscii(joined)} \u2014 the tree contains repository metadata that was not created here (a .git inside an object store); name the plugin directory itself to evaluate it`,
              };
            if ((h.push(joined), h.length > ui)) return { kind: "problem", problem: a };
            if (await di(G, joined)) {
              if (X + 1 > la) return { kind: "problem", problem: a };
              j.push([joined, X + 1]);
            }
          }
        }
        continue;
      }
      if (!y(joined)) s.push(joined);
      if (s.length > n.treeMaxEntries) return { kind: "problem", problem: r };
      if (!y(joined) && (await di(N, joined))) {
        let j = S >= jn ? aa : sa;
        if (S + 1 > j)
          return {
            kind: "problem",
            problem:
              S >= jn
                ? `a .git directory in its tree nests deeper than ${aa - jn} levels \u2014 it cannot be fully examined; name the plugin directory itself to evaluate it`
                : r,
          };
        b.push([joined, S + 1]);
      }
    }
  }
  return { kind: "entries", entries: s.concat(h) };
}
//@ chunk-qchp9vrd.js:78920-79022 placement
function getCachedRootRealpath(e, n) {
  let r = n.rootRealpaths.get(e);
  if (r === void 0) ((r = realpath_4(e)), n.rootRealpaths.set(e, r));
  return r;
}
//@ chunk-qchp9vrd.js:79022-79080 placement
async function di(e, n) {
  return (await getFileKind(e, n, "dir")) === "dir";
}
//@ chunk-qchp9vrd.js:79080-79266 placement
async function probeEntriesInBatches(e, n, r, a) {
  for (let h = 0; h < n.length; h += 64) {
    let sliced = n.slice(h, h + 64),
      results = await Promise.all(sliced.map(([y]) => lstat_6(y).catch((R) => ({ error: R }))));
    if (!(await probeManifestDir(e, sliced, results, r, a))) return !1;
  }
  return !0;
}
//@ chunk-qchp9vrd.js:79266-80000 placement
async function probeManifestDir(e, n, r, a, s) {
  for (let [h, [w, b]] of n.entries()) {
    let y = r[h];
    if ("error" in y) {
      let j = getErrnoCode(y.error);
      if (j === "ENOENT" || j === "ENOTDIR") continue;
      return logManifestNotConsulted(
        e,
        a,
        `${escapeNonAscii(w)} could not be examined (${j ?? "unknown error"})`,
      );
    }
    let R = y;
    if (b === "dir-or-absent" && !R.isDirectory() && !R.isSymbolicLink()) continue;
    let S =
        (b === "dir" && !R.isDirectory() && !R.isSymbolicLink()) ||
        (b === "file" && !R.isFile() && !R.isSymbolicLink()),
      T = b === "file" && R.isFile() && R.nlink > 1,
      N = S || T ? void 0 : await checkWritableByOthers(R, w, a, e),
      x = S
        ? `is not a regular ${b === "file" ? "file" : "directory"}`
        : T
          ? "is hard-linked elsewhere"
          : N?.message;
    if (N?.code === "symlink" && b === "in-tree") x = (await checkSymlinkInTree(w, e, a)) ?? void 0;
    if (x !== void 0)
      return logManifestNotConsulted(
        e,
        a,
        `${escapeNonAscii(w)} ${x}${N?.code === "group_unverifiable" ? ` \u2014 ${getGroupWritableHint(s)}` : ""}`,
      );
  }
  return !0;
}
//@ chunk-qchp9vrd.js:80000-81464 placement
async function checkSymlinkInTree(e, n, r) {
  let a = (S, T) => (T === S || toEvalPathError(S, T)) && path_8.relative(S, T).split(path_8.sep).some(kr);
  if (a(n, e)) return "is a symlink inside repository metadata";
  try {
    await checkRepoAuthoredPath(n, path_8.relative(n, e), "in-tree link");
  } catch (error) {
    return `is a symlink that is refused: ${errorMessage(error)}`;
  }
  let s;
  try {
    s = await readlink_3(e);
  } catch (error) {
    return `is a symlink that could not be read (${getErrnoCode(error) ?? "unknown error"})`;
  }
  let h =
    "is a symlink that leaves the plugin tree (this plugin was not named, so only its own examined entries may load)";
  if (path_8.isAbsolute(s))
    return "is an absolute symlink (this plugin was not named, so only relative links inside its own tree may load)";
  let dir = path_8.dirname(e);
  for (let S of s.split("/").filter((T) => T.length > 0))
    if (((dir = path_8.resolve(dir, S)), dir !== n && !toEvalPathError(n, dir)))
      return toEvalPathError(dir, n) ? "is a symlink that routes above the plugin directory" : h;
  if (dir === n) return "is a symlink to the plugin directory itself";
  let b;
  try {
    b = await realpath_4(e);
  } catch (error) {
    return `is a symlink whose target could not be resolved (${getErrnoCode(error) ?? "unknown error"})`;
  }
  let y;
  try {
    y = await getCachedRootRealpath(n, r);
  } catch (error) {
    return `is a symlink whose tree root could not be resolved (${getErrnoCode(error) ?? "unknown error"})`;
  }
  if (b === y || toEvalPathError(b, y)) return "is a symlink to the plugin directory or one above it";
  if (!toEvalPathError(y, b)) return h;
  let R;
  try {
    R = await realpath_4(path_8.dirname(e));
  } catch (error) {
    return `is a symlink whose directory could not be resolved (${getErrnoCode(error) ?? "unknown error"})`;
  }
  if (b === R || toEvalPathError(b, R)) return "is a symlink to its own directory or one above it";
  if (a(y, b)) return "is a symlink into repository metadata";
  return null;
}
//@ chunk-qchp9vrd.js:81464-81544 placement
async function hi(e, n) {
  return typeof process.getuid === "function" && (await makeTempModeProbeDir(e, n));
}
//@ chunk-qchp9vrd.js:81544-81693 placement
async function checkWritableByOthers(e, n, r, a) {
  await pa(r);
  let s = checkEntryOwnership(e, r);
  return (s?.code === "other_writable" || s?.code === "group_unverifiable") &&
    !(await makeTempModeProbeDir(n, r, a, e))
    ? void 0
    : s;
}
//@ chunk-qchp9vrd.js:81693-82799 placement
async function makeTempModeProbeDir(e, n, r, a) {
  let s;
  if (a !== void 0) s = a;
  else
    try {
      s = await lstat_6(e);
    } catch {
      return !0;
    }
  let dev = s.dev,
    w = n.modesByDevice.get(dev);
  if (w !== void 0) return w;
  let b = typeof process.getuid === "function" ? process.getuid() : -1,
    y = r ?? (s.isDirectory() ? e : path_8.dirname(e));
  n.tmpdirDevice ??= await lstat_6(tmpdir()).then(
    (S) => S.dev,
    () => -1,
  );
  let R = n.tmpdirDevice === dev ? [tmpdir(), y] : [y];
  for (let S of R) {
    let T, N;
    try {
      ((T = await mkdtemp_2(path_8.join(S, ".claude-eval-modes-"))),
        (N = await open_2(T, constants_2.O_RDONLY | constants_2.O_DIRECTORY | constants_2.O_NOFOLLOW)));
      let stats = await N.stat();
      if (stats.dev !== dev) continue;
      if (b !== -1 && stats.uid !== b) return (n.modesByDevice.set(dev, !0), !0);
      await N.chmod(448);
      let stats_2 = await N.stat();
      return (n.modesByDevice.set(dev, (stats_2.mode & 2) === 0), (stats_2.mode & 2) === 0);
    } catch {
      continue;
    } finally {
      if ((await N?.close().catch(() => {}), T !== void 0)) await rmdir_2(T).catch(() => {});
      {
        let x = (n.sweptProbeParents ??= new Set());
        if (!x.has(S)) {
          x.add(S);
          let j = Date.now() - 600000;
          await readdir_6(S)
            .then((K) =>
              Promise.all(
                K.filter((X) => X.startsWith(".claude-eval-modes-")).map(async (X) => {
                  let joined = path_8.join(S, X),
                    G = await lstat_6(joined).catch(() => null);
                  if (G !== null && G.mtimeMs < j) await rmdir_2(joined).catch(() => {});
                }),
              ),
            )
            .catch(() => {});
        }
      }
    }
  }
  return (n.modesByDevice.set(dev, !0), !0);
}
//@ chunk-qchp9vrd.js:82941-82989 placement
var fd = constants_3.O_RDONLY | constants_3.O_DIRECTORY | constants_3.O_NOFOLLOW;
//@ chunk-qchp9vrd.js:82989-83652 placement
async function detectPlatformFlavor(e, { harnessOwned: n = !1 } = {}) {
  if (getPlatform() === "windows") return;
  let r = n || getPlatform() === "linux" || getPlatform() === "wsl",
    a;
  try {
    let s = await lstat_7(e, { bigint: !0 });
    if (!s.isDirectory() || s.isSymbolicLink()) return;
    let h = (b) => b.ino === s.ino && b.dev === s.dev;
    if ((Number(s.mode) & 448) !== 448) {
      if (!r) return;
      if ((await chmod(e, 448), !h(await lstat_7(e, { bigint: !0 })))) return;
    }
    if ((await realpath_5(e)) !== e) return;
    let w = await open_3(e, fd);
    try {
      if (!h(await w.stat({ bigint: !0 }))) return;
      if (
        (await w.chmod(448),
        (a = (await readdir_7(e, { withFileTypes: !0 })).filter((b) => b.isDirectory()).map((b) => b.name)),
        !h(await lstat_7(e, { bigint: !0 })))
      )
        return;
    } finally {
      await w.close().catch(() => {});
    }
  } catch {
    return;
  }
  for (let s of a) await detectPlatformFlavor(path_9.join(e, s), { harnessOwned: n });
}
//@ chunk-qchp9vrd.js:83652-83680 placement
var wd = 1048576,
  ha = 16,
  ba = 1e5;
/**
 * 从目标出发发现评测用例：处理指向父目录的符号链接、不可检查路径等。
 */
//@ chunk-qchp9vrd.js:83680-86039 placement
async function discoverEvalCases(e, n = {}, r = {}) {
  if (r.targetScreened !== !0) await checkRepoAuthoredPath(getCwd(), e, "target");
  let a = r.trust ?? checkTreeTrust(),
    {
      evalDirSegments: evalDirSegments = [EVALS_DIR_NAME],
      frameRoot: frameRoot = null,
      adoptionDecided: adoptionDecided = !1,
      consentDecided: consentDecided = !1,
    } = r,
    y,
    R = [];
  try {
    let resolved = path_7.resolve(getCwd(), e);
    if (
      ((y = await realpathKeepingPromptFile(resolved)),
      !consentDecided && !isMagicDocsPromptFile(path_7.basename(y)))
    )
      a.consentRoot ??= y;
    let J = isMagicDocsPromptFile(path_7.basename(resolved)) ? path_7.dirname(resolved) : resolved,
      Z = await describeUnexaminable(J);
    if (Z.kind !== "ok")
      return {
        cases: [],
        root: resolved,
        suite: null,
        errors: [
          {
            file: Z.segment,
            error:
              Z.kind === "climb"
                ? `${escapeNonAscii(path_7.basename(Z.segment))} is a symbolic link to its own parent directory or one above it \u2014 refusing to treat that as the suite`
                : `${escapeNonAscii(path_7.basename(Z.segment))} could not be examined (${Z.code}) \u2014 refusing to treat that as the suite`,
          },
        ],
      };
    R = Z.ancestorReals;
  } catch (error) {
    if (isENOENT(error) || isFsInaccessible(error))
      return {
        cases: [],
        root: path_7.resolve(getCwd(), e),
        suite: null,
        errors: [
          {
            file: path_7.resolve(getCwd(), e),
            error: isENOENT(error)
              ? "no such file or directory (or not readable)"
              : `cannot be read (${getErrnoCode(error) ?? "unknown error"})`,
          },
        ],
      };
    throw error;
  }
  let S,
    T = !0,
    N = null;
  if (isMagicDocsPromptFile(path_7.basename(y))) {
    let dir = path_7.dirname(y),
      J =
        frameRoot && ft(dir, frameRoot)
          ? frameRoot
          : adoptionDecided
            ? null
            : (await resolvePluginDir(dir, a)).adopted;
    if (((S = J ?? dir), (T = J !== null), J === null && frameRoot && !ft(dir, frameRoot))) N = frameRoot;
  } else if (frameRoot && y !== frameRoot && ft(y, frameRoot)) S = frameRoot;
  else if (((S = y), frameRoot && y !== frameRoot && !ft(y, frameRoot))) N = frameRoot;
  let x = null;
  if (N !== null && evalDirSegments.length > 0) {
    let G = isMagicDocsPromptFile(path_7.basename(e))
        ? path_7.dirname(path_7.resolve(getCwd(), e))
        : path_7.resolve(getCwd(), e),
      J = await relativeSegmentsWithin(N, G),
      Z = J === null ? null : await canonicalizeSegmentCase(N, J, evalDirSegments);
    if (
      Z !== null &&
      (foldPathCase(Z, evalDirSegments, "exact") || foldPathCase(evalDirSegments, Z, "exact"))
    ) {
      let se = await resolveEvalSubdir(N, evalDirSegments);
      if (se !== null && !ft(N, se) && (ft(se, y) || ft(y, se))) {
        if (((x = se), S !== x && ft(S, x))) ((S = x), (T = !1));
      }
    }
  }
  let { caseDirs: caseDirs, skipped: skipped } = await compareCaseNames(
      y,
      evalDirSegments,
      frameRoot,
      path_7.resolve(getCwd(), e),
      R,
    ),
    X = [],
    W = [...skipped];
  for (let G of caseDirs) {
    let joined = path_7.join(G, "case.yaml");
    try {
      let [Z, se] = await Promise.all([parseCaseYamlFile(joined), parsePromptMdCase(G)]),
        Q = se ? normalizeCaseObject(Z, se, G) : Z,
        Se = se && Z ? "mixed" : se ? "prose" : "case_yaml",
        we =
          Q === null ? path_7.basename(G) : typeof Q.name === "string" && Q.name.length > 0 ? Q.name : void 0,
        Be =
          Q === null || Q.tags === void 0
            ? []
            : Array.isArray(Q.tags) && Q.tags.every((tag) => typeof tag === "string")
              ? Q.tags
              : void 0;
      if (we !== void 0 && Be !== void 0 && !matchesCaseFilter({ name: we, tags: Be }, n)) continue;
      if (Q === null) {
        W.push({
          file: G,
          error:
            "no case definition: case.yaml and prompt.md are empty or missing here (write the user prompt to test in prompt.md, or define the case in case.yaml)",
        });
        continue;
      }
      let Je = parseCaseYaml(Q);
      if (!Je.ok) {
        W.push({ file: Z !== null ? joined : G, error: Je.error });
        continue;
      }
      X.push(await checkCaseInUntrustedFolder(Je.case, joined, S, Se, a, T, N, evalDirSegments));
    } catch (error) {
      W.push({ file: G, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { cases: X, errors: W, root: S, suite: x };
}
//@ chunk-qchp9vrd.js:86039-86190 placement
function matchesCaseFilter(e, n) {
  if (n.caseGlob && !urlPatternToRegex(n.caseGlob, e.name)) return !1;
  if (n.tags && n.tags.length > 0) {
    if (!n.tags.some((tag) => e.tags.includes(tag))) return !1;
  }
  return !0;
}
//@ chunk-qchp9vrd.js:86190-86318 placement = urlPatternToRegex (1)
function urlPatternToRegex(e, n) {
  return new RegExp(
    `^${e
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")}$`,
  ).test(n);
}
//@ chunk-qchp9vrd.js:86318-88019 placement
async function checkCaseInUntrustedFolder(e, n, r, a, s, h, w = null, b = [EVALS_DIR_NAME]) {
  let y = (N) => getCachedPluginDirVerdict(N, s),
    dir = path_7.dirname(n),
    S = await probeSkillFolders(dir, r, s);
  if (
    S.nearest !== null &&
    !(h && S.nearest === r) &&
    !(await getCachedPluginDirVerdict(S.nearest, s, "core"))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      describeNearestPluginNotLoaded(e.name, S.nearest, s),
      "plugin eval: case inside an untrusted plugin/skill folder refused",
    );
  let T;
  if (e.plugins && e.plugins.length > 0) {
    T = [];
    for (let plugin of e.plugins) {
      let x = path_7.isAbsolute(plugin) ? plugin : path_7.resolve(dir, plugin);
      await checkRepoAuthoredPath(dir, plugin, `case ${Rm(e.name)}: plugins entry`);
      let j;
      try {
        j = await realpath_3(x);
      } catch (error) {
        let W = getErrnoCode(error),
          G =
            W === "ENOENT" &&
            (await lstat_5(x)
              .then((J) => J.isSymbolicLink())
              .catch(() => !1));
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          G
            ? `case ${Rm(e.name)}: plugins entry ${Rm(plugin)} is a symbolic link whose target does not exist`
            : W === "ENOENT" || W === "ENOTDIR"
              ? `case ${Rm(e.name)}: plugins entry ${Rm(plugin)} does not exist`
              : `case ${Rm(e.name)}: plugins entry ${Rm(plugin)} is unreadable (${W ?? "unknown error"})`,
          "plugin eval: plugins entry absent or unreadable",
        );
      }
      let K = w !== null && (j === w || ft(j, w));
      if (!ft(j, r) && !K)
        throw Error(
          `case ${Rm(e.name)}: plugins entry ${Rm(plugin)} resolves to ${escapeNonAscii(j)}, outside the containment root ${escapeNonAscii(r)} (the enclosing plugin for a target inside one you control, else the directory you ran 'claude plugin eval' against). Only plugins under it can be loaded from case.yaml.`,
        );
      if (!(h && j === r) && !(w !== null && j === w) && !(await y(j)))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `case ${Rm(e.name)}: plugins entry ${Rm(plugin)} resolves to ${escapeNonAscii(j)}, which is not loaded: ${Un(j, s)}.`,
          "plugin eval: untrusted plugins entry refused",
        );
      T.push(j);
    }
  } else {
    let byManifest = S.byManifest;
    if (byManifest !== null && !(h && byManifest === r) && !(await y(byManifest)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        describeNearestPluginNotLoaded(e.name, byManifest, s),
        "plugin eval: untrusted auto-detected plugin refused",
      );
    T = byManifest ? [byManifest] : w !== null ? [w] : [];
  }
  return {
    ...e,
    caseFile: n,
    caseDir: dir,
    caseSource: a,
    pluginDirs: T,
    pluginDirsUnderTest: T,
    evalDirSegments: b,
  };
}
//@ chunk-qchp9vrd.js:88019-88196 placement
function describeNearestPluginNotLoaded(e, n, r) {
  return `case ${Rm(e)}: the nearest plugin, ${escapeNonAscii(n)}, is not loaded: ${Un(n, r)} (fix its ownership/modes, or name that plugin directory itself as the target).`;
}
//@ chunk-qchp9vrd.js:88196-88235 placement
function ft(e, n) {
  return e === n || toEvalPathError(n, e);
}
//@ chunk-qchp9vrd.js:88235-88295 placement
async function Cr(e, n) {
  let r = await Ar(n);
  return ft(e, r) ? r : e;
}
//@ chunk-qchp9vrd.js:88295-88364 placement
function Ar(e) {
  return ((e.realCwd ??= realpath_3(getCwd()).catch(() => getCwd())), e.realCwd);
}
/**
 * 解析用例引用的路径，拒绝穿出目录树或指向其他主机的链接。
 */
//@ chunk-qchp9vrd.js:88364-90572 placement
async function resolveCaseTargetPath(e, n, r) {
  let a = [],
    s = new Set();
  for (let h of e) {
    if (s.has(h)) continue;
    s.add(h);
    let w = r !== null && !ft(h, n) && ft(h, r) ? r : n,
      base = path_7.basename(h),
      y = null,
      R = !1,
      S = isZipPathCaseInsensitive(h);
    for (let T of S ? [] : MANIFEST_IDENTITY_READ_RELPATHS) {
      let joined = path_7.join(h, T),
        x = { link: !1 },
        j = await checkAutomounterPath(h, T, w, void 0, x);
      if (j !== null) {
        y =
          j === Tr
            ? `${T} is reached through a component that could not be inspected \u2014 not resolved or read here`
            : j === Oa
              ? `${T} is reached through a symbolic link that leaves the tree \u2014 not resolved or read here`
              : `${T} is reached through a symbolic link naming another host (${j}) \u2014 not resolved or read here`;
        break;
      }
      let K;
      try {
        K = await realpath_3(joined);
      } catch (error) {
        let G = getErrnoCode(error);
        if ((G === "ENOENT" || G === "ENOTDIR") && x.link) {
          y = `${T} is reached through a symbolic link that does not resolve to a file in the tree \u2014 not read here`;
          break;
        }
        if (G === "ENOENT" || G === "ENOTDIR") {
          if (T === PLUGIN_MANIFEST_PATH) R = !0;
          continue;
        }
        y = `${T}: ${errorMessage(error)} \u2014 not read here`;
        break;
      }
      if (!ft(K, w)) {
        y = `${T} resolves outside the eval tree through a symbolic link \u2014 not read here`;
        break;
      }
      let X;
      try {
        X = await lstat_5(K);
      } catch (error) {
        y = `${T}: ${errorMessage(error)} \u2014 not read here`;
        break;
      }
      if (!X.isFile()) {
        y = `${T} is not a regular file \u2014 not read here`;
        break;
      }
      if (X.size > ao) {
        y = `${T} is ${X.size} bytes, over the ${ao}-byte cap \u2014 not read here`;
        break;
      }
    }
    if (S || (y === null && R)) {
      let T = null;
      try {
        T = (await lstat_5(h)).isDirectory();
      } catch {}
      if (S) {
        a.push(
          T === !0
            ? {
                name: base,
                path: h,
                problem: "will_not_load",
                problemDetail:
                  "a directory whose name ends in .zip \u2014 the child treats that name as an archive and fails to load it; rename the directory",
              }
            : { name: base, path: h, problem: "archive_not_probed" },
        );
        continue;
      }
      if (T === !1) {
        a.push({
          name: base,
          path: h,
          problem: "will_not_load",
          problemDetail: "not a directory or .zip archive \u2014 the child loads it as an empty plugin",
        });
        continue;
      }
    }
    if (y !== null) {
      a.push({ name: base, path: h, problem: "identity_unverified", problemDetail: y });
      continue;
    }
    try {
      let { manifest: manifest } = await loadPluginManifest(h, base, "plugin eval", [], { noTelemetry: !0 });
      a.push({
        name: manifest.name,
        ...(manifest.version !== void 0 && { version: manifest.version }),
        path: h,
        ...(manifest.defaultEnabled === !1 && { problem: "disabled_by_default" }),
      });
    } catch (error) {
      let N =
        error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
          ? error.errorClass
          : void 0;
      a.push({
        name: base,
        path: h,
        problem:
          N === MANIFEST_ERROR_CLASSES.jsonInvalid || N === MANIFEST_ERROR_CLASSES.schemaInvalid
            ? "manifest_invalid"
            : "identity_unverified",
        problemDetail: errorMessage(error),
      });
    }
  }
  return a;
}
//@ chunk-qchp9vrd.js:90572-90636 placement
async function findNearestSkillFolder(e, n, r, a = 32) {
  return (await probeSkillFolders(e, n, r, a)).nearest;
}
//@ chunk-qchp9vrd.js:90636-91125 placement
async function probeSkillFolders(e, n, r, a = 32) {
  let s = (y) => {
      let R = r.skillFolderProbes.get(y);
      if (R === void 0)
        ((R = (async () => {
          if (!(await qs(y))) return !1;
          for (let S of MAGIC_DOCS_PROMPT_FILES) if (await pathExistsLstat(path_7.join(y, S))) return !1;
          return !0;
        })()),
          r.skillFolderProbes.set(y, R));
      return R;
    },
    h = e,
    w = null,
    b = (y) => ({ nearest: w ?? y, byManifest: y });
  for (let y = 0; y < a; y++) {
    if (isNetworkMountRoot(h)) return b(w);
    if ((await pathExistsLstat(path_7.join(h, "plugin.json"))) || (await hasClaudePluginDir(h))) return b(h);
    if (w === null && (await s(h))) w = h;
    if (h === n) return b(w);
    let dir = path_7.dirname(h);
    if (dir === h) return b(w);
    h = dir;
  }
  return b(w);
}
//@ chunk-qchp9vrd.js:91125-91329 placement
async function hasClaudePluginDir(e) {
  try {
    let n = await lstat_5(path_7.join(e, ".claude-plugin"));
    if (n.isSymbolicLink()) return !0;
    if (!n.isDirectory()) return !1;
  } catch (error) {
    return !isNotFoundErrno_3(error);
  }
  return pathExistsLstat(path_7.join(e, ".claude-plugin", "plugin.json"));
}
//@ chunk-qchp9vrd.js:91329-91399 placement
async function pathExistsLstat(e) {
  try {
    return (await lstat_5(e), !0);
  } catch (error) {
    return !isNotFoundErrno_3(error);
  }
}
//@ chunk-qchp9vrd.js:91399-91460 placement = isRealPathWithinTeamDir (1)
function isNotFoundErrno_3(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-qchp9vrd.js:91460-91776 placement
async function parseCaseYamlFile(e) {
  let n = await tn(e, wd, "case.yaml");
  if (n === null) return null;
  let r;
  try {
    r = parseYaml(n);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `YAML parse failed: ${String(error)}`,
      "case.yaml: YAML parse failed",
    );
  }
  if (r === null || r === void 0) return null;
  if (typeof r !== "object" || Array.isArray(r)) throw Error("case.yaml must be a YAML object");
  return r;
}
//@ chunk-qchp9vrd.js:91776-91809 placement = loadMagicDocsPrompt (0.476)
var MAGIC_DOCS_PROMPT_FILES = ["case.yaml", "prompt.md"];
//@ chunk-qchp9vrd.js:91809-91846 placement
function isMagicDocsPromptFile(e) {
  return MAGIC_DOCS_PROMPT_FILES.includes(e);
}
//@ chunk-qchp9vrd.js:91846-91970 placement
async function realpathKeepingPromptFile(e) {
  if (!isMagicDocsPromptFile(path_7.basename(e))) return realpath_3(e);
  return (await lstat_5(e), path_7.join(await realpath_3(path_7.dirname(e)), path_7.basename(e)));
}
//@ chunk-qchp9vrd.js:91970-92345 placement
async function describeUnexaminable(e) {
  let n = [];
  for (let a = e; ; a = path_7.dirname(a)) if ((n.unshift(a), path_7.dirname(a) === a)) break;
  let r = [];
  for (let a of n) {
    let s, h;
    try {
      ((s = (await lstat_5(a)).isSymbolicLink()), (h = await realpath_3(a)));
    } catch (error) {
      return { kind: "unexaminable", segment: a, code: getErrnoCode(error) ?? "unknown error" };
    }
    if (s && r.some((w) => h === w || toEvalPathError(h, w))) return { kind: "climb", segment: a };
    r.push(h);
  }
  return (r.pop(), { kind: "ok", ancestorReals: r });
}
/**
 * 解析评测用的插件目录：最近的技能目录可信则采用，否则拒绝；没有时按其他方式查找。
 */
//@ chunk-qchp9vrd.js:92345-92574 placement
async function resolvePluginDir(e, n, r = "tree") {
  let a = await Cr(e, n),
    s = await findNearestSkillFolder(e, a, n, Number.POSITIVE_INFINITY);
  if (s !== null)
    return (await getCachedPluginDirVerdict(s, n, r))
      ? { adopted: s, refused: null, namedOnly: null }
      : { adopted: null, refused: s, namedOnly: null };
  return resolveParentPluginDir(e, n, r, a);
}
/**
 * 从目标的上一级向上查找最近的插件目录；目标或插件目录不可信时只给出名称，否则按缓存的目录判定结果采纳或拒绝。
 */
//@ chunk-qchp9vrd.js:92574-92923 placement
async function resolveParentPluginDir(e, n, r = "tree", a) {
  let s = a ?? (await Cr(e, n)),
    dir = path_7.dirname(s),
    w = dir === s ? null : await findNearestSkillFolder(dir, null, n);
  if (w === null) return { adopted: null, refused: null, namedOnly: null };
  if (!(await hi(e, n)) || !(await hi(w, n))) return { adopted: null, refused: null, namedOnly: w };
  return (await getCachedPluginDirVerdict(w, n, r))
    ? { adopted: w, refused: null, namedOnly: null }
    : { adopted: null, refused: w, namedOnly: null };
}
//@ chunk-qchp9vrd.js:92923-93046 placement
async function resolveEvalSubdir(e, n) {
  try {
    return (
      await checkRepoAuthoredPath(e, n.join(path_7.sep), "eval directory"),
      await realpath_3(path_7.join(e, ...n))
    );
  } catch {
    return null;
  }
}
//@ chunk-qchp9vrd.js:93046-93304 placement
async function relativeSegmentsWithin(e, n) {
  let r = [];
  for (let a = n; ; a = path_7.dirname(a)) if ((r.unshift(a), path_7.dirname(a) === a)) break;
  for (let a of r) {
    let s = await realpath_3(a).catch(() => null);
    if (s === null) continue;
    if (s === e || ft(s, e)) return [...Mt(path_7.relative(e, s)), ...Mt(path_7.relative(a, n))];
  }
  return null;
}
/**
 * 在大小写不敏感的文件系统上把路径各段改成磁盘上的实际大小写（仅当两种写法指向同一 inode 时替换）。
 */
//@ chunk-qchp9vrd.js:93304-93750 placement
async function canonicalizeSegmentCase(e, n, r) {
  let sliced = n.slice();
  for (let s = 0; s < sliced.length && s < r.length; s++) {
    let h = sliced[s],
      w = r[s];
    if (h === w) continue;
    if (h.toLowerCase() !== w.toLowerCase()) break;
    let joined = path_7.join(e, ...sliced.slice(0, s));
    try {
      await checkRepoAuthoredPath(joined, w, "eval directory");
    } catch {
      break;
    }
    let [y, R] = await Promise.all([
      stat_2(path_7.join(joined, h), { bigint: !0 }).catch(() => null),
      stat_2(path_7.join(joined, w), { bigint: !0 }).catch(() => null),
    ]);
    if (y === null || R === null || y.ino === 0n || y.dev !== R.dev || y.ino !== R.ino) break;
    sliced[s] = w;
  }
  return sliced;
}
//@ chunk-qchp9vrd.js:93750-93808 placement
function Mt(e) {
  return e.split(path_7.sep).filter((n) => n !== "");
}
//@ chunk-qchp9vrd.js:93808-94884 placement
async function compareCaseNames(e, n, r, a, s = []) {
  if (isMagicDocsPromptFile(path_7.basename(e))) return { caseDirs: [path_7.dirname(e)], skipped: [] };
  let h = new Set(),
    w = [],
    b = n.length === 1 && n[0] === EVALS_DIR_NAME,
    y,
    R,
    S,
    T = r === null || b ? null : await relativeSegmentsWithin(r, a);
  if (b)
    ((y = Mt(e).includes(n[0]) || Mt(a).includes(n[0])), (R = (j) => pathEndsWith(Mt(j), n)), (S = () => !0));
  else if (r !== null && (ft(e, r) || T !== null)) {
    let j = Mt(path_7.relative(r, e)),
      K = T === null ? j : await canonicalizeSegmentCase(r, T, n),
      X = (G) => Mt(path_7.relative(r, G)),
      W = (G) => [...K, ...Mt(path_7.relative(e, G))];
    ((y = foldPathCase(j, n, "exact") || foldPathCase(K, n, "exact")),
      (R = (G) => ro(X(G), n) || ro(W(G), n)),
      (S = (G) => foldPathCase(n, X(G), "exact") || foldPathCase(n, W(G), "exact")));
  } else {
    let j = getPlatform() === "macos" || getPlatform() === "windows" ? "folded" : "exact";
    ((y = pathEndsWith(Mt(e), n, j) || pathEndsWith(Mt(a), n, j)),
      (R = (K) => ro(Mt(path_7.relative(e, K)), n)),
      (S = (K) => foldPathCase(n, Mt(path_7.relative(e, K)), "exact")));
  }
  let N = await realpath_3(e).catch(() => e),
    x = {
      opensEvalDir: R,
      mayLeadToEvalDir: S,
      routeIndependent: b,
      skipped: w,
      rootReal: N,
      typedAncestorReals: s,
      reported: new Set(),
      foundReal: new Set(),
      onRoute: new Set(),
      listedAt: new Map(),
      deferredCuts: new Map(),
      budget: { remaining: ba, reported: !1 },
    };
  await scanSuiteDirectory(e, N, h, 0, y, x);
  for (let [j, K] of x.deferredCuts) if (!x.listedAt.has(j)) w.push(K);
  return { caseDirs: [...h].sort(), skipped: w };
}
/**
 * 扫描套件目录（嵌套层级上限、.git 等），收集用例。
 */
//@ chunk-qchp9vrd.js:94884-98795 placement
async function scanSuiteDirectory(e, n, r, a, s, h) {
  let w = (N, x, j) => {
      if (!h.reported.has(N)) (h.reported.add(N), h.skipped.push({ file: x, error: j }));
    },
    b = s || !h.routeIndependent || a === 0,
    y = (N) => {
      if (b) w(n, e, N);
      else logForDebugging(`plugin eval: ${escapeNonAscii(e)}: ${N}`);
    };
  if (a > ha) {
    let N = `nested more than ${ha} directories below the target by this route \u2014 not scanned from here (move the suite higher, or target it directly)`;
    if (b) {
      let x = `${s ? "suite" : "tree"}:${n}`;
      if (!h.deferredCuts.has(x)) h.deferredCuts.set(x, { file: e, error: N });
    } else logForDebugging(`plugin eval: ${escapeNonAscii(e)}: ${N}`);
    return;
  }
  let R;
  try {
    R = await readdir_5(e, { withFileTypes: !0 });
  } catch (error) {
    let x = getErrnoCode(error);
    if (x === "ENOTDIR" && a === 0) {
      y("is a file, not a directory or a case file (case.yaml / prompt.md) \u2014 nothing to scan");
      return;
    }
    if (x === "ENOENT" || x === "ENOTDIR") return;
    if (isFsInaccessible(error)) {
      y(`cannot be read (${x ?? "unknown error"}) \u2014 not scanned`);
      return;
    }
    throw error;
  }
  let S = `${s ? "suite" : "tree"}:${n}`,
    T = h.listedAt.get(S);
  if (T === void 0 || a < T) h.listedAt.set(S, a);
  if (s && R.some((N) => !N.isDirectory() && isMagicDocsPromptFile(N.name))) {
    if (h.foundReal.has(n)) {
      logForDebugging(
        `plugin eval: ${escapeNonAscii(e)} is the same case directory as one already found \u2014 counted once`,
      );
      return;
    }
    (h.foundReal.add(n), r.add(e));
    return;
  }
  if (s && a > 0 && !h.opensEvalDir(e))
    logForDebugging(
      `plugin eval: ${escapeNonAscii(e)} has no prompt.md or case.yaml \u2014 not a case; scanning its subdirectories`,
    );
  h.onRoute.add(S);
  try {
    for (let N of R) {
      let joined = path_7.join(e, N.name);
      if (kr(N.name) || hr.has(N.name)) {
        if (
          N.name === "mocks" &&
          s &&
          (await getFileKind(N, joined, "unknown")) === "dir" &&
          (await looksLikeEvalSuite(e, N.name))
        )
          w(
            joined,
            joined,
            "mocks/ is reserved for mock responders \u2014 cases placed there (or in a case group by that name) are not run, and their files would be read as mock responders; rename the directory",
          );
        continue;
      }
      let j = await getFileKind(N, joined, "unknown");
      if (j === "unknown") {
        let W = `${N.name} could not be examined (its type is unknown and it cannot be stat'ed) \u2014 not scanned`;
        if (s || h.opensEvalDir(joined) || (!h.routeIndependent && h.mayLeadToEvalDir(joined)))
          w(`${n}${path_7.sep}${N.name}`, joined, W);
        else logForDebugging(`plugin eval: ${escapeNonAscii(joined)}: ${W}`);
        continue;
      }
      let joined_2 = path_7.join(n, N.name),
        X = s || h.opensEvalDir(joined);
      if (j === "symlink") {
        let W = s || h.opensEvalDir(joined) || (!h.routeIndependent && h.mayLeadToEvalDir(joined)),
          G = (Z) => {
            if (W) w(`${n}${path_7.sep}${N.name}`, joined, Z);
            else logForDebugging(`plugin eval: ${escapeNonAscii(joined)}: ${Z}`);
          };
        try {
          await checkRepoAuthoredPath(e, N.name, "plugin eval");
        } catch (error) {
          G(errorMessage(error));
          continue;
        }
        let J;
        try {
          J = await stat_2(joined);
        } catch (error) {
          G(
            `${N.name} is a symbolic link whose target ${isENOENT(error) ? "does not exist" : `cannot be read (${getErrnoCode(error) ?? "unknown error"})`} \u2014 skipped`,
          );
          continue;
        }
        if (((j = J.isDirectory() ? "dir" : "other"), j === "dir")) {
          let Z = await realpath_3(joined).catch(() => null);
          if (Z === null) {
            G(`${N.name} is a symbolic link whose target could not be resolved \u2014 not followed`);
            continue;
          }
          if (((joined_2 = Z), joined_2 === n || toEvalPathError(joined_2, n))) {
            G(`${N.name} is a symbolic link to its own directory or one above it \u2014 not followed`);
            continue;
          }
          if (
            joined_2 === h.rootReal ||
            h.typedAncestorReals.some(
              (typedAncestorReal) =>
                joined_2 === typedAncestorReal || toEvalPathError(joined_2, typedAncestorReal),
            ) ||
            toEvalPathError(joined_2, h.rootReal)
          ) {
            G(`${N.name} is a symbolic link to the directory under test or one above it \u2014 not followed`);
            continue;
          }
          if ((X || h.routeIndependent) && h.onRoute.has(`${X ? "suite" : "tree"}:${joined_2}`)) {
            logForDebugging(
              `plugin eval: ${escapeNonAscii(joined)} links back into a directory on the current route \u2014 not followed again`,
            );
            continue;
          }
        }
      }
      if (j !== "dir") continue;
      if (!X && !h.mayLeadToEvalDir(joined)) continue;
      if (isNetworkMountRoot(joined_2) || isNetworkMountRoot(joined)) {
        let W = `${N.name} is an automounter map directory \u2014 not scanned (listing it would reach network hosts)`;
        if (X || !h.routeIndependent) w(`${n}${path_7.sep}${N.name}`, joined, W);
        else logForDebugging(`plugin eval: ${escapeNonAscii(joined)}: ${W}`);
        continue;
      }
      if (X || h.routeIndependent) {
        let W = h.listedAt.get(`${X ? "suite" : "tree"}:${joined_2}`);
        if (W !== void 0 && W <= a + 1) {
          logForDebugging(
            `plugin eval: ${escapeNonAscii(joined)} was already listed by another route at this depth or shallower \u2014 not walked again`,
          );
          continue;
        }
      }
      if (h.budget.remaining <= 0) {
        if (!h.budget.reported)
          ((h.budget.reported = !0),
            h.skipped.push({
              file: joined,
              error: `the tree under the target has more than ${ba} directories to walk (links can inflate it) \u2014 the rest was not scanned`,
            }));
        continue;
      }
      (h.budget.remaining--, await scanSuiteDirectory(joined, joined_2, r, a + 1, X, h));
    }
  } finally {
    h.onRoute.delete(S);
  }
}
//@ chunk-qchp9vrd.js:98795-98855 placement
var Cd = `[core]
	repositoryformatversion = 0
	bare = false
`;
//@ chunk-qchp9vrd.js:98855-99860 placement
async function createEvalTempDir() {
  let e = getPlatform() === "macos" ? "/tmp" : os_2_2.tmpdir(),
    n = getPlatform() === "macos" ? "e-" : "claude-eval-",
    r = await realpath_3(await mkdtemp(path_7.join(e, n))),
    joined = path_7.join(r, "config"),
    joined_2 = path_7.join(r, "home"),
    joined_3 = path_7.join(joined_2, "cwd"),
    joined_4 = path_7.join(r, "out"),
    joined_5 = path_7.join(r, "tmp");
  (await mkdir_2(joined_3, { recursive: !0 }),
    await mkdir_2(joined, { recursive: !0 }),
    await mkdir_2(joined_4, { recursive: !0 }),
    await mkdir_2(joined_5, { recursive: !0, mode: 448 }),
    await writeFile(
      path_7.join(joined, ".claude.json"),
      jsonStringify({ hasCompletedOnboarding: !0, autoUpdates: !1, bypassPermissionsModeAccepted: !1 }),
    ),
    await writeFile(
      path_7.join(joined_2, ".gitconfig"),
      `[user]
	name = Plugin Eval
	email = eval@example.invalid
`,
    ));
  let joined_6 = path_7.join(joined_2, ".git");
  return (
    await mkdir_2(path_7.join(joined_6, "objects"), { recursive: !0 }),
    await mkdir_2(path_7.join(joined_6, "refs", "heads"), { recursive: !0 }),
    await mkdir_2(path_7.join(joined_6, "hooks"), { recursive: !0 }),
    await writeFile(
      path_7.join(joined_6, "HEAD"),
      `ref: refs/heads/main
`,
    ),
    await writeFile(path_7.join(joined_6, "config"), Cd),
    await writeFile(
      path_7.join(joined_6, "commondir"),
      `.
`,
    ),
    {
      root: r,
      cwd: joined_3,
      configDir: joined,
      home: joined_2,
      outDir: joined_4,
      tmpDir: joined_5,
      operatorConfigDir: getClaudeConfigDir(),
      cleanup: async () => {
        (await detectPlatformFlavor(r), await rm_2_2(r, { recursive: !0, force: !0, maxRetries: 2 }));
      },
    }
  );
}
//@ chunk-qchp9vrd.js:99860-99942 placement
var Tr = "a component that could not be inspected",
  Oa = "a link that leaves the tree";
//@ chunk-qchp9vrd.js:99942-100486 placement
async function checkAutomounterPath(e, n, r, a = { hops: 16 }, s = { link: !1 }) {
  let h = e,
    parts = n.split(path_7.sep);
  for (let [b, y] of parts.entries()) {
    h = path_7.join(h, y);
    let R;
    try {
      if (!(await lstat_5(h)).isSymbolicLink()) continue;
      ((s.link = !0), (R = await readlink_2(h)));
    } catch (error) {
      let x = getErrnoCode(error);
      return x === "ENOENT" || x === "ENOTDIR" ? null : Tr;
    }
    if (escapesAfterDescent(R)) return Tr;
    let S = ya(R);
    if (S !== null) return S;
    let resolved = path_7.resolve(path_7.dirname(h), R);
    if (resolved === r || ft(resolved, r)) {
      if (--a.hops < 0) return Tr;
      let N = await checkAutomounterPath(r, path_7.relative(r, resolved), r, a);
      if (N !== null) return N;
      if (b !== parts.length - 1) return Tr;
      continue;
    }
    return ya(resolved) ?? (Qg(resolved) ? "an automounter path" : Oa);
  }
  return null;
}
//@ chunk-qchp9vrd.js:100486-100620 placement
function escapesAfterDescent(e) {
  let n = !1;
  for (let r of e.replace(/\\/g, "/").split("/"))
    if (r === "..") {
      if (n) return !0;
    } else if (r !== "" && r !== ".") n = !0;
  return !1;
}
//@ chunk-qchp9vrd.js:100620-100676 placement
function ya(e) {
  return CL(e) ? "a network share path" : null;
}
/**
 * 判断目录是否像插件评测套件：路径须为仓库内文件，存在套件文件或任一子目录（最多 64 个）含 case.yaml。
 */
//@ chunk-qchp9vrd.js:100676-100978 placement
async function looksLikeEvalSuite(e, n) {
  try {
    await checkRepoAuthoredPath(e, n, "plugin eval");
  } catch {
    return !1;
  }
  if (await Id(path_7.join(e, n))) return !0;
  let r;
  try {
    r = await readdir_5(path_7.join(e, n), { withFileTypes: !0 });
  } catch {
    return !1;
  }
  for (let a of r.filter((s) => s.isDirectory()).slice(0, 64))
    try {
      return (await lstat_5(path_7.join(e, n, a.name, "case.yaml")), !0);
    } catch {}
  return !1;
}
//@ chunk-qchp9vrd.js:100978-101068 placement
async function Id(e) {
  for (let n of MAGIC_DOCS_PROMPT_FILES)
    try {
      return (await lstat_5(path_7.join(e, n)), !0);
    } catch {}
  return !1;
}
//@ chunk-qchp9vrd.js:101143-101262 placement
class UnenumerablePluginError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  unenumerable;
  constructor(e, n, r) {
    super(n, r);
    this.unenumerable = e;
    this.name = "UnenumerablePluginError";
  }
}
/**
 * 汇总多个插件的 MCP 服务器（无法枚举的插件记录到列表中）。
 */
//@ chunk-qchp9vrd.js:101262-101446 placement
async function collectPluginMcpServers(e, n) {
  let r = new Map();
  for (let a of e)
    try {
      for (let [s, h] of await enumeratePluginMcpServers(a)) r.set(s, h);
    } catch (error) {
      if (n !== void 0 && error instanceof UnenumerablePluginError) {
        n.push(error.unenumerable);
        continue;
      }
      throw error;
    }
  return r;
}

export {
  ua,
  UnenumerablePluginError,
  detectPlatformFlavor,
  ft,
  Mt,
  collectPluginMcpServers,
  discoverEvalCases,
  resolveCaseTargetPath,
  createEvalTempDir,
  Ar,
  findNearestSkillFolder,
  resolvePluginDir,
  realpathKeepingPromptFile,
  isMagicDocsPromptFile,
  Cr,
  getCachedPluginDirVerdict,
  resolveParentPluginDir,
  checkWritableByOthers,
};
