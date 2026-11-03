/**
 * utils/fsOperations.ts
 *
 * 文件系统抽象 getFsImplementation/NodeFsOperations、按范围/尾部读取、路径拼写展开（~ 与符号链接）及最深已存在祖先解析，供权限检查使用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fsOperations.ts
 * pieces: chunk-awy329vy.js (1), chunk-cgr0tezp.js (78), chunk-e6aww6q8.js (4), chunk-jhrww53q.js (1)
 * attribution: fingerprint 3, placement 79, layout 1, callgraph-fingerprint 1
 */
import * as fsModule from "fs";
import * as pathModule from "path";
import { isAbsolute, parse, resolve as resolve_2, dirname, sep, relative } from "path";
import { homedir } from "os";
import {
  stat,
  lstat,
  open,
  readdir,
  unlink,
  rmdir,
  rm,
  mkdir,
  readFile,
  rename,
  realpath,
  readlink,
  copyFile,
  appendFile,
  symlink,
  link,
  chmod,
} from "fs/promises";
import {
  networkMountRootCached,
  isUnderNetworkDirCached,
  isForeignMountPath,
  isNetworkMountPath,
  networkMountHost,
  isNonWslUncPath,
  isNetworkMountRoot,
  isNetDir,
  isWslUncPath,
  neverOtherHostMount,
  expandTildeWithHome,
} from "./networkPaths.js";
import {
  hasDotSegment,
  hasDotDotSegment,
  isForeignNetworkPath,
  isUncOrDevicePath,
  isMacSpecialPath,
  identity,
  isDeviceNamespacePath,
  isDevicePrefixPath,
  hasDotSegmentAlias,
} from "./pathClassification.js";
import {
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { launchCwd } from "./cwd.js";
import { getResolvedPath } from "./swarm/permissionSync.js";
import { isSentinelInode, realpathPromise, slowLogging, isBunVirtualPath } from "./slowOperations.js";
import { toUncLongPath } from "./windowsUncPaths.js";
import { realpathCacheEntry } from "./permissions/protectedDirs.js";
import { GIT_INTERNAL_PATH_PATTERNS } from "../tools/BashTool/readOnlyValidation.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { isSpecialOrUnsafePath, isNonCanonicalSymlink } from "./claudemd.js";
import { readOnlyNoFollowFlags } from "./platformTargets.js";

//@ chunk-cgr0tezp.js:19756-19772 placement
var RENAME_ARROW = "\u2192";
//@ chunk-cgr0tezp.js:19772-19839 placement
function noFollowNonblockFlags() {
  return fsModule.constants.O_NOFOLLOW | fsModule.constants.O_NONBLOCK;
}
//@ chunk-cgr0tezp.js:19839-19926 placement
function nonblockingReadFlags() {
  return fsModule.constants.O_RDONLY | fsModule.constants.O_NONBLOCK | fsModule.constants.O_NOCTTY;
}
//@ chunk-cgr0tezp.js:19926-19939 placement
var PATH_SEPARATOR_RUN_RE = /\/+/;
//@ chunk-cgr0tezp.js:19939-20126 placement
function isSpelledStrictAncestor(e, n) {
  let r = (u) => u.split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
  let resolved = pathModule.resolve(e);
  let resolved_2 = pathModule.resolve(n);
  let o = r(resolved);
  let a = r(resolved_2);
  return (
    pathModule.parse(resolved).root === pathModule.parse(resolved_2).root &&
    o.length < a.length &&
    o.every((u, c) => u === a[c])
  );
}
//@ chunk-cgr0tezp.js:20126-20275 placement
function truncateAtDotSegment(e) {
  let n = "";
  for (let i of e.split(/([\\/]+)/)) {
    if (i === "." || i === "..") break;
    n += i;
  }
  let replaced = n.replace(/(?<=[^\\/])[\\/]+$/, "");
  return replaced === "" ? e : replaced;
}
//@ chunk-cgr0tezp.js:20275-20398 placement
function normalizeNetworkMountPath(e) {
  if (e.startsWith("\\\\")) return truncateAtDotSegment(e);
  let replaced = e.replace(/^\/+/, "/");
  let r = networkMountRootCached(replaced);
  if (r !== null) return r;
  return truncateAtDotSegment(e);
}
//@ chunk-cgr0tezp.js:20398-20408 placement
var networkMountPathOf = normalizeNetworkMountPath;
//@ chunk-cgr0tezp.js:20408-20579 placement
function joinRemainingSegments(e, n, onCollapsedLanding) {
  let i = hasDotSegment(e);
  if (n.length === 0 || i || n.some((s) => s === "." || s === "..")) {
    if (onCollapsedLanding !== undefined && (n.length > 0 || i)) onCollapsedLanding(pathModule.join(e, ...n));
    return i ? networkMountPathOf(e) : e;
  }
  return pathModule.join(e, ...n);
}
//@ chunk-cgr0tezp.js:20579-20639 placement
var UNVERIFIED_ANCESTRY = "\x00unverified-ancestry";
var OPAQUE_LINK_TEXT = "\x00opaque-link-text";
//@ chunk-cgr0tezp.js:20639-20722 placement
function hasParentSegment(text) {
  return hasDotDotSegment(pathModule.isAbsolute(text) ? text : text.replace(/^(?:\.\.(?:[\\/]+|$))+/, ""));
}
//@ chunk-cgr0tezp.js:20722-20982 placement
function isOpaqueLinkText(e, n = false) {
  return (
    e.includes("\uFFFD") ||
    hasParentSegment(e) ||
    (n &&
      (/^(?:[A-Za-z]:(?![\\/])|[\\/](?![\\/]))/.test(e) ||
        (/^[\\/]{2}\?[\\/]/.test(e) && !/^[\\/]{2}\?[\\/](?:[A-Za-z]:[\\/]|UNC[\\/])/i.test(e)) ||
        e.split(/[\\/]/).some((r) => r !== "." && r !== ".." && /[. ]$/.test(r))))
  );
}
//@ chunk-cgr0tezp.js:20982-21024 placement
function isNetworkJunction(intermediateUncJunction) {
  return intermediateUncJunction !== undefined && intermediateUncJunction !== UNVERIFIED_ANCESTRY;
}
//@ chunk-cgr0tezp.js:21024-21136 placement
function hopCapExhausted(path) {
  return Object.assign(Error("ELOOP: symbolic link chain too long to vet"), {
    code: "ELOOP",
    path,
  });
}
//@ chunk-cgr0tezp.js:21136-21370 placement
function unverifiedAncestryReason(e, n, r = false, i = false, s = false) {
  if (n?.unreadableAncestry !== "unverified") return;
  let errno = e !== undefined && typeof e === "object" && "errno" in e ? e.errno : undefined;
  if (errno === "ENOENT" || errno === "ENOTDIR") return;
  if (errno === "ENAMETOOLONG" && !r && !i && !s) return;
  return UNVERIFIED_ANCESTRY;
}
//@ chunk-cgr0tezp.js:21370-21398 placement
function isUnderNetworkDir(e) {
  return isUnderNetworkDirCached(e);
}
//@ chunk-cgr0tezp.js:21398-21481 placement
function isNetworkPathUnderAnchors(e, anchors) {
  return (
    anchors !== undefined &&
    anchors.some(
      (r) =>
        isUnderNetworkDirCached(r) &&
        !isForeignMountPath(e, r) &&
        (isPathUnderPosix(e, r) || isNetworkMountPath(e)),
    )
  );
}
//@ chunk-cgr0tezp.js:21481-21545 placement
function isAnchorUnderPath(e, anchors) {
  return anchors !== undefined && anchors.some((r) => isUnderNetworkDirCached(r) && isPathUnderPosix(r, e));
}
//@ chunk-cgr0tezp.js:21545-21669 placement
function isPathUnderPosix(e, n) {
  let r = (o) => (o.length > 1 ? o.replace(/\/+$/, "") : o);
  let [i, s] = [r(e), r(n)];
  return i === s || i.startsWith(s === "/" ? s : s + "/");
}
//@ chunk-cgr0tezp.js:21669-21727 placement
function isForeignToAllMounts(e, anchors) {
  return anchors === undefined || anchors.every((r) => isForeignMountPath(e, r));
}
//@ chunk-cgr0tezp.js:21727-21785 placement
function isForeignToAllNetworks(e, anchors) {
  return anchors === undefined || anchors.every((r) => isForeignNetworkPath(e, r));
}
//@ chunk-cgr0tezp.js:21785-21924 placement
function collapseNetworkLanding(e, anchors, onCollapsedLanding) {
  let i = isNetworkMountPath(e) ? networkMountRootCached(e) : null;
  if (i === null || !isForeignToAllMounts(i, anchors)) return;
  let joined = pathModule.join(e);
  if (isNetworkMountPath(joined) && networkMountHost(joined) === networkMountHost(i)) return joined;
  return joinRemainingSegments(e, [], onCollapsedLanding);
}
//@ chunk-cgr0tezp.js:21924-22043 placement
function getAnchors(e) {
  if (e?.anchors !== undefined && e.anchors.length > 0) return e.anchors;
  return e?.anchor !== undefined ? [e.anchor] : undefined;
}
//@ chunk-cgr0tezp.js:22043-22111 placement
function hasUntouchableRecordSpelling(e) {
  return (
    hasDotDotSegment(e) ||
    isNonWslUncPath(e) ||
    isNetworkMountRoot(e) ||
    isNetDir(e) ||
    findIntermediateUncJunction(NodeFsOperations, e) !== undefined
  );
}
//@ chunk-cgr0tezp.js:22111-22192 placement
async function hasUntouchableRecordSpellingAsync(e) {
  return (
    hasDotDotSegment(e) ||
    isNonWslUncPath(e) ||
    isNetworkMountRoot(e) ||
    isNetDir(e) ||
    (await findIntermediateUncJunctionAsync(NodeFsOperations, e)) !== undefined
  );
}
//@ chunk-cgr0tezp.js:22192-22320 placement
function hasUntouchableRecordSpellingStrict(e, n = NodeFsOperations) {
  return (
    hasDotDotSegment(e) ||
    isNonWslUncPath(e) ||
    isNetworkMountRoot(e) ||
    isNetDir(e) ||
    findIntermediateUncJunction(n, e, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    }) !== undefined
  );
}
//@ chunk-cgr0tezp.js:22320-22460 placement
async function hasUntouchableRecordSpellingStrictAsync(e, n = NodeFsOperations) {
  return (
    hasDotDotSegment(e) ||
    isNonWslUncPath(e) ||
    isNetworkMountRoot(e) ||
    isNetDir(e) ||
    (await findIntermediateUncJunctionAsync(n, e, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    })) !== undefined
  );
}
//@ chunk-cgr0tezp.js:22460-22659 placement
async function entryReachesForeignNetwork(e, permissionScreenAnchor, fsImpl = NodeFsOperations) {
  if (hasDotDotSegment(e)) return true;
  if (isNonWslUncPath(e)) return true;
  if (isNetworkMountRoot(e)) {
    let i = networkMountHost(e);
    if (i === null || permissionScreenAnchor === null || i !== networkMountHost(permissionScreenAnchor))
      return true;
  }
  if (isNetDir(e)) return true;
  return (
    (
      await examineEntryChain(e, permissionScreenAnchor, {
        fsImpl,
      })
    ).verdict !== "clean"
  );
}
//@ chunk-cgr0tezp.js:22659-22925 placement
async function examineEntryChain(e, n, { fsImpl: r = NodeFsOperations, signal: i } = {}) {
  let intermediateUncJunction = await findIntermediateUncJunctionAsync(
    r,
    e,
    {
      ...(n === null
        ? {}
        : {
            anchor: n,
          }),
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: true,
    },
    i,
  );
  if (intermediateUncJunction === undefined)
    return {
      verdict: "clean",
    };
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
    return {
      verdict: "unverified",
    };
  return {
    verdict: "network",
    reaches: intermediateUncJunction,
  };
}
//@ chunk-cgr0tezp.js:22925-23119 placement
function findIntermediateUncJunction(e, n, r) {
  return returnValue(resolvePathSafely(n, r), (i) => {
    if (i.kind === "lstat") return e.lstatSync(i.path);
    if (i.kind === "opendirNofollow") {
      e.openDirNoFollowSync(i.path);
      return "ok";
    }
    return e.readlinkSync(i.path);
  });
}
//@ chunk-cgr0tezp.js:23119-23428 placement
function findIntermediateUncJunctionAsync(e, n, r, i, s) {
  return returnValue_2(resolvePathSafely(n, r), i, async (o) => {
    if (o.kind === "lstat") {
      if (s === undefined) return e.lstat(o.path);
      let a;
      try {
        a = await e.lstatBigint(o.path);
      } catch (error) {
        s(o.path, undefined);
        throw error;
      }
      s(o.path, a);
      return a;
    }
    if (o.kind === "opendirNofollow") {
      await e.openDirNoFollow(o.path);
      return "ok";
    }
    return e.readlink(o.path);
  });
}
//@ chunk-cgr0tezp.js:23428-23543 placement = returnValue (0.769)
function returnValue(e, n) {
  let r;
  for (;;) {
    let i = e.next(r);
    if (i.done) return i.value;
    try {
      r = n(i.value);
    } catch (error) {
      r = {
        errno: getErrnoCode(error),
      };
    }
  }
}
//@ chunk-cgr0tezp.js:23543-23701 placement = returnValue (0.769)
async function returnValue_2(path, n, r) {
  let i;
  for (;;) {
    let s = path.next(i);
    if (s.done) return s.value;
    if (n?.aborted === true) return UNVERIFIED_ANCESTRY;
    try {
      i = await r(s.value);
    } catch (error) {
      i = {
        errno: getErrnoCode(error),
      };
    }
  }
}
//@ chunk-cgr0tezp.js:23701-24117 placement
/**
 * 驱动路径检查生成器执行文件系统步骤（可中止）。
 */
