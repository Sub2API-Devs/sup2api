/**
 * utils/fsBoundRead.ts
 *
 * 2.1.316 新增：路径边界内的安全文件读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9mf2agcn.js (31)
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

//@ chunk-9mf2agcn.js:608-654 placement
function normalizeGitHost(hostname) {
  let n = normalizeHost(hostname);
  return isGithubDotCom(n) ? GITHUB_HOST : n;
}
//@ chunk-9mf2agcn.js:654-781 placement
function hasEncodedPathChars(e) {
  let n = decodePercentRuns(e);
  return (
    n.includes("\\") || /%[0-9A-Fa-f]{2}/.test(n) || n.split(/[/?#]/).some((r) => r === "." || r === "..")
  );
}
//@ chunk-9mf2agcn.js:781-958 placement
function nonHttpsScheme(e) {
  let n = e.trimStart();
  let match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(n);
  if (match === null || /^https?$/i.test(match[1] ?? "")) return tryParseUrl(n);
  return tryParseUrl(match[0] + decodePercentRuns(n.slice(match[0].length)));
}
//@ chunk-9mf2agcn.js:958-1253 placement
function isSuspiciousUrl(e) {
  if (e.includes("%00") || e.includes("\x00")) return true;
  if (hasBackslashInUrlAuthority(e)) return true;
  let n = [
    parseUrlScheme(e)?.host,
    parseUrlScheme(e, {
      asRewritten: true,
    })?.host,
  ];
  if (e.includes("://"))
    n.push(tryParseUrl(e.trimStart())?.hostname || undefined, nonHttpsScheme(e)?.hostname || undefined);
  let mapped = n.map((o) => (o === undefined ? null : normalizeGitHost(o)));
  return mapped.some((o) => o !== mapped[0]);
}
//@ chunk-9mf2agcn.js:1284-1334 placement
/**
 * 边界读取使用的打开标志常量（含 O_NOFOLLOW 等）与配套上限。
 */
var READ_LIMITS = 524288;
var O_NOFOLLOW_FLAG = 0;
var O_NOFOLLOW_ANY = 2097152;
var O_NOATIME_FLAG = constants.O_NOATIME ?? 0;
//@ chunk-9mf2agcn.js:1550-1703 placement
var MAX_BOUND_READ_BYTES = 536870912;
var boundReadProbeState = identity(
  {
    noFollowAny: "untried",
    localVolumes: undefined,
  },
  (e) => {
    e.noFollowAny = "untried";
    e.localVolumes = undefined;
  },
);
var LOCAL_VOLUME_ROOTS = ["/", "/System/Volumes/Data"];
//@ chunk-9mf2agcn.js:1703-1903 placement
function getLocalVolumeDevices() {
  if (boundReadProbeState.localVolumes !== undefined) return boundReadProbeState.localVolumes;
  let e = true;
  let flattened = LOCAL_VOLUME_ROOTS.flatMap((o) => {
    try {
      return [statSync(o).dev];
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") e = false;
      return [];
    }
  });
  let r = new Set(flattened);
  if (e) boundReadProbeState.localVolumes = r;
  return r;
}
//@ chunk-9mf2agcn.js:1903-2175 placement
function linkStateOf(e) {
  if (probeNoFollowAny_2() === "rejected") return "unsupported";
  let n;
  try {
    n = openDirNoFollow(dirname(e));
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP") return "link";
    if (errnoCode === "EINVAL") return "elsewhere";
    if (errnoCode === "EACCES" || errnoCode === "EPERM") return resolvedElsewhere(dirname(e));
    throw error;
  }
  try {
    return getLocalVolumeDevices().has(fstatSync(n).dev) ? "local" : "elsewhere";
  } finally {
    closeSync(n);
  }
}
//@ chunk-9mf2agcn.js:2175-2510 placement
function resolvedElsewhere(e) {
  let localVolumeDevices = getLocalVolumeDevices();
  let r = dirname(e);
  if (r === e) return "elsewhere";
  let o;
  try {
    o = openDirNoFollow(r);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP") return "link";
    if (errnoCode === "EACCES" || errnoCode === "EPERM") {
      let u = resolvedElsewhere(r);
      return u === "local" && !localVolumeDevices.has(deviceIdOrNaN(e)) ? "elsewhere" : u;
    }
    if (errnoCode === "EINVAL") return "elsewhere";
    throw error;
  }
  try {
    let dev = fstatSync(o).dev;
    return localVolumeDevices.has(dev) && localVolumeDevices.has(deviceIdOrNaN(e)) ? "local" : "elsewhere";
  } finally {
    closeSync(o);
  }
}
//@ chunk-9mf2agcn.js:2510-2569 placement
function deviceIdOrNaN(e) {
  try {
    return lstatSync(e).dev;
  } catch {
    return Number.NaN;
  }
}
//@ chunk-9mf2agcn.js:2569-2640 placement
function openDirNoFollow(e) {
  return openSync(
    e,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NONBLOCK | MAX_BOUND_READ_BYTES | READ_LIMITS,
  );
}
//@ chunk-9mf2agcn.js:2640-2881 placement
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
//@ chunk-9mf2agcn.js:2881-3071 placement
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
//@ chunk-9mf2agcn.js:3071-3132 placement
function isUncOrDevicePath(e, platform) {
  return (platform === "windows" && isUncOrDevicePath_2(e) && !isWslUncPath(e)) || isNetworkMountPath(e);
}
//@ chunk-9mf2agcn.js:3132-3168 placement
function isSpecialPath(resolvedPath) {
  return isWindowsDevicePath(resolvedPath) || isNetworkMountPath(resolvedPath);
}
//@ chunk-9mf2agcn.js:3168-3309 placement
function isLocalNonUncPath(e) {
  let fsImplementation = getFsImplementation();
  return (
    !isNonWslUncPath(e) &&
    !isNetworkMountPath(e) &&
    findIntermediateUncJunction(fsImplementation, e, {
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: true,
      launchAncestry: vouchedLaunchAncestry(fsImplementation),
    }) === undefined
  );
}
//@ chunk-9mf2agcn.js:3309-3337 placement = chordToDisplayString (1)
function getPlatform() {
  return "linux";
}
//@ chunk-9mf2agcn.js:3337-3350 placement
var READ_CHUNK_BYTES = 65536;
//@ chunk-9mf2agcn.js:3350-3844 placement
/**
 * 在路径边界内安全打开文件读取（非阻塞、不跟随链接、平台差异处理）。
 */
