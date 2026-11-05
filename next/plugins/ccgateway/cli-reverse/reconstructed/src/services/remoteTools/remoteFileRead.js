/**
 * services/remoteTools/remoteFileRead.ts
 *
 * 2.1.316 新增。为远端读取本机文件：解析路径、拒绝可疑 Windows 路径与不受信 UNC、限时搜索。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-aejveeja.js (36)
 * attribution: placement 23, sole-consumer 7, affinity 1, layout 5
 */
import { normalize, sep, parse, isAbsolute, join, resolve, dirname, relative } from "path";
import { constants } from "fs";
import { readdir, lstat, open, readlink, realpath } from "fs/promises";
import { isUtf8 } from "buffer";
import { isFullyQualifiedPath, expandStablePath, UnstablePathError, expandPath } from "../../utils/path.js";
import {
  getErrnoCode,
  isFsInaccessible,
  WireSafeControlError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { isSubpathOf } from "../../utils/pathPrefix.js";
import { O_NOFOLLOW_ANY, READ_LIMITS } from "../../utils/fsBoundRead.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import {
  pathVettingReason,
  vetPathSpellingsOrChainAsync,
  vetPathSpellingsOrChain,
} from "../../utils/permissions/pathVetting.js";
import { isPathAllowed, isOnlyOutsideWorkingFoldersRefusal } from "../../utils/permissions/pathValidation.js";
import {
  resolvedSpellingWalk,
  getFsImplementation,
  walkPermissionCheckPathsAsync,
  entryReachesForeignNetwork,
} from "../../utils/fsOperations.js";
import {
  isDirectoryRefusedByRule,
  isReadRefusedByRule,
  isReadToolRefusedByRule,
  openWithoutLinks,
} from "./remoteDirectoryList.js";
import { repoRootErrorClass } from "../repoRoots/repoRootErrors.js";
import { isDiskless, onProcessRootHost, getPermissionScreenAnchor } from "../../bootstrap/state.js";
import { identity } from "../../utils/pathClassification.js";
import { getCwd } from "../../utils/cwd.js";
import {
  allWorkingDirectories,
  normalizeCaseForComparison_2,
  isWorkingDirPathHeldAsNamed,
  pathInWorkingPath,
  checkReadableInternalPath,
  matchingRuleForInput,
} from "../../utils/permissions/filesystem.js";
import { getPlatform } from "../../utils/platform.js";
import { withDeadline } from "../../utils/sleep.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isDifferentNetworkLocation } from "../../utils/networkPaths.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { bindCanonicalPathToHandle, readHandleBounded } from "../../utils/fsSafety/boundOpen.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { holdsWholeToolReadRule } from "../taskFiles/taskFileUpload.js";
import { logEvent } from "../analytics/index.js";
import { getFileExtensionForAnalytics } from "../analytics/metadata.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aejveeja.js:1381-1400 placement
var MAX_CANDIDATE_PATHS = 512;
var MAX_CANDIDATE_PATH_CHARS = 4096;
//@ chunk-aejveeja.js:1400-1487 placement
function validCandidatePaths(within) {
  return Array.isArray(within) &&
    within.length > 0 &&
    within.length <= MAX_CANDIDATE_PATHS &&
    within.every(isCanonicalAbsolutePath)
    ? within
    : undefined;
}
//@ chunk-aejveeja.js:1487-1583 placement
function isCanonicalAbsolutePath(path) {
  return (
    typeof path === "string" &&
    path.length <= MAX_CANDIDATE_PATH_CHARS &&
    !path.includes("\x00") &&
    isFullyQualifiedPath(path) &&
    normalize(path) === path
  );
}
//@ chunk-aejveeja.js:1583-1713 placement
function isUnderAnyRoot(roots, path) {
  return roots.some((root) => {
    let trimmedRoot = root.endsWith(sep) && parse(root).root !== root ? root.slice(0, -sep.length) : root;
    return path === trimmedRoot || path.startsWith(trimmedRoot + sep);
  });
}
//@ chunk-aejveeja.js:2005-2022 placement
var MAX_AMBIGUOUS_CANDIDATES = 32;
var MAX_WIRE_MESSAGE_CHARS = 4096;
//@ chunk-aejveeja.js:2022-3580 placement
/**
 * 解析远程读取的目标路径
 */