async function runFsSteps(e, n, r, i, s) {
  let o = Symbol("cut short");
  let a;
  let u =
    n === undefined
      ? undefined
      : new Promise((resolve) => {
          a = () => resolve(o);
          n.addEventListener("abort", a, {
            once: true,
          });
        });
  let c;
  try {
    for (;;) {
      let l = e.next(c);
      if (l.done) return l.value;
      if (n?.aborted === true || r?.(l.value) === false) return s;
      let d = i(l.value).catch((error) => ({
        errno: getErrnoCode(error),
      }));
      let g = await (u === undefined ? d : Promise.race([d, u]));
      if (g === o) return s;
      c = g;
    }
  } finally {
    if (a !== undefined) n?.removeEventListener("abort", a);
  }
}
//@ chunk-cgr0tezp.js:24117-27079 placement
/**
 * 逐段解析路径的生成器（链接、网络、junction 检查）。
 */
function* resolvePathSafely(e, n) {
  let anchors = getAnchors(n);
  if (isUnderNetworkDir(e) && !isNetworkPathUnderAnchors(e, anchors)) return e;
  if (
    (isUncOrDevicePath(e) && !isWslUncPath(e) && isForeignToAllNetworks(e, anchors)) ||
    (isNetworkMountPath(e) && isForeignToAllMounts(e, anchors))
  )
    return;
  let resolved = pathModule.resolve(e);
  let root = pathModule.parse(resolved).root;
  let o = root;
  let filtered = resolved.slice(root.length).split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
  let u = 0;
  let c = filtered.length;
  let l = false;
  let d = false;
  let g;
  let y = 64;
  let h = () => filtered.some((f) => hasDotSegment(f));
  let S = () => /[. ]$/.test(filtered[0]);
  while (filtered.length > 0 && u < y) {
    if (l && hasDotSegment(filtered[0])) return UNVERIFIED_ANCESTRY;
    let joined = pathModule.join(o, filtered[0]);
    if (
      (isNetworkMountPath(joined) && isForeignToAllMounts(joined, anchors)) ||
      (isUnderNetworkDir(joined) &&
        !(isNetworkPathUnderAnchors(joined, anchors) || isAnchorUnderPath(joined, anchors)))
    )
      return joinRemainingSegments(joined, filtered.slice(1), n?.onCollapsedLanding);
    if (isMacSpecialPath(joined)) {
      if (n?.surfaceNetworkRaw === true || n?.unreadableAncestry === "unverified") return UNVERIFIED_ANCESTRY;
      return joinRemainingSegments(joined, filtered.slice(1), n?.onCollapsedLanding);
    }
    let m = false;
    if (
      m &&
      pathModule.dirname(joined) === "/dev/fd" &&
      filtered.some((T, U) => U > 0 && (T === ".." || T === "."))
    ) {
      filtered.shift();
      while (filtered[0] === "." && filtered.length > 1) filtered.shift();
      o = joined;
      continue;
    }
    let b = m
      ? {
          errno: "ENOENT",
        }
      : yield {
          kind: "lstat",
          path: joined,
        };
    if (b === undefined || typeof b === "string" || "errno" in b) {
      if (
        typeof b === "object" &&
        "errno" in b &&
        b.errno !== undefined &&
        b.errno !== "ENOENT" &&
        b.errno !== "ENOTDIR" &&
        b.errno !== "ENAMETOOLONG"
      ) {
        if (
          typeof (yield {
            kind: "opendirNofollow",
            path: joined,
          }) === "string"
        ) {
          d = true;
          filtered.shift();
          o = joined;
          continue;
        }
      }
      if (
        n?.launchAncestry &&
        !d &&
        typeof b === "object" &&
        "errno" in b &&
        (b.errno === "EPERM" || b.errno === "EACCES") &&
        isSpelledStrictAncestor(joined, n.launchAncestry)
      ) {
        l = true;
        filtered.shift();
        o = joined;
        continue;
      }
      if (typeof b === "object" && "errno" in b && (b.errno === "ENOENT" || b.errno === "ENOTDIR"))
        n?.onOutcome?.({
          kind: "absent",
          at: o,
          remaining: [...filtered],
          fromLinkTarget: filtered.length > c,
          ...(b.errno === "ENOTDIR" && {
            notAFolder: true,
          }),
        });
      return unverifiedAncestryReason(b, n, u > 0, h(), S());
    }
    let A = b;
    d = true;
    if (!A.isSymbolicLink()) {
      filtered.shift();
      o = joined;
      continue;
    }
    u++;
    let x = joined + "\x00" + filtered.join("\x00");
    if ((g ??= new Set()).has(x)) return;
    g.add(x);
    let L = yield {
      kind: "readlink",
      path: joined,
    };
    if (typeof L !== "string") return unverifiedAncestryReason(L, n, u > 0, h(), S());
    let I = L;
    if (n?.literalLinkText === "opaque" && isOpaqueLinkText(I)) return OPAQUE_LINK_TEXT;
    if (!pathModule.isAbsolute(I)) {
      let filtered_2 = I.split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
      if (n?.surfaceNetworkRaw === true) {
        let U = collapseNetworkLanding(
          (o.endsWith(pathModule.sep) ? o : o + pathModule.sep) +
            [...filtered_2, ...filtered.slice(1)].join(pathModule.sep),
          anchors,
          n?.onCollapsedLanding,
        );
        if (U !== undefined) return U;
      }
      filtered.shift();
      n?.onHop?.({
        composed: pathModule.resolve(o, I, ...filtered),
        leaf: filtered.length === 0,
        text: I,
      });
      c = Math.min(c, filtered.length);
      filtered = [...filtered_2, ...filtered];
      continue;
    }
    let w = I;
    if (n?.surfaceNetworkRaw === true && filtered.length > 1 && isNetDir(w)) {
      let T = collapseNetworkLanding(
        [w, ...filtered.slice(1)].join(pathModule.sep),
        anchors,
        n?.onCollapsedLanding,
      );
      if (T !== undefined) return T;
    }
    if (
      (isUncOrDevicePath(w) && !isWslUncPath(w) && isForeignToAllNetworks(w, anchors)) ||
      (isNetworkMountPath(w) && isForeignToAllMounts(w, anchors)) ||
      (isUnderNetworkDir(w) &&
        !(isNetworkPathUnderAnchors(w, anchors) || (filtered.length > 1 && isAnchorUnderPath(w, anchors))))
    ) {
      filtered.shift();
      return joinRemainingSegments(w, filtered, n?.onCollapsedLanding);
    }
    if (
      n?.surfaceNetworkRaw === true &&
      hasDotSegment(w) &&
      (isUncOrDevicePath(w) || isNetworkMountRoot(w) || isUnderNetworkDirCached(w) || isNetDir(w))
    ) {
      filtered.shift();
      return filtered.length === 0 ? w : w + pathModule.sep + filtered.join(pathModule.sep);
    }
    filtered.shift();
    let F = pathModule.parse(w).root || pathModule.sep;
    let root = pathModule.parse(joined).root;
    let P = /^[\\/]$/.test(F) && root !== "" && !/^[\\/]$/.test(root);
    if (P && (n?.surfaceNetworkRaw === true || n?.unreadableAncestry === "unverified"))
      return UNVERIFIED_ANCESTRY;
    n?.onHop?.({
      composed: filtered.length === 0 ? w : pathModule.resolve(w, ...filtered),
      leaf: filtered.length === 0,
      text: I,
    });
    o = P ? root : F;
    d = false;
    c = Math.min(c, filtered.length);
    filtered = [...w.slice(F.length).split(PATH_SEPARATOR_RUN_RE).filter(Boolean), ...filtered];
  }
  if (filtered.length > 0 && n?.literalLinkText === "opaque") return OPAQUE_LINK_TEXT;
  if (filtered.length > 0) return UNVERIFIED_ANCESTRY;
  if (u > 0 && isNetDir(o)) return o;
  if (isUnderNetworkDir(o) && !isNetworkPathUnderAnchors(o, anchors)) return o;
  if (filtered.length === 0)
    n?.onOutcome?.({
      kind: "resolved",
      path: o,
    });
  return;
}
//@ chunk-cgr0tezp.js:27079-27452 placement
function safeResolvePath(fsImplementation, n) {
  if ((isUncOrDevicePath(n) && !isWslUncPath(n)) || isNetworkMountPath(n) || neverOtherHostMount(n))
    return {
      resolvedPath: n,
      isSymlink: false,
      isCanonical: false,
    };
  let intermediateUncJunction = findIntermediateUncJunction(fsImplementation, n);
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
    return {
      resolvedPath: n,
      isSymlink: false,
      isCanonical: false,
    };
  if (intermediateUncJunction !== undefined)
    return {
      resolvedPath: intermediateUncJunction,
      isSymlink: true,
      isCanonical: false,
    };
  try {
    let i = realpathExaminedSync(fsImplementation, n);
    return {
      resolvedPath: i,
      isSymlink: i !== n,
      isCanonical: true,
    };
  } catch (error) {
    return {
      resolvedPath: n,
      isSymlink: false,
      isCanonical: false,
    };
  }
}
//@ chunk-cgr0tezp.js:27452-27808 placement
function vouchedLaunchAncestry(fsImplementation) {
  let n = launchCwd();
  if (n === null) return null;
  try {
    let resolved = pathModule.resolve(n);
    let resolved_2 = pathModule.resolve(fsImplementation.cwd());
    let root = pathModule.parse(resolved).root;
    if (root !== pathModule.parse(resolved_2).root) return null;
    let filtered = resolved.slice(root.length).split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
    let filtered_2 = resolved_2.slice(root.length).split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
    let u = 0;
    while (u < filtered.length && u < filtered_2.length && filtered[u] === filtered_2[u]) u++;
    return u > 0 ? pathModule.join(root, ...filtered.slice(0, u)) : null;
  } catch {
    return null;
  }
}
//@ chunk-cgr0tezp.js:27808-28206 placement
function realpathExaminedSync(fsImplementation, n) {
  try {
    return fsImplementation.realpathSync(n);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "EPERM" && errnoCode !== "EACCES") throw error;
    let s;
    let launchAncestry = vouchedLaunchAncestry(fsImplementation);
    if (
      findIntermediateUncJunction(fsImplementation, n, {
        unreadableAncestry: "unverified",
        surfaceNetworkRaw: true,
        launchAncestry,
        onOutcome: (u) => {
          s = u;
        },
      }) !== undefined ||
      s === undefined
    )
      throw error;
    if (s.kind === "absent")
      throw Object.assign(Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
        syscall: "realpath",
        path: n,
      });
    return identity(s.path);
  }
}
//@ chunk-cgr0tezp.js:28206-28244 placement
var SYMLINK_TO_NETWORK_PATH_CODE = "ERR_SYMLINK_TO_NETWORK_PATH";
//@ chunk-cgr0tezp.js:28244-28406 placement
function vetRepoSettingsPath(fsImplementation, path, r) {
  let { asWritten, opts } = refuseUnvettablePath(fsImplementation, path, r);
  let linksResolvedPath;
  let absentAt;
  refuseUnexaminedPath(
    findIntermediateUncJunction(fsImplementation, asWritten, {
      ...opts,
      onOutcome: (target) => {
        linksResolvedPath = getResolvedPath(target);
        absentAt = absentSpellingInfo(target);
      },
    }),
    path,
    asWritten,
  );
  return {
    ...plainResolvedPathInfo(asWritten),
    linksResolvedPath,
    absentAt,
  };
}
//@ chunk-cgr0tezp.js:28406-29083 placement
async function vetRepoSettingsPathAsync(fsImplementation, path, r) {
  let { asWritten, opts, ownHost } = refuseUnvettablePath(fsImplementation, path, r);
  let linksResolvedPath;
  let absentAt;
  let c;
  let l;
  let d = !ownHost;
  let g = false;
  let y;
  let h = [];
  let S = {
    ...opts,
    onOutcome: (target) => {
      g = true;
      linksResolvedPath = getResolvedPath(target);
      absentAt = absentSpellingInfo(target);
      let m = y;
      let b = target.kind === "resolved" && m?.path === target.path;
      d = !b;
      l = b ? m.stats : undefined;
      c =
        b && !isSentinelInode(m.stats.ino)
          ? {
              dev: m.stats.dev,
              ino: m.stats.ino,
              ctimeNs: m.stats.ctimeNs,
            }
          : undefined;
    },
  };
  refuseUnexaminedPath(
    await findIntermediateUncJunctionAsync(
      fsImplementation,
      asWritten,
      S,
      undefined,
      r?.fileIdentity === true
        ? (path, m) => {
            y =
              m === undefined
                ? undefined
                : {
                    path,
                    stats: m,
                  };
            if (m?.isSymbolicLink() === true) h.push(m);
          }
        : undefined,
    ),
    path,
    asWritten,
  );
  if (!g && y?.stats.isSymbolicLink() === true) d = true;
  return {
    ...plainResolvedPathInfo(asWritten),
    linksResolvedPath,
    absentAt,
    ...(c !== undefined && {
      identity: c,
    }),
    ...(l !== undefined && {
      endStats: l,
    }),
    ...(r?.fileIdentity === true && {
      linksFollowed: h,
    }),
    ...(r?.fileIdentity === true &&
      d && {
        noFileSeen: true,
      }),
  };
}
//@ chunk-cgr0tezp.js:29143-29287 placement
function absentSpellingInfo(e) {
  return e.kind === "absent"
    ? {
        at: e.at,
        remaining: e.remaining,
        fromLinkTarget: e.fromLinkTarget,
        ...(e.notAFolder && {
          notAFolder: true,
        }),
      }
    : undefined;
}
//@ chunk-cgr0tezp.js:29287-29988 placement
/**
 * 设备命名空间路径拒绝读取。
 */
