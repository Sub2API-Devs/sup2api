/**
 * utils/plugins/versionDirSwap.ts
 *
 * 2.1.316 新增：版本目录替换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (41)
 * attribution: placement 41
 */
import { readdir, lstat, readlink, open, rename, lutimes } from "fs/promises";
import { join, dirname } from "path";
import { createHash } from "crypto";
import {
  classifyCacheEntry,
  sweepStaleTempSiblings,
  hasRealEntries,
  makeTempSiblingName,
} from "./pluginCacheMaterialize.js";
import { logForDebugging } from "../debug.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isPathAbsent,
} from "../errors.js";
import { mapped_4, BINARY_LOCKFILE_MESSAGES } from "./pluginDependencies.js";
import { getPlatform } from "../platform.js";
import { isSupportedPlatform } from "../../commands/desktop/index.js";
import {
  binaryBaseNameForTarget,
  MAX_PLUGIN_BINARY_BYTES,
  readOnlyNoFollowFlags,
} from "../platformTargets.js";
import {
  LINKS_MATERIALIZED_MARKER as LINKS_MATERIALIZED_MARKER_2,
  ORPHAN_MARKER_FILE,
  IN_USE_MARKER_FILE,
} from "./cacheUtils.js";
import { normalizePathSegment } from "../pathSegments.js";
import { isSameFilesystem, TRANSIENT_FS_ERRORS as TRANSIENT_FS_ERRORS_2 } from "./safeCopy.js";
import { LONG_RETRY_DELAYS_MS } from "../atomicPublishWrite.js";
import { sleep } from "../sleep.js";
import {
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
  removePathEntry,
} from "../fsRemove.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4521396-4521431 placement
var COMPARE_TREE_BUDGET = 1e4;
var COMPARE_TREE_BUDGET_BYTES = 419430400;
var COMPARE_TREE_CHUNK_BYTES = 65536;
//@ chunk-5xgkngpb.js:4521431-4522235 placement
async function compareVersionTrees(stagedRoot, installedRoot, options = {}) {
  let budget = options.budget ?? {
    entries: COMPARE_TREE_BUDGET,
    bytes: COMPARE_TREE_BUDGET_BYTES,
  };
  let kind = await classifyCacheEntry(installedRoot);
  if (kind !== "other")
    return {
      verdict: kind === "absent" ? "absent" : "differs",
      refresh: [],
    };
  let seenDirs = new Map();
  let stagedSignatures = await listTreeSignatures(
    stagedRoot,
    (relPath, name, kind) =>
      (name === ".git" && kind === "dir") ||
      (relPath === `bin/${name}` && options.binariesHook?.declared.has(name) === true),
    budget,
    undefined,
    seenDirs,
  ).catch((error) => {
    if (error instanceof CompareBudgetExceeded) return;
    throw error;
  });
  if (stagedSignatures === undefined)
    return {
      verdict: "differs",
      refresh: [],
    };
  let gitDirs = new Set([...seenDirs.keys()].filter((key) => key.split("/").at(-1) === ".git"));
  return compareVersionDirs(
    stagedRoot,
    installedRoot,
    stagedSignatures,
    gitDirs,
    options.binariesHook,
    budget,
  ).then(
    (identical) =>
      identical
        ? {
            verdict: "identical",
            refresh: [...gitDirs].sort(),
          }
        : {
            verdict: "differs",
            refresh: [],
          },
    (error) => {
      if (error instanceof StagedReadError) throw error.reason;
      logForDebugging(
        `versionDirSwap: could not compare ${installedRoot} with the staged tree (${getErrnoCode(error) ?? (error instanceof Error ? error.name : "unknown error")}); treating them as different`,
      );
      return {
        verdict: "differs",
        refresh: [],
      };
    },
  );
}
//@ chunk-5xgkngpb.js:4522235-4522352 placement
class CompareBudgetExceeded extends Error {
  constructor() {
    super("plugin tree past the compare budget");
    this.name = "CompareBudgetExceeded";
  }
}
//@ chunk-5xgkngpb.js:4522352-4524613 placement
/**
 * 比较两个版本目录（package.json、.git、node_modules 等差异）。
 */
