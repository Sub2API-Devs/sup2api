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
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  statSync,
  fstatSync,
  fstatSync as fstatSync_2,
  closeSync,
  closeSync as closeSync_2,
  lstatSync,
  lstatSync as lstatSync_2,
  openSync,
  openSync as openSync_2,
  readSync,
  readlinkSync,
} from "fs";
import { dirname, resolve } from "path";
import { open } from "fs/promises";
import { normalizeHost, isGithubDotCom, GITHUB_HOST, hasBackslashInUrlAuthority } from "./git/githubUrl.js";
import { decodePercentRuns, parseUrlScheme } from "./redaction/urlParsing.js";
import { tryParseUrl } from "./resultError.js";
import { ge } from "./identity.js";
import { getErrnoCode } from "./errors.js";
import { Qn } from "./pathClassification.js";
import { isWslUncPath, Ya, ai } from "./networkPaths.js";
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
function normalizeGitHost(e) {
  let n = normalizeHost(e);
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
  let trimStart = e.trimStart(),
    match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(trimStart);
  if (match === null || /^https?$/i.test(match[1] ?? "")) return tryParseUrl(trimStart);
  return tryParseUrl(match[0] + decodePercentRuns(trimStart.slice(match[0].length)));
}
//@ chunk-9mf2agcn.js:958-1253 placement
function isSuspiciousUrl(e) {
  if (e.includes("%00") || e.includes("\x00")) return !0;
  if (hasBackslashInUrlAuthority(e)) return !0;
  let n = [parseUrlScheme(e)?.host, parseUrlScheme(e, { asRewritten: !0 })?.host];
  if (e.includes("://"))
    n.push(tryParseUrl(e.trimStart())?.hostname || void 0, nonHttpsScheme(e)?.hostname || void 0);
  let mapped = n.map((o) => (o === void 0 ? null : normalizeGitHost(o)));
  return mapped.some((o) => o !== mapped[0]);
}
//@ chunk-9mf2agcn.js:1284-1334 placement
var READ_LIMITS = 524288,
  mMe = 0,
  tz = 2097152,
  _Oi = constants.O_NOATIME ?? 0;
//@ chunk-9mf2agcn.js:1550-1703 placement
var MAX_BOUND_READ_BYTES = 536870912,
  f = ge({ noFollowAny: "untried", localVolumes: void 0 }, (e) => {
    ((e.noFollowAny = "untried"), (e.localVolumes = void 0));
  }),
  ne = ["/", "/System/Volumes/Data"];