async function resolveRemoteReadPath(
  inputPath,
  { directories, unprobedDirectories = [], gate, heldFiles, filesEndingIn },
) {
  try {
    if (
      inputPath === "" ||
      inputPath !== inputPath.trim() ||
      inputPath.length > MAX_WIRE_MESSAGE_CHARS ||
      inputPath.includes("\x00") ||
      /^~(?:\/|$)/.test(inputPath) ||
      (parse(inputPath).root !== "" && !isFullyQualifiedPath(inputPath))
    )
      return {
        path: null,
        why: "unfit_text",
      };
    let roots = directories.filter((directory) => isFullyQualifiedPath(directory));
    let roots_2 = unprobedDirectories.filter((unprobedDirectory) => isFullyQualifiedPath(unprobedDirectory));
    let candidates = new Set(
      (isAbsolute(inputPath) ? [inputPath] : roots).map((dir) => expandStablePath(inputPath, dir)),
    );
    let resolved = await groupByResolvedPath([...candidates], inputPath, gate);
    if (resolved === null)
      return {
        path: null,
        why: "too_many",
      };
    let held = new Set(heldFiles());
    let resolvedSet = new Set(resolved.flat());
    if (
      [...candidates, ...roots_2.map((dir) => expandStablePath(inputPath, dir))].some(
        (candidate) => held.has(candidate) && !resolvedSet.has(candidate),
      )
    )
      return {
        path: null,
        why: "held_file_unreadable",
      };
    let filtered = resolved.filter((group) => group.some((candidate) => held.has(candidate)));
    if (resolved.length > 0) return pickUniqueFile(filtered.length > 0 ? filtered : resolved, "directories");
    let normalized = normalize(inputPath);
    if (
      roots.length === 0 ||
      isAbsolute(inputPath) ||
      normalized.length !== inputPath.length ||
      normalized.split(sep).some((segment) => ["", ".", ".."].includes(segment))
    )
      return {
        path: null,
        why: "no_file",
      };
    let matches = matchingCandidatePaths(sep + normalized, held, roots);
    let matchSet = new Set(matches);
    if (matchingCandidatePaths(sep + normalized, held, roots_2).some((candidate) => !matchSet.has(candidate)))
      return {
        path: null,
        why: "held_file_unreadable",
      };
    if (matches.length === 0) {
      if (filesEndingIn === undefined)
        return {
          path: null,
          why: "needs_file_search",
        };
      if ([...held].some((heldPath) => heldPath.endsWith(sep + normalized)))
        return {
          path: null,
          why: "held_file_unreadable",
        };
      let held_2 = await filesEndingIn(normalized);
      if (held_2 === null)
        return {
          path: null,
          why: "search_incomplete",
        };
      return held_2.length > MAX_AMBIGUOUS_CANDIDATES
        ? {
            path: null,
            why: "too_many",
          }
        : pickUniqueFile(
            await groupByResolvedPath(
              matchingCandidatePaths(sep + normalized, held_2, roots),
              inputPath,
              gate,
            ),
            "file_search",
          );
    }
    let resolvedMatches = await groupByResolvedPath(matches, inputPath, gate);
    return resolvedMatches !== null && resolvedMatches.flat().length < matches.length
      ? {
          path: null,
          why: "held_file_unreadable",
        }
      : pickUniqueFile(resolvedMatches, "file_state");
  } catch (error) {
    if (error instanceof UnstablePathError)
      return {
        path: null,
        why: "unfit_text",
      };
    try {
      let errnoCode = getErrnoCode(error);
      let errorName = error instanceof Error ? error.name : typeof error;
      logForDebugging(
        `resolveAsWrittenPath failed: ${errnoCode === undefined ? errorName : `${errorName}/${errnoCode}`}`,
        {
          level: "error",
        },
      );
    } catch {}
    return {
      path: null,
      why: "fault",
    };
  }
}
//@ chunk-aejveeja.js:3580-3742 placement
/**
 * 按解析路径分组
 */
async function groupByResolvedPath(candidates, inputPath, gate) {
  if (candidates.length > MAX_AMBIGUOUS_CANDIDATES) return null;
  let groups = new Map();
  for (let candidate of candidates) {
    let resolvedPath = await gate(candidate, inputPath);
    if (resolvedPath !== null) groups.set(resolvedPath, [...(groups.get(resolvedPath) ?? []), candidate]);
  }
  return [...groups.values()];
}
//@ chunk-aejveeja.js:3742-3912 placement
/**
 * 唯一匹配结果
 */
