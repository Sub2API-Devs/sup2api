/**
 * utils/fsAnchor/win32Anchor.ts
 *
 * 2.1.316 新增：Windows 文件系统锚点
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cr1mmxrf.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { constants } from "fs";
import {
  ACCESS,
  OPTIONS,
  ATTRIBUTE,
  isReparseTagNameSurrogate,
  toNtPath,
  DISPOSITION,
  FILE_REMOTE_DEVICE,
  statusOf,
  FILE_GENERIC_READ,
  FILE_GENERIC_WRITE,
  encodeSymlinkReparseData,
} from "./win32Nt.js";
import { isReservedDeviceName } from "../windowsProfileFolders.js";
import { isConDeviceName, hasDosShortNameSegment, sameTimestamp } from "../windowsPathNames.js";
import { logForDebugging } from "../debug.js";
import { isUncPath } from "../permissions/filesystem.js";
import { resolvedRoot } from "./deviceTreeHost.js";
import { getErrnoCode } from "../errors.js";
import { retryTransient } from "../atomicPublishWrite.js";
import { logError } from "../log.js";

//@ chunk-cr1mmxrf.js:1036-1380 placement
/**
 * Windows 锚定后端的访问掩码与打开选项常量、缓冲大小上限，以及表示文件不可用的 NTSTATUS 集合。
 */
var DIR_LIST_ACCESS =
  ACCESS.FILE_LIST_DIRECTORY | ACCESS.FILE_TRAVERSE | ACCESS.FILE_READ_ATTRIBUTES | ACCESS.SYNCHRONIZE;
var DIR_TRAVERSE_ACCESS = ACCESS.FILE_TRAVERSE | ACCESS.FILE_READ_ATTRIBUTES | ACCESS.SYNCHRONIZE;
var OPEN_DIR_OPTIONS =
  OPTIONS.FILE_DIRECTORY_FILE | OPTIONS.FILE_OPEN_REPARSE_POINT | OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT;