function openBoundRead(e, isCanonical, r, isSymlink, identity) {
  let platform = getPlatform();
  let u =
    READ_LIMITS |
    (platform === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOCTTY);
  let l =
    !isCanonical && isUncOrDevicePath(e, platform)
      ? macLinkProblem(e, u, platform, r)
      : routeProblem(e, isCanonical, isSymlink, u, platform, r);
  if (l === null) return null;
  try {
    if (identity === undefined) assertReadableFile(fstatSync(l), e, r);
    else {
      let a = fstatSync(l, {
        bigint: true,
      });
      if (
        a.ino !== identity.ino ||
        a.ctimeNs !== identity.ctimeNs ||
        (platform !== "windows" && a.dev !== identity.dev)
      )
        return logBoundReadRefusal(e, "the file was replaced or changed after its path was checked");
      assertReadableFile(
        {
          isDirectory: () => a.isDirectory(),
          isFile: () => a.isFile(),
          size: Number(a.size),
        },
        e,
        r,
      );
    }
    return decodeTextBuffer(readBoundedFromFd(l, e, r));
  } finally {
    closeSync(l);
  }
}
//@ chunk-9mf2agcn.js:3844-4036 placement
function readBoundedFromFd(e, path, r) {
  let o = [];
  let s = 0;
  while (s <= r) {
    let c = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, r + 1 - s));
    let u = readSync(e, c, 0, c.length, s);
    if (u === 0) break;
    o.push(c.subarray(0, u));
    s += u;
  }
  assertWithinMaxBytes(s, path, r);
  return Buffer.concat(o, s);
}
//@ chunk-9mf2agcn.js:4036-4202 placement
/**
 * 以不跟随符号链接的方式打开文件：macOS 支持时用"任一路径分量都不跟随"标志，其他平台用 O_NOFOLLOW（Windows 不加）；返回 fd 与是否检查了每个分量。
 */
