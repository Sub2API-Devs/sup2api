/**
 * utils/fsSafety/pathRevalidation.ts
 *
 * 2.1.316 新增：固定写入目标一次（检查拼写与目录身份）；打开文件读取，并确认打开的就是权限检查批准的路径等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (25)
 * attribution: placement 25
 */
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  mkdir,
  mkdir as mkdir_2,
} from "fs/promises";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
} from "path";
import { READ_LIMITS, probeNoFollowAny, MAX_BOUND_READ_BYTES, isUncOrDevicePath } from "../fsBoundRead.js";
import { isPathAbsent, getErrnoCode } from "../errors.js";
import { SymlinkReadRefusedError, SymlinkWriteRefusedError } from "./atomicWriteStaging.js";
import {
  getFsImplementation,
  vouchedLaunchAncestry,
  isSpelledStrictAncestor,
  safeResolvePath,
  walkPermissionCheckPaths,
} from "../fsOperations.js";
import { hl } from "../networkPaths.js";
import { logForDebugging } from "../debug.js";
import { getPlatform } from "../platform.js";
import { readFileHandleChecked } from "../fileRead.js";

/**
 * 可中止地打开文件。
 */
//@ chunk-t0gq9gyw.js:9127-9458 placement
async function openWithAbort(e, n, r, o, s) {
  s?.throwIfAborted();
  let a = o ? openNoFollow(e, n, r) : open_3(e, n | READ_LIMITS);
  if (!s) return a;
  let c,
    promise = new Promise((p, y) => {
      ((c = () => y(s.reason ?? Error("aborted"))), s.addEventListener("abort", c, { once: !0 }));
    });
  try {
    return await Promise.race([a, promise]);
  } catch (error) {
    throw (
      a.then(
        (y) => y.close(),
        () => {},
      ),
      error
    );
  } finally {
    if (c) s.removeEventListener("abort", c);
  }
}
//@ chunk-t0gq9gyw.js:9458-9534 placement
var gi = /^(?:\/dev\/(?:stdin|stdout|stderr|fd\/\d+)|\/proc\/self\/fd\/\d+)$/;
/**
 * 路径是否为本进程的 /proc/<pid>/fd/<n> 或同类描述符路径。
 */
//@ chunk-t0gq9gyw.js:9534-9643 placement
function isProcFdPath(e) {
  return gi.test(e) || (/^\/proc\/\d+\/fd\/\d+$/.test(e) && e.startsWith(`/proc/${process.pid}/fd/`));
}
//@ chunk-t0gq9gyw.js:9643-9686 placement
function J1e(e) {
  return `/proc/self/fd/${e}`;
}
//@ chunk-t0gq9gyw.js:9686-9701 placement
var pi = 2097152;
/**
 * macOS 上不跟随链接打开。
 */
