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
import { open, lstat, readlink, mkdir } from "fs/promises";
import { constants } from "fs";
import { dirname, isAbsolute, basename, join } from "path";
import {
  READ_LIMITS,
  probeNoFollowAny,
  MAX_BOUND_READ_BYTES,
  isUncOrDevicePath as isUncOrDevicePath_2,
} from "../fsBoundRead.js";
import { isPathAbsent, getErrnoCode } from "../errors.js";
import { SymlinkReadRefusedError, SymlinkWriteRefusedError } from "./atomicWriteStaging.js";
import {
  getFsImplementation,
  vouchedLaunchAncestry,
  isSpelledStrictAncestor,
  safeResolvePath,
  walkPermissionCheckPaths,
} from "../fsOperations.js";
import { isUntouchableSpelling } from "../networkPaths.js";
import { logForDebugging } from "../debug.js";
import { getPlatform } from "../platform.js";
import { readFileHandleChecked } from "../fileRead.js";

//@ chunk-t0gq9gyw.js:9127-9458 placement
/**
 * 可中止地打开文件。
 */
async function openWithAbort(e, n, platform, o, s) {
  s?.throwIfAborted();
  let a = o ? openNoFollow(e, n, platform) : open(e, n | READ_LIMITS);
  if (!s) return a;
  let c;
  let promise = new Promise((resolve, reject) => {
    c = () => reject(s.reason ?? Error("aborted"));
    s.addEventListener("abort", c, {
      once: true,
    });
  });
  try {
    return await Promise.race([a, promise]);
  } catch (error) {
    a.then(
      (y) => y.close(),
      () => {},
    );
    throw error;
  } finally {
    if (c) s.removeEventListener("abort", c);
  }
}
//@ chunk-t0gq9gyw.js:9458-9534 placement
var DESCRIPTOR_PATH_RE = /^(?:\/dev\/(?:stdin|stdout|stderr|fd\/\d+)|\/proc\/self\/fd\/\d+)$/;
//@ chunk-t0gq9gyw.js:9534-9643 placement
/**
 * 路径是否为本进程的 /proc/<pid>/fd/<n> 或同类描述符路径。
 */
function isProcFdPath(e) {
  return (
    DESCRIPTOR_PATH_RE.test(e) ||
    (/^\/proc\/\d+\/fd\/\d+$/.test(e) && e.startsWith(`/proc/${process.pid}/fd/`))
  );
}
//@ chunk-t0gq9gyw.js:9643-9686 placement
/**
 * 拼出 /proc/self/fd/<n> 路径。
 */
function procFdPath(e) {
  return `/proc/self/fd/${e}`;
}
//@ chunk-t0gq9gyw.js:9686-9701 placement
var O_NOFOLLOW_ANY = 2097152;
//@ chunk-t0gq9gyw.js:9701-9808 placement = getReservedShortcuts (0.773)
/**
 * macOS 上不跟随链接打开。
 */
