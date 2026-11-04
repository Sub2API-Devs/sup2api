/**
 * services/remoteTools/remoteFileRead.ts
 *
 * 2.1.316 新增。为远端读取本机文件：解析路径、拒绝可疑 Windows 路径与不受信 UNC、限时搜索。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-es7wzebn.js (23)
 * attribution: placement 23
 */
import { normalize, sep, parse, isAbsolute, resolve, dirname, join } from "path";
import { constants } from "fs";
import { realpath, lstat, readlink, open } from "fs/promises";
import { isFullyQualifiedPath, expandStablePath, UnstablePathError, expandPath } from "../../utils/path.js";
import {
  getErrnoCode,
  WireSafeControlError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessible,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { isSubpathOf } from "../../utils/pathPrefix.js";
import { isDiskless, onProcessRootHost, getPermissionScreenAnchor } from "../../bootstrap/state.js";
import { identity } from "../../utils/pathClassification.js";
import {
  getFsImplementation,
  walkPermissionCheckPathsAsync,
  entryReachesForeignNetwork,
} from "../../utils/fsOperations.js";
import { getCwd } from "../../utils/cwd.js";
import {
  pathVettingReason,
  vetPathSpellingsOrChainAsync,
  vetPathSpellingsOrChain,
} from "../../utils/permissions/pathVetting.js";
import { uniq } from "../../utils/collections.js";
import {
  allWorkingDirectories,
  isWorkingDirPathHeldAsNamed,
  pathInWorkingPath,
  checkReadableInternalPath,
  matchingRuleForInput,
} from "../../utils/permissions/filesystem.js";
import { withDeadline } from "../../utils/sleep.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isDifferentNetworkLocation } from "../../utils/networkPaths.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isPathAllowed } from "../../utils/permissions/pathValidation.js";
import { bindCanonicalPathToHandle, readHandleBounded } from "../../utils/fsSafety/boundOpen.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logEvent } from "../analytics/index.js";
import { getFileExtensionForAnalytics } from "../analytics/metadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-es7wzebn.js:1096-1115 placement
var MAX_CANDIDATE_PATHS = 512;
var MAX_CANDIDATE_PATH_CHARS = 4096;
//@ chunk-es7wzebn.js:1115-1201 placement
function validCandidatePaths(within) {
  return Array.isArray(within) &&
    within.length > 0 &&
    within.length <= MAX_CANDIDATE_PATHS &&
    within.every(isCanonicalAbsolutePath)
    ? within
    : undefined;
}
//@ chunk-es7wzebn.js:1201-1297 placement
function isCanonicalAbsolutePath(path) {
  return (
    typeof path === "string" &&
    path.length <= MAX_CANDIDATE_PATH_CHARS &&
    !path.includes("\x00") &&
    isFullyQualifiedPath(path) &&
    normalize(path) === path
  );
}
//@ chunk-es7wzebn.js:1297-1426 placement
function isUnderAnyRoot(roots, path) {
  return roots.some((root) => {
    let trimmedRoot = root.endsWith(sep) && parse(root).root !== root ? root.slice(0, -sep.length) : root;
    return path === trimmedRoot || path.startsWith(trimmedRoot + sep);
  });
}
//@ chunk-es7wzebn.js:1551-1569 placement
var MAX_AMBIGUOUS_CANDIDATES = 32;
var MAX_WIRE_MESSAGE_CHARS = 4096;
//@ chunk-es7wzebn.js:1569-2853 placement
/**
 * 解析远程读取的目标路径
 */
