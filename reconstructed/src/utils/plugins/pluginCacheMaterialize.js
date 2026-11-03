/**
 * utils/plugins/pluginCacheMaterialize.ts
 *
 * 2.1.316 新增：插件缓存链接实体化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (67)
 * attribution: placement 67
 */
import { sep, resolve as resolve_2, parse, dirname, relative, isAbsolute, join, basename } from "path";
import {
  stat,
  realpath,
  lutimes,
  readlink,
  lstat,
  mkdir,
  rm as rm_2,
  writeFile,
  readdir,
  open,
  rmdir,
  unlink,
} from "fs/promises";
import { constants } from "fs";
import { randomBytes } from "crypto";
import {
  CACHE_META_FILES,
  LINKS_MATERIALIZED_MARKER as LINKS_MATERIALIZED_MARKER_2,
  IN_USE_MARKER_FILE,
  ORPHAN_MARKER_FILE,
} from "./cacheUtils.js";
import { matchesSegmentOrTempName, isNodeModulesSegment, normalizePathSegment } from "../pathSegments.js";
import {
  hasBackslash,
  uncHostOf,
  isDeviceNamespacePath as isDeviceNamespacePath_2,
  isDosDevicePath,
  hasDotSegment,
} from "../pathClassification.js";
import { getPlatform } from "../platform.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isPathAbsent,
  isFsInaccessible,
} from "../errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, literal, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  networkMountRootCached,
  normalizeMountPath,
  networkMountRoots,
  isNetworkishPath,
  isWslUncPath,
  isNonWslUncPath,
  isNetworkMountRoot,
} from "../networkPaths.js";
import { hasWin32DevicePrefixSpelling } from "../fsJunctions.js";
import { makeTempSiblingPath, retryFsOp, isOwnTempName } from "../atomicPublishWrite.js";
import { logForDebugging } from "../debug.js";
import { copyFileNoFollow, ATOMIC_WRITE_ERRNOS, isSameFilesystem, writeFileAtomically } from "./safeCopy.js";
import {
  classifyDirEntry,
  removePathEntry,
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
} from "../fsRemove.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { isDiskless } from "../../bootstrap/state.js";
import { atomicMoveToInstallPath_2 } from "../nativeInstaller/installer.js";
import { LOCK_STALE_MS, isHashTempFile } from "../../services/memorySync/syncFiles.js";
import { isFreshTimestamp as isFreshTimestamp_2 } from "./pluginCachePaths.js";

//@ chunk-e6aww6q8.js:698057-698101 placement
var CACHE_SKIP_ENTRY_NAMES = new Set(["node_modules", ...CACHE_META_FILES, LINKS_MATERIALIZED_MARKER_2]);
//@ chunk-e6aww6q8.js:698101-698134 placement
/**
 * isCacheSkipEntry：是否为缓存遍历跳过项。
 */
function isCacheSkipEntry(e) {
  return matchesSegmentOrTempName(e, CACHE_SKIP_ENTRY_NAMES);
}
//@ chunk-e6aww6q8.js:698134-698220 placement
/**
 * isPathUnder：路径是否在给定目录下。
 */
function isPathUnder(e, n) {
  if (e === n) return true;
  let r = n.endsWith(sep) ? n : n + sep;
  return e.startsWith(r);
}
//@ chunk-e6aww6q8.js:698220-698249 placement
function sameFileIdentityAs(e) {
  return hasBackslash(e);
}
//@ chunk-e6aww6q8.js:698249-698718 placement
/**
 * 两个路径 stat 的 dev/ino 是否相同（Windows 直接 same）。
 */
async function compareStatIdentity(e, n) {
  if (getPlatform() === "windows") return "same";
  let [r, s] = await Promise.allSettled([
    stat(e, {
      bigint: true,
    }),
    stat(n, {
      bigint: true,
    }),
  ]);
  let filtered = [r, s].filter((y) => y.status === "rejected");
  if (
    filtered.some((y) => {
      let errnoCode = getErrnoCode(y.reason);
      return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
    })
  )
    return "unknown";
  if (filtered.length > 0 || r.status === "rejected" || s.status === "rejected") return "absent";
  if (r.value.ino === 0n || s.value.ino === 0n) return "unknown";
  return r.value.dev === s.value.dev && r.value.ino === s.value.ino ? "same" : "different";
}
//@ chunk-e6aww6q8.js:698718-699023 placement
/**
 * 路径 realpath 是否在根内且 stat 一致（inside/outside/unknown）。
 */
async function classifyRealpathContainment(e, root) {
  let r = await realpath(e);
  if (!isPathUnder(r, root)) return "outside";
  if (getPlatform() === "windows") return "inside";
  let s;
  try {
    s = await Promise.all([
      stat(e, {
        bigint: true,
      }),
      stat(r, {
        bigint: true,
      }),
    ]);
  } catch {
    return "unknown";
  }
  let [h, y] = s;
  if (h.ino === 0n || y.ino === 0n) return "unknown";
  return h.dev === y.dev && h.ino === y.ino ? "inside" : "outside";
}
//@ chunk-e6aww6q8.js:699023-699063 placement
var SYMLINK_COPY_BUDGET = {
  entries: 20000,
  bytes: 536870912,
};
//@ chunk-e6aww6q8.js:699063-699092 placement
/**
 * freshSymlinkCopyBudget：复制预算的初值。
 */
function freshSymlinkCopyBudget() {
  return {
    ...SYMLINK_COPY_BUDGET,
  };
}
//@ chunk-e6aww6q8.js:699092-699250 placement
class SymlinkCopyBudgetError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor() {
    super(
      "Plugin materializes more files through symlinks than the copy budget allows",
      "plugin symlink copy budget exceeded",
    );
  }
}
//@ chunk-e6aww6q8.js:699250-699333 placement
/**
 * consumeSymlinkCopyBudget：扣减复制预算。
 */
function consumeSymlinkCopyBudget(e, n, r) {
  e.entries -= n;
  e.bytes -= r;
  if (e.entries < 0 || e.bytes < 0) throw new SymlinkCopyBudgetError();
}
//@ chunk-e6aww6q8.js:699333-699378 placement
/**
 * pathHasNodeModulesSegment：路径里是否含 node_modules。
 */
function pathHasNodeModulesSegment(e) {
  return e.split(sep).some(isNodeModulesSegment);
}
//@ chunk-e6aww6q8.js:699378-699432 placement
var WRITE_ERROR_CODES = new Set(["EROFS", "EACCES", "EPERM"]);
var TIMESTAMP_SKEW_LIMIT_MS = 600000;
//@ chunk-e6aww6q8.js:699432-699488 placement
function isTimestampFreshish(mtimeMs) {
  let n = Date.now() - mtimeMs;
  return n > -TIMESTAMP_SKEW_LIMIT_MS && n < TIMESTAMP_SKEW_LIMIT_MS;
}
//@ chunk-e6aww6q8.js:699488-699741 placement
var MATERIALIZE_MAX_AGE_MS = 600000;
var MAX_MARKER_BYTES = 4096;
var PARKED_SUFFIX = ".parked";
var ORIGIN_SUFFIX = ".origin";
var MAX_ORIGIN_BYTES = 4096;
var MAX_SCREEN_MARKER_BYTES = 4096;
var SCREEN_VERSION = 2;
var ScreenMarkerSchema = DoctorLazy(() =>
  u({
    at: string(),
    cli: string(),
    screen: literal(SCREEN_VERSION),
    materialized: E(),
    removed: E(),
    failed: E(),
  }),
);
var TRANSIENT_FS_ERRORS = new Set([
  "EBUSY",
  "EAGAIN",
  "EMFILE",
  "ENFILE",
  "EIO",
  "EINTR",
  "ENOTEMPTY",
  "EPERM",
  "EACCES",
]);
//@ chunk-e6aww6q8.js:699741-699797 placement
function touchPathTimes(e) {
  let date = new Date();
  lutimes(e, date, date).catch(() => {});
}
//@ chunk-e6aww6q8.js:699797-700136 placement
/**
 * 构造判断链接拼写/目标是否指向网络或其他卷的检查器。
 */