function refuseUnvettablePath(e, n, r) {
  let uncLongPath = toUncLongPath(n);
  if (isDeviceNamespacePath(uncLongPath) || isDevicePrefixPath(uncLongPath))
    throw Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a device-namespace spelling; use the plain drive or share path)",
      ),
      {
        code: SYMLINK_TO_NETWORK_PATH_CODE,
        path: n,
        reason: "unexamined",
      },
    );
  let s = pathModule.isAbsolute(uncLongPath)
    ? pathModule.resolve(uncLongPath)
    : pathModule.resolve(process.cwd(), uncLongPath);
  let uncLongPath_2 = toUncLongPath(s);
  if (isDeviceNamespacePath(uncLongPath_2) || isDevicePrefixPath(uncLongPath_2))
    throw Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a device-namespace spelling; use the plain drive or share path)",
      ),
      {
        code: SYMLINK_TO_NETWORK_PATH_CODE,
        path: n,
        reason: "unexamined",
      },
    );
  let a =
    isUnderNetworkDir(uncLongPath_2) ||
    isNetworkMountPath(uncLongPath_2) ||
    (isUncOrDevicePath(uncLongPath_2) && !isWslUncPath(uncLongPath_2));
  return {
    asWritten: uncLongPath_2,
    ownHost: a,
    opts: {
      ...(a && {
        anchors: [uncLongPath_2],
      }),
      surfaceNetworkRaw: true,
      ...((!a || r?.failClosed) && {
        unreadableAncestry: "unverified",
        launchAncestry: vouchedLaunchAncestry(e),
      }),
    },
  };
}
//@ chunk-cgr0tezp.js:29988-30054 placement
function plainResolvedPathInfo(resolvedPath) {
  return {
    resolvedPath,
    isSymlink: false,
    isCanonical: false,
  };
}
//@ chunk-cgr0tezp.js:30054-30618 placement
/**
 * 无法检查的路径拒绝读取。
 */
