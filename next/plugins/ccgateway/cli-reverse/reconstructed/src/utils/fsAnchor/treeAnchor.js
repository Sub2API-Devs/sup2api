/**
 * utils/fsAnchor/treeAnchor.ts
 *
 * 2.1.316 新增。锚定目录树操作（防 TOCTOU）：/proc fd、macOS NOFOLLOW_ANY、完整路径三种后端。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g3ejat5z.js (45)
 * attribution: placement 45
 */
import { constants, fstat, close, open, fsync, fchmod, fchown, writeFile } from "fs";
import { promisify, getSystemErrorName } from "util";
import { mkdtemp, symlink, rm, lstat } from "fs/promises";
import { tmpdir } from "os";
import { getErrnoCode, isENOENT, isSyscallError } from "../errors.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { logError } from "../log.js";
import { limitConcurrency } from "../concurrencyLimit.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { logForDebugging } from "../debug.js";
import { resolvedRoot, createDeviceTreeHost } from "./deviceTreeHost.js";

//@ chunk-g3ejat5z.js:731-852 placement
class OwnerNotGiven extends Error {
  code;
  constructor(cause) {
    super("the new file could not be given its owner", {
      cause,
    });
    this.code = getErrnoCode(cause);
  }
}
//@ chunk-g3ejat5z.js:852-1002 placement
var ANCHOR_UNAVAILABLE_REASONS = [
  "unsupported_platform",
  "no_procfs",
  "no_ffi",
  "nofollow_any_unenforced",
  "remote_volume",
  "unstable_identity",
  "bring_up_failed",
  "no_hard_links",
];
//@ chunk-g3ejat5z.js:1002-1041 placement
function isAnchorUnavailableReason(reason) {
  return ANCHOR_UNAVAILABLE_REASONS.includes(reason);
}
//@ chunk-g3ejat5z.js:1041-2016 placement
/**
 * 锚定错误码转错误
 */
function workingErrorFor(reasonCode) {
  switch (reasonCode) {
    case "WORKING_PARENT_NOT_DIRECTORY":
      return Error("a destination ancestor is a symlink or not a directory");
    case "WORKING_NAME_NOT_PLAIN":
      return Error("not a plain file name here");
    case "WORKING_FILE_HELD":
      return Error("another program holds the file");
    case "WORKING_LIST_UNSUPPORTED":
      return Error("this backend cannot list a held directory, or cannot stop at the bound that was set");
    case "WORKING_LIST_TOO_LONG":
      return Error("the directory holds more names than may be listed");
    case "WORKING_DIRECTORY_MOVED":
      return Error(
        "the operation succeeded, but a directory that it used may have been moved meanwhile: what it made or moved may lie outside the tree, or have come from outside it",
      );
    case "WORKING_DIRECTORY_MOVED_UNDONE":
      return Error(
        "a directory may have been moved, so the operation made nothing, or what it made was removed again",
      );
    case "WORKING_LINK_UNSUPPORTED":
      return Error("this backend cannot make or read a symbolic link in a held directory");
  }
}
//@ chunk-g3ejat5z.js:2016-2131 placement
function rootNotCanonicalError() {
  let error = Error("tree anchor root is not a canonical path");
  error.code = "WORKING_ROOT_NOT_CANONICAL";
  return error;
}
//@ chunk-g3ejat5z.js:2131-2175 placement
function workingError(reasonCode) {
  let error = workingErrorFor(reasonCode);
  error.code = reasonCode;
  return error;
}
//@ chunk-g3ejat5z.js:2175-2410 placement
/**
 * 锚定使用的打开标志与上限
 */
var ANCHOR_OPEN_FLAGS = Symbol("createsInHeldDirectoryCheckedByPath");
var O_NOFOLLOW_ANY = 536870912;
var O_SEARCH = 2097152;
var OPEN_DIR_FLAGS = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS;
var CREATE_FILE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS;
var DEFAULT_DIR_MODE = 511;
var MAX_RECORD_BYTES = 1e7;
var MAX_LIST_NAMES = 512;
var MAX_RENAME_ATTEMPTS = 3;
var REMOVE_TREE_CONCURRENCY = 16;
var RemoveTreeError = Error("removeTree stopped after a failure");
//@ chunk-g3ejat5z.js:2410-2606 placement
/**
 * 拆分锚定相对路径
 */
function splitAnchoredPath(relPath, sep) {
  let parts = relPath.split("/");
  if (
    relPath.includes("\x00") ||
    parts.some((part) => part === "" || part === "." || part === ".." || (sep !== "/" && part.includes(sep)))
  )
    throw Error("anchored path must be relative, of plain segments");
  return parts;
}
//@ chunk-g3ejat5z.js:2606-2682 placement
function splitLeafPath(relPath, sep) {
  let parts = splitAnchoredPath(relPath, sep);
  return {
    dirs: parts.slice(0, -1),
    leaf: parts.at(-1) ?? "",
  };
}
//@ chunk-g3ejat5z.js:2682-2770 placement
function assertNeverCreates(flags) {
  if ((flags & constants.O_CREAT) !== 0) throw Error("anchored open never creates");
  return flags;
}
//@ chunk-g3ejat5z.js:2770-2865 placement
function mapParentNotDirectory(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOTDIR" || errnoCode === "ELOOP"
    ? workingError("WORKING_PARENT_NOT_DIRECTORY")
    : error;
}
//@ chunk-g3ejat5z.js:2865-2887 placement
var SAME_IDENTITY = {
  found: "same",
};
//@ chunk-g3ejat5z.js:2887-2952 placement (2.1.88 match: getFileIdentity, 0.795)
function getFileIdentity(leftStats, rightStats) {
  return leftStats.ino !== 0n && leftStats.dev === rightStats.dev && leftStats.ino === rightStats.ino;
}
//@ chunk-g3ejat5z.js:2952-3317 placement
/**
 * 逐段打开到持有目录
 */
async function walkToHeldDir(backend, host, heldDir, parts, passThrough) {
  let currentDir = null;
  try {
    for (let [partIndex, partName] of parts.entries()) {
      let dirToOpen = currentDir ?? backend.getHeldDir(heldDir);
      let openedDir = await (partIndex < parts.length - 1 && backend.openDirToPass !== undefined
        ? backend.openDirToPass(dirToOpen, partName, passThrough)
        : backend.openDir(dirToOpen, partName, passThrough));
      if (currentDir !== null) await backend.closeDir(currentDir);
      currentDir = openedDir;
    }
  } catch {
    if (currentDir !== null) await backend.closeDir(currentDir);
    return null;
  } finally {
    await heldDir.close();
  }
  return currentDir === null
    ? null
    : backend.holdOpenedDir(currentDir, host.path.join(heldDir.realPath, ...parts));
}
//@ chunk-g3ejat5z.js:3317-10817 placement
/**
 * 在锚定的目录树中执行操作（防 TOCTOU），支持 /proc fd、macOS NOFOLLOW_ANY 与完整路径后端。
 */