async function compareVersionDirs(
  stagedRoot,
  installedRoot,
  installedSignatures,
  gitDirs,
  binariesHook,
  budget,
) {
  let installedNames = new Set(await readdir(installedRoot));
  let lockfilePath = installedSignatures.has("package.json")
    ? mapped_4.find((candidate) => installedSignatures.has(candidate))
    : undefined;
  let hasLockfile = lockfilePath !== undefined;
  let isWindows = getPlatform() === "windows";
  let installedStats = await lstat(installedRoot, {
    bigint: true,
  });
  let stagedStats = await lstat(stagedRoot, {
    bigint: true,
  }).catch((error) => {
    throw new StagedReadError(error);
  });
  let installedLoose = isWindows ? 0 : Number(installedStats.mode) & FILE_MODE_BITS_MASK;
  let stagedLoose = isWindows ? 0 : Number(stagedStats.mode) & FILE_MODE_BITS_MASK;
  let owner = ownerKey(installedStats);
  if (
    (installedLoose & ~stagedLoose) !== 0 ||
    !isSameOwnerEntry(owner, installedLoose, ownerKey(stagedStats))
  )
    return false;
  let directories = new Map([
    [
      "",
      {
        dev: installedStats.dev,
        ino: installedStats.ino,
        owner,
        loose: installedLoose,
      },
    ],
  ]);
  let cleanableNames = new Set();
  for (let name of installedNames)
    if (
      !installedSignatures.has(name) &&
      CACHE_CLEANABLE_NAMES.has(name) &&
      (await isRootEntryUnchanged(installedRoot, name, installedLoose, owner))
    )
      cleanableNames.add(name);
  let target = isSupportedPlatform();
  let flattened = [...(binariesHook?.declared ?? [])].flatMap(([declared, sha256]) => {
    let baseName = target === undefined ? undefined : binaryBaseNameForTarget(declared, target);
    return baseName === undefined
      ? []
      : [
          {
            declared,
            bare: baseName,
            sha256,
          },
        ];
  });
  let bareNames = new Set(flattened.map((entry) => entry.bare));
  let names = new Map();
  let stagedSignatures = await listTreeSignatures(
    installedRoot,
    (relPath, name, kind, loose, dirEntryOwner, nlink) =>
      (name === ".git" &&
        kind === "dir" &&
        gitDirs.has(relPath) &&
        (loose & ~installedLoose) === 0 &&
        isSameOwnerEntry(dirEntryOwner, loose, owner)) ||
      (relPath === name &&
        cleanableNames.has(name) &&
        (name === LINKS_MATERIALIZED_MARKER_2 ? kind === "file" && nlink === 1 : kind === "dir") &&
        (loose & ~installedLoose) === 0 &&
        isSameOwnerEntry(dirEntryOwner, loose, owner) &&
        (name !== "node_modules" || hasLockfile)),
    budget,
    names,
    directories,
    installedStats,
  );
  let hookNames = new Set(
    [...(binariesHook?.declared.keys() ?? []), ...bareNames].map((name) => join(installedRoot, "bin", name)),
  );
  let hookContext = {
    rootOwner: owner,
    names,
    hookNames,
    directories,
  };
  if (![...gitDirs].every((dirPath) => directories.has(dirPath) && !stagedSignatures.has(dirPath)))
    return false;
  let isPlainBinDir = (signature) => {
    let [kind, parsedOwner, mode] = (signature ?? "").split(":");
    return (
      kind === "dir" && mode === "0" && parsedOwner !== undefined && isSameOwnerEntry(parsedOwner, 0, owner)
    );
  };
  let isAllowedHookEntry = (relPath) =>
    binariesHook !== undefined &&
    ((relPath === "bin" && isPlainBinDir(stagedSignatures.get("bin"))) ||
      (relPath.startsWith("bin/") &&
        (bareNames.has(relPath.slice(4)) || binariesHook.declared.has(relPath.slice(4))) &&
        stagedSignatures.get(relPath)?.startsWith("file:") === true));
  if (!(
    [...installedSignatures].every(([relPath, signature]) =>
      isEntrySignatureCompatible(signature, stagedSignatures.get(relPath)),
    ) && [...stagedSignatures.keys()].every((key) => installedSignatures.has(key) || isAllowedHookEntry(key))
  ))
    return false;
  if (
    [...installedNames].some((name) => isOrphanMarkerName(name)) ||
    (lockfilePath !== undefined &&
      !installedSignatures.has("node_modules") &&
      (!cleanableNames.has("node_modules") ||
        !(await isHookFileStillPlain(installedRoot, lockfilePath, directories))))
  )
    return false;
  if (binariesHook !== undefined && binariesHook.declared.size > 0) {
    let binSignature = stagedSignatures.get("bin");
    if (
      binSignature !== undefined &&
      (installedSignatures.has("bin") ? !binSignature.startsWith("dir:") : !isPlainBinDir(binSignature))
    )
      return false;
    let declaredNames = new Set(flattened.map((entry) => entry.declared));
    for (let [declared, sha256] of binariesHook.declared) {
      let present = stagedSignatures.has(`bin/${declared}`);
      let digestVerdict = stagedSignatures.has("bin")
        ? await compareBinaryDigest(installedRoot, declared, sha256, hookContext, budget, !present)
        : "absent";
      if (
        digestVerdict === "wrong" ||
        (digestVerdict === "absent" && (declaredNames.has(declared) || present))
      )
        return false;
    }
    for (let { bare, sha256 } of flattened) {
      if (installedSignatures.has(`bin/${bare}`)) continue;
      let expectedSha = binariesHook.declared.get(bare) ?? sha256;
      if (
        !stagedSignatures.has("bin") ||
        (await compareBinaryDigest(installedRoot, bare, expectedSha, hookContext, budget, false)) !== "match"
      )
        return false;
    }
  }
  for (let [relPath, signature] of installedSignatures)
    if (
      signature.startsWith("file:") &&
      !(await compareFileBytes(
        stagedRoot,
        installedRoot,
        relPath,
        Number(signature.split(":")[1]),
        parseInt(signature.split(":").at(-1) ?? "0", 8),
        signature.split(":")[2] === "x",
        hookContext,
      ))
    )
      return false;
  return true;
}
//@ chunk-5xgkngpb.js:4524613-4524647 placement
function isOrphanMarkerName(name) {
  return normalizePathSegment(name) === ORPHAN_MARKER_FILE;
}
//@ chunk-5xgkngpb.js:4524647-4524659 placement
var FILE_MODE_BITS_MASK = 3602;
//@ chunk-5xgkngpb.js:4524659-4524723 placement
function ownerKey(stats) {
  return getPlatform() === "windows" ? "-.-" : `${stats.uid}.${stats.gid}`;
}
//@ chunk-5xgkngpb.js:4524723-4524817 placement
function isSameOwnerEntry(leftOwnerKey, leftLoose, rightOwnerKey) {
  let [leftUid, leftGid] = leftOwnerKey.split(".");
  let [rightUid, rightGid] = rightOwnerKey.split(".");
  return leftUid === rightUid && ((leftLoose & 16) === 0 || leftGid === rightGid);
}
//@ chunk-5xgkngpb.js:4524817-4525205 placement
/**
 * 已安装条目签名与暂存签名是否兼容（链接目标、属主、权限不更宽）。
 */