function refuseUnexaminedPath(intermediateUncJunction, path, asWritten) {
  if (intermediateUncJunction === undefined) return;
  let i = (reason) =>
    Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a component that could not be examined, or a symbolic link chain too long to follow)",
      ),
      {
        code: SYMLINK_TO_NETWORK_PATH_CODE,
        path,
        reason,
      },
    );
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY) throw i("unexamined");
  if (isUnderNetworkDir(asWritten) && intermediateUncJunction === asWritten) return;
  if (!(
    isUncOrDevicePath(intermediateUncJunction) ||
    isNetworkMountRoot(intermediateUncJunction) ||
    isUnderNetworkDir(intermediateUncJunction) ||
    isNetDir(intermediateUncJunction)
  ))
    throw i("unexamined");
  throw Object.assign(
    Error(
      "Refusing to read a file through a symbolic link that leads onto a network share or automount path; replace the link with a regular file to use it",
    ),
    {
      code: SYMLINK_TO_NETWORK_PATH_CODE,
      path,
      reason: "network",
    },
  );
}
//@ chunk-cgr0tezp.js:30618-30652 placement
function isSymlinkToNetworkPathError(e) {
  return getErrnoCode(e) === SYMLINK_TO_NETWORK_PATH_CODE;
}
//@ chunk-cgr0tezp.js:30652-30749 placement
function repoSettingsRefusalReason(e) {
  if (!isSymlinkToNetworkPathError(e)) return;
  let reason = e.reason;
  return reason === "network" || reason === "unexamined" ? reason : undefined;
}
//@ chunk-cgr0tezp.js:30749-30837 placement
function isDuplicatePath(e, n, loadedPaths) {
  let { resolvedPath } = safeResolvePath(e, n);
  if (loadedPaths.has(resolvedPath)) return true;
  loadedPaths.add(resolvedPath);
  return false;
}
//@ chunk-cgr0tezp.js:30837-30869 placement
var DOTDOT_SEGMENT_PATTERN = /(^|[\\/])\.\.([\\/]|$)/;
//@ chunk-cgr0tezp.js:30869-31047 placement
function stripDotSegments(e, n = "linux") {
  let replaced = e.replace(n === "win32" ? /[\\/]\.(?=[\\/]|$)/g : /\/\.(?=\/|$)/g, "");
  if (replaced === "") return e[0];
  if (n === "win32" && /^[A-Za-z]:$/.test(replaced)) return replaced + e[2];
  return replaced;
}
//@ chunk-cgr0tezp.js:31047-32818 placement = resolveDeepestExistingAncestorSync (0.643)
/**
 * 对不存在的路径，找到最深的已存在祖先并 realpath，再拼回剩余部分（权限检查用于新建文件）。
 */