async function resolveRemoteReadPath(inputPath, { directories, unprobedDirectories = [], gate, heldFiles }) {
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
    if (matches.length === 0)
      return {
        path: null,
        why: "needs_file_search",
      };
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
//@ chunk-es7wzebn.js:2853-3016 placement
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
//@ chunk-es7wzebn.js:3016-3186 placement
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
//@ chunk-es7wzebn.js:3186-3315 placement
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
//@ chunk-es7wzebn.js:3315-3625 placement
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
//@ chunk-es7wzebn.js:3625-4457 placement
/**
 * 在时限内搜索文件
 */
async function searchHeldFile(
  filePath,
  { heldFiles, timeLimitMs, stranded, whyNotBegin },
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
    let allDirs = uniq([cwd, gitRoot ?? cwd, ...allWorkingDirectories(permissions)]);
    let filtered = allDirs.filter(isAllowedPath);
    for (let dir of filtered) {
      if (expiredNow()) return timedOutResult;
      if (dir !== cwd) await trackProbe(walkPermissionCheckPathsAsync(dir));
    }
    if (expiredNow()) return timedOutResult;
    return resolveRemoteReadPath(filePath, {
      directories: filtered,
      unprobedDirectories: allDirs.filter((dir) => !isAllowedPath(dir)),
      gate: (candidate, inputPath) =>
        expiredNow() ? Promise.resolve(null) : trackProbe(gate(candidate, inputPath, permissions)),
      heldFiles,
    });
  };
  try {
    let result = await withDeadline(work(), timeLimitMs);
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
//@ chunk-es7wzebn.js:4457-4597 placement
/**
 * 远程读文件的上限与常量：最大字符数、打开标志、文件系统操作、最大字节数和用户数据根目录缓存。
 */
var REMOTE_READ_MAX_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REMOTE_READ_OPEN_FLAGS;
var realFsOps;
var REMOTE_READ_MAX_BYTES;
var userDataRootsCache;
deferInit("chunk-es7wzebn.js:4457", () => {
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
//@ chunk-es7wzebn.js:4597-4830 placement
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
//@ chunk-es7wzebn.js:4830-4933 placement
function isInAnyGroup(dir, trustedNetworkDirectories) {
  if (!trustedNetworkDirectories || trustedNetworkDirectories.size === 0) return false;
  for (let group of trustedNetworkDirectories.values()) if (group.includes(dir)) return true;
  return false;
}
//@ chunk-es7wzebn.js:4933-5406 placement
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
//@ chunk-es7wzebn.js:5406-6957 placement
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
//@ chunk-es7wzebn.js:6957-7035 placement
function remoteReadDenied(reason, telemetryMessage = "remote read denied") {
  return new WireSafeControlError(`read denied: ${sanitizeTelemetryString(reason)}`, telemetryMessage);
}
//@ chunk-es7wzebn.js:7035-7132 placement
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
//@ chunk-es7wzebn.js:7132-7966 placement
/**
 * 检查并打开路径
 */
async function openVettedPath(path, openPath, permissions, fsImpl, withHandle, asyncVet) {
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
    if (
      !isPathAllowed(checkedPath, permissions, "read").allowed ||
      matchingRuleForInput(checkedPath, permissions, "read", "ask") !== null
    )
      return REMOTE_READ_REFUSED;
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
    if (
      !isPathAllowed(canonicalPath, permissions, "read").allowed ||
      matchingRuleForInput(canonicalPath, permissions, "read", "ask") !== null
    )
      return REMOTE_READ_REFUSED;
    if (pathVettingReason(canonicalPath, permissions.trustedNetworkDirectories) !== undefined)
      return REMOTE_READ_REFUSED;
    if (!(await isCanonicalPathContained(canonicalPath, permissions))) return REMOTE_READ_REFUSED;
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
//@ chunk-es7wzebn.js:7966-8010 placement
function enumOrUndefined(value) {
  return value === undefined ? undefined : fromEnum(value);
}
//@ chunk-es7wzebn.js:8010-9717 placement
/**
 * 为远端读取本机文件：解析路径、拒绝可疑 Windows 路径与不受信 UNC、限时搜索。
 */
async function readFileForRemote(
  inputPath,
  maxBytes,
  permissions,
  { encoding = "utf-8", anchor, telemetrySource, containmentFs = realFsOps, asWrittenSources } = {},
) {
  let min = Math.min(maxBytes && maxBytes > 0 ? maxBytes : REMOTE_READ_MAX_CHARS, REMOTE_READ_MAX_BYTES);
  let isAsWritten = anchor?.kind === "as_written";
  let lookupStep = isAsWritten ? "not_served" : undefined;
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
    let vettedPath = await openVettedPath(
      inputPath,
      openTargetPath,
      permissionsNow,
      containmentFs,
      ({ handle, openedStat }) => readHandleBounded(handle, min, openedStat.size),
      isAsWritten,
    );
    if (vettedPath.refused)
      throw vettedPath.openFailure === undefined
        ? remoteReadDenied(inputPath, vettedPath.telemetryMessage)
        : vettedPath.openFailure.error;
    let { bytes, overLimit } = vettedPath.value;
    if (foundPath !== undefined) throwIfNotServed();
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
    return {
      contents: bytes.toString(encoding === "base64" ? "base64" : "utf-8"),
      absPath: openTargetPath,
      ...(overLimit && {
        truncated: overLimit,
      }),
      ...(encoding === "base64" && {
        encoding,
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
//@ chunk-es7wzebn.js:9717-9862 placement
class UnsettledRemoteFileError extends Error {
  constructor() {
    super("probeFileForRemote: cannot tell whether the path names a file");
    this.name = "UnsettledRemoteFileError";
  }
}
//@ chunk-es7wzebn.js:9862-10204 placement
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
export { REMOTE_READ_MAX_BYTES, readFileForRemote, REMOTE_READ_OPEN_FLAGS, isCanonicalPathContained };