function isEntrySignatureCompatible(installedSignature, stagedSignature) {
  if (stagedSignature === undefined) return false;
  if (installedSignature.startsWith("link:")) {
    let [stagedKind, stagedOwner, ...stagedRest] = stagedSignature.split(":");
    let [installedKind, installedOwner, ...installedRest] = installedSignature.split(":");
    return (
      stagedKind === installedKind &&
      stagedRest.join(":") === installedRest.join(":") &&
      stagedOwner !== undefined &&
      installedOwner !== undefined &&
      isSameOwnerEntry(stagedOwner, 0, installedOwner)
    );
  }
  let parts = installedSignature.split(":");
  let parts_2 = stagedSignature.split(":");
  let installedMode = parseInt(parts.pop() ?? "0", 8);
  let stagedMode = parseInt(parts_2.pop() ?? "0", 8);
  let installedOwnerPart = parts.pop();
  let stagedOwnerPart = parts_2.pop();
  return (
    parts_2.join(":") === parts.join(":") &&
    stagedOwnerPart !== undefined &&
    installedOwnerPart !== undefined &&
    isSameOwnerEntry(stagedOwnerPart, stagedMode, installedOwnerPart) &&
    (stagedMode & ~installedMode) === 0
  );
}
//@ chunk-5xgkngpb.js:4525205-4525346 placement
async function isHookFileStillPlain(rootDir, lockfileName, directories) {
  let lockfilePath = BINARY_LOCKFILE_MESSAGES.get(lockfileName);
  return (
    lockfilePath !== undefined &&
    (await arePathDirsUnchanged(rootDir, lockfilePath, directories)) &&
    (await lstat(join(rootDir, ...lockfilePath.split("/"))).then(
      (stats) => stats.isFile(),
      () => false,
    ))
  );
}
//@ chunk-5xgkngpb.js:4525346-4525386 placement
var CACHE_CLEANABLE_NAMES; // deferred: uses ORPHAN_MARKER_FILE (./cacheUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4525346", () => {
  CACHE_CLEANABLE_NAMES = new Set(["node_modules", IN_USE_MARKER_FILE, LINKS_MATERIALIZED_MARKER_2]);
});
//@ chunk-5xgkngpb.js:4525386-4525622 placement
async function isRootEntryUnchanged(rootDir, name, loose, owner) {
  let stats = await lstat(join(rootDir, name), {
    bigint: true,
  });
  let isWindows = getPlatform() === "windows";
  let mode = isWindows ? 0 : Number(stats.mode) & FILE_MODE_BITS_MASK;
  if ((mode & ~loose) !== 0 || !isSameOwnerEntry(ownerKey(stats), mode, owner)) return false;
  if (name === LINKS_MATERIALIZED_MARKER_2) return stats.isFile() && (isWindows || stats.nlink === 1n);
  return stats.isDirectory() && (!isWindows || (await isSameFilesystem(rootDir, name)));
}
//@ chunk-5xgkngpb.js:4525622-4526140 placement
/**
 * 路径上每级目录仍是列举时看到的那个普通目录。
 */
async function arePathDirsUnchanged(rootDir, relPath, directories) {
  let currentDir = rootDir;
  let currentRelPath = "";
  for (let segment of ["", ...relPath.split("/").slice(0, -1)]) {
    currentDir = join(currentDir, segment);
    currentRelPath =
      segment === "" ? currentRelPath : currentRelPath ? `${currentRelPath}/${segment}` : segment;
    let kind = await classifyCacheEntry(currentDir);
    let expected = directories.get(currentRelPath);
    if (!(
      kind === "other" &&
      (expected === undefined ||
        (await lstat(currentDir, {
          bigint: true,
        }).then((stats) => {
          let mode = getPlatform() === "windows" ? 0 : Number(stats.mode) & FILE_MODE_BITS_MASK;
          return (
            stats.isDirectory() &&
            getFileIdentity_8(expected, stats) &&
            (mode & ~expected.loose) === 0 &&
            isSameOwnerEntry(ownerKey(stats), mode, expected.owner)
          );
        })))
    )) {
      logForDebugging(
        `versionDirSwap: ${currentDir} is no longer the plain directory the installed copy's listing saw (${kind}); not opening ${relPath} through it and treating the trees as different`,
      );
      return false;
    }
  }
  return true;
}
//@ chunk-5xgkngpb.js:4526140-4526995 placement
/**
 * bin 文件 sha256 与期望一致（match/wrong/absent）。
 */