function resolveDeepestExistingAncestorSync(fsImplementation, path, r) {
  let anchors = getAnchors(r);
  if (
    (isUncOrDevicePath(path) && !isWslUncPath(path)) ||
    isNetworkMountPath(path) ||
    neverOtherHostMount(path)
  ) {
    if (
      anchors !== undefined &&
      ((isNetworkMountPath(path) && !isForeignToAllMounts(path, anchors)) ||
        (isUncOrDevicePath(path) && !isWslUncPath(path) && !isForeignToAllNetworks(path, anchors)))
    ) {
      let intermediateUncJunction = findIntermediateUncJunction(fsImplementation, path, {
        anchors,
        surfaceNetworkRaw: r?.surfaceNetworkRaw,
      });
      if (intermediateUncJunction === UNVERIFIED_ANCESTRY && r?.surfaceNetworkRaw !== true) {
        if (r?.surfaceDotDotTargets === true) throw hopCapExhausted(path);
        return path;
      }
      return intermediateUncJunction;
    }
    return path;
  }
  let intermediateUncJunction = findIntermediateUncJunction(
    fsImplementation,
    path,
    r?.surfaceNetworkRaw === true
      ? {
          surfaceNetworkRaw: true,
          anchors,
        }
      : undefined,
  );
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY && r?.surfaceNetworkRaw !== true) {
    if (r?.surfaceDotDotTargets === true) throw hopCapExhausted(path);
    return;
  }
  if (intermediateUncJunction !== undefined)
    return r?.liveRoutesOnly === true ? undefined : intermediateUncJunction;
  let o = path;
  let segments = [];
  let u = r?.surfaceDotDotTargets === true;
  let c = (l) =>
    segments.length === 0
      ? l
      : u && DOTDOT_SEGMENT_PATTERN.test(l)
        ? [l, ...segments].join(pathModule.sep)
        : pathModule.join(l, ...segments);
  while (o !== pathModule.dirname(o)) {
    let l;
    let d;
    try {
      l = fsImplementation.readlinkSync(o);
    } catch (error) {
      d = getErrnoCode(error);
    }
    if (l !== undefined) {
      if (u && DOTDOT_SEGMENT_PATTERN.test(l))
        return c(pathModule.isAbsolute(l) ? l : pathModule.dirname(o) + pathModule.sep + l);
      let g = pathModule.isAbsolute(l) ? l : pathModule.resolve(pathModule.dirname(o), l);
      if (
        (isUncOrDevicePath(g) && !isWslUncPath(g)) ||
        isNetworkMountPath(g) ||
        neverOtherHostMount(g) ||
        isMacSpecialPath(g) ||
        (r?.surfaceNetworkRaw === true && hasDotSegment(g))
      ) {
        if (r?.liveRoutesOnly === true) return;
        return r?.surfaceNetworkRaw === true && segments.length > 0
          ? g + pathModule.sep + segments.join(pathModule.sep)
          : c(g);
      }
      try {
        let y = realpathExaminedSync(fsImplementation, o);
        return c(y);
      } catch {
        if (r?.liveRoutesOnly === true) return;
        let y = o;
        let h = 0;
        let S = 64;
        while (h < S) {
          let f;
          try {
            f = fsImplementation.readlinkSync(y);
          } catch {
            break;
          }
          if (u && DOTDOT_SEGMENT_PATTERN.test(f)) {
            y = pathModule.isAbsolute(f) ? f : pathModule.dirname(y) + pathModule.sep + f;
            break;
          }
          let m = pathModule.isAbsolute(f)
            ? u
              ? stripDotSegments(f)
              : f
            : pathModule.resolve(pathModule.dirname(y), f);
          if (
            (isUncOrDevicePath(m) && !isWslUncPath(m) && isForeignToAllNetworks(m, anchors)) ||
            (isNetworkMountPath(m) && isForeignToAllMounts(m, anchors)) ||
            neverOtherHostMount(m) ||
            isMacSpecialPath(m) ||
            (r?.surfaceNetworkRaw === true && hasDotSegment(m))
          ) {
            y = m;
            break;
          }
          let b;
          try {
            b = fsImplementation.lstatSync(m);
          } catch {
            y = m;
            break;
          }
          if (!b.isSymbolicLink()) {
            y = m;
            break;
          }
          y = m;
          h++;
        }
        if (h >= S && r?.surfaceNetworkRaw === true) return UNVERIFIED_ANCESTRY;
        return r?.surfaceNetworkRaw === true &&
          segments.length > 0 &&
          ((isUncOrDevicePath(y) && !isWslUncPath(y)) ||
            isNetworkMountPath(y) ||
            neverOtherHostMount(y) ||
            isMacSpecialPath(y) ||
            hasDotSegment(y))
          ? y + pathModule.sep + segments.join(pathModule.sep)
          : c(y);
      }
    }
    if (d === "ENOENT") {
      segments.unshift(pathModule.basename(o));
      o = pathModule.dirname(o);
      continue;
    }
    try {
      let g = realpathExaminedSync(fsImplementation, o);
      if (g !== o) return c(g);
    } catch (error) {
      if (u) throw error;
    }
    return;
  }
  return;
}
//@ chunk-cgr0tezp.js:32818-32868 placement
function isSpecialPath(e) {
  return (isUncOrDevicePath(e) && !isWslUncPath(e)) || isNetworkMountRoot(e) || isDeviceNamespacePath(e);
}
//@ chunk-cgr0tezp.js:32868-32903 placement
function expandWin32ExistingLongNames(e) {
  return resolveViaDeepestExistingAncestor(e, false) ?? e;
}
//@ chunk-cgr0tezp.js:32903-32935 placement
function expandWin32ExistingLongNamesStrict(e) {
  return resolveViaDeepestExistingAncestor(e, true);
}
//@ chunk-cgr0tezp.js:32935-33259 placement
/**
 * 找到最深的存在的祖先目录。
 */
function resolveViaDeepestExistingAncestor(e, n) {
  if (isSpecialPath(e)) return e;
  let r = e;
  let i = "";
  for (;;) {
    if (!hasDotSegment(r)) {
      let o = realpathCacheEntry(r);
      if (o !== null) {
        let a = i === "" ? o : o.endsWith(pathModule.sep) ? o + i : o + pathModule.sep + i;
        if (isSpecialPath(a)) return n ? a : e;
        return a;
      }
      if (n)
        try {
          fsModule.lstatSync(r);
          return null;
        } catch (error) {
          if (!isENOENT(error)) return null;
        }
    }
    let dir = pathModule.dirname(r);
    if (dir === r) return e;
    i = i === "" ? pathModule.basename(r) : pathModule.basename(r) + pathModule.sep + i;
    r = dir;
  }
}
//@ chunk-cgr0tezp.js:33259-33300 placement
function walkPermissionCheckPaths(e) {
  return walkPathSpellingsSync(e, "permission");
}
//@ chunk-cgr0tezp.js:33300-33349 placement
function walkPermissionCheckPathsAsync(e, signal, r) {
  return vetPathAsync(e, "permission", signal, r);
}
//@ chunk-cgr0tezp.js:33349-33764 placement
/**
 * 异步执行路径检查步骤。
 */
function vetPathAsync(e, n, r, i) {
  let fsImplementation = getFsImplementation();
  return runFsSteps(
    vetPathSteps(e, n),
    r,
    i === undefined ? undefined : (o) => i(o.path),
    async (o) => {
      switch (o.kind) {
        case "lstat":
          return fsImplementation.lstat(o.path);
        case "opendirNofollow":
          await fsImplementation.openDirNoFollow(o.path);
          return "ok";
        case "readlink":
          return fsImplementation.readlink(o.path);
        case "realpath":
          return fsImplementation === NodeFsOperations
            ? identity(await realpathPromise(o.path))
            : fsImplementation.realpath(o.path);
      }
    },
    {
      unresolved: true,
      requested: e,
      spellings: [e],
      stoppedAt: e,
      leafIsSymlink: false,
      reason: "cut-short",
    },
  );
}
//@ chunk-cgr0tezp.js:33764-33805 placement
function getPathsForNetworkScreen(e) {
  return toPathCheckResult(walkPathSpellingsSync(e, "screen"));
}
//@ chunk-cgr0tezp.js:33805-33937 placement
function toPathCheckResult(e) {
  return {
    paths: e.spellings,
    vetted: !e.unresolved,
    ...(!e.unresolved &&
      e.linkTextClimbs && {
        linkTextClimbs: e.linkTextClimbs,
      }),
  };
}
//@ chunk-cgr0tezp.js:33937-33998 placement
async function getPathsForNetworkScreenAsync(e) {
  return toPathCheckResult(await vetPathAsync(e, "screen", undefined));
}
//@ chunk-cgr0tezp.js:33998-34261 placement
/**
 * 同步驱动 pathSpellingWalker（lstat/readlink/opendir），得到路径的全部拼写。
 */
function walkPathSpellingsSync(e, n) {
  let fsImplementation = getFsImplementation();
  return returnValue(vetPathSteps(e, n), (i) => {
    switch (i.kind) {
      case "lstat":
        return fsImplementation.lstatSync(i.path);
      case "opendirNofollow":
        fsImplementation.openDirNoFollowSync(i.path);
        return "ok";
      case "readlink":
        return fsImplementation.readlinkSync(i.path);
      case "realpath":
        return fsImplementation.realpathSync(i.path);
    }
  });
}
//@ chunk-cgr0tezp.js:34261-36346 placement
/**
 * 路径拼写生成器：展开 ~、逐段跟随符号链接，产出路径的全部等价拼写，供权限检查确保规则对真实位置生效；通过 yield 请求 lstat/readlink，可同步或异步驱动。
 */