function anchorOver(backendName, host, rootDir, rootHandle, realRoot, ops, prefixParts = [], directoryCheck) {
  let { sep } = host.path;
  let dirHandle = undefined;
  let rootNode = undefined;
  let realRootHandle = undefined;
  let prefixHandle = undefined;
  let isClosing = false;
  let isClosed = false;
  let { renameNoReplace, renameInNoReplace } = ops;
  let closedPromise = null;
  let closeOnce = () => (closedPromise ??= rootDir.close());
  let weakMap = new WeakMap();
  let holdOutside = async (basePath, relPath, passThrough = false) => {
    let parts = relPath === "" ? [] : splitAnchoredPath(relPath, sep);
    let heldDir = await ops.hold(basePath);
    let walkedDir =
      heldDir === null || parts.length === 0
        ? heldDir
        : await walkToHeldDir(ops, host, heldDir, parts, passThrough);
    if (walkedDir === null) return null;
    let closedPromise = null;
    let closeOnce = () => (closedPromise ??= walkedDir.close());
    let heldDirView = {
      realPath: walkedDir.realPath,
      get closed() {
        return closedPromise !== null;
      },
      stat: async () => {
        if (closedPromise !== null) throw Error("held directory is closed");
        return walkedDir.stat();
      },
      close: closeOnce,
      [Symbol.asyncDispose]: closeOnce,
    };
    weakMap.set(heldDirView, walkedDir);
    return heldDirView;
  };
  let resolveHeldDir = (heldDirView) => {
    let realHeldDir = weakMap.get(heldDirView);
    if (realHeldDir === undefined) throw Error("held directory belongs to another anchor");
    if (heldDirView.closed) throw Error("held directory is closed");
    return realHeldDir;
  };
  let closeDirUnlessRoot = (openedDir) =>
    openedDir === rootHandle ? Promise.resolve() : ops.closeDir(openedDir);
  let openOrMkdirDir = async (parentDir, dirName, mode, dirs) => {
    try {
      return await ops.openDir(parentDir, dirName);
    } catch (error) {
      if (mode === null || !isENOENT(error)) throw mapParentNotDirectory(error);
      if (
        await ops.mkdir(parentDir, dirName, mode).then(
          () => true,
          (error) => {
            if (getErrnoCode(error) !== "EEXIST") throw error;
            return false;
          },
        )
      )
        await withMoveCheck(
          "mkdir",
          {
            to: {
              dir: parentDir,
              dirs,
            },
          },
          () => ops.rmdir(parentDir, dirName),
        );
      return ops.openDir(parentDir, dirName).catch((error) => {
        throw mapParentNotDirectory(error);
      });
    }
  };
  let assertOpen = () => {
    if (closedPromise !== null) throw Error("tree anchor is closed");
  };
  let listPlainNames = async (dirHandle, limit) => {
    if (ops.list === undefined) throw workingError("WORKING_LIST_UNSUPPORTED");
    let firstLimit = typeof limit === "object" ? limit.first : limit;
    let names = await ops.list(dirHandle, firstLimit);
    if (firstLimit !== undefined && !(names.length <= firstLimit)) {
      if (typeof limit === "object" && firstLimit >= 0)
        return filterPlainNames(names.slice(0, firstLimit), sep);
      throw workingError("WORKING_LIST_TOO_LONG");
    }
    return filterPlainNames(names, sep);
  };
  let openDirs = async (parts, mode) => {
    assertOpen();
    let currentDir = rootHandle;
    try {
      for (let [partIndex, partName] of parts.entries()) {
        assertOpen();
        let openedDir = await openOrMkdirDir(currentDir, partName, mode, parts.slice(0, partIndex));
        await closeDirUnlessRoot(currentDir);
        currentDir = openedDir;
      }
      return currentDir;
    } catch (error) {
      await closeDirUnlessRoot(currentDir);
      throw error;
    }
  };
  let withLeaf = async (path, fn) => {
    let { dirs, leaf } = splitLeafPath(path, sep);
    let dirHandle = await openDirs(dirs, null);
    try {
      assertOpen();
      return await fn(dirHandle, leaf, dirs);
    } finally {
      await closeDirUnlessRoot(dirHandle);
    }
  };
  let withPair = async (fromPath, toPath, fn) => {
    let toSplit = splitLeafPath(toPath, sep);
    return splitLeafPath(fromPath, sep).dirs.join("/") === toSplit.dirs.join("/")
      ? withLeaf(fromPath, (dir, leaf, dirs) =>
          fn(
            {
              dir,
              leaf,
              dirs,
            },
            {
              dir,
              leaf: toSplit.leaf,
              dirs,
            },
          ),
        )
      : withLeaf(fromPath, (dir, leaf, dirs) =>
          withLeaf(toPath, (dir_2, leaf_2, dirs_2) =>
            fn(
              {
                dir,
                leaf,
                dirs,
              },
              {
                dir: dir_2,
                leaf: leaf_2,
                dirs: dirs_2,
              },
            ),
          ),
        );
  };
  let classifyError = (error) =>
    isENOENT(error)
      ? {
          found: "missing",
        }
      : getErrnoCode(error) === "WORKING_PARENT_NOT_DIRECTORY"
        ? {
            found: "replaced",
          }
        : {
            found: "check_failed",
            checkError: error,
          };
  let withHeldDirs = async (parts, fn) => {
    let result = await openDirs(parts, null).then(
      (now) => ({
        now,
      }),
      classifyError,
    );
    if (!("now" in result)) return result;
    try {
      return await fn(result.now);
    } catch (error) {
      return classifyError(error);
    } finally {
      await closeDirUnlessRoot(result.now).catch(() => {});
    }
  };
  let statOpenedDir = (dirHandle) => ops.holdOpenedDir(dirHandle, "").stat();
  let compareIdentity = (leftStats, rightStats) =>
    leftStats.dev !== rightStats.dev
      ? {
          found: "replaced",
          differs: "device",
        }
      : leftStats.ino !== rightStats.ino
        ? {
            found: "replaced",
            differs: "inode",
          }
        : SAME_IDENTITY;
  let verifyDestDir = async ({ dir, dirs }) =>
    dirs.length === 0
      ? SAME_IDENTITY
      : withHeldDirs(dirs, async (rewalkedDir) =>
          compareIdentity(await statOpenedDir(dir), await statOpenedDir(rewalkedDir)),
        );
  let verifyHeldDir = async ({ dir, dirs }) => SAME_IDENTITY;
  let rootInPlaceCheck = null;
  let rootMoveProbe = async ({ to, from }) => null;
  let movedError = (operation, details, wasUndone) => {
    try {
      undefined?.({
        operation,
        ...details,
        outcome: wasUndone ? "undone" : "not_undone",
      });
    } catch (error) {
      logError(error);
    }
    return workingError(wasUndone ? "WORKING_DIRECTORY_MOVED_UNDONE" : "WORKING_DIRECTORY_MOVED");
  };
  let noop = async (value) => {
    return;
  };
  let withMoveCheck = async (operation, location, undoCallback) => {
    let moved = await rootMoveProbe(location);
    if (moved === null) return;
    throw movedError(
      operation,
      moved,
      undoCallback !== undefined &&
        (await undoCallback(moved.side).then(
          () => true,
          () => false,
        )),
    );
  };
  let unlinkIfSame = async ({ dir, leaf }, statGetter) => {
    if (!getFileIdentity(await ops.lstat(dir, leaf), await statGetter()))
      throw Error("another file has the name");
    await ops.unlink(dir, leaf);
  };
  let createInDir = (path, data, mode, synced, afterWrite) =>
    withLeaf(path, async (dirHandle, leaf, dirs) => {
      let movedInfo = null;
      let stillAtName = false;
      let checkPlacement = async (expectedStats) => {
        let isStillAt = async (relDirs) =>
          expectedStats !== null && getFileIdentity(expectedStats, await ops.lstat(relDirs, leaf));
        if (rootInPlaceCheck !== null && !(await rootInPlaceCheck())) {
          movedInfo = {
            found: "replaced",
            side: "destination",
            rel: dirs.join("/"),
          };
          stillAtName = await isStillAt(dirHandle).catch(() => false);
          throw Error("the root is not in its place");
        }
        let identity = SAME_IDENTITY;
        let checkedIdentity =
          identity.found === "same" ||
          (
            await withHeldDirs(dirs, async (rewalkedDir) => ({
              found: (await isStillAt(rewalkedDir)) ? "same" : "replaced",
            }))
          ).found === "same"
            ? await verifyHeldDir({
                dir: dirHandle,
                dirs,
              })
            : identity;
        if (checkedIdentity.found === "same") return;
        movedInfo = {
          ...checkedIdentity,
          side: "destination",
          rel: dirs.join("/"),
        };
        stillAtName = await isStillAt(dirHandle).catch(() => false);
        throw Error("the file is not at its name");
      };
      await ops
        .create(dirHandle, leaf, [...prefixParts, ...dirs], data, mode, synced, afterWrite, undefined)
        .catch(async (error) => {
          throw movedInfo === null
            ? error
            : movedError(
                "create",
                movedInfo,
                stillAtName && (await ops.lstat(dirHandle, leaf).then(() => false, isENOENT)),
              );
        });
    });
  let placeByLink = (removeSourceOnPartial) => async (from, to) => {
    await ops.link(from.dir, from.leaf, to.dir, to.leaf);
    await withMoveCheck(
      "link",
      {
        to,
        from,
      },
      async (movedSide) => {
        let unlinkCheck = unlinkIfSame(to, () => ops.lstat(from.dir, from.leaf));
        await unlinkCheck.catch(() => {});
        if (removeSourceOnPartial && movedSide !== "destination") await ops.unlink(from.dir, from.leaf);
        await unlinkCheck;
      },
    );
  };
  let linkInFromHeld = (heldDir, leaf, destPath) =>
    withLeaf(destPath, async (dirHandle, leafName, dirs) => {
      await ops.linkIn(resolveHeldDir(heldDir), assertPlainLeaf(leaf), dirHandle, leafName);
      await withMoveCheck(
        "link",
        {
          to: {
            dir: dirHandle,
            dirs,
          },
        },
        () =>
          unlinkIfSame(
            {
              dir: dirHandle,
              leaf: leafName,
              dirs,
            },
            () => ops.statIn(resolveHeldDir(heldDir), assertPlainLeaf(leaf)),
          ),
      );
    });
  let placeByRename = async (from, to) => {
    await ops.rename(from.dir, from.leaf, to.dir, to.leaf);
    await withMoveCheck("rename", {
      to,
      from,
    });
  };
  let runWithMoveCheck = async (location, to, fn) => fn();
  return {
    backend: backendName,
    realRoot,
    createsInHeldDirectory: ops.createsInHeldDirectory !== false,
    heldCreateRefusal: ops.heldCreateRefusal ?? null,
    ...false,
    checksCreatedFiles: false,
    mkdirp: async (path, mode = DEFAULT_DIR_MODE) =>
      closeDirUnlessRoot(await openDirs(splitAnchoredPath(path, sep), mode)),
    create: (path, data, mode) => createInDir(path, data, mode, false),
    createSynced: (path, data, mode, afterWrite) => createInDir(path, data, mode, true, afterWrite),
    createAndOpen: (path, mode) =>
      withLeaf(path, (dirHandle, leaf, dirs) =>
        ops.createAndOpen(dirHandle, leaf, [...prefixParts, ...dirs], mode),
      ),
    link: (fromPath, toPath) => withPair(fromPath, toPath, placeByLink(false)),
    rename: (fromPath, toPath) => withPair(fromPath, toPath, placeByRename),
    placeCreated: (fromPath, toPath) =>
      withPair(
        fromPath,
        toPath,
        renameNoReplace === undefined
          ? placeByLink(true)
          : (from, to) =>
              runWithMoveCheck(
                {
                  to,
                  from,
                },
                to,
                (location) => renameNoReplace(from.dir, from.leaf, to.dir, to.leaf, location),
              ),
      ),
    symlink: (target, path) => withLeaf(path, (dirHandle, leaf) => ops.symlink(target, dirHandle, leaf)),
    readlink: (path) => withLeaf(path, ops.readlink),
    unlink: (path) => withLeaf(path, ops.unlink),
    rmdir: (path) => withLeaf(path, ops.rmdir),
    list: async (path, limit) => {
      let parts = path === "" ? [] : splitAnchoredPath(path, sep);
      let dirHandle = await openDirs(parts, null);
      try {
        assertOpen();
        return await listPlainNames(dirHandle, limit);
      } finally {
        await closeDirUnlessRoot(dirHandle);
      }
    },
    removeTree: (path, { keep, onDeleted } = {}) =>
      withLeaf(path, async (dirHandle, leaf, dirs) => {
        if (keep !== undefined) assertPlainLeaf(keep);
        let keepBuffer = keep === undefined ? null : Buffer.from(keep);
        let isKeptName = (name) =>
          keepBuffer !== null && (typeof name === "string" ? name === keep : name.equals(keepBuffer));
        let { bytes } = ops;
        let unlinkEntry = (dirHandle, name) =>
          typeof name === "string" ? ops.unlink(dirHandle, name) : bytes.unlink(dirHandle, name);
        let rmdirEntry = (dirHandle, name) =>
          typeof name === "string" ? ops.rmdir(dirHandle, name) : bytes.rmdir(dirHandle, name);
        let openDirEntry = (dirHandle, name) =>
          typeof name === "string" ? ops.openDir(dirHandle, name) : bytes.openDir(dirHandle, name);
        let listEntryNames = async (dirHandle) =>
          bytes === undefined
            ? listPlainNames(dirHandle)
            : filterPlainBufferNames(await bytes.list(dirHandle), sep);
        let removeEntry = async (dirHandle, name) => {
          try {
            await unlinkEntry(dirHandle, name);
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT") return "gone";
            if (errnoCode === "EISDIR" || errnoCode === "EPERM") return "directory";
            throw error;
          }
          onDeleted?.();
          return "gone";
        };
        let remainingBudget = MAX_RECORD_BYTES;
        let removeDirRecursive = async (dirHandle, leaf, dirHandle_2, ancestorNames, isRootCall = false) => {
          for (let idx = 0; ; idx++) {
            assertOpen();
            let filtered = (await listEntryNames(dirHandle_2)).filter(
              (name) => !(isRootCall && isKeptName(name)),
            );
            remainingBudget -= filtered.length;
            if (remainingBudget < 0)
              throw Object.assign(Error("directory too large to remove: too many entries"), {
                code: "E2BIG",
              });
            if (ancestorNames.length >= MAX_LIST_NAMES)
              throw Object.assign(Error("directory too deep to remove"), {
                code: "ENAMETOOLONG",
              });
            let aborted = false;
            let limitedRemove = limitConcurrency(REMOVE_TREE_CONCURRENCY, async (name) => {
              if (aborted) throw RemoveTreeError;
              assertOpen();
              try {
                return await removeEntry(dirHandle_2, name);
              } catch (error) {
                aborted = true;
                throw error;
              }
            });
            let settled = await Promise.allSettled(filtered.map((name) => limitedRemove(name)));
            let filtered_2 = settled.filter((result) => result.status === "rejected");
            if (filtered_2.length > 0)
              throw (filtered_2.find((result) => result.reason !== RemoveTreeError) ?? filtered_2[0]).reason;
            let filtered_3 = filtered.filter((name, index) => {
              let result = settled[index];
              return result?.status === "fulfilled" && result.value === "directory";
            });
            for (let name of filtered_3) {
              let subDir = await openDirEntry(dirHandle_2, name).catch(() => null);
              if (subDir === null) {
                if ((await removeEntry(dirHandle_2, name)) === "directory") {
                  await rmdirEntry(dirHandle_2, name);
                  onDeleted?.();
                }
                continue;
              }
              try {
                await removeDirRecursive(dirHandle_2, name, subDir, [...ancestorNames, name]);
              } finally {
                await ops.closeDir(subDir);
              }
            }
            if (isRootCall && keepBuffer !== null) return;
            try {
              await rmdirEntry(dirHandle, leaf);
              onDeleted?.();
              return;
            } catch (error) {
              let errnoCode = getErrnoCode(error);
              if (errnoCode === "ENOENT") return;
              if (errnoCode !== "ENOTEMPTY" || idx >= MAX_RENAME_ATTEMPTS) throw error;
            }
          }
        };
        let dirHandle_2 = await ops.openDir(dirHandle, leaf).catch(async (error) => {
          if (isENOENT(error)) return null;
          if (keepBuffer !== null) throw mapParentNotDirectory(error);
          if ((await removeEntry(dirHandle, leaf)) === "gone") return null;
          throw mapParentNotDirectory(error);
        });
        if (dirHandle_2 === null) return;
        try {
          await removeDirRecursive(dirHandle, leaf, dirHandle_2, [...dirs, leaf], true);
        } finally {
          await ops.closeDir(dirHandle_2);
        }
      }),
    lstat: async (relPath) => {
      if (relPath !== "") return withLeaf(relPath, ops.lstat);
      assertOpen();
      return rootDir.stat();
    },
    open: async (relPath, flags) => {
      let openFlags = assertNeverCreates(flags);
      if (ops.openBeneath !== undefined) {
        let { dirs, leaf } = splitLeafPath(relPath, sep);
        assertOpen();
        return ops.openBeneath([...prefixParts, ...dirs], leaf, openFlags);
      }
      return withLeaf(relPath, (dirHandle, leaf, dirs) =>
        ops.open(dirHandle, leaf, [...prefixParts, ...dirs], openFlags),
      );
    },
    anchorBeneath: async (relPath) => {
      let parts = splitAnchoredPath(relPath, sep);
      let heldDirView = ops.holdOpenedDir(await openDirs(parts, null), host.path.join(realRoot, ...parts));
      return anchorOver(
        backendName,
        host,
        heldDirView,
        ops.getHeldDir(heldDirView),
        heldDirView.realPath,
        ops.forAnchorBeneath ?? ops,
        [...prefixParts, ...parts],
        directoryCheck,
      );
    },
    holdOutside,
    moveOut: (fromPath, toHeldDir, toLeaf) =>
      withLeaf(fromPath, async (dirHandle, leaf, dirs) => {
        await ops.renameOut(dirHandle, leaf, resolveHeldDir(toHeldDir), assertPlainLeaf(toLeaf));
        await withMoveCheck("rename", {
          from: {
            dir: dirHandle,
            dirs,
          },
        });
      }),
    moveIn: (fromHeldDir, fromLeaf, toPath) =>
      withLeaf(toPath, async (dirHandle, leaf, dirs) => {
        await ops.renameIn(resolveHeldDir(fromHeldDir), assertPlainLeaf(fromLeaf), dirHandle, leaf);
        await withMoveCheck("rename", {
          to: {
            dir: dirHandle,
            dirs,
          },
        });
      }),
    linkIn: linkInFromHeld,
    placeCreatedIn: (fromHeldDir, fromLeaf, toPath) =>
      renameInNoReplace === undefined
        ? linkInFromHeld(fromHeldDir, fromLeaf, toPath)
        : withLeaf(toPath, (dirHandle, leaf, dirs) =>
            runWithMoveCheck(
              {
                to: {
                  dir: dirHandle,
                  dirs,
                },
              },
              {
                dir: dirHandle,
                leaf,
                dirs,
              },
              (moveCheck) =>
                renameInNoReplace(
                  resolveHeldDir(fromHeldDir),
                  assertPlainLeaf(fromLeaf),
                  dirHandle,
                  leaf,
                  moveCheck,
                ),
            ),
          ),
    statIn: async (heldDir, leaf) => ops.statIn(resolveHeldDir(heldDir), assertPlainLeaf(leaf)),
    openIn: async (heldDir, leaf, flags) =>
      ops.openIn(resolveHeldDir(heldDir), assertPlainLeaf(leaf), assertNeverCreates(flags)),
    unlinkIn: async (heldDir, leaf) => ops.unlinkIn(resolveHeldDir(heldDir), assertPlainLeaf(leaf)),
    close: closeOnce,
    [Symbol.asyncDispose]: closeOnce,
  };
}
//@ chunk-g3ejat5z.js:10817-10864 placement
function filterPlainNames(names, sep) {
  return names.filter((name) => isPlainEntryName(name, sep));
}
//@ chunk-g3ejat5z.js:10864-10930 placement
function filterPlainBufferNames(names, sep) {
  return names.filter((name) => isPlainEntryName(name.toString("latin1"), sep));
}
//@ chunk-g3ejat5z.js:10930-11035 placement
function isPlainEntryName(name, sep) {
  return (
    name !== "" &&
    name !== "." &&
    name !== ".." &&
    !name.includes("/") &&
    !name.includes(sep) &&
    !name.includes("\x00")
  );
}
//@ chunk-g3ejat5z.js:11035-11202 placement
/**
 * 确认叶子名为普通名字
 */