async function compareBinaryDigest(rootDir, name, expectedSha, context, budget, enforceBudget) {
  let relPath = `bin/${name}`;
  if (!(await arePathDirsUnchanged(rootDir, relPath, context.directories))) return "wrong";
  let binPath = join(rootDir, "bin", name);
  if (getPlatform() === "windows")
    return lstat(binPath).then(
      () => "wrong",
      (error) => (getErrnoCode(error) === "ENOENT" ? "absent" : "wrong"),
    );
  let opened = await openRegularFileChecked(binPath, {
    occupant: {
      owner: context.rootOwner,
      names: context.names,
      hookNames: context.hookNames,
    },
  }).catch((error) => (getErrnoCode(error) === "ENOENT" ? "absent" : "wrong"));
  if (opened === "absent" || opened === "wrong") return opened;
  if (opened === undefined) return "wrong";
  let { handle, size, mode } = opened;
  try {
    if (size > MAX_PLUGIN_BINARY_BYTES || (mode & 64) === 0 || (mode & FILE_MODE_BITS_MASK) !== 0)
      return "wrong";
    if (enforceBudget && ((budget.entries -= 1) < 0 || (budget.bytes -= size) < 0))
      throw new CompareBudgetExceeded();
    let hash = createHash("sha256");
    let buffer = Buffer.allocUnsafe(COMPARE_TREE_CHUNK_BYTES);
    for (let offset = 0; ; offset += COMPARE_TREE_CHUNK_BYTES) {
      let fully = await readFully(handle, buffer, offset);
      if (offset + fully > size) return "wrong";
      hash.update(buffer.subarray(0, fully));
      if (fully < COMPARE_TREE_CHUNK_BYTES)
        return offset + fully === size && hash.digest("hex") === expectedSha ? "match" : "wrong";
    }
  } catch (error) {
    if (error instanceof CompareBudgetExceeded) throw error;
    return "wrong";
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-5xgkngpb.js:4526995-4528167 placement
/**
 * 递归列出目录树条目签名（类型、属主、权限、大小），受预算限制。
 */
async function listTreeSignatures(
  rootDir,
  shouldSkip,
  budget,
  hardLinks,
  directories,
  expectedIdentity,
  relPath = "",
  signatures = new Map(),
) {
  let currentDir = relPath === "" ? rootDir : join(rootDir, ...relPath.split("/"));
  let names = await readdir(currentDir);
  let dirStats = await lstat(currentDir, {
    bigint: true,
  });
  if (
    !dirStats.isDirectory() ||
    (hardLinks !== undefined &&
      expectedIdentity !== undefined &&
      !getFileIdentity_8(expectedIdentity, dirStats))
  )
    throw RangeError("a directory moved while its names were being read");
  for (let name of names) {
    let childRelPath = relPath === "" ? name : `${relPath}/${name}`;
    let childPath = join(currentDir, name);
    let childStats = await lstat(childPath, {
      bigint: true,
    });
    let kind = childStats.isSymbolicLink()
      ? "link"
      : childStats.isDirectory()
        ? getPlatform() === "windows" && !(await isSameFilesystem(currentDir, name))
          ? "link"
          : "dir"
        : childStats.isFile()
          ? "file"
          : "other";
    let loose = getPlatform() === "windows" ? 0 : Number(childStats.mode) & FILE_MODE_BITS_MASK;
    let owner = ownerKey(childStats);
    let nlink = getPlatform() === "windows" ? 1 : Number(childStats.nlink);
    if (kind === "file" && hardLinks !== undefined) {
      let identityKey = `${childStats.dev}:${childStats.ino}`;
      hardLinks.set(identityKey, [...(hardLinks.get(identityKey) ?? []), childPath]);
    }
    if (kind === "dir")
      directories?.set(childRelPath, {
        dev: childStats.dev,
        ino: childStats.ino,
        owner,
        loose,
      });
    if (shouldSkip(childRelPath, name, kind, loose, owner, nlink)) continue;
    if ((budget.entries -= 1) < 0) throw new CompareBudgetExceeded();
    if (kind === "link") signatures.set(childRelPath, `link:${owner}:${await readlink(childPath)}`);
    else if (kind === "dir") {
      signatures.set(childRelPath, `dir:${owner}:${loose.toString(8)}`);
      await listTreeSignatures(
        rootDir,
        shouldSkip,
        budget,
        hardLinks,
        directories,
        childStats,
        childRelPath,
        signatures,
      );
    } else if (kind === "file") {
      if ((budget.bytes -= Number(childStats.size)) < 0) throw new CompareBudgetExceeded();
      let execFlag = getPlatform() !== "windows" && (Number(childStats.mode) & 64) !== 0 ? "x" : "-";
      signatures.set(childRelPath, `file:${childStats.size}:${execFlag}:${owner}:${loose.toString(8)}`);
    } else throw RangeError("an entry that is no file, directory or symlink");
  }
  return signatures;
}
//@ chunk-5xgkngpb.js:4528167-4528289 placement
class StagedReadError extends Error {
  reason;
  constructor(reason) {
    super("could not read the staged tree while comparing bytes");
    this.reason = reason;
  }
}
//@ chunk-5xgkngpb.js:4528289-4528897 placement
/**
 * 打开普通文件并核对身份、权限、属主与硬链接名。
 */
async function openRegularFileChecked(filePath, options) {
  let preStats = await lstat(filePath, {
    bigint: true,
  });
  if (!preStats.isFile()) return;
  let handle = await open(filePath, readOnlyNoFollowFlags());
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    let isWindows = getPlatform() === "windows";
    let mode = isWindows ? 0 : Number(stats.mode) & FILE_MODE_BITS_MASK;
    if (
      stats.isFile() &&
      (options.occupant === undefined ||
        (isSameFileIdentity_2(filePath, preStats, stats) &&
          (options.occupant.loose === undefined || (mode & ~options.occupant.loose) === 0) &&
          (options.occupant.exec === undefined ||
            isWindows ||
            ((Number(stats.mode) & 64) !== 0) === options.occupant.exec) &&
          isSameOwnerEntry(ownerKey(stats), mode, options.occupant.owner) &&
          (await areHardLinksAccounted(
            filePath,
            preStats,
            stats,
            options.occupant.names,
            options.occupant.hookNames,
          ))))
    )
      return {
        handle,
        size: Number(stats.size),
        mode: Number(stats.mode),
        owner: ownerKey(stats),
      };
  } catch (error) {
    await handle.close().catch(() => {
      return;
    });
    throw error;
  }
  await handle.close().catch(() => {
    return;
  });
  return;
}
//@ chunk-5xgkngpb.js:4528897-4529180 placement
function isSameFileIdentity_2(filePath, preStats, stats) {
  if (preStats.ino === 0n || stats.ino === 0n) return true;
  let same = preStats.ino === stats.ino && (getPlatform() === "windows" || preStats.dev === stats.dev);
  if (!same)
    logForDebugging(
      `versionDirSwap: ${filePath} is no longer the file the pre-open check saw (its identity changed between that lstat and the open); treating the trees as different`,
    );
  return same;
}
//@ chunk-5xgkngpb.js:4529180-4529277 placement (2.1.88 match: getFileIdentity, 0.795)
function getFileIdentity_8(seen, current) {
  return (
    seen.ino === 0n ||
    current.ino === 0n ||
    (current.ino === seen.ino && (getPlatform() === "windows" || current.dev === seen.dev))
  );
}
//@ chunk-5xgkngpb.js:4529277-4529874 placement
/**
 * 文件的硬链接数都能由已安装列表解释。
 */
async function areHardLinksAccounted(filePath, preStats, stats, names, hookNames) {
  if (getPlatform() === "windows") return true;
  let linkedPaths =
    preStats.ino === 0n || stats.ino === 0n
      ? [filePath]
      : (names.get(`${preStats.dev}:${preStats.ino}`) ?? []);
  if (
    linkedPaths.includes(filePath) &&
    stats.nlink === BigInt(linkedPaths.length) &&
    (hookNames === undefined
      ? linkedPaths.length === 1
      : linkedPaths.every((linkPath) => hookNames.has(linkPath)))
  ) {
    if (
      (
        await Promise.all(
          linkedPaths
            .filter((linkPath) => linkPath !== filePath)
            .map((linkPath) =>
              lstat(linkPath, {
                bigint: true,
              }).then(
                (linkStats) =>
                  linkStats.isFile() && linkStats.ino === stats.ino && linkStats.dev === stats.dev,
                () => false,
              ),
            ),
        )
      ).every(Boolean)
    )
      return true;
  }
  logForDebugging(
    `versionDirSwap: ${filePath} has ${stats.nlink} names and the installed copy's listing accounts for ${linkedPaths.length} (a hard link elsewhere, a name moved since, or a name no install gives it); treating the trees as different`,
  );
  return false;
}
//@ chunk-5xgkngpb.js:4529874-4530658 placement
/**
 * 逐块比较暂存与已安装文件内容。
 */
async function compareFileBytes(stagedRoot, installedRoot, relPath, size, loose, exec, context) {
  let stagedPath = join(stagedRoot, ...relPath.split("/"));
  let stagedOpened = await openRegularFileChecked(stagedPath, {}).catch((error) => {
    throw new StagedReadError(error);
  });
  if (stagedOpened === undefined)
    throw new StagedReadError(RangeError("a staged entry stopped being a regular file"));
  let handle = stagedOpened.handle;
  try {
    if (!(await arePathDirsUnchanged(installedRoot, relPath, context.directories))) return false;
    let regularFileChecked = await openRegularFileChecked(join(installedRoot, ...relPath.split("/")), {
      occupant: {
        owner: stagedOpened.owner,
        names: context.names,
        loose,
        exec,
      },
    });
    if (regularFileChecked === undefined) return false;
    let handle_2 = regularFileChecked.handle;
    try {
      if (regularFileChecked.size !== size) return false;
      let stagedBuffer = Buffer.allocUnsafe(COMPARE_TREE_CHUNK_BYTES);
      let installedBuffer = Buffer.allocUnsafe(COMPARE_TREE_CHUNK_BYTES);
      for (let offset = 0; offset <= size; offset += COMPARE_TREE_CHUNK_BYTES) {
        let [stagedRead, fully] = await Promise.all([
          readFully(handle, stagedBuffer, offset).catch((error) => {
            throw new StagedReadError(error);
          }),
          readFully(handle_2, installedBuffer, offset),
        ]);
        if (
          stagedRead !== fully ||
          !stagedBuffer.subarray(0, stagedRead).equals(installedBuffer.subarray(0, fully))
        )
          return false;
        if (stagedRead < COMPARE_TREE_CHUNK_BYTES) return offset + stagedRead === size;
      }
      return false;
    } finally {
      await handle_2.close().catch(() => {
        return;
      });
    }
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-5xgkngpb.js:4530658-4530793 placement
async function readFully(handle, buffer, position, offset = 0) {
  if (offset === buffer.length) return offset;
  let { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, position + offset);
  return bytesRead === 0 ? offset : readFully(handle, buffer, position, offset + bytesRead);
}
//@ chunk-5xgkngpb.js:4530793-4530907 placement
var OCCUPIED_RETRY_DELAYS_MS; // deferred: uses RETRY_DELAYS (../atomicPublishWrite.js) of its import cycle while loading; runs once the cycle is complete
var MAX_WAIT_MS;
var RETRY_BUDGET_MS;
var OCCUPIED_ERRORS;
deferInit("chunk-5xgkngpb.js:4530793", () => {
  OCCUPIED_RETRY_DELAYS_MS = [100, 500, 2000];
  MAX_WAIT_MS = 20000;
  RETRY_BUDGET_MS =
    LONG_RETRY_DELAYS_MS.reduce((acc, delayMs) => acc + delayMs, 0) + OCCUPIED_RETRY_DELAYS_MS[0];
  OCCUPIED_ERRORS = new Set(["ENOTEMPTY", "EEXIST", "EISDIR"]);
});
//@ chunk-5xgkngpb.js:4530907-4531202 placement
let HeldOccupantError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4530907", () => {
  HeldOccupantError = class HeldOccupantError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    code;
    pluginCommandErrorCategory = "in-use";
    constructor(message, code) {
      super(
        message,
        "plugin install: the installed copy of this plugin version could not be set aside (held by another program, or not modifiable by this account) and was not replaced",
      );
      this.code = code;
      this.name = "HeldOccupantError";
    }
  };
});
//@ chunk-5xgkngpb.js:4531202-4531489 placement
let BusyVersionDirError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4531202", () => {
  BusyVersionDirError = class BusyVersionDirError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    code;
    pluginCommandErrorCategory = "unknown";
    constructor(message, code) {
      super(
        message,
        "plugin install: the new copy of this plugin version could not be moved into its version folder (any installed copy had first been set aside or removed)",
      );
      this.code = code;
      this.name = "BusyVersionDirError";
    }
  };
});
//@ chunk-5xgkngpb.js:4531489-4531614 placement
class OccupiedDestination extends Error {
  refusal;
  constructor(refusal) {
    super("destination occupied");
    this.refusal = refusal;
    this.name = "OccupiedDestination";
  }
}
//@ chunk-5xgkngpb.js:4531614-4532843 placement
/**
 * 替换版本目录：除不可比对的部分外与暂存树一致时整目录替换。
 */