//@ chunk-t0gq9gyw.js:9701-9808 placement = getReservedShortcuts (0.773)
async function openNoFollow(e, n, r) {
  if (r !== "macos" || (await probeNoFollowAny())) return open_3(e, n | READ_LIMITS);
  return open_3(e, (n & ~constants_5.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | READ_LIMITS);
}
/**
 * 路径是否在 macOS 特殊卷上。
 */
//@ chunk-t0gq9gyw.js:9808-10177 placement
async function isOnMacosVolume(e, n, r) {
  if (r !== "macos") return !1;
  for (let s = e; ; s = dirname_3(s)) {
    try {
      if (!(await lstat_4(s)).isDirectory()) return !1;
    } catch {
      return !1;
    }
    if (dirname_3(s) === s) break;
  }
  let o;
  try {
    o = await open_3(e, constants_5.O_RDONLY | constants_5.O_DIRECTORY | MAX_BOUND_READ_BYTES | READ_LIMITS);
  } catch {
    return !1;
  }
  try {
    let [s, a] = await Promise.all([o.stat({ bigint: !0 }), n.stat({ bigint: !0 })]);
    return s.ino === a.ino && s.dev === a.dev;
  } catch {
    return !1;
  } finally {
    await o.close();
  }
}
/**
 * 打开后重新验证失败的原因说明。
 */
//@ chunk-t0gq9gyw.js:10177-10652 placement
var REVALIDATION_MESSAGES = {
  chain: "a link on the way now leads somewhere the check did not see",
  networkLink: "a link now stands at the network path",
  junction: "the junction no longer leads to the approved share",
  unrenderable: "its real path can no longer be determined",
  rendering: "it now resolves to a path the check did not see",
  linkOnApproved: "a link now stands on the approved path",
  openedElsewhere: "it opened at a different path than approved",
  afterOpen: "it re-resolved elsewhere once opened",
};
//@ chunk-t0gq9gyw.js:10652-10736 placement
async function cQt(e) {
  try {
    return await readlink_3(J1e(e));
  } catch (error) {
    if (isPathAbsent(error)) return;
    throw error;
  }
}
/**
 * 读取描述符实际打开的路径；失败时按拼写模式放行或拒绝读取。
 */
//@ chunk-t0gq9gyw.js:10736-11033 placement
async function readOpenedPath(e, n, r) {
  try {
    return await cQt(e.fd);
  } catch (error) {
    if (r === "by-spelling") return;
    throw new SymlinkReadRefusedError(
      `Refusing to read ${n}: the system would not say where it was opened (reading /proc/self/fd failed with ${getErrnoCode(error) ?? "an error"}), so it cannot be told apart from a path this session may not read.`,
    );
  }
}
/**
 * 权限检查后符号链接解析发生变化的拒绝读取错误。
 */
//@ chunk-t0gq9gyw.js:11033-11251 placement
function resolutionChangedError(e, n) {
  return new SymlinkReadRefusedError(
    `Refusing to read ${e}: its symlink resolution changed after permission was checked (${REVALIDATION_MESSAGES[n]}). If a link in the working directory is being rewritten concurrently, stop that and retry.`,
  );
}
//@ chunk-t0gq9gyw.js:11251-11261 placement
var Xt = !1;
/**
 * 对路径链逐段 lstat。
 */
//@ chunk-t0gq9gyw.js:11261-11983 placement
async function statChain(e) {
  let n = [];
  for (let c = e; ; c = dirname_3(c)) if ((n.unshift(c), dirname_3(c) === c)) break;
  let r = getFsImplementation(),
    o,
    s = [],
    a = [];
  for (let c of n) {
    try {
      let u = await lstat_4(c, { bigint: !0 });
      if (!(c === e ? u.isFile() : u.isDirectory())) return;
      (s.push(u), a.push("lstat"));
      continue;
    } catch (error) {
      let p = getErrnoCode(error);
      if (c === e || (p !== "EPERM" && p !== "EACCES")) return;
    }
    {
      let u = await statDirNoFollow(c);
      if (u === void 0) return;
      (s.push(u), a.push("open"));
      continue;
    }
    if (
      ((o ??= vouchedLaunchAncestry(r)),
      o !== null && a.slice(1).every((u) => u === "passed") && isSpelledStrictAncestor(c, o))
    ) {
      (s.push(void 0), a.push("passed"));
      continue;
    }
    return;
  }
  for (let c = 0; c < n.length - 1; c++) {
    let u = s[c];
    if (u === void 0) continue;
    let p;
    try {
      p = a[c] === "open" ? await statDirNoFollow(n[c]) : await lstat_4(n[c], { bigint: !0 });
    } catch {
      return;
    }
    if (p === void 0 || !p.isDirectory() || p.dev !== u.dev || p.ino !== u.ino) return;
  }
  return s.at(-1);
}
/**
 * 以 O_DIRECTORY|O_NOFOLLOW 打开并 stat 目录（失败返回 undefined）。
 */
//@ chunk-t0gq9gyw.js:11983-12202 placement
async function statDirNoFollow(e) {
  let n;
  try {
    n = await open_3(
      e,
      constants_5.O_RDONLY | constants_5.O_DIRECTORY | constants_5.O_NOFOLLOW | READ_LIMITS,
    );
  } catch {
    return;
  }
  try {
    let stats = await n.stat({ bigint: !0 });
    return stats.isDirectory() ? stats : void 0;
  } catch {
    return;
  } finally {
    await n.close().catch(() => {});
  }
}
//@ chunk-t0gq9gyw.js:12202-12246 placement
function ct(e) {
  return isAbsolute_2(e) && !hl(e) && !isProcFdPath(e);
}
/**
 * 最后一个存在路径的身份（dev/ino）。
 */
//@ chunk-t0gq9gyw.js:12246-12393 placement = getFileIdentity (0.794)
async function lastExistingIdentity(filePath) {
  for (let n = filePath.length - 1; n >= 0; n--) {
    let r = filePath[n];
    if (!ct(r)) continue;
    let o = await statChain(r);
    if (o) return { dev: o.dev, ino: o.ino };
  }
  return null;
}
/**
 * 沿路径链重新打开并核对。
 */
//@ chunk-t0gq9gyw.js:12393-13013 placement
async function reopenThroughChain(e, n, r, o, s) {
  if (s == null) return;
  for (let a = n.length - 1; a >= 0; a--) {
    let c = n[a];
    if (!ct(c) || (!Xt && !(await statChain(c)))) continue;
    let u;
    try {
      u = await openWithAbort(
        c,
        (r & ~constants_5.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | constants_5.O_NONBLOCK,
        "macos",
        !1,
        o,
      );
    } catch (error) {
      if (o?.aborted) throw o.reason ?? error;
      continue;
    }
    let p = await u.stat({ bigint: !0 }).catch(() => {
      return;
    });
    if (p?.isFile() && p.dev === s.dev && p.ino === s.ino)
      return (
        logForDebugging(
          `openReadBoundToApproval: the fresh resolution of ${e} is not verbatim what the check approved (or realpath could not render it); reading approved ${c}, opened link-free`,
        ),
        { canonicalPath: c, ioPath: c, handle: u, close: () => u.close() }
      );
    await u.close().catch(() => {});
  }
  return;
}
/**
 * 打开文件读取，并确认打开的就是权限检查批准的路径。
 */
//@ chunk-t0gq9gyw.js:13013-15665 placement
async function openReadBoundToApproval(e, n, r, o, s = "by-spelling") {
  let a = new Set(n),
    c = getPlatform(),
    u = c === "windows" ? constants_5.O_RDONLY : constants_5.O_RDONLY | constants_5.O_NOCTTY,
    p = c === "windows" ? u : u | constants_5.O_NOFOLLOW,
    y = safeResolvePath(getFsImplementation(), e),
    w = (P) => o != null && P.isFile() && P.dev === o.dev && P.ino === o.ino,
    E = async (P = y) => {
      let resolvedPath = P.resolvedPath;
      if (o == null || !P.isCanonical || !ct(resolvedPath) || resolvedPath.startsWith("/dev/")) return !1;
      if (!Xt) {
        let A = await statChain(resolvedPath);
        return A !== void 0 && w(A);
      }
      let S;
      try {
        S = await openWithAbort(
          resolvedPath,
          (p & ~constants_5.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | constants_5.O_NONBLOCK,
          "macos",
          !1,
          r,
        );
      } catch (error) {
        if (r?.aborted) throw r.reason ?? error;
        return !1;
      }
      try {
        return await S.stat({ bigint: !0 }).then(w, () => !1);
      } finally {
        await S.close().catch(() => {});
      }
    },
    h = async (P) => {
      if (c === "macos" && (await E())) {
        let j = await reopenThroughChain(e, n, p, r, o);
        if (j) return j;
      }
      throw resolutionChangedError(e, P);
    },
    b = walkPermissionCheckPaths(e);
  if (b.unresolved) throw resolutionChangedError(e, "unrenderable");
  for (let spelling of b.spellings)
    if (!a.has(spelling)) return h(y.isCanonical && spelling === y.resolvedPath ? "rendering" : "chain");
  let v = async (P, j) => {
    if ((await lstat_4(P)).isSymbolicLink()) throw resolutionChangedError(e, "networkLink");
    let S = await openWithAbort(P, p, c, !j, r);
    if (c === "linux" || c === "wsl") {
      let A = await readOpenedPath(S, e, s).catch(async (x) => {
        throw (await S.close().catch(() => {}), x);
      });
      if (A !== void 0 && A !== P && !a.has(A))
        throw (await S.close().catch(() => {}), resolutionChangedError(e, "openedElsewhere"));
      if (A !== void 0) return { ioPath: J1e(S.fd), canonicalPath: P, handle: S, close: () => S.close() };
    }
    return { ioPath: P, canonicalPath: P, handle: S, close: () => S.close() };
  };
  if (isUncOrDevicePath(e, c)) return v(e, !1);
  let _ =
    isProcFdPath(e) &&
    !isAbsolute_2(y.resolvedPath) &&
    /^(?:pipe|socket|anon_inode):\[/.test(y.resolvedPath) &&
    basename_2(b.landing) === y.resolvedPath;
  if (!y.isCanonical && !_) {
    if (y.isSymlink || y.resolvedPath !== e) {
      if (a.has(y.resolvedPath) && isUncOrDevicePath(y.resolvedPath, c)) {
        let S = c === "macos" ? await v(y.resolvedPath, !1) : await v(e, !0),
          A = safeResolvePath(getFsImplementation(), e);
        if (A.isCanonical || A.resolvedPath !== y.resolvedPath)
          throw (await S.close().catch(() => {}), resolutionChangedError(e, "junction"));
        return S;
      }
      throw resolutionChangedError(e, "junction");
    }
    let P = await openWithAbort(e, c === "macos" ? u | constants_5.O_NONBLOCK : u, c, !1, r),
      j =
        c === "macos" && o != null
          ? await P.stat({ bigint: !0 }).catch(() => {
              return;
            })
          : void 0;
    if ((await P.close().catch(() => {}), j && w(j))) {
      let S = await reopenThroughChain(e, n, p, r, o);
      if (S) return S;
    }
    throw resolutionChangedError(e, "unrenderable");
  }
  if (!_ && !a.has(y.resolvedPath)) return h("rendering");
  let R = _ ? e : y.resolvedPath,
    L;
  try {
    L = await openWithAbort(R, _ ? p & ~constants_5.O_NOFOLLOW : p, c, !_, r);
  } catch (error) {
    if (getErrnoCode(error) === "ELOOP") throw resolutionChangedError(e, "linkOnApproved");
    throw error;
  }
  try {
    let P = R;
    if (c === "linux" || c === "wsl") {
      let S = await readOpenedPath(L, e, s);
      if (S !== void 0) {
        if (S !== (_ ? y.resolvedPath : R)) throw resolutionChangedError(e, "openedElsewhere");
        P = J1e(L.fd);
      }
    }
    if (P === R) {
      let S = walkPermissionCheckPaths(e);
      if (S.unresolved) throw resolutionChangedError(e, "afterOpen");
      for (let spelling of S.spellings)
        if (!a.has(spelling)) {
          if (
            c === "macos" &&
            (await E(safeResolvePath(getFsImplementation(), e))) &&
            (await L.stat({ bigint: !0 }).then(w, () => !1))
          )
            break;
          throw resolutionChangedError(e, "afterOpen");
        }
    }
    let j = L;
    return { canonicalPath: R, ioPath: P, handle: j, close: () => j.close() };
  } catch (error) {
    throw (await L.close().catch(() => {}), error);
  }
}
/**
 * 持有的目录已消失的错误（带目录与是否已报告）。
 */
//@ chunk-t0gq9gyw.js:15665-15779 placement
class HeldDirVanishedError extends Error {
  dir;
  reported;
  constructor(e, n) {
    super("held directory vanished");
    this.dir = e;
    this.reported = n;
  }
}
//@ chunk-t0gq9gyw.js:15779-15788 placement
var Yt = 3;
/**
 * 权限检查后父目录符号链接解析发生变化的拒绝写入错误。
 */
//@ chunk-t0gq9gyw.js:15788-15922 placement
function parentResolutionChangedError(e) {
  return new SymlinkWriteRefusedError(
    `Refusing to write ${e}: its parent-directory symlink resolution changed after permission was checked.`,
  );
}
/**
 * 拒绝写入符号链接。
 */
//@ chunk-t0gq9gyw.js:15922-16465 placement
async function refuseSymlinkWrite(e, n, r, o, s = !1) {
  let a = () =>
    new SymlinkWriteRefusedError(
      `Refusing to write ${n}: it is a symbolic link. Write to the link's target path instead.`,
    );
  if (r === "windows")
    try {
      if ((await lstat_4(e)).isSymbolicLink()) throw a();
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw error;
    }
  let c =
      r === "windows"
        ? constants_5.O_RDONLY
        : constants_5.O_RDONLY |
          constants_5.O_NOFOLLOW |
          constants_5.O_NONBLOCK |
          (constants_5.O_NOCTTY ?? 0),
    u;
  try {
    u = s ? await open_3(e, c | READ_LIMITS) : await openNoFollow(e, c, r);
  } catch (error) {
    let y = getErrnoCode(error);
    if (y === "ENOENT") return null;
    if (y === "ELOOP" || y === "EMLINK" || y === "EFTYPE") throw a();
    throw error;
  }
  try {
    return await readFileHandleChecked(u, n, o);
  } finally {
    await u.close();
  }
}
/**
 * 固定写入目标（目录被删时重试）。
 */
//@ chunk-t0gq9gyw.js:16465-16733 placement
async function pinWriteTarget(e, n, r) {
  for (let o = 1; ; o++)
    try {
      return await pinWriteTargetOnce(e, n, r);
    } catch (error) {
      if (!(error instanceof HeldDirVanishedError)) throw error;
      if (
        (logForDebugging(
          `pinWriteTarget: ${error.dir} was removed while held (attempt ${o}); ${o < Yt ? "taking the pin again" : "refusing"}`,
          { level: "warn" },
        ),
        o >= Yt)
      )
        throw error.reported ?? parentResolutionChangedError(e);
    }
}
/**
 * 固定写入目标一次（检查拼写与目录身份）。
 */
//@ chunk-t0gq9gyw.js:16733-20898 placement
async function pinWriteTargetOnce(e, n, r) {
  let o = new Set(n),
    s = basename_2(e),
    a = getPlatform(),
    c = () => {
      let S = walkPermissionCheckPaths(r?.leaf === "replace" ? dirname_3(e) : e),
        A = r?.leaf === "replace" ? S.spellings.map((spelling) => join_2(spelling, s)) : S.spellings;
      return !S.unresolved && A.every((x) => o.has(x));
    },
    u = () => {
      if (!c()) throw parentResolutionChangedError(e);
    },
    p = c();
  if (!p && !(a === "macos" && !isUncOrDevicePath(e, a))) throw parentResolutionChangedError(e);
  let y = async (S, A, x) => {
      if (!(await isOnMacosVolume(S, x, a)))
        return (
          logForDebugging(
            `pinWriteTarget: ${S} resolves to ${A}: not the same directory by a link-free route; refused`,
            { level: "warn" },
          ),
          !1
        );
      return (
        logForDebugging(
          `pinWriteTarget: ${S} is rendered ${A} by realpath; same directory (device and inode), treated as an alias`,
        ),
        !0
      );
    },
    w = (S) => o.has(join_2(S, s)),
    E = (S) => {
      let A = safeResolvePath(getFsImplementation(), S);
      if (!A.isCanonical) throw parentResolutionChangedError(e);
      return A.resolvedPath;
    },
    h = (S) => {
      let A = safeResolvePath(getFsImplementation(), S);
      return A.isCanonical ? A.resolvedPath : S;
    };
  if (isUncOrDevicePath(e, a) && a !== "linux" && a !== "wsl") {
    let S = async (x) => {
      if (a !== "macos") return;
      for (let T = x; ; T = dirname_3(T))
        try {
          await (await openNoFollow(T, constants_5.O_RDONLY | constants_5.O_DIRECTORY, a)).close();
          return;
        } catch (error) {
          let ee = getErrnoCode(error);
          if (ee === "ELOOP") throw parentResolutionChangedError(e);
          if (ee !== "ENOENT" || dirname_3(T) === T) throw error;
        }
    };
    if ((await S(dirname_3(e)), r?.createParents))
      (await getFsImplementation().mkdir(dirname_3(e)), await S(dirname_3(e)));
    let A = async () => {
      if ((u(), a !== "macos")) return;
      try {
        await (await openNoFollow(dirname_3(e), constants_5.O_RDONLY | constants_5.O_DIRECTORY, a)).close();
      } catch (error) {
        throw getErrnoCode(error) === "ELOOP" ? parentResolutionChangedError(e) : error;
      }
    };
    return {
      ioPath: e,
      canonicalPath: e,
      readExisting: async (x) => {
        await A();
        let T = await refuseSymlinkWrite(e, e, a, x, !1);
        return (await A(), T);
      },
      recheckBeforeWrite: A,
      close: async () => {},
    };
  }
  let b = async () => {
    if (r?.createParents) (await getFsImplementation().mkdir(dirname_3(e)), u());
    let S = safeResolvePath(getFsImplementation(), dirname_3(e));
    if (
      !S.isCanonical &&
      !(S.isSymlink && w(S.resolvedPath) && isUncOrDevicePath(join_2(S.resolvedPath, s), a))
    ) {
      if (!S.isSymlink) await lstat_4(dirname_3(e));
      throw parentResolutionChangedError(e);
    }
    let A = !S.isCanonical,
      resolvedPath = S.resolvedPath;
    if (!w(resolvedPath)) throw parentResolutionChangedError(e);
    return {
      ioPath: e,
      canonicalPath: join_2(resolvedPath, s),
      readExisting: async (T) => {
        u();
        let G = await refuseSymlinkWrite(e, e, a, T, A);
        if ((u(), A && safeResolvePath(getFsImplementation(), dirname_3(e)).resolvedPath !== resolvedPath))
          throw parentResolutionChangedError(e);
        return G;
      },
      recheckBeforeWrite: u,
      close: async () => {},
    };
  };
  if (a === "windows") return b();
  let _ =
      a === "linux" || a === "wsl"
        ? pi | constants_5.O_DIRECTORY
        : constants_5.O_RDONLY | constants_5.O_DIRECTORY,
    R = dirname_3(e),
    L = [],
    P,
    j = "";
  for (;;)
    try {
      ((j = a === "macos" ? h(R) : R), (P = await openNoFollow(j, _, a)));
      break;
    } catch (error) {
      let A = getErrnoCode(error),
        x = dirname_3(R),
        T =
          A === "ELOOP" && a === "macos" && j === R && !safeResolvePath(getFsImplementation(), R).isCanonical;
      if (A === "ELOOP" && !T) {
        let G = safeResolvePath(getFsImplementation(), dirname_3(e));
        if (
          p &&
          !G.isCanonical &&
          G.isSymlink &&
          w(G.resolvedPath) &&
          isUncOrDevicePath(join_2(G.resolvedPath, s), a)
        )
          return b();
        throw parentResolutionChangedError(e);
      }
      if (T && !r?.createParents) {
        let G = [basename_2(R)];
        for (let ee = x; ; ee = dirname_3(ee)) {
          let D = safeResolvePath(getFsImplementation(), ee);
          if (D.isCanonical) {
            await lstat_4(join_2(D.resolvedPath, G[0]));
            break;
          }
          if (dirname_3(ee) === ee) break;
          G.unshift(basename_2(ee));
        }
        throw parentResolutionChangedError(e);
      }
      if ((A === "ENOENT" || T) && r?.createParents && x !== R) {
        (L.unshift(basename_2(R)), (R = x));
        continue;
      }
      throw error;
    }
  try {
    let S = !1,
      A = async (D, J) => {
        let Q =
          a === "linux" || a === "wsl"
            ? await cQt(D.fd).catch(() => {
                return;
              })
            : void 0;
        if (Q === void 0) return E(J);
        if (((S = !0), Q.endsWith(" (deleted)"))) throw new HeldDirVanishedError(J);
        return Q;
      },
      x = await A(P, R);
    if (!S && x !== R && !w(join_2(x, ...L)) && w(join_2(R, ...L)) && (await y(R, x, P))) x = R;
    let T = join_2(x, ...L);
    if (!w(T)) {
      if (
        L.length === 0 &&
        (await lstat_4(join_2(S ? `/proc/self/fd/${P.fd}` : x, s)).then(
          (J) => J.isSymbolicLink(),
          () => !1,
        ))
      )
        throw new SymlinkWriteRefusedError(
          `Refusing to write ${e}: it is a symbolic link. Write to the link's target path instead.`,
        );
      throw parentResolutionChangedError(e);
    }
    for (let D of L) {
      let J = S ? `/proc/self/fd/${P.fd}` : x,
        Q = null;
      try {
        await mkdir_2(join_2(J, D));
      } catch (error) {
        if (((Q = error), getErrnoCode(error) === "ENOENT")) throw new HeldDirVanishedError(x);
        if (getErrnoCode(error) !== "EEXIST")
          rethrowWithPath(error, { ioPath: join_2(J, D), canonicalPath: join_2(x, D) }, join_2(x, D));
      }
      let re;
      try {
        re = await openNoFollow(join_2(J, D), _ | constants_5.O_NOFOLLOW, a);
      } catch (error) {
        if (getErrnoCode(error) === "ELOOP" || getErrnoCode(error) === "ENOTDIR")
          throw parentResolutionChangedError(e);
        if (getErrnoCode(error) === "ENOENT") {
          let Te;
          if (Q !== null)
            try {
              rethrowWithPath(Q, { ioPath: join_2(J, D), canonicalPath: join_2(x, D) }, join_2(x, D));
            } catch (error) {
              Te = error;
            }
          throw new HeldDirVanishedError(join_2(x, D), Te);
        }
        rethrowWithPath(
          Q !== null ? Q : error,
          { ioPath: join_2(J, D), canonicalPath: join_2(x, D) },
          join_2(x, D),
        );
      }
      (await P.close(), (P = re));
      let ue = join_2(x, D);
      if (((x = await A(P, ue)), x !== ue)) {
        if (S || !(await y(ue, x, P))) throw parentResolutionChangedError(e);
        x = ue;
      }
    }
    if (!S) {
      let D = P,
        J = async () => {
          if (c()) return;
          if (!(await isOnMacosVolume(T, D, a))) throw parentResolutionChangedError(e);
          if (
            r?.leaf !== "replace" &&
            (await lstat_4(join_2(T, s)).then(
              (re) => re.isSymbolicLink(),
              (re) => getErrnoCode(re) !== "ENOENT",
            ))
          )
            throw parentResolutionChangedError(e);
        };
      await J();
      let Q = join_2(T, s);
      return {
        ioPath: Q,
        canonicalPath: Q,
        readExisting: async (re) => {
          await J();
          let ue = await refuseSymlinkWrite(Q, e, a, re);
          return (await J(), ue);
        },
        recheckBeforeWrite: J,
        close: () => D.close(),
      };
    }
    let G = P,
      ee = `/proc/self/fd/${G.fd}/${s}`;
    return {
      ioPath: ee,
      canonicalPath: join_2(T, s),
      readExisting: (D) => refuseSymlinkWrite(ee, e, a, D),
      recheckBeforeWrite: () => {},
      close: () => G.close(),
    };
  } catch (error) {
    throw (await P.close().catch(() => {}), error);
  }
}
/**
 * 把错误信息中的内部路径替换为显示路径后重抛。
 */
//@ chunk-t0gq9gyw.js:20898-21062 placement
function rethrowWithPath(e, n, r) {
  if (e instanceof Error) {
    let message = e.message;
    for (let s of [n.ioPath, n.canonicalPath]) if (s !== r) message = message.split(s).join(r);
    if (message !== e.message) e.message = message;
  }
  throw e;
}

export {
  pinWriteTarget,
  openNoFollow,
  J1e,
  refuseSymlinkWrite,
  openWithAbort,
  lastExistingIdentity,
  openReadBoundToApproval,
  rethrowWithPath,
  statChain,
  cQt,
};
