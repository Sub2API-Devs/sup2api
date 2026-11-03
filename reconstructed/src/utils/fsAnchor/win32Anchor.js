/**
 * utils/fsAnchor/win32Anchor.ts
 *
 * 2.1.316 新增：Windows 文件系统锚点
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tb11za84.js (16)
 * attribution: placement 16
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

//@ chunk-tb11za84.js:919-1263 placement
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
//@ chunk-tb11za84.js:1263-1332 placement
function hasOfflineAttributeFlags(attributes) {
  return (
    (attributes & MAX_READ_CHUNK) !== 0 ||
    ((attributes & MAX_REPARSE_BUFFER) !== 0 && (attributes & ATTRIBUTE.REPARSE_POINT) !== 0)
  );
}
//@ chunk-tb11za84.js:1332-1515 placement
var TRAILING_DOT_SPACE_RE = /[. ]+$/;
var READ_ATTR_ACCESS = ACCESS.FILE_READ_ATTRIBUTES | ACCESS.SYNCHRONIZE;
var MAX_DIR_READ_BYTES = 1048576;
var READ_CHUNK_BYTES = 262144;
var WRITE_OPEN_FLAGS = constants.O_WRONLY | constants.O_RDWR | constants.O_APPEND | constants.O_TRUNC;
var NOFOLLOW_NONBLOCK_FLAGS = (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
var FILETIME_EPOCH_OFFSET = 116444736000000000n;
//@ chunk-tb11za84.js:1515-2575 placement
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
//@ chunk-tb11za84.js:2575-2619 placement
function win32AnchorErrorWithCode(code) {
  let e = win32AnchorError(code);
  e.code = code;
  return e;
}
//@ chunk-tb11za84.js:2619-2782 placement
function assertPlainWin32Name(i, e = false) {
  if (
    i === "" ||
    i === "." ||
    i === ".." ||
    /[\\/:*?"<>|\x00-\x1f]/.test(i) ||
    TRAILING_DOT_SPACE_RE.test(i) ||
    isReservedDeviceName(i) ||
    isConDeviceName(i) ||
    (!e && hasDosShortNameSegment(i))
  )
    throw win32AnchorErrorWithCode("WORKING_NAME_NOT_PLAIN");
  return i;
}
//@ chunk-tb11za84.js:2782-2814 placement
function filetimeToUnixNs(i) {
  return (i - FILETIME_EPOCH_OFFSET) * 100n;
}
//@ chunk-tb11za84.js:2814-2868 placement
function unixMsToFiletime(i) {
  return BigInt(Math.round(i * 1e6)) * 10n + FILETIME_EPOCH_OFFSET;
}
//@ chunk-tb11za84.js:2868-3628 placement
/**
 * 由 NT 文件信息构造 bigint 形式的 fs.Stats 对象：按重解析点/目录/普通文件设置模式与只读位，时间由纳秒换算。
 */
function buildWin32Stats(dev, identity, times, allocationSize) {
  let isLink =
    (identity.attributes & ATTRIBUTE.REPARSE_POINT) !== 0 && isReparseTagNameSurrogate(identity.reparseTag);
  let isDir = !isLink && (identity.attributes & ATTRIBUTE.DIRECTORY) !== 0;
  let typeBits = isLink ? 0o120000n : isDir ? 0o040000n : 0o100000n;
  let permBits = (identity.attributes & ATTRIBUTE.READONLY) !== 0 ? 0o444n : 0o666n;
  let h = (y) => y / 1000000n;
  let L = (y) => new Date(Number(y / 1000000n));
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
    atimeMs: h(times.atimeNs),
    mtimeMs: h(identity.mtimeNs),
    ctimeMs: h(identity.ctimeNs),
    birthtimeMs: h(times.birthtimeNs),
    atimeNs: times.atimeNs,
    mtimeNs: identity.mtimeNs,
    ctimeNs: identity.ctimeNs,
    birthtimeNs: times.birthtimeNs,
    atime: L(times.atimeNs),
    mtime: L(identity.mtimeNs),
    ctime: L(identity.ctimeNs),
    birthtime: L(times.birthtimeNs),
    isFile: () => !isLink && !isDir,
    isDirectory: () => isDir,
    isSymbolicLink: () => isLink,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  };
}
//@ chunk-tb11za84.js:3628-4144 placement
/**
 * 把 bigint 形式的 stats 转为数字形式的 fs.Stats（时间换算为毫秒，设备类判断恒为 false）。
 */