function assertPlainLeaf(leaf) {
  if (
    leaf === "" ||
    leaf === "." ||
    leaf === ".." ||
    leaf.includes("/") ||
    leaf.includes("\\") ||
    leaf.includes("\x00")
  )
    throw Error("a held-directory leaf must be one plain name");
  return leaf;
}
//@ chunk-g3ejat5z.js:11202-11684 placement
/**
 * 打开根目录锚
 */
async function openRootAnchor(host, rootPath) {
  let { fs } = host;
  let realPath = await fs.realpath(rootPath).catch(() => null);
  if (realPath === null) return null;
  let dirHandle = await fs.open(realPath, OPEN_DIR_FLAGS).catch(() => null);
  if (dirHandle === null) return null;
  try {
    let [handleStats, pathStats] = await Promise.all([
      dirHandle.stat({
        bigint: true,
      }),
      fs.lstat(realPath, {
        bigint: true,
      }),
    ]);
    if (
      !handleStats.isDirectory() ||
      !pathStats.isDirectory() ||
      handleStats.ino === 0n ||
      handleStats.dev !== pathStats.dev ||
      handleStats.ino !== pathStats.ino
    ) {
      await dirHandle.close().catch(() => {});
      return null;
    }
  } catch {
    await dirHandle.close().catch(() => {});
    return null;
  }
  return {
    realPath,
    dir: dirHandle,
    stat: () =>
      dirHandle.stat({
        bigint: true,
      }),
    close: () => dirHandle.close(),
  };
}
//@ chunk-g3ejat5z.js:11684-11756 placement
function statsView(handle) {
  return {
    stat: () =>
      handle.stat({
        bigint: true,
      }),
    close: () => handle.close(),
  };
}
//@ chunk-g3ejat5z.js:11756-12181 placement
/**
 * 写入新建文件并设所有者与权限
 */