//@ chunk-9mf2agcn.js:1703-1903 placement
function getLocalVolumeDevices() {
  if (f.localVolumes !== void 0) return f.localVolumes;
  let e = !0,
    flattened = ne.flatMap((o) => {
      try {
        return [statSync(o).dev];
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT") e = !1;
        return [];
      }
    }),
    r = new Set(flattened);
  if (e) f.localVolumes = r;
  return r;
}
//@ chunk-9mf2agcn.js:1903-2175 placement
function linkStateOf(e) {
  if (probeNoFollowAny_2() === "rejected") return "unsupported";
  let n;
  try {
    n = R(dirname(e));
  } catch (error) {
    let o = getErrnoCode(error);
    if (o === "ELOOP") return "link";
    if (o === "EINVAL") return "elsewhere";
    if (o === "EACCES" || o === "EPERM") return resolvedElsewhere(dirname(e));
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
  let n = getLocalVolumeDevices(),
    r = dirname(e);
  if (r === e) return "elsewhere";
  let o;
  try {
    o = R(r);
  } catch (error) {
    let c = getErrnoCode(error);
    if (c === "ELOOP") return "link";
    if (c === "EACCES" || c === "EPERM") {
      let u = resolvedElsewhere(r);
      return u === "local" && !n.has(I(e)) ? "elsewhere" : u;
    }
    if (c === "EINVAL") return "elsewhere";
    throw error;
  }
  try {
    let dev = fstatSync(o).dev;
    return n.has(dev) && n.has(I(e)) ? "local" : "elsewhere";
  } finally {
    closeSync(o);
  }
}
//@ chunk-9mf2agcn.js:2510-2569 placement
function I(e) {
  try {
    return lstatSync(e).dev;
  } catch {
    return Number.NaN;
  }
}
//@ chunk-9mf2agcn.js:2569-2640 placement
function R(e) {
  return openSync(
    e,
    constants_2.O_RDONLY |
      constants_2.O_DIRECTORY |
      constants_2.O_NONBLOCK |
      MAX_BOUND_READ_BYTES |
      READ_LIMITS,
  );
}
//@ chunk-9mf2agcn.js:2640-2881 placement
async function probeNoFollowAny() {
  if (f.noFollowAny === "untried")
    try {
      (await (
        await open(
          "/",
          constants_2.O_RDONLY |
            constants_2.O_DIRECTORY |
            constants_2.O_NONBLOCK |
            MAX_BOUND_READ_BYTES |
            READ_LIMITS,
        )
      ).close(),
        (f.noFollowAny = "works"));
    } catch (error) {
      f.noFollowAny = getErrnoCode(error) === "EINVAL" ? "rejected" : "works";
    }
  return f.noFollowAny === "rejected";
}
//@ chunk-9mf2agcn.js:2881-3071 placement
function probeNoFollowAny_2() {
  if (f.noFollowAny === "untried")
    try {
      (closeSync(R("/")), (f.noFollowAny = "works"));
    } catch (error) {
      f.noFollowAny = getErrnoCode(error) === "EINVAL" ? "rejected" : "works";
    }
  return f.noFollowAny === "rejected" ? "rejected" : "works";
}
//@ chunk-9mf2agcn.js:3071-3132 placement
function isUncOrDevicePath(e, n) {
  return (n === "windows" && Qn(e) && !isWslUncPath(e)) || Ya(e);
}
//@ chunk-9mf2agcn.js:3132-3168 placement
function isSpecialPath(e) {
  return isWindowsDevicePath(e) || Ya(e);
}
//@ chunk-9mf2agcn.js:3168-3309 placement
function isLocalNonUncPath(e) {
  let n = getFsImplementation();
  return (
    !ai(e) &&
    !Ya(e) &&
    findIntermediateUncJunction(n, e, {
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: !0,
      launchAncestry: vouchedLaunchAncestry(n),
    }) === void 0
  );
}
//@ chunk-9mf2agcn.js:3309-3337 placement = chordToDisplayString (1)
function getPlatform() {
  return "linux";
}
//@ chunk-9mf2agcn.js:3337-3350 placement
var oe = 65536;
/**
 * 在路径边界内安全打开文件读取（非阻塞、不跟随链接、平台差异处理）。
 */
//@ chunk-9mf2agcn.js:3350-3844 placement
function openBoundRead(e, n, r, o, s) {
  let c = getPlatform(),
    u =
      READ_LIMITS |
      (c === "windows"
        ? constants_2.O_RDONLY
        : constants_2.O_RDONLY | constants_2.O_NONBLOCK | constants_2.O_NOCTTY),
    l = !n && isUncOrDevicePath(e, c) ? macLinkProblem(e, u, c, r) : routeProblem(e, n, o, u, c, r);
  if (l === null) return null;
  try {
    if (s === void 0) assertReadableFile(fstatSync(l), e, r);
    else {
      let a = fstatSync(l, { bigint: !0 });
      if (a.ino !== s.ino || a.ctimeNs !== s.ctimeNs || (c !== "windows" && a.dev !== s.dev))
        return p(e, "the file was replaced or changed after its path was checked");
      assertReadableFile(
        { isDirectory: () => a.isDirectory(), isFile: () => a.isFile(), size: Number(a.size) },
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
function readBoundedFromFd(e, n, r) {
  let o = [],
    s = 0;
  while (s <= r) {
    let allocUnsafe = Buffer.allocUnsafe(Math.min(oe, r + 1 - s)),
      u = readSync(e, allocUnsafe, 0, allocUnsafe.length, s);
    if (u === 0) break;
    (o.push(allocUnsafe.subarray(0, u)), (s += u));
  }
  return (assertWithinMaxBytes(s, n, r), Buffer.concat(o, s));
}
/**
 * 以不跟随符号链接的方式打开文件：macOS 支持时用"任一路径分量都不跟随"标志，其他平台用 O_NOFOLLOW（Windows 不加）；返回 fd 与是否检查了每个分量。
 */
//@ chunk-9mf2agcn.js:4036-4202 placement
function openNoFollow(e, n, r) {
  if (r === "macos" && f.noFollowAny !== "rejected")
    return { fd: openSync(e, n | MAX_BOUND_READ_BYTES), everyComponent: !0 };
  return { fd: openSync(e, r === "windows" ? n : n | constants_2.O_NOFOLLOW), everyComponent: !1 };
}
//@ chunk-9mf2agcn.js:4202-4268 placement
var b = Symbol("no procfs"),
  se = Symbol("descriptor path unreadable");
//@ chunk-9mf2agcn.js:4268-4398 placement
function readFdPath(e, n) {
  if (n !== "linux") return b;
  try {
    return readlinkSync(`/proc/self/fd/${e}`);
  } catch {
    try {
      lstatSync("/proc/self/fd");
    } catch {
      return b;
    }
    return se;
  }
}
//@ chunk-9mf2agcn.js:4398-4783 placement
function macLinkProblem(e, n, r, o) {
  if (r === "macos" && linkStateOf(e) === "link") return p(e, "a link stands above the spelled name");
  let s = lstatSync(e);
  if (s.isSymbolicLink()) return (isRealPathWithinTeamDir(e), p(e, "a link stands at the spelled name"));
  assertReadableFile(s, e, o);
  let c;
  try {
    c = openNoFollow(e, n, r).fd;
  } catch (error) {
    if (getErrnoCode(error) !== "ELOOP") throw error;
    return p(e, "a link stands on the spelled route");
  }
  let u = readFdPath(c, r);
  return u === b || u === e ? c : w(c, e, `the descriptor is on ${String(u)}`);
}
//@ chunk-9mf2agcn.js:4783-5414 placement
function routeProblem(e, n, r, o, s, c) {
  if (!n && !isLocalNonUncPath(e)) return p(e, "its route could not be examined");
  let u = !1;
  if (s === "macos") {
    let d = linkStateOf(e);
    if (d === "link") return L(e, n);
    u = d === "local" && !r;
  }
  if (!u) {
    let d = lstatSync(e);
    if (!d.isSymbolicLink()) assertReadableFile(d, e, c);
    else if (s === "windows") return L(e, n);
  }
  let l;
  try {
    l = openNoFollow(e, o, s);
  } catch (error) {
    if (getErrnoCode(error) !== "ELOOP") throw error;
    return L(e, n);
  }
  let { fd: fd, everyComponent: everyComponent } = l;
  try {
    if (everyComponent) return fd;
    let d = readFdPath(fd, s);
    if (d !== b) return d === e ? fd : w(fd, e, `the descriptor is on ${String(d)}`);
    let D = safeResolvePath(getFsImplementation(), e);
    return !D.isSymlink && D.resolvedPath === e && (D.isCanonical || (!n && isLocalNonUncPath(e)))
      ? fd
      : w(fd, e, "the route no longer resolves to it");
  } catch (error) {
    throw (w(fd, e, "the binding check threw"), error);
  }
}
//@ chunk-9mf2agcn.js:5414-5490 placement
function L(e, n) {
  if (!n && isLocalNonUncPath(e)) isRealPathWithinTeamDir(e);
  return p(e, "a link appeared on the route");
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
      Object.defineProperty(error, G, { value: !0 });
    throw error;
  }
}
//@ chunk-9mf2agcn.js:5713-5753 placement
var G = Symbol("boundRead.linkToNothing");
//@ chunk-9mf2agcn.js:5753-5814 placement
function isBoundReadError(e) {
  return typeof e === "object" && e !== null && G in e;
}
//@ chunk-9mf2agcn.js:5814-5851 placement
function w(e, n, r) {
  return (closeSync(e), p(n, r));
}
//@ chunk-9mf2agcn.js:5851-5933 placement
function p(e, n) {
  return (logForDebugging(`boundRead: not reading ${e}: ${n}`, { level: "warn" }), null);
}

export {
  READ_LIMITS,
  isSuspiciousUrl,
  hasEncodedPathChars,
  tz,
  mMe,
  isSpecialPath,
  normalizeGitHost,
  nonHttpsScheme,
  openBoundRead,
  isBoundReadError,
  _Oi,
  probeNoFollowAny,
  MAX_BOUND_READ_BYTES,
  isUncOrDevicePath,
};
