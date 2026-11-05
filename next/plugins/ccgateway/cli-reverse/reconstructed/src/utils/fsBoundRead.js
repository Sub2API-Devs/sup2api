/**
 * utils/fsBoundRead.ts
 *
 * 2.1.316 新增：路径边界内的安全文件读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n44f9pt7.js (1), chunk-p126a53v.js (30)
 * attribution: placement 31
 */
import { constants, statSync, fstatSync, closeSync, lstatSync, openSync, readSync, readlinkSync } from "fs";
import { dirname, resolve } from "path";
import { open } from "fs/promises";
import { normalizeHost, isGithubDotCom, GITHUB_HOST, hasBackslashInUrlAuthority } from "./git/githubUrl.js";
import { decodePercentRuns, parseUrlScheme } from "./redaction/urlParsing.js";
import { tryParseUrl } from "./resultError.js";
import { identity } from "./identity.js";
import { getErrnoCode } from "./errors.js";
import { isUncOrDevicePath as isUncOrDevicePath_2 } from "./pathClassification.js";
import { isWslUncPath, isNetworkMountPath, isNonWslUncPath } from "./networkPaths.js";
import { isWindowsDevicePath } from "./windowsUncPaths.js";
import {
  getFsImplementation,
  findIntermediateUncJunction,
  vouchedLaunchAncestry,
  safeResolvePath,
} from "./fsOperations.js";
import { assertReadableFile, decodeTextBuffer, assertWithinMaxBytes } from "./fileRead.js";
import { logForDebugging } from "./debug.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-n44f9pt7.js:2849-2900 placement
/**
 * 边界读取使用的打开标志常量（含 O_NOFOLLOW 等）与配套上限。
 */