function createLinkTargetScreen(e) {
  let n = (w) => {
    let L = networkMountRootCached(w);
    return L === null ? null : normalizeMountPath(L);
  };
  let r = n(e);
  let s = uncHostOf(e);
  let h = (w) => networkMountRoots(w).some((L) => L !== r);
  let y = (w) => {
    if (!isNetworkishPath(w) && !isWslUncPath(w)) return false;
    if (isDeviceNamespacePath_2(w) || hasWin32DevicePrefixSpelling(w) || isDosDevicePath(w)) return true;
    if (isNonWslUncPath(w) || isWslUncPath(w)) {
      let L = uncHostOf(w);
      return L === null || L !== s;
    }
    if (isNetworkMountRoot(w)) return hasDotSegment(w) || n(w) !== r;
    return true;
  };
  return {
    spelling: y,
    target: (w, L) => y(w) || y(resolve_2(L, w)) || h(L + sep + w),
  };
}
//@ chunk-e6aww6q8.js:700136-700258 placement
var MAX_SYMLINK_HOPS_2 = 40;
var DRIVE_RELATIVE_RE = /^[a-zA-Z]:(?![\\/])/;
var splitPathSegments_2 = (e) =>
  e
    .slice(parse(e).root.length)
    .split(sep === "\\" ? /[\\/]+/ : /\/+/)
    .filter(Boolean);
//@ chunk-e6aww6q8.js:700258-700329 placement
/**
 * resolveLinkChainFromParent：从父目录起解析链接链。
 */
async function resolveLinkChainFromParent(e, screen, r, options = {}) {
  return walkLinkChain(dirname(e), [], screen, options, r ?? (await readlink(e)));
}
//@ chunk-e6aww6q8.js:700329-700385 placement
async function resolveLinkChainForPath(root, n, screen, options = {}) {
  return walkLinkChain(root, splitPathSegments_2(n), screen, options);
}
//@ chunk-e6aww6q8.js:700385-701655 placement
/**
 * 手动逐段解析路径（含 Windows junction/盘符相对路径），每段检查是否指向网络位置； 链接跳数超过上限返回 loop，缺失返回 dangling，拼写可疑返回 network，Windows 不支持的形式返回 unsupported。
 */