async function swapVersionDir(stagedPath, versionPath, options) {
  let context = {
    renameDirectory: options.renameDirectory ?? rename,
    sleep: options.sleep ?? sleep,
    budget: {
      waitMs: MAX_WAIT_MS,
      reserveMs: RETRY_BUDGET_MS,
      entries: COMPARE_TREE_BUDGET,
      bytes: COMPARE_TREE_BUDGET_BYTES,
    },
  };
  let compare = async () => {
    if (!options.keepIdentical) return "differs";
    let { verdict, refresh } = await compareVersionTrees(stagedPath, versionPath, {
      binariesHook: options.binariesHook,
      budget: context.budget,
    });
    if (verdict === "identical" && refresh.length > 0) {
      logForDebugging(
        `versionDirSwap: ${versionPath} matches the staged tree except for ${refresh.join(", ")}, which a compare cannot vouch for; replacing the whole copy`,
      );
      return "differs";
    }
    return verdict;
  };
  let finish = async (verdict, setAsidePaths) => {
    if (verdict === "kept") await removeStagedCopy(stagedPath);
    await Promise.all(setAsidePaths.map(removeSetAsideCopy));
    if ((await classifyCacheEntry(dirname(versionPath))) === "other")
      await sweepStaleTempSiblings(versionPath);
    return verdict;
  };
  let initialVerdict = await compare().catch(async (error) => {
    await removeStagedCopy(stagedPath);
    throw error;
  });
  if (initialVerdict === "identical") {
    logForDebugging(`versionDirSwap: ${versionPath} already holds exactly the staged tree; kept it`);
    return finish("kept", []);
  }
  let asideResult =
    initialVerdict === "absent"
      ? {
          kind: "absent",
        }
      : await setInstalledCopyAside(versionPath, context).catch(async (error) => {
          await removeStagedCopy(stagedPath);
          throw error;
        });
  let path = asideResult.kind === "aside" ? asideResult.path : undefined;
  let setAsidePaths = [];
  let allSetAsidePaths = () => [...(path === undefined ? [] : [path]), ...setAsidePaths];
  let publishResult;
  try {
    publishResult = await publishStagedTree(stagedPath, versionPath, compare, context, setAsidePaths);
  } catch (error) {
    context.budget.reserveMs = 0;
    let restoreResult = await restoreSetAsideCopy(versionPath, asideResult, setAsidePaths, compare, context);
    await removeStagedCopy(stagedPath);
    if (restoreResult === "kept") return finish("kept", allSetAsidePaths());
    if (restoreResult === "restored")
      await Promise.all(
        setAsidePaths.map(async (path) =>
          (await hasRealEntries(path, {
            whenUnreadable: true,
          }))
            ? undefined
            : removeSetAsideCopy(path),
        ),
      );
    throw await restoreVersionDir(error, versionPath, restoreResult, allSetAsidePaths());
  }
  return finish(publishResult, allSetAsidePaths());
}
//@ chunk-5xgkngpb.js:4532843-4533710 placement
async function setInstalledCopyAside(versionPath, context) {
  let dirPath = makeTempSiblingName(versionPath);
  try {
    await touchVersionDir(versionPath);
    await renameDirectoryWithRetry(versionPath, dirPath, context);
    await touchVersionDir(dirPath);
    logForDebugging(`versionDirSwap: set the installed copy aside: ${versionPath} \u2192 ${dirPath}`);
    return {
      kind: "aside",
      path: dirPath,
    };
  } catch (error) {
    if (isPathAbsent(error))
      return {
        kind: "absent",
      };
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EXDEV") {
      logForDebugging(
        `versionDirSwap: ${versionPath} sits on a filesystem layer that refuses to rename it (EXDEV); removing it in place before the publish instead`,
        {
          level: "warn",
        },
      );
      await removeDirectoryTreeNoFollow_2(versionPath);
      return {
        kind: "removed",
      };
    }
    if (isTransientFsError(error))
      throw new HeldOccupantError(
        `The installed copy of this plugin version at ${versionPath} could not be replaced: it is in use by another program (for example a running Claude Code session, or an editor or terminal inside that folder), or this account is not allowed to modify it (${errnoCode}). It was not replaced and the new copy was discarded. Close what is using it, or check the folder's permissions, and run the install again.`,
        errnoCode ?? "unknown",
      );
    throw error;
  }
}
//@ chunk-5xgkngpb.js:4533710-4533767 placement
function isTransientFsError(error) {
  return getPlatform() === "windows" && TRANSIENT_FS_ERRORS_2.has(getErrnoCode(error) ?? "");
}
//@ chunk-5xgkngpb.js:4533767-4533886 placement
async function sleepWithinBudget(delayMs, context) {
  if (context.budget.waitMs - delayMs < context.budget.reserveMs) return false;
  context.budget.waitMs -= delayMs;
  await context.sleep(delayMs);
  return true;
}
//@ chunk-5xgkngpb.js:4533886-4534199 placement
/**
 * 重命名目录，暂时失败按延迟表重试。
 */