function openNoFollow(e, n, r) {
  if (r === "macos" && boundReadProbeState.noFollowAny !== "rejected")
    return {
      fd: openSync(e, n | MAX_BOUND_READ_BYTES),
      everyComponent: true,
    };
  return {
    fd: openSync(e, r === "windows" ? n : n | constants.O_NOFOLLOW),
    everyComponent: false,
  };
}
//@ chunk-9mf2agcn.js:4202-4268 placement
var NO_PROCFS_SENTINEL = Symbol("no procfs");
var DESCRIPTOR_PATH_UNREADABLE = Symbol("descriptor path unreadable");
//@ chunk-9mf2agcn.js:4268-4398 placement
function readFdPath(e, n) {
  if (n !== "linux") return NO_PROCFS_SENTINEL;
  try {
    return readlinkSync(`/proc/self/fd/${e}`);
  } catch {
    try {
      lstatSync("/proc/self/fd");
    } catch {
      return NO_PROCFS_SENTINEL;
    }
    return DESCRIPTOR_PATH_UNREADABLE;
  }
}
//@ chunk-9mf2agcn.js:4398-4783 placement
function macLinkProblem(realCandidate, n, platform, o) {
  if (platform === "macos" && linkStateOf(realCandidate) === "link")
    return logBoundReadRefusal(realCandidate, "a link stands above the spelled name");
  let s = lstatSync(realCandidate);
  if (s.isSymbolicLink()) {
    isRealPathWithinTeamDir(realCandidate);
    return logBoundReadRefusal(realCandidate, "a link stands at the spelled name");
  }
  assertReadableFile(s, realCandidate, o);
  let c;
  try {
    c = openNoFollow(realCandidate, n, platform).fd;
  } catch (error) {
    if (getErrnoCode(error) !== "ELOOP") throw error;
    return logBoundReadRefusal(realCandidate, "a link stands on the spelled route");
  }
  let fdPath = readFdPath(c, platform);
  return fdPath === NO_PROCFS_SENTINEL || fdPath === realCandidate
    ? c
    : closeFdAndRefuse(c, realCandidate, `the descriptor is on ${String(fdPath)}`);
}
//@ chunk-9mf2agcn.js:4783-5414 placement
function routeProblem(e, n, r, o, platform, c) {
  if (!n && !isLocalNonUncPath(e)) return logBoundReadRefusal(e, "its route could not be examined");
  let u = false;
  if (platform === "macos") {
    let d = linkStateOf(e);
    if (d === "link") return refuseLinkOnRoute(e, n);
    u = d === "local" && !r;
  }
  if (!u) {
    let d = lstatSync(e);
    if (!d.isSymbolicLink()) assertReadableFile(d, e, c);
    else if (platform === "windows") return refuseLinkOnRoute(e, n);
  }
  let l;
  try {
    l = openNoFollow(e, o, platform);
  } catch (error) {
    if (getErrnoCode(error) !== "ELOOP") throw error;
    return refuseLinkOnRoute(e, n);
  }
  let { fd, everyComponent } = l;
  try {
    if (everyComponent) return fd;
    let fdPath = readFdPath(fd, platform);
    if (fdPath !== NO_PROCFS_SENTINEL)
      return fdPath === e ? fd : closeFdAndRefuse(fd, e, `the descriptor is on ${String(fdPath)}`);
    let D = safeResolvePath(getFsImplementation(), e);
    return !D.isSymlink && D.resolvedPath === e && (D.isCanonical || (!n && isLocalNonUncPath(e)))
      ? fd
      : closeFdAndRefuse(fd, e, "the route no longer resolves to it");
  } catch (error) {
    closeFdAndRefuse(fd, e, "the binding check threw");
    throw error;
  }
}
//@ chunk-9mf2agcn.js:5414-5490 placement
function refuseLinkOnRoute(realCandidate, n) {
  if (!n && isLocalNonUncPath(realCandidate)) isRealPathWithinTeamDir(realCandidate);
  return logBoundReadRefusal(realCandidate, "a link appeared on the route");
}
//@ chunk-9mf2agcn.js:5490-5713 placement = isRealPathWithinTeamDir (0.785)
function isRealPathWithinTeamDir(realCandidate) {
  if (!lstatSync(realCandidate).isSymbolicLink()) return;
  let n = resolve(dirname(realCandidate), readlinkSync(realCandidate));
  if (!isLocalNonUncPath(n)) return;
  try {
    lstatSync(n);
  } catch (error) {
    let code = getErrnoCode(error);
    if ((code === "ENOENT" || code === "ENOTDIR") && typeof error === "object" && error !== null)
      Object.defineProperty(error, LINK_TO_NOTHING, {
        value: true,
      });
    throw error;
  }
}
//@ chunk-9mf2agcn.js:5713-5753 placement
var LINK_TO_NOTHING = Symbol("boundRead.linkToNothing");
//@ chunk-9mf2agcn.js:5753-5814 placement
function isBoundReadError(error) {
  return typeof error === "object" && error !== null && LINK_TO_NOTHING in error;
}
//@ chunk-9mf2agcn.js:5814-5851 placement
function closeFdAndRefuse(e, n, r) {
  closeSync(e);
  return logBoundReadRefusal(n, r);
}
//@ chunk-9mf2agcn.js:5851-5933 placement
function logBoundReadRefusal(e, n) {
  logForDebugging(`boundRead: not reading ${e}: ${n}`, {
    level: "warn",
  });
  return null;
}
export {
  READ_LIMITS,
  isSuspiciousUrl,
  hasEncodedPathChars,
  O_NOFOLLOW_ANY,
  O_NOFOLLOW_FLAG,
  isSpecialPath,
  normalizeGitHost,
  nonHttpsScheme,
  openBoundRead,
  isBoundReadError,
  O_NOATIME_FLAG,
  probeNoFollowAny,
  MAX_BOUND_READ_BYTES,
  isUncOrDevicePath,
};