function pickUniqueFile(groups, step) {
  if (groups === null)
    return {
      path: null,
      why: "too_many",
    };
  let first = groups[0]?.[0];
  return first === undefined
    ? {
        path: null,
        why: "no_file",
      }
    : groups.length > 1
      ? {
          path: null,
          why: "tie",
        }
      : {
          path: first,
          step,
        };
}
//@ chunk-aejveeja.js:3912-4042 placement
function matchingCandidatePaths(suffix, held, roots) {
  let matches = new Set();
  for (let heldPath of held)
    if (
      heldPath.endsWith(suffix) &&
      isFullyQualifiedPath(heldPath) &&
      normalize(heldPath) === heldPath &&
      roots.some((root) => isSubpathOf(root, heldPath, false))
    )
      matches.add(heldPath);
  return [...matches];
}
//@ chunk-aejveeja.js:7540-7640 sole-consumer
var MAX_SEARCH_DIRECTORIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_SEARCH_DEPTH;
var MAX_VET_PATH_CHARS;
var WORK_YIELD_EVERY;
var WORK_COST_PER_DIR;
var SKIPPED_DIR_NAMES;
var SEARCH_OPEN_FLAGS;
deferInit("chunk-aejveeja.js:7540", () => {
  MAX_SEARCH_DIRECTORIES = 20000;
  MAX_SEARCH_DEPTH = 64;
  MAX_VET_PATH_CHARS = 1024;
  WORK_YIELD_EVERY = 4096;
  WORK_COST_PER_DIR = 16;
  SKIPPED_DIR_NAMES = new Set([".git", "node_modules"]);
  SEARCH_OPEN_FLAGS = O_NOFOLLOW_ANY | constants.O_NOFOLLOW | READ_LIMITS;
});
//@ chunk-aejveeja.js:7640-7775 sole-consumer
class SearchCutShort extends Error {
  constructor() {
    super("searchFilesEndingIn: its time ran out before the search ended");
    this.name = "SearchCutShort";
  }
}
//@ chunk-aejveeja.js:7775-7839 sole-consumer
function countedCall(searchBudget, readOp) {
  if (searchBudget.isOver()) throw new SearchCutShort();
  return searchBudget.counted(readOp());
}
//@ chunk-aejveeja.js:7839-7933 sole-consumer
async function addWork(searchBudget, cost) {
  searchBudget.work += cost;
  if (searchBudget.work >= WORK_YIELD_EVERY) {
    searchBudget.work = 0;
    await yieldToEventLoop();
    if (searchBudget.isOver()) throw new SearchCutShort();
  }
}
//@ chunk-aejveeja.js:7933-8073 sole-consumer
function isPathRefused(filePath, rules, isDirectory) {
  return (
    filePath.length > MAX_VET_PATH_CHARS ||
    pathVettingReason(filePath, rules.trustedNetworkDirectories) !== undefined ||
    !isPathAllowed(filePath, rules, "read", resolvedSpellingWalk(filePath)).allowed ||
    (isDirectory ? isDirectoryRefusedByRule(filePath, rules) : isReadRefusedByRule(filePath, rules, false))
  );
}
//@ chunk-aejveeja.js:8073-9430 sole-consumer
async function walkDirectory(searchBudget, handle, dirPath, depth) {
  if (searchBudget.directoriesRead.size >= searchBudget.maxDirectories) {
    searchBudget.isWhole = false;
    return false;
  }
  searchBudget.directoriesRead.add(dirPath);
  let fdPath = `/proc/self/fd/${handle.fd}`;
  let dirents = await countedCall(searchBudget, () =>
    readdir(fdPath, {
      withFileTypes: true,
    }),
  ).catch((error) => {
    if (isFsInaccessible(error)) return [];
    throw error;
  });
  let subdirectoryNames = [];
  for (let dirent of dirents) {
    await addWork(searchBudget, 1);
    let { name } = dirent;
    if (["", ".", ".."].includes(name) || /[/\0]/.test(name)) continue;
    if (dirent.isDirectory()) {
      subdirectoryNames.push(name);
      continue;
    }
    let isFile = dirent.isFile();
    if (
      dirent.isFIFO() ||
      dirent.isSocket() ||
      dirent.isBlockDevice() ||
      dirent.isCharacterDevice() ||
      ((isFile || dirent.isSymbolicLink()) && !searchBudget.names.has(name))
    )
      continue;
    await addWork(searchBudget, WORK_COST_PER_DIR);
    let candidatePath = join(dirPath, name);
    if (isPathRefused(candidatePath, searchBudget.rules, !isFile)) continue;
    let entry = dirent;
    if (!isFile && !dirent.isSymbolicLink()) {
      if (name.includes("\uFFFD")) {
        searchBudget.isWhole = false;
        return false;
      }
      try {
        entry = await countedCall(searchBudget, () => lstat(`${fdPath}/${name}`));
      } catch (error) {
        if (isFsInaccessible(error)) continue;
        throw error;
      }
    }
    if (entry.isDirectory()) subdirectoryNames.push(name);
    else if (entry.isFile() && candidatePath.endsWith(searchBudget.suffix)) {
      searchBudget.found.add(candidatePath);
      if (searchBudget.found.size > MAX_AMBIGUOUS_CANDIDATES) return false;
    } else if (
      entry.isSymbolicLink() &&
      searchBudget.leadingRuns.some((leadingRun) => candidatePath.endsWith(leadingRun))
    ) {
      searchBudget.isWhole = false;
      return false;
    }
  }
  dirents.length = 0;
  for (let dirent of subdirectoryNames) {
    await addWork(searchBudget, WORK_COST_PER_DIR);
    let name = join(dirPath, dirent);
    if (
      SKIPPED_DIR_NAMES.has(dirent) ||
      depth >= MAX_SEARCH_DEPTH ||
      searchBudget.directoriesRead.has(name) ||
      isPathRefused(name, searchBudget.rules, true)
    )
      continue;
    if (dirent.includes("\uFFFD")) {
      searchBudget.isWhole = false;
      return false;
    }
    let subPath;
    try {
      subPath = await countedCall(searchBudget, () => open(`${fdPath}/${dirent}`, SEARCH_OPEN_FLAGS));
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") await countedCall(searchBudget, () => lstat(fdPath));
      if (isFsInaccessible(error)) continue;
      throw error;
    }
    await using subHandle = subPath;
    let subStat = await countedCall(searchBudget, () =>
      subHandle.stat({
        bigint: true,
      }),
    );
    if (
      subStat.isDirectory() &&
      subStat.dev === searchBudget.device &&
      !(await walkDirectory(searchBudget, subHandle, name, depth + 1))
    )
      return false;
  }
  return true;
}
//@ chunk-aejveeja.js:9430-10315 sole-consumer
async function searchSuffixUnderRoots(
  suffixPath,
  { roots, rules, counted, isOver, maxDirectories = MAX_SEARCH_DIRECTORIES },
) {
  if (isReadToolRefusedByRule(rules)) return [];
  if (suffixPath.includes("\uFFFD")) return null;
  let parts = suffixPath.split(sep);
  let walk = {
    rules,
    counted,
    isOver,
    maxDirectories,
    suffix: sep + suffixPath,
    leadingRuns: parts.map((segment, index) => sep + parts.slice(0, index + 1).join(sep)),
    names: new Set(parts),
    found: new Set(),
    directoriesRead: new Set(),
    device: 0n,
    isWhole: true,
    work: 0,
  };
  try {
    for (let root of roots) {
      let rootPath = root.replace(/\/+$/, "") || sep;
      if (
        !isFullyQualifiedPath(root) ||
        rootPath !== normalize(rootPath) ||
        walk.directoriesRead.has(rootPath) ||
        isPathRefused(rootPath, rules, true)
      )
        continue;
      let rootHandle;
      try {
        rootHandle = await countedCall(walk, () => openWithoutLinks(rootPath, rootPath));
      } catch (error) {
        let openErrorClass = repoRootErrorClass(error);
        if (
          openErrorClass === "symlink_in_path" ||
          openErrorClass === "path_not_canonical" ||
          (openErrorClass === undefined && isFsInaccessible(error))
        )
          continue;
        throw error;
      }
      await using checkedRootHandle = rootHandle;
      if (
        !(
          await countedCall(walk, () =>
            readlink(`/proc/self/fd/${checkedRootHandle.fd}`, {
              encoding: "buffer",
            }),
          )
        ).equals(Buffer.from(rootPath))
      )
        continue;
      walk.device = (
        await countedCall(walk, () =>
          checkedRootHandle.stat({
            bigint: true,
          }),
        )
      ).dev;
      if (!(await walkDirectory(walk, checkedRootHandle, rootPath, 0))) break;
    }
  } catch (error) {
    if (error instanceof SearchCutShort) return null;
    throw error;
  }
  return walk.isWhole ? [...walk.found] : null;
}
//@ chunk-aejveeja.js:10315-10327 affinity
var SEARCH_DEADLINE_SLACK_MS = 1000;
//@ chunk-aejveeja.js:10327-10640 placement
/**
 * 找 .git 所在目录
 */
