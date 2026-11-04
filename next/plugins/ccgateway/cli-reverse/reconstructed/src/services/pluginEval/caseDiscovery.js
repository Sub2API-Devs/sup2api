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
import { default as path_2 } from "path";
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

//@ chunk-qchp9vrd.js:75370-75527 placement (2.1.88 match: BASH_LIST_COMMANDS, 0.768)
/**
 * （切分错误，属插件评测）按 "模式:目录" 缓存插件目录的属主/权限检查结果；已信任时直接 true。
 */
function getCachedPluginDirVerdict(dir, state, mode = "tree") {
  if (isInsideConsentRoot(state, dir)) return Promise.resolve(true);
  let cacheKey = `${mode}:${dir}`;
  let verdict = state.verdicts.get(cacheKey);
  if (verdict === undefined) {
    verdict = checkPluginDirTrust(dir, state, mode);
    state.verdicts.set(cacheKey, verdict);
  }
  return verdict;
}
//@ chunk-qchp9vrd.js:75527-76060 placement
async function checkPluginDirTrust(pluginDir, state, mode) {
  if (typeof process.getuid !== "function") return true;
  await groupNamespaceInfo(state);
  let requiredDirs = [
    [pluginDir, "dir"],
    [path_2.join(pluginDir, ".claude-plugin"), "dir-or-absent"],
  ];
  let requiredFiles = [
    [path_2.join(pluginDir, ".claude-plugin", "plugin.json"), "file"],
    [path_2.join(pluginDir, "plugin.json"), "file"],
    [path_2.join(pluginDir, "SKILL.md"), "file"],
  ];
  if (
    !(await probeEntriesInBatches(pluginDir, requiredDirs, state, mode)) ||
    !(await probeEntriesInBatches(pluginDir, requiredFiles, state, mode))
  )
    return false;
  if (mode === "core") return true;
  let limits;
  try {
    limits = await examineTreeLimits(pluginDir, state);
  } catch (error) {
    return logManifestNotConsulted(
      pluginDir,
      state,
      `its tree could not be examined (${errorMessage(error)})`,
    );
  }
  if (limits.kind === "problem") return logManifestNotConsulted(pluginDir, state, limits.problem);
  return probeEntriesInBatches(
    pluginDir,
    limits.entries.map((entry) => [entry, "in-tree"]),
    state,
    mode,
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
function getGroupWritableHint(targetKind) {
  return targetKind === "tree"
    ? "chmod -R g-w it, or run from / name the plugin directory"
    : "chmod -R g-w it, or pass --eval-dir to name the directory yourself";
}
//@ chunk-qchp9vrd.js:76300-76484 placement
function isNestedModulesPath(root, target) {
  if (root === null) return false;
  let relativePath = path_2.relative(root, target);
  if (relativePath === "") return true;
  let parts = relativePath.split(path_2.sep);
  return (
    parts.length % 2 === 0 &&
    parts.every((part, partIndex) => (partIndex % 2 === 0 ? part.toLowerCase() === "modules" : part !== ""))
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
async function examineTreeLimits(rootPath, limits) {
  let treeProblem = `its tree cannot be fully examined (a directory is unreadable, or it holds more than ${limits.treeMaxEntries} entries / ${MAX_TREE_DEPTH} levels \u2014 name the plugin directory itself to evaluate it)`;
  let problem = `its .git object stores hold more than ${MAX_GIT_OBJECTS} entries, nest deeper than ${MAX_GIT_OBJECT_NESTING} levels, or one is unreadable \u2014 they cannot be fully examined; name the plugin directory itself to evaluate it`;
  let entries = [];
  let gitObjectEntries = [];
  let lastGitObjectStore = null;
  let pending = [[rootPath, 0]];
  let isInsideConsent = (path) => isInsideConsentRoot(limits, path);
  while (pending.length > 0) {
    let [dir, depth] = pending.pop();
    if (isInsideConsent(dir)) continue;
    let children;
    try {
      children = await readdir(dir, {
        withFileTypes: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
      return {
        kind: "problem",
        problem: treeProblem,
      };
    }
    for (let entry of children) {
      let joinedPath = path_2.join(dir, entry.name);
      if (isGitDir(entry.name)) {
        let fileKind = await getFileKind(entry, joinedPath, "unknown");
        if (fileKind === "unknown")
          return {
            kind: "problem",
            problem: `${escapeNonAscii(joinedPath)} could not be examined (its type could not be read); name the plugin directory itself to evaluate it`,
          };
        if (dir !== rootPath || fileKind !== "dir")
          return {
            kind: "problem",
            problem: `${escapeNonAscii(joinedPath)} \u2014 the tree contains repository metadata that was not created here (${fileKind === "symlink" ? "a symlinked .git" : fileKind === "file" ? "a gitdir file" : fileKind === "other" ? "a .git that is not a directory" : "a nested .git directory"}); name the plugin directory itself to evaluate it`,
          };
        if (!isInsideConsent(joinedPath)) entries.push(joinedPath);
        if (entries.length > limits.treeMaxEntries)
          return {
            kind: "problem",
            problem: treeProblem,
          };
        lastGitObjectStore = joinedPath;
        pending.push([joinedPath, MAX_TREE_ENTRIES]);
        continue;
      }
      if (
        depth >= MAX_TREE_ENTRIES &&
        GIT_OBJECT_DIR_NAMES.has(entry.name.toLowerCase()) &&
        isNestedModulesPath(lastGitObjectStore, dir) &&
        (await isDirectory(entry, joinedPath))
      ) {
        gitObjectEntries.push(joinedPath);
        if (gitObjectEntries.length > MAX_GIT_OBJECTS)
          return {
            kind: "problem",
            problem,
          };
        let objectPending = [[joinedPath, 1]];
        while (objectPending.length > 0) {
          let [objectDir, objectDepth] = objectPending.pop();
          let objectEntries;
          try {
            objectEntries = await readdir(objectDir, {
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
          for (let entry of objectEntries) {
            let joinedPath = path_2.join(objectDir, entry.name);
            if (isGitDir(entry.name))
              return {
                kind: "problem",
                problem: `${escapeNonAscii(joinedPath)} \u2014 the tree contains repository metadata that was not created here (a .git inside an object store); name the plugin directory itself to evaluate it`,
              };
            gitObjectEntries.push(joinedPath);
            if (gitObjectEntries.length > MAX_GIT_OBJECTS)
              return {
                kind: "problem",
                problem,
              };
            if (await isDirectory(entry, joinedPath)) {
              if (objectDepth + 1 > MAX_GIT_OBJECT_NESTING)
                return {
                  kind: "problem",
                  problem,
                };
              objectPending.push([joinedPath, objectDepth + 1]);
            }
          }
        }
        continue;
      }
      if (!isInsideConsent(joinedPath)) entries.push(joinedPath);
      if (entries.length > limits.treeMaxEntries)
        return {
          kind: "problem",
          problem: treeProblem,
        };
      if (!isInsideConsent(joinedPath) && (await isDirectory(entry, joinedPath))) {
        let depthLimit = depth >= MAX_TREE_ENTRIES ? MAX_GIT_OBJECT_DEPTH : MAX_TREE_DEPTH;
        if (depth + 1 > depthLimit)
          return {
            kind: "problem",
            problem:
              depth >= MAX_TREE_ENTRIES
                ? `a .git directory in its tree nests deeper than ${MAX_GIT_OBJECT_DEPTH - MAX_TREE_ENTRIES} levels \u2014 it cannot be fully examined; name the plugin directory itself to evaluate it`
                : treeProblem,
          };
        pending.push([joinedPath, depth + 1]);
      }
    }
  }
  return {
    kind: "entries",
    entries: entries.concat(gitObjectEntries),
  };
}
//@ chunk-qchp9vrd.js:78920-79022 placement
function getCachedRootRealpath(root, state) {
  let real = state.rootRealpaths.get(root);
  if (real === undefined) {
    real = realpath(root);
    state.rootRealpaths.set(root, real);
  }
  return real;
}
//@ chunk-qchp9vrd.js:79022-79080 placement
/**
 * 判断路径是否为目录。
 */
async function isDirectory(entry, joinedPath) {
  return (await getFileKind(entry, joinedPath, "dir")) === "dir";
}
//@ chunk-qchp9vrd.js:79080-79266 placement
async function probeEntriesInBatches(pluginDir, entries, state, mode) {
  for (let start = 0; start < entries.length; start += 64) {
    let manifestEntries = entries.slice(start, start + 64);
    let results = await Promise.all(
      manifestEntries.map(([entryPath]) =>
        lstat(entryPath).catch((error) => ({
          error,
        })),
      ),
    );
    if (!(await probeManifestDir(pluginDir, manifestEntries, results, state, mode))) return false;
  }
  return true;
}
//@ chunk-qchp9vrd.js:79266-80000 placement
async function probeManifestDir(rootPath, manifestEntries, statsByPath, trust, targetKind) {
  for (let [manifestPath, [joinedPath, expectedKind]] of manifestEntries.entries()) {
    let statsOrError = statsByPath[manifestPath];
    if ("error" in statsOrError) {
      let errnoCode = getErrnoCode(statsOrError.error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
      return logManifestNotConsulted(
        rootPath,
        trust,
        `${escapeNonAscii(joinedPath)} could not be examined (${errnoCode ?? "unknown error"})`,
      );
    }
    let stats = statsOrError;
    if (expectedKind === "dir-or-absent" && !stats.isDirectory() && !stats.isSymbolicLink()) continue;
    let wrongKind =
      (expectedKind === "dir" && !stats.isDirectory() && !stats.isSymbolicLink()) ||
      (expectedKind === "file" && !stats.isFile() && !stats.isSymbolicLink());
    let hardLinked = expectedKind === "file" && stats.isFile() && stats.nlink > 1;
    let writableCheck =
      wrongKind || hardLinked ? undefined : await checkWritableByOthers(stats, joinedPath, trust, rootPath);
    let problem = wrongKind
      ? `is not a regular ${expectedKind === "file" ? "file" : "directory"}`
      : hardLinked
        ? "is hard-linked elsewhere"
        : writableCheck?.message;
    if (writableCheck?.code === "symlink" && expectedKind === "in-tree")
      problem = (await checkSymlinkInTree(joinedPath, rootPath, trust)) ?? undefined;
    if (problem !== undefined)
      return logManifestNotConsulted(
        rootPath,
        trust,
        `${escapeNonAscii(joinedPath)} ${problem}${writableCheck?.code === "group_unverifiable" ? ` \u2014 ${getGroupWritableHint(targetKind)}` : ""}`,
      );
  }
  return true;
}
//@ chunk-qchp9vrd.js:80000-81464 placement
async function checkSymlinkInTree(linkPath, rootPath, trust) {
  let crossesGitDir = (fromPath, toPath) =>
    (toPath === fromPath || toEvalPathError(fromPath, toPath)) &&
    path_2.relative(fromPath, toPath).split(path_2.sep).some(isGitDir);
  if (crossesGitDir(rootPath, linkPath)) return "is a symlink inside repository metadata";
  try {
    await checkRepoAuthoredPath(rootPath, path_2.relative(rootPath, linkPath), "in-tree link");
  } catch (error) {
    return `is a symlink that is refused: ${errorMessage(error)}`;
  }
  let linkTarget;
  try {
    linkTarget = await readlink(linkPath);
  } catch (error) {
    return `is a symlink that could not be read (${getErrnoCode(error) ?? "unknown error"})`;
  }
  let leavesTreeMessage =
    "is a symlink that leaves the plugin tree (this plugin was not named, so only its own examined entries may load)";
  if (path_2.isAbsolute(linkTarget))
    return "is an absolute symlink (this plugin was not named, so only relative links inside its own tree may load)";
  let dir = path_2.dirname(linkPath);
  for (let segment of linkTarget.split("/").filter((segment) => segment.length > 0)) {
    dir = path_2.resolve(dir, segment);
    if (dir !== rootPath && !toEvalPathError(rootPath, dir))
      return toEvalPathError(dir, rootPath)
        ? "is a symlink that routes above the plugin directory"
        : leavesTreeMessage;
  }
  if (dir === rootPath) return "is a symlink to the plugin directory itself";
  let linkRealpath;
  try {
    linkRealpath = await realpath(linkPath);
  } catch (error) {
    return `is a symlink whose target could not be resolved (${getErrnoCode(error) ?? "unknown error"})`;
  }
  let rootRealpath;
  try {
    rootRealpath = await getCachedRootRealpath(rootPath, trust);
  } catch (error) {
    return `is a symlink whose tree root could not be resolved (${getErrnoCode(error) ?? "unknown error"})`;
  }
  if (linkRealpath === rootRealpath || toEvalPathError(linkRealpath, rootRealpath))
    return "is a symlink to the plugin directory or one above it";
  if (!toEvalPathError(rootRealpath, linkRealpath)) return leavesTreeMessage;
  let dirRealpath;
  try {
    dirRealpath = await realpath(path_2.dirname(linkPath));
  } catch (error) {
    return `is a symlink whose directory could not be resolved (${getErrnoCode(error) ?? "unknown error"})`;
  }
  if (linkRealpath === dirRealpath || toEvalPathError(linkRealpath, dirRealpath))
    return "is a symlink to its own directory or one above it";
  if (crossesGitDir(rootRealpath, linkRealpath)) return "is a symlink into repository metadata";
  return null;
}
//@ chunk-qchp9vrd.js:81464-81544 placement
/**
 * 是否能在目标处创建临时目录（判断可写）。
 */
async function canMakeTempDir(dirPath, cache) {
  return typeof process.getuid === "function" && (await makeTempModeProbeDir(dirPath, cache));
}
//@ chunk-qchp9vrd.js:81544-81693 placement
async function checkWritableByOthers(path, probeDir, state, label) {
  await groupNamespaceInfo(state);
  let ownership = checkEntryOwnership(path, state);
  return (ownership?.code === "other_writable" || ownership?.code === "group_unverifiable") &&
    !(await makeTempModeProbeDir(probeDir, state, label, path))
    ? undefined
    : ownership;
}
//@ chunk-qchp9vrd.js:81693-82799 placement
async function makeTempModeProbeDir(probePath, cache, dirPathHint, stats) {
  let probeStats;
  if (stats !== undefined) probeStats = stats;
  else
    try {
      probeStats = await lstat(probePath);
    } catch {
      return true;
    }
  let dev = probeStats.dev;
  let knownResult = cache.modesByDevice.get(dev);
  if (knownResult !== undefined) return knownResult;
  let uid = typeof process.getuid === "function" ? process.getuid() : -1;
  let probeParentDir = dirPathHint ?? (probeStats.isDirectory() ? probePath : path_2.dirname(probePath));
  cache.tmpdirDevice ??= await lstat(tmpdir()).then(
    (tmpStats) => tmpStats.dev,
    () => -1,
  );
  let candidateDirs = cache.tmpdirDevice === dev ? [tmpdir(), probeParentDir] : [probeParentDir];
  for (let parentDir of candidateDirs) {
    let tempDir;
    let dirHandle;
    try {
      tempDir = await mkdtemp(path_2.join(parentDir, ".claude-eval-modes-"));
      dirHandle = await open(tempDir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      let stats = await dirHandle.stat();
      if (stats.dev !== dev) continue;
      if (uid !== -1 && stats.uid !== uid) {
        cache.modesByDevice.set(dev, true);
        return true;
      }
      await dirHandle.chmod(448);
      let stats_2 = await dirHandle.stat();
      cache.modesByDevice.set(dev, (stats_2.mode & 2) === 0);
      return (stats_2.mode & 2) === 0;
    } catch {
      continue;
    } finally {
      await dirHandle?.close().catch(() => {});
      if (tempDir !== undefined) await rmdir(tempDir).catch(() => {});
      {
        let sweptParents = (cache.sweptProbeParents ??= new Set());
        if (!sweptParents.has(parentDir)) {
          sweptParents.add(parentDir);
          let sweepCutoffMs = Date.now() - 600000;
          await readdir(parentDir)
            .then((entries) =>
              Promise.all(
                entries
                  .filter((entryName) => entryName.startsWith(".claude-eval-modes-"))
                  .map(async (entryName) => {
                    let joined = path_2.join(parentDir, entryName);
                    let entryStats = await lstat(joined).catch(() => null);
                    if (entryStats !== null && entryStats.mtimeMs < sweepCutoffMs)
                      await rmdir(joined).catch(() => {});
                  }),
              ),
            )
            .catch(() => {});
        }
      }
    }
  }
  cache.modesByDevice.set(dev, true);
  return true;
}
//@ chunk-qchp9vrd.js:82941-82989 placement
/**
 * 打开目录所用标志（只读、目录、不跟随链接）。
 */
var DIR_OPEN_FLAGS = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
//@ chunk-qchp9vrd.js:82989-83652 placement
async function detectPlatformFlavor(dirPath, { harnessOwned = false } = {}) {
  if (getPlatform() === "windows") return;
  let canRepairModes = harnessOwned || getPlatform() === "linux" || getPlatform() === "wsl";
  let childDirs;
  try {
    let dirStats = await lstat(dirPath, {
      bigint: true,
    });
    if (!dirStats.isDirectory() || dirStats.isSymbolicLink()) return;
    let isSameDir = (stats) => stats.ino === dirStats.ino && stats.dev === dirStats.dev;
    if ((Number(dirStats.mode) & 448) !== 448) {
      if (!canRepairModes) return;
      await chmod(dirPath, 448);
      if (
        !isSameDir(
          await lstat(dirPath, {
            bigint: true,
          }),
        )
      )
        return;
    }
    if ((await realpath(dirPath)) !== dirPath) return;
    let dirHandle = await open(dirPath, DIR_OPEN_FLAGS);
    try {
      if (
        !isSameDir(
          await dirHandle.stat({
            bigint: true,
          }),
        )
      )
        return;
      await dirHandle.chmod(448);
      childDirs = (
        await readdir(dirPath, {
          withFileTypes: true,
        })
      )
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      if (
        !isSameDir(
          await lstat(dirPath, {
            bigint: true,
          }),
        )
      )
        return;
    } finally {
      await dirHandle.close().catch(() => {});
    }
  } catch {
    return;
  }
  for (let childName of childDirs)
    await detectPlatformFlavor(path_2.join(dirPath, childName), {
      harnessOwned,
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
async function discoverEvalCases(rootPath, filter = {}, options = {}) {
  if (options.targetScreened !== true) await checkRepoAuthoredPath(getCwd(), rootPath, "target");
  let trust = options.trust ?? checkTreeTrust();
  let {
    evalDirSegments = [EVALS_DIR_NAME],
    frameRoot = null,
    adoptionDecided = false,
    consentDecided = false,
  } = options;
  let rootReal;
  let typedAncestorReals = [];
  try {
    let targetPath = path_2.resolve(getCwd(), rootPath);
    rootReal = await realpathKeepingPromptFile(targetPath);
    if (!consentDecided && !isMagicDocsPromptFile(path_2.basename(rootReal))) trust.consentRoot ??= rootReal;
    let suiteDir = isMagicDocsPromptFile(path_2.basename(targetPath))
      ? path_2.dirname(targetPath)
      : targetPath;
    let description = await describeUnexaminable(suiteDir);
    if (description.kind !== "ok")
      return {
        cases: [],
        root: targetPath,
        suite: null,
        errors: [
          {
            file: description.segment,
            error:
              description.kind === "climb"
                ? `${escapeNonAscii(path_2.basename(description.segment))} is a symbolic link to its own parent directory or one above it \u2014 refusing to treat that as the suite`
                : `${escapeNonAscii(path_2.basename(description.segment))} could not be examined (${description.code}) \u2014 refusing to treat that as the suite`,
          },
        ],
      };
    typedAncestorReals = description.ancestorReals;
  } catch (error) {
    if (isENOENT(error) || isFsInaccessible(error))
      return {
        cases: [],
        root: path_2.resolve(getCwd(), rootPath),
        suite: null,
        errors: [
          {
            file: path_2.resolve(getCwd(), rootPath),
            error: isENOENT(error)
              ? "no such file or directory (or not readable)"
              : `cannot be read (${getErrnoCode(error) ?? "unknown error"})`,
          },
        ],
      };
    throw error;
  }
  let containmentRoot;
  let rootTrusted = true;
  let outsideFrameRoot = null;
  if (isMagicDocsPromptFile(path_2.basename(rootReal))) {
    let pluginDir = path_2.dirname(rootReal);
    let adoptedDir =
      frameRoot && isSameOrInside(pluginDir, frameRoot)
        ? frameRoot
        : adoptionDecided
          ? null
          : (await resolvePluginDir(pluginDir, trust)).adopted;
    containmentRoot = adoptedDir ?? pluginDir;
    rootTrusted = adoptedDir !== null;
    if (adoptedDir === null && frameRoot && !isSameOrInside(pluginDir, frameRoot))
      outsideFrameRoot = frameRoot;
  } else if (frameRoot && rootReal !== frameRoot && isSameOrInside(rootReal, frameRoot))
    containmentRoot = frameRoot;
  else {
    containmentRoot = rootReal;
    if (frameRoot && rootReal !== frameRoot && !isSameOrInside(rootReal, frameRoot))
      outsideFrameRoot = frameRoot;
  }
  let evalSubdir = null;
  if (outsideFrameRoot !== null && evalDirSegments.length > 0) {
    let targetDir = isMagicDocsPromptFile(path_2.basename(rootPath))
      ? path_2.dirname(path_2.resolve(getCwd(), rootPath))
      : path_2.resolve(getCwd(), rootPath);
    let relativeSegments = await relativeSegmentsWithin(outsideFrameRoot, targetDir);
    let canonicalSegments =
      relativeSegments === null
        ? null
        : await canonicalizeSegmentCase(outsideFrameRoot, relativeSegments, evalDirSegments);
    if (
      canonicalSegments !== null &&
      (foldPathCase(canonicalSegments, evalDirSegments, "exact") ||
        foldPathCase(evalDirSegments, canonicalSegments, "exact"))
    ) {
      let evalSubdir_2 = await resolveEvalSubdir(outsideFrameRoot, evalDirSegments);
      if (
        evalSubdir_2 !== null &&
        !isSameOrInside(outsideFrameRoot, evalSubdir_2) &&
        (isSameOrInside(evalSubdir_2, rootReal) || isSameOrInside(rootReal, evalSubdir_2))
      ) {
        evalSubdir = evalSubdir_2;
        if (containmentRoot !== evalSubdir && isSameOrInside(containmentRoot, evalSubdir)) {
          containmentRoot = evalSubdir;
          rootTrusted = false;
        }
      }
    }
  }
  let { caseDirs, skipped } = await compareCaseNames(
    rootReal,
    evalDirSegments,
    frameRoot,
    path_2.resolve(getCwd(), rootPath),
    typedAncestorReals,
  );
  let cases = [];
  let errors = [...skipped];
  for (let caseDir of caseDirs) {
    let joined = path_2.join(caseDir, "case.yaml");
    try {
      let [caseYamlFile, promptMdCase] = await Promise.all([
        parseCaseYamlFile(joined),
        parsePromptMdCase(caseDir),
      ]);
      let caseObject = promptMdCase ? normalizeCaseObject(caseYamlFile, promptMdCase, caseDir) : caseYamlFile;
      let caseSource = promptMdCase && caseYamlFile ? "mixed" : promptMdCase ? "prose" : "case_yaml";
      let caseName =
        caseObject === null
          ? path_2.basename(caseDir)
          : typeof caseObject.name === "string" && caseObject.name.length > 0
            ? caseObject.name
            : undefined;
      let caseTags =
        caseObject === null || caseObject.tags === undefined
          ? []
          : Array.isArray(caseObject.tags) && caseObject.tags.every((tag) => typeof tag === "string")
            ? caseObject.tags
            : undefined;
      if (
        caseName !== undefined &&
        caseTags !== undefined &&
        !matchesCaseFilter(
          {
            name: caseName,
            tags: caseTags,
          },
          filter,
        )
      )
        continue;
      if (caseObject === null) {
        errors.push({
          file: caseDir,
          error:
            "no case definition: case.yaml and prompt.md are empty or missing here (write the user prompt to test in prompt.md, or define the case in case.yaml)",
        });
        continue;
      }
      let caseYaml = parseCaseYaml(caseObject);
      if (!caseYaml.ok) {
        errors.push({
          file: caseYamlFile !== null ? joined : caseDir,
          error: caseYaml.error,
        });
        continue;
      }
      cases.push(
        await checkCaseInUntrustedFolder(
          caseYaml.case,
          joined,
          containmentRoot,
          caseSource,
          trust,
          rootTrusted,
          outsideFrameRoot,
          evalDirSegments,
        ),
      );
    } catch (error) {
      errors.push({
        file: caseDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    cases,
    errors,
    root: containmentRoot,
    suite: evalSubdir,
  };
}
//@ chunk-qchp9vrd.js:86039-86190 placement
function matchesCaseFilter(caseSpec, filter) {
  if (filter.caseGlob && !urlPatternToRegex(filter.caseGlob, caseSpec.name)) return false;
  if (filter.tags && filter.tags.length > 0) {
    if (!filter.tags.some((tag) => caseSpec.tags.includes(tag))) return false;
  }
  return true;
}
//@ chunk-qchp9vrd.js:86190-86318 placement (2.1.88 match: urlPatternToRegex, 1)
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
  caseSpec,
  caseFile,
  containmentRoot,
  caseSource,
  trust,
  trustedRoot,
  frameRoot = null,
  evalDirSegments = [EVALS_DIR_NAME],
) {
  let isLoadedPluginDir = (pluginDir) => getCachedPluginDirVerdict(pluginDir, trust);
  let startDir = path_2.dirname(caseFile);
  let skillFolders = await probeSkillFolders(startDir, containmentRoot, trust);
  if (
    skillFolders.nearest !== null &&
    !(trustedRoot && skillFolders.nearest === containmentRoot) &&
    !(await getCachedPluginDirVerdict(skillFolders.nearest, trust, "core"))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      describeNearestPluginNotLoaded(caseSpec.name, skillFolders.nearest, trust),
      "plugin eval: case inside an untrusted plugin/skill folder refused",
    );
  let pluginDirs;
  if (caseSpec.plugins && caseSpec.plugins.length > 0) {
    pluginDirs = [];
    for (let plugin of caseSpec.plugins) {
      let entryPath = path_2.isAbsolute(plugin) ? plugin : path_2.resolve(startDir, plugin);
      await checkRepoAuthoredPath(
        startDir,
        plugin,
        `case ${formatGuardValueJson(caseSpec.name)}: plugins entry`,
      );
      let resolvedEntry;
      try {
        resolvedEntry = await realpath(entryPath);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        let isMissingSymlink =
          errnoCode === "ENOENT" &&
          (await lstat(entryPath)
            .then((linkStats) => linkStats.isSymbolicLink())
            .catch(() => false));
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          isMissingSymlink
            ? `case ${formatGuardValueJson(caseSpec.name)}: plugins entry ${formatGuardValueJson(plugin)} is a symbolic link whose target does not exist`
            : errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
              ? `case ${formatGuardValueJson(caseSpec.name)}: plugins entry ${formatGuardValueJson(plugin)} does not exist`
              : `case ${formatGuardValueJson(caseSpec.name)}: plugins entry ${formatGuardValueJson(plugin)} is unreadable (${errnoCode ?? "unknown error"})`,
          "plugin eval: plugins entry absent or unreadable",
        );
      }
      let insideFrameRoot =
        frameRoot !== null && (resolvedEntry === frameRoot || isSameOrInside(resolvedEntry, frameRoot));
      if (!isSameOrInside(resolvedEntry, containmentRoot) && !insideFrameRoot)
        throw Error(
          `case ${formatGuardValueJson(caseSpec.name)}: plugins entry ${formatGuardValueJson(plugin)} resolves to ${escapeNonAscii(resolvedEntry)}, outside the containment root ${escapeNonAscii(containmentRoot)} (the enclosing plugin for a target inside one you control, else the directory you ran 'claude plugin eval' against). Only plugins under it can be loaded from case.yaml.`,
        );
      if (
        !(trustedRoot && resolvedEntry === containmentRoot) &&
        !(frameRoot !== null && resolvedEntry === frameRoot) &&
        !(await isLoadedPluginDir(resolvedEntry))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `case ${formatGuardValueJson(caseSpec.name)}: plugins entry ${formatGuardValueJson(plugin)} resolves to ${escapeNonAscii(resolvedEntry)}, which is not loaded: ${reasonFor(resolvedEntry, trust)}.`,
          "plugin eval: untrusted plugins entry refused",
        );
      pluginDirs.push(resolvedEntry);
    }
  } else {
    let byManifest = skillFolders.byManifest;
    if (
      byManifest !== null &&
      !(trustedRoot && byManifest === containmentRoot) &&
      !(await isLoadedPluginDir(byManifest))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        describeNearestPluginNotLoaded(caseSpec.name, byManifest, trust),
        "plugin eval: untrusted auto-detected plugin refused",
      );
    pluginDirs = byManifest ? [byManifest] : frameRoot !== null ? [frameRoot] : [];
  }
  return {
    ...caseSpec,
    caseFile,
    caseDir: startDir,
    caseSource,
    pluginDirs,
    pluginDirsUnderTest: pluginDirs,
    evalDirSegments,
  };
}
//@ chunk-qchp9vrd.js:88019-88196 placement
function describeNearestPluginNotLoaded(name, pluginDir, trust) {
  return `case ${formatGuardValueJson(name)}: the nearest plugin, ${escapeNonAscii(pluginDir)}, is not loaded: ${reasonFor(pluginDir, trust)} (fix its ownership/modes, or name that plugin directory itself as the target).`;
}
//@ chunk-qchp9vrd.js:88196-88235 placement
/**
 * 判断路径是否就是或在目标目录内。
 */
function isSameOrInside(path, rootPath) {
  return path === rootPath || toEvalPathError(rootPath, path);
}
//@ chunk-qchp9vrd.js:88235-88295 placement
/**
 * 把路径限制在目标目录内（解析真实路径后比较）。
 */
async function resolveTargetWithin(target, state) {
  let cwd = await realCwd(state);
  return isSameOrInside(target, cwd) ? cwd : target;
}
//@ chunk-qchp9vrd.js:88295-88364 placement
/**
 * 取缓存的工作目录真实路径。
 */
function realCwd(cache) {
  cache.realCwd ??= realpath(getCwd()).catch(() => getCwd());
  return cache.realCwd;
}
//@ chunk-qchp9vrd.js:88364-90572 placement
/**
 * 解析用例引用的路径，拒绝穿出目录树或指向其他主机的链接。
 */
async function resolveCaseTargetPath(paths, root, frameRoot) {
  let plugins = [];
  let seen = new Set();
  for (let pluginPath of paths) {
    if (seen.has(pluginPath)) continue;
    seen.add(pluginPath);
    let containmentRoot =
      frameRoot !== null && !isSameOrInside(pluginPath, root) && isSameOrInside(pluginPath, frameRoot)
        ? frameRoot
        : root;
    let base = path_2.basename(pluginPath);
    let problemDetail = null;
    let manifestMissing = false;
    let isZipName = isZipPathCaseInsensitive(pluginPath);
    for (let relativePath of isZipName ? [] : MANIFEST_IDENTITY_READ_RELPATHS) {
      let joined = path_2.join(pluginPath, relativePath);
      let linkState = {
        link: false,
      };
      let specialPath = await checkAutomounterPath(
        pluginPath,
        relativePath,
        containmentRoot,
        undefined,
        linkState,
      );
      if (specialPath !== null) {
        problemDetail =
          specialPath === UNINSPECTABLE_LABEL
            ? `${relativePath} is reached through a component that could not be inspected \u2014 not resolved or read here`
            : specialPath === ESCAPING_LINK_LABEL
              ? `${relativePath} is reached through a symbolic link that leaves the tree \u2014 not resolved or read here`
              : `${relativePath} is reached through a symbolic link naming another host (${specialPath}) \u2014 not resolved or read here`;
        break;
      }
      let realFile;
      try {
        realFile = await realpath(joined);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if ((errnoCode === "ENOENT" || errnoCode === "ENOTDIR") && linkState.link) {
          problemDetail = `${relativePath} is reached through a symbolic link that does not resolve to a file in the tree \u2014 not read here`;
          break;
        }
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") {
          if (relativePath === PLUGIN_MANIFEST_PATH) manifestMissing = true;
          continue;
        }
        problemDetail = `${relativePath}: ${errorMessage(error)} \u2014 not read here`;
        break;
      }
      if (!isSameOrInside(realFile, containmentRoot)) {
        problemDetail = `${relativePath} resolves outside the eval tree through a symbolic link \u2014 not read here`;
        break;
      }
      let fileStats;
      try {
        fileStats = await lstat(realFile);
      } catch (error) {
        problemDetail = `${relativePath}: ${errorMessage(error)} \u2014 not read here`;
        break;
      }
      if (!fileStats.isFile()) {
        problemDetail = `${relativePath} is not a regular file \u2014 not read here`;
        break;
      }
      if (fileStats.size > MAX_TEXT_FILE_BYTES) {
        problemDetail = `${relativePath} is ${fileStats.size} bytes, over the ${MAX_TEXT_FILE_BYTES}-byte cap \u2014 not read here`;
        break;
      }
    }
    if (isZipName || (problemDetail === null && manifestMissing)) {
      let isDirectory = null;
      try {
        isDirectory = (await lstat(pluginPath)).isDirectory();
      } catch {}
      if (isZipName) {
        plugins.push(
          isDirectory === true
            ? {
                name: base,
                path: pluginPath,
                problem: "will_not_load",
                problemDetail:
                  "a directory whose name ends in .zip \u2014 the child treats that name as an archive and fails to load it; rename the directory",
              }
            : {
                name: base,
                path: pluginPath,
                problem: "archive_not_probed",
              },
        );
        continue;
      }
      if (isDirectory === false) {
        plugins.push({
          name: base,
          path: pluginPath,
          problem: "will_not_load",
          problemDetail: "not a directory or .zip archive \u2014 the child loads it as an empty plugin",
        });
        continue;
      }
    }
    if (problemDetail !== null) {
      plugins.push({
        name: base,
        path: pluginPath,
        problem: "identity_unverified",
        problemDetail,
      });
      continue;
    }
    try {
      let { manifest } = await loadPluginManifest(pluginPath, base, "plugin eval", [], {
        noTelemetry: true,
      });
      plugins.push({
        name: manifest.name,
        ...(manifest.version !== undefined && {
          version: manifest.version,
        }),
        path: pluginPath,
        ...(manifest.defaultEnabled === false && {
          problem: "disabled_by_default",
        }),
      });
    } catch (error) {
      let errorClass =
        error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
          ? error.errorClass
          : undefined;
      plugins.push({
        name: base,
        path: pluginPath,
        problem:
          errorClass === MANIFEST_ERROR_CLASSES.jsonInvalid ||
          errorClass === MANIFEST_ERROR_CLASSES.schemaInvalid
            ? "manifest_invalid"
            : "identity_unverified",
        problemDetail: errorMessage(error),
      });
    }
  }
  return plugins;
}
//@ chunk-qchp9vrd.js:90572-90636 placement
async function findNearestSkillFolder(startDir, stopDir, state, maxUp = 32) {
  return (await probeSkillFolders(startDir, stopDir, state, maxUp)).nearest;
}
//@ chunk-qchp9vrd.js:90636-91125 placement
async function probeSkillFolders(startDir, stopDir, cache, maxHops = 32) {
  let hasSkill = (dir) => {
    let probe = cache.skillFolderProbes.get(dir);
    if (probe === undefined) {
      probe = (async () => {
        if (!(await hasSkillFile(dir))) return false;
        for (let promptFile of MAGIC_DOCS_PROMPT_FILES)
          if (await pathExistsLstat(path_2.join(dir, promptFile))) return false;
        return true;
      })();
      cache.skillFolderProbes.set(dir, probe);
    }
    return probe;
  };
  let dir = startDir;
  let nearestSkillDir = null;
  let result = (pluginDir) => ({
    nearest: nearestSkillDir ?? pluginDir,
    byManifest: pluginDir,
  });
  for (let j = 0; j < maxHops; j++) {
    if (isNetworkMountRoot_2(dir)) return result(nearestSkillDir);
    if ((await pathExistsLstat(path_2.join(dir, "plugin.json"))) || (await hasClaudePluginDir(dir)))
      return result(dir);
    if (nearestSkillDir === null && (await hasSkill(dir))) nearestSkillDir = dir;
    if (dir === stopDir) return result(nearestSkillDir);
    let dir_2 = path_2.dirname(dir);
    if (dir_2 === dir) return result(nearestSkillDir);
    dir = dir_2;
  }
  return result(nearestSkillDir);
}
//@ chunk-qchp9vrd.js:91125-91329 placement
async function hasClaudePluginDir(dir) {
  try {
    let dirStats = await lstat(path_2.join(dir, ".claude-plugin"));
    if (dirStats.isSymbolicLink()) return true;
    if (!dirStats.isDirectory()) return false;
  } catch (error) {
    return !isNotFoundErrno_3(error);
  }
  return pathExistsLstat(path_2.join(dir, ".claude-plugin", "plugin.json"));
}
//@ chunk-qchp9vrd.js:91329-91399 placement
async function pathExistsLstat(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    return !isNotFoundErrno_3(error);
  }
}
//@ chunk-qchp9vrd.js:91399-91460 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isNotFoundErrno_3(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-qchp9vrd.js:91460-91776 placement
async function parseCaseYamlFile(caseFilePath) {
  let textFile = await readTextFile(caseFilePath, MAX_CASE_FILE_BYTES, "case.yaml");
  if (textFile === null) return null;
  let parsed;
  try {
    parsed = parseYaml(textFile);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `YAML parse failed: ${String(error)}`,
      "case.yaml: YAML parse failed",
    );
  }
  if (parsed === null || parsed === undefined) return null;
  if (typeof parsed !== "object" || Array.isArray(parsed)) throw Error("case.yaml must be a YAML object");
  return parsed;
}
//@ chunk-qchp9vrd.js:91776-91809 placement (2.1.88 match: loadMagicDocsPrompt, 0.476)
var MAGIC_DOCS_PROMPT_FILES = ["case.yaml", "prompt.md"];
//@ chunk-qchp9vrd.js:91809-91846 placement
function isMagicDocsPromptFile(basename) {
  return MAGIC_DOCS_PROMPT_FILES.includes(basename);
}
//@ chunk-qchp9vrd.js:91846-91970 placement
async function realpathKeepingPromptFile(targetPath) {
  if (!isMagicDocsPromptFile(path_2.basename(targetPath))) return realpath(targetPath);
  await lstat(targetPath);
  return path_2.join(await realpath(path_2.dirname(targetPath)), path_2.basename(targetPath));
}
//@ chunk-qchp9vrd.js:91970-92345 placement
async function describeUnexaminable(targetPath) {
  let segments = [];
  for (let current = targetPath; ; current = path_2.dirname(current)) {
    segments.unshift(current);
    if (path_2.dirname(current) === current) break;
  }
  let ancestorReals = [];
  for (let segment of segments) {
    let isLink;
    let segmentReal;
    try {
      isLink = (await lstat(segment)).isSymbolicLink();
      segmentReal = await realpath(segment);
    } catch (error) {
      return {
        kind: "unexaminable",
        segment,
        code: getErrnoCode(error) ?? "unknown error",
      };
    }
    if (
      isLink &&
      ancestorReals.some(
        (ancestorReal) => segmentReal === ancestorReal || toEvalPathError(segmentReal, ancestorReal),
      )
    )
      return {
        kind: "climb",
        segment,
      };
    ancestorReals.push(segmentReal);
  }
  ancestorReals.pop();
  return {
    kind: "ok",
    ancestorReals,
  };
}
//@ chunk-qchp9vrd.js:92345-92574 placement
/**
 * 解析评测用的插件目录：最近的技能目录可信则采用，否则拒绝；没有时按其他方式查找。
 */
async function resolvePluginDir(pluginDir, state, mode = "tree") {
  let targetWithin = await resolveTargetWithin(pluginDir, state);
  let nearestSkillFolder = await findNearestSkillFolder(
    pluginDir,
    targetWithin,
    state,
    Number.POSITIVE_INFINITY,
  );
  if (nearestSkillFolder !== null)
    return (await getCachedPluginDirVerdict(nearestSkillFolder, state, mode))
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
  return resolveParentPluginDir(pluginDir, state, mode, targetWithin);
}
//@ chunk-qchp9vrd.js:92574-92923 placement
/**
 * 从目标的上一级向上查找最近的插件目录；目标或插件目录不可信时只给出名称，否则按缓存的目录判定结果采纳或拒绝。
 */
async function resolveParentPluginDir(pluginDir, state, mode = "tree", targetWithin) {
  let target = targetWithin ?? (await resolveTargetWithin(pluginDir, state));
  let dir = path_2.dirname(target);
  let nearest = dir === target ? null : await findNearestSkillFolder(dir, null, state);
  if (nearest === null)
    return {
      adopted: null,
      refused: null,
      namedOnly: null,
    };
  if (!(await canMakeTempDir(pluginDir, state)) || !(await canMakeTempDir(nearest, state)))
    return {
      adopted: null,
      refused: null,
      namedOnly: nearest,
    };
  return (await getCachedPluginDirVerdict(nearest, state, mode))
    ? {
        adopted: nearest,
        refused: null,
        namedOnly: null,
      }
    : {
        adopted: null,
        refused: nearest,
        namedOnly: null,
      };
}
//@ chunk-qchp9vrd.js:92923-93046 placement
async function resolveEvalSubdir(rootPath, evalDirSegments) {
  try {
    await checkRepoAuthoredPath(rootPath, evalDirSegments.join(path_2.sep), "eval directory");
    return await realpath(path_2.join(rootPath, ...evalDirSegments));
  } catch {
    return null;
  }
}
//@ chunk-qchp9vrd.js:93046-93304 placement
async function relativeSegmentsWithin(root, target) {
  let ancestors = [];
  for (let dir = target; ; dir = path_2.dirname(dir)) {
    ancestors.unshift(dir);
    if (path_2.dirname(dir) === dir) break;
  }
  for (let ancestor of ancestors) {
    let real = await realpath(ancestor).catch(() => null);
    if (real === null) continue;
    if (real === root || isSameOrInside(real, root))
      return [
        ...pathSegments(path_2.relative(root, real)),
        ...pathSegments(path_2.relative(ancestor, target)),
      ];
  }
  return null;
}
//@ chunk-qchp9vrd.js:93304-93750 placement
/**
 * 在大小写不敏感的文件系统上把路径各段改成磁盘上的实际大小写（仅当两种写法指向同一 inode 时替换）。
 */
async function canonicalizeSegmentCase(baseDir, segments, expectedSegments) {
  let sliced = segments.slice();
  for (let j = 0; j < sliced.length && j < expectedSegments.length; j++) {
    let actualSegment = sliced[j];
    let expectedSegment = expectedSegments[j];
    if (actualSegment === expectedSegment) continue;
    if (actualSegment.toLowerCase() !== expectedSegment.toLowerCase()) break;
    let joined = path_2.join(baseDir, ...sliced.slice(0, j));
    try {
      await checkRepoAuthoredPath(joined, expectedSegment, "eval directory");
    } catch {
      break;
    }
    let [actualStats, expectedStats] = await Promise.all([
      stat(path_2.join(joined, actualSegment), {
        bigint: true,
      }).catch(() => null),
      stat(path_2.join(joined, expectedSegment), {
        bigint: true,
      }).catch(() => null),
    ]);
    if (
      actualStats === null ||
      expectedStats === null ||
      actualStats.ino === 0n ||
      actualStats.dev !== expectedStats.dev ||
      actualStats.ino !== expectedStats.ino
    )
      break;
    sliced[j] = expectedSegment;
  }
  return sliced;
}
//@ chunk-qchp9vrd.js:93750-93808 placement
/**
 * 把路径按分隔符拆成非空段。
 */
function pathSegments(filePath) {
  return filePath.split(path_2.sep).filter((segment) => segment !== "");
}
//@ chunk-qchp9vrd.js:93808-94884 placement
async function compareCaseNames(
  targetPath,
  expectedSegments,
  frameRoot,
  originalPath,
  typedAncestorReals = [],
) {
  if (isMagicDocsPromptFile(path_2.basename(targetPath)))
    return {
      caseDirs: [path_2.dirname(targetPath)],
      skipped: [],
    };
  let caseDirs = new Set();
  let skipped = [];
  let defaultEvalDirName = expectedSegments.length === 1 && expectedSegments[0] === EVALS_DIR_NAME;
  let opensEvalDir;
  let mayLeadToEvalDir;
  let routeIndependentCheck;
  let frameRelativeSegments =
    frameRoot === null || defaultEvalDirName ? null : await relativeSegmentsWithin(frameRoot, originalPath);
  if (defaultEvalDirName) {
    opensEvalDir =
      pathSegments(targetPath).includes(expectedSegments[0]) ||
      pathSegments(originalPath).includes(expectedSegments[0]);
    mayLeadToEvalDir = (path) => pathEndsWith(pathSegments(path), expectedSegments);
    routeIndependentCheck = () => true;
  } else if (
    frameRoot !== null &&
    (isSameOrInside(targetPath, frameRoot) || frameRelativeSegments !== null)
  ) {
    let targetSegments = pathSegments(path_2.relative(frameRoot, targetPath));
    let canonicalSegments =
      frameRelativeSegments === null
        ? targetSegments
        : await canonicalizeSegmentCase(frameRoot, frameRelativeSegments, expectedSegments);
    let frameSegmentsOf = (path) => pathSegments(path_2.relative(frameRoot, path));
    let segmentsFromTarget = (path) => [
      ...canonicalSegments,
      ...pathSegments(path_2.relative(targetPath, path)),
    ];
    opensEvalDir =
      foldPathCase(targetSegments, expectedSegments, "exact") ||
      foldPathCase(canonicalSegments, expectedSegments, "exact");
    mayLeadToEvalDir = (path) =>
      isSameLengthAndPath(frameSegmentsOf(path), expectedSegments) ||
      isSameLengthAndPath(segmentsFromTarget(path), expectedSegments);
    routeIndependentCheck = (path) =>
      foldPathCase(expectedSegments, frameSegmentsOf(path), "exact") ||
      foldPathCase(expectedSegments, segmentsFromTarget(path), "exact");
  } else {
    let caseFoldMode = getPlatform() === "macos" || getPlatform() === "windows" ? "folded" : "exact";
    opensEvalDir =
      pathEndsWith(pathSegments(targetPath), expectedSegments, caseFoldMode) ||
      pathEndsWith(pathSegments(originalPath), expectedSegments, caseFoldMode);
    mayLeadToEvalDir = (candidate) =>
      isSameLengthAndPath(pathSegments(path_2.relative(targetPath, candidate)), expectedSegments);
    routeIndependentCheck = (candidate) =>
      foldPathCase(expectedSegments, pathSegments(path_2.relative(targetPath, candidate)), "exact");
  }
  let rootRealpath = await realpath(targetPath).catch(() => targetPath);
  let walkState = {
    opensEvalDir: mayLeadToEvalDir,
    mayLeadToEvalDir: routeIndependentCheck,
    routeIndependent: defaultEvalDirName,
    skipped,
    rootReal: rootRealpath,
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
  await scanSuiteDirectory(targetPath, rootRealpath, caseDirs, 0, opensEvalDir, walkState);
  for (let [cutKey, deferredCut] of walkState.deferredCuts)
    if (!walkState.listedAt.has(cutKey)) skipped.push(deferredCut);
  return {
    caseDirs: [...caseDirs].sort(),
    skipped,
  };
}
//@ chunk-qchp9vrd.js:94884-98795 placement
/**
 * 扫描套件目录（嵌套层级上限、.git 等），收集用例。
 */
async function scanSuiteDirectory(dirPath, dirReal, caseDirs, depth, isSuiteRoute, walkState) {
  let reportSkip = (skipKey, file, error) => {
    if (!walkState.reported.has(skipKey)) {
      walkState.reported.add(skipKey);
      walkState.skipped.push({
        file,
        error,
      });
    }
  };
  let reportHere = isSuiteRoute || !walkState.routeIndependent || depth === 0;
  let reportOrLog = (message) => {
    if (reportHere) reportSkip(dirReal, dirPath, message);
    else logForDebugging(`plugin eval: ${escapeNonAscii(dirPath)}: ${message}`);
  };
  if (depth > MAX_ROUTE_DEPTH) {
    let problem = `nested more than ${MAX_ROUTE_DEPTH} directories below the target by this route \u2014 not scanned from here (move the suite higher, or target it directly)`;
    if (reportHere) {
      let cutKey = `${isSuiteRoute ? "suite" : "tree"}:${dirReal}`;
      if (!walkState.deferredCuts.has(cutKey))
        walkState.deferredCuts.set(cutKey, {
          file: dirPath,
          error: problem,
        });
    } else logForDebugging(`plugin eval: ${escapeNonAscii(dirPath)}: ${problem}`);
    return;
  }
  let entries;
  try {
    entries = await readdir(dirPath, {
      withFileTypes: true,
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOTDIR" && depth === 0) {
      reportOrLog("is a file, not a directory or a case file (case.yaml / prompt.md) \u2014 nothing to scan");
      return;
    }
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    if (isFsInaccessible(error)) {
      reportOrLog(`cannot be read (${errnoCode ?? "unknown error"}) \u2014 not scanned`);
      return;
    }
    throw error;
  }
  let routeKey = `${isSuiteRoute ? "suite" : "tree"}:${dirReal}`;
  let listedDepth = walkState.listedAt.get(routeKey);
  if (listedDepth === undefined || depth < listedDepth) walkState.listedAt.set(routeKey, depth);
  if (isSuiteRoute && entries.some((entry) => !entry.isDirectory() && isMagicDocsPromptFile(entry.name))) {
    if (walkState.foundReal.has(dirReal)) {
      logForDebugging(
        `plugin eval: ${escapeNonAscii(dirPath)} is the same case directory as one already found \u2014 counted once`,
      );
      return;
    }
    walkState.foundReal.add(dirReal);
    caseDirs.add(dirPath);
    return;
  }
  if (isSuiteRoute && depth > 0 && !walkState.opensEvalDir(dirPath))
    logForDebugging(
      `plugin eval: ${escapeNonAscii(dirPath)} has no prompt.md or case.yaml \u2014 not a case; scanning its subdirectories`,
    );
  walkState.onRoute.add(routeKey);
  try {
    for (let entry of entries) {
      let dirPath_2 = path_2.join(dirPath, entry.name);
      if (isGitDir(entry.name) || SKIPPED_SUBDIR_NAMES.has(entry.name)) {
        if (
          entry.name === "mocks" &&
          isSuiteRoute &&
          (await getFileKind(entry, dirPath_2, "unknown")) === "dir" &&
          (await looksLikeEvalSuite(dirPath, entry.name))
        )
          reportSkip(
            dirPath_2,
            dirPath_2,
            "mocks/ is reserved for mock responders \u2014 cases placed there (or in a case group by that name) are not run, and their files would be read as mock responders; rename the directory",
          );
        continue;
      }
      let fileKind = await getFileKind(entry, dirPath_2, "unknown");
      if (fileKind === "unknown") {
        let problem = `${entry.name} could not be examined (its type is unknown and it cannot be stat'ed) \u2014 not scanned`;
        if (
          isSuiteRoute ||
          walkState.opensEvalDir(dirPath_2) ||
          (!walkState.routeIndependent && walkState.mayLeadToEvalDir(dirPath_2))
        )
          reportSkip(`${dirReal}${path_2.sep}${entry.name}`, dirPath_2, problem);
        else logForDebugging(`plugin eval: ${escapeNonAscii(dirPath_2)}: ${problem}`);
        continue;
      }
      let dirReal_2 = path_2.join(dirReal, entry.name);
      let opensCaseDir = isSuiteRoute || walkState.opensEvalDir(dirPath_2);
      if (fileKind === "symlink") {
        let shouldReport =
          isSuiteRoute ||
          walkState.opensEvalDir(dirPath_2) ||
          (!walkState.routeIndependent && walkState.mayLeadToEvalDir(dirPath_2));
        let reportOrLog = (message) => {
          if (shouldReport) reportSkip(`${dirReal}${path_2.sep}${entry.name}`, dirPath_2, message);
          else logForDebugging(`plugin eval: ${escapeNonAscii(dirPath_2)}: ${message}`);
        };
        try {
          await checkRepoAuthoredPath(dirPath, entry.name, "plugin eval");
        } catch (error) {
          reportOrLog(errorMessage(error));
          continue;
        }
        let linkStats;
        try {
          linkStats = await stat(dirPath_2);
        } catch (error) {
          reportOrLog(
            `${entry.name} is a symbolic link whose target ${isENOENT(error) ? "does not exist" : `cannot be read (${getErrnoCode(error) ?? "unknown error"})`} \u2014 skipped`,
          );
          continue;
        }
        fileKind = linkStats.isDirectory() ? "dir" : "other";
        if (fileKind === "dir") {
          let linkReal = await realpath(dirPath_2).catch(() => null);
          if (linkReal === null) {
            reportOrLog(
              `${entry.name} is a symbolic link whose target could not be resolved \u2014 not followed`,
            );
            continue;
          }
          dirReal_2 = linkReal;
          if (dirReal_2 === dirReal || toEvalPathError(dirReal_2, dirReal)) {
            reportOrLog(
              `${entry.name} is a symbolic link to its own directory or one above it \u2014 not followed`,
            );
            continue;
          }
          if (
            dirReal_2 === walkState.rootReal ||
            walkState.typedAncestorReals.some(
              (typedAncestorReal) =>
                dirReal_2 === typedAncestorReal || toEvalPathError(dirReal_2, typedAncestorReal),
            ) ||
            toEvalPathError(dirReal_2, walkState.rootReal)
          ) {
            reportOrLog(
              `${entry.name} is a symbolic link to the directory under test or one above it \u2014 not followed`,
            );
            continue;
          }
          if (
            (opensCaseDir || walkState.routeIndependent) &&
            walkState.onRoute.has(`${opensCaseDir ? "suite" : "tree"}:${dirReal_2}`)
          ) {
            logForDebugging(
              `plugin eval: ${escapeNonAscii(dirPath_2)} links back into a directory on the current route \u2014 not followed again`,
            );
            continue;
          }
        }
      }
      if (fileKind !== "dir") continue;
      if (!opensCaseDir && !walkState.mayLeadToEvalDir(dirPath_2)) continue;
      if (isNetworkMountRoot_2(dirReal_2) || isNetworkMountRoot_2(dirPath_2)) {
        let problem = `${entry.name} is an automounter map directory \u2014 not scanned (listing it would reach network hosts)`;
        if (opensCaseDir || !walkState.routeIndependent)
          reportSkip(`${dirReal}${path_2.sep}${entry.name}`, dirPath_2, problem);
        else logForDebugging(`plugin eval: ${escapeNonAscii(dirPath_2)}: ${problem}`);
        continue;
      }
      if (opensCaseDir || walkState.routeIndependent) {
        let listedDepth = walkState.listedAt.get(`${opensCaseDir ? "suite" : "tree"}:${dirReal_2}`);
        if (listedDepth !== undefined && listedDepth <= depth + 1) {
          logForDebugging(
            `plugin eval: ${escapeNonAscii(dirPath_2)} was already listed by another route at this depth or shallower \u2014 not walked again`,
          );
          continue;
        }
      }
      if (walkState.budget.remaining <= 0) {
        if (!walkState.budget.reported) {
          walkState.budget.reported = true;
          walkState.skipped.push({
            file: dirPath_2,
            error: `the tree under the target has more than ${MAX_WALK_BUDGET} directories to walk (links can inflate it) \u2014 the rest was not scanned`,
          });
        }
        continue;
      }
      walkState.budget.remaining--;
      await scanSuiteDirectory(dirPath_2, dirReal_2, caseDirs, depth + 1, opensCaseDir, walkState);
    }
  } finally {
    walkState.onRoute.delete(routeKey);
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
  let baseDir = getPlatform() === "macos" ? "/tmp" : os_2.tmpdir();
  let prefix = getPlatform() === "macos" ? "e-" : "claude-eval-";
  let root = await realpath(await mkdtemp(path_2.join(baseDir, prefix)));
  let joined = path_2.join(root, "config");
  let joined_2 = path_2.join(root, "home");
  let joined_3 = path_2.join(joined_2, "cwd");
  let joined_4 = path_2.join(root, "out");
  let joined_5 = path_2.join(root, "tmp");
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
    path_2.join(joined, ".claude.json"),
    jsonStringify({
      hasCompletedOnboarding: true,
      autoUpdates: false,
      bypassPermissionsModeAccepted: false,
    }),
  );
  await writeFile(
    path_2.join(joined_2, ".gitconfig"),
    `[user]
	name = Plugin Eval
	email = eval@example.invalid
`,
  );
  let joined_6 = path_2.join(joined_2, ".git");
  await mkdir(path_2.join(joined_6, "objects"), {
    recursive: true,
  });
  await mkdir(path_2.join(joined_6, "refs", "heads"), {
    recursive: true,
  });
  await mkdir(path_2.join(joined_6, "hooks"), {
    recursive: true,
  });
  await writeFile(
    path_2.join(joined_6, "HEAD"),
    `ref: refs/heads/main
`,
  );
  await writeFile(path_2.join(joined_6, "config"), GIT_DIR_CONFIG);
  await writeFile(
    path_2.join(joined_6, "commondir"),
    `.
`,
  );
  return {
    root,
    cwd: joined_3,
    configDir: joined,
    home: joined_2,
    outDir: joined_4,
    tmpDir: joined_5,
    operatorConfigDir: getClaudeConfigDir(),
    cleanup: async () => {
      await detectPlatformFlavor(root);
      await rm_2(root, {
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
  baseDir,
  relativePath,
  treeRoot,
  budget = {
    hops: 16,
  },
  linkState = {
    link: false,
  },
) {
  let currentPath = baseDir;
  let parts = relativePath.split(path_2.sep);
  for (let [partIndex, part] of parts.entries()) {
    currentPath = path_2.join(currentPath, part);
    let linkTarget;
    try {
      if (!(await lstat(currentPath)).isSymbolicLink()) continue;
      linkState.link = true;
      linkTarget = await readlink(currentPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? null : UNINSPECTABLE_LABEL;
    }
    if (escapesAfterDescent(linkTarget)) return UNINSPECTABLE_LABEL;
    let specialPath = describeSpecialPath(linkTarget);
    if (specialPath !== null) return specialPath;
    let linkTarget_2 = path_2.resolve(path_2.dirname(currentPath), linkTarget);
    if (linkTarget_2 === treeRoot || isSameOrInside(linkTarget_2, treeRoot)) {
      if (--budget.hops < 0) return UNINSPECTABLE_LABEL;
      let nestedProblem = await checkAutomounterPath(
        treeRoot,
        path_2.relative(treeRoot, linkTarget_2),
        treeRoot,
        budget,
      );
      if (nestedProblem !== null) return nestedProblem;
      if (partIndex !== parts.length - 1) return UNINSPECTABLE_LABEL;
      continue;
    }
    return (
      describeSpecialPath(linkTarget_2) ??
      (isNetworkRelatedPath(linkTarget_2) ? "an automounter path" : ESCAPING_LINK_LABEL)
    );
  }
  return null;
}
//@ chunk-qchp9vrd.js:100486-100620 placement
function escapesAfterDescent(path) {
  let descended = false;
  for (let part of path.replace(/\\/g, "/").split("/"))
    if (part === "..") {
      if (descended) return true;
    } else if (part !== "" && part !== ".") descended = true;
  return false;
}
//@ chunk-qchp9vrd.js:100620-100676 placement
/**
 * 描述特殊路径（网络共享等）。
 */
function describeSpecialPath(linkTarget) {
  return isUncOrDeviceSpelling(linkTarget) ? "a network share path" : null;
}
//@ chunk-qchp9vrd.js:100676-100978 placement
/**
 * 判断目录是否像插件评测套件：路径须为仓库内文件，存在套件文件或任一子目录（最多 64 个）含 case.yaml。
 */
async function looksLikeEvalSuite(parentDir, name) {
  try {
    await checkRepoAuthoredPath(parentDir, name, "plugin eval");
  } catch {
    return false;
  }
  if (await hasMagicDocsPromptFile(path_2.join(parentDir, name))) return true;
  let entries;
  try {
    entries = await readdir(path_2.join(parentDir, name), {
      withFileTypes: true,
    });
  } catch {
    return false;
  }
  for (let entry of entries.filter((entry) => entry.isDirectory()).slice(0, 64))
    try {
      await lstat(path_2.join(parentDir, name, entry.name, "case.yaml"));
      return true;
    } catch {}
  return false;
}
//@ chunk-qchp9vrd.js:100978-101068 placement
/**
 * 目录里是否有魔法文档提示文件。
 */
async function hasMagicDocsPromptFile(dirPath) {
  for (let promptFile of MAGIC_DOCS_PROMPT_FILES)
    try {
      await lstat(path_2.join(dirPath, promptFile));
      return true;
    } catch {}
  return false;
}
//@ chunk-qchp9vrd.js:101143-101262 placement
class UnenumerablePluginError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  unenumerable;
  constructor(unenumerable, message, telemetryMessage) {
    super(message, telemetryMessage);
    this.unenumerable = unenumerable;
    this.name = "UnenumerablePluginError";
  }
}
//@ chunk-qchp9vrd.js:101262-101446 placement
/**
 * 汇总多个插件的 MCP 服务器（无法枚举的插件记录到列表中）。
 */
async function collectPluginMcpServers(pluginDirs, failures) {
  let servers = new Map();
  for (let pluginDir of pluginDirs)
    try {
      for (let [name, config] of await enumeratePluginMcpServers(pluginDir)) servers.set(name, config);
    } catch (error) {
      if (failures !== undefined && error instanceof UnenumerablePluginError) {
        failures.push(error.unenumerable);
        continue;
      }
      throw error;
    }
  return servers;
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