async function renameDirectoryWithRetry(fromPath, toPath, context, refuseOccupied = false, attempt = 0) {
  try {
    await context.renameDirectory(fromPath, toPath);
  } catch (error) {
    let delayMs = isTransientFsError(error) ? LONG_RETRY_DELAYS_MS[attempt] : undefined;
    if (delayMs === undefined) throw error;
    if (refuseOccupied && (await classifyCacheEntry(toPath)) !== "absent")
      throw new OccupiedDestination(error);
    if (!(await sleepWithinBudget(delayMs, context))) throw error;
    logForDebugging(
      `versionDirSwap: rename ${fromPath} \u2192 ${toPath} failed (${errorCodeOrName(error)}); trying again after ${delayMs}ms`,
    );
    await renameDirectoryWithRetry(fromPath, toPath, context, refuseOccupied, attempt + 1);
  }
}
//@ chunk-5xgkngpb.js:4534199-4534379 placement
async function classifyRenameFailure(error, versionPath) {
  if (error instanceof OccupiedDestination)
    return {
      occupied: true,
      error: error.refusal,
    };
  let code = getErrnoCode(error) ?? "";
  return {
    occupied:
      OCCUPIED_ERRORS.has(code) ||
      ((code === "ENOTDIR" || isTransientFsError(error)) &&
        (await classifyCacheEntry(versionPath)) !== "absent"),
    error,
  };
}
//@ chunk-5xgkngpb.js:4534379-4534749 placement
/**
 * 发布暂存树；目标被其他进程重建时比较并保留或挪开。
 */