async function findGitRootBelow(startDir, cwdState, expired) {
  if (isDiskless()) return null;
  let startPath = resolve(startDir);
  if (cwdState.unresolved || cwdState.landing !== identity(startPath)) return null;
  let fsImplementation = getFsImplementation();
  for (let dir = startPath; !expired(); dir = dirname(dir)) {
    let gitStats = await fsImplementation.lstat(join(dir, ".git")).catch(() => {
      return;
    });
    if (
      gitStats?.isDirectory() === true ||
      gitStats?.isFile() === true ||
      gitStats?.isSymbolicLink() === true
    )
      return identity(dir);
    if (dirname(dir) === dir) return null;
  }
  return null;
}
//@ chunk-aejveeja.js:10640-11699 placement
/**
 * 在时限内搜索文件
 */
async function searchHeldFile(
  filePath,
  { heldFiles, search, timeLimitMs, stranded, whyNotBegin },
  permissions,
  gate,
) {
  if (stranded.probes > 0)
    return {
      path: null,
      why: "stranded",
    };
  let earlyReason = whyNotBegin();
  if (earlyReason !== undefined)
    return {
      path: null,
      why: earlyReason,
    };
  let cwd = getCwd();
  let isAllowedPath = (path) => pathVettingReason(path, permissions.trustedNetworkDirectories) === undefined;
  let deadlineMs = performance.now() + timeLimitMs;
  let timedOut = false;
  let expiredNow = () => timedOut || performance.now() >= deadlineMs;
  let probesInFlight = 0;
  let trackProbe = (promise) => {
    probesInFlight++;
    return promise.finally(() => {
      probesInFlight--;
      stranded.probes -= timedOut ? 1 : 0;
    });
  };
  let timedOutResult = {
    path: null,
    why: "no_file",
  };
  let work = async () => {
    let gitRoot = null;
    if (isAllowedPath(cwd)) {
      let cwdState = await trackProbe(walkPermissionCheckPathsAsync(resolve(cwd)));
      if (expiredNow()) return timedOutResult;
      gitRoot = await trackProbe(findGitRootBelow(cwd, cwdState, expiredNow));
    }
    if (expiredNow()) return timedOutResult;
    let probeNames = [...allWorkingDirectories(permissions)];
    let probeList = normalizeCaseForComparison_2([cwd, gitRoot ?? cwd, ...probeNames]);
    let filtered = probeList.filter(isAllowedPath);
    for (let dir of filtered) {
      if (expiredNow()) return timedOutResult;
      if (dir !== cwd) await trackProbe(walkPermissionCheckPathsAsync(dir));
    }
    if (expiredNow()) return timedOutResult;
    return resolveRemoteReadPath(filePath, {
      directories: filtered,
      unprobedDirectories: probeList.filter((dir) => !isAllowedPath(dir)),
      gate: (candidate, inputPath) =>
        expiredNow() ? Promise.resolve(null) : trackProbe(gate(candidate, inputPath, permissions)),
      heldFiles,
      ...(search?.isOn() === true &&
        getPlatform() === "linux" &&
        !isDiskless() && {
          filesEndingIn: (name) => {
            let min = Math.min(performance.now() + search.limitMs, deadlineMs - SEARCH_DEADLINE_SLACK_MS);
            return searchSuffixUnderRoots(name, {
              roots: probeNames.filter(isAllowedPath),
              rules: permissions,
              counted: trackProbe,
              isOver: () => expiredNow() || performance.now() >= min,
            });
          },
        }),
    });
  };
  try {
    let result = await withDeadline(runInRemoteCallFrameMain(cwd, work), timeLimitMs);
    return result === undefined || expiredNow()
      ? {
          path: null,
          why: "time_limit",
        }
      : result;
  } finally {
    timedOut = true;
    stranded.probes += probesInFlight;
  }
}
//@ chunk-aejveeja.js:11770-11843 layout
function probeCoversPath(probe, suffixPath) {
  return (
    relativeTailInside(probe.spelled, suffixPath) !== undefined ||
    relativeTailInside(probe.resolved, suffixPath) !== undefined
  );
}
//@ chunk-aejveeja.js:11843-11988 layout
function probeRelativePath(probe, suffixPath) {
  let [spelledBase, resolvedBase] =
    relativeTailInside(probe.spelled, suffixPath) !== undefined
      ? [probe.spelled, probe.resolved]
      : [probe.resolved, probe.spelled];
  let relativeTail = relativeTailInside(spelledBase, suffixPath);
  return relativeTail === undefined || spelledBase === resolvedBase
    ? undefined
    : join(resolvedBase, relativeTail);
}
//@ chunk-aejveeja.js:11988-12092 layout
function openPathMatchesProbe(probe, openPath, canonicalPath) {
  let relativeTail = relativeTailInside(probe.resolved, canonicalPath);
  return (
    relativeTail !== undefined &&
    (openPath === join(probe.spelled, relativeTail) || openPath === join(probe.resolved, relativeTail))
  );
}
//@ chunk-aejveeja.js:12092-12214 layout
function relativeTailInside(base, target) {
  let rel = relative(base, target);
  let parts = rel.split(sep);
  return parts.length >= 2 &&
    !isAbsolute(rel) &&
    parts.every((segment) => segment !== "" && !segment.startsWith("."))
    ? rel
    : undefined;
}
//@ chunk-aejveeja.js:12214-12359 placement
/**
 * 远程读文件的上限与常量：最大字符数、打开标志、文件系统操作、最大字节数和用户数据根目录缓存。
 */