async function writeCreatedFile(
  fileHandle,
  data,
  mode,
  shouldSync,
  onFailure,
  ownerChange,
  afterOwnerChange,
) {
  let chownTo = (uid, gid) =>
    fileHandle.chown(uid, gid).catch((error) => {
      throw new OwnerNotGiven(error);
    });
  try {
    await fileHandle.writeFile(data);
    if (ownerChange !== undefined && ownerChange.to.gid !== ownerChange.from.gid)
      await chownTo(ownerChange.from.uid, ownerChange.to.gid);
    await fileHandle.chmod(mode);
    if (ownerChange !== undefined && ownerChange.to.uid !== ownerChange.from.uid)
      await chownTo(ownerChange.to.uid, ownerChange.to.gid);
    if (shouldSync) await fileHandle.sync();
    await afterOwnerChange();
  } catch (error) {
    await onFailure().catch(() => {});
    await fileHandle.close().catch(() => {});
    throw error;
  }
  try {
    await fileHandle.close();
  } catch (error) {
    await onFailure().catch(() => {});
    throw error;
  }
}
//@ chunk-g3ejat5z.js:12181-12214 placement
var modeOrDefault = (mode, forcedMode) => (forcedMode === undefined ? mode : mode & 448);
//@ chunk-g3ejat5z.js:12214-12698 placement
async function writeCreatedUnlessMoved(
  fileHandle,
  data,
  mode,
  statCreated,
  onMoved,
  shouldSync = false,
  ownerChange,
  afterWrite = () => Promise.resolve(),
) {
  let { made, lookError } = await fileHandle
    .stat({
      bigint: true,
    })
    .then(
      (made) => ({
        made,
        lookError: undefined,
      }),
      (lookError) => ({
        made: null,
        lookError,
      }),
    );
  let unlinkIfMoved = async () => {
    let nowStats = await statCreated();
    if (
      made !== null &&
      made.ino !== 0n &&
      nowStats !== null &&
      nowStats.dev === made.dev &&
      nowStats.ino === made.ino
    )
      await onMoved();
  };
  if (ownerChange !== undefined && made === null) {
    await fileHandle.close().catch(() => {});
    throw new OwnerNotGiven(lookError);
  }
  let createdOwner = made && {
    uid: Number(made.uid),
    gid: Number(made.gid),
  };
  return writeCreatedFile(
    fileHandle,
    data,
    mode,
    shouldSync,
    unlinkIfMoved,
    ownerChange === undefined || createdOwner === null
      ? undefined
      : {
          from: createdOwner,
          to: {
            ...createdOwner,
            ...ownerChange,
          },
        },
    () => afterWrite(made),
  );
}
//@ chunk-g3ejat5z.js:12698-12847 placement
async function isSameDirectory(host, dirHandle, realRoot) {
  let [pathStats, handleStats] = await Promise.all([
    host.fs.lstat(realRoot, {
      bigint: true,
    }),
    dirHandle.stat({
      bigint: true,
    }),
  ]);
  return pathStats.dev === handleStats.dev && pathStats.ino === handleStats.ino && handleStats.ino !== 0n;
}
//@ chunk-g3ejat5z.js:12847-13103 placement
/**
 * fd 与路径是否同一目录
 */