function* vetPathSteps(e, n) {
  let r = e;
  if (r === "~") r = homedir().normalize("NFC");
  else if (r.startsWith("~/")) r = pathModule.join(homedir().normalize("NFC"), r.slice(2));
  let i = new Set([r]);
  let s = false;
  let o = (landing, leafIsSymlink = false) => ({
    unresolved: false,
    requested: r,
    spellings: Array.from(i),
    landing,
    leafIsSymlink,
    ...(s && {
      linkTextClimbs: s,
    }),
  });
  if ((isUncOrDevicePath(r) && !isWslUncPath(r)) || isNetworkMountPath(r) || neverOtherHostMount(r))
    return o(r);
  let fsImplementation = getFsImplementation();
  let launchAncestry = vouchedLaunchAncestry(fsImplementation);
  let c;
  let l;
  let d = false;
  let g = false;
  let y = false;
  let h = false;
  let S = [];
  let f = new Set();
  let m = (composed) => {
    let resolved = pathModule.resolve(composed);
    if (!f.has(resolved)) {
      f.add(resolved);
      S.push(composed);
    }
  };
  let stoppedAt = r;
  let A;
  let x = function* (path) {
    let v;
    for (;;) {
      let j = path.next(v);
      if (j.done) return j.value;
      let G = j.value;
      stoppedAt = G.path;
      if (G.kind === "readlink") g = true;
      else A = undefined;
      v = yield G;
      if (typeof v === "object" && "errno" in v)
        if (G.kind === "readlink") y = true;
        else {
          A = v.errno;
          h ||= G.kind === "opendirNofollow" && v.errno === "ELOOP";
        }
    }
  };
  let L = yield* x(
    resolvePathSafely(r, {
      unreadableAncestry: "unverified",
      launchAncestry,
      ...false,
      onCollapsedLanding: (R) => {
        c = R;
      },
      onOutcome: (R) => {
        l = R;
      },
      onHop: ({ composed, leaf, text }) => {
        if (leaf) {
          i.add(composed);
          d = true;
        }
        if (n === "screen" && hasParentSegment(text)) {
          s = true;
          m(composed);
        }
      },
    }),
  );
  let I = n === "permission" && !g && (A === "ENAMETOOLONG" || A === "EACCES" || A === "EPERM");
  let w = () => {
    let R = identity(r);
    i.add(R);
    return o(R);
  };
  let M = () =>
    I
      ? w()
      : {
          unresolved: true,
          requested: r,
          spellings: Array.from(i),
          stoppedAt,
          leafIsSymlink: d,
          reason: g || h ? "past-a-link" : "unexamined",
        };
  let F = 8;
  let O = function* () {
    for (let idx = 0; idx < S.length; idx++) {
      if (idx >= F) return false;
      let v = S[idx];
      if ((isUncOrDevicePath(v) && !isWslUncPath(v)) || isNetworkMountPath(v) || neverOtherHostMount(v)) {
        i.add(v);
        continue;
      }
      let j = yield* x(
        resolvePathSafely(v, {
          unreadableAncestry: "unverified",
          launchAncestry,
          onHop: ({ composed, text }) => {
            if (hasParentSegment(text)) m(composed);
          },
        }),
      );
      if (j === UNVERIFIED_ANCESTRY || y) return false;
      if (j !== undefined) i.add(j);
    }
    return true;
  };
  if (L === UNVERIFIED_ANCESTRY || L === OPAQUE_LINK_TEXT) return M();
  if (L !== undefined) {
    if (n === "screen" && !(yield* O())) return M();
    if (c !== undefined) i.add(c);
    i.delete(L);
    i.add(L);
    return o(L, d);
  }
  if (l === undefined) {
    if (n === "screen" && !y) return (yield* O()) ? w() : M();
    return M();
  }
  if (
    l.kind === "absent" &&
    (n === "screen"
      ? l.remaining.some((R) => hasDotSegment(R))
      : g && l.remaining.some((R) => hasDotSegmentAlias(R)))
  )
    return M();
  let P = l.kind === "absent" ? l.at : l.path;
  let Z = l.kind === "absent" ? l.remaining.join(pathModule.sep) : "";
  let T = identity(Z === "" ? P : pathModule.join(P, Z));
  if (g || P !== pathModule.parse(P).root) i.add(T);
  let U = joinIfChanged(
    yield {
      kind: "realpath",
      path: P,
    },
    P,
    Z,
  );
  if (U !== undefined && U !== T) {
    i.delete(U);
    i.add(U);
  }
  if (n === "screen" && !(yield* O())) return M();
  return o(T, d);
}
//@ chunk-cgr0tezp.js:36346-36430 placement
function joinIfChanged(e, n, r) {
  if (typeof e !== "string" || e === n) return;
  return r === "" ? e : pathModule.join(e, r);
}
//@ chunk-cgr0tezp.js:36430-36521 placement
function resolvedSpellingWalk(resolvedPath) {
  return {
    unresolved: false,
    requested: resolvedPath,
    spellings: [resolvedPath],
    landing: resolvedPath,
    leafIsSymlink: false,
  };
}
//@ chunk-cgr0tezp.js:36521-36554 placement
function getPathsForPermissionCheck(e) {
  return permissionCheckSpellings(walkPermissionCheckPaths(e));
}
//@ chunk-cgr0tezp.js:36554-36743 placement
function permissionCheckSpellings(e) {
  if (!e.unresolved) return e.spellings;
  let { resolvedPath, isCanonical, isSymlink } = safeResolvePath(getFsImplementation(), e.requested);
  return (isCanonical || isSymlink) && !e.spellings.includes(resolvedPath)
    ? [...e.spellings, resolvedPath]
    : e.spellings;
}
//@ chunk-cgr0tezp.js:36743-40014 placement = NodeFsOperations (0.851)
var NodeFsOperations = {
  cwd() {
    return process.cwd();
  },
  existsSync(fsPath) {
    using n = slowLogging`fs.existsSync(${fsPath})`;
    return fsModule.existsSync(fsPath);
  },
  async stat(fsPath) {
    return stat(fsPath);
  },
  async lstat(e) {
    return lstat(e);
  },
  async openDirNoFollow(e) {
    await (await open(e, fsModule.constants.O_DIRECTORY | fsModule.constants.O_NOFOLLOW)).close();
  },
  openDirNoFollowSync(e) {
    let n = fsModule.openSync(e, fsModule.constants.O_DIRECTORY | fsModule.constants.O_NOFOLLOW);
    fsModule.closeSync(n);
  },
  async lstatBigint(e) {
    return lstat(e, {
      bigint: true,
    });
  },
  async statBigint(e) {
    return stat(e, {
      bigint: true,
    });
  },
  async readdir(fsPath) {
    return readdir(fsPath, {
      withFileTypes: true,
    });
  },
  async unlink(fsPath) {
    return unlink(fsPath);
  },
  async rmdir(fsPath) {
    return rmdir(fsPath);
  },
  async rm(fsPath, options) {
    return rm(fsPath, options);
  },
  async mkdir(dirPath, options) {
    try {
      await mkdir(dirPath, {
        recursive: true,
        ...options,
      });
    } catch (e) {
      if (getErrnoCode(e) !== "EEXIST") throw e;
    }
  },
  async readFile(fsPath, options) {
    return readFile(fsPath, {
      encoding: options.encoding,
    });
  },
  async rename(oldPath, newPath) {
    return rename(oldPath, newPath);
  },
  async realpath(e) {
    return identity(await realpath(e));
  },
  async readlink(e) {
    return readlink(e);
  },
  async copyFile(e, n) {
    return copyFile(e, n);
  },
  async appendFile(path, data, options) {
    if (options?.mode !== undefined)
      try {
        let fd = await open(path, "ax", options.mode);
        try {
          await fd.appendFile(data);
        } finally {
          await fd.close();
        }
        return;
      } catch (e) {
        if (getErrnoCode(e) !== "EEXIST") throw e;
      }
    return appendFile(path, data);
  },
  async symlink(e, n, r) {
    return symlink(e, n, r);
  },
  async link(e, n) {
    return link(e, n);
  },
  async chmod(e, n) {
    return chmod(e, n);
  },
  statSync(fsPath) {
    using n = slowLogging`fs.statSync(${fsPath})`;
    return fsModule.statSync(fsPath);
  },
  lstatSync(fsPath) {
    using n = slowLogging`fs.lstatSync(${fsPath})`;
    return fsModule.lstatSync(fsPath);
  },
  readFileSync(fsPath, options) {
    using r = slowLogging`fs.readFileSync(${fsPath})`;
    return fsModule.readFileSync(fsPath, {
      encoding: options.encoding,
    });
  },
  readSync(fsPath, options) {
    using r = slowLogging`fs.readSync(${fsPath}, ${options.length} bytes)`;
    let fd = undefined;
    try {
      fd = fsModule.openSync(fsPath, "r");
      let s = [];
      let o = 0;
      while (o < options.length) {
        let u = Buffer.allocUnsafe(Math.min(65536, options.length - o));
        let sync = fsModule.readSync(fd, u, 0, u.length, o);
        if (sync === 0) break;
        s.push(u.subarray(0, sync));
        o += sync;
      }
      return {
        buffer: Buffer.concat(s, o),
        bytesRead: o,
      };
    } finally {
      if (fd !== undefined) fsModule.closeSync(fd);
    }
  },
  appendFileSync(path, data, options) {
    using i = slowLogging`fs.appendFileSync(${path}, ${data.length} chars)`;
    if (options?.mode !== undefined)
      try {
        let fd = fsModule.openSync(path, "ax", options.mode);
        try {
          fsModule.appendFileSync(fd, data);
        } finally {
          fsModule.closeSync(fd);
        }
        return;
      } catch (e) {
        if (getErrnoCode(e) !== "EEXIST") throw e;
      }
    fsModule.appendFileSync(path, data);
  },
  unlinkSync(path) {
    using n = slowLogging`fs.unlinkSync(${path})`;
    fsModule.unlinkSync(path);
  },
  renameSync(oldPath, newPath) {
    using r = slowLogging`fs.renameSync(${oldPath} ${RENAME_ARROW} ${newPath})`;
    fsModule.renameSync(oldPath, newPath);
  },
  readlinkSync(path) {
    using n = slowLogging`fs.readlinkSync(${path})`;
    return fsModule.readlinkSync(path);
  },
  realpathSync(path) {
    using n = slowLogging`fs.realpathSync(${path})`;
    return identity(fsModule.realpathSync(path));
  },
  mkdirSync(dirPath, options) {
    using r = slowLogging`fs.mkdirSync(${dirPath})`;
    let mkdirOptions = {
      recursive: true,
    };
    if (options?.mode !== undefined) mkdirOptions.mode = options.mode;
    try {
      fsModule.mkdirSync(dirPath, mkdirOptions);
    } catch (e) {
      if (getErrnoCode(e) !== "EEXIST") throw e;
    }
  },
  readdirSync(dirPath) {
    using n = slowLogging`fs.readdirSync(${dirPath})`;
    return fsModule.readdirSync(dirPath, {
      withFileTypes: true,
    });
  },
  rmSync(dirPath, options) {
    using r = slowLogging`fs.rmSync(${dirPath})`;
    fsModule.rmSync(dirPath, options);
  },
  createWriteStream(e) {
    return fsModule.createWriteStream(e);
  },
  async readFileBytes(e, n) {
    if (n === undefined) return readFile(e);
    let r = await open(e, nonblockingReadFlags());
    try {
      if (!(await r.stat()).isFile()) return Buffer.alloc(0);
      return await readHandleUpTo(r, n, "file");
    } finally {
      await r.close();
    }
  },
  async readFileFdGated(fsPath, n) {
    try {
      let r = noFollowNonblockFlags();
      if (r === 0) {
        if (!(await lstat(fsPath)).isFile()) return null;
      }
      let handle = await open(fsPath, fsModule.constants.O_RDONLY | r);
      try {
        let stats = await handle.stat();
        if (!stats.isFile() || stats.size > n) return null;
        let readSize = Number(stats.size);
        let buffer = Buffer.allocUnsafe(readSize);
        let offset = 0;
        while (offset < readSize) {
          let { bytesRead } = await handle.read(buffer, offset, readSize - offset, offset);
          if (bytesRead === 0) break;
          offset += bytesRead;
        }
        return {
          content: (offset < readSize ? buffer.subarray(0, offset) : buffer).toString("utf8"),
          stats,
        };
      } finally {
        await handle.close();
      }
    } catch {
      return null;
    }
  },
};
//@ chunk-cgr0tezp.js:40014-40038 placement = getFsImplementation (0)
/**
 * 返回全局文件系统抽象 NodeFsOperations（同步/异步 fs 包装，可在测试或宿主模式下替换）。全局约 400 处调用，项目内几乎所有文件读写都经过它。
 */