var REMOTE_READ_MAX_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REMOTE_READ_OPEN_FLAGS;
var realFsOps;
var REMOTE_READ_MAX_BYTES;
var userDataRootsCache;
deferInit("chunk-aejveeja.js:12214", () => {
  REMOTE_READ_MAX_CHARS = 1e6;
  REMOTE_READ_OPEN_FLAGS =
    constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | (constants.O_NOCTTY ?? 0) | READ_LIMITS;
  realFsOps = {
    realpath,
    lstat,
    readlink,
  };
  REMOTE_READ_MAX_BYTES = 1e7;
  userDataRootsCache = new HostScoped(() => ({
    promise: undefined,
  }));
});
//@ chunk-aejveeja.js:12359-12592 placement
/**
 * 加载用户数据根目录
 */
function loadUserDataRoots() {
  let cache = onProcessRootHost(userDataRootsCache);
  cache.promise ??= Promise.all([
    import("../../utils/stageFileRoots.js"),
    import("../syncedFiles/syncedFileSyncer.js"),
  ])
    .then(([fixed, synced]) => [...fixed.FIXED_USER_DATA_ROOTS, synced.SYNCED_FILE_ROOT])
    .catch((error) => {
      cache.promise = undefined;
      throw error;
    });
  return cache.promise;
}
//@ chunk-aejveeja.js:12592-12695 placement
function isInAnyGroup(dir, trustedNetworkDirectories) {
  if (!trustedNetworkDirectories || trustedNetworkDirectories.size === 0) return false;
  for (let group of trustedNetworkDirectories.values()) if (group.includes(dir)) return true;
  return false;
}
//@ chunk-aejveeja.js:12695-13171 placement
async function isCanonicalPathContained(canonicalPath, permissions) {
  let userDataRoots = [];
  try {
    userDataRoots = await loadUserDataRoots();
  } catch {}
  for (let dir of allWorkingDirectories(permissions)) {
    if (
      permissions.additionalWorkingDirectories.has(dir) &&
      !isInAnyGroup(dir, permissions.trustedNetworkDirectories) &&
      (await entryReachesForeignNetwork(dir, getPermissionScreenAnchor()))
    )
      continue;
    let realDir;
    try {
      realDir = isWorkingDirPathHeldAsNamed(dir) ? dir : await realpath(dir);
    } catch {
      continue;
    }
    if (isDifferentNetworkLocation(dir, realDir, getPermissionScreenAnchor())) continue;
    if (
      pathInWorkingPath(canonicalPath, realDir, {
        caseFold: false,
        skipPrivateAlias: true,
        uncShapeParity: true,
      })
    )
      return true;
  }
  for (let root of userDataRoots)
    if (
      pathInWorkingPath(canonicalPath, root, {
        caseFold: false,
        skipPrivateAlias: true,
        uncShapeParity: true,
      })
    )
      return true;
  return (
    checkReadableInternalPath(canonicalPath, {}, [canonicalPath], {
      remoteSurface: true,
    }).behavior === "allow"
  );
}
//@ chunk-aejveeja.js:13171-14722 placement
/**
 * 远程读取拒绝的遥测文案
 */