async function isSameDirectory_2(host, dirHandle) {
  try {
    let [pathStats, handleStats] = await Promise.all([
      host.fs.lstat(`/proc/self/fd/${dirHandle.fd}/.`, {
        bigint: true,
      }),
      dirHandle.stat({
        bigint: true,
      }),
    ]);
    return pathStats.dev === handleStats.dev && pathStats.ino === handleStats.ino && handleStats.ino !== 0n;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "EACCES" || errnoCode === "EPERM") return false;
    throw error;
  }
}
//@ chunk-g3ejat5z.js:13103-14679 placement
/**
 * 基于 /proc/self/fd 的后端
 */
function procFdBackend(host, rootDir, { realRoot, directoryCheck }, createsInHeldDir) {
  let { fs } = host;
  let fdPath = (dirHandle, name) => `/proc/self/fd/${dirHandle.fd}/${name}`;
  let fdPathBuffer = (dirHandle, name) =>
    Buffer.concat([Buffer.from(`/proc/self/fd/${dirHandle.fd}/`), name]);
  let ops = {
    openDir: (dirHandle, name) => fs.open(fdPath(dirHandle, name), OPEN_DIR_FLAGS),
    mkdir: async (dirHandle, name, mode) => {
      await fs.mkdir(fdPath(dirHandle, name), {
        mode,
      });
    },
    closeDir: (dirHandle) => dirHandle.close(),
    ...{},
    create: async (dirHandle, name, dirs, data, mode, shouldSync, forcedMode, afterWrite) => {
      await writeCreatedUnlessMoved(
        await fs.open(
          fdPath(dirHandle, name),
          CREATE_FILE_FLAGS | constants.O_NOFOLLOW,
          modeOrDefault(mode, forcedMode),
        ),
        data,
        mode,
        () =>
          fs
            .lstat(fdPath(dirHandle, name), {
              bigint: true,
            })
            .catch(() => null),
        () => fs.unlink(fdPath(dirHandle, name)),
        shouldSync,
        forcedMode,
        afterWrite,
      );
      if (shouldSync) await dirHandle.sync().catch(() => {});
    },
    createAndOpen: (dirHandle, name, dirs, mode) =>
      fs.open(fdPath(dirHandle, name), CREATE_FILE_FLAGS | constants.O_NOFOLLOW, mode),
    link: (fromDir, fromName, toDir, toName) => fs.link(fdPath(fromDir, fromName), fdPath(toDir, toName)),
    rename: (fromDir, fromName, toDir, toName) => fs.rename(fdPath(fromDir, fromName), fdPath(toDir, toName)),
    symlink: (target, dirHandle, name) => fs.symlink(target, fdPath(dirHandle, name)),
    readlink: (dirHandle, name) => fs.readlink(fdPath(dirHandle, name)),
    unlink: (dirHandle, name) => fs.unlink(fdPath(dirHandle, name)),
    rmdir: (dirHandle, name) => fs.rmdir(fdPath(dirHandle, name)),
    list: async (dirHandle, limit) => {
      if (limit === undefined) return fs.readdir(`/proc/self/fd/${dirHandle.fd}`);
      throw workingError("WORKING_LIST_UNSUPPORTED");
    },
    bytes: {
      list: (dirHandle) =>
        fs.readdir(`/proc/self/fd/${dirHandle.fd}`, {
          encoding: "buffer",
        }),
      openDir: (dirHandle, name) => fs.open(fdPathBuffer(dirHandle, name), OPEN_DIR_FLAGS),
      unlink: (dirHandle, name) => fs.unlink(fdPathBuffer(dirHandle, name)),
      rmdir: (dirHandle, name) => fs.rmdir(fdPathBuffer(dirHandle, name)),
    },
    lstat: (dirHandle, name) =>
      fs.lstat(fdPath(dirHandle, name), {
        bigint: true,
      }),
    open: (dirHandle, name, dirs, flags) =>
      fs.open(fdPath(dirHandle, name), flags | constants.O_NOFOLLOW | READ_LIMITS),
    hold: (rootPath) => openRootAnchor(host, rootPath),
    getHeldDir: (rootDir) => rootDir.dir,
    holdOpenedDir: (dirHandle, realPath) => ({
      realPath,
      dir: dirHandle,
      stat: () =>
        dirHandle.stat({
          bigint: true,
        }),
      close: () => dirHandle.close(),
    }),
    renameOut: (fromDir, fromName, toHeldDir, toName) =>
      fs.rename(fdPath(fromDir, fromName), fdPath(toHeldDir.dir, toName)),
    renameIn: (fromHeldDir, fromName, toDir, toName) =>
      fs.rename(fdPath(fromHeldDir.dir, fromName), fdPath(toDir, toName)),
    linkIn: (fromHeldDir, fromName, toDir, toName) =>
      fs.link(fdPath(fromHeldDir.dir, fromName), fdPath(toDir, toName)),
    statIn: (heldDir, name) =>
      fs.lstat(fdPath(heldDir.dir, name), {
        bigint: true,
      }),
    openIn: (heldDir, name, flags) =>
      fs.open(fdPath(heldDir.dir, name), flags | constants.O_NOFOLLOW | READ_LIMITS),
    unlinkIn: (heldDir, name) => fs.unlink(fdPath(heldDir.dir, name)),
  };
  return anchorOver("linux_procfd", host, statsView(rootDir), rootDir, realRoot, ops, [], directoryCheck);
}
//@ chunk-g3ejat5z.js:14679-14774 placement
function posixFsAtApi() {
  let posixFsAt = globalThis.Bun?.ant?.posixFsAt;
  return typeof posixFsAt?.openat === "function" ? posixFsAt : null;
}
//@ chunk-g3ejat5z.js:14774-14882 placement
function readDirNames(api, dirFd, maxNames) {
  return maxNames >= 0
    ? api.readdirat(dirFd, {
        maxNames: Math.min(Math.floor(maxNames), Number.MAX_SAFE_INTEGER),
      })
    : [];
}
//@ chunk-g3ejat5z.js:14882-14949 placement
var fstatAsync = promisify(fstat);
var closeAsync = promisify(close);
var openAsync = promisify(open);
var fsyncAsync = promisify(fsync);
var fchmodAsync = promisify(fchmod);
var fchownAsync = promisify(fchown);
var writeFileAsync = promisify(writeFile);
//@ chunk-g3ejat5z.js:14949-15086 placement
function anchoredFileOps(fileHandle) {
  return {
    stat: (options) => fstatAsync(fileHandle, options),
    writeFile: (data) => writeFileAsync(fileHandle, data),
    chown: (uid, gid) => fchownAsync(fileHandle, uid, gid),
    chmod: (mode) => fchmodAsync(fileHandle, mode),
    sync: () => fsyncAsync(fileHandle),
    close: () => closeAsync(fileHandle),
  };
}
//@ chunk-g3ejat5z.js:15086-15207 placement
var posixFsAt;
var warnNoPosixFsAtOnce = onceExport(() =>
  logForDebugging("anchor: this runtime has no Bun.ant.posixFsAt, so the macOS backend cannot come up", {
    level: "warn",
  }),
);
//@ chunk-g3ejat5z.js:15207-16159 placement
function loadDarwinAt() {
  let api = posixFsAtApi();
  if (api === null) {
    warnNoPosixFsAtOnce();
    return null;
  }
  if (posixFsAt !== undefined) return posixFsAt;
  let getBeneath = onceExport(() => {
    return;
  });
  let callSyscall = (syscall, call) => {
    try {
      return call();
    } catch (error) {
      let error_2 = Error("a file call failed (see the code and syscall properties)");
      error_2.errno = isSyscallError(error) && error.errno !== undefined ? Math.abs(error.errno) : 0;
      error_2.code =
        error_2.errno === 0 ? (getErrnoCode(error) ?? "EUNKNOWN") : getSystemErrorName(-error_2.errno);
      error_2.syscall = syscall;
      throw error_2;
    }
  };
  posixFsAt = {
    openat: (dirFd, name, flags) => callSyscall("openat", () => api.openat(dirFd, name, flags)),
    getBeneath,
    mkdirat: (dirFd, name, mode) => callSyscall("mkdirat", () => api.mkdirat(dirFd, name, mode)),
    renameat: (fromFd, fromName, toFd, toName) =>
      callSyscall("renameat", () => api.renameat(fromFd, fromName, toFd, toName)),
    linkat: (fromFd, fromName, toFd, toName) =>
      callSyscall("linkat", () => api.linkat(fromFd, fromName, toFd, toName)),
    symlinkat: (target, dirFd, name) => callSyscall("symlinkat", () => api.symlinkat(target, dirFd, name)),
    readlinkat: (dirFd, name) => callSyscall("readlinkat", () => api.readlinkat(dirFd, name)),
    unlinkat: (dirFd, name) => callSyscall("unlinkat", () => api.unlinkat(dirFd, name)),
    rmdirat: (dirFd, name) =>
      callSyscall("unlinkat", () =>
        api.unlinkat(dirFd, name, {
          removeDir: true,
        }),
      ),
    listDirectory: (dirFd, maxNames) =>
      callSyscall("readdir", () =>
        maxNames === undefined ? api.readdirat(dirFd) : readDirNames(api, dirFd, maxNames),
      ),
    listDirectoryBytes: (dirFd) =>
      callSyscall("readdir", () =>
        api.readdirat(dirFd, {
          encoding: "buffer",
        }),
      ),
    ...{},
  };
  return posixFsAt;
}
//@ chunk-g3ejat5z.js:16159-16212 placement
function darwinNoFollowAnyEnforced(host) {
  return (host.noFollowAnyEnforced ??= probeNoFollowAny(host));
}
//@ chunk-g3ejat5z.js:16212-16781 placement
/**
 * 探测 O_NOFOLLOW_ANY 是否生效
 */