function getFsImplementation() {
  return NodeFsOperations;
}
//@ chunk-cgr0tezp.js:40038-40367 placement
function processChdir(e) {
  let n;
  try {
    n = process.cwd();
  } catch {}
  process.chdir(e);
  let r;
  try {
    r = process.cwd();
  } catch {
    r = e;
  }
  if (!isBunVirtualPath(r)) return n;
  if (n !== undefined)
    try {
      process.chdir(n);
      process.cwd();
    } catch {}
  throw Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, chdir '${e}'`,
      "ENOENT: no such file or directory",
    ),
    {
      code: "ENOENT",
      syscall: "chdir",
      path: e,
    },
  );
}
//@ chunk-cgr0tezp.js:40367-40709 placement = readFileRange (1)
async function readFileRange(path, offset, maxBytes) {
  await using i = typeof path === "string" ? await open(path, "r") : null;
  let s = typeof path === "string" ? i : path;
  let size = (await s.stat()).size;
  if (size <= offset) return null;
  let bytesToRead = Math.min(size - offset, maxBytes);
  let buffer = Buffer.allocUnsafe(bytesToRead);
  let totalRead = 0;
  while (totalRead < bytesToRead) {
    let { bytesRead } = await s.read(buffer, totalRead, bytesToRead - totalRead, offset + totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return {
    content: buffer.toString("utf8", 0, totalRead),
    bytesRead: totalRead,
    bytesTotal: size,
  };
}
//@ chunk-cgr0tezp.js:40709-40974 placement
/**
 * 读取文件末尾若干字节/行（日志、转录尾部读取用）。
 */
async function readHandleUpTo(e, n, r) {
  let i = r !== undefined ? r === "file" : (await e.stat()).isFile();
  let s = [];
  let o = 0;
  while (o < n) {
    let buffer = Buffer.allocUnsafe(Math.min(65536, n - o));
    let { bytesRead } = await e.read(buffer, 0, buffer.length, i ? o : null);
    if (bytesRead === 0) break;
    s.push(buffer.subarray(0, bytesRead));
    o += bytesRead;
  }
  return Buffer.concat(s, o);
}
//@ chunk-cgr0tezp.js:40974-41352 placement = readFileRange (1)
/**
 * 按字节范围读取文件片段。
 */
async function tailFile(e, offset) {
  await using r = typeof e === "string" ? await open(e, "r") : null;
  let i = typeof e === "string" ? r : e;
  let size = (await i.stat()).size;
  if (size === 0)
    return {
      content: "",
      bytesRead: 0,
      bytesTotal: 0,
    };
  let offset_2 = Math.max(0, size - offset);
  let bytesToRead = size - offset_2;
  let buffer = Buffer.allocUnsafe(bytesToRead);
  let totalRead = 0;
  while (totalRead < bytesToRead) {
    let { bytesRead } = await i.read(buffer, totalRead, bytesToRead - totalRead, offset_2 + totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return {
    content: buffer.toString("utf8", 0, totalRead),
    bytesRead: totalRead,
    bytesTotal: size,
  };
}
//@ chunk-cgr0tezp.js:41352-41804 placement
async function* readLines(e, n = 65536) {
  let r = await open(e, "r");
  let i = Buffer.alloc(n);
  let s = 0;
  let o = [];
  let a = 0;
  try {
    while (true) {
      let { bytesRead } = await r.read(i, 0, n, s);
      if (bytesRead === 0) break;
      s += bytesRead;
      let chunk = i.subarray(0, bytesRead);
      let l = 0;
      while (l < bytesRead) {
        let index = chunk.indexOf(10, l);
        if (index === -1) {
          o.push(Buffer.from(chunk.subarray(l)));
          a += bytesRead - l;
          break;
        }
        if (a === 0) yield chunk.subarray(l, index);
        else {
          yield Buffer.concat([...o, chunk.subarray(l, index)], a + (index - l));
          o = [];
          a = 0;
        }
        l = index + 1;
      }
    }
  } finally {
    await r.close();
  }
  if (a > 0) yield o.length === 1 ? o[0] : Buffer.concat(o, a);
}
//@ chunk-cgr0tezp.js:41804-41815 placement
var REVERSE_READ_OVERLAP_BYTES = 256;
//@ chunk-cgr0tezp.js:41815-42032 placement
class FileChangedDuringReadError extends Error {
  partialRead;
  constructor(partialRead = false) {
    super("A file changed while it was being read, so the lines read from it may not be its current lines");
    this.partialRead = partialRead;
    this.name = "FileChangedDuringReadError";
  }
}
//@ chunk-cgr0tezp.js:42032-43018 placement
async function* readLinesReverse(e, n = 65536, { onOpen: r, strict: i = true } = {}) {
  let s = await open(e, "r");
  try {
    let { size } = await s.stat();
    r?.(size);
    let a = Buffer.allocUnsafe(Math.min(n + REVERSE_READ_OVERLAP_BYTES, size));
    let u = Buffer.allocUnsafe(Math.min(REVERSE_READ_OVERLAP_BYTES, size));
    let c = 0;
    let l = size;
    let d = 0;
    let g = size;
    let y;
    let h = async (f, m, b) => {
      let A = 0;
      while (A < m) {
        let L = await s.read(f, A, m - A, b + A);
        if (L.bytesRead === 0 || (i && L.bytesRead < m - A))
          throw new FileChangedDuringReadError(L.bytesRead > 0);
        A += L.bytesRead;
      }
      let x = l + d - b;
      if (!f.subarray(x, x + c).equals(u.subarray(0, c))) throw new FileChangedDuringReadError();
    };
    let S = async (f) => {
      let m = Math.max(g, l + d + c) - f;
      let b = Buffer.allocUnsafe(m);
      await h(b, m, f);
      return b.toString("utf8", 0, g - f);
    };
    while (l > 0) {
      c = Math.min(REVERSE_READ_OVERLAP_BYTES, d);
      a.copy(u, 0, 0, c);
      d = Math.min(n, l, i && l === size ? REVERSE_READ_OVERLAP_BYTES : 1 / 0);
      l -= d;
      await h(a, d + c, l);
      if (i) y ??= Buffer.from(a.subarray(Math.max(0, d - REVERSE_READ_OVERLAP_BYTES), d));
      let index = a.lastIndexOf(10, d - 1);
      while (index !== -1) {
        let m = l + index + 1;
        if (m < g) yield g <= l + d ? a.toString("utf8", index + 1, g - l) : await S(m);
        g = l + index;
        index = index === 0 ? -1 : a.lastIndexOf(10, index - 1);
      }
    }
    if (g > 0) yield g <= d ? a.toString("utf8", 0, g) : await S(0);
    if (y !== undefined) {
      l = size - y.length;
      d = 0;
      c = y.copy(u);
      await h(a, c, l);
    }
  } finally {
    await s.close();
  }
}
//@ chunk-cgr0tezp.js:43018-43122 placement
function createOffsetMappedText(e) {
  let int32Array = new Int32Array(e.length);
  for (let i = 0; i < e.length; i++) int32Array[i] = i;
  return {
    text: e,
    origin: int32Array,
  };
}
//@ chunk-e6aww6q8.js:1151949-1152000 placement
function resolveForPermissionCheck(e, n) {
  return isNonWslUncPath(n) || isMacSpecialPath(n) ? n : (resolveDeepestExistingAncestorSync(e, n) ?? n);
}
//@ chunk-e6aww6q8.js:1152000-1152140 layout
function isPathMatchedForPermission(e, n) {
  if (e === "") return false;
  if (e.startsWith("~")) {
    let r = expandTildeWithHome(e);
    if (r.startsWith("~")) return true;
    return getPathsForPermissionCheck_2(r, n) || getPathsForPermissionCheck_2(e, n);
  }
  return getPathsForPermissionCheck_2(e, n);
}
//@ chunk-e6aww6q8.js:1152140-1153141 callgraph-fingerprint = getPathsForPermissionCheck (0.425)
/**
 * 返回权限检查需要比对的路径集合（原始、规范化、符号链接解析后）。
 */
function getPathsForPermissionCheck_2(e, n) {
  let fsImpl = getFsImplementation();
  if (isMacSpecialPath(e)) return true;
  if ((!isNonWslUncPath(e) || true) && !isNetworkMountPath(e) && /(^|[/\\])\.\.(?:[/\\]|$)/.test(e)) {
    let Se = /\/+/;
    let root = isAbsolute(e) ? parse(e).root : "";
    let we = root ? parse(resolve_2(n, e)).root : n;
    let parts = (root ? e.slice(root.length) : e).split(Se);
    let Ae = we;
    for (let depth = 0; depth < parts.length; depth++) {
      let Me = parts[depth];
      if (Me === "" || Me === ".") continue;
      if (Me === "..") {
        Ae = dirname(Ae);
        continue;
      }
      Ae = Ae.endsWith(sep) ? Ae + Me : Ae + sep + Me;
      if (isNetworkMountPath(Ae)) break;
      if (isMacSpecialPath(Ae)) return true;
      try {
        if (fsImpl.lstatSync(Ae).isSymbolicLink() && parts.slice(depth + 1).includes("..")) return true;
      } catch {}
    }
  }
  let resolved = resolve_2(n, e);
  let normalized = resolveForPermissionCheck(fsImpl, resolved).normalize("NFC");
  let normalized_2 = (resolveDeepestExistingAncestorSync(fsImpl, n) ?? n).normalize("NFC");
  function S(Se) {
    let ke = relative(Se, normalized);
    if (ke === "" || ke.startsWith(".." + sep) || isAbsolute(ke)) return false;
    let replaced = ke
      .split(sep)
      .join("/")
      .toLowerCase()
      .replace(/\u0131/g, "i")
      .replace(/\u017f/g, "s");
    return GIT_INTERNAL_PATH_PATTERNS.some((Ee) => Ee.test(replaced));
  }
  if (S(normalized_2)) return true;
  if (!relative(normalized_2, normalized).startsWith(".." + sep)) return false;
  let originalCwd = getOriginalCwd();
  let normalized_3 = (resolveDeepestExistingAncestorSync(fsImpl, originalCwd) ?? originalCwd).normalize(
    "NFC",
  );
  let q = relative(normalized_3, normalized);
  if (q === "" || q.startsWith(".." + sep) || isAbsolute(q)) return false;
  let Z = normalized_2;
  do {
    Z = dirname(Z);
    if (S(Z)) return true;
  } while (Z !== normalized_3 && Z !== dirname(Z));
  return false;
}
//@ chunk-e6aww6q8.js:1337160-1337480 fingerprint = isDuplicatePath (0.685)
function isDuplicatePath_2(fsImplementation, patterns) {
  let mapped = patterns.map((s) => s.replaceAll("\\", "/"));
  for (let s of mapped) {
    if (!s.startsWith("/")) continue;
    let h = s.search(/[*?{[]/);
    let y = h === -1 ? s : s.slice(0, h);
    let S = dirname(y);
    try {
      let w = safeResolvePath(fsImplementation, S);
      let { resolvedPath } = w;
      if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(S, w)) continue;
      let replaced = resolvedPath.replaceAll("\\", "/");
      if (replaced !== S) {
        let q = replaced + s.slice(S.length);
        mapped.push(q);
      }
    } catch {}
  }
  return mapped;
}
//@ chunk-awy329vy.js:49206-49477 fingerprint = readLinesReverse (0.747)
async function readLinesReverse_2(n, e) {
  let r;
  try {
    r = await open(n, readOnlyNoFollowFlags());
    let stats = await r.stat();
    if (!stats.isFile() || stats.size > e) return;
    let remainder = Buffer.alloc(stats.size + 1);
    let { bytesRead } = await r.read(remainder, 0, remainder.length, 0);
    return bytesRead === stats.size ? remainder.subarray(0, bytesRead) : undefined;
  } catch {
    return;
  } finally {
    await r?.close().catch(() => {});
  }
}
//@ chunk-jhrww53q.js:47434-47579 fingerprint = safeResolvePath (0.602)
function safeResolvePath_2(o) {
  return (
    !o.isDirectory() &&
    !o.isFile() &&
    !o.isSymbolicLink() &&
    !o.isFIFO() &&
    !o.isSocket() &&
    !o.isBlockDevice() &&
    !o.isCharacterDevice()
  );
}
export {
  getFsImplementation,
  hasUntouchableRecordSpellingStrictAsync,
  hasUntouchableRecordSpelling,
  processChdir,
  findIntermediateUncJunction,
  NodeFsOperations,
  readLinesReverse,
  FileChangedDuringReadError,
  tailFile,
  hasUntouchableRecordSpellingAsync,
  getPathsForPermissionCheck,
  walkPermissionCheckPaths,
  safeResolvePath,
  vetRepoSettingsPath,
  isSymlinkToNetworkPathError,
  realpathExaminedSync,
  createOffsetMappedText,
  permissionCheckSpellings,
  resolveDeepestExistingAncestorSync,
  UNVERIFIED_ANCESTRY,
  readFileRange,
  readHandleUpTo,
  entryReachesForeignNetwork,
  isDuplicatePath_2,
  safeResolvePath_2,
  vetRepoSettingsPathAsync,
  nonblockingReadFlags,
  isOpaqueLinkText,
  findIntermediateUncJunctionAsync,
  OPAQUE_LINK_TEXT,
  getPathsForNetworkScreen,
  resolvedSpellingWalk,
  hopCapExhausted,
  vouchedLaunchAncestry,
  readLinesReverse_2,
  isDuplicatePath,
  walkPermissionCheckPathsAsync,
  isSpelledStrictAncestor,
  isPathMatchedForPermission,
  resolveForPermissionCheck,
  getPathsForPermissionCheck_2,
  repoSettingsRefusalReason,
  expandWin32ExistingLongNamesStrict,
  examineEntryChain,
  isNetworkJunction,
  hasUntouchableRecordSpellingStrict,
  SYMLINK_TO_NETWORK_PATH_CODE,
  expandWin32ExistingLongNames,
  getPathsForNetworkScreenAsync,
  readLines,
};