var REMOTE_READ_REFUSAL_MESSAGES = {
  nt_namespace: "read_file: NT-namespace path rejected before filesystem access",
  untrusted_unc: "read_file: untrusted UNC path rejected before filesystem access",
  untrusted_automount: "read_file: automount path rejected before filesystem access",
  unvettable_chain: "read_file: unvettable path ancestry rejected before filesystem access",
  link_text_climbs:
    'read_file: path through a symlink whose target has ".." past its leading "../" segments rejected',
  suspicious_windows_spelling_nt_device_namespace:
    "read_file: suspicious Windows path spelling rejected (NT device namespace)",
  suspicious_windows_spelling_colon_past_drive_position:
    "read_file: suspicious Windows path spelling rejected (colon past the drive-letter position)",
  suspicious_windows_spelling_tilde_digit:
    "read_file: suspicious Windows path spelling rejected (tilde followed by a digit)",
  suspicious_windows_spelling_device_path_prefix:
    "read_file: suspicious Windows path spelling rejected (device-path prefix)",
  suspicious_windows_spelling_trailing_dot_or_whitespace:
    "read_file: suspicious Windows path spelling rejected (trailing dot or whitespace in a segment)",
  suspicious_windows_spelling_dos_device_suffix:
    "read_file: suspicious Windows path spelling rejected (DOS device-name suffix)",
  suspicious_windows_spelling_dot_run_segment:
    "read_file: suspicious Windows path spelling rejected (dot-run segment)",
  suspicious_windows_spelling_unc_or_webdav_form:
    "read_file: suspicious Windows path spelling rejected (UNC-like form: doubled or mixed separators, embedded NT root, or WebDAV marker)",
};
//@ chunk-aejveeja.js:14722-14800 placement
function remoteReadDenied(reason, telemetryMessage = "remote read denied") {
  return new WireSafeControlError(`read denied: ${sanitizeTelemetryString(reason)}`, telemetryMessage);
}
//@ chunk-aejveeja.js:14800-14898 placement
/**
 * 远端读取的两种否定结果：路径被拒（refused）与身份无法确认（unsettled）。
 */
var REMOTE_READ_REFUSED = {
  refused: true,
  telemetryMessage: undefined,
  unsettled: false,
  openFailure: undefined,
};
var REMOTE_READ_UNSETTLED = {
  ...REMOTE_READ_REFUSED,
  unsettled: true,
};
//@ chunk-aejveeja.js:14898-15681 placement
/**
 * 检查并打开路径
 */