async function publishStagedTree(stagedPath, versionPath, compare, context, setAsidePaths, attempt = 0) {
  try {
    await renameDirectoryWithRetry(stagedPath, versionPath, context, true);
    return "published";
  } catch (error) {
    let { occupied, error: error_2 } = await classifyRenameFailure(error, versionPath);
    let delayMs = OCCUPIED_RETRY_DELAYS_MS[attempt];
    if (delayMs === undefined || !occupied || !(await sleepWithinBudget(delayMs, context))) throw error_2;
    logForDebugging(
      `versionDirSwap: ${versionPath} was re-created by another process during the install (${errorCodeOrName(error_2)}); looked again after ${delayMs}ms`,
    );
    if ((await compareAndSetAside(versionPath, compare, context, setAsidePaths)) === "identical")
      return "kept";
    return publishStagedTree(stagedPath, versionPath, compare, context, setAsidePaths, attempt + 1);
  }
}
//@ chunk-5xgkngpb.js:4534749-4534988 placement
async function compareAndSetAside(versionPath, compare, context, setAsidePaths) {
  let verdict = await compare();
  if (verdict === "identical")
    logForDebugging(
      `versionDirSwap: another process published exactly the staged tree at ${versionPath}; kept it`,
    );
  else if (verdict === "differs") {
    let asideResult = await setInstalledCopyAside(versionPath, context);
    if (asideResult.kind === "aside") setAsidePaths.push(asideResult.path);
  }
  return verdict;
}
//@ chunk-5xgkngpb.js:4534988-4535369 placement
/**
 * 失败后把挪开的副本移回（无内容则不恢复）。
 */