async function probeNoFollowAny(host) {
  let { fs, path } = host;
  let tempDir = null;
  try {
    tempDir = await fs.realpath(await mkdtemp(path.join(tmpdir(), "claude-nfa-")));
    await fs.mkdir(path.join(tempDir, "d"));
    await symlink(path.join(tempDir, "d"), path.join(tempDir, "l"));
    let probeFlags = CREATE_FILE_FLAGS | O_NOFOLLOW_ANY;
    try {
      await (await fs.open(path.join(tempDir, "d", "control"), probeFlags, 384)).close();
    } catch (error) {
      if (getErrnoCode(error) === "EINVAL") return false;
      throw error;
    }
    try {
      await (await fs.open(path.join(tempDir, "l", "probe"), probeFlags, 384)).close();
      return false;
    } catch (error) {
      if (getErrnoCode(error) === "ELOOP") return true;
      throw error;
    }
  } catch (error) {
    logForDebugging(`anchor: O_NOFOLLOW_ANY probe not run (${getErrnoCode(error) ?? "not an errno"})`);
    return true;
  } finally {
    if (tempDir !== null)
      await rm(tempDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-g3ejat5z.js:16781-16915 placement
async function getDarwinCreateFn(host, api) {
  let beneath = api.getBeneath?.();
  if (beneath === undefined) return "not_bound";
  return (
    (await probeDarwinHeldCreate(host, beneath)) ??
    ((dirFd, name, mode) => beneath.create(dirFd, [name], mode & 511))
  );
}
//@ chunk-g3ejat5z.js:16915-17065 placement
function probeDarwinHeldCreate(host, api) {
  return (host.heldCreateProbed ??= probeDarwinHeldCreateUnchecked(api).then((outcome) => {
    if (outcome === "probe_not_run" || outcome === "probe_create_failed") host.heldCreateProbed = undefined;
    return outcome;
  }));
}
//@ chunk-g3ejat5z.js:17065-18042 placement
/**
 * 探测 macOS 持有目录下的创建
 */
async function probeDarwinHeldCreateUnchecked(api) {
  let reportProbe = (detail, who) =>
    logForDebugging(
      `anchor: the probe of the create in a held directory ${detail}, so this ${who} creates by full path`,
    );
  let tempDir = null;
  let openHandles = [];
  let trackHandle = (handle) => {
    openHandles.push(handle);
    return fstatAsync(handle, {
      bigint: true,
    });
  };
  try {
    tempDir = await mkdtemp(`${tmpdir()}/claude-held-`);
    let dirHandle = await openAsync(tempDir, OPEN_DIR_FLAGS);
    openHandles.push(dirHandle);
    let byPathStats = await trackHandle(await openAsync(`${tempDir}/by-path`, CREATE_FILE_FLAGS, 384));
    let heldStats;
    try {
      heldStats = await trackHandle(api.create(dirHandle, ["held"], 384));
    } catch (error) {
      reportProbe(`failed (${getErrnoCode(error) ?? "not an errno"})`, "anchor");
      return "probe_create_failed";
    }
    if (heldStats.mode !== byPathStats.mode) {
      reportProbe(
        `made a file of mode ${heldStats.mode.toString(8)} where node made one of ${byPathStats.mode.toString(8)}`,
        "host",
      );
      return "probe_wrong_mode";
    }
    let namedStats = await lstat(`${tempDir}/held`, {
      bigint: true,
    }).catch((error) => {
      if (isENOENT(error)) return null;
      throw error;
    });
    if (namedStats === null || !getFileIdentity(heldStats, namedStats)) {
      reportProbe("made a file that is not seen at its name", "host");
      return "probe_wrong_place";
    }
    return null;
  } catch (error) {
    reportProbe(`could not be staged (${getErrnoCode(error) ?? "not an errno"})`, "anchor");
    return "probe_not_run";
  } finally {
    await Promise.all(openHandles.map((handle) => closeAsync(handle).catch(() => {})));
    if (tempDir !== null)
      await rm(tempDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-g3ejat5z.js:18042-18076 placement
var O_RDONLY_SEARCH_NONBLOCK = constants.O_RDONLY | O_SEARCH | constants.O_NONBLOCK;
//@ chunk-g3ejat5z.js:18076-20629 placement
/**
 * 按完整路径的后端
 */
function fullPathBackend(
  host,
  api,
  rootDirHandle,
  { realRoot, directoryCheck },
  darwinCreateFn,
  allowAnchorBeneath,
  onRecheckRoot,
) {
  let { fs, path } = host;
  let openAt = (dirs, name, flags, mode) =>
    fs.open(
      path.join(realRoot, ...dirs, name),
      (flags & ~constants.O_NOFOLLOW) | O_NOFOLLOW_ANY | READ_LIMITS,
      mode,
    );
  let lstatAt = async (dirFd, name) => {
    let fastStats = api.fstatat?.(dirFd, name);
    return fastStats !== undefined && fastStats.dev >= 0n && fastStats.ino < 2n ** 63n
      ? fastStats
      : statViaOpenAt(dirFd, name, O_RDONLY_SEARCH_NONBLOCK);
  };
  let statViaOpenAt = async (dirFd, name, flags) => {
    let handle = api.openat(dirFd, name, flags | READ_LIMITS);
    try {
      return await fstatAsync(handle, {
        bigint: true,
      });
    } finally {
      await closeAsync(handle);
    }
  };
  let ensureSameFile = async (handle, expectedStats, onMismatch) => {
    try {
      let [handleStats, pathStats] = await Promise.all([
        handle.stat({
          bigint: true,
        }),
        expectedStats(),
      ]);
      if (handleStats.dev !== pathStats.dev || handleStats.ino !== pathStats.ino) {
        onMismatch?.();
        throw Object.assign(Error("not the file the held directory names"), {
          code: "ELOOP",
        });
      }
      return handle;
    } catch (error) {
      await handle.close().catch(() => {});
      throw error;
    }
  };
  let openForCreate = async (createFn, dirFd, name, dirs, mode) => {
    try {
      return createFn === null
        ? await openAt(dirs, name, CREATE_FILE_FLAGS, mode)
        : anchoredFileOps(createFn(dirFd, name, mode));
    } catch (error) {
      throw mapParentNotDirectory(error);
    }
  };
  let { listDirectory, listDirectoryBytes } = api;
  let buildDirOps = (createInHeld) => ({
    ...(listDirectoryBytes !== undefined && {
      bytes: {
        list: async (dirHandle) => listDirectoryBytes(dirHandle),
        openDir: async (dirFd, name) => api.openat(dirFd, name, OPEN_DIR_FLAGS),
        unlink: async (dirFd, name) => api.unlinkat(dirFd, name),
        rmdir: async (dirFd, name) => api.rmdirat(dirFd, name),
      },
    }),
    openDir: async (dirFd, name) => api.openat(dirFd, name, OPEN_DIR_FLAGS),
    mkdir: async (dirFd, name, mode) => api.mkdirat(dirFd, name, mode),
    closeDir: (dirHandle) => closeAsync(dirHandle),
    createsInHeldDirectory: createInHeld !== null,
    ...(createInHeld !== null && {
      statDirectoryByPath: async (path) => {
        let handle = await openAt(path, "", OPEN_DIR_FLAGS | constants.O_NONBLOCK).catch((error) => {
          throw mapParentNotDirectory(error);
        });
        try {
          return await handle.stat({
            bigint: true,
          });
        } finally {
          await handle.close();
        }
      },
    }),
    create: async (dirFd, name, dirs, data, mode, shouldSync, forcedMode, afterWrite) => {
      await writeCreatedUnlessMoved(
        await openForCreate(createInHeld, dirFd, name, dirs, modeOrDefault(mode, forcedMode)),
        data,
        mode,
        () => statViaOpenAt(dirFd, name, O_RDONLY_SEARCH_NONBLOCK).catch(() => null),
        () => api.unlinkat(dirFd, name),
        shouldSync,
        forcedMode,
        afterWrite,
      );
      if (shouldSync) await fsyncAsync(dirFd).catch(() => {});
    },
    createAndOpen: (dirs, name, dirFd, mode) =>
      openAt(dirFd, name, CREATE_FILE_FLAGS, mode).catch((error) => {
        throw mapParentNotDirectory(error);
      }),
    link: async (fromFd, fromName, toFd, toName) => api.linkat(fromFd, fromName, toFd, toName),
    rename: async (fromFd, fromName, toFd, toName) => api.renameat(fromFd, fromName, toFd, toName),
    symlink: async (target, dirFd, name) => {
      if (api.symlinkat === undefined) throw workingError("WORKING_LINK_UNSUPPORTED");
      api.symlinkat(target, dirFd, name);
    },
    readlink: async (dirFd, name) => {
      if (api.readlinkat === undefined) throw workingError("WORKING_LINK_UNSUPPORTED");
      return api.readlinkat(dirFd, name);
    },
    unlink: async (dirFd, name) => api.unlinkat(dirFd, name),
    rmdir: async (dirFd, name) => api.rmdirat(dirFd, name),
    ...(listDirectory !== undefined && {
      list: async (dirFd, maxNames) => listDirectory(dirFd, maxNames),
    }),
    lstat: lstatAt,
    open: async (dirFd, name, dirs, flags) =>
      ensureSameFile(
        await openAt(dirs, name, flags),
        () => lstatAt(dirFd, name),
        () => onRecheckRoot?.([...dirs, name].join("/")),
      ),
    ...(onRecheckRoot === null && {
      openBeneath: (dirs, name, flags) => openAt(dirs, name, flags),
    }),
    hold: (rootPath) => openRootAnchor(host, rootPath),
    getHeldDir: (rootDirHandle) => rootDirHandle.dir.fd,
    holdOpenedDir: (dirFd, realPath) => ({
      realPath,
      dir: {
        fd: dirFd,
      },
      stat: () =>
        fstatAsync(dirFd, {
          bigint: true,
        }),
      close: () => closeAsync(dirFd),
    }),
    renameOut: async (fromFd, fromName, toHeldDir, toName) =>
      api.renameat(fromFd, fromName, toHeldDir.dir.fd, toName),
    renameIn: async (fromHeldDir, fromName, toFd, toName) =>
      api.renameat(fromHeldDir.dir.fd, fromName, toFd, toName),
    linkIn: async (fromHeldDir, fromName, toFd, toName) =>
      api.linkat(fromHeldDir.dir.fd, fromName, toFd, toName),
    statIn: (heldDir, name) => lstatAt(heldDir.dir.fd, name),
    openIn: async (heldDir, name, flags) =>
      ensureSameFile(
        await fs.open(
          path.join(heldDir.realPath, name),
          (flags & ~constants.O_NOFOLLOW) | O_NOFOLLOW_ANY | READ_LIMITS,
        ),
        () => statViaOpenAt(heldDir.dir.fd, name, O_RDONLY_SEARCH_NONBLOCK),
      ),
    unlinkIn: async (heldDir, name) => api.unlinkat(heldDir.dir.fd, name),
  });
  return anchorOver(
    "darwin_at",
    host,
    statsView(rootDirHandle),
    rootDirHandle.fd,
    realRoot,
    {
      ...buildDirOps(typeof darwinCreateFn === "function" ? darwinCreateFn : null),
      ...(typeof darwinCreateFn === "string" && {
        heldCreateRefusal: darwinCreateFn,
      }),
      ...(!allowAnchorBeneath && {
        forAnchorBeneath: buildDirOps(null),
      }),
    },
    [],
    directoryCheck,
  );
}
//@ chunk-g3ejat5z.js:20629-20772 placement
function openTreeAnchorAtName(
  host,
  rootPath,
  { createsInHeldDirectoryCheckedByPath: checkCreateByPath = false } = {},
) {
  return openTreeAnchor(host, {
    gitRoot: rootPath,
    realRoot: rootPath,
    isRootNameExchangeable: true,
    ...(checkCreateByPath && {
      [ANCHOR_OPEN_FLAGS]: true,
    }),
  });
}
//@ chunk-g3ejat5z.js:20772-22054 placement
async function openTreeAnchor(host, location) {
  let { [ANCHOR_OPEN_FLAGS]: anchorOpenFlags, ...restLocation } = location;
  let anchorReason = undefined;
  let anchorFailed = false;
  let anchorOptions = {
    ...restLocation,
    directoryCheck: undefined,
  };
  switch (host.platform()) {
    case "windows": {
      let { loadNt } = await import("./win32Nt.js");
      let nt = loadNt();
      if (nt === null)
        return {
          unavailable: "no_ffi",
        };
      let { openWin32Backend } = await import("./openWin32Backend.lazy.js");
      let win32Backend = await openWin32Backend(host, nt, anchorOptions);
      return "unanchored" in win32Backend
        ? {
            unavailable: win32Backend.unanchored,
          }
        : anchorOver(
            "win32_handle",
            host,
            win32Backend.root,
            win32Backend.held,
            anchorOptions.realRoot,
            win32Backend.ops,
            [],
            undefined?.reachesWindows?.() === true ? undefined : undefined,
          );
    }
    case "linux":
    case "wsl": {
      let rootHandle = await host.fs.open(anchorOptions.realRoot, OPEN_DIR_FLAGS);
      try {
        if (!(await isSameDirectory(host, rootHandle, anchorOptions.realRoot))) {
          await rootHandle.close();
          return {
            unavailable: "unstable_identity",
          };
        }
        if (await isSameDirectory_2(host, rootHandle)) {
          let createsInHeldDir = undefined?.createsInHeldDirectory === true || false;
          return procFdBackend(host, rootHandle, anchorOptions, createsInHeldDir);
        }
        await rootHandle.close();
        return {
          unavailable: "no_procfs",
        };
      } catch (error) {
        await rootHandle.close().catch(() => {});
        throw error;
      }
    }
    case "macos": {
      let darwinAt = host.darwinAt ?? loadDarwinAt();
      if (darwinAt === null)
        return {
          unavailable: "no_ffi",
        };
      if (!(await darwinNoFollowAnyEnforced(host)))
        return {
          unavailable: "nofollow_any_unenforced",
        };
      let rootHandle = await host.fs.open(anchorOptions.realRoot, OPEN_DIR_FLAGS);
      try {
        if ((await resolvedRoot(host, anchorOptions)) !== anchorOptions.realRoot)
          throw rootNotCanonicalError();
        if (!(await isSameDirectory(host, rootHandle, anchorOptions.realRoot))) {
          await rootHandle.close();
          return {
            unavailable: "unstable_identity",
          };
        }
        return fullPathBackend(
          host,
          darwinAt,
          rootHandle,
          anchorOptions,
          undefined?.createsInHeldDirectory === true ? await getDarwinCreateFn(host, darwinAt) : null,
          false,
          null,
        );
      } catch (error) {
        await rootHandle.close().catch(() => {});
        throw error;
      }
    }
    case "unknown":
      return {
        unavailable: "unsupported_platform",
      };
  }
}
//@ chunk-g3ejat5z.js:22054-22114 placement
function getUnavailableReason(result) {
  return result.kind === "unavailable" ? result.reason : null;
}
//@ chunk-g3ejat5z.js:22114-22274 placement
async function checkAnchoring(
  rootPath,
  { host = createDeviceTreeHost(), now = () => performance.now() } = {},
) {
  let startedAt = now();
  return {
    ...(await checkAnchoringAt(host, rootPath).catch((error) => ({
      kind: "threw",
    }))),
    elapsedMs: Math.round(now() - startedAt),
  };
}
//@ chunk-g3ejat5z.js:22274-22485 placement
/**
 * 检查锚定是否可用
 */
async function checkAnchoringAt(host, rootPath) {
  let treeAnchor = await openTreeAnchor(host, {
    gitRoot: rootPath,
    realRoot: await host.fs.realpath(rootPath),
  });
  if ("unavailable" in treeAnchor)
    return {
      kind: "unavailable",
      reason: treeAnchor.unavailable,
    };
  await treeAnchor.close().catch(() => {});
  return {
    kind: "available",
  };
}
export {
  openTreeAnchor,
  ANCHOR_UNAVAILABLE_REASONS,
  OwnerNotGiven,
  anchorOver,
  checkAnchoring,
  darwinNoFollowAnyEnforced,
  getUnavailableReason,
  isAnchorUnavailableReason,
  loadDarwinAt,
  openTreeAnchorAtName,
  probeDarwinHeldCreate,
  writeCreatedUnlessMoved,
};