async function openVettedPath(path, openPath, permissions, fsImpl, withHandle, asyncVet, expectedProbe) {
  let vetting = asyncVet
    ? await vetPathSpellingsOrChainAsync(path, openPath, permissions.trustedNetworkDirectories)
    : vetPathSpellingsOrChain(path, openPath, permissions.trustedNetworkDirectories);
  if (!vetting.ok) {
    let reasonKey =
      vetting.reason === "suspicious_windows_spelling"
        ? `suspicious_windows_spelling_${vetting.spelling}`
        : vetting.reason;
    return {
      ...REMOTE_READ_REFUSED,
      telemetryMessage: REMOTE_READ_REFUSAL_MESSAGES[reasonKey],
    };
  }
  for (let checkedPath of vetting.pathsToCheck)
    if (isPathStillRefused(checkedPath, permissions, expectedProbe)) return REMOTE_READ_REFUSED;
  let handle;
  try {
    handle = await open(openPath, REMOTE_READ_OPEN_FLAGS);
  } catch (error) {
    return {
      ...REMOTE_READ_REFUSED,
      openFailure: {
        error,
      },
    };
  }
  try {
    let expectedIdentity = await handle.stat({
      bigint: true,
    });
    if (!expectedIdentity.isFile()) return REMOTE_READ_REFUSED;
    let canonicalPath;
    try {
      canonicalPath = await fsImpl.realpath(openPath);
    } catch {
      return REMOTE_READ_UNSETTLED;
    }
    let boundPath = await bindCanonicalPathToHandle(handle, expectedIdentity, canonicalPath, fsImpl);
    if (boundPath === undefined) return REMOTE_READ_UNSETTLED;
    canonicalPath = boundPath;
    if (isPathStillRefused(canonicalPath, permissions, expectedProbe)) return REMOTE_READ_REFUSED;
    if (pathVettingReason(canonicalPath, permissions.trustedNetworkDirectories) !== undefined)
      return REMOTE_READ_REFUSED;
    if (
      expectedProbe !== undefined && probeCoversPath(expectedProbe, openPath)
        ? !openPathMatchesProbe(expectedProbe, openPath, canonicalPath)
        : !(await isCanonicalPathContained(canonicalPath, permissions))
    )
      return REMOTE_READ_REFUSED;
    return {
      refused: false,
      value: await withHandle({
        handle,
        openedStat: expectedIdentity,
        canonicalPath,
      }),
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-aejveeja.js:15681-15938 layout
function isPathStillRefused(checkedPath, permissions, inputPath) {
  let result = isPathAllowed(checkedPath, permissions, "read");
  let allowed =
    result.allowed ||
    (inputPath !== undefined &&
      permissions.restricted !== true &&
      permissions.blockReadsOutsideWorkingDirectories !== true &&
      isOnlyOutsideWorkingFoldersRefusal(result) &&
      probeCoversPath(inputPath, checkedPath));
  let relativeTail = inputPath && probeRelativePath(inputPath, checkedPath);
  return (
    !allowed ||
    matchingRuleForInput(checkedPath, permissions, "read", "ask") !== null ||
    (relativeTail !== undefined &&
      ["deny", "ask"].some(
        (ruleKind) => matchingRuleForInput(relativeTail, permissions, "read", ruleKind) !== null,
      ))
  );
}
//@ chunk-aejveeja.js:15938-15983 placement
function enumOrUndefined(value) {
  return value === undefined ? undefined : fromEnum(value);
}
//@ chunk-aejveeja.js:15983-17942 placement
/**
 * 为远端读取本机文件：解析路径、拒绝可疑 Windows 路径与不受信 UNC、限时搜索。
 */
async function readFileForRemote(
  inputPath,
  maxBytes,
  permissions,
  {
    encoding = "utf-8",
    anchor,
    telemetrySource,
    containmentFs = realFsOps,
    asWrittenSources,
    syncedSkillsFolder,
  } = {},
) {
  let min = Math.min(maxBytes && maxBytes > 0 ? maxBytes : REMOTE_READ_MAX_CHARS, REMOTE_READ_MAX_BYTES);
  let isAsWritten = anchor?.kind === "as_written";
  let lookupStep = isAsWritten ? "not_served" : undefined;
  let servedFromSyncedSkills = false;
  try {
    let anchored =
      anchor === undefined || isAsWritten
        ? undefined
        : await (await import("../../utils/anchoredReadPath.js")).resolveAnchoredReadPath(inputPath, anchor);
    if (anchored === null) throw remoteReadDenied(inputPath);
    let throwIfNotServed = () => {
      let reason = asWrittenSources?.whyNotServed();
      if (reason !== undefined) {
        lookupStep = reason;
        throw remoteReadDenied(inputPath);
      }
    };
    let foundPath;
    if (isAsWritten) {
      if (asWrittenSources === undefined) throw remoteReadDenied(inputPath);
      throwIfNotServed();
      let withinPaths = validCandidatePaths(anchor.within);
      if (withinPaths === undefined) {
        lookupStep = "unfit_within";
        throw remoteReadDenied(inputPath);
      }
      lookupStep = "fault";
      let found = await searchHeldFile(
        inputPath,
        asWrittenSources,
        typeof permissions === "function" ? permissions() : permissions,
        (candidate, inputPath, permissions) =>
          resolveCanonicalReadPath(candidate, inputPath, permissions, containmentFs),
      );
      lookupStep = found.path === null ? found.why : found.step;
      if (found.path === null) throw remoteReadDenied(inputPath);
      if (!isUnderAnyRoot(withinPaths, found.path)) {
        lookupStep = "outside";
        throw remoteReadDenied(inputPath);
      }
      foundPath = found.path;
    }
    let permissionsNow = typeof permissions === "function" ? permissions() : permissions;
    let openTargetPath = anchored?.absPath ?? foundPath ?? expandPath(inputPath);
    let syncedSkillsPath = anchor === undefined ? syncedSkillsFolder?.() : undefined;
    let anchorPath =
      syncedSkillsPath !== undefined && holdsWholeToolReadRule(permissionsNow) ? undefined : syncedSkillsPath;
    servedFromSyncedSkills = anchorPath !== undefined && probeCoversPath(anchorPath, openTargetPath);
    let vettedPath = await openVettedPath(
      inputPath,
      openTargetPath,
      permissionsNow,
      containmentFs,
      ({ handle, openedStat }) => readHandleBounded(handle, min, openedStat.size),
      isAsWritten,
      anchorPath,
    );
    if (vettedPath.refused)
      throw vettedPath.openFailure === undefined
        ? remoteReadDenied(inputPath, vettedPath.telemetryMessage)
        : vettedPath.openFailure.error;
    let { bytes, overLimit } = vettedPath.value;
    if (foundPath !== undefined) throwIfNotServed();
    if (servedFromSyncedSkills && syncedSkillsFolder?.() === undefined) throw remoteReadDenied(inputPath);
    if (telemetrySource)
      logEvent("tengu_bridge_read_file_served", {
        success: true,
        source: fromEnum(telemetrySource),
        size_bytes: bytes.length,
        requested_max_bytes: min,
        truncated: overLimit,
        ext: getFileExtensionForAnalytics(openTargetPath),
        as_written_lookup: enumOrUndefined(lookupStep),
      });
    if (servedFromSyncedSkills) logFeatureOk("remote_read_synced_skills");
    return {
      contents: bytes.toString(encoding === "base64" ? "base64" : "utf-8"),
      absPath: openTargetPath,
      ...(overLimit && {
        truncated: overLimit,
      }),
      ...(encoding === "base64"
        ? {
            encoding,
          }
        : {
            lossy: !isUtf8(bytes),
          }),
      ...(anchored !== undefined && {
        anchor: anchored.kind,
      }),
      ...(foundPath !== undefined && {
        anchor: "as_written",
      }),
    };
  } catch (error) {
    try {
      let errorKind =
        error instanceof Error
          ? "code" in error && typeof error.code === "string"
            ? `${error.name}/${error.code}`
            : error.name
          : typeof error;
      logForDebugging(
        `readFileForRemote failed pre-deny: ${errorKind}${lookupStep === undefined ? "" : `, as_written look-up: ${lookupStep}`}`,
        {
          level: "error",
        },
      );
    } catch {}
    try {
      if (telemetrySource)
        logEvent("tengu_bridge_read_file_served", {
          success: false,
          source: fromEnum(telemetrySource),
          as_written_lookup: enumOrUndefined(lookupStep),
        });
      if (servedFromSyncedSkills) logFeatureSad("remote_read_synced_skills", "not_served");
    } catch {}
    try {
      if (lookupStep !== undefined) asWrittenSources?.onRefusal(lookupStep);
    } catch {}
    if (
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      error.message.startsWith("read denied: ")
    )
      throw error;
    throw remoteReadDenied(inputPath);
  }
}
//@ chunk-aejveeja.js:17942-18088 placement
class UnsettledRemoteFileError extends Error {
  constructor() {
    super("probeFileForRemote: cannot tell whether the path names a file");
    this.name = "UnsettledRemoteFileError";
  }
}
//@ chunk-aejveeja.js:18088-18440 placement
/**
 * 解析规范读取路径
 */
async function resolveCanonicalReadPath(candidatePath, inputPath, permissions, fsOps = realFsOps) {
  if (!isFullyQualifiedPath(candidatePath) || normalize(candidatePath) !== candidatePath) return null;
  let vettedPath = await openVettedPath(
    inputPath,
    candidatePath,
    permissions,
    fsOps,
    ({ canonicalPath }) => Promise.resolve(canonicalPath),
    true,
    undefined,
  );
  if (!vettedPath.refused) return vettedPath.value;
  if (vettedPath.openFailure !== undefined) {
    let { error } = vettedPath.openFailure;
    if (
      isFsInaccessible(error) ||
      ["EISDIR", "ENXIO", "ENOTSUP", "EOPNOTSUPP"].includes(getErrnoCode(error) ?? "")
    )
      return null;
    throw error;
  }
  if (vettedPath.unsettled) throw new UnsettledRemoteFileError();
  return null;
}
export { readFileForRemote, REMOTE_READ_OPEN_FLAGS, isCanonicalPathContained, REMOTE_READ_MAX_BYTES };
