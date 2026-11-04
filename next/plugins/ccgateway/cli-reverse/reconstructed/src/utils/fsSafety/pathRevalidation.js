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
async function openWithAbort(filePath, flags, platform, noFollow, signal) {
  signal?.throwIfAborted();
  let openPromise = noFollow ? openNoFollow(filePath, flags, platform) : open(filePath, flags | READ_LIMITS);
  if (!signal) return openPromise;
  let onAbort;
  let promise = new Promise((resolve, reject) => {
    onAbort = () => reject(signal.reason ?? Error("aborted"));
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
  });
  try {
    return await Promise.race([openPromise, promise]);
  } catch (error) {
    openPromise.then(
      (handle) => handle.close(),
      () => {},
    );
    throw error;
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}
//@ chunk-t0gq9gyw.js:9458-9534 placement
var DESCRIPTOR_PATH_RE = /^(?:\/dev\/(?:stdin|stdout|stderr|fd\/\d+)|\/proc\/self\/fd\/\d+)$/;
//@ chunk-t0gq9gyw.js:9534-9643 placement
/**
 * 路径是否为本进程的 /proc/<pid>/fd/<n> 或同类描述符路径。
 */
function isProcFdPath(filePath) {
  return (
    DESCRIPTOR_PATH_RE.test(filePath) ||
    (/^\/proc\/\d+\/fd\/\d+$/.test(filePath) && filePath.startsWith(`/proc/${process.pid}/fd/`))
  );
}
//@ chunk-t0gq9gyw.js:9643-9686 placement
/**
 * 拼出 /proc/self/fd/<n> 路径。
 */
function procFdPath(fd) {
  return `/proc/self/fd/${fd}`;
}
//@ chunk-t0gq9gyw.js:9686-9701 placement
var O_NOFOLLOW_ANY = 2097152;
//@ chunk-t0gq9gyw.js:9701-9808 placement = getReservedShortcuts (0.773)
/**
 * macOS 上不跟随链接打开。
 */
async function openNoFollow(filePath, flags, platform) {
  if (platform !== "macos" || (await probeNoFollowAny())) return open(filePath, flags | READ_LIMITS);
  return open(filePath, (flags & ~constants.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | READ_LIMITS);
}
//@ chunk-t0gq9gyw.js:9808-10177 placement
/**
 * 路径是否在 macOS 特殊卷上。
 */
async function isOnMacosVolume(dirPath, volumeHandle, platform) {
  if (platform !== "macos") return false;
  for (let currentPath = dirPath; ; currentPath = dirname(currentPath)) {
    try {
      if (!(await lstat(currentPath)).isDirectory()) return false;
    } catch {
      return false;
    }
    if (dirname(currentPath) === currentPath) break;
  }
  let dirHandle;
  try {
    dirHandle = await open(
      dirPath,
      constants.O_RDONLY | constants.O_DIRECTORY | MAX_BOUND_READ_BYTES | READ_LIMITS,
    );
  } catch {
    return false;
  }
  try {
    let [dirStats, volumeStats] = await Promise.all([
      dirHandle.stat({
        bigint: true,
      }),
      volumeHandle.stat({
        bigint: true,
      }),
    ]);
    return dirStats.ino === volumeStats.ino && dirStats.dev === volumeStats.dev;
  } catch {
    return false;
  } finally {
    await dirHandle.close();
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
async function readFdTargetPath(fd) {
  try {
    return await readlink(procFdPath(fd));
  } catch (error) {
    if (isPathAbsent(error)) return;
    throw error;
  }
}
//@ chunk-t0gq9gyw.js:10736-11033 placement
/**
 * 读取描述符实际打开的路径；失败时按拼写模式放行或拒绝读取。
 */
async function readOpenedPath(handle, filePath, mode) {
  try {
    return await readFdTargetPath(handle.fd);
  } catch (error) {
    if (mode === "by-spelling") return;
    throw new SymlinkReadRefusedError(
      `Refusing to read ${filePath}: the system would not say where it was opened (reading /proc/self/fd failed with ${getErrnoCode(error) ?? "an error"}), so it cannot be told apart from a path this session may not read.`,
    );
  }
}
//@ chunk-t0gq9gyw.js:11033-11251 placement
/**
 * 权限检查后符号链接解析发生变化的拒绝读取错误。
 */
function resolutionChangedError(filePath, reason) {
  return new SymlinkReadRefusedError(
    `Refusing to read ${filePath}: its symlink resolution changed after permission was checked (${REVALIDATION_MESSAGES[reason]}). If a link in the working directory is being rewritten concurrently, stop that and retry.`,
  );
}
//@ chunk-t0gq9gyw.js:11251-11261 placement
var SKIP_STAT_CHAIN = false;
//@ chunk-t0gq9gyw.js:11261-11983 placement
/**
 * 对路径链逐段 lstat。
 */
async function statChain(filePath) {
  let chainPaths = [];
  for (let currentPath = filePath; ; currentPath = dirname(currentPath)) {
    chainPaths.unshift(currentPath);
    if (dirname(currentPath) === currentPath) break;
  }
  let fsImplementation = getFsImplementation();
  let launchAncestry;
  let chainStats = [];
  let chainKinds = [];
  for (let chainPath of chainPaths) {
    try {
      let stats = await lstat(chainPath, {
        bigint: true,
      });
      if (!(chainPath === filePath ? stats.isFile() : stats.isDirectory())) return;
      chainStats.push(stats);
      chainKinds.push("lstat");
      continue;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (chainPath === filePath || (errnoCode !== "EPERM" && errnoCode !== "EACCES")) return;
    }
    {
      let dirStats = await statDirNoFollow(chainPath);
      if (dirStats === undefined) return;
      chainStats.push(dirStats);
      chainKinds.push("open");
      continue;
    }
    launchAncestry ??= vouchedLaunchAncestry(fsImplementation);
    if (
      launchAncestry !== null &&
      chainKinds.slice(1).every((kind) => kind === "passed") &&
      isSpelledStrictAncestor(chainPath, launchAncestry)
    ) {
      chainStats.push(undefined);
      chainKinds.push("passed");
      continue;
    }
    return;
  }
  for (let j = 0; j < chainPaths.length - 1; j++) {
    let recordedStats = chainStats[j];
    if (recordedStats === undefined) continue;
    let recheckStats;
    try {
      recheckStats =
        chainKinds[j] === "open"
          ? await statDirNoFollow(chainPaths[j])
          : await lstat(chainPaths[j], {
              bigint: true,
            });
    } catch {
      return;
    }
    if (
      recheckStats === undefined ||
      !recheckStats.isDirectory() ||
      recheckStats.dev !== recordedStats.dev ||
      recheckStats.ino !== recordedStats.ino
    )
      return;
  }
  return chainStats.at(-1);
}
//@ chunk-t0gq9gyw.js:11983-12202 placement
/**
 * 以 O_DIRECTORY|O_NOFOLLOW 打开并 stat 目录（失败返回 undefined）。
 */
async function statDirNoFollow(dirPath) {
  let dirHandle;
  try {
    dirHandle = await open(
      dirPath,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS,
    );
  } catch {
    return;
  }
  try {
    let stats = await dirHandle.stat({
      bigint: true,
    });
    return stats.isDirectory() ? stats : undefined;
  } catch {
    return;
  } finally {
    await dirHandle.close().catch(() => {});
  }
}
//@ chunk-t0gq9gyw.js:12202-12246 placement
function isCheckableAbsolutePath(filePath) {
  return isAbsolute(filePath) && !isUntouchableSpelling(filePath) && !isProcFdPath(filePath);
}
//@ chunk-t0gq9gyw.js:12246-12393 placement = getFileIdentity (0.794)
/**
 * 最后一个存在路径的身份（dev/ino）。
 */
async function lastExistingIdentity(filePath) {
  for (let j = filePath.length - 1; j >= 0; j--) {
    let candidatePath = filePath[j];
    if (!isCheckableAbsolutePath(candidatePath)) continue;
    let stats = await statChain(candidatePath);
    if (stats)
      return {
        dev: stats.dev,
        ino: stats.ino,
      };
  }
  return null;
}
//@ chunk-t0gq9gyw.js:12393-13013 placement
/**
 * 沿路径链重新打开并核对。
 */
async function reopenThroughChain(filePath, approvedSpellings, flags, signal, identity) {
  if (identity == null) return;
  for (let j = approvedSpellings.length - 1; j >= 0; j--) {
    let candidatePath = approvedSpellings[j];
    if (!isCheckableAbsolutePath(candidatePath) || (!SKIP_STAT_CHAIN && !(await statChain(candidatePath))))
      continue;
    let handle;
    try {
      handle = await openWithAbort(
        candidatePath,
        (flags & ~constants.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | constants.O_NONBLOCK,
        "macos",
        false,
        signal,
      );
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      continue;
    }
    let stats = await handle
      .stat({
        bigint: true,
      })
      .catch(() => {
        return;
      });
    if (stats?.isFile() && stats.dev === identity.dev && stats.ino === identity.ino) {
      logForDebugging(
        `openReadBoundToApproval: the fresh resolution of ${filePath} is not verbatim what the check approved (or realpath could not render it); reading approved ${candidatePath}, opened link-free`,
      );
      return {
        canonicalPath: candidatePath,
        ioPath: candidatePath,
        handle,
        close: () => handle.close(),
      };
    }
    await handle.close().catch(() => {});
  }
  return;
}
//@ chunk-t0gq9gyw.js:13013-15665 placement
/**
 * 打开文件读取，并确认打开的就是权限检查批准的路径。
 */
async function openReadBoundToApproval(
  filePath,
  approvedSpellings,
  signal,
  identity,
  procMode = "by-spelling",
) {
  let approvedSet = new Set(approvedSpellings);
  let platform = getPlatform();
  let baseFlags = platform === "windows" ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOCTTY;
  let noFollowFlags = platform === "windows" ? baseFlags : baseFlags | constants.O_NOFOLLOW;
  let resolved = safeResolvePath(getFsImplementation(), filePath);
  let matchesIdentity = (stats) =>
    identity != null && stats.isFile() && stats.dev === identity.dev && stats.ino === identity.ino;
  let approvedPathIntact = async (candidate = resolved) => {
    let resolvedPath = candidate.resolvedPath;
    if (
      identity == null ||
      !candidate.isCanonical ||
      !isCheckableAbsolutePath(resolvedPath) ||
      resolvedPath.startsWith("/dev/")
    )
      return false;
    if (!SKIP_STAT_CHAIN) {
      let chainStats = await statChain(resolvedPath);
      return chainStats !== undefined && matchesIdentity(chainStats);
    }
    let handle;
    try {
      handle = await openWithAbort(
        resolvedPath,
        (noFollowFlags & ~constants.O_NOFOLLOW) | MAX_BOUND_READ_BYTES | constants.O_NONBLOCK,
        "macos",
        false,
        signal,
      );
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      return false;
    }
    try {
      return await handle
        .stat({
          bigint: true,
        })
        .then(matchesIdentity, () => false);
    } finally {
      await handle.close().catch(() => {});
    }
  };
  let throwChanged = async (reason) => {
    if (platform === "macos" && (await approvedPathIntact())) {
      let reopened = await reopenThroughChain(filePath, approvedSpellings, noFollowFlags, signal, identity);
      if (reopened) return reopened;
    }
    throw resolutionChangedError(filePath, reason);
  };
  let walkResult = walkPermissionCheckPaths(filePath);
  if (walkResult.unresolved) throw resolutionChangedError(filePath, "unrenderable");
  for (let spelling of walkResult.spellings)
    if (!approvedSet.has(spelling))
      return throwChanged(resolved.isCanonical && spelling === resolved.resolvedPath ? "rendering" : "chain");
  let openDevicePath = async (pathToOpen, passedChecks) => {
    if ((await lstat(pathToOpen)).isSymbolicLink()) throw resolutionChangedError(filePath, "networkLink");
    let handle = await openWithAbort(pathToOpen, noFollowFlags, platform, !passedChecks, signal);
    if (platform === "linux" || platform === "wsl") {
      let openedPath = await readOpenedPath(handle, filePath, procMode).catch(async (error) => {
        await handle.close().catch(() => {});
        throw error;
      });
      if (openedPath !== undefined && openedPath !== pathToOpen && !approvedSet.has(openedPath)) {
        await handle.close().catch(() => {});
        throw resolutionChangedError(filePath, "openedElsewhere");
      }
      if (openedPath !== undefined)
        return {
          ioPath: procFdPath(handle.fd),
          canonicalPath: pathToOpen,
          handle,
          close: () => handle.close(),
        };
    }
    return {
      ioPath: pathToOpen,
      canonicalPath: pathToOpen,
      handle,
      close: () => handle.close(),
    };
  };
  if (isUncOrDevicePath_2(filePath, platform)) return openDevicePath(filePath, false);
  let allowAnonProcFd =
    isProcFdPath(filePath) &&
    !isAbsolute(resolved.resolvedPath) &&
    /^(?:pipe|socket|anon_inode):\[/.test(resolved.resolvedPath) &&
    basename(walkResult.landing) === resolved.resolvedPath;
  if (!resolved.isCanonical && !allowAnonProcFd) {
    if (resolved.isSymlink || resolved.resolvedPath !== filePath) {
      if (approvedSet.has(resolved.resolvedPath) && isUncOrDevicePath_2(resolved.resolvedPath, platform)) {
        let deviceHandle =
          platform === "macos"
            ? await openDevicePath(resolved.resolvedPath, false)
            : await openDevicePath(filePath, true);
        let reResolved = safeResolvePath(getFsImplementation(), filePath);
        if (reResolved.isCanonical || reResolved.resolvedPath !== resolved.resolvedPath) {
          await deviceHandle.close().catch(() => {});
          throw resolutionChangedError(filePath, "junction");
        }
        return deviceHandle;
      }
      throw resolutionChangedError(filePath, "junction");
    }
    let probeHandle = await openWithAbort(
      filePath,
      platform === "macos" ? baseFlags | constants.O_NONBLOCK : baseFlags,
      platform,
      false,
      signal,
    );
    let probeStats =
      platform === "macos" && identity != null
        ? await probeHandle
            .stat({
              bigint: true,
            })
            .catch(() => {
              return;
            })
        : undefined;
    await probeHandle.close().catch(() => {});
    if (probeStats && matchesIdentity(probeStats)) {
      let reopened = await reopenThroughChain(filePath, approvedSpellings, noFollowFlags, signal, identity);
      if (reopened) return reopened;
    }
    throw resolutionChangedError(filePath, "unrenderable");
  }
  if (!allowAnonProcFd && !approvedSet.has(resolved.resolvedPath)) return throwChanged("rendering");
  let pathToOpen = allowAnonProcFd ? filePath : resolved.resolvedPath;
  let handle;
  try {
    handle = await openWithAbort(
      pathToOpen,
      allowAnonProcFd ? noFollowFlags & ~constants.O_NOFOLLOW : noFollowFlags,
      platform,
      !allowAnonProcFd,
      signal,
    );
  } catch (error) {
    if (getErrnoCode(error) === "ELOOP") throw resolutionChangedError(filePath, "linkOnApproved");
    throw error;
  }
  try {
    let ioPath = pathToOpen;
    if (platform === "linux" || platform === "wsl") {
      let openedPath = await readOpenedPath(handle, filePath, procMode);
      if (openedPath !== undefined) {
        if (openedPath !== (allowAnonProcFd ? resolved.resolvedPath : pathToOpen))
          throw resolutionChangedError(filePath, "openedElsewhere");
        ioPath = procFdPath(handle.fd);
      }
    }
    if (ioPath === pathToOpen) {
      let recheckWalk = walkPermissionCheckPaths(filePath);
      if (recheckWalk.unresolved) throw resolutionChangedError(filePath, "afterOpen");
      for (let spelling of recheckWalk.spellings)
        if (!approvedSet.has(spelling)) {
          if (
            platform === "macos" &&
            (await approvedPathIntact(safeResolvePath(getFsImplementation(), filePath))) &&
            (await handle
              .stat({
                bigint: true,
              })
              .then(matchesIdentity, () => false))
          )
            break;
          throw resolutionChangedError(filePath, "afterOpen");
        }
    }
    let finalHandle = handle;
    return {
      canonicalPath: pathToOpen,
      ioPath,
      handle: finalHandle,
      close: () => finalHandle.close(),
    };
  } catch (error) {
    await handle.close().catch(() => {});
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
function parentResolutionChangedError(filePath) {
  return new SymlinkWriteRefusedError(
    `Refusing to write ${filePath}: its parent-directory symlink resolution changed after permission was checked.`,
  );
}
//@ chunk-t0gq9gyw.js:15922-16465 placement
/**
 * 拒绝写入符号链接。
 */
async function refuseSymlinkWrite(filePath, linkedPath, platform, maxBytes, followLink = false) {
  let symlinkRefusal = () =>
    new SymlinkWriteRefusedError(
      `Refusing to write ${linkedPath}: it is a symbolic link. Write to the link's target path instead.`,
    );
  if (platform === "windows")
    try {
      if ((await lstat(filePath)).isSymbolicLink()) throw symlinkRefusal();
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw error;
    }
  let openFlags =
    platform === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (constants.O_NOCTTY ?? 0);
  let handle;
  try {
    handle = followLink
      ? await open(filePath, openFlags | READ_LIMITS)
      : await openNoFollow(filePath, openFlags, platform);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return null;
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK" || errnoCode === "EFTYPE") throw symlinkRefusal();
    throw error;
  }
  try {
    return await readFileHandleChecked(handle, linkedPath, maxBytes);
  } finally {
    await handle.close();
  }
}
//@ chunk-t0gq9gyw.js:16465-16733 placement
/**
 * 固定写入目标（目录被删时重试）。
 */
async function pinWriteTarget(filePath, approvedSpellings, options) {
  for (let j = 1; ; j++)
    try {
      return await pinWriteTargetOnce(filePath, approvedSpellings, options);
    } catch (error) {
      if (!(error instanceof HeldDirVanishedError)) throw error;
      logForDebugging(
        `pinWriteTarget: ${error.dir} was removed while held (attempt ${j}); ${j < MAX_PIN_ATTEMPTS ? "taking the pin again" : "refusing"}`,
        {
          level: "warn",
        },
      );
      if (j >= MAX_PIN_ATTEMPTS) throw error.reported ?? parentResolutionChangedError(filePath);
    }
}
//@ chunk-t0gq9gyw.js:16733-20898 placement
/**
 * 固定写入目标一次（检查拼写与目录身份）。
 */
async function pinWriteTargetOnce(filePath, approvedSpellings, options) {
  let approvedSet = new Set(approvedSpellings);
  let leafName = basename(filePath);
  let platform = getPlatform();
  let stillApproved = () => {
    let walkResult = walkPermissionCheckPaths(options?.leaf === "replace" ? dirname(filePath) : filePath);
    let leafSpellings =
      options?.leaf === "replace"
        ? walkResult.spellings.map((spelling) => join(spelling, leafName))
        : walkResult.spellings;
    return !walkResult.unresolved && leafSpellings.every((spelling) => approvedSet.has(spelling));
  };
  let assertStillApproved = () => {
    if (!stillApproved()) throw parentResolutionChangedError(filePath);
  };
  let initiallyApproved = stillApproved();
  if (!initiallyApproved && !(platform === "macos" && !isUncOrDevicePath_2(filePath, platform)))
    throw parentResolutionChangedError(filePath);
  let treatAsAlias = async (spelledPath, resolvedPath, dirHandle) => {
    if (!(await isOnMacosVolume(spelledPath, dirHandle, platform))) {
      logForDebugging(
        `pinWriteTarget: ${spelledPath} resolves to ${resolvedPath}: not the same directory by a link-free route; refused`,
        {
          level: "warn",
        },
      );
      return false;
    }
    logForDebugging(
      `pinWriteTarget: ${spelledPath} is rendered ${resolvedPath} by realpath; same directory (device and inode), treated as an alias`,
    );
    return true;
  };
  let isLeafApproved = (resolvedPath) => approvedSet.has(join(resolvedPath, leafName));
  let resolveCanonical = (path) => {
    let resolved = safeResolvePath(getFsImplementation(), path);
    if (!resolved.isCanonical) throw parentResolutionChangedError(filePath);
    return resolved.resolvedPath;
  };
  let resolveOrKeep = (path) => {
    let resolved = safeResolvePath(getFsImplementation(), path);
    return resolved.isCanonical ? resolved.resolvedPath : path;
  };
  if (isUncOrDevicePath_2(filePath, platform) && platform !== "linux" && platform !== "wsl") {
    let checkLinkFreeAncestors = async (startPath) => {
      if (platform !== "macos") return;
      for (let currentPath = startPath; ; currentPath = dirname(currentPath))
        try {
          await (
            await openNoFollow(currentPath, constants.O_RDONLY | constants.O_DIRECTORY, platform)
          ).close();
          return;
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          if (errnoCode === "ELOOP") throw parentResolutionChangedError(filePath);
          if (errnoCode !== "ENOENT" || dirname(currentPath) === currentPath) throw error;
        }
    };
    await checkLinkFreeAncestors(dirname(filePath));
    if (options?.createParents) {
      await getFsImplementation().mkdir(dirname(filePath));
      await checkLinkFreeAncestors(dirname(filePath));
    }
    let recheckParent = async () => {
      assertStillApproved();
      if (platform !== "macos") return;
      try {
        await (
          await openNoFollow(dirname(filePath), constants.O_RDONLY | constants.O_DIRECTORY, platform)
        ).close();
      } catch (error) {
        throw getErrnoCode(error) === "ELOOP" ? parentResolutionChangedError(filePath) : error;
      }
    };
    return {
      ioPath: filePath,
      canonicalPath: filePath,
      readExisting: async (maxBytes) => {
        await recheckParent();
        let handle = await refuseSymlinkWrite(filePath, filePath, platform, maxBytes, false);
        await recheckParent();
        return handle;
      },
      recheckBeforeWrite: recheckParent,
      close: async () => {},
    };
  }
  let pinByPath = async () => {
    if (options?.createParents) {
      await getFsImplementation().mkdir(dirname(filePath));
      assertStillApproved();
    }
    let parentResolved = safeResolvePath(getFsImplementation(), dirname(filePath));
    if (
      !parentResolved.isCanonical &&
      !(
        parentResolved.isSymlink &&
        isLeafApproved(parentResolved.resolvedPath) &&
        isUncOrDevicePath_2(join(parentResolved.resolvedPath, leafName), platform)
      )
    ) {
      if (!parentResolved.isSymlink) await lstat(dirname(filePath));
      throw parentResolutionChangedError(filePath);
    }
    let parentWasSymlink = !parentResolved.isCanonical;
    let resolvedPath = parentResolved.resolvedPath;
    if (!isLeafApproved(resolvedPath)) throw parentResolutionChangedError(filePath);
    return {
      ioPath: filePath,
      canonicalPath: join(resolvedPath, leafName),
      readExisting: async (maxBytes) => {
        assertStillApproved();
        let handle = await refuseSymlinkWrite(filePath, filePath, platform, maxBytes, parentWasSymlink);
        assertStillApproved();
        if (
          parentWasSymlink &&
          safeResolvePath(getFsImplementation(), dirname(filePath)).resolvedPath !== resolvedPath
        )
          throw parentResolutionChangedError(filePath);
        return handle;
      },
      recheckBeforeWrite: assertStillApproved,
      close: async () => {},
    };
  };
  if (platform === "windows") return pinByPath();
  let dirOpenFlags =
    platform === "linux" || platform === "wsl"
      ? O_NOFOLLOW_ANY | constants.O_DIRECTORY
      : constants.O_RDONLY | constants.O_DIRECTORY;
  let currentParent = dirname(filePath);
  let missingParents = [];
  let parentHandle;
  let parentOpenPath = "";
  for (;;)
    try {
      parentOpenPath = platform === "macos" ? resolveOrKeep(currentParent) : currentParent;
      parentHandle = await openNoFollow(parentOpenPath, dirOpenFlags, platform);
      break;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      let parentOfParent = dirname(currentParent);
      let isMacAliasLoop =
        errnoCode === "ELOOP" &&
        platform === "macos" &&
        parentOpenPath === currentParent &&
        !safeResolvePath(getFsImplementation(), currentParent).isCanonical;
      if (errnoCode === "ELOOP" && !isMacAliasLoop) {
        let leafParentResolved = safeResolvePath(getFsImplementation(), dirname(filePath));
        if (
          initiallyApproved &&
          !leafParentResolved.isCanonical &&
          leafParentResolved.isSymlink &&
          isLeafApproved(leafParentResolved.resolvedPath) &&
          isUncOrDevicePath_2(join(leafParentResolved.resolvedPath, leafName), platform)
        )
          return pinByPath();
        throw parentResolutionChangedError(filePath);
      }
      if (isMacAliasLoop && !options?.createParents) {
        let missingNames = [basename(currentParent)];
        for (let ancestorPath = parentOfParent; ; ancestorPath = dirname(ancestorPath)) {
          let ancestorResolved = safeResolvePath(getFsImplementation(), ancestorPath);
          if (ancestorResolved.isCanonical) {
            await lstat(join(ancestorResolved.resolvedPath, missingNames[0]));
            break;
          }
          if (dirname(ancestorPath) === ancestorPath) break;
          missingNames.unshift(basename(ancestorPath));
        }
        throw parentResolutionChangedError(filePath);
      }
      if (
        (errnoCode === "ENOENT" || isMacAliasLoop) &&
        options?.createParents &&
        parentOfParent !== currentParent
      ) {
        missingParents.unshift(basename(currentParent));
        currentParent = parentOfParent;
        continue;
      }
      throw error;
    }
  try {
    let viaProcFd = false;
    let resolveHeldDir = async (handle, spelledPath) => {
      let dirPath =
        platform === "linux" || platform === "wsl"
          ? await readFdTargetPath(handle.fd).catch(() => {
              return;
            })
          : undefined;
      if (dirPath === undefined) return resolveCanonical(spelledPath);
      viaProcFd = true;
      if (dirPath.endsWith(" (deleted)")) throw new HeldDirVanishedError(spelledPath);
      return dirPath;
    };
    let heldDir = await resolveHeldDir(parentHandle, currentParent);
    if (
      !viaProcFd &&
      heldDir !== currentParent &&
      !isLeafApproved(join(heldDir, ...missingParents)) &&
      isLeafApproved(join(currentParent, ...missingParents)) &&
      (await treatAsAlias(currentParent, heldDir, parentHandle))
    )
      heldDir = currentParent;
    let heldPath = join(heldDir, ...missingParents);
    if (!isLeafApproved(heldPath)) {
      if (
        missingParents.length === 0 &&
        (await lstat(join(viaProcFd ? `/proc/self/fd/${parentHandle.fd}` : heldDir, leafName)).then(
          (leafStats) => leafStats.isSymbolicLink(),
          () => false,
        ))
      )
        throw new SymlinkWriteRefusedError(
          `Refusing to write ${filePath}: it is a symbolic link. Write to the link's target path instead.`,
        );
      throw parentResolutionChangedError(filePath);
    }
    for (let missingName of missingParents) {
      let basePath = viaProcFd ? `/proc/self/fd/${parentHandle.fd}` : heldDir;
      let mkdirError = null;
      try {
        await mkdir(join(basePath, missingName));
      } catch (error) {
        mkdirError = error;
        if (getErrnoCode(error) === "ENOENT") throw new HeldDirVanishedError(heldDir);
        if (getErrnoCode(error) !== "EEXIST")
          rethrowWithPath(
            error,
            {
              ioPath: join(basePath, missingName),
              canonicalPath: join(heldDir, missingName),
            },
            join(heldDir, missingName),
          );
      }
      let childHandle;
      try {
        childHandle = await openNoFollow(
          join(basePath, missingName),
          dirOpenFlags | constants.O_NOFOLLOW,
          platform,
        );
      } catch (error) {
        if (getErrnoCode(error) === "ELOOP" || getErrnoCode(error) === "ENOTDIR")
          throw parentResolutionChangedError(filePath);
        if (getErrnoCode(error) === "ENOENT") {
          let reported;
          if (mkdirError !== null)
            try {
              rethrowWithPath(
                mkdirError,
                {
                  ioPath: join(basePath, missingName),
                  canonicalPath: join(heldDir, missingName),
                },
                join(heldDir, missingName),
              );
            } catch (error) {
              reported = error;
            }
          throw new HeldDirVanishedError(join(heldDir, missingName), reported);
        }
        rethrowWithPath(
          mkdirError !== null ? mkdirError : error,
          {
            ioPath: join(basePath, missingName),
            canonicalPath: join(heldDir, missingName),
          },
          join(heldDir, missingName),
        );
      }
      await parentHandle.close();
      parentHandle = childHandle;
      let childPath = join(heldDir, missingName);
      heldDir = await resolveHeldDir(parentHandle, childPath);
      if (heldDir !== childPath) {
        if (viaProcFd || !(await treatAsAlias(childPath, heldDir, parentHandle)))
          throw parentResolutionChangedError(filePath);
        heldDir = childPath;
      }
    }
    if (!viaProcFd) {
      let heldHandle = parentHandle;
      let recheckBeforeWrite = async () => {
        if (stillApproved()) return;
        if (!(await isOnMacosVolume(heldPath, heldHandle, platform)))
          throw parentResolutionChangedError(filePath);
        if (
          options?.leaf !== "replace" &&
          (await lstat(join(heldPath, leafName)).then(
            (stats) => stats.isSymbolicLink(),
            (error) => getErrnoCode(error) !== "ENOENT",
          ))
        )
          throw parentResolutionChangedError(filePath);
      };
      await recheckBeforeWrite();
      let leafPath = join(heldPath, leafName);
      return {
        ioPath: leafPath,
        canonicalPath: leafPath,
        readExisting: async (maxBytes) => {
          await recheckBeforeWrite();
          let handle = await refuseSymlinkWrite(leafPath, filePath, platform, maxBytes);
          await recheckBeforeWrite();
          return handle;
        },
        recheckBeforeWrite,
        close: () => heldHandle.close(),
      };
    }
    let procHandle = parentHandle;
    let procLeafPath = `/proc/self/fd/${procHandle.fd}/${leafName}`;
    return {
      ioPath: procLeafPath,
      canonicalPath: join(heldPath, leafName),
      readExisting: (maxBytes) => refuseSymlinkWrite(procLeafPath, filePath, platform, maxBytes),
      recheckBeforeWrite: () => {},
      close: () => procHandle.close(),
    };
  } catch (error) {
    await parentHandle.close().catch(() => {});
    throw error;
  }
}
//@ chunk-t0gq9gyw.js:20898-21062 placement
/**
 * 把错误信息中的内部路径替换为显示路径后重抛。
 */
function rethrowWithPath(error, error_2, canonicalPath) {
  if (error instanceof Error) {
    let message = error.message;
    for (let fromPath of [error_2.ioPath, error_2.canonicalPath])
      if (fromPath !== canonicalPath) message = message.split(fromPath).join(canonicalPath);
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