var READ_LIMITS = 524288;
var O_NOFOLLOW_FLAG = 0;
var O_NOFOLLOW_ANY = 2097152;
var O_NOATIME_FLAG = constants.O_NOATIME ?? 0;
//@ chunk-p126a53v.js:712-758 placement
function normalizeGitHost(host) {
  let normalizedHost = normalizeHost(host);
  return isGithubDotCom(normalizedHost) ? GITHUB_HOST : normalizedHost;
}
//@ chunk-p126a53v.js:758-885 placement
function hasEncodedPathChars(text) {
  let decodedText = decodePercentRuns(text);
  return (
    decodedText.includes("\\") ||
    /%[0-9A-Fa-f]{2}/.test(decodedText) ||
    decodedText.split(/[/?#]/).some((segment) => segment === "." || segment === "..")
  );
}
//@ chunk-p126a53v.js:885-1062 placement
function nonHttpsScheme(text) {
  let trimmedText = text.trimStart();
  let match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(trimmedText);
  if (match === null || /^https?$/i.test(match[1] ?? "")) return tryParseUrl(trimmedText);
  return tryParseUrl(match[0] + decodePercentRuns(trimmedText.slice(match[0].length)));
}
//@ chunk-p126a53v.js:1062-1358 placement
function isSuspiciousUrl(url) {
  if (url.includes("%00") || url.includes("\x00")) return true;
  if (hasBackslashInUrlAuthority(url)) return true;
  let hosts = [
    parseUrlScheme(url)?.host,
    parseUrlScheme(url, {
      asRewritten: true,
    })?.host,
  ];
  if (url.includes("://"))
    hosts.push(
      tryParseUrl(url.trimStart())?.hostname || undefined,
      nonHttpsScheme(url)?.hostname || undefined,
    );
  let mapped = hosts.map((host) => (host === undefined ? null : normalizeGitHost(host)));
  return mapped.some((host) => host !== mapped[0]);
}
//@ chunk-p126a53v.js:1573-1726 placement
var MAX_BOUND_READ_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var boundReadProbeState;
var LOCAL_VOLUME_ROOTS;
deferInit("chunk-p126a53v.js:1573", () => {
  MAX_BOUND_READ_BYTES = 536870912;
  boundReadProbeState = identity(
    {
      noFollowAny: "untried",
      localVolumes: undefined,
    },
    (state) => {
      state.noFollowAny = "untried";
      state.localVolumes = undefined;
    },
  );
  LOCAL_VOLUME_ROOTS = ["/", "/System/Volumes/Data"];
});
//@ chunk-p126a53v.js:1726-1926 placement
function getLocalVolumeDevices() {
  if (boundReadProbeState.localVolumes !== undefined) return boundReadProbeState.localVolumes;
  let allRootsFound = true;
  let flattened = LOCAL_VOLUME_ROOTS.flatMap((rootPath) => {
    try {
      return [statSync(rootPath).dev];
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") allRootsFound = false;
      return [];
    }
  });
  let devices = new Set(flattened);
  if (allRootsFound) boundReadProbeState.localVolumes = devices;
  return devices;
}
//@ chunk-p126a53v.js:1926-2198 placement
function linkStateOf(filePath) {
  if (probeNoFollowAny_2() === "rejected") return "unsupported";
  let dirFd;
  try {
    dirFd = openDirNoFollow(dirname(filePath));
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP") return "link";
    if (errnoCode === "EINVAL") return "elsewhere";
    if (errnoCode === "EACCES" || errnoCode === "EPERM") return resolvedElsewhere(dirname(filePath));
    throw error;
  }
  try {
    return getLocalVolumeDevices().has(fstatSync(dirFd).dev) ? "local" : "elsewhere";
  } finally {
    closeSync(dirFd);
  }
}
//@ chunk-p126a53v.js:2198-2533 placement
function resolvedElsewhere(filePath) {
  let localVolumeDevices = getLocalVolumeDevices();
  let parentPath = dirname(filePath);
  if (parentPath === filePath) return "elsewhere";
  let dirFd;
  try {
    dirFd = openDirNoFollow(parentPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP") return "link";
    if (errnoCode === "EACCES" || errnoCode === "EPERM") {
      let parentState = resolvedElsewhere(parentPath);
      return parentState === "local" && !localVolumeDevices.has(deviceIdOrNaN(filePath))
        ? "elsewhere"
        : parentState;
    }
    if (errnoCode === "EINVAL") return "elsewhere";
    throw error;
  }
  try {
    let dev = fstatSync(dirFd).dev;
    return localVolumeDevices.has(dev) && localVolumeDevices.has(deviceIdOrNaN(filePath))
      ? "local"
      : "elsewhere";
  } finally {
    closeSync(dirFd);
  }
}
//@ chunk-p126a53v.js:2533-2592 placement
function deviceIdOrNaN(filePath) {
  try {
    return lstatSync(filePath).dev;
  } catch {
    return Number.NaN;
  }
}
//@ chunk-p126a53v.js:2592-2663 placement
function openDirNoFollow(dirPath) {
  return openSync(
    dirPath,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NONBLOCK | MAX_BOUND_READ_BYTES | READ_LIMITS,
  );
}
//@ chunk-p126a53v.js:2663-2904 placement
async function probeNoFollowAny() {
  if (boundReadProbeState.noFollowAny === "untried")
    try {
      await (
        await open(
          "/",
          constants.O_RDONLY |
            constants.O_DIRECTORY |
            constants.O_NONBLOCK |
            MAX_BOUND_READ_BYTES |
            READ_LIMITS,
        )
      ).close();
      boundReadProbeState.noFollowAny = "works";
    } catch (error) {
      boundReadProbeState.noFollowAny = getErrnoCode(error) === "EINVAL" ? "rejected" : "works";
    }
  return boundReadProbeState.noFollowAny === "rejected";
}
//@ chunk-p126a53v.js:2904-3094 placement
function probeNoFollowAny_2() {
  if (boundReadProbeState.noFollowAny === "untried")
    try {
      closeSync(openDirNoFollow("/"));
      boundReadProbeState.noFollowAny = "works";
    } catch (error) {
      boundReadProbeState.noFollowAny = getErrnoCode(error) === "EINVAL" ? "rejected" : "works";
    }
  return boundReadProbeState.noFollowAny === "rejected" ? "rejected" : "works";
}
//@ chunk-p126a53v.js:3094-3155 placement
function isUncOrDevicePath(filePath, platform) {
  return (
    (platform === "windows" && isUncOrDevicePath_2(filePath) && !isWslUncPath(filePath)) ||
    isNetworkMountPath(filePath)
  );
}
//@ chunk-p126a53v.js:3155-3191 placement
function isSpecialPath(resolvedPath) {
  return isWindowsDevicePath(resolvedPath) || isNetworkMountPath(resolvedPath);
}
//@ chunk-p126a53v.js:3191-3332 placement
function isLocalNonUncPath(filePath) {
  let fsImplementation = getFsImplementation();
  return (
    !isNonWslUncPath(filePath) &&
    !isNetworkMountPath(filePath) &&
    findIntermediateUncJunction(fsImplementation, filePath, {
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: true,
      launchAncestry: vouchedLaunchAncestry(fsImplementation),
    }) === undefined
  );
}
//@ chunk-p126a53v.js:3332-3360 placement (2.1.88 match: chordToDisplayString, 1)
function getPlatform() {
  return "linux";
}
//@ chunk-p126a53v.js:3360-3373 placement
var READ_CHUNK_BYTES = 65536;
//@ chunk-p126a53v.js:3373-3866 placement
/**
 * 在路径边界内安全打开文件读取（非阻塞、不跟随链接、平台差异处理）。
 */
function openBoundRead(filePath, isCanonical, maxBytes, isSymlink, identity) {
  let platform = getPlatform();
  let openFlags =
    READ_LIMITS |
    (platform === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOCTTY);
  let fd =
    !isCanonical && isUncOrDevicePath(filePath, platform)
      ? macLinkProblem(filePath, openFlags, platform, maxBytes)
      : routeProblem(filePath, isCanonical, isSymlink, openFlags, platform, maxBytes);
  if (fd === null) return null;
  try {
    if (identity === undefined) assertReadableFile(fstatSync(fd), filePath, maxBytes);
    else {
      let currentStats = fstatSync(fd, {
        bigint: true,
      });
      if (
        currentStats.ino !== identity.ino ||
        currentStats.ctimeNs !== identity.ctimeNs ||
        (platform !== "windows" && currentStats.dev !== identity.dev)
      )
        return logBoundReadRefusal(filePath, "the file was replaced or changed after its path was checked");
      assertReadableFile(
        {
          isDirectory: () => currentStats.isDirectory(),
          isFile: () => currentStats.isFile(),
          size: Number(currentStats.size),
        },
        filePath,
        maxBytes,
      );
    }
    return decodeTextBuffer(readBoundedFromFd(fd, filePath, maxBytes));
  } finally {
    closeSync(fd);
  }
}
//@ chunk-p126a53v.js:3866-4058 placement
function readBoundedFromFd(fd, path, maxBytes) {
  let chunks = [];
  let totalRead = 0;
  while (totalRead <= maxBytes) {
    let chunkBuffer = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, maxBytes + 1 - totalRead));
    let bytesRead = readSync(fd, chunkBuffer, 0, chunkBuffer.length, totalRead);
    if (bytesRead === 0) break;
    chunks.push(chunkBuffer.subarray(0, bytesRead));
    totalRead += bytesRead;
  }
  assertWithinMaxBytes(totalRead, path, maxBytes);
  return Buffer.concat(chunks, totalRead);
}
//@ chunk-p126a53v.js:4058-4224 placement
/**
 * 以不跟随符号链接的方式打开文件：macOS 支持时用"任一路径分量都不跟随"标志，其他平台用 O_NOFOLLOW（Windows 不加）；返回 fd 与是否检查了每个分量。
 */
function openNoFollow(filePath, flags, platform) {
  if (platform === "macos" && boundReadProbeState.noFollowAny !== "rejected")
    return {
      fd: openSync(filePath, flags | MAX_BOUND_READ_BYTES),
      everyComponent: true,
    };
  return {
    fd: openSync(filePath, platform === "windows" ? flags : flags | constants.O_NOFOLLOW),
    everyComponent: false,
  };
}
//@ chunk-p126a53v.js:4224-4290 placement
var NO_PROCFS_SENTINEL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DESCRIPTOR_PATH_UNREADABLE;
deferInit("chunk-p126a53v.js:4224", () => {
  NO_PROCFS_SENTINEL = Symbol("no procfs");
  DESCRIPTOR_PATH_UNREADABLE = Symbol("descriptor path unreadable");
});
//@ chunk-p126a53v.js:4290-4420 placement
function readFdPath(fd, platform) {
  if (platform !== "linux") return NO_PROCFS_SENTINEL;
  try {
    return readlinkSync(`/proc/self/fd/${fd}`);
  } catch {
    try {
      lstatSync("/proc/self/fd");
    } catch {
      return NO_PROCFS_SENTINEL;
    }
    return DESCRIPTOR_PATH_UNREADABLE;
  }
}
//@ chunk-p126a53v.js:4420-4805 placement
function macLinkProblem(filePath, openFlags, platform, maxBytes) {
  if (platform === "macos" && linkStateOf(filePath) === "link")
    return logBoundReadRefusal(filePath, "a link stands above the spelled name");
  let spelledStats = lstatSync(filePath);
  if (spelledStats.isSymbolicLink()) {
    isRealPathWithinTeamDir(filePath);
    return logBoundReadRefusal(filePath, "a link stands at the spelled name");
  }
  assertReadableFile(spelledStats, filePath, maxBytes);
  let fd;
  try {
    fd = openNoFollow(filePath, openFlags, platform).fd;
  } catch (error) {
    if (getErrnoCode(error) !== "ELOOP") throw error;
    return logBoundReadRefusal(filePath, "a link stands on the spelled route");
  }
  let fdPath = readFdPath(fd, platform);
  return fdPath === NO_PROCFS_SENTINEL || fdPath === filePath
    ? fd
    : closeFdAndRefuse(fd, filePath, `the descriptor is on ${String(fdPath)}`);
}
//@ chunk-p126a53v.js:4805-5436 placement
function routeProblem(filePath, isCanonical, isSymlink, openFlags, platform, maxBytes) {
  if (!isCanonical && !isLocalNonUncPath(filePath))
    return logBoundReadRefusal(filePath, "its route could not be examined");
  let onLocalVolume = false;
  if (platform === "macos") {
    let routeState = linkStateOf(filePath);
    if (routeState === "link") return refuseLinkOnRoute(filePath, isCanonical);
    onLocalVolume = routeState === "local" && !isSymlink;
  }
  if (!onLocalVolume) {
    let spelledStats = lstatSync(filePath);
    if (!spelledStats.isSymbolicLink()) assertReadableFile(spelledStats, filePath, maxBytes);
    else if (platform === "windows") return refuseLinkOnRoute(filePath, isCanonical);
  }
  let opened;
  try {
    opened = openNoFollow(filePath, openFlags, platform);
  } catch (error) {
    if (getErrnoCode(error) !== "ELOOP") throw error;
    return refuseLinkOnRoute(filePath, isCanonical);
  }
  let { fd, everyComponent } = opened;
  try {
    if (everyComponent) return fd;
    let fdPath = readFdPath(fd, platform);
    if (fdPath !== NO_PROCFS_SENTINEL)
      return fdPath === filePath
        ? fd
        : closeFdAndRefuse(fd, filePath, `the descriptor is on ${String(fdPath)}`);
    let resolved = safeResolvePath(getFsImplementation(), filePath);
    return !resolved.isSymlink &&
      resolved.resolvedPath === filePath &&
      (resolved.isCanonical || (!isCanonical && isLocalNonUncPath(filePath)))
      ? fd
      : closeFdAndRefuse(fd, filePath, "the route no longer resolves to it");
  } catch (error) {
    closeFdAndRefuse(fd, filePath, "the binding check threw");
    throw error;
  }
}
//@ chunk-p126a53v.js:5436-5512 placement
function refuseLinkOnRoute(filePath, isCanonical) {
  if (!isCanonical && isLocalNonUncPath(filePath)) isRealPathWithinTeamDir(filePath);
  return logBoundReadRefusal(filePath, "a link appeared on the route");
}
//@ chunk-p126a53v.js:5512-5734 placement (2.1.88 match: isRealPathWithinTeamDir, 0.785)
function isRealPathWithinTeamDir(realCandidate) {
  if (!lstatSync(realCandidate).isSymbolicLink()) return;
  let resolvedTarget = resolve(dirname(realCandidate), readlinkSync(realCandidate));
  if (!isLocalNonUncPath(resolvedTarget)) return;
  try {
    lstatSync(resolvedTarget);
  } catch (error) {
    let code = getErrnoCode(error);
    if ((code === "ENOENT" || code === "ENOTDIR") && typeof error === "object" && error !== null)
      Object.defineProperty(error, LINK_TO_NOTHING, {
        value: true,
      });
    throw error;
  }
}
//@ chunk-p126a53v.js:5734-5774 placement
var LINK_TO_NOTHING; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p126a53v.js:5734", () => {
  LINK_TO_NOTHING = Symbol("boundRead.linkToNothing");
});
//@ chunk-p126a53v.js:5774-5835 placement
function isBoundReadError(error) {
  return typeof error === "object" && error !== null && LINK_TO_NOTHING in error;
}
//@ chunk-p126a53v.js:5835-5872 placement
function closeFdAndRefuse(fd, filePath, reason) {
  closeSync(fd);
  return logBoundReadRefusal(filePath, reason);
}
//@ chunk-p126a53v.js:5872-5954 placement
function logBoundReadRefusal(filePath, reason) {
  logForDebugging(`boundRead: not reading ${filePath}: ${reason}`, {
    level: "warn",
  });
  return null;
}
export {
  READ_LIMITS,
  O_NOFOLLOW_ANY,
  O_NOFOLLOW_FLAG,
  normalizeGitHost,
  isSuspiciousUrl,
  hasEncodedPathChars,
  isSpecialPath,
  openBoundRead,
  isBoundReadError,
  nonHttpsScheme,
  O_NOATIME_FLAG,
  probeNoFollowAny,
  MAX_BOUND_READ_BYTES,
  isUncOrDevicePath,
};