async function openNoFollow(e, n, platform) {
  if (platform !== "macos" || (await probeNoFollowAny())) return open(e, n | READ_LIMITS);
  return open(e, (n & ~constants.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | READ_LIMITS);
}
//@ chunk-t0gq9gyw.js:9808-10177 placement
/**
 * 路径是否在 macOS 特殊卷上。
 */
async function isOnMacosVolume(e, n, platform) {
  if (platform !== "macos") return false;
  for (let s = e; ; s = dirname(s)) {
    try {
      if (!(await lstat(s)).isDirectory()) return false;
    } catch {
      return false;
    }
    if (dirname(s) === s) break;
  }
  let o;
  try {
    o = await open(e, constants.O_RDONLY | constants.O_DIRECTORY | MAX_BOUND_READ_BYTES | READ_LIMITS);
  } catch {
    return false;
  }
  try {
    let [s, a] = await Promise.all([
      o.stat({
        bigint: true,
      }),
      n.stat({
        bigint: true,
      }),
    ]);
    return s.ino === a.ino && s.dev === a.dev;
  } catch {
    return false;
  } finally {
    await o.close();
  }
}
//@ chunk-t0gq9gyw.js:10177-10652 placement
/**
 * 打开后重新验证失败的原因说明。
 */
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
/**
 * 读取文件描述符实际指向的路径；目标不存在时返回 undefined。
 */
async function readFdTargetPath(e) {
  try {
    return await readlink(procFdPath(e));
  } catch (error) {
    if (isPathAbsent(error)) return;
    throw error;
  }
}
//@ chunk-t0gq9gyw.js:10736-11033 placement
/**
 * 读取描述符实际打开的路径；失败时按拼写模式放行或拒绝读取。
 */
async function readOpenedPath(e, n, r) {
  try {
    return await readFdTargetPath(e.fd);
  } catch (error) {
    if (r === "by-spelling") return;
    throw new SymlinkReadRefusedError(
      `Refusing to read ${n}: the system would not say where it was opened (reading /proc/self/fd failed with ${getErrnoCode(error) ?? "an error"}), so it cannot be told apart from a path this session may not read.`,
    );
  }
}
//@ chunk-t0gq9gyw.js:11033-11251 placement
/**
 * 权限检查后符号链接解析发生变化的拒绝读取错误。
 */
function resolutionChangedError(e, n) {
  return new SymlinkReadRefusedError(
    `Refusing to read ${e}: its symlink resolution changed after permission was checked (${REVALIDATION_MESSAGES[n]}). If a link in the working directory is being rewritten concurrently, stop that and retry.`,
  );
}
//@ chunk-t0gq9gyw.js:11251-11261 placement
var SKIP_STAT_CHAIN = false;
//@ chunk-t0gq9gyw.js:11261-11983 placement
/**
 * 对路径链逐段 lstat。
 */
async function statChain(e) {
  let n = [];
  for (let c = e; ; c = dirname(c)) {
    n.unshift(c);
    if (dirname(c) === c) break;
  }
  let fsImplementation = getFsImplementation();
  let o;
  let s = [];
  let a = [];
  for (let c of n) {
    try {
      let u = await lstat(c, {
        bigint: true,
      });
      if (!(c === e ? u.isFile() : u.isDirectory())) return;
      s.push(u);
      a.push("lstat");
      continue;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (c === e || (errnoCode !== "EPERM" && errnoCode !== "EACCES")) return;
    }
    {
      let u = await statDirNoFollow(c);
      if (u === undefined) return;
      s.push(u);
      a.push("open");
      continue;
    }
    o ??= vouchedLaunchAncestry(fsImplementation);
    if (o !== null && a.slice(1).every((u) => u === "passed") && isSpelledStrictAncestor(c, o)) {
      s.push(undefined);
      a.push("passed");
      continue;
    }
    return;
  }
  for (let j = 0; j < n.length - 1; j++) {
    let u = s[j];
    if (u === undefined) continue;
    let p;
    try {
      p =
        a[j] === "open"
          ? await statDirNoFollow(n[j])
          : await lstat(n[j], {
              bigint: true,
            });
    } catch {
      return;
    }
    if (p === undefined || !p.isDirectory() || p.dev !== u.dev || p.ino !== u.ino) return;
  }
  return s.at(-1);
}
//@ chunk-t0gq9gyw.js:11983-12202 placement
/**
 * 以 O_DIRECTORY|O_NOFOLLOW 打开并 stat 目录（失败返回 undefined）。
 */
async function statDirNoFollow(e) {
  let n;
  try {
    n = await open(e, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS);
  } catch {
    return;
  }
  try {
    let stats = await n.stat({
      bigint: true,
    });
    return stats.isDirectory() ? stats : undefined;
  } catch {
    return;
  } finally {
    await n.close().catch(() => {});
  }
}
//@ chunk-t0gq9gyw.js:12202-12246 placement
function isCheckableAbsolutePath(e) {
  return isAbsolute(e) && !isUntouchableSpelling(e) && !isProcFdPath(e);
}
//@ chunk-t0gq9gyw.js:12246-12393 placement = getFileIdentity (0.794)
/**
 * 最后一个存在路径的身份（dev/ino）。
 */
async function lastExistingIdentity(filePath) {
  for (let j = filePath.length - 1; j >= 0; j--) {
    let r = filePath[j];
    if (!isCheckableAbsolutePath(r)) continue;
    let o = await statChain(r);
    if (o)
      return {
        dev: o.dev,
        ino: o.ino,
      };
  }
  return null;
}
//@ chunk-t0gq9gyw.js:12393-13013 placement
/**
 * 沿路径链重新打开并核对。
 */
async function reopenThroughChain(e, n, r, o, s) {
  if (s == null) return;
  for (let j = n.length - 1; j >= 0; j--) {
    let c = n[j];
    if (!isCheckableAbsolutePath(c) || (!SKIP_STAT_CHAIN && !(await statChain(c)))) continue;
    let u;
    try {
      u = await openWithAbort(
        c,
        (r & ~constants.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | constants.O_NONBLOCK,
        "macos",
        false,
        o,
      );
    } catch (error) {
      if (o?.aborted) throw o.reason ?? error;
      continue;
    }
    let p = await u
      .stat({
        bigint: true,
      })
      .catch(() => {
        return;
      });
    if (p?.isFile() && p.dev === s.dev && p.ino === s.ino) {
      logForDebugging(
        `openReadBoundToApproval: the fresh resolution of ${e} is not verbatim what the check approved (or realpath could not render it); reading approved ${c}, opened link-free`,
      );
      return {
        canonicalPath: c,
        ioPath: c,
        handle: u,
        close: () => u.close(),
      };
    }
    await u.close().catch(() => {});
  }
  return;
}
//@ chunk-t0gq9gyw.js:13013-15665 placement
/**
 * 打开文件读取，并确认打开的就是权限检查批准的路径。
 */
async function openReadBoundToApproval(e, n, r, o, s = "by-spelling") {
  let a = new Set(n);
  let platform = getPlatform();
  let u = platform === "windows" ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOCTTY;
  let p = platform === "windows" ? u : u | constants.O_NOFOLLOW;
  let y = safeResolvePath(getFsImplementation(), e);
  let w = (P) => o != null && P.isFile() && P.dev === o.dev && P.ino === o.ino;
  let E = async (P = y) => {
    let resolvedPath = P.resolvedPath;
    if (
      o == null ||
      !P.isCanonical ||
      !isCheckableAbsolutePath(resolvedPath) ||
      resolvedPath.startsWith("/dev/")
    )
      return false;
    if (!SKIP_STAT_CHAIN) {
      let A = await statChain(resolvedPath);
      return A !== undefined && w(A);
    }
    let S;
    try {
      S = await openWithAbort(
        resolvedPath,
        (p & ~constants.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | constants.O_NONBLOCK,
        "macos",
        false,
        r,
      );
    } catch (error) {
      if (r?.aborted) throw r.reason ?? error;
      return false;
    }
    try {
      return await S.stat({
        bigint: true,
      }).then(w, () => false);
    } finally {
      await S.close().catch(() => {});
    }
  };
  let h = async (P) => {
    if (platform === "macos" && (await E())) {
      let j = await reopenThroughChain(e, n, p, r, o);
      if (j) return j;
    }
    throw resolutionChangedError(e, P);
  };
  let b = walkPermissionCheckPaths(e);
  if (b.unresolved) throw resolutionChangedError(e, "unrenderable");
  for (let spelling of b.spellings)
    if (!a.has(spelling)) return h(y.isCanonical && spelling === y.resolvedPath ? "rendering" : "chain");
  let v = async (P, j) => {
    if ((await lstat(P)).isSymbolicLink()) throw resolutionChangedError(e, "networkLink");
    let S = await openWithAbort(P, p, platform, !j, r);
    if (platform === "linux" || platform === "wsl") {
      let A = await readOpenedPath(S, e, s).catch(async (error) => {
        await S.close().catch(() => {});
        throw error;
      });
      if (A !== undefined && A !== P && !a.has(A)) {
        await S.close().catch(() => {});
        throw resolutionChangedError(e, "openedElsewhere");
      }
      if (A !== undefined)
        return {
          ioPath: procFdPath(S.fd),
          canonicalPath: P,
          handle: S,
          close: () => S.close(),
        };
    }
    return {
      ioPath: P,
      canonicalPath: P,
      handle: S,
      close: () => S.close(),
    };
  };
  if (isUncOrDevicePath_2(e, platform)) return v(e, false);
  let _ =
    isProcFdPath(e) &&
    !isAbsolute(y.resolvedPath) &&
    /^(?:pipe|socket|anon_inode):\[/.test(y.resolvedPath) &&
    basename(b.landing) === y.resolvedPath;
  if (!y.isCanonical && !_) {
    if (y.isSymlink || y.resolvedPath !== e) {
      if (a.has(y.resolvedPath) && isUncOrDevicePath_2(y.resolvedPath, platform)) {
        let S = platform === "macos" ? await v(y.resolvedPath, false) : await v(e, true);
        let A = safeResolvePath(getFsImplementation(), e);
        if (A.isCanonical || A.resolvedPath !== y.resolvedPath) {
          await S.close().catch(() => {});
          throw resolutionChangedError(e, "junction");
        }
        return S;
      }
      throw resolutionChangedError(e, "junction");
    }
    let P = await openWithAbort(e, platform === "macos" ? u | constants.O_NONBLOCK : u, platform, false, r);
    let j =
      platform === "macos" && o != null
        ? await P.stat({
            bigint: true,
          }).catch(() => {
            return;
          })
        : undefined;
    await P.close().catch(() => {});
    if (j && w(j)) {
      let S = await reopenThroughChain(e, n, p, r, o);
      if (S) return S;
    }
    throw resolutionChangedError(e, "unrenderable");
  }
  if (!_ && !a.has(y.resolvedPath)) return h("rendering");
  let R = _ ? e : y.resolvedPath;
  let L;
  try {
    L = await openWithAbort(R, _ ? p & ~constants.O_NOFOLLOW : p, platform, !_, r);
  } catch (error) {
    if (getErrnoCode(error) === "ELOOP") throw resolutionChangedError(e, "linkOnApproved");
    throw error;
  }
  try {
    let P = R;
    if (platform === "linux" || platform === "wsl") {
      let openedPath = await readOpenedPath(L, e, s);
      if (openedPath !== undefined) {
        if (openedPath !== (_ ? y.resolvedPath : R)) throw resolutionChangedError(e, "openedElsewhere");
        P = procFdPath(L.fd);
      }
    }
    if (P === R) {
      let S = walkPermissionCheckPaths(e);
      if (S.unresolved) throw resolutionChangedError(e, "afterOpen");
      for (let spelling of S.spellings)
        if (!a.has(spelling)) {
          if (
            platform === "macos" &&
            (await E(safeResolvePath(getFsImplementation(), e))) &&
            (await L.stat({
              bigint: true,
            }).then(w, () => false))
          )
            break;
          throw resolutionChangedError(e, "afterOpen");
        }
    }
    let j = L;
    return {
      canonicalPath: R,
      ioPath: P,
      handle: j,
      close: () => j.close(),
    };
  } catch (error) {
    await L.close().catch(() => {});
    throw error;
  }
}
//@ chunk-t0gq9gyw.js:15665-15779 placement
/**
 * 持有的目录已消失的错误（带目录与是否已报告）。
 */
class HeldDirVanishedError extends Error {
  dir;
  reported;
  constructor(dir, reported) {
    super("held directory vanished");
    this.dir = dir;
    this.reported = reported;
  }
}
//@ chunk-t0gq9gyw.js:15779-15788 placement
var MAX_PIN_ATTEMPTS = 3;
//@ chunk-t0gq9gyw.js:15788-15922 placement
/**
 * 权限检查后父目录符号链接解析发生变化的拒绝写入错误。
 */
function parentResolutionChangedError(e) {
  return new SymlinkWriteRefusedError(
    `Refusing to write ${e}: its parent-directory symlink resolution changed after permission was checked.`,
  );
}
//@ chunk-t0gq9gyw.js:15922-16465 placement
/**
 * 拒绝写入符号链接。
 */
async function refuseSymlinkWrite(e, n, platform, o, s = false) {
  let a = () =>
    new SymlinkWriteRefusedError(
      `Refusing to write ${n}: it is a symbolic link. Write to the link's target path instead.`,
    );
  if (platform === "windows")
    try {
      if ((await lstat(e)).isSymbolicLink()) throw a();
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw error;
    }
  let c =
    platform === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (constants.O_NOCTTY ?? 0);
  let u;
  try {
    u = s ? await open(e, c | READ_LIMITS) : await openNoFollow(e, c, platform);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return null;
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK" || errnoCode === "EFTYPE") throw a();
    throw error;
  }
  try {
    return await readFileHandleChecked(u, n, o);
  } finally {
    await u.close();
  }
}
//@ chunk-t0gq9gyw.js:16465-16733 placement
/**
 * 固定写入目标（目录被删时重试）。
 */
async function pinWriteTarget(e, n, r) {
  for (let j = 1; ; j++)
    try {
      return await pinWriteTargetOnce(e, n, r);
    } catch (error) {
      if (!(error instanceof HeldDirVanishedError)) throw error;
      logForDebugging(
        `pinWriteTarget: ${error.dir} was removed while held (attempt ${j}); ${j < MAX_PIN_ATTEMPTS ? "taking the pin again" : "refusing"}`,
        {
          level: "warn",
        },
      );
      if (j >= MAX_PIN_ATTEMPTS) throw error.reported ?? parentResolutionChangedError(e);
    }
}
//@ chunk-t0gq9gyw.js:16733-20898 placement
/**
 * 固定写入目标一次（检查拼写与目录身份）。
 */
async function pinWriteTargetOnce(e, n, r) {
  let o = new Set(n);
  let s = basename(e);
  let platform = getPlatform();
  let c = () => {
    let S = walkPermissionCheckPaths(r?.leaf === "replace" ? dirname(e) : e);
    let A = r?.leaf === "replace" ? S.spellings.map((spelling) => join(spelling, s)) : S.spellings;
    return !S.unresolved && A.every((x) => o.has(x));
  };
  let u = () => {
    if (!c()) throw parentResolutionChangedError(e);
  };
  let p = c();
  if (!p && !(platform === "macos" && !isUncOrDevicePath_2(e, platform)))
    throw parentResolutionChangedError(e);
  let y = async (S, A, x) => {
    if (!(await isOnMacosVolume(S, x, platform))) {
      logForDebugging(
        `pinWriteTarget: ${S} resolves to ${A}: not the same directory by a link-free route; refused`,
        {
          level: "warn",
        },
      );
      return false;
    }
    logForDebugging(
      `pinWriteTarget: ${S} is rendered ${A} by realpath; same directory (device and inode), treated as an alias`,
    );
    return true;
  };
  let w = (resolvedPath) => o.has(join(resolvedPath, s));
  let E = (S) => {
    let A = safeResolvePath(getFsImplementation(), S);
    if (!A.isCanonical) throw parentResolutionChangedError(e);
    return A.resolvedPath;
  };
  let h = (S) => {
    let A = safeResolvePath(getFsImplementation(), S);
    return A.isCanonical ? A.resolvedPath : S;
  };
  if (isUncOrDevicePath_2(e, platform) && platform !== "linux" && platform !== "wsl") {
    let S = async (x) => {
      if (platform !== "macos") return;
      for (let T = x; ; T = dirname(T))
        try {
          await (await openNoFollow(T, constants.O_RDONLY | constants.O_DIRECTORY, platform)).close();
          return;
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          if (errnoCode === "ELOOP") throw parentResolutionChangedError(e);
          if (errnoCode !== "ENOENT" || dirname(T) === T) throw error;
        }
    };
    await S(dirname(e));
    if (r?.createParents) {
      await getFsImplementation().mkdir(dirname(e));
      await S(dirname(e));
    }
    let A = async () => {
      u();
      if (platform !== "macos") return;
      try {
        await (await openNoFollow(dirname(e), constants.O_RDONLY | constants.O_DIRECTORY, platform)).close();
      } catch (error) {
        throw getErrnoCode(error) === "ELOOP" ? parentResolutionChangedError(e) : error;
      }
    };
    return {
      ioPath: e,
      canonicalPath: e,
      readExisting: async (x) => {
        await A();
        let T = await refuseSymlinkWrite(e, e, platform, x, false);
        await A();
        return T;
      },
      recheckBeforeWrite: A,
      close: async () => {},
    };
  }
  let b = async () => {
    if (r?.createParents) {
      await getFsImplementation().mkdir(dirname(e));
      u();
    }
    let S = safeResolvePath(getFsImplementation(), dirname(e));
    if (
      !S.isCanonical &&
      !(S.isSymlink && w(S.resolvedPath) && isUncOrDevicePath_2(join(S.resolvedPath, s), platform))
    ) {
      if (!S.isSymlink) await lstat(dirname(e));
      throw parentResolutionChangedError(e);
    }
    let A = !S.isCanonical;
    let resolvedPath = S.resolvedPath;
    if (!w(resolvedPath)) throw parentResolutionChangedError(e);
    return {
      ioPath: e,
      canonicalPath: join(resolvedPath, s),
      readExisting: async (T) => {
        u();
        let G = await refuseSymlinkWrite(e, e, platform, T, A);
        u();
        if (A && safeResolvePath(getFsImplementation(), dirname(e)).resolvedPath !== resolvedPath)
          throw parentResolutionChangedError(e);
        return G;
      },
      recheckBeforeWrite: u,
      close: async () => {},
    };
  };
  if (platform === "windows") return b();
  let _ =
    platform === "linux" || platform === "wsl"
      ? O_NOFOLLOW_ANY | constants.O_DIRECTORY
      : constants.O_RDONLY | constants.O_DIRECTORY;
  let R = dirname(e);
  let L = [];
  let P;
  let j = "";
  for (;;)
    try {
      j = platform === "macos" ? h(R) : R;
      P = await openNoFollow(j, _, platform);
      break;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      let x = dirname(R);
      let T =
        errnoCode === "ELOOP" &&
        platform === "macos" &&
        j === R &&
        !safeResolvePath(getFsImplementation(), R).isCanonical;
      if (errnoCode === "ELOOP" && !T) {
        let G = safeResolvePath(getFsImplementation(), dirname(e));
        if (
          p &&
          !G.isCanonical &&
          G.isSymlink &&
          w(G.resolvedPath) &&
          isUncOrDevicePath_2(join(G.resolvedPath, s), platform)
        )
          return b();
        throw parentResolutionChangedError(e);
      }
      if (T && !r?.createParents) {
        let G = [basename(R)];
        for (let ee = x; ; ee = dirname(ee)) {
          let D = safeResolvePath(getFsImplementation(), ee);
          if (D.isCanonical) {
            await lstat(join(D.resolvedPath, G[0]));
            break;
          }
          if (dirname(ee) === ee) break;
          G.unshift(basename(ee));
        }
        throw parentResolutionChangedError(e);
      }
      if ((errnoCode === "ENOENT" || T) && r?.createParents && x !== R) {
        L.unshift(basename(R));
        R = x;
        continue;
      }
      throw error;
    }
  try {
    let S = false;
    let A = async (D, dir) => {
      let Q =
        platform === "linux" || platform === "wsl"
          ? await readFdTargetPath(D.fd).catch(() => {
              return;
            })
          : undefined;
      if (Q === undefined) return E(dir);
      S = true;
      if (Q.endsWith(" (deleted)")) throw new HeldDirVanishedError(dir);
      return Q;
    };
    let dir = await A(P, R);
    if (!S && dir !== R && !w(join(dir, ...L)) && w(join(R, ...L)) && (await y(R, dir, P))) dir = R;
    let T = join(dir, ...L);
    if (!w(T)) {
      if (
        L.length === 0 &&
        (await lstat(join(S ? `/proc/self/fd/${P.fd}` : dir, s)).then(
          (J) => J.isSymbolicLink(),
          () => false,
        ))
      )
        throw new SymlinkWriteRefusedError(
          `Refusing to write ${e}: it is a symbolic link. Write to the link's target path instead.`,
        );
      throw parentResolutionChangedError(e);
    }
    for (let D of L) {
      let J = S ? `/proc/self/fd/${P.fd}` : dir;
      let Q = null;
      try {
        await mkdir(join(J, D));
      } catch (error) {
        Q = error;
        if (getErrnoCode(error) === "ENOENT") throw new HeldDirVanishedError(dir);
        if (getErrnoCode(error) !== "EEXIST")
          rethrowWithPath(
            error,
            {
              ioPath: join(J, D),
              canonicalPath: join(dir, D),
            },
            join(dir, D),
          );
      }
      let re;
      try {
        re = await openNoFollow(join(J, D), _ | constants.O_NOFOLLOW, platform);
      } catch (error) {
        if (getErrnoCode(error) === "ELOOP" || getErrnoCode(error) === "ENOTDIR")
          throw parentResolutionChangedError(e);
        if (getErrnoCode(error) === "ENOENT") {
          let reported;
          if (Q !== null)
            try {
              rethrowWithPath(
                Q,
                {
                  ioPath: join(J, D),
                  canonicalPath: join(dir, D),
                },
                join(dir, D),
              );
            } catch (error) {
              reported = error;
            }
          throw new HeldDirVanishedError(join(dir, D), reported);
        }
        rethrowWithPath(
          Q !== null ? Q : error,
          {
            ioPath: join(J, D),
            canonicalPath: join(dir, D),
          },
          join(dir, D),
        );
      }
      await P.close();
      P = re;
      let ue = join(dir, D);
      dir = await A(P, ue);
      if (dir !== ue) {
        if (S || !(await y(ue, dir, P))) throw parentResolutionChangedError(e);
        dir = ue;
      }
    }
    if (!S) {
      let D = P;
      let J = async () => {
        if (c()) return;
        if (!(await isOnMacosVolume(T, D, platform))) throw parentResolutionChangedError(e);
        if (
          r?.leaf !== "replace" &&
          (await lstat(join(T, s)).then(
            (re) => re.isSymbolicLink(),
            (error) => getErrnoCode(error) !== "ENOENT",
          ))
        )
          throw parentResolutionChangedError(e);
      };
      await J();
      let Q = join(T, s);
      return {
        ioPath: Q,
        canonicalPath: Q,
        readExisting: async (re) => {
          await J();
          let ue = await refuseSymlinkWrite(Q, e, platform, re);
          await J();
          return ue;
        },
        recheckBeforeWrite: J,
        close: () => D.close(),
      };
    }
    let G = P;
    let ee = `/proc/self/fd/${G.fd}/${s}`;
    return {
      ioPath: ee,
      canonicalPath: join(T, s),
      readExisting: (D) => refuseSymlinkWrite(ee, e, platform, D),
      recheckBeforeWrite: () => {},
      close: () => G.close(),
    };
  } catch (error) {
    await P.close().catch(() => {});
    throw error;
  }
}
//@ chunk-t0gq9gyw.js:20898-21062 placement
/**
 * 把错误信息中的内部路径替换为显示路径后重抛。
 */
function rethrowWithPath(error, n, r) {
  if (error instanceof Error) {
    let message = error.message;
    for (let s of [n.ioPath, n.canonicalPath]) if (s !== r) message = message.split(s).join(r);
    if (message !== error.message) error.message = message;
  }
  throw error;
}
export {
  pinWriteTarget,
  openNoFollow,
  procFdPath,
  refuseSymlinkWrite,
  openWithAbort,
  lastExistingIdentity,
  openReadBoundToApproval,
  rethrowWithPath,
  statChain,
  readFdTargetPath,
};
