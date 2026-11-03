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
import path from "path";
import {
  readdir,
  realpath,
  lstat,
  readlink,
  mkdtemp,
  open,
  rmdir,
  chmod,
  stat,
  mkdir,
  writeFile,
  rm as rm_2,
} from "fs/promises";
import os_2, { tmpdir } from "os";
import { constants } from "fs";
import {
  isInsideConsentRoot,
  groupNamespaceInfo,
  logManifestNotConsulted,
  checkEntryOwnership,
  checkTreeTrust,
  reasonFor,
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
import {
  toEvalPathError,
  EVALS_DIR_NAME,
  foldPathCase,
  MAX_TEXT_FILE_BYTES,
  hasSkillFile,
  pathEndsWith,
  isSameLengthAndPath,
  SKIPPED_SUBDIR_NAMES,
} from "./evalDir.js";
import { checkRepoAuthoredPath, formatGuardValueJson } from "../../cli/handlers/pluginEval/mockGuards.js";
import { getPlatform } from "../../utils/platform.js";
import { getCwd } from "../../utils/cwd.js";
import { parsePromptMdCase, normalizeCaseObject, parseCaseYaml, readTextFile } from "./caseSchema.js";
import {
  isZipPathCaseInsensitive,
  MANIFEST_IDENTITY_READ_RELPATHS,
  loadPluginManifest,
} from "../../utils/plugins/pluginLoader.js";
import { PLUGIN_MANIFEST_PATH } from "../../utils/plugins/commandSource.js";
import { MANIFEST_ERROR_CLASSES } from "../../utils/plugins/pluginManifestRead.js";
import { isNetworkMountRoot_2, isNetworkRelatedPath } from "../../utils/networkPaths.js";
import { parseYaml } from "../../utils/yaml.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { isUncOrDeviceSpelling } from "../../utils/fsJunctions.js";
import { enumeratePluginMcpServers } from "./mocks/pluginMcpEnumeration.js";

//@ chunk-qchp9vrd.js:75370-75527 placement = BASH_LIST_COMMANDS (0.768)
/**
 * （切分错误，属插件评测）按 "模式:目录" 缓存插件目录的属主/权限检查结果；已信任时直接 true。
 */
function getCachedPluginDirVerdict(e, n, r = "tree") {
  if (isInsideConsentRoot(n, e)) return Promise.resolve(true);
  let a = `${r}:${e}`;
  let s = n.verdicts.get(a);
  if (s === undefined) {
    s = checkPluginDirTrust(e, n, r);
    n.verdicts.set(a, s);
  }
  return s;
}
//@ chunk-qchp9vrd.js:75527-76060 placement
async function checkPluginDirTrust(e, n, r) {
  if (typeof process.getuid !== "function") return true;
  await groupNamespaceInfo(n);
  let a = [
    [e, "dir"],
    [path.join(e, ".claude-plugin"), "dir-or-absent"],
  ];
  let s = [
    [path.join(e, ".claude-plugin", "plugin.json"), "file"],
    [path.join(e, "plugin.json"), "file"],
    [path.join(e, "SKILL.md"), "file"],
  ];
  if (!(await probeEntriesInBatches(e, a, n, r)) || !(await probeEntriesInBatches(e, s, n, r))) return false;
  if (r === "core") return true;
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
/**
 * 遍历目录的总预算（20000）。
 */
var MAX_TREE_DEPTH = 12;
var MAX_TREE_ENTRIES = 100;
var MAX_GIT_OBJECT_DEPTH = MAX_TREE_ENTRIES + 8;
var GIT_OBJECT_DIR_NAMES = new Set(["objects", "lfs"]);
var MAX_GIT_OBJECTS = 200000;
var MAX_GIT_OBJECT_NESTING = 8;
var MAX_WALK_DIRECTORIES = 20000;
//@ chunk-qchp9vrd.js:76139-76300 placement
function getGroupWritableHint(e) {
  return e === "tree"
    ? "chmod -R g-w it, or run from / name the plugin directory"
    : "chmod -R g-w it, or pass --eval-dir to name the directory yourself";
}
//@ chunk-qchp9vrd.js:76300-76484 placement
function isNestedModulesPath(e, n) {
  if (e === null) return false;
  let relativePath = path.relative(e, n);
  if (relativePath === "") return true;
  let parts = relativePath.split(path.sep);
  return (
    parts.length % 2 === 0 && parts.every((s, h) => (h % 2 === 0 ? s.toLowerCase() === "modules" : s !== ""))
  );
}
//@ chunk-qchp9vrd.js:76484-76531 placement
/**
 * 判断目录名是否为 .git（忽略大小写）。
 */
function isGitDir(name) {
  return name.toLowerCase() === ".git";
}
//@ chunk-qchp9vrd.js:76531-78920 placement
/**
 * 检查目录树能否完整检查（不可读目录、条目/层级上限、.git 对象库大小）。
 */
async function examineTreeLimits(e, n) {
  let r = `its tree cannot be fully examined (a directory is unreadable, or it holds more than ${n.treeMaxEntries} entries / ${MAX_TREE_DEPTH} levels \u2014 name the plugin directory itself to evaluate it)`;
  let problem = `its .git object stores hold more than ${MAX_GIT_OBJECTS} entries, nest deeper than ${MAX_GIT_OBJECT_NESTING} levels, or one is unreadable \u2014 they cannot be fully examined; name the plugin directory itself to evaluate it`;
  let s = [];
  let h = [];
  let w = null;
  let b = [[e, 0]];
  let y = (R) => isInsideConsentRoot(n, R);
  while (b.length > 0) {
    let [R, S] = b.pop();
    if (y(R)) continue;
    let T;
    try {
      T = await readdir(R, {
        withFileTypes: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
      return {
        kind: "problem",
        problem: r,
      };
    }
    for (let N of T) {
      let joined = path.join(R, N.name);
      if (isGitDir(N.name)) {
        let fileKind = await getFileKind(N, joined, "unknown");
        if (fileKind === "unknown")
          return {
            kind: "problem",
            problem: `${escapeNonAscii(joined)} could not be examined (its type could not be read); name the plugin directory itself to evaluate it`,
          };
        if (R !== e || fileKind !== "dir")
          return {
            kind: "problem",
            problem: `${escapeNonAscii(joined)} \u2014 the tree contains repository metadata that was not created here (${fileKind === "symlink" ? "a symlinked .git" : fileKind === "file" ? "a gitdir file" : fileKind === "other" ? "a .git that is not a directory" : "a nested .git directory"}); name the plugin directory itself to evaluate it`,
          };
        if (!y(joined)) s.push(joined);
        if (s.length > n.treeMaxEntries)
          return {
            kind: "problem",
            problem: r,
          };
        w = joined;
        b.push([joined, MAX_TREE_ENTRIES]);
        continue;
      }
      if (
        S >= MAX_TREE_ENTRIES &&
        GIT_OBJECT_DIR_NAMES.has(N.name.toLowerCase()) &&
        isNestedModulesPath(w, R) &&
        (await isDirectory(N, joined))
      ) {
        h.push(joined);
        if (h.length > MAX_GIT_OBJECTS)
          return {
            kind: "problem",
            problem,
          };
        let j = [[joined, 1]];
        while (j.length > 0) {
          let [K, X] = j.pop();
          let W;
          try {
            W = await readdir(K, {
              withFileTypes: true,
            });
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
            return {
              kind: "problem",
              problem,
            };
          }
          for (let G of W) {
            let joined = path.join(K, G.name);
            if (isGitDir(G.name))
              return {
                kind: "problem",
                problem: `${escapeNonAscii(joined)} \u2014 the tree contains repository metadata that was not created here (a .git inside an object store); name the plugin directory itself to evaluate it`,
              };
            h.push(joined);
            if (h.length > MAX_GIT_OBJECTS)
              return {
                kind: "problem",
                problem,
              };
            if (await isDirectory(G, joined)) {
              if (X + 1 > MAX_GIT_OBJECT_NESTING)
                return {
                  kind: "problem",
                  problem,
                };
              j.push([joined, X + 1]);
            }
          }
        }
        continue;
      }
      if (!y(joined)) s.push(joined);
      if (s.length > n.treeMaxEntries)
        return {
          kind: "problem",
          problem: r,
        };
      if (!y(joined) && (await isDirectory(N, joined))) {
        let j = S >= MAX_TREE_ENTRIES ? MAX_GIT_OBJECT_DEPTH : MAX_TREE_DEPTH;
        if (S + 1 > j)
          return {
            kind: "problem",
            problem:
              S >= MAX_TREE_ENTRIES
                ? `a .git directory in its tree nests deeper than ${MAX_GIT_OBJECT_DEPTH - MAX_TREE_ENTRIES} levels \u2014 it cannot be fully examined; name the plugin directory itself to evaluate it`
                : r,
          };
        b.push([joined, S + 1]);
      }
    }
  }
  return {
    kind: "entries",
    entries: s.concat(h),
  };
}
//@ chunk-qchp9vrd.js:78920-79022 placement
function getCachedRootRealpath(e, n) {
  let r = n.rootRealpaths.get(e);
  if (r === undefined) {
    r = realpath(e);
    n.rootRealpaths.set(e, r);
  }
  return r;
}
//@ chunk-qchp9vrd.js:79022-79080 placement
/**
 * 判断路径是否为目录。
 */
async function isDirectory(e, n) {
  return (await getFileKind(e, n, "dir")) === "dir";
}
//@ chunk-qchp9vrd.js:79080-79266 placement
async function probeEntriesInBatches(e, n, r, a) {
  for (let h = 0; h < n.length; h += 64) {
    let sliced = n.slice(h, h + 64);
    let results = await Promise.all(
      sliced.map(([y]) =>
        lstat(y).catch((error) => ({
          error,
        })),
      ),
    );
    if (!(await probeManifestDir(e, sliced, results, r, a))) return false;
  }
  return true;
}
//@ chunk-qchp9vrd.js:79266-80000 placement
async function probeManifestDir(e, n, r, a, s) {
  for (let [h, [w, b]] of n.entries()) {
    let y = r[h];
    if ("error" in y) {
      let errnoCode = getErrnoCode(y.error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
      return logManifestNotConsulted(
        e,
        a,
        `${escapeNonAscii(w)} could not be examined (${errnoCode ?? "unknown error"})`,
      );
    }
    let R = y;
    if (b === "dir-or-absent" && !R.isDirectory() && !R.isSymbolicLink()) continue;
    let S =
      (b === "dir" && !R.isDirectory() && !R.isSymbolicLink()) ||
      (b === "file" && !R.isFile() && !R.isSymbolicLink());
    let T = b === "file" && R.isFile() && R.nlink > 1;
    let N = S || T ? undefined : await checkWritableByOthers(R, w, a, e);
    let x = S
      ? `is not a regular ${b === "file" ? "file" : "directory"}`
      : T
        ? "is hard-linked elsewhere"
        : N?.message;
    if (N?.code === "symlink" && b === "in-tree") x = (await checkSymlinkInTree(w, e, a)) ?? undefined;
    if (x !== undefined)
      return logManifestNotConsulted(
        e,
        a,
        `${escapeNonAscii(w)} ${x}${N?.code === "group_unverifiable" ? ` \u2014 ${getGroupWritableHint(s)}` : ""}`,
      );
  }
  return true;
}
//@ chunk-qchp9vrd.js:80000-81464 placement
async function checkSymlinkInTree(e, n, r) {
  let a = (S, T) => (T === S || toEvalPathError(S, T)) && path.relative(S, T).split(path.sep).some(isGitDir);
  if (a(n, e)) return "is a symlink inside repository metadata";
  try {
    await checkRepoAuthoredPath(n, path.relative(n, e), "in-tree link");
  } catch (error) {
    return `is a symlink that is refused: ${errorMessage(error)}`;
  }
  let s;
  try {
    s = await readlink(e);
  } catch (error) {
    return `is a symlink that could not be read (${getErrnoCode(error) ?? "unknown error"})`;
  }
  let h =
    "is a symlink that leaves the plugin tree (this plugin was not named, so only its own examined entries may load)";
  if (path.isAbsolute(s))
    return "is an absolute symlink (this plugin was not named, so only relative links inside its own tree may load)";
  let dir = path.dirname(e);
  for (let S of s.split("/").filter((T) => T.length > 0)) {
    dir = path.resolve(dir, S);
    if (dir !== n && !toEvalPathError(n, dir))
      return toEvalPathError(dir, n) ? "is a symlink that routes above the plugin directory" : h;
  }
  if (dir === n) return "is a symlink to the plugin directory itself";
  let b;
  try {
    b = await realpath(e);
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
    R = await realpath(path.dirname(e));
  } catch (error) {
    return `is a symlink whose directory could not be resolved (${getErrnoCode(error) ?? "unknown error"})`;
  }
  if (b === R || toEvalPathError(b, R)) return "is a symlink to its own directory or one above it";
  if (a(y, b)) return "is a symlink into repository metadata";
  return null;
}
//@ chunk-qchp9vrd.js:81464-81544 placement
/**
 * 是否能在目标处创建临时目录（判断可写）。
 */
async function canMakeTempDir(e, n) {
  return typeof process.getuid === "function" && (await makeTempModeProbeDir(e, n));
}
//@ chunk-qchp9vrd.js:81544-81693 placement
async function checkWritableByOthers(e, n, r, a) {
  await groupNamespaceInfo(r);
  let s = checkEntryOwnership(e, r);
  return (s?.code === "other_writable" || s?.code === "group_unverifiable") &&
    !(await makeTempModeProbeDir(n, r, a, e))
    ? undefined
    : s;
}
//@ chunk-qchp9vrd.js:81693-82799 placement
async function makeTempModeProbeDir(e, n, r, a) {
  let s;
  if (a !== undefined) s = a;
  else
    try {
      s = await lstat(e);
    } catch {
      return true;
    }
  let dev = s.dev;
  let w = n.modesByDevice.get(dev);
  if (w !== undefined) return w;
  let b = typeof process.getuid === "function" ? process.getuid() : -1;
  let y = r ?? (s.isDirectory() ? e : path.dirname(e));
  n.tmpdirDevice ??= await lstat(tmpdir()).then(
    (S) => S.dev,
    () => -1,
  );
  let R = n.tmpdirDevice === dev ? [tmpdir(), y] : [y];
  for (let S of R) {
    let T;
    let N;
    try {
      T = await mkdtemp(path.join(S, ".claude-eval-modes-"));
      N = await open(T, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      let stats = await N.stat();
      if (stats.dev !== dev) continue;
      if (b !== -1 && stats.uid !== b) {
        n.modesByDevice.set(dev, true);
        return true;
      }
      await N.chmod(448);
      let stats_2 = await N.stat();
      n.modesByDevice.set(dev, (stats_2.mode & 2) === 0);
      return (stats_2.mode & 2) === 0;
    } catch {
      continue;
    } finally {
      await N?.close().catch(() => {});
      if (T !== undefined) await rmdir(T).catch(() => {});
      {
        let x = (n.sweptProbeParents ??= new Set());
        if (!x.has(S)) {
          x.add(S);
          let j = Date.now() - 600000;
          await readdir(S)
            .then((K) =>
              Promise.all(
                K.filter((X) => X.startsWith(".claude-eval-modes-")).map(async (X) => {
                  let joined = path.join(S, X);
                  let G = await lstat(joined).catch(() => null);
                  if (G !== null && G.mtimeMs < j) await rmdir(joined).catch(() => {});
                }),
              ),
            )
            .catch(() => {});
        }
      }
    }
  }
  n.modesByDevice.set(dev, true);
  return true;
}
//@ chunk-qchp9vrd.js:82941-82989 placement
/**
 * 打开目录所用标志（只读、目录、不跟随链接）。
 */
var DIR_OPEN_FLAGS = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
//@ chunk-qchp9vrd.js:82989-83652 placement
async function detectPlatformFlavor(e, { harnessOwned: n = false } = {}) {
  if (getPlatform() === "windows") return;
  let r = n || getPlatform() === "linux" || getPlatform() === "wsl";
  let a;
  try {
    let s = await lstat(e, {
      bigint: true,
    });
    if (!s.isDirectory() || s.isSymbolicLink()) return;
    let h = (b) => b.ino === s.ino && b.dev === s.dev;
    if ((Number(s.mode) & 448) !== 448) {
      if (!r) return;
      await chmod(e, 448);
      if (
        !h(
          await lstat(e, {
            bigint: true,
          }),
        )
      )
        return;
    }
    if ((await realpath(e)) !== e) return;
    let w = await open(e, DIR_OPEN_FLAGS);
    try {
      if (
        !h(
          await w.stat({
            bigint: true,
          }),
        )
      )
        return;
      await w.chmod(448);
      a = (
        await readdir(e, {
          withFileTypes: true,
        })
      )
        .filter((b) => b.isDirectory())
        .map((b) => b.name);
      if (
        !h(
          await lstat(e, {
            bigint: true,
          }),
        )
      )
        return;
    } finally {
      await w.close().catch(() => {});
    }
  } catch {
    return;
  }
  for (let s of a)
    await detectPlatformFlavor(path.join(e, s), {
      harnessOwned: n,
    });
}
//@ chunk-qchp9vrd.js:83652-83680 placement
/**
 * 目录遍历的总预算（100000）。
 */
var MAX_CASE_FILE_BYTES = 1048576;
var MAX_ROUTE_DEPTH = 16;
var MAX_WALK_BUDGET = 1e5;
//@ chunk-qchp9vrd.js:83680-86039 placement
/**
 * 从目标出发发现评测用例：处理指向父目录的符号链接、不可检查路径等。
 */
async function discoverEvalCases(rootPath, n = {}, r = {}) {
  if (r.targetScreened !== true) await checkRepoAuthoredPath(getCwd(), rootPath, "target");
  let a = r.trust ?? checkTreeTrust();
  let {
    evalDirSegments = [EVALS_DIR_NAME],
    frameRoot = null,
    adoptionDecided = false,
    consentDecided = false,
  } = r;
  let y;
  let typedAncestorReals = [];
  try {
    let resolved = path.resolve(getCwd(), rootPath);
    y = await realpathKeepingPromptFile(resolved);
    if (!consentDecided && !isMagicDocsPromptFile(path.basename(y))) a.consentRoot ??= y;
    let J = isMagicDocsPromptFile(path.basename(resolved)) ? path.dirname(resolved) : resolved;
    let Z = await describeUnexaminable(J);
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
                ? `${escapeNonAscii(path.basename(Z.segment))} is a symbolic link to its own parent directory or one above it \u2014 refusing to treat that as the suite`
                : `${escapeNonAscii(path.basename(Z.segment))} could not be examined (${Z.code}) \u2014 refusing to treat that as the suite`,
          },
        ],
      };
    typedAncestorReals = Z.ancestorReals;
  } catch (error) {
    if (isENOENT(error) || isFsInaccessible(error))
      return {
        cases: [],
        root: path.resolve(getCwd(), rootPath),
        suite: null,
        errors: [
          {
            file: path.resolve(getCwd(), rootPath),
            error: isENOENT(error)
              ? "no such file or directory (or not readable)"
              : `cannot be read (${getErrnoCode(error) ?? "unknown error"})`,
          },
        ],
      };
    throw error;
  }
  let S;
  let T = true;
  let N = null;
  if (isMagicDocsPromptFile(path.basename(y))) {
    let dir = path.dirname(y);
    let J =
      frameRoot && isSameOrInside(dir, frameRoot)
        ? frameRoot
        : adoptionDecided
          ? null
          : (await resolvePluginDir(dir, a)).adopted;
    S = J ?? dir;
    T = J !== null;
    if (J === null && frameRoot && !isSameOrInside(dir, frameRoot)) N = frameRoot;
  } else if (frameRoot && y !== frameRoot && isSameOrInside(y, frameRoot)) S = frameRoot;
  else {
    S = y;
    if (frameRoot && y !== frameRoot && !isSameOrInside(y, frameRoot)) N = frameRoot;
  }
  let x = null;
  if (N !== null && evalDirSegments.length > 0) {
    let G = isMagicDocsPromptFile(path.basename(rootPath))
      ? path.dirname(path.resolve(getCwd(), rootPath))
      : path.resolve(getCwd(), rootPath);
    let J = await relativeSegmentsWithin(N, G);
    let Z = J === null ? null : await canonicalizeSegmentCase(N, J, evalDirSegments);
    if (
      Z !== null &&
      (foldPathCase(Z, evalDirSegments, "exact") || foldPathCase(evalDirSegments, Z, "exact"))
    ) {
      let evalSubdir = await resolveEvalSubdir(N, evalDirSegments);
      if (
        evalSubdir !== null &&
        !isSameOrInside(N, evalSubdir) &&
        (isSameOrInside(evalSubdir, y) || isSameOrInside(y, evalSubdir))
      ) {
        x = evalSubdir;
        if (S !== x && isSameOrInside(S, x)) {
          S = x;
          T = false;
        }
      }
    }
  }
  let { caseDirs, skipped } = await compareCaseNames(
    y,
    evalDirSegments,
    frameRoot,
    path.resolve(getCwd(), rootPath),
    typedAncestorReals,
  );
  let X = [];
  let W = [...skipped];
  for (let caseDir of caseDirs) {
    let joined = path.join(caseDir, "case.yaml");
    try {
      let [caseYamlFile, promptMdCase] = await Promise.all([
        parseCaseYamlFile(joined),
        parsePromptMdCase(caseDir),
      ]);
      let Q = promptMdCase ? normalizeCaseObject(caseYamlFile, promptMdCase, caseDir) : caseYamlFile;
      let caseSource = promptMdCase && caseYamlFile ? "mixed" : promptMdCase ? "prose" : "case_yaml";
      let we =
        Q === null
          ? path.basename(caseDir)
          : typeof Q.name === "string" && Q.name.length > 0
            ? Q.name
            : undefined;
      let Be =
        Q === null || Q.tags === undefined
          ? []
          : Array.isArray(Q.tags) && Q.tags.every((tag) => typeof tag === "string")
            ? Q.tags
            : undefined;
      if (
        we !== undefined &&
        Be !== undefined &&
        !matchesCaseFilter(
          {
            name: we,
            tags: Be,
          },
          n,
        )
      )
        continue;
      if (Q === null) {
        W.push({
          file: caseDir,
          error:
            "no case definition: case.yaml and prompt.md are empty or missing here (write the user prompt to test in prompt.md, or define the case in case.yaml)",
        });
        continue;
      }
      let caseYaml = parseCaseYaml(Q);
      if (!caseYaml.ok) {
        W.push({
          file: caseYamlFile !== null ? joined : caseDir,
          error: caseYaml.error,
        });
        continue;
      }
      X.push(
        await checkCaseInUntrustedFolder(caseYaml.case, joined, S, caseSource, a, T, N, evalDirSegments),
      );
    } catch (error) {
      W.push({
        file: caseDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    cases: X,
    errors: W,
    root: S,
    suite: x,
  };
}
//@ chunk-qchp9vrd.js:86039-86190 placement
function matchesCaseFilter(e, n) {
  if (n.caseGlob && !urlPatternToRegex(n.caseGlob, e.name)) return false;
  if (n.tags && n.tags.length > 0) {
    if (!n.tags.some((tag) => e.tags.includes(tag))) return false;
  }
  return true;
}
//@ chunk-qchp9vrd.js:86190-86318 placement = urlPatternToRegex (1)
function urlPatternToRegex(caseGlob, name) {
  return new RegExp(
    `^${caseGlob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")}$`,
  ).test(name);
}
//@ chunk-qchp9vrd.js:86318-88019 placement
async function checkCaseInUntrustedFolder(
  e,
  n,
  r,
  caseSource,
  s,
  h,
  w = null,
  evalDirSegments = [EVALS_DIR_NAME],
) {
  let y = (N) => getCachedPluginDirVerdict(N, s);
  let dir = path.dirname(n);
  let S = await probeSkillFolders(dir, r, s);
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
      let x = path.isAbsolute(plugin) ? plugin : path.resolve(dir, plugin);
      await checkRepoAuthoredPath(dir, plugin, `case ${formatGuardValueJson(e.name)}: plugins entry`);
      let j;
      try {
        j = await realpath(x);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        let G =
          errnoCode === "ENOENT" &&
          (await lstat(x)
            .then((J) => J.isSymbolicLink())
            .catch(() => false));
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          G
            ? `case ${formatGuardValueJson(e.name)}: plugins entry ${formatGuardValueJson(plugin)} is a symbolic link whose target does not exist`
            : errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
              ? `case ${formatGuardValueJson(e.name)}: plugins entry ${formatGuardValueJson(plugin)} does not exist`
              : `case ${formatGuardValueJson(e.name)}: plugins entry ${formatGuardValueJson(plugin)} is unreadable (${errnoCode ?? "unknown error"})`,
          "plugin eval: plugins entry absent or unreadable",
        );
      }
      let K = w !== null && (j === w || isSameOrInside(j, w));
      if (!isSameOrInside(j, r) && !K)
        throw Error(
          `case ${formatGuardValueJson(e.name)}: plugins entry ${formatGuardValueJson(plugin)} resolves to ${escapeNonAscii(j)}, outside the containment root ${escapeNonAscii(r)} (the enclosing plugin for a target inside one you control, else the directory you ran 'claude plugin eval' against). Only plugins under it can be loaded from case.yaml.`,
        );
      if (!(h && j === r) && !(w !== null && j === w) && !(await y(j)))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `case ${formatGuardValueJson(e.name)}: plugins entry ${formatGuardValueJson(plugin)} resolves to ${escapeNonAscii(j)}, which is not loaded: ${reasonFor(j, s)}.`,
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
    caseSource,
    pluginDirs: T,
    pluginDirsUnderTest: T,
    evalDirSegments,
  };
}
//@ chunk-qchp9vrd.js:88019-88196 placement
function describeNearestPluginNotLoaded(name, n, r) {
  return `case ${formatGuardValueJson(name)}: the nearest plugin, ${escapeNonAscii(n)}, is not loaded: ${reasonFor(n, r)} (fix its ownership/modes, or name that plugin directory itself as the target).`;
}
//@ chunk-qchp9vrd.js:88196-88235 placement
/**
 * 判断路径是否就是或在目标目录内。
 */
function isSameOrInside(e, n) {
  return e === n || toEvalPathError(n, e);
}
//@ chunk-qchp9vrd.js:88235-88295 placement
/**
 * 把路径限制在目标目录内（解析真实路径后比较）。
 */
async function resolveTargetWithin(e, n) {
  let r = await realCwd(n);
  return isSameOrInside(e, r) ? r : e;
}
//@ chunk-qchp9vrd.js:88295-88364 placement
/**
 * 取缓存的工作目录真实路径。
 */
function realCwd(e) {
  e.realCwd ??= realpath(getCwd()).catch(() => getCwd());
  return e.realCwd;
}
//@ chunk-qchp9vrd.js:88364-90572 placement
/**
 * 解析用例引用的路径，拒绝穿出目录树或指向其他主机的链接。
 */
async function resolveCaseTargetPath(e, root, frameRoot) {
  let a = [];
  let s = new Set();
  for (let h of e) {
    if (s.has(h)) continue;
    s.add(h);
    let w = frameRoot !== null && !isSameOrInside(h, root) && isSameOrInside(h, frameRoot) ? frameRoot : root;
    let base = path.basename(h);
    let y = null;
    let R = false;
    let S = isZipPathCaseInsensitive(h);
    for (let T of S ? [] : MANIFEST_IDENTITY_READ_RELPATHS) {
      let joined = path.join(h, T);
      let x = {
        link: false,
      };
      let j = await checkAutomounterPath(h, T, w, undefined, x);
      if (j !== null) {
        y =
          j === UNINSPECTABLE_LABEL
            ? `${T} is reached through a component that could not be inspected \u2014 not resolved or read here`
            : j === ESCAPING_LINK_LABEL
              ? `${T} is reached through a symbolic link that leaves the tree \u2014 not resolved or read here`
              : `${T} is reached through a symbolic link naming another host (${j}) \u2014 not resolved or read here`;
        break;
      }
      let K;
      try {
        K = await realpath(joined);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if ((errnoCode === "ENOENT" || errnoCode === "ENOTDIR") && x.link) {
          y = `${T} is reached through a symbolic link that does not resolve to a file in the tree \u2014 not read here`;
          break;
        }
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") {
          if (T === PLUGIN_MANIFEST_PATH) R = true;
          continue;
        }
        y = `${T}: ${errorMessage(error)} \u2014 not read here`;
        break;
      }
      if (!isSameOrInside(K, w)) {
        y = `${T} resolves outside the eval tree through a symbolic link \u2014 not read here`;
        break;
      }
      let X;
      try {
        X = await lstat(K);
      } catch (error) {
        y = `${T}: ${errorMessage(error)} \u2014 not read here`;
        break;
      }
      if (!X.isFile()) {
        y = `${T} is not a regular file \u2014 not read here`;
        break;
      }
      if (X.size > MAX_TEXT_FILE_BYTES) {
        y = `${T} is ${X.size} bytes, over the ${MAX_TEXT_FILE_BYTES}-byte cap \u2014 not read here`;
        break;
      }
    }
    if (S || (y === null && R)) {
      let T = null;
      try {
        T = (await lstat(h)).isDirectory();
      } catch {}
      if (S) {
        a.push(
          T === true
            ? {
                name: base,
                path: h,
                problem: "will_not_load",
                problemDetail:
                  "a directory whose name ends in .zip \u2014 the child treats that name as an archive and fails to load it; rename the directory",
              }
            : {
                name: base,
                path: h,
                problem: "archive_not_probed",
              },
        );
        continue;
      }
      if (T === false) {
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
      a.push({
        name: base,
        path: h,
        problem: "identity_unverified",
        problemDetail: y,
      });
      continue;
    }
    try {
      let { manifest } = await loadPluginManifest(h, base, "plugin eval", [], {
        noTelemetry: true,
      });
      a.push({
        name: manifest.name,
        ...(manifest.version !== undefined && {
          version: manifest.version,
        }),
        path: h,
        ...(manifest.defaultEnabled === false && {
          problem: "disabled_by_default",
        }),
      });
    } catch (error) {
      let errorClass =
        error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
          ? error.errorClass
          : undefined;
      a.push({
        name: base,
        path: h,
        problem:
          errorClass === MANIFEST_ERROR_CLASSES.jsonInvalid ||
          errorClass === MANIFEST_ERROR_CLASSES.schemaInvalid
            ? "manifest_invalid"
            : "identity_unverified",
        problemDetail: errorMessage(error),
      });
    }
  }
  return a;
}
//@ chunk-qchp9vrd.js:90572-90636 placement
async function findNearestSkillFolder(e, targetWithin, r, a = 32) {
  return (await probeSkillFolders(e, targetWithin, r, a)).nearest;
}
//@ chunk-qchp9vrd.js:90636-91125 placement
async function probeSkillFolders(e, n, r, a = 32) {
  let s = (y) => {
    let R = r.skillFolderProbes.get(y);
    if (R === undefined) {
      R = (async () => {
        if (!(await hasSkillFile(y))) return false;
        for (let S of MAGIC_DOCS_PROMPT_FILES) if (await pathExistsLstat(path.join(y, S))) return false;
        return true;
      })();
      r.skillFolderProbes.set(y, R);
    }
    return R;
  };
  let h = e;
  let w = null;
  let b = (y) => ({
    nearest: w ?? y,
    byManifest: y,
  });
  for (let j = 0; j < a; j++) {
    if (isNetworkMountRoot_2(h)) return b(w);
    if ((await pathExistsLstat(path.join(h, "plugin.json"))) || (await hasClaudePluginDir(h))) return b(h);
    if (w === null && (await s(h))) w = h;
    if (h === n) return b(w);
    let dir = path.dirname(h);
    if (dir === h) return b(w);
    h = dir;
  }
  return b(w);
}
//@ chunk-qchp9vrd.js:91125-91329 placement
async function hasClaudePluginDir(e) {
  try {
    let n = await lstat(path.join(e, ".claude-plugin"));
    if (n.isSymbolicLink()) return true;
    if (!n.isDirectory()) return false;
  } catch (error) {
    return !isNotFoundErrno_3(error);
  }
  return pathExistsLstat(path.join(e, ".claude-plugin", "plugin.json"));
}
//@ chunk-qchp9vrd.js:91329-91399 placement
async function pathExistsLstat(e) {
  try {
    await lstat(e);
    return true;
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
  let textFile = await readTextFile(e, MAX_CASE_FILE_BYTES, "case.yaml");
  if (textFile === null) return null;
  let r;
  try {
    r = parseYaml(textFile);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `YAML parse failed: ${String(error)}`,
      "case.yaml: YAML parse failed",
    );
  }
  if (r === null || r === undefined) return null;
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
  if (!isMagicDocsPromptFile(path.basename(e))) return realpath(e);
  await lstat(e);
  return path.join(await realpath(path.dirname(e)), path.basename(e));
}
//@ chunk-qchp9vrd.js:91970-92345 placement
async function describeUnexaminable(e) {
  let n = [];
  for (let a = e; ; a = path.dirname(a)) {
    n.unshift(a);
    if (path.dirname(a) === a) break;
  }
  let r = [];
  for (let a of n) {
    let s;
    let h;
    try {
      s = (await lstat(a)).isSymbolicLink();
      h = await realpath(a);
    } catch (error) {
      return {
        kind: "unexaminable",
        segment: a,
        code: getErrnoCode(error) ?? "unknown error",
      };
    }
    if (s && r.some((w) => h === w || toEvalPathError(h, w)))
      return {
        kind: "climb",
        segment: a,
      };
    r.push(h);
  }
  r.pop();
  return {
    kind: "ok",
    ancestorReals: r,
  };
}
//@ chunk-qchp9vrd.js:92345-92574 placement
/**
 * 解析评测用的插件目录：最近的技能目录可信则采用，否则拒绝；没有时按其他方式查找。
 */
async function resolvePluginDir(e, n, r = "tree") {
  let targetWithin = await resolveTargetWithin(e, n);
  let nearestSkillFolder = await findNearestSkillFolder(e, targetWithin, n, Number.POSITIVE_INFINITY);
  if (nearestSkillFolder !== null)
    return (await getCachedPluginDirVerdict(nearestSkillFolder, n, r))
      ? {
          adopted: nearestSkillFolder,
          refused: null,
          namedOnly: null,
        }
      : {
          adopted: null,
          refused: nearestSkillFolder,
          namedOnly: null,
        };
  return resolveParentPluginDir(e, n, r, targetWithin);
}
//@ chunk-qchp9vrd.js:92574-92923 placement
/**
 * 从目标的上一级向上查找最近的插件目录；目标或插件目录不可信时只给出名称，否则按缓存的目录判定结果采纳或拒绝。
 */
async function resolveParentPluginDir(e, n, r = "tree", targetWithin) {
  let s = targetWithin ?? (await resolveTargetWithin(e, n));
  let dir = path.dirname(s);
  let w = dir === s ? null : await findNearestSkillFolder(dir, null, n);
  if (w === null)
    return {
      adopted: null,
      refused: null,
      namedOnly: null,
    };
  if (!(await canMakeTempDir(e, n)) || !(await canMakeTempDir(w, n)))
    return {
      adopted: null,
      refused: null,
      namedOnly: w,
    };
  return (await getCachedPluginDirVerdict(w, n, r))
    ? {
        adopted: w,
        refused: null,
        namedOnly: null,
      }
    : {
        adopted: null,
        refused: w,
        namedOnly: null,
      };
}
//@ chunk-qchp9vrd.js:92923-93046 placement
async function resolveEvalSubdir(e, evalDirSegments) {
  try {
    await checkRepoAuthoredPath(e, evalDirSegments.join(path.sep), "eval directory");
    return await realpath(path.join(e, ...evalDirSegments));
  } catch {
    return null;
  }
}
//@ chunk-qchp9vrd.js:93046-93304 placement
async function relativeSegmentsWithin(e, n) {
  let r = [];
  for (let a = n; ; a = path.dirname(a)) {
    r.unshift(a);
    if (path.dirname(a) === a) break;
  }
  for (let a of r) {
    let s = await realpath(a).catch(() => null);
    if (s === null) continue;
    if (s === e || isSameOrInside(s, e))
      return [...pathSegments(path.relative(e, s)), ...pathSegments(path.relative(a, n))];
  }
  return null;
}
//@ chunk-qchp9vrd.js:93304-93750 placement
/**
 * 在大小写不敏感的文件系统上把路径各段改成磁盘上的实际大小写（仅当两种写法指向同一 inode 时替换）。
 */
async function canonicalizeSegmentCase(e, n, r) {
  let sliced = n.slice();
  for (let j = 0; j < sliced.length && j < r.length; j++) {
    let h = sliced[j];
    let w = r[j];
    if (h === w) continue;
    if (h.toLowerCase() !== w.toLowerCase()) break;
    let joined = path.join(e, ...sliced.slice(0, j));
    try {
      await checkRepoAuthoredPath(joined, w, "eval directory");
    } catch {
      break;
    }
    let [y, R] = await Promise.all([
      stat(path.join(joined, h), {
        bigint: true,
      }).catch(() => null),
      stat(path.join(joined, w), {
        bigint: true,
      }).catch(() => null),
    ]);
    if (y === null || R === null || y.ino === 0n || y.dev !== R.dev || y.ino !== R.ino) break;
    sliced[j] = w;
  }
  return sliced;
}
//@ chunk-qchp9vrd.js:93750-93808 placement
/**
 * 把路径按分隔符拆成非空段。
 */
function pathSegments(e) {
  return e.split(path.sep).filter((n) => n !== "");
}
//@ chunk-qchp9vrd.js:93808-94884 placement
async function compareCaseNames(e, evalDirSegments, frameRoot, a, typedAncestorReals = []) {
  if (isMagicDocsPromptFile(path.basename(e)))
    return {
      caseDirs: [path.dirname(e)],
      skipped: [],
    };
  let h = new Set();
  let w = [];
  let b = evalDirSegments.length === 1 && evalDirSegments[0] === EVALS_DIR_NAME;
  let y;
  let R;
  let S;
  let T = frameRoot === null || b ? null : await relativeSegmentsWithin(frameRoot, a);
  if (b) {
    y = pathSegments(e).includes(evalDirSegments[0]) || pathSegments(a).includes(evalDirSegments[0]);
    R = (j) => pathEndsWith(pathSegments(j), evalDirSegments);
    S = () => true;
  } else if (frameRoot !== null && (isSameOrInside(e, frameRoot) || T !== null)) {
    let j = pathSegments(path.relative(frameRoot, e));
    let K = T === null ? j : await canonicalizeSegmentCase(frameRoot, T, evalDirSegments);
    let X = (G) => pathSegments(path.relative(frameRoot, G));
    let W = (G) => [...K, ...pathSegments(path.relative(e, G))];
    y = foldPathCase(j, evalDirSegments, "exact") || foldPathCase(K, evalDirSegments, "exact");
    R = (G) => isSameLengthAndPath(X(G), evalDirSegments) || isSameLengthAndPath(W(G), evalDirSegments);
    S = (G) => foldPathCase(evalDirSegments, X(G), "exact") || foldPathCase(evalDirSegments, W(G), "exact");
  } else {
    let j = getPlatform() === "macos" || getPlatform() === "windows" ? "folded" : "exact";
    y =
      pathEndsWith(pathSegments(e), evalDirSegments, j) || pathEndsWith(pathSegments(a), evalDirSegments, j);
    R = (K) => isSameLengthAndPath(pathSegments(path.relative(e, K)), evalDirSegments);
    S = (K) => foldPathCase(evalDirSegments, pathSegments(path.relative(e, K)), "exact");
  }
  let N = await realpath(e).catch(() => e);
  let x = {
    opensEvalDir: R,
    mayLeadToEvalDir: S,
    routeIndependent: b,
    skipped: w,
    rootReal: N,
    typedAncestorReals,
    reported: new Set(),
    foundReal: new Set(),
    onRoute: new Set(),
    listedAt: new Map(),
    deferredCuts: new Map(),
    budget: {
      remaining: MAX_WALK_BUDGET,
      reported: false,
    },
  };
  await scanSuiteDirectory(e, N, h, 0, y, x);
  for (let [j, K] of x.deferredCuts) if (!x.listedAt.has(j)) w.push(K);
  return {
    caseDirs: [...h].sort(),
    skipped: w,
  };
}
//@ chunk-qchp9vrd.js:94884-98795 placement
/**
 * 扫描套件目录（嵌套层级上限、.git 等），收集用例。
 */
async function scanSuiteDirectory(e, n, r, a, s, h) {
  let w = (N, file, error) => {
    if (!h.reported.has(N)) {
      h.reported.add(N);
      h.skipped.push({
        file,
        error,
      });
    }
  };
  let b = s || !h.routeIndependent || a === 0;
  let y = (N) => {
    if (b) w(n, e, N);
    else logForDebugging(`plugin eval: ${escapeNonAscii(e)}: ${N}`);
  };
  if (a > MAX_ROUTE_DEPTH) {
    let N = `nested more than ${MAX_ROUTE_DEPTH} directories below the target by this route \u2014 not scanned from here (move the suite higher, or target it directly)`;
    if (b) {
      let x = `${s ? "suite" : "tree"}:${n}`;
      if (!h.deferredCuts.has(x))
        h.deferredCuts.set(x, {
          file: e,
          error: N,
        });
    } else logForDebugging(`plugin eval: ${escapeNonAscii(e)}: ${N}`);
    return;
  }
  let R;
  try {
    R = await readdir(e, {
      withFileTypes: true,
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOTDIR" && a === 0) {
      y("is a file, not a directory or a case file (case.yaml / prompt.md) \u2014 nothing to scan");
      return;
    }
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    if (isFsInaccessible(error)) {
      y(`cannot be read (${errnoCode ?? "unknown error"}) \u2014 not scanned`);
      return;
    }
    throw error;
  }
  let S = `${s ? "suite" : "tree"}:${n}`;
  let T = h.listedAt.get(S);
  if (T === undefined || a < T) h.listedAt.set(S, a);
  if (s && R.some((N) => !N.isDirectory() && isMagicDocsPromptFile(N.name))) {
    if (h.foundReal.has(n)) {
      logForDebugging(
        `plugin eval: ${escapeNonAscii(e)} is the same case directory as one already found \u2014 counted once`,
      );
      return;
    }
    h.foundReal.add(n);
    r.add(e);
    return;
  }
  if (s && a > 0 && !h.opensEvalDir(e))
    logForDebugging(
      `plugin eval: ${escapeNonAscii(e)} has no prompt.md or case.yaml \u2014 not a case; scanning its subdirectories`,
    );
  h.onRoute.add(S);
  try {
    for (let N of R) {
      let joined = path.join(e, N.name);
      if (isGitDir(N.name) || SKIPPED_SUBDIR_NAMES.has(N.name)) {
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
      let fileKind = await getFileKind(N, joined, "unknown");
      if (fileKind === "unknown") {
        let W = `${N.name} could not be examined (its type is unknown and it cannot be stat'ed) \u2014 not scanned`;
        if (s || h.opensEvalDir(joined) || (!h.routeIndependent && h.mayLeadToEvalDir(joined)))
          w(`${n}${path.sep}${N.name}`, joined, W);
        else logForDebugging(`plugin eval: ${escapeNonAscii(joined)}: ${W}`);
        continue;
      }
      let joined_2 = path.join(n, N.name);
      let X = s || h.opensEvalDir(joined);
      if (fileKind === "symlink") {
        let W = s || h.opensEvalDir(joined) || (!h.routeIndependent && h.mayLeadToEvalDir(joined));
        let G = (Z) => {
          if (W) w(`${n}${path.sep}${N.name}`, joined, Z);
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
          J = await stat(joined);
        } catch (error) {
          G(
            `${N.name} is a symbolic link whose target ${isENOENT(error) ? "does not exist" : `cannot be read (${getErrnoCode(error) ?? "unknown error"})`} \u2014 skipped`,
          );
          continue;
        }
        fileKind = J.isDirectory() ? "dir" : "other";
        if (fileKind === "dir") {
          let Z = await realpath(joined).catch(() => null);
          if (Z === null) {
            G(`${N.name} is a symbolic link whose target could not be resolved \u2014 not followed`);
            continue;
          }
          joined_2 = Z;
          if (joined_2 === n || toEvalPathError(joined_2, n)) {
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
      if (fileKind !== "dir") continue;
      if (!X && !h.mayLeadToEvalDir(joined)) continue;
      if (isNetworkMountRoot_2(joined_2) || isNetworkMountRoot_2(joined)) {
        let W = `${N.name} is an automounter map directory \u2014 not scanned (listing it would reach network hosts)`;
        if (X || !h.routeIndependent) w(`${n}${path.sep}${N.name}`, joined, W);
        else logForDebugging(`plugin eval: ${escapeNonAscii(joined)}: ${W}`);
        continue;
      }
      if (X || h.routeIndependent) {
        let W = h.listedAt.get(`${X ? "suite" : "tree"}:${joined_2}`);
        if (W !== undefined && W <= a + 1) {
          logForDebugging(
            `plugin eval: ${escapeNonAscii(joined)} was already listed by another route at this depth or shallower \u2014 not walked again`,
          );
          continue;
        }
      }
      if (h.budget.remaining <= 0) {
        if (!h.budget.reported) {
          h.budget.reported = true;
          h.skipped.push({
            file: joined,
            error: `the tree under the target has more than ${MAX_WALK_BUDGET} directories to walk (links can inflate it) \u2014 the rest was not scanned`,
          });
        }
        continue;
      }
      h.budget.remaining--;
      await scanSuiteDirectory(joined, joined_2, r, a + 1, X, h);
    }
  } finally {
    h.onRoute.delete(S);
  }
}
//@ chunk-qchp9vrd.js:98795-98855 placement
/**
 * 临时 git 仓库的最小 config 内容。
 */
var GIT_DIR_CONFIG = `[core]
	repositoryformatversion = 0
	bare = false
`;
//@ chunk-qchp9vrd.js:98855-99860 placement
async function createEvalTempDir() {
  let e = getPlatform() === "macos" ? "/tmp" : os_2.tmpdir();
  let n = getPlatform() === "macos" ? "e-" : "claude-eval-";
  let r = await realpath(await mkdtemp(path.join(e, n)));
  let joined = path.join(r, "config");
  let joined_2 = path.join(r, "home");
  let joined_3 = path.join(joined_2, "cwd");
  let joined_4 = path.join(r, "out");
  let joined_5 = path.join(r, "tmp");
  await mkdir(joined_3, {
    recursive: true,
  });
  await mkdir(joined, {
    recursive: true,
  });
  await mkdir(joined_4, {
    recursive: true,
  });
  await mkdir(joined_5, {
    recursive: true,
    mode: 448,
  });
  await writeFile(
    path.join(joined, ".claude.json"),
    jsonStringify({
      hasCompletedOnboarding: true,
      autoUpdates: false,
      bypassPermissionsModeAccepted: false,
    }),
  );
  await writeFile(
    path.join(joined_2, ".gitconfig"),
    `[user]
	name = Plugin Eval
	email = eval@example.invalid
`,
  );
  let joined_6 = path.join(joined_2, ".git");
  await mkdir(path.join(joined_6, "objects"), {
    recursive: true,
  });
  await mkdir(path.join(joined_6, "refs", "heads"), {
    recursive: true,
  });
  await mkdir(path.join(joined_6, "hooks"), {
    recursive: true,
  });
  await writeFile(
    path.join(joined_6, "HEAD"),
    `ref: refs/heads/main
`,
  );
  await writeFile(path.join(joined_6, "config"), GIT_DIR_CONFIG);
  await writeFile(
    path.join(joined_6, "commondir"),
    `.
`,
  );
  return {
    root: r,
    cwd: joined_3,
    configDir: joined,
    home: joined_2,
    outDir: joined_4,
    tmpDir: joined_5,
    operatorConfigDir: getClaudeConfigDir(),
    cleanup: async () => {
      await detectPlatformFlavor(r);
      await rm_2(r, {
        recursive: true,
        force: true,
        maxRetries: 2,
      });
    },
  };
}
//@ chunk-qchp9vrd.js:99860-99942 placement
/**
 * “越出目录树的链接”标签。
 */
var UNINSPECTABLE_LABEL = "a component that could not be inspected";
var ESCAPING_LINK_LABEL = "a link that leaves the tree";
//@ chunk-qchp9vrd.js:99942-100486 placement
async function checkAutomounterPath(
  e,
  n,
  r,
  a = {
    hops: 16,
  },
  s = {
    link: false,
  },
) {
  let h = e;
  let parts = n.split(path.sep);
  for (let [b, y] of parts.entries()) {
    h = path.join(h, y);
    let R;
    try {
      if (!(await lstat(h)).isSymbolicLink()) continue;
      s.link = true;
      R = await readlink(h);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? null : UNINSPECTABLE_LABEL;
    }
    if (escapesAfterDescent(R)) return UNINSPECTABLE_LABEL;
    let S = describeSpecialPath(R);
    if (S !== null) return S;
    let resolved = path.resolve(path.dirname(h), R);
    if (resolved === r || isSameOrInside(resolved, r)) {
      if (--a.hops < 0) return UNINSPECTABLE_LABEL;
      let N = await checkAutomounterPath(r, path.relative(r, resolved), r, a);
      if (N !== null) return N;
      if (b !== parts.length - 1) return UNINSPECTABLE_LABEL;
      continue;
    }
    return (
      describeSpecialPath(resolved) ??
      (isNetworkRelatedPath(resolved) ? "an automounter path" : ESCAPING_LINK_LABEL)
    );
  }
  return null;
}
//@ chunk-qchp9vrd.js:100486-100620 placement
function escapesAfterDescent(e) {
  let n = false;
  for (let r of e.replace(/\\/g, "/").split("/"))
    if (r === "..") {
      if (n) return true;
    } else if (r !== "" && r !== ".") n = true;
  return false;
}
//@ chunk-qchp9vrd.js:100620-100676 placement
/**
 * 描述特殊路径（网络共享等）。
 */
function describeSpecialPath(e) {
  return isUncOrDeviceSpelling(e) ? "a network share path" : null;
}
//@ chunk-qchp9vrd.js:100676-100978 placement
/**
 * 判断目录是否像插件评测套件：路径须为仓库内文件，存在套件文件或任一子目录（最多 64 个）含 case.yaml。
 */
async function looksLikeEvalSuite(e, name) {
  try {
    await checkRepoAuthoredPath(e, name, "plugin eval");
  } catch {
    return false;
  }
  if (await hasMagicDocsPromptFile(path.join(e, name))) return true;
  let r;
  try {
    r = await readdir(path.join(e, name), {
      withFileTypes: true,
    });
  } catch {
    return false;
  }
  for (let a of r.filter((s) => s.isDirectory()).slice(0, 64))
    try {
      await lstat(path.join(e, name, a.name, "case.yaml"));
      return true;
    } catch {}
  return false;
}
//@ chunk-qchp9vrd.js:100978-101068 placement
/**
 * 目录里是否有魔法文档提示文件。
 */
async function hasMagicDocsPromptFile(e) {
  for (let n of MAGIC_DOCS_PROMPT_FILES)
    try {
      await lstat(path.join(e, n));
      return true;
    } catch {}
  return false;
}
//@ chunk-qchp9vrd.js:101143-101262 placement
class UnenumerablePluginError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  unenumerable;
  constructor(unenumerable, n, r) {
    super(n, r);
    this.unenumerable = unenumerable;
    this.name = "UnenumerablePluginError";
  }
}
//@ chunk-qchp9vrd.js:101262-101446 placement
/**
 * 汇总多个插件的 MCP 服务器（无法枚举的插件记录到列表中）。
 */
async function collectPluginMcpServers(pluginDirs, n) {
  let r = new Map();
  for (let a of pluginDirs)
    try {
      for (let [s, h] of await enumeratePluginMcpServers(a)) r.set(s, h);
    } catch (error) {
      if (n !== undefined && error instanceof UnenumerablePluginError) {
        n.push(error.unenumerable);
        continue;
      }
      throw error;
    }
  return r;
}
export {
  MAX_WALK_DIRECTORIES,
  UnenumerablePluginError,
  detectPlatformFlavor,
  isSameOrInside,
  pathSegments,
  collectPluginMcpServers,
  discoverEvalCases,
  resolveCaseTargetPath,
  createEvalTempDir,
  realCwd,
  findNearestSkillFolder,
  resolvePluginDir,
  realpathKeepingPromptFile,
  isMagicDocsPromptFile,
  resolveTargetWithin,
  getCachedPluginDirVerdict,
  resolveParentPluginDir,
  checkWritableByOthers,
};