var OPEN_REPARSE_OPTIONS = OPTIONS.FILE_OPEN_REPARSE_POINT | OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT;
var MAX_REPARSE_BUFFER = 4096;
var MAX_READ_CHUNK = 4194304;
var FILE_NOT_SERVED_STATUSES = new Set([2147483693, 3221226763]);
//@ chunk-cr1mmxrf.js:1380-1449 placement
function hasOfflineAttributeFlags(attributes) {
  return (
    (attributes & MAX_READ_CHUNK) !== 0 ||
    ((attributes & MAX_REPARSE_BUFFER) !== 0 && (attributes & ATTRIBUTE.REPARSE_POINT) !== 0)
  );
}
//@ chunk-cr1mmxrf.js:1449-1632 placement
var TRAILING_DOT_SPACE_RE = /[. ]+$/;
var READ_ATTR_ACCESS = ACCESS.FILE_READ_ATTRIBUTES | ACCESS.SYNCHRONIZE;
var MAX_DIR_READ_BYTES = 1048576;
var READ_CHUNK_BYTES = 262144;
var WRITE_OPEN_FLAGS = constants.O_WRONLY | constants.O_RDWR | constants.O_APPEND | constants.O_TRUNC;
var NOFOLLOW_NONBLOCK_FLAGS = (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
var FILETIME_EPOCH_OFFSET = 116444736000000000n;
//@ chunk-cr1mmxrf.js:1632-2692 placement
/**
 * 把锚定后端的错误码转为说明性的 Error（文件已关闭、名字被占用、参数非法、非普通名字、被其他程序占用、链接/目录占位、根非规范路径、云同步/去重文件、仅在线文件等）。
 */
function win32AnchorError(code) {
  switch (code) {
    case "EBADF":
      return Error("the file is closed");
    case "EEXIST":
      return Error("the name is taken");
    case "EINVAL":
      return Error(
        "write(): offset, length and position must be whole numbers of at least 0, and offset plus length must not pass the end of the buffer",
      );
    case "WORKING_NAME_NOT_PLAIN":
      return Error("not a plain file name here");
    case "WORKING_FILE_HELD":
      return Error("another program holds the file");
    case "ELOOP":
      return Error("a link stands at the name");
    case "EISDIR":
      return Error("a directory stands at the name");
    case "ENOTDIR":
      return Error("a link stands where a directory should be");
    case "WORKING_ROOT_NOT_CANONICAL":
      return Error("tree anchor root is not a canonical path");
    case "WORKING_FILE_NOT_SERVED":
      return Error(
        "this file is stored through a Windows storage feature (cloud sync, deduplication) and could not be reopened to read its real contents; it is skipped this round",
      );
    case "WORKING_FILE_OFFLINE":
      return Error(
        "this file is online-only (its data is not on this machine); it is not downloaded, so it is skipped this round",
      );
  }
}
//@ chunk-cr1mmxrf.js:2692-2736 placement
function win32AnchorErrorWithCode(code) {
  let error = win32AnchorError(code);
  error.code = code;
  return error;
}
//@ chunk-cr1mmxrf.js:2736-2899 placement
function assertPlainWin32Name(name, allowShortName = false) {
  if (
    name === "" ||
    name === "." ||
    name === ".." ||
    /[\\/:*?"<>|\x00-\x1f]/.test(name) ||
    TRAILING_DOT_SPACE_RE.test(name) ||
    isReservedDeviceName(name) ||
    isConDeviceName(name) ||
    (!allowShortName && hasDosShortNameSegment(name))
  )
    throw win32AnchorErrorWithCode("WORKING_NAME_NOT_PLAIN");
  return name;
}
//@ chunk-cr1mmxrf.js:2899-2931 placement
function filetimeToUnixNs(filetime) {
  return (filetime - FILETIME_EPOCH_OFFSET) * 100n;
}
//@ chunk-cr1mmxrf.js:2931-2985 placement
function unixMsToFiletime(unixMs) {
  return BigInt(Math.round(unixMs * 1e6)) * 10n + FILETIME_EPOCH_OFFSET;
}
//@ chunk-cr1mmxrf.js:2985-3745 placement
/**
 * 由 NT 文件信息构造 bigint 形式的 fs.Stats 对象：按重解析点/目录/普通文件设置模式与只读位，时间由纳秒换算。
 */
function buildWin32Stats(dev, identity, times, allocationSize) {
  let isLink =
    (identity.attributes & ATTRIBUTE.REPARSE_POINT) !== 0 && isReparseTagNameSurrogate(identity.reparseTag);
  let isDir = !isLink && (identity.attributes & ATTRIBUTE.DIRECTORY) !== 0;
  let typeBits = isLink ? 0o120000n : isDir ? 0o040000n : 0o100000n;
  let permBits = (identity.attributes & ATTRIBUTE.READONLY) !== 0 ? 0o444n : 0o666n;
  let toMs = (ns) => ns / 1000000n;
  let toDate = (ns) => new Date(Number(ns / 1000000n));
  return {
    dev,
    ino: identity.ino,
    mode: typeBits | permBits,
    nlink: identity.nlink,
    uid: 0n,
    gid: 0n,
    rdev: 0n,
    size: isDir ? 0n : identity.size,
    blksize: 4096n,
    blocks: allocationSize / 512n,
    atimeMs: toMs(times.atimeNs),
    mtimeMs: toMs(identity.mtimeNs),
    ctimeMs: toMs(identity.ctimeNs),
    birthtimeMs: toMs(times.birthtimeNs),
    atimeNs: times.atimeNs,
    mtimeNs: identity.mtimeNs,
    ctimeNs: identity.ctimeNs,
    birthtimeNs: times.birthtimeNs,
    atime: toDate(times.atimeNs),
    mtime: toDate(identity.mtimeNs),
    ctime: toDate(identity.ctimeNs),
    birthtime: toDate(times.birthtimeNs),
    isFile: () => !isLink && !isDir,
    isDirectory: () => isDir,
    isSymbolicLink: () => isLink,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  };
}
//@ chunk-cr1mmxrf.js:3745-4261 placement
/**
 * 把 bigint 形式的 stats 转为数字形式的 fs.Stats（时间换算为毫秒，设备类判断恒为 false）。
 */
function toNumberStats(stats) {
  let toNumber = (value) => Number(value);
  return {
    dev: toNumber(stats.dev),
    ino: toNumber(stats.ino),
    mode: toNumber(stats.mode),
    nlink: toNumber(stats.nlink),
    uid: 0,
    gid: 0,
    rdev: 0,
    size: toNumber(stats.size),
    blksize: toNumber(stats.blksize),
    blocks: toNumber(stats.blocks),
    atimeMs: toNumber(stats.atimeNs) / 1e6,
    mtimeMs: toNumber(stats.mtimeNs) / 1e6,
    ctimeMs: toNumber(stats.ctimeNs) / 1e6,
    birthtimeMs: toNumber(stats.birthtimeNs) / 1e6,
    atime: stats.atime,
    mtime: stats.mtime,
    ctime: stats.ctime,
    birthtime: stats.birthtime,
    isFile: () => stats.isFile(),
    isDirectory: () => stats.isDirectory(),
    isSymbolicLink: () => stats.isSymbolicLink(),
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  };
}
//@ chunk-cr1mmxrf.js:4261-4786 placement
/**
 * 查询 NT 句柄的文件信息（属性、重解析标签、文件 ID、卷序列号与时间），返回原始字段与按设备号来源生成 stats 的函数。
 */
function queryWin32FileInfo(nt, handle) {
  let info = nt.queryInformation(handle);
  let reparseTag =
    (info.attributes & ATTRIBUTE.REPARSE_POINT) !== 0 ? nt.queryAttributeTag(handle).reparseTag : 0;
  let idInfo = nt.queryId(handle);
  let volumeInfo = nt.queryVolume(handle);
  let identity = {
    dev32: BigInt(volumeInfo.serialNumber),
    dev64: idInfo?.volumeSerialNumber ?? null,
    ino: info.indexNumber,
    size: info.size,
    nlink: BigInt(info.numberOfLinks),
    mtimeNs: filetimeToUnixNs(info.lastWriteTime),
    ctimeNs: filetimeToUnixNs(info.changeTime),
    attributes: info.attributes,
    reparseTag,
  };
  let times = {
    atimeNs: filetimeToUnixNs(info.lastAccessTime),
    birthtimeNs: filetimeToUnixNs(info.creationTime),
  };
  return {
    ...identity,
    stats: (devMode) =>
      buildWin32Stats(
        devMode === "serial64" && identity.dev64 !== null ? identity.dev64 : identity.dev32,
        identity,
        times,
        info.allocationSize,
      ),
  };
}
//@ chunk-cr1mmxrf.js:4786-4861 placement
function isReparseNameSurrogate(directoryEntry) {
  return (
    (directoryEntry.attributes & ATTRIBUTE.REPARSE_POINT) !== 0 &&
    isReparseTagNameSurrogate(directoryEntry.reparseTag)
  );
}
//@ chunk-cr1mmxrf.js:4861-4986 placement
function queryAttributesAndTag(nt, handle) {
  let attributes = nt.queryAttributes(handle);
  return (attributes & ATTRIBUTE.REPARSE_POINT) !== 0
    ? nt.queryAttributeTag(handle)
    : {
        attributes,
        reparseTag: 0,
      };
}
//@ chunk-cr1mmxrf.js:4986-5277 placement
function matchIdentityBridge(fileInfo, pathStats) {
  let matchesSerial = (serial) =>
    serial !== null &&
    pathStats.ino !== 0n &&
    pathStats.dev === serial &&
    sameTimestamp(pathStats.ino, fileInfo.ino);
  let bridgeKind = matchesSerial(fileInfo.dev32)
    ? "serial32"
    : matchesSerial(fileInfo.dev64)
      ? "serial64"
      : null;
  logForDebugging(
    `anchor (win32): identity bridge ${bridgeKind ?? "none"} \u2014 bun dev=${pathStats.dev} ino=${pathStats.ino}; nt serial32=${fileInfo.dev32} serial64=${fileInfo.dev64 ?? "n/a"} index=${fileInfo.ino}`,
  );
  return bridgeKind;
}
//@ chunk-cr1mmxrf.js:5398-13177 placement
/**
 * Windows 下为根目录建立锚定文件句柄（网络共享等情况降级为不锚定）。
 */
async function openWin32Anchor(host, nt, options) {
  let { fs } = host;
  let { realRoot } = options;
  if (isUncPath(realRoot)) {
    logForDebugging("anchor (win32): the root is on a network share: no anchored backend here");
    return {
      unanchored: "remote_volume",
    };
  }
  let rootHandle = 0;
  let devMode;
  try {
    rootHandle = nt.open(0, toNtPath(realRoot), {
      access: DIR_LIST_ACCESS,
      disposition: DISPOSITION.FILE_OPEN,
      options: OPEN_DIR_OPTIONS,
    });
    if ((nt.queryDevice(rootHandle).characteristics & FILE_REMOTE_DEVICE) !== 0) {
      nt.close(rootHandle);
      logForDebugging("anchor (win32): the root is on a remote volume: no anchored backend here");
      return {
        unanchored: "remote_volume",
      };
    }
    let rootInfo = queryWin32FileInfo(nt, rootHandle);
    if (isReparseNameSurrogate(rootInfo)) throw win32AnchorErrorWithCode("ELOOP");
    if ((await resolvedRoot(host, options)) !== realRoot)
      throw win32AnchorErrorWithCode("WORKING_ROOT_NOT_CANONICAL");
    let matchedDevMode = matchIdentityBridge(
      rootInfo,
      await fs.lstat(realRoot, {
        bigint: true,
      }),
    );
    if (matchedDevMode === null) {
      nt.close(rootHandle);
      return {
        unanchored: "unstable_identity",
      };
    }
    devMode = matchedDevMode;
  } catch (error) {
    if (rootHandle !== 0) nt.close(rootHandle);
    let errnoCode = getErrnoCode(error);
    if (
      errnoCode === "ENOENT" ||
      errnoCode === "ENOTDIR" ||
      errnoCode === "ELOOP" ||
      errnoCode === "EPERM" ||
      errnoCode === "WORKING_ROOT_NOT_CANONICAL" ||
      errnoCode === "EBUSY" ||
      errnoCode === "EMFILE" ||
      errnoCode === "ENFILE" ||
      errnoCode === "ENOMEM" ||
      errnoCode === "EAGAIN" ||
      errnoCode === "ETIMEDOUT" ||
      errnoCode === "EIO"
    )
      throw error;
    logForDebugging(
      `anchor (win32): bring-up failed (${errnoCode ?? "no code"}, status 0x${(statusOf(error) ?? 0).toString(16)}): no anchored backend here`,
      {
        level: "warn",
      },
    );
    return {
      unanchored: "bring_up_failed",
    };
  }
  let openNamed = (dirHandle, name, access, options, allowShortName = false) =>
    nt.open(dirHandle, assertPlainWin32Name(name, allowShortName), {
      access,
      disposition: DISPOSITION.FILE_OPEN,
      options,
    });
  let withOpenHandle = async (dirHandle, name, access, options, fn) => {
    let handle = openNamed(dirHandle, name, access, options);
    try {
      return await fn(handle);
    } finally {
      nt.close(handle);
    }
  };
  let lstatIn = (dir, name) =>
    withOpenHandle(dir, name, READ_ATTR_ACCESS, OPEN_REPARSE_OPTIONS, (handle) =>
      queryWin32FileInfo(nt, handle).stats(devMode),
    );
  let openInChecked = async (dirHandle, name, flags) => {
    if ((flags & ~NOFOLLOW_NONBLOCK_FLAGS & WRITE_OPEN_FLAGS) !== 0)
      throw Error("anchored open never writes on this backend");
    let handle = openForAttrs(dirHandle, name, OPEN_REPARSE_OPTIONS, false);
    try {
      let attributesAndTag = queryAttributesAndTag(nt, handle);
      if (isReparseNameSurrogate(attributesAndTag)) throw win32AnchorErrorWithCode("ELOOP");
      if ((attributesAndTag.attributes & ATTRIBUTE.DIRECTORY) !== 0) throw win32AnchorErrorWithCode("EISDIR");
      if (hasOfflineAttributeFlags(attributesAndTag.attributes))
        throw win32AnchorErrorWithCode("WORKING_FILE_OFFLINE");
      if ((attributesAndTag.attributes & ATTRIBUTE.REPARSE_POINT) === 0) return wrapFileHandle(handle);
    } catch (error) {
      nt.close(handle);
      throw error;
    }
    return wrapFileHandle(reopenFilterServedFile(dirHandle, name, handle));
  };
  let openForAttrs = (dirHandle, name, options, dontReparse) => {
    let openWithAccess = (access) =>
      nt.open(dirHandle, assertPlainWin32Name(name), {
        access,
        disposition: DISPOSITION.FILE_OPEN,
        options,
        dontReparse,
      });
    try {
      return openWithAccess(FILE_GENERIC_READ | ACCESS.FILE_WRITE_ATTRIBUTES);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "EPERM" && errnoCode !== "EROFS") throw error;
      return openWithAccess(FILE_GENERIC_READ);
    }
  };
  let reopenFilterServedFile = (dirHandle, name, firstHandle) => {
    try {
      let secondHandle;
      try {
        secondHandle = openForAttrs(dirHandle, name, OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT, true);
      } catch (error) {
        if (FILE_NOT_SERVED_STATUSES.has(statusOf(error) ?? 0)) {
          logForDebugging(
            `anchor (win32): a filter-served file's second open met a link refusal (status 0x${(statusOf(error) ?? 0).toString(16)}); reported as a link`,
          );
          throw error;
        }
        logForDebugging(
          `anchor (win32): a filter-served file could not be reopened for its bytes (${getErrnoCode(error) ?? "no code"}, status 0x${(statusOf(error) ?? 0).toString(16)}); unreadable this round`,
        );
        throw win32AnchorErrorWithCode("WORKING_FILE_NOT_SERVED");
      }
      try {
        let secondInfo = nt.queryInformation(secondHandle);
        if (hasOfflineAttributeFlags(secondInfo.attributes))
          throw win32AnchorErrorWithCode("WORKING_FILE_OFFLINE");
        if (
          secondInfo.indexNumber !== nt.queryInformation(firstHandle).indexNumber ||
          nt.queryVolume(secondHandle).serialNumber !== nt.queryVolume(firstHandle).serialNumber
        ) {
          logForDebugging(
            "anchor (win32): a filter-served file reopened as another file; unreadable this round",
          );
          throw win32AnchorErrorWithCode("WORKING_FILE_NOT_SERVED");
        }
        return secondHandle;
      } catch (error) {
        nt.close(secondHandle);
        throw error;
      }
    } finally {
      nt.close(firstHandle);
    }
  };
  let wrapFileHandle = (rawHandle) => {
    let isClosed = false;
    let assertOpenHandle = () => {
      if (isClosed) throw win32AnchorErrorWithCode("EBADF");
      return rawHandle;
    };
    let queryStats = () => queryWin32FileInfo(nt, assertOpenHandle()).stats(devMode);
    async function stat(statOptions) {
      return statOptions?.bigint === true ? queryStats() : toNumberStats(queryStats());
    }
    let readAt = (buffer, position) => nt.read(assertOpenHandle(), buffer, BigInt(position));
    async function* readChunks() {
      for (let offset = 0; ;) {
        let chunkBuffer = Buffer.allocUnsafe(READ_CHUNK_BYTES);
        let bytesRead = readAt(chunkBuffer, offset);
        if (bytesRead === 0) return;
        offset += bytesRead;
        yield chunkBuffer.subarray(0, bytesRead);
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
    return {
      stat,
      read: async (buffer, offset, length, position) => {
        let bytesRead = readAt(
          buffer.subarray(offset, offset + Math.min(length, READ_CHUNK_BYTES)),
          position,
        );
        await new Promise((resolve) => setImmediate(resolve));
        return {
          bytesRead,
        };
      },
      readFile: async () => {
        let chunks = [];
        for await (let chunk of readChunks()) chunks.push(chunk);
        return Buffer.concat(chunks);
      },
      createReadStream: () => readChunks(),
      chmod: async (mode) => {
        let attributes = nt.queryAttributes(assertOpenHandle());
        let nextAttributes =
          (mode & 128) === 0 ? attributes | ATTRIBUTE.READONLY : attributes & ~ATTRIBUTE.READONLY;
        if (nextAttributes !== attributes)
          nt.setAttributes(assertOpenHandle(), nextAttributes === 0 ? ATTRIBUTE.NORMAL : nextAttributes);
      },
      utimes: async (atimeMs, mtimeMs) =>
        nt.setTimes(assertOpenHandle(), unixMsToFiletime(atimeMs), unixMsToFiletime(mtimeMs)),
      close: async () => {
        if (!isClosed) {
          isClosed = true;
          nt.close(rawHandle);
        }
      },
    };
  };
  let runWithBusyMapping = async (fn) => {
    try {
      await fn();
    } catch (error) {
      throw getErrnoCode(error) === "EBUSY"
        ? Object.assign(win32AnchorErrorWithCode("WORKING_FILE_HELD"), {
            cause: error,
          })
        : error;
    }
  };
  let runWithRetry = (fn) =>
    runWithBusyMapping(async () => {
      await retryTransient(fn);
    });
  let deleteAccessFlags = ACCESS.DELETE | ACCESS.FILE_WRITE_ATTRIBUTES | READ_ATTR_ACCESS;
  let createdStats = (handle) => {
    try {
      return queryWin32FileInfo(nt, handle).stats(devMode);
    } catch (error) {
      logWin32AnchorFailure(
        "a new file's stat could not be read through its handle, so the folder check goes on without it",
        error,
      );
      return null;
    }
  };
  let placeByHandle = (dirHandle, fromName, toDir, toName, replaceExisting, afterPlace) =>
    (replaceExisting ? runWithBusyMapping : runWithRetry)(() =>
      withOpenHandle(
        dirHandle,
        fromName,
        afterPlace === undefined ? ACCESS.DELETE | READ_ATTR_ACCESS : deleteAccessFlags,
        OPEN_REPARSE_OPTIONS,
        async (handle) => {
          nt.renameByHandle(handle, toDir, assertPlainWin32Name(toName), replaceExisting);
          try {
            if ((await afterPlace?.(createdStats(handle))) === true) nt.deleteByHandle(handle);
          } catch (error) {
            logWin32AnchorFailure(
              "a renamed file could not be removed through its handle after its folder failed the check, so it stays at its new name",
              error,
            );
          }
        },
      ),
    );
  let linkByHandleAt = (dir, fromName, toDir, toName) =>
    runWithRetry(() =>
      withOpenHandle(
        dir,
        fromName,
        ACCESS.FILE_WRITE_ATTRIBUTES | ACCESS.SYNCHRONIZE,
        OPEN_REPARSE_OPTIONS,
        (handle) => nt.linkByHandle(handle, toDir, assertPlainWin32Name(toName)),
      ),
    );
  let unlinkByHandleAt = (dir, name) =>
    runWithRetry(() =>
      withOpenHandle(dir, name, deleteAccessFlags, OPEN_REPARSE_OPTIONS, (handle) => {
        let attributesAndTag = queryAttributesAndTag(nt, handle);
        if (
          (attributesAndTag.attributes & ATTRIBUTE.DIRECTORY) !== 0 &&
          !isReparseNameSurrogate(attributesAndTag)
        )
          throw win32AnchorErrorWithCode("EISDIR");
        nt.deleteByHandle(handle);
      }),
    );
  let openDirNamed = (dirHandle, name, access, allowShortName = false) => {
    let handle = openNamed(dirHandle, name, access, OPEN_DIR_OPTIONS, allowShortName);
    try {
      if (isReparseNameSurrogate(queryAttributesAndTag(nt, handle)))
        throw win32AnchorErrorWithCode("ENOTDIR");
      return handle;
    } catch (error) {
      nt.close(handle);
      throw error;
    }
  };
  let ops = {
    openDir: async (dirHandle, name, allowShortName) =>
      openDirNamed(dirHandle, name, DIR_LIST_ACCESS, allowShortName),
    openDirToPass: async (dirHandle, name, allowShortName) =>
      openDirNamed(dirHandle, name, DIR_TRAVERSE_ACCESS, allowShortName),
    mkdir: async (dirHandle, name) => {
      nt.close(
        nt.open(dirHandle, assertPlainWin32Name(name), {
          access: READ_ATTR_ACCESS,
          disposition: DISPOSITION.FILE_CREATE,
          options: OPEN_DIR_OPTIONS,
          attributes: ATTRIBUTE.NORMAL,
        }),
      );
    },
    closeDir: async (dirHandle) => nt.close(dirHandle),
    create: async (dirHandle, name, dirs, data, mode, shouldSync, forcedMode, afterWrite) => {
      let handle = nt.open(dirHandle, assertPlainWin32Name(name), {
        access: FILE_GENERIC_WRITE | ACCESS.FILE_READ_ATTRIBUTES | ACCESS.DELETE,
        disposition: DISPOSITION.FILE_CREATE,
        options:
          OPTIONS.FILE_NON_DIRECTORY_FILE |
          OPTIONS.FILE_OPEN_REPARSE_POINT |
          OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT |
          (shouldSync ? OPTIONS.FILE_WRITE_THROUGH : 0),
        attributes: (mode & 128) === 0 ? ATTRIBUTE.READONLY : ATTRIBUTE.NORMAL,
      });
      try {
        for (let offset = 0; offset < data.length; offset += MAX_DIR_READ_BYTES) {
          nt.write(handle, data.subarray(offset, offset + MAX_DIR_READ_BYTES), BigInt(offset));
          if (offset + MAX_DIR_READ_BYTES < data.length)
            await new Promise((resolve) => setImmediate(resolve));
        }
        await afterWrite?.(createdStats(handle));
      } catch (error) {
        try {
          nt.deleteByHandle(handle);
        } catch {}
        nt.close(handle);
        throw error;
      }
      nt.close(handle);
    },
    createAndOpen: async (dirHandle, name, dirs, mode) => {
      let handle = nt.open(dirHandle, assertPlainWin32Name(name), {
        access: FILE_GENERIC_WRITE | ACCESS.FILE_READ_ATTRIBUTES,
        disposition: DISPOSITION.FILE_CREATE,
        options:
          OPTIONS.FILE_NON_DIRECTORY_FILE |
          OPTIONS.FILE_OPEN_REPARSE_POINT |
          OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT |
          OPTIONS.FILE_WRITE_THROUGH,
        attributes: (mode & 128) === 0 ? ATTRIBUTE.READONLY : ATTRIBUTE.NORMAL,
      });
      let isClosed = false;
      let assertOpenHandle = () => {
        if (isClosed) throw win32AnchorErrorWithCode("EBADF");
        return handle;
      };
      return {
        stat: async () => queryWin32FileInfo(nt, assertOpenHandle()).stats(devMode),
        writeFile: async (data) => {
          for (let offset = 0; offset < data.length; offset += MAX_DIR_READ_BYTES) {
            nt.write(assertOpenHandle(), data.subarray(offset, offset + MAX_DIR_READ_BYTES), BigInt(offset));
            await new Promise((resolve) => setImmediate(resolve));
          }
        },
        write: async (buffer, offset, length, position) => {
          if (
            ![offset, length, position].every((value) => Number.isSafeInteger(value) && value >= 0) ||
            offset + length > buffer.length
          )
            throw win32AnchorErrorWithCode("EINVAL");
          let chunk = buffer.subarray(offset, offset + Math.min(length, MAX_DIR_READ_BYTES));
          nt.write(assertOpenHandle(), chunk, BigInt(position));
          await new Promise((resolve) => setImmediate(resolve));
          return {
            bytesWritten: chunk.length,
          };
        },
        utimes: async (atimeMs, mtimeMs) =>
          nt.setTimes(assertOpenHandle(), unixMsToFiletime(atimeMs), unixMsToFiletime(mtimeMs)),
        sync: async () => {},
        close: async () => {
          if (!isClosed) {
            isClosed = true;
            nt.close(handle);
          }
        },
      };
    },
    link: linkByHandleAt,
    rename: (fromDir, fromName, toDir, toName) => placeByHandle(fromDir, fromName, toDir, toName, true),
    renameNoReplace: (fromDir, fromName, toDir, toName, location) =>
      placeByHandle(fromDir, fromName, toDir, toName, false, location),
    symlink: async (target, dirHandle, name) => {
      encodeSymlinkReparseData(target);
      let handle;
      try {
        handle = nt.open(dirHandle, assertPlainWin32Name(name), {
          access: FILE_GENERIC_WRITE | ACCESS.FILE_READ_ATTRIBUTES | ACCESS.DELETE,
          disposition: DISPOSITION.FILE_CREATE,
          options:
            OPTIONS.FILE_NON_DIRECTORY_FILE |
            OPTIONS.FILE_OPEN_REPARSE_POINT |
            OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT,
          attributes: ATTRIBUTE.NORMAL,
        });
      } catch (error) {
        throw getErrnoCode(error) === "EISDIR" ? win32AnchorErrorWithCode("EEXIST") : error;
      }
      try {
        nt.setSymlink(handle, target);
      } catch (error) {
        try {
          nt.deleteByHandle(handle);
        } catch {}
        nt.close(handle);
        throw error;
      }
      nt.close(handle);
    },
    readlink: (dirHandle, name) =>
      withOpenHandle(dirHandle, name, READ_ATTR_ACCESS, OPEN_REPARSE_OPTIONS, (handle) =>
        nt.readSymlink(handle),
      ),
    unlink: unlinkByHandleAt,
    rmdir: (dirHandle, name) =>
      withOpenHandle(dirHandle, name, deleteAccessFlags, OPEN_DIR_OPTIONS, (handle) => {
        if (isReparseNameSurrogate(queryAttributesAndTag(nt, handle)))
          throw win32AnchorErrorWithCode("ENOTDIR");
        nt.deleteByHandle(handle);
      }),
    list: async (dirHandle, maxNames) => nt.listDirectory(dirHandle, maxNames),
    lstat: lstatIn,
    open: (dirHandle, name, dirs, flags) => openInChecked(dirHandle, name, flags),
    hold: async (rootPath) => {
      let realPath = await fs.realpath(rootPath).catch(() => null);
      let path = realPath !== null && /^[a-zA-Z]:$/.test(realPath) ? `${realPath}\\` : realPath;
      if (path === null || isUncPath(path)) return null;
      let handle;
      try {
        handle = nt.open(0, toNtPath(path), {
          access: DIR_LIST_ACCESS,
          disposition: DISPOSITION.FILE_OPEN,
          options: OPEN_DIR_OPTIONS,
        });
      } catch {
        return null;
      }
      try {
        if ((nt.queryDevice(handle).characteristics & FILE_REMOTE_DEVICE) !== 0) {
          nt.close(handle);
          return null;
        }
        let [info, pathStats] = await Promise.all([
          queryWin32FileInfo(nt, handle),
          fs.lstat(path, {
            bigint: true,
          }),
        ]);
        let handleStats = info.stats(devMode);
        if (
          isReparseNameSurrogate(info) ||
          !handleStats.isDirectory() ||
          !pathStats.isDirectory() ||
          handleStats.ino === 0n ||
          handleStats.dev !== pathStats.dev ||
          !sameTimestamp(handleStats.ino, pathStats.ino)
        ) {
          nt.close(handle);
          return null;
        }
      } catch {
        nt.close(handle);
        return null;
      }
      return ops.holdOpenedDir(handle, path);
    },
    getHeldDir: (rootDirHandle) => rootDirHandle.dir,
    holdOpenedDir: (handle, realPath) => {
      let isClosed = false;
      return {
        realPath,
        dir: handle,
        stat: async () => queryWin32FileInfo(nt, handle).stats(devMode),
        close: async () => {
          if (!isClosed) {
            isClosed = true;
            nt.close(handle);
          }
        },
      };
    },
    renameOut: (fromDir, fromName, toHeldDir, toName) =>
      placeByHandle(fromDir, fromName, toHeldDir.dir, toName, true),
    renameIn: (fromHeldDir, fromName, toDir, toName) =>
      placeByHandle(fromHeldDir.dir, fromName, toDir, toName, true),
    linkIn: (fromHeldDir, fromName, toDir, toName) =>
      linkByHandleAt(fromHeldDir.dir, fromName, toDir, toName),
    renameInNoReplace: (fromHeldDir, fromName, toDir, toName, location) =>
      placeByHandle(fromHeldDir.dir, fromName, toDir, toName, false, location),
    statIn: (heldDir, name) => lstatIn(heldDir.dir, name),
    openIn: (heldDir, name, flags) => openInChecked(heldDir.dir, name, flags),
    unlinkIn: (heldDir, name) => unlinkByHandleAt(heldDir.dir, name),
  };
  let isClosed = false;
  let root = {
    stat: async () => {
      if (isClosed) throw win32AnchorErrorWithCode("EBADF");
      return queryWin32FileInfo(nt, rootHandle).stats(devMode);
    },
    close: async () => {
      if (!isClosed) {
        isClosed = true;
        nt.close(rootHandle);
      }
    },
  };
  logForDebugging("anchor (win32): held-handle backend up");
  return {
    root,
    held: rootHandle,
    ops,
  };
}
//@ chunk-cr1mmxrf.js:13177-13309 placement
function logWin32AnchorFailure(message, error) {
  let status = statusOf(error);
  if (status === undefined) {
    logError(error);
    return;
  }
  logForDebugging(
    `anchor (win32): ${message} (${getErrnoCode(error) ?? "no code"}, status 0x${status.toString(16)})`,
  );
}
export { openWin32Anchor };