async function restoreSetAsideCopy(versionPath, asideResult, compare, context, setAsidePaths) {
  if (asideResult.kind !== "aside") return asideResult.kind === "removed" ? "removed" : "untouched";
  if (
    !(await hasRealEntries(asideResult.path, {
      whenUnreadable: true,
    }))
  ) {
    logForDebugging(
      `versionDirSwap: the folder that was at ${versionPath} held no plugin payload (or is gone); it is not moved back and the version path is left free`,
      {
        level: "warn",
      },
    );
    return "not-restored";
  }
  let moveResult = await moveInstalledCopyBack(
    asideResult.path,
    versionPath,
    context,
    setAsidePaths,
    compare,
  );
  return moveResult === "moved" ? "restored" : moveResult;
}
//@ chunk-5xgkngpb.js:4535369-4535904 placement
async function moveInstalledCopyBack(fromPath, toPath, compare, context, setAsidePaths, retried = false) {
  try {
    await renameDirectoryWithRetry(fromPath, toPath, context, true);
    logForDebugging(`versionDirSwap: moved ${fromPath} back to ${toPath}`, {
      level: "warn",
    });
    return "moved";
  } catch (error) {
    let { occupied, error: error_2 } = await classifyRenameFailure(error, toPath);
    if (!retried && occupied) {
      let verdict = await compareAndSetAside(toPath, compare, context, setAsidePaths).catch((error) => {
        logForDebugging(
          `versionDirSwap: could not displace what now stands at ${toPath} (${errorCodeOrName(error)})`,
          {
            level: "warn",
          },
        );
        return;
      });
      if (verdict === "identical") return "kept";
      if (verdict === "differs" || verdict === "absent") {
        await sleepWithinBudget(OCCUPIED_RETRY_DELAYS_MS[0], context);
        return moveInstalledCopyBack(fromPath, toPath, compare, context, setAsidePaths, true);
      }
    }
    logForDebugging(
      `versionDirSwap: could not move ${fromPath} back to ${toPath} (${errorCodeOrName(error_2)})`,
      {
        level: "warn",
      },
    );
    return "stranded";
  }
}
//@ chunk-5xgkngpb.js:4535904-4537313 placement
/**
 * 替换失败时恢复原版本目录，并说明恢复结果。
 */
async function restoreVersionDir(error, versionPath, restoreState, setAsidePaths) {
  let code = getErrnoCode(error) ?? "unknown";
  let isBusy = error instanceof HeldOccupantError || isTransientFsError(error) || OCCUPIED_ERRORS.has(code);
  let remainingPaths = (
    await Promise.all(
      setAsidePaths.map(async (path) => ((await classifyCacheEntry(path)) === "absent" ? [] : [path])),
    )
  ).flat();
  let stateNote = {
    untouched: "",
    removed:
      " The previously installed copy had to be removed first (this filesystem refuses to rename it), so this plugin version is not installed now.",
    restored: " The previously installed copy was moved back.",
    "not-restored":
      " The folder that was there before held no plugin files (or was already gone) and was not moved back; install the plugin again to restore it.",
    stranded: " The previously installed copy could not be moved back.",
  }[restoreState];
  let leftoverNote =
    remainingPaths.length === 0
      ? ""
      : ` Left on disk (removed by a later install of this version, or the plugin cache cleanup): ${remainingPaths.join(", ")}.`;
  if (
    !isBusy &&
    (restoreState === "untouched" || restoreState === "restored") &&
    remainingPaths.length === 0
  ) {
    if (stateNote !== "")
      logForDebugging(`versionDirSwap:${stateNote}`, {
        level: "warn",
      });
    return error;
  }
  let cause = isBusy
    ? `the new copy or the version folder stayed busy while the install ran (${code}) \u2014 usually a scanner still reading the freshly downloaded files, another program using that folder, or another process re-creating it`
    : `the move failed (${code})`;
  return new BusyVersionDirError(
    `Could not move the new copy of this plugin version into ${versionPath}: ${cause}.${stateNote}${leftoverNote} ${isBusy ? "Run the install again once other Claude Code sessions or programs using that folder have finished." : "Check the plugin cache folder's permissions and free disk space, then run the install again."}`,
    code,
  );
}
//@ chunk-5xgkngpb.js:4537313-4537539 placement
async function touchVersionDir(dirPath) {
  let date = new Date();
  await lutimes(dirPath, date, date).catch((error) => {
    if (isPathAbsent(error)) return;
    logForDebugging(
      `versionDirSwap: could not refresh the timestamp of ${dirPath} (${errorCodeOrName(error)}); a concurrent cleanup may treat it as older than it is`,
      {
        level: "warn",
      },
    );
  });
}
//@ chunk-5xgkngpb.js:4537539-4537611 placement
function errorCodeOrName(error) {
  return getErrnoCode(error) ?? (error instanceof Error ? error.name : "unknown error");
}
//@ chunk-5xgkngpb.js:4537611-4537976 placement
/**
 * 删除挪开的旧副本，删不净记 warn。
 */
async function removeSetAsideCopy(path) {
  let kind = await classifyCacheEntry(path);
  if (kind === "absent") return;
  await (kind === "other" ? removeDirectoryTreeNoFollow_2(path) : removePathEntry(path)).catch((error) => {
    logForDebugging(`versionDirSwap: removing the set-aside copy ${path} failed (${errorCodeOrName(error)})`);
  });
  if ((await classifyCacheEntry(path)) !== "absent")
    logForDebugging(
      `versionDirSwap: the set-aside copy ${path} could not be fully removed; a later install of this version or the plugin cache cleanup removes it`,
      {
        level: "warn",
      },
    );
}
//@ chunk-5xgkngpb.js:4537976-4538154 placement
async function removeStagedCopy(path) {
  let kind = await classifyCacheEntry(path);
  if (kind === "absent") return;
  await (kind === "other" ? removeDirectoryTreeNoFollow_2(path) : removePathEntry(path)).catch((error) => {
    logForDebugging(`versionDirSwap: could not remove the staged copy ${path} (${errorCodeOrName(error)})`);
  });
}
export { swapVersionDir };