async function walkLinkChain(root, segments, screen, options, firstLink) {
  let y = (options.platform ?? (getPlatform() === "windows" ? "win32" : "posix")) === "win32";
  let current = root;
  let sliced = segments.slice();
  let hops = firstLink === undefined ? 0 : 1;
  let G = (q, Z) => {
    if (screen.target(q, Z)) return "network";
    if (y) {
      if (DRIVE_RELATIVE_RE.test(q)) return "unsupported";
      let Se = resolve_2(Z, q, ...sliced);
      if (screen.spelling(Se)) return "network";
      sliced.length = 0;
      let trustedRoot = options.trustedRoot;
      if (trustedRoot !== undefined && (Se === trustedRoot || isPathUnder(Se, trustedRoot))) {
        current = trustedRoot;
        sliced.push(...splitPathSegments_2(relative(trustedRoot, Se)));
      } else {
        current = parse(Se).root;
        if (trustedRoot !== undefined && current.toLowerCase() !== parse(trustedRoot).root.toLowerCase())
          return "unsupported";
        sliced.push(...splitPathSegments_2(Se));
      }
      return null;
    }
    if (isAbsolute(q)) current = parse(q).root;
    else current = Z;
    sliced.unshift(...splitPathSegments_2(q));
    return null;
  };
  if (firstLink !== undefined) {
    let q = G(firstLink, root);
    if (q !== null) return q;
  }
  while (sliced.length > 0) {
    let q = sliced.shift();
    if (q === ".") continue;
    if (q === "..") {
      current = dirname(current);
      continue;
    }
    let Z = join(current, q);
    if (screen.spelling(Z)) return "network";
    let Se;
    try {
      Se = await lstat(Z);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "dangling";
      throw error;
    }
    if (Se.isSymbolicLink()) {
      if (++hops > MAX_SYMLINK_HOPS_2) return "loop";
      let ke = G(await readlink(Z), current);
      if (ke !== null) return ke;
      continue;
    }
    if (sliced.length > 0 && !Se.isDirectory()) return "dangling";
    if (y && Se.isDirectory()) {
      let ke;
      try {
        ke = await readlink(Z);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "dangling";
        if (errnoCode !== "EINVAL") throw error;
        ke = null;
      }
      if (ke !== null) {
        if (++hops > MAX_SYMLINK_HOPS_2) return "loop";
        let we = G(ke, current);
        if (we !== null) return we;
        continue;
      }
    }
    current = Z;
  }
  return "clean";
}
//@ chunk-e6aww6q8.js:701655-701848 placement
function stagedCopyReplacedError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Refusing to swap in a staged copy: it is no longer the ${e} this pass made (replaced during the conversion).`,
    "plugin cache staged copy replaced before the swap",
  );
}
//@ chunk-e6aww6q8.js:701848-709580 placement
/**
 * 实体化插件目录中的链接（命令源等），无法写入时保留链接。
 */
async function materializePluginLinks(e, copyDir, r = {}) {
  let startTime = performance.now();
  let h = r.budget ?? freshSymlinkCopyBudget();
  let mode = r.mode ?? "install";
  let S = {
    vouched: false,
    materialized: 0,
    removed: 0,
    failed: 0,
    readOnly: false,
  };
  if (!(await lstat(e)).isDirectory())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin path is not a directory: ${e}`,
      "plugin path is not a directory",
    );
  let w = await realpath(e);
  let L;
  let G;
  try {
    L = await stampMaterializedTree(e, w, mode, r.sharedPath);
    G = makeTempSiblingPath(join(w, LINKS_MATERIALIZED_MARKER_2));
    await mkdir(G);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && WRITE_ERROR_CODES.has(errnoCode)) {
      logForDebugging(`materializeLinks: ${e}: cannot write (${errnoCode}), leaving links in place`);
      return {
        ...S,
        readOnly: true,
      };
    }
    throw error;
  }
  let q = await lstat(G, {
    bigint: true,
  });
  let Z = async () => {
    let ho = await lstat(G, {
      bigint: true,
    }).catch(() => null);
    return ho !== null && ho.isDirectory() && ho.ino === q.ino && ho.dev === q.dev;
  };
  let Se = async () => {
    if (!(await Z())) throw Error("the scratch directory is no longer the one this pass created");
  };
  let ke = 0;
  let we = async () => {
    await Se();
    return join(G, String(ke++));
  };
  let Ee = async (ho) => {
    if (await Z())
      await rm_2(ho, {
        recursive: true,
        force: true,
      }).catch(() => {});
  };
  let Ae = false;
  let Ie = 0;
  let Me = true;
  let linkTargetScreen = createLinkTargetScreen(w);
  let ze = (ho, error) => {
    S.failed++;
    logForDebugging(`materializeLinks: failed ${ho}: ${errorMessage(error)}`, {
      level: "warn",
    });
  };
  let lt = async (ho) => {
    let yn = await lstat(ho).catch(() => null);
    return yn !== null && !yn.isSymbolicLink();
  };
  let Je = async (ho, yn, Kn, Xn) => {
    try {
      if (!(await lstat(ho)).isSymbolicLink()) return;
      await retryFsOp(ho, await we());
      S.removed++;
      logForDebugging(`materializeLinks: removed ${yn} -> ${Kn} (${Xn})`);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT" || (await lstat(ho).catch(() => null))?.isSymbolicLink() === true)
        ze(yn, error);
    }
  };
  let nt = async (ho, yn, Kn, Xn = "dangling") => {
    if (!L || (await hasOtherTempEntries(w, G))) {
      if (mode === "install") {
        ze(
          yn,
          Error(
            "link does not resolve and the tree could not be settled this time (a sweep step the OS refused, or another pass is live)",
          ),
        );
        return;
      }
      logForDebugging(
        `materializeLinks: left ${yn} -> ${Kn}: does not resolve while another pass may be converting this tree; judged on a later load`,
      );
      Ie++;
      Me = false;
      return;
    }
    return Je(ho, yn, Kn, Xn);
  };
  let pt = (ho, yn, Kn, error) => {
    if (mode === "migrate") return Je(ho, yn, Kn, "over copy budget");
    throw error;
  };
  let Et = (ho) => {
    h.entries = ho.entries;
    h.bytes = ho.bytes;
  };
  let yt = async (ho, yn, Kn, Xn, fo) => {
    let To = {
      ...h,
    };
    try {
      consumeSymlinkCopyBudget(h, 1, fo);
    } catch (error) {
      Et(To);
      if (error instanceof SymlinkCopyBudgetError) return pt(ho, yn, Kn, error);
      throw error;
    }
    let bo = await we();
    try {
      await copyFileNoFollow(Xn, bo, {
        exclusive: true,
        exactMode: true,
        nonBlocking: true,
      });
      await gt(bo, ho, yn);
      S.materialized++;
      logForDebugging(`materializeLinks: copied ${yn} (was symlink -> ${Kn})`);
    } catch (error) {
      await Ee(bo);
      Et(To);
      if (!(await lt(ho))) ze(yn, error);
    }
  };
  let gt = async (ho, yn, Kn) => {
    try {
      await Se();
      if (!(await lstat(ho)).isFile()) throw stagedCopyReplacedError("file");
      await retryFsOp(ho, yn);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
      let To = await lstat(yn).catch(() => null);
      if (To === null || !To.isSymbolicLink()) throw error;
      let bo = await we();
      await writeFile(bo + ORIGIN_SUFFIX, Kn, {
        flag: "wx",
      });
      let vn = await lstat(yn).catch(() => null);
      if (vn === null || !vn.isSymbolicLink()) throw error;
      await Se();
      await retryFsOp(yn, bo + PARKED_SUFFIX);
      try {
        await Se();
        if (!(await lstat(ho)).isFile()) throw stagedCopyReplacedError("file");
        await retryFsOp(ho, yn);
      } catch (error) {
        if (!(await lt(yn)) && (await Z()))
          await retryFsOp(bo + PARKED_SUFFIX, yn).catch(() => {
            Ae = true;
          });
        throw error;
      }
    }
  };
  let At = async (ho, yn, Kn, Xn) => {
    let fo = await we();
    let To = {
      ...h,
    };
    try {
      consumeSymlinkCopyBudget(h, 1, 0);
      await copyDir(Xn, fo, Xn, fo, w, true, new Set([Xn]), h, true);
    } catch (error) {
      await Ee(fo);
      Et(To);
      if (error instanceof SymlinkCopyBudgetError) return pt(ho, yn, Kn, error);
      return ze(yn, error);
    }
    try {
      let bo = await we();
      await writeFile(bo + ORIGIN_SUFFIX, yn, {
        flag: "wx",
      });
      let vn = await lstat(ho).catch(() => null);
      if (vn === null || !vn.isSymbolicLink()) {
        await Ee(fo);
        Et(To);
        return;
      }
      await Se();
      await retryFsOp(ho, bo + PARKED_SUFFIX);
      try {
        await Se();
        if (!(await lstat(fo)).isDirectory()) throw stagedCopyReplacedError("directory");
        await retryFsOp(fo, ho);
      } catch (error) {
        if (!(await lt(ho)) && (await Z()))
          await retryFsOp(bo + PARKED_SUFFIX, ho).catch(() => {
            Ae = true;
          });
        throw error;
      }
      S.materialized++;
      logForDebugging(`materializeLinks: copied ${yn} (was symlink -> ${Kn})`);
    } catch (error) {
      await Ee(fo);
      Et(To);
      if (!(await lt(ho))) ze(yn, error);
    }
  };
  let It = async (ho, name, Kn) => {
    let Xn = join(ho, name);
    let fo = relative(w, Xn);
    let To;
    try {
      To = await readlink(Xn);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "EINVAL" && errnoCode !== "ENOENT") ze(fo, error);
      return;
    }
    if (Kn === 0 && !isNodeModulesSegment(name) && isCacheSkipEntry(name))
      return Je(Xn, fo, To, "reserved name");
    if (sameFileIdentityAs(fo)) return Je(Xn, fo, To, "backslash in name");
    let bo;
    try {
      bo = await resolveLinkChainFromParent(Xn, linkTargetScreen, To, {
        trustedRoot: w,
      });
    } catch (error) {
      ze(fo, error);
      return;
    }
    if (bo === "network") return Je(Xn, fo, To, "network target");
    if (bo === "unsupported") return Je(Xn, fo, To, "unsupported target spelling");
    if (bo !== "clean") return nt(Xn, fo, To);
    let vn;
    try {
      vn = await realpath(Xn);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return nt(Xn, fo, To);
      ze(fo, error);
      return;
    }
    if (!isPathUnder(vn, w)) return Je(Xn, fo, To, "escapes plugin root");
    if (qt(fo)) {
      let So = await compareStatIdentity(Xn, vn);
      if (So === "different") return Je(Xn, fo, To, "opens a different file than it resolves to");
      if (So === "absent") return nt(Xn, fo, To);
      if (So === "unknown") {
        ze(fo, Error("kept link identity could not be proven (stat failed or no inode number)"));
        return;
      }
      Zt.push({
        linkPath: Xn,
        rel: fo,
        target: To,
      });
      return;
    }
    if (isPathUnder(ho, vn)) return Je(Xn, fo, To, "ancestor cycle");
    let co;
    try {
      co = await lstat(vn);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return nt(Xn, fo, To);
      ze(fo, error);
      return;
    }
    if (co.isSymbolicLink()) {
      ze(fo, Error("target swapped for a link since it was resolved"));
      return;
    }
    if (!co.isFile() && !co.isDirectory()) return Je(Xn, fo, To, "non-regular target");
    if (co.isFile()) return yt(Xn, fo, To, vn, co.size);
    return At(Xn, fo, To, vn);
  };
  let Yt = (name) => isOwnTempName(normalizePathSegment(name), LINKS_MATERIALIZED_MARKER_2);
  let qt = pathHasNodeModulesSegment;
  let Zt = [];
  let rn = async () => {
    let sliced = Zt.slice();
    for (let idx = 0; idx <= Zt.length; idx++) {
      let results = await Promise.all(
        sliced.map(async (fo) => {
          try {
            let linkChainFromParent = await resolveLinkChainFromParent(
              fo.linkPath,
              linkTargetScreen,
              undefined,
              {
                trustedRoot: w,
              },
            );
            if (linkChainFromParent === "network") return "network target after conversion";
            if (linkChainFromParent === "unsupported") return "unsupported target spelling";
            if (linkChainFromParent !== "clean") return "dangling after conversion";
            let bo = await realpath(fo.linkPath);
            if (!isPathUnder(bo, w)) return "escapes plugin root after conversion";
            let vn = await compareStatIdentity(fo.linkPath, bo);
            if (vn === "unknown") return "unexamined";
            if (vn === "absent") return "dangling after conversion";
            return vn === "same" ? null : "opens a different file than it resolves to after conversion";
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            return errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
              ? "dangling after conversion"
              : "unexamined";
          }
        }),
      );
      if (results.every((fo) => fo === null)) return;
      let Xn = [];
      for (let [fo, To] of sliced.entries()) {
        let bo = results[fo];
        if (bo === null || bo === undefined) Xn.push(To);
        else if (bo === "unexamined") {
          if (mode === "install") ze(To.rel, Error("kept link could not be re-checked after conversion"));
          else {
            logForDebugging(
              `materializeLinks: left ${To.rel} -> ${To.target}: could not be re-checked after the conversion; judged on a later load`,
            );
            Ie++;
            Me = false;
          }
        } else if (bo === "dangling after conversion") await nt(To.linkPath, To.rel, To.target, bo);
        else await Je(To.linkPath, To.rel, To.target, bo);
      }
      sliced = Xn;
    }
  };
  let pn = async (ho, yn) => {
    let Kn;
    try {
      Kn = await readdir(ho, {
        withFileTypes: true,
      });
    } catch (error) {
      ze(relative(w, ho) || ".", error);
      return;
    }
    for (let Xn of Kn) {
      let fo;
      try {
        fo = await classifyDirEntry(ho, Xn);
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT") ze(relative(w, join(ho, Xn.name)), error);
        continue;
      }
      if (fo.isDirectory) {
        if (yn === 0 && Yt(Xn.name)) continue;
        let To;
        try {
          To = await lstat(join(ho, Xn.name));
        } catch (error) {
          if (getErrnoCode(error) !== "ENOENT") ze(relative(w, join(ho, Xn.name)), error);
          continue;
        }
        if (To.isSymbolicLink()) await It(ho, Xn.name, yn);
        else if (To.isDirectory()) {
          let bo =
            getPlatform() !== "windows"
              ? true
              : await isSameFilesystem(ho, Xn.name).catch((error) => {
                  if (getErrnoCode(error) !== "ENOENT") ze(relative(w, join(ho, Xn.name)), error);
                  return null;
                });
          if (bo === null) continue;
          if (!bo) {
            ze(relative(w, join(ho, Xn.name)), Error("directory resolves elsewhere (reparse point)"));
            continue;
          }
          await pn(join(ho, Xn.name), yn + 1);
        }
      } else if (fo.isSymbolicLink) await It(ho, Xn.name, yn);
    }
  };
  let interval = setInterval(touchPathTimes, TIMESTAMP_SKEW_LIMIT_MS / 4, G);
  interval.unref();
  let hn = false;
  try {
    await pn(w, 0);
    await rn();
  } finally {
    clearInterval(interval);
    let ho = await Z().catch(() => false);
    if (!Ae && !ho)
      logForDebugging(
        `materializeLinks: ${e}: ${G} is no longer the folder this pass made; left in place, tree not vouched for`,
        {
          level: "warn",
        },
      );
    hn =
      !Ae &&
      ho &&
      (await rm_2(G, {
        recursive: true,
        force: true,
      }).then(
        () => true,
        (error) => {
          logForDebugging(`materializeLinks: ${e}: cannot remove ${G}: ${errorMessage(error)}`, {
            level: "warn",
          });
          return false;
        },
      ));
  }
  if (S.failed === 0 && L && Me && hn && !(mode === "migrate" && (await hasOtherTempEntries(w, G))))
    if (mode === "migrate" && !(await hasUnexpectedEntry(w))) {
      if (Ie === 0) S.settledUnvouched = true;
    } else S.vouched = await writeScreenMarker(e, w, S);
  logForDebugging(
    `materializeLinks: ${e}: materialized=${S.materialized} removed=${S.removed} failed=${S.failed}${Ie > 0 ? ` left-for-later=${Ie}` : ""} in ${Math.round(performance.now() - startTime)}ms`,
  );
  return S;
}
//@ chunk-e6aww6q8.js:709580-709605 placement
var REFUSED_SYMBOL = Symbol("refused");
//@ chunk-e6aww6q8.js:709605-709709 placement
async function toTransientSentinel(e) {
  try {
    return await e;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && WRITE_ERROR_CODES.has(errnoCode)) return REFUSED_SYMBOL;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:709709-710637 placement
async function stampMaterializedTree(label, n, mode, sharedPath = false) {
  let h = true;
  if (mode === "install") {
    if (!(await convertDirectoryToZipInPlace(n, LINKS_MATERIALIZED_MARKER_2))) h = false;
    if (sharedPath) {
      if ((await toTransientSentinel(removePathEntry(join(n, IN_USE_MARKER_FILE)))) === REFUSED_SYMBOL)
        h = false;
    } else if (!(await convertDirectoryToZipInPlace(n, IN_USE_MARKER_FILE))) h = false;
  }
  let transientSentinel = await toTransientSentinel(readdir(n));
  if (transientSentinel === REFUSED_SYMBOL) {
    logForDebugging(`materializeLinks: ${label}: cannot list the tree this time; not stamping`);
    return false;
  }
  for (let S of transientSentinel) {
    if (!isOwnTempName(normalizePathSegment(S), LINKS_MATERIALIZED_MARKER_2)) continue;
    let w = join(n, S);
    if (mode === "migrate") {
      let transientSentinel = await toTransientSentinel(
        lstat(w).catch((error) => {
          if (getErrnoCode(error) === "ENOENT") return null;
          throw error;
        }),
      );
      if (transientSentinel === null) continue;
      if (transientSentinel === REFUSED_SYMBOL) {
        h = false;
        continue;
      }
      if (!transientSentinel.isDirectory()) {
        if (
          (await toTransientSentinel(
            rm_2(w, {
              force: true,
            }),
          )) === REFUSED_SYMBOL
        )
          h = false;
        continue;
      }
      if (isTimestampFreshish(transientSentinel.mtimeMs)) {
        h = false;
        logForDebugging(
          `materializeLinks: ${label}: ${S} may belong to a pass in progress; not stamping this time`,
        );
        continue;
      }
      let Z = await isOnDifferentFilesystem(n, S);
      if (Z === null) continue;
      if (Z) {
        if ((await scanDirectory_2(w)) !== true) h = false;
        continue;
      }
      if (!(await restoreParkedEntries(label, n, w))) {
        h = false;
        continue;
      }
    }
    let L = await isOnDifferentFilesystem(n, S);
    if (L === null) continue;
    if (L) {
      if ((await scanDirectory_2(w)) !== true) h = false;
      continue;
    }
    if (
      (await toTransientSentinel(
        rm_2(w, {
          recursive: true,
          force: true,
        }),
      )) === REFUSED_SYMBOL
    )
      h = false;
  }
  return h;
}
//@ chunk-e6aww6q8.js:710637-710712 placement = scanDirectory (0.766)
async function scanDirectory_2(dirPath) {
  let transientSentinel = await toTransientSentinel(removePathEntry(dirPath));
  return transientSentinel !== REFUSED_SYMBOL && transientSentinel !== "directory";
}
//@ chunk-e6aww6q8.js:710712-710903 placement
async function isOnDifferentFilesystem(e, n) {
  if (getPlatform() !== "windows") return false;
  let r = await isSameFilesystem(e, n).catch((error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return null;
    if (errnoCode !== undefined && WRITE_ERROR_CODES.has(errnoCode)) return false;
    throw error;
  });
  return r === null ? null : !r;
}
//@ chunk-e6aww6q8.js:710903-711052 placement = convertDirectoryToZipInPlace (1)
/**
 * 目录项检查后递归扫描或删除（名字配错）。
 */
async function convertDirectoryToZipInPlace(dirPath, zipPath) {
  let r = await isOnDifferentFilesystem(dirPath, zipPath);
  if (r === null) return true;
  if (r) return scanDirectory_2(join(dirPath, zipPath));
  return (
    (await toTransientSentinel(
      rm_2(join(dirPath, zipPath), {
        recursive: true,
        force: true,
      }),
    )) !== REFUSED_SYMBOL
  );
}
//@ chunk-e6aww6q8.js:711052-711126 placement
async function hasUnexpectedEntry(e) {
  return (await readdir(e).catch(() => [])).some((r) => !isCacheSkipEntry(r));
}
//@ chunk-e6aww6q8.js:711126-711271 placement
async function hasOtherTempEntries(e, n) {
  let r = await readdir(e).catch((error) => (getErrnoCode(error) === "ENOENT" ? [] : null));
  if (r === null) return true;
  return r.some(
    (s) => isOwnTempName(normalizePathSegment(s), LINKS_MATERIALIZED_MARKER_2) && join(e, s) !== n,
  );
}
//@ chunk-e6aww6q8.js:711271-712292 placement
/**
 * 扫描暂存目录里的 .origin 记录，校验原位置仍在根内、未被占用且暂存项是链接后把 .parked 条目移回； 出现无法判定的情况返回 false（不完整）。
 */
async function restoreParkedEntries(label, root, parkDir) {
  let complete = true;
  let screen = createLinkTargetScreen(root);
  let transientSentinel = await toTransientSentinel(
    readdir(parkDir).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return [];
      throw error;
    }),
  );
  if (transientSentinel === REFUSED_SYMBOL) return false;
  for (let S of transientSentinel) {
    if (!S.endsWith(ORIGIN_SUFFIX)) continue;
    let w = join(parkDir, S.slice(0, -ORIGIN_SUFFIX.length) + PARKED_SUFFIX);
    try {
      let L = join(parkDir, S);
      let G = await writeFileAtomically(L, MAX_ORIGIN_BYTES, {
        throwTransient: true,
      });
      if (G === null) continue;
      if (sameFileIdentityAs(G)) continue;
      let q = join(root, G);
      let Z = relative(root, q).split(sep)[0] ?? "";
      if (
        isAbsolute(G) ||
        q === root ||
        !isPathUnder(q, root) ||
        isNodeModulesSegment(Z) ||
        isOwnTempName(normalizePathSegment(Z), LINKS_MATERIALIZED_MARKER_2) ||
        !(await lstat(w)).isSymbolicLink() ||
        (await resolveLinkChainForPath(root, relative(root, dirname(q)), screen, {
          trustedRoot: root,
        })) !== "clean"
      )
        continue;
      let Se = await classifyRealpathContainment(dirname(q), root);
      if (Se === "outside") continue;
      if (Se === "unknown") {
        complete = false;
        continue;
      }
      let ke = await lstat(q).then(
        () => "present",
        (error) => (getErrnoCode(error) === "ENOENT" ? "vacant" : "unknown"),
      );
      if (ke === "present") continue;
      if (ke === "unknown") {
        complete = false;
        continue;
      }
      await retryFsOp(w, q);
      logForDebugging(`materializeLinks: ${label}: restored ${G} from an interrupted pass`);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") continue;
      logForDebugging(
        `materializeLinks: ${label}: cannot restore a parked entry from ${parkDir}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      if (errnoCode !== "ENAMETOOLONG" && errnoCode !== "EINVAL" && !(error instanceof TypeError))
        complete = false;
    }
  }
  return complete;
}
//@ chunk-e6aww6q8.js:712292-713001 placement
/**
 * 撤销版本目录的屏检标记：先删除；失败则移到临时名；再失败用 O_NOFOLLOW 打开并确认单链接普通文件后改写为 withdrawn。
 */
async function withdrawScreenMarker(e) {
  let n = join(e, LINKS_MATERIALIZED_MARKER_2);
  let r = [
    () =>
      rm_2(n, {
        force: true,
      }),
    () => retryFsOp(n, makeTempSiblingPath(n)),
    async () => {
      let O_NOFOLLOW = constants.O_NOFOLLOW;
      if (getPlatform() === "windows" || O_NOFOLLOW === undefined)
        throw Error("in-place invalidation needs O_NOFOLLOW");
      let h = await lstat(n, {
        bigint: true,
      });
      if (!h.isFile()) throw Error("marker name is not a regular file");
      let y = await open(n, constants.O_WRONLY | O_NOFOLLOW | (constants.O_NONBLOCK ?? 0));
      try {
        let stats = await y.stat({
          bigint: true,
        });
        if (!stats.isFile() || stats.nlink !== 1n || stats.ino !== h.ino || stats.dev !== h.dev)
          throw Error("marker is not the single-named regular file seen");
        await y.truncate(0);
        await y.write(
          `withdrawn
`,
          0,
        );
      } finally {
        await y.close();
      }
    },
  ];
  for (let s of r)
    try {
      await s();
      return true;
    } catch (error) {
      logForDebugging(
        `materializeLinks: ${e}: cannot withdraw ${LINKS_MATERIALIZED_MARKER_2}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
  return false;
}
//@ chunk-e6aww6q8.js:713001-713974 placement
/**
 * 以 wx 写入屏检标记（时间、CLI 版本、屏检版本与计数）；已存在且有效则视为成功，否则把目录转换后重写。
 */
async function writeScreenMarker(e, dirPath, r) {
  let s = join(dirPath, LINKS_MATERIALIZED_MARKER_2);
  let h = {
    at: new Date().toISOString(),
    cli: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    screen: SCREEN_VERSION,
    materialized: r.materialized,
    removed: r.removed,
    failed: r.failed,
  };
  let y =
    jsonStringify(h) +
    `
`;
  try {
    await writeFile(s, y, {
      flag: "wx",
    });
    return true;
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") {
      logForDebugging(
        `materializeLinks: ${e}: cannot write ${LINKS_MATERIALIZED_MARKER_2}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      return false;
    }
  }
  try {
    if (await hasValidScreenMarker(dirPath)) return true;
    await convertDirectoryToZipInPlace(dirPath, LINKS_MATERIALIZED_MARKER_2);
    await writeFile(s, y, {
      flag: "wx",
    });
    return true;
  } catch (error) {
    logForDebugging(
      `materializeLinks: ${e}: cannot write ${LINKS_MATERIALIZED_MARKER_2}: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return false;
  }
}
//@ chunk-e6aww6q8.js:713974-713994 placement
var weakMap_7 = new WeakMap();
//@ chunk-e6aww6q8.js:713994-714271 placement
function materializeVersionLinksOnce(e, n, copyDir, s, h) {
  if (!isStorageV5Enabled() || s === undefined || isDiskless()) return Promise.resolve();
  let y = weakMap_7.get(s);
  if (y === undefined) {
    y = {
      attempts: new Map(),
      deferrals: new Map(),
    };
    weakMap_7.set(s, y);
  }
  let attempts = y.attempts;
  let w = attempts.get(e);
  if (w === undefined) {
    w = materializeVersionLinks(e, n, copyDir, y.deferrals, h).then((L) => {
      if (!L) attempts.delete(e);
    });
    attempts.set(e, w);
  }
  return w;
}
//@ chunk-e6aww6q8.js:714271-714523 placement
async function hasValidScreenMarker(e) {
  let n = join(e, LINKS_MATERIALIZED_MARKER_2);
  let r = await lstat(n).catch((error) => {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw error;
  });
  if (r === null || !r.isFile() || r.size > MAX_SCREEN_MARKER_BYTES) return false;
  let s = await writeFileAtomically(n, MAX_SCREEN_MARKER_BYTES);
  if (s === null) return false;
  try {
    return ScreenMarkerSchema().safeParse(jsonParse(s)).success;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:714523-715316 placement
async function removeLinkMarkers(e) {
  let n = join(e, IN_USE_MARKER_FILE);
  try {
    let r = await removePathEntry(n);
    if (r === "removed")
      logForDebugging(`materializeLinks: ${e}: removed ${IN_USE_MARKER_FILE}: not a directory of markers`);
    return r;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === undefined || !WRITE_ERROR_CODES.has(errnoCode)) throw error;
    let h;
    try {
      h = await lstat(n);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return "absent";
      throw error;
    }
    if (h.isDirectory()) {
      logForDebugging(
        `materializeLinks: ${e}: cannot remove from ${IN_USE_MARKER_FILE} (${errnoCode}): a directory of markers this process cannot write in is not listed, probed or converted in this process`,
      );
      return "directory-unproven";
    }
    if (h.isFile() || h.isFIFO() || h.isSocket()) {
      logForDebugging(
        `materializeLinks: ${e}: cannot remove ${IN_USE_MARKER_FILE} (${errnoCode}): not a directory of markers, nothing reads through it; proceeding`,
      );
      return "junk";
    }
    logForDebugging(
      `materializeLinks: ${e}: cannot remove ${IN_USE_MARKER_FILE} (${errnoCode}); leaving the tree as it is`,
      {
        level: "warn",
      },
    );
    return "unremovable";
  }
}
//@ chunk-e6aww6q8.js:715316-717278 placement
/**
 * 列出待实体化的链接，无法列出时留给探测判断。
 */
async function listPluginLinks(e) {
  let filePath = join(e, IN_USE_MARKER_FILE);
  let r = await rescreenMarkerDir(e, filePath);
  if (r === null) return;
  let s = await readdir(filePath, {
    withFileTypes: true,
  }).catch((error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return [];
    if (errnoCode === undefined || !WRITE_ERROR_CODES.has(errnoCode)) throw error;
    logForDebugging(
      `materializeLinks: ${e}: cannot list ${IN_USE_MARKER_FILE} (${errnoCode}); left for the probe to judge`,
      {
        level: "warn",
      },
    );
    return [];
  });
  for (let h of s) {
    let y = join(filePath, h.name);
    if (!(await getFileIdentity_3(filePath, r))) {
      logForDebugging(
        `materializeLinks: ${e}: ${IN_USE_MARKER_FILE} was replaced while its children were screened; left for the probe to judge`,
        {
          level: "warn",
        },
      );
      return;
    }
    let S = isVersionDirName(h.name);
    let w = "nonRegular";
    let L = "not a regular file";
    if (h.isDirectory()) {
      if (!S) {
        logUnrecognizedMarker(e, h.name);
        continue;
      }
      w = "directory";
      L = "wears a directory's type";
    } else if (!h.isSymbolicLink()) {
      let q;
      try {
        q = await lstat(y);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") q = null;
        else if (errnoCode !== undefined && WRITE_ERROR_CODES.has(errnoCode)) {
          logForDebugging(
            `materializeLinks: ${e}: cannot examine ${IN_USE_MARKER_FILE}/${h.name} (${errnoCode}); left for the probe to judge`,
            {
              level: "warn",
            },
          );
          continue;
        } else throw error;
      }
      if (q === null) continue;
      if (q.isDirectory()) {
        if (!S) {
          logUnrecognizedMarker(e, h.name);
          continue;
        }
        w = "directory";
        L = "wears a directory's type";
      } else if (q.isFile()) {
        if (!S) {
          logUnrecognizedMarker(e, h.name);
          continue;
        }
        if (q.size > MAX_MARKER_BYTES) {
          w = "oversized";
          L = "larger than any marker";
        } else if (q.size > 0 && !atomicMoveToInstallPath_2(h.name)) continue;
        else {
          if (isTimestampFreshish(q.mtimeMs)) continue;
          w = "staleLeftover";
          L = atomicMoveToInstallPath_2(h.name)
            ? "in-flight marker outside the live window"
            : "empty file outside the live window";
        }
      }
    }
    if (!(await getFileIdentity_3(filePath, r))) {
      logForDebugging(
        `materializeLinks: ${e}: ${IN_USE_MARKER_FILE} was replaced while its children were screened; left for the probe to judge`,
        {
          level: "warn",
        },
      );
      return;
    }
    if (!(await shouldRemoveMarkerEntry(y, h.name, w))) continue;
    let G;
    try {
      G = w === "directory" ? await rmdirIfEmpty(y) : await removePathEntry(y);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOTDIR") return;
      if (errnoCode === undefined || !WRITE_ERROR_CODES.has(errnoCode)) throw error;
      logForDebugging(
        `materializeLinks: ${e}: cannot remove ${IN_USE_MARKER_FILE}/${h.name} (${errnoCode}); left for the probe to judge`,
        {
          level: "warn",
        },
      );
      continue;
    }
    if (G === "removed")
      logForDebugging(`materializeLinks: ${e}: removed ${IN_USE_MARKER_FILE}/${h.name}: ${L}`);
    else if (G === "directory")
      logForDebugging(
        `materializeLinks: ${e}: left ${IN_USE_MARKER_FILE}/${h.name}: a directory, not a session's marker`,
      );
  }
}
//@ chunk-e6aww6q8.js:717278-717339 placement
function isVersionDirName(name) {
  return /^[0-9]+(\.tmp\.[0-9a-f]+)?$/i.test(name);
}
//@ chunk-e6aww6q8.js:717339-717506 placement
async function rmdirIfEmpty(e) {
  try {
    await rmdir(e);
    return "removed";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return "absent";
    if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return "directory";
    throw error;
  }
}
//@ chunk-e6aww6q8.js:717506-717835 placement
/**
 * 按类别判断标记目录项是否应删除。
 */
async function shouldRemoveMarkerEntry(e, name, r) {
  let s = await lstat(e).catch(() => null);
  if (s === null || isUsableVersionMarker(s, name)) return false;
  switch (r) {
    case "nonRegular":
      return !s.isFile() && !s.isDirectory();
    case "directory":
      return s.isDirectory();
    case "oversized":
      return s.isFile() && s.size > MAX_MARKER_BYTES;
    case "staleLeftover":
      return (
        s.isFile() &&
        s.size <= MAX_MARKER_BYTES &&
        (s.size === 0 || atomicMoveToInstallPath_2(name)) &&
        !isTimestampFreshish(s.mtimeMs)
      );
  }
}
//@ chunk-e6aww6q8.js:717835-717931 placement
function isUsableVersionMarker(e, n) {
  return (
    /^[0-9]+$/.test(n) &&
    e.isFile() &&
    e.size <= MAX_MARKER_BYTES &&
    (e.size > 0 || isTimestampFreshish(e.mtimeMs))
  );
}
//@ chunk-e6aww6q8.js:717931-718050 placement
function logUnrecognizedMarker(e, name) {
  logForDebugging(
    `materializeLinks: ${e}: left ${IN_USE_MARKER_FILE}/${name}: not named like a session's marker; the probe judges it`,
  );
}
//@ chunk-e6aww6q8.js:718050-718560 placement
/**
 * 列出前重新确认 in_use 目录仍是真实目录。
 */
async function rescreenMarkerDir(e, n) {
  try {
    let r = await lstat(n, {
      bigint: true,
    });
    if (!r.isSymbolicLink() && r.isDirectory() && (await isSameFilesystem(e, IN_USE_MARKER_FILE))) return r;
    let s = await removePathEntry(n);
    logForDebugging(
      `materializeLinks: ${e}: ${IN_USE_MARKER_FILE} re-screened before listing: no longer a real directory (${s === "directory" ? "left, a non-empty directory" : s})`,
    );
    return null;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
    if (errnoCode === undefined || !WRITE_ERROR_CODES.has(errnoCode)) throw error;
    logForDebugging(
      `materializeLinks: ${e}: cannot re-examine ${IN_USE_MARKER_FILE} (${errnoCode}); left for the probe to judge`,
      {
        level: "warn",
      },
    );
    return null;
  }
}
//@ chunk-e6aww6q8.js:718560-718714 placement = getFileIdentity (0.865)
async function getFileIdentity_3(filePath, n) {
  let r = await lstat(filePath, {
    bigint: true,
  }).catch(() => null);
  return r !== null && !r.isSymbolicLink() && r.isDirectory() && r.dev === n.dev && r.ino === n.ino;
}
//@ chunk-e6aww6q8.js:718714-720591 placement
/**
 * 把插件版本目录中的链接实体化，跳过符号链接的版本目录。
 */
async function materializeVersionLinks(e, n, r, deferrals, h) {
  let y = relative(n, e);
  let parts = y.split(sep);
  if (!y || isAbsolute(y) || parts.length !== 3 || parts.some((w) => w === "" || w === "." || w === ".."))
    return true;
  try {
    if (e.endsWith(".zip")) {
      let Se = await lstat(e).catch((error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
        throw error;
      });
      if (Se === null || !Se.isDirectory()) return true;
    }
    let w = await lstat(e);
    if (
      w.isSymbolicLink() ||
      (getPlatform() === "windows" && !(await isSameFilesystem(dirname(e), basename(e))))
    ) {
      logForDebugging(`materializeLinks: skipping ${e}: version dir is a symlink (or can be read as a link)`);
      return true;
    }
    if (!w.isDirectory()) return true;
    let [L, G] = await Promise.all([realpath(e), realpath(n)]);
    if (L === G || !isPathUnder(L, G)) {
      logForDebugging(`materializeLinks: skipping ${e}: resolves outside the plugin cache`);
      return true;
    }
    let q = await removeLinkMarkers(L);
    if (q === "unremovable" || q === "directory-unproven" || (await hasValidScreenMarker(e))) return true;
    if (q === "directory") await listPluginLinks(L);
    if (h !== undefined && (await h())) {
      let Se = await lstat(e, {
        bigint: true,
      });
      let ke = deferrals.get(L);
      if (
        ke !== undefined &&
        (ke.ino !== Se.ino ||
          (ke.birthtimeNs !== 0n && Se.birthtimeNs !== 0n && ke.birthtimeNs !== Se.birthtimeNs))
      )
        ke = undefined;
      let now = Date.now();
      if (ke === undefined)
        deferrals.set(L, {
          since: now,
          announced: false,
          versionPath: e,
          ino: Se.ino,
          birthtimeNs: Se.birthtimeNs,
        });
      if (ke === undefined || now - ke.since < MATERIALIZE_MAX_AGE_MS) {
        logForDebugging(
          `materializeLinks: deferring ${L}: in use (possibly by this session), or liveness could not be determined`,
        );
        return false;
      }
      if (!ke.announced) {
        ke.announced = true;
        logForDebugging(
          `materializeLinks: ${L}: deferred since ${new Date(ke.since).toISOString()} to in-use markers that still read live, or a liveness probe that kept failing; converting now`,
          {
            level: "warn",
          },
        );
      }
    } else deferrals.delete(L);
    if ((await realpath(e)) !== L) {
      logForDebugging(`materializeLinks: ${e}: moved while its liveness was probed; judged on a later load`);
      return false;
    }
    let Z = await materializePluginLinks(e, r, {
      mode: "migrate",
    });
    deferrals.delete(L);
    return Z.vouched || Z.readOnly || Z.settledUnvouched === true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") {
      for (let [G, q] of deferrals) if (q.versionPath === e) deferrals.delete(G);
      return false;
    }
    logForDebugging(`materializeLinks: ${e}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return errnoCode === undefined || !TRANSIENT_FS_ERRORS.has(errnoCode);
  }
}
//@ chunk-e6aww6q8.js:720591-720652 placement
var TEMP_SUFFIX_MARK = ".tmp~";
var TEMP_SUFFIX_HEX_RE = /^[0-9a-f]{8}$/;
var TEMP_SUFFIX_RE = /\.tmp~[0-9a-f]{8}$/;
//@ chunk-e6aww6q8.js:720652-720711 placement = generatePlaceholders (1)
function makeTempSiblingName(e) {
  return `${e}${TEMP_SUFFIX_MARK}${randomBytes(4).toString("hex")}`;
}
//@ chunk-e6aww6q8.js:720711-720838 placement
function classifyTempSibling(e, n) {
  if (
    e.startsWith(n + TEMP_SUFFIX_MARK) &&
    TEMP_SUFFIX_HEX_RE.test(e.slice(n.length + TEMP_SUFFIX_MARK.length))
  )
    return "current";
  return isOwnTempName(e, n) ? "scratch" : null;
}
//@ chunk-e6aww6q8.js:720838-721052 placement
async function moveIntoVersionPath(e, cachePath) {
  await rm_2(join(e, ORPHAN_MARKER_FILE), {
    force: true,
  });
  if (
    !(await lstat(cachePath).then(
      () => false,
      (error) => {
        if (isPathAbsent(error)) return true;
        throw error;
      },
    ))
  )
    throw Object.assign(Error("plugin cache version path is occupied"), {
      code: "EEXIST",
    });
  await retryFsOp(e, cachePath);
}
//@ chunk-e6aww6q8.js:721052-721159 placement
async function dirHasAnyEntry(e, n) {
  try {
    let r = new Set(await readdir(e));
    return n.some((s) => r.has(s));
  } catch (error) {
    return !isPathAbsent(error);
  }
}
//@ chunk-e6aww6q8.js:721159-721196 placement
var VERSION_TMP_NAME_RE = /^[0-9]+\.tmp\.[0-9a-f]{8}$/;
//@ chunk-e6aww6q8.js:721196-721426 placement
async function removeStaleMarkerFiles(e) {
  let n = await readdir(e).catch(() => []);
  let r = Date.now() - LOCK_STALE_MS;
  for (let s of n) {
    if (!VERSION_TMP_NAME_RE.test(s) && !isHashTempFile(s)) continue;
    let h = join(e, s);
    let y = await lstat(h).catch(() => null);
    if (y !== null && y.isFile() && y.mtimeMs < r) await unlink(h).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:721426-721466 placement
/**
 * isCacheEntryName：缓存条目名（含临时名变体）。
 */
function isCacheEntryName(e) {
  return isCacheSkipEntry(e) || isHashTempFile(normalizePathSegment(e));
}
//@ chunk-e6aww6q8.js:721466-721622 placement
async function hasRealEntries(cachePath, { whenUnreadable: n = true } = {}) {
  try {
    return (await readdir(cachePath)).some((r) => !isCacheEntryName(r));
  } catch (error) {
    if (isPathAbsent(error)) return false;
    if (n) return true;
    if (isFsInaccessible(error)) return false;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:721622-721763 placement
async function isLinkLike(e, n) {
  if (n.isSymbolicLink()) return true;
  if (!n.isDirectory()) return false;
  try {
    return !(await isSameFilesystem(dirname(e), basename(e)));
  } catch (error) {
    return !isPathAbsent(error);
  }
}
//@ chunk-e6aww6q8.js:721763-721854 placement
/**
 * versionPathOccupantError：版本目录占位无法检查的错误。
 */
function versionPathOccupantError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    e,
    "plugin cache version path occupant could not be examined",
  );
}
//@ chunk-e6aww6q8.js:721854-721983 placement
async function classifyCacheEntry(e) {
  try {
    let n = await lstat(e);
    return (await isLinkLike(e, n)) ? "symlink" : "other";
  } catch (error) {
    return isPathAbsent(error) ? "absent" : "unexaminable";
  }
}
//@ chunk-e6aww6q8.js:721983-722017 placement
/**
 * isTempSiblingName：是否有临时兄弟后缀。
 */
function isTempSiblingName(e) {
  return TEMP_SUFFIX_RE.test(e);
}
//@ chunk-e6aww6q8.js:722017-722058 placement
/**
 * stripTempSiblingSuffix：去掉临时兄弟后缀。
 */
function stripTempSiblingSuffix(e) {
  return e.replace(TEMP_SUFFIX_RE, "");
}
//@ chunk-e6aww6q8.js:722058-722075 placement
var TEMP_SIBLING_TTL_MS = 86400000;
//@ chunk-e6aww6q8.js:722075-722480 placement
/**
 * 清理版本目录旁过期的临时兄弟项。
 */
async function sweepStaleTempSiblings(e) {
  let n = dirname(e);
  let r = basename(e);
  let s = await readdir(n).catch(() => []);
  let h = Date.now() - TEMP_SIBLING_TTL_MS;
  await Promise.all(
    s.map(async (y) => {
      let S = classifyTempSibling(y, r);
      if (S === null) return;
      let w = join(n, y);
      let L = await lstat(w).catch(() => null);
      if (L === null || L.mtimeMs >= h) return;
      if (await isLinkLike(w, L)) {
        await unlink(w).catch(() => rmdir(w).catch(() => {}));
        return;
      }
      if (S === "scratch") {
        if (!L.isDirectory()) await unlink(w).catch(() => {});
        return;
      }
      await removeDirectoryTreeNoFollow_2(w).catch(() => {});
    }),
  );
}
//@ chunk-e6aww6q8.js:722480-722495 placement
var VERSION_DIR_DELETE_GRACE_MS = 600000;
//@ chunk-e6aww6q8.js:722495-723808 placement
/**
 * 尝试删除版本目录：是链接、含非可清理项或有新鲜标记时返回 held；清理 in_use 标记目录、node_modules 与临时项后 rmdir， 成功返回 removed。
 */
async function removeVersionDirIfIdle(e) {
  let n;
  try {
    n = await lstat(e);
  } catch (error) {
    if (!isPathAbsent(error)) return "held";
    n = null;
  }
  if (n !== null && (await isLinkLike(e, n))) return "held";
  let r;
  try {
    r = await readdir(e);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return "removed";
    if (errnoCode !== "ENOTDIR") throw error;
    let y;
    try {
      y = await lstat(e);
    } catch (error) {
      if (!isPathAbsent(error)) return "held";
      y = null;
    }
    if (y === null) return "removed";
    if (y.isDirectory() || y.isSymbolicLink() || e.endsWith(".zip")) return "held";
    await unlink(e);
    return "removed";
  }
  for (let s of r) {
    if (!isCacheEntryName(s)) return "held";
    if (isNodeModulesSegment(s)) {
      let h = await lstat(join(e, s)).catch(() => null);
      if (h === null || isFreshTimestamp_2(h.mtimeMs, VERSION_DIR_DELETE_GRACE_MS)) return "held";
    }
  }
  for (let s of r) {
    let h = join(e, s);
    let y = normalizePathSegment(s);
    try {
      if (y === IN_USE_MARKER_FILE) {
        let S = await lstat(h).catch(() => null);
        if (S !== null && !S.isDirectory()) {
          if ((await removePathEntry(h)) === "directory") return "held";
        } else {
          if (S !== null && !(await isLinkLike(h, S))) await removeStaleMarkerFiles(h);
          await rmdir(h);
        }
      } else if (
        y === "node_modules" ||
        isOwnTempName(y, LINKS_MATERIALIZED_MARKER_2) ||
        isOwnTempName(y, "node_modules")
      ) {
        let S = await lstat(h).catch((error) => {
          if (isPathAbsent(error)) return null;
          throw error;
        });
        if (S !== null && (await isLinkLike(h, S))) {
          if ((await removePathEntry(h)) === "directory") return "held";
        } else if (y === "node_modules") {
          let tempSiblingPath = makeTempSiblingPath(h);
          await retryFsOp(h, tempSiblingPath);
          await removeDirectoryTreeNoFollow_2(tempSiblingPath);
        } else await removeDirectoryTreeNoFollow_2(h);
      } else if ((await removePathEntry(h)) === "directory") return "held";
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return "held";
      if (!isPathAbsent(error)) throw error;
    }
  }
  try {
    await rmdir(e);
    return "removed";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return "held";
    if (isPathAbsent(error)) return "removed";
    throw error;
  }
}
//@ chunk-e6aww6q8.js:723808-724136 placement
/**
 * 目录及其内容都超过期限时删除遗留目录。
 */
async function removeStaleLeftover(cachePath) {
  let n = Date.now() - TEMP_SIBLING_TTL_MS;
  try {
    if ((await lstat(cachePath)).mtimeMs >= n) return false;
    let r = await readdir(cachePath);
    if (
      (await Promise.all(r.map((h) => lstat(join(cachePath, h)).catch(() => null)))).some(
        (h) => h === null || h.mtimeMs >= n,
      )
    )
      return false;
  } catch {
    return false;
  }
  return removeVersionDirIfIdle(cachePath).then(
    (r) => r === "removed",
    (error) => {
      logForDebugging(`Plugin cache: cannot remove leftover ${cachePath}: ${errorMessage(error)}`);
      return false;
    },
  );
}
//@ chunk-e6aww6q8.js:724136-724184 placement
/**
 * removeDirectoryTreeNoFollow：不跟随符号链接删除目录树。
 */
async function removeDirectoryTreeNoFollow(e) {
  await removeDirectoryTreeNoFollow_2(e).catch(() => {});
}
//@ chunk-e6aww6q8.js:724184-724353 placement
/**
 * 检查路径从自身父目录到 base 之间是否有符号链接或无法检查的祖先目录；有则不信任存储层（storageV5）对该路径的操作。
 */
async function hasLinkedAncestorBelow(e, n) {
  let r = dirname(n);
  for (let s = dirname(e); ; s = dirname(s)) {
    let h = await classifyCacheEntry(s);
    if (h === "symlink" || h === "unexaminable") return true;
    if (s === r || !s.startsWith(r + sep)) return false;
  }
}
export {
  versionPathOccupantError,
  classifyCacheEntry,
  hasRealEntries,
  resolveLinkChainFromParent,
  createLinkTargetScreen,
  isPathUnder,
  withdrawScreenMarker,
  materializePluginLinks,
  materializeVersionLinksOnce,
  isCacheSkipEntry,
  isCacheEntryName,
  isTempSiblingName,
  freshSymlinkCopyBudget,
  consumeSymlinkCopyBudget,
  pathHasNodeModulesSegment,
  sweepStaleTempSiblings,
  makeTempSiblingName,
  hasLinkedAncestorBelow,
  moveIntoVersionPath,
  removeVersionDirIfIdle,
  removeDirectoryTreeNoFollow,
  removeStaleLeftover,
  dirHasAnyEntry,
  stripTempSiblingSuffix,
};