function toNumberStats(stats) {
  let toNumber = (E) => Number(E);
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
//@ chunk-tb11za84.js:4144-4669 placement
/**
 * 查询 NT 句柄的文件信息（属性、重解析标签、文件 ID、卷序列号与时间），返回原始字段与按设备号来源生成 stats 的函数。
 */
function queryWin32FileInfo(nt, handle) {
  let E = nt.queryInformation(handle);
  let reparseTag =
    (E.attributes & ATTRIBUTE.REPARSE_POINT) !== 0 ? nt.queryAttributeTag(handle).reparseTag : 0;
  let R = nt.queryId(handle);
  let O = nt.queryVolume(handle);
  let identity = {
    dev32: BigInt(O.serialNumber),
    dev64: R?.volumeSerialNumber ?? null,
    ino: E.indexNumber,
    size: E.size,
    nlink: BigInt(E.numberOfLinks),
    mtimeNs: filetimeToUnixNs(E.lastWriteTime),
    ctimeNs: filetimeToUnixNs(E.changeTime),
    attributes: E.attributes,
    reparseTag,
  };
  let times = {
    atimeNs: filetimeToUnixNs(E.lastAccessTime),
    birthtimeNs: filetimeToUnixNs(E.creationTime),
  };
  return {
    ...identity,
    stats: (h) =>
      buildWin32Stats(
        h === "serial64" && identity.dev64 !== null ? identity.dev64 : identity.dev32,
        identity,
        times,
        E.allocationSize,
      ),
  };
}
//@ chunk-tb11za84.js:4669-4744 placement
function isReparseNameSurrogate(attributesAndTag) {
  return (
    (attributesAndTag.attributes & ATTRIBUTE.REPARSE_POINT) !== 0 &&
    isReparseTagNameSurrogate(attributesAndTag.reparseTag)
  );
}
//@ chunk-tb11za84.js:4744-4869 placement
function queryAttributesAndTag(i, e) {
  let E = i.queryAttributes(e);
  return (E & ATTRIBUTE.REPARSE_POINT) !== 0
    ? i.queryAttributeTag(e)
    : {
        attributes: E,
        reparseTag: 0,
      };
}
//@ chunk-tb11za84.js:4869-5160 placement
function matchIdentityBridge(i, e) {
  let E = (R) => R !== null && e.ino !== 0n && e.dev === R && sameTimestamp(e.ino, i.ino);
  let T = E(i.dev32) ? "serial32" : E(i.dev64) ? "serial64" : null;
  logForDebugging(
    `anchor (win32): identity bridge ${T ?? "none"} \u2014 bun dev=${e.dev} ino=${e.ino}; nt serial32=${i.dev32} serial64=${i.dev64 ?? "n/a"} index=${i.ino}`,
  );
  return T;
}
//@ chunk-tb11za84.js:5281-13060 placement
/**
 * Windows 下为根目录建立锚定文件句柄（网络共享等情况降级为不锚定）。
 */
async function openWin32Anchor(i, e, E) {
  let { fs } = i;
  let { realRoot } = E;
  if (isUncPath(realRoot)) {
    logForDebugging("anchor (win32): the root is on a network share: no anchored backend here");
    return {
      unanchored: "remote_volume",
    };
  }
  let O = 0;
  let _;
  try {
    O = e.open(0, toNtPath(realRoot), {
      access: DIR_LIST_ACCESS,
      disposition: DISPOSITION.FILE_OPEN,
      options: OPEN_DIR_OPTIONS,
    });
    if ((e.queryDevice(O).characteristics & FILE_REMOTE_DEVICE) !== 0) {
      e.close(O);
      logForDebugging("anchor (win32): the root is on a remote volume: no anchored backend here");
      return {
        unanchored: "remote_volume",
      };
    }
    let n = queryWin32FileInfo(e, O);
    if (isReparseNameSurrogate(n)) throw win32AnchorErrorWithCode("ELOOP");
    if ((await resolvedRoot(i, E)) !== realRoot) throw win32AnchorErrorWithCode("WORKING_ROOT_NOT_CANONICAL");
    let r = matchIdentityBridge(
      n,
      await fs.lstat(realRoot, {
        bigint: true,
      }),
    );
    if (r === null) {
      e.close(O);
      return {
        unanchored: "unstable_identity",
      };
    }
    _ = r;
  } catch (error) {
    if (O !== 0) e.close(O);
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
  let b = (n, r, access, options, a = false) =>
    e.open(n, assertPlainWin32Name(r, a), {
      access,
      disposition: DISPOSITION.FILE_OPEN,
      options,
    });
  let h = async (n, r, access, options, a) => {
    let u = b(n, r, access, options);
    try {
      return await a(u);
    } finally {
      e.close(u);
    }
  };
  let L = (dir, r) =>
    h(dir, r, READ_ATTR_ACCESS, OPEN_REPARSE_OPTIONS, (s) => queryWin32FileInfo(e, s).stats(_));
  let y = async (n, r, s) => {
    if ((s & ~NOFOLLOW_NONBLOCK_FLAGS & WRITE_OPEN_FLAGS) !== 0)
      throw Error("anchored open never writes on this backend");
    let o = K(n, r, OPEN_REPARSE_OPTIONS, false);
    try {
      let attributesAndTag = queryAttributesAndTag(e, o);
      if (isReparseNameSurrogate(attributesAndTag)) throw win32AnchorErrorWithCode("ELOOP");
      if ((attributesAndTag.attributes & ATTRIBUTE.DIRECTORY) !== 0) throw win32AnchorErrorWithCode("EISDIR");
      if (hasOfflineAttributeFlags(attributesAndTag.attributes))
        throw win32AnchorErrorWithCode("WORKING_FILE_OFFLINE");
      if ((attributesAndTag.attributes & ATTRIBUTE.REPARSE_POINT) === 0) return V(o);
    } catch (error) {
      e.close(o);
      throw error;
    }
    return V(ie(n, r, o));
  };
  let K = (n, r, options, dontReparse) => {
    let a = (access) =>
      e.open(n, assertPlainWin32Name(r), {
        access,
        disposition: DISPOSITION.FILE_OPEN,
        options,
        dontReparse,
      });
    try {
      return a(FILE_GENERIC_READ | ACCESS.FILE_WRITE_ATTRIBUTES);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "EPERM" && errnoCode !== "EROFS") throw error;
      return a(FILE_GENERIC_READ);
    }
  };
  let ie = (n, r, s) => {
    try {
      let o;
      try {
        o = K(n, r, OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT, true);
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
        let a = e.queryInformation(o);
        if (hasOfflineAttributeFlags(a.attributes)) throw win32AnchorErrorWithCode("WORKING_FILE_OFFLINE");
        if (
          a.indexNumber !== e.queryInformation(s).indexNumber ||
          e.queryVolume(o).serialNumber !== e.queryVolume(s).serialNumber
        ) {
          logForDebugging(
            "anchor (win32): a filter-served file reopened as another file; unreadable this round",
          );
          throw win32AnchorErrorWithCode("WORKING_FILE_NOT_SERVED");
        }
        return o;
      } catch (error) {
        e.close(o);
        throw error;
      }
    } finally {
      e.close(s);
    }
  };
  let V = (n) => {
    let r = false;
    let s = () => {
      if (r) throw win32AnchorErrorWithCode("EBADF");
      return n;
    };
    let o = () => queryWin32FileInfo(e, s()).stats(_);
    async function a(d) {
      return d?.bigint === true ? o() : toNumberStats(o());
    }
    let u = (d, c) => e.read(s(), d, BigInt(c));
    async function* I() {
      for (let d = 0; ;) {
        let c = Buffer.allocUnsafe(READ_CHUNK_BYTES);
        let N = u(c, d);
        if (N === 0) return;
        d += N;
        yield c.subarray(0, N);
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
    return {
      stat: a,
      read: async (d, c, N, f) => {
        let bytesRead = u(d.subarray(c, c + Math.min(N, READ_CHUNK_BYTES)), f);
        await new Promise((resolve) => setImmediate(resolve));
        return {
          bytesRead,
        };
      },
      readFile: async () => {
        let d = [];
        for await (let c of I()) d.push(c);
        return Buffer.concat(d);
      },
      createReadStream: () => I(),
      chmod: async (d) => {
        let c = e.queryAttributes(s());
        let N = (d & 128) === 0 ? c | ATTRIBUTE.READONLY : c & ~ATTRIBUTE.READONLY;
        if (N !== c) e.setAttributes(s(), N === 0 ? ATTRIBUTE.NORMAL : N);
      },
      utimes: async (d, c) => e.setTimes(s(), unixMsToFiletime(d), unixMsToFiletime(c)),
      close: async () => {
        if (!r) {
          r = true;
          e.close(n);
        }
      },
    };
  };
  let q = async (n) => {
    try {
      await n();
    } catch (error) {
      throw getErrnoCode(error) === "EBUSY"
        ? Object.assign(win32AnchorErrorWithCode("WORKING_FILE_HELD"), {
            cause: error,
          })
        : error;
    }
  };
  let G = (n) =>
    q(async () => {
      await retryTransient(n);
    });
  let Y = ACCESS.DELETE | ACCESS.FILE_WRITE_ATTRIBUTES | READ_ATTR_ACCESS;
  let z = (n) => {
    try {
      return queryWin32FileInfo(e, n).stats(_);
    } catch (error) {
      logWin32AnchorFailure(
        "a new file's stat could not be read through its handle, so the folder check goes on without it",
        error,
      );
      return null;
    }
  };
  let P = (n, r, s, o, a, u) =>
    (a ? q : G)(() =>
      h(n, r, u === undefined ? ACCESS.DELETE | READ_ATTR_ACCESS : Y, OPEN_REPARSE_OPTIONS, async (I) => {
        e.renameByHandle(I, s, assertPlainWin32Name(o), a);
        try {
          if ((await u?.(z(I))) === true) e.deleteByHandle(I);
        } catch (error) {
          logWin32AnchorFailure(
            "a renamed file could not be removed through its handle after its folder failed the check, so it stays at its new name",
            error,
          );
        }
      }),
    );
  let Z = (dir, r, s, o) =>
    G(() =>
      h(dir, r, ACCESS.FILE_WRITE_ATTRIBUTES | ACCESS.SYNCHRONIZE, OPEN_REPARSE_OPTIONS, (a) =>
        e.linkByHandle(a, s, assertPlainWin32Name(o)),
      ),
    );
  let X = (dir, r) =>
    G(() =>
      h(dir, r, Y, OPEN_REPARSE_OPTIONS, (s) => {
        let attributesAndTag = queryAttributesAndTag(e, s);
        if (
          (attributesAndTag.attributes & ATTRIBUTE.DIRECTORY) !== 0 &&
          !isReparseNameSurrogate(attributesAndTag)
        )
          throw win32AnchorErrorWithCode("EISDIR");
        e.deleteByHandle(s);
      }),
    );
  let j = (n, r, access, o = false) => {
    let a = b(n, r, access, OPEN_DIR_OPTIONS, o);
    try {
      if (isReparseNameSurrogate(queryAttributesAndTag(e, a))) throw win32AnchorErrorWithCode("ENOTDIR");
      return a;
    } catch (error) {
      e.close(a);
      throw error;
    }
  };
  let J = {
    openDir: async (n, r, s) => j(n, r, DIR_LIST_ACCESS, s),
    openDirToPass: async (n, r, s) => j(n, r, DIR_TRAVERSE_ACCESS, s),
    mkdir: async (n, r) => {
      e.close(
        e.open(n, assertPlainWin32Name(r), {
          access: READ_ATTR_ACCESS,
          disposition: DISPOSITION.FILE_CREATE,
          options: OPEN_DIR_OPTIONS,
          attributes: ATTRIBUTE.NORMAL,
        }),
      );
    },
    closeDir: async (n) => e.close(n),
    create: async (n, r, s, o, a, u, I, d) => {
      let c = e.open(n, assertPlainWin32Name(r), {
        access: FILE_GENERIC_WRITE | ACCESS.FILE_READ_ATTRIBUTES | ACCESS.DELETE,
        disposition: DISPOSITION.FILE_CREATE,
        options:
          OPTIONS.FILE_NON_DIRECTORY_FILE |
          OPTIONS.FILE_OPEN_REPARSE_POINT |
          OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT |
          (u ? OPTIONS.FILE_WRITE_THROUGH : 0),
        attributes: (a & 128) === 0 ? ATTRIBUTE.READONLY : ATTRIBUTE.NORMAL,
      });
      try {
        for (let N = 0; N < o.length; N += MAX_DIR_READ_BYTES) {
          e.write(c, o.subarray(N, N + MAX_DIR_READ_BYTES), BigInt(N));
          if (N + MAX_DIR_READ_BYTES < o.length) await new Promise((resolve) => setImmediate(resolve));
        }
        await d?.(z(c));
      } catch (error) {
        try {
          e.deleteByHandle(c);
        } catch {}
        e.close(c);
        throw error;
      }
      e.close(c);
    },
    createAndOpen: async (n, r, s, o) => {
      let a = e.open(n, assertPlainWin32Name(r), {
        access: FILE_GENERIC_WRITE | ACCESS.FILE_READ_ATTRIBUTES,
        disposition: DISPOSITION.FILE_CREATE,
        options:
          OPTIONS.FILE_NON_DIRECTORY_FILE |
          OPTIONS.FILE_OPEN_REPARSE_POINT |
          OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT |
          OPTIONS.FILE_WRITE_THROUGH,
        attributes: (o & 128) === 0 ? ATTRIBUTE.READONLY : ATTRIBUTE.NORMAL,
      });
      let u = false;
      let I = () => {
        if (u) throw win32AnchorErrorWithCode("EBADF");
        return a;
      };
      return {
        stat: async () => queryWin32FileInfo(e, I()).stats(_),
        writeFile: async (d) => {
          for (let c = 0; c < d.length; c += MAX_DIR_READ_BYTES) {
            e.write(I(), d.subarray(c, c + MAX_DIR_READ_BYTES), BigInt(c));
            await new Promise((resolve) => setImmediate(resolve));
          }
        },
        write: async (d, c, N, f) => {
          if (![c, N, f].every((p) => Number.isSafeInteger(p) && p >= 0) || c + N > d.length)
            throw win32AnchorErrorWithCode("EINVAL");
          let chunk = d.subarray(c, c + Math.min(N, MAX_DIR_READ_BYTES));
          e.write(I(), chunk, BigInt(f));
          await new Promise((resolve) => setImmediate(resolve));
          return {
            bytesWritten: chunk.length,
          };
        },
        utimes: async (d, c) => e.setTimes(I(), unixMsToFiletime(d), unixMsToFiletime(c)),
        sync: async () => {},
        close: async () => {
          if (!u) {
            u = true;
            e.close(a);
          }
        },
      };
    },
    link: Z,
    rename: (n, r, s, o) => P(n, r, s, o, true),
    renameNoReplace: (n, r, s, o, a) => P(n, r, s, o, false, a),
    symlink: async (n, r, s) => {
      encodeSymlinkReparseData(n);
      let o;
      try {
        o = e.open(r, assertPlainWin32Name(s), {
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
        e.setSymlink(o, n);
      } catch (error) {
        try {
          e.deleteByHandle(o);
        } catch {}
        e.close(o);
        throw error;
      }
      e.close(o);
    },
    readlink: (n, r) => h(n, r, READ_ATTR_ACCESS, OPEN_REPARSE_OPTIONS, (s) => e.readSymlink(s)),
    unlink: X,
    rmdir: (n, r) =>
      h(n, r, Y, OPEN_DIR_OPTIONS, (s) => {
        if (isReparseNameSurrogate(queryAttributesAndTag(e, s))) throw win32AnchorErrorWithCode("ENOTDIR");
        e.deleteByHandle(s);
      }),
    list: async (n, r) => e.listDirectory(n, r),
    lstat: L,
    open: (n, r, s, o) => y(n, r, o),
    hold: async (n) => {
      let r = await fs.realpath(n).catch(() => null);
      let path = r !== null && /^[a-zA-Z]:$/.test(r) ? `${r}\\` : r;
      if (path === null || isUncPath(path)) return null;
      let o;
      try {
        o = e.open(0, toNtPath(path), {
          access: DIR_LIST_ACCESS,
          disposition: DISPOSITION.FILE_OPEN,
          options: OPEN_DIR_OPTIONS,
        });
      } catch {
        return null;
      }
      try {
        if ((e.queryDevice(o).characteristics & FILE_REMOTE_DEVICE) !== 0) {
          e.close(o);
          return null;
        }
        let [a, u] = await Promise.all([
          queryWin32FileInfo(e, o),
          fs.lstat(path, {
            bigint: true,
          }),
        ]);
        let I = a.stats(_);
        if (
          isReparseNameSurrogate(a) ||
          !I.isDirectory() ||
          !u.isDirectory() ||
          I.ino === 0n ||
          I.dev !== u.dev ||
          !sameTimestamp(I.ino, u.ino)
        ) {
          e.close(o);
          return null;
        }
      } catch {
        e.close(o);
        return null;
      }
      return J.holdOpenedDir(o, path);
    },
    getHeldDir: (n) => n.dir,
    holdOpenedDir: (n, realPath) => {
      let s = false;
      return {
        realPath,
        dir: n,
        stat: async () => queryWin32FileInfo(e, n).stats(_),
        close: async () => {
          if (!s) {
            s = true;
            e.close(n);
          }
        },
      };
    },
    renameOut: (n, r, s, o) => P(n, r, s.dir, o, true),
    renameIn: (n, r, s, o) => P(n.dir, r, s, o, true),
    linkIn: (n, r, s, o) => Z(n.dir, r, s, o),
    renameInNoReplace: (n, r, s, o, a) => P(n.dir, r, s, o, false, a),
    statIn: (n, r) => L(n.dir, r),
    openIn: (n, r, s) => y(n.dir, r, s),
    unlinkIn: (n, r) => X(n.dir, r),
  };
  let M = false;
  let root = {
    stat: async () => {
      if (M) throw win32AnchorErrorWithCode("EBADF");
      return queryWin32FileInfo(e, O).stats(_);
    },
    close: async () => {
      if (!M) {
        M = true;
        e.close(O);
      }
    },
  };
  logForDebugging("anchor (win32): held-handle backend up");
  return {
    root,
    held: O,
    ops: J,
  };
}
//@ chunk-tb11za84.js:13060-13192 placement
function logWin32AnchorFailure(i, error) {
  let E = statusOf(error);
  if (E === undefined) {
    logError(error);
    return;
  }
  logForDebugging(`anchor (win32): ${i} (${getErrnoCode(error) ?? "no code"}, status 0x${E.toString(16)})`);
}
