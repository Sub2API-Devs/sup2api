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
import { f6o, pSn, fSn } from "../windowsPathNames.js";
import { logForDebugging } from "../debug.js";
import { isUncPath } from "../permissions/filesystem.js";
import { resolvedRoot } from "./deviceTreeHost.js";
import { getErrnoCode } from "../errors.js";
import { retryTransient } from "../atomicPublishWrite.js";
import { logError } from "../log.js";

/**
 * Windows 锚定后端的访问掩码与打开选项常量、缓冲大小上限，以及表示文件不可用的 NTSTATUS 集合。
 */
//@ chunk-tb11za84.js:919-1263 placement
var DIR_LIST_ACCESS =
    ACCESS.FILE_LIST_DIRECTORY | ACCESS.FILE_TRAVERSE | ACCESS.FILE_READ_ATTRIBUTES | ACCESS.SYNCHRONIZE,
  DIR_TRAVERSE_ACCESS = ACCESS.FILE_TRAVERSE | ACCESS.FILE_READ_ATTRIBUTES | ACCESS.SYNCHRONIZE,
  OPEN_DIR_OPTIONS =
    OPTIONS.FILE_DIRECTORY_FILE | OPTIONS.FILE_OPEN_REPARSE_POINT | OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT,
  OPEN_REPARSE_OPTIONS = OPTIONS.FILE_OPEN_REPARSE_POINT | OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT,
  MAX_REPARSE_BUFFER = 4096,
  MAX_READ_CHUNK = 4194304,
  FILE_NOT_SERVED_STATUSES = new Set([2147483693, 3221226763]);
//@ chunk-tb11za84.js:1263-1332 placement
function Q(i) {
  return (
    (i & MAX_READ_CHUNK) !== 0 || ((i & MAX_REPARSE_BUFFER) !== 0 && (i & ATTRIBUTE.REPARSE_POINT) !== 0)
  );
}
//@ chunk-tb11za84.js:1332-1515 placement
var TRAILING_DOT_SPACE_RE = /[. ]+$/,
  READ_ATTR_ACCESS = ACCESS.FILE_READ_ATTRIBUTES | ACCESS.SYNCHRONIZE,
  MAX_DIR_READ_BYTES = 1048576,
  READ_CHUNK_BYTES = 262144,
  WRITE_OPEN_FLAGS = constants.O_WRONLY | constants.O_RDWR | constants.O_APPEND | constants.O_TRUNC,
  NOFOLLOW_NONBLOCK_FLAGS = (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
  FILETIME_EPOCH_OFFSET = 116444736000000000n;
/**
 * 把锚定后端的错误码转为说明性的 Error（文件已关闭、名字被占用、参数非法、非普通名字、被其他程序占用、链接/目录占位、根非规范路径、云同步/去重文件、仅在线文件等）。
 */
//@ chunk-tb11za84.js:1515-2575 placement
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
function m(i) {
  let e = win32AnchorError(i);
  return ((e.code = i), e);
}
//@ chunk-tb11za84.js:2619-2782 placement
function assertPlainWin32Name(i, e = !1) {
  if (
    i === "" ||
    i === "." ||
    i === ".." ||
    /[\\/:*?"<>|\x00-\x1f]/.test(i) ||
    TRAILING_DOT_SPACE_RE.test(i) ||
    isReservedDeviceName(i) ||
    f6o(i) ||
    (!e && pSn(i))
  )
    throw m("WORKING_NAME_NOT_PLAIN");
  return i;
}
//@ chunk-tb11za84.js:2782-2814 placement
function B(i) {
  return (i - FILETIME_EPOCH_OFFSET) * 100n;
}
//@ chunk-tb11za84.js:2814-2868 placement
function W(i) {
  return BigInt(Math.round(i * 1e6)) * 10n + FILETIME_EPOCH_OFFSET;
}
/**
 * 由 NT 文件信息构造 bigint 形式的 fs.Stats 对象：按重解析点/目录/普通文件设置模式与只读位，时间由纳秒换算。
 */
//@ chunk-tb11za84.js:2868-3628 placement
function buildWin32Stats(i, e, E, T) {
  let isLink = (e.attributes & ATTRIBUTE.REPARSE_POINT) !== 0 && isReparseTagNameSurrogate(e.reparseTag),
    isDir = !isLink && (e.attributes & ATTRIBUTE.DIRECTORY) !== 0,
    typeBits = isLink ? 0o120000n : isDir ? 0o040000n : 0o100000n,
    permBits = (e.attributes & ATTRIBUTE.READONLY) !== 0 ? 0o444n : 0o666n,
    h = (y) => y / 1000000n,
    L = (y) => new Date(Number(y / 1000000n));
  return {
    dev: i,
    ino: e.ino,
    mode: typeBits | permBits,
    nlink: e.nlink,
    uid: 0n,
    gid: 0n,
    rdev: 0n,
    size: isDir ? 0n : e.size,
    blksize: 4096n,
    blocks: T / 512n,
    atimeMs: h(E.atimeNs),
    mtimeMs: h(e.mtimeNs),
    ctimeMs: h(e.ctimeNs),
    birthtimeMs: h(E.birthtimeNs),
    atimeNs: E.atimeNs,
    mtimeNs: e.mtimeNs,
    ctimeNs: e.ctimeNs,
    birthtimeNs: E.birthtimeNs,
    atime: L(E.atimeNs),
    mtime: L(e.mtimeNs),
    ctime: L(e.ctimeNs),
    birthtime: L(E.birthtimeNs),
    isFile: () => !isLink && !isDir,
    isDirectory: () => isDir,
    isSymbolicLink: () => isLink,
    isBlockDevice: () => !1,
    isCharacterDevice: () => !1,
    isFIFO: () => !1,
    isSocket: () => !1,
  };
}
/**
 * 把 bigint 形式的 stats 转为数字形式的 fs.Stats（时间换算为毫秒，设备类判断恒为 false）。
 */
//@ chunk-tb11za84.js:3628-4144 placement
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
    isBlockDevice: () => !1,
    isCharacterDevice: () => !1,
    isFIFO: () => !1,
    isSocket: () => !1,
  };
}
/**
 * 查询 NT 句柄的文件信息（属性、重解析标签、文件 ID、卷序列号与时间），返回原始字段与按设备号来源生成 stats 的函数。
 */
//@ chunk-tb11za84.js:4144-4669 placement
function queryWin32FileInfo(nt, handle) {
  let queryInformation = nt.queryInformation(handle),
    reparseTag =
      (queryInformation.attributes & ATTRIBUTE.REPARSE_POINT) !== 0
        ? nt.queryAttributeTag(handle).reparseTag
        : 0,
    queryId = nt.queryId(handle),
    queryVolume = nt.queryVolume(handle),
    identity = {
      dev32: BigInt(queryVolume.serialNumber),
      dev64: queryId?.volumeSerialNumber ?? null,
      ino: queryInformation.indexNumber,
      size: queryInformation.size,
      nlink: BigInt(queryInformation.numberOfLinks),
      mtimeNs: B(queryInformation.lastWriteTime),
      ctimeNs: B(queryInformation.changeTime),
      attributes: queryInformation.attributes,
      reparseTag: reparseTag,
    },
    times = { atimeNs: B(queryInformation.lastAccessTime), birthtimeNs: B(queryInformation.creationTime) };
  return {
    ...identity,
    stats: (h) =>
      buildWin32Stats(
        h === "serial64" && identity.dev64 !== null ? identity.dev64 : identity.dev32,
        identity,
        times,
        queryInformation.allocationSize,
      ),
  };
}
//@ chunk-tb11za84.js:4669-4744 placement
function F(i) {
  return (i.attributes & ATTRIBUTE.REPARSE_POINT) !== 0 && isReparseTagNameSurrogate(i.reparseTag);
}
//@ chunk-tb11za84.js:4744-4869 placement
function queryAttributesAndTag(i, e) {
  let queryAttributes = i.queryAttributes(e);
  return (queryAttributes & ATTRIBUTE.REPARSE_POINT) !== 0
    ? i.queryAttributeTag(e)
    : { attributes: queryAttributes, reparseTag: 0 };
}
//@ chunk-tb11za84.js:4869-5160 placement
function matchIdentityBridge(i, e) {
  let E = (R) => R !== null && e.ino !== 0n && e.dev === R && fSn(e.ino, i.ino),
    T = E(i.dev32) ? "serial32" : E(i.dev64) ? "serial64" : null;
  return (
    logForDebugging(
      `anchor (win32): identity bridge ${T ?? "none"} \u2014 bun dev=${e.dev} ino=${e.ino}; nt serial32=${i.dev32} serial64=${i.dev64 ?? "n/a"} index=${i.ino}`,
    ),
    T
  );
}
/**
 * Windows 下为根目录建立锚定文件句柄（网络共享等情况降级为不锚定）。
 */
//@ chunk-tb11za84.js:5281-13060 placement
async function openWin32Anchor(i, e, E) {
  let { fs: fs } = i,
    { realRoot: realRoot } = E;
  if (isUncPath(realRoot))
    return (
      logForDebugging("anchor (win32): the root is on a network share: no anchored backend here"),
      { unanchored: "remote_volume" }
    );
  let O = 0,
    _;
  try {
    if (
      ((O = e.open(0, toNtPath(realRoot), {
        access: DIR_LIST_ACCESS,
        disposition: DISPOSITION.FILE_OPEN,
        options: OPEN_DIR_OPTIONS,
      })),
      (e.queryDevice(O).characteristics & FILE_REMOTE_DEVICE) !== 0)
    )
      return (
        e.close(O),
        logForDebugging("anchor (win32): the root is on a remote volume: no anchored backend here"),
        { unanchored: "remote_volume" }
      );
    let n = queryWin32FileInfo(e, O);
    if (F(n)) throw m("ELOOP");
    if ((await resolvedRoot(i, E)) !== realRoot) throw m("WORKING_ROOT_NOT_CANONICAL");
    let r = matchIdentityBridge(n, await fs.lstat(realRoot, { bigint: !0 }));
    if (r === null) return (e.close(O), { unanchored: "unstable_identity" });
    _ = r;
  } catch (error) {
    if (O !== 0) e.close(O);
    let r = getErrnoCode(error);
    if (
      r === "ENOENT" ||
      r === "ENOTDIR" ||
      r === "ELOOP" ||
      r === "EPERM" ||
      r === "WORKING_ROOT_NOT_CANONICAL" ||
      r === "EBUSY" ||
      r === "EMFILE" ||
      r === "ENFILE" ||
      r === "ENOMEM" ||
      r === "EAGAIN" ||
      r === "ETIMEDOUT" ||
      r === "EIO"
    )
      throw error;
    return (
      logForDebugging(
        `anchor (win32): bring-up failed (${r ?? "no code"}, status 0x${(statusOf(error) ?? 0).toString(16)}): no anchored backend here`,
        { level: "warn" },
      ),
      { unanchored: "bring_up_failed" }
    );
  }
  let b = (n, r, s, o, a = !1) =>
      e.open(n, assertPlainWin32Name(r, a), { access: s, disposition: DISPOSITION.FILE_OPEN, options: o }),
    h = async (n, r, s, o, a) => {
      let u = b(n, r, s, o);
      try {
        return await a(u);
      } finally {
        e.close(u);
      }
    },
    L = (n, r) => h(n, r, READ_ATTR_ACCESS, OPEN_REPARSE_OPTIONS, (s) => queryWin32FileInfo(e, s).stats(_)),
    y = async (n, r, s) => {
      if ((s & ~NOFOLLOW_NONBLOCK_FLAGS & WRITE_OPEN_FLAGS) !== 0)
        throw Error("anchored open never writes on this backend");
      let o = K(n, r, OPEN_REPARSE_OPTIONS, !1);
      try {
        let a = queryAttributesAndTag(e, o);
        if (F(a)) throw m("ELOOP");
        if ((a.attributes & ATTRIBUTE.DIRECTORY) !== 0) throw m("EISDIR");
        if (Q(a.attributes)) throw m("WORKING_FILE_OFFLINE");
        if ((a.attributes & ATTRIBUTE.REPARSE_POINT) === 0) return V(o);
      } catch (error) {
        throw (e.close(o), error);
      }
      return V(ie(n, r, o));
    },
    K = (n, r, s, o) => {
      let a = (u) =>
        e.open(n, assertPlainWin32Name(r), {
          access: u,
          disposition: DISPOSITION.FILE_OPEN,
          options: s,
          dontReparse: o,
        });
      try {
        return a(FILE_GENERIC_READ | ACCESS.FILE_WRITE_ATTRIBUTES);
      } catch (error) {
        let I = getErrnoCode(error);
        if (I !== "EPERM" && I !== "EROFS") throw error;
        return a(FILE_GENERIC_READ);
      }
    },
    ie = (n, r, s) => {
      try {
        let o;
        try {
          o = K(n, r, OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT, !0);
        } catch (error) {
          if (FILE_NOT_SERVED_STATUSES.has(statusOf(error) ?? 0))
            throw (
              logForDebugging(
                `anchor (win32): a filter-served file's second open met a link refusal (status 0x${(statusOf(error) ?? 0).toString(16)}); reported as a link`,
              ),
              error
            );
          throw (
            logForDebugging(
              `anchor (win32): a filter-served file could not be reopened for its bytes (${getErrnoCode(error) ?? "no code"}, status 0x${(statusOf(error) ?? 0).toString(16)}); unreadable this round`,
            ),
            m("WORKING_FILE_NOT_SERVED")
          );
        }
        try {
          let queryInformation = e.queryInformation(o);
          if (Q(queryInformation.attributes)) throw m("WORKING_FILE_OFFLINE");
          if (
            queryInformation.indexNumber !== e.queryInformation(s).indexNumber ||
            e.queryVolume(o).serialNumber !== e.queryVolume(s).serialNumber
          )
            throw (
              logForDebugging(
                "anchor (win32): a filter-served file reopened as another file; unreadable this round",
              ),
              m("WORKING_FILE_NOT_SERVED")
            );
          return o;
        } catch (error) {
          throw (e.close(o), error);
        }
      } finally {
        e.close(s);
      }
    },
    V = (n) => {
      let r = !1,
        s = () => {
          if (r) throw m("EBADF");
          return n;
        },
        o = () => queryWin32FileInfo(e, s()).stats(_);
      async function a(d) {
        return d?.bigint === !0 ? o() : toNumberStats(o());
      }
      let u = (d, c) => e.read(s(), d, BigInt(c));
      async function* I() {
        for (let d = 0; ;) {
          let allocUnsafe = Buffer.allocUnsafe(READ_CHUNK_BYTES),
            N = u(allocUnsafe, d);
          if (N === 0) return;
          ((d += N), yield allocUnsafe.subarray(0, N), await new Promise((f) => setImmediate(f)));
        }
      }
      return {
        stat: a,
        read: async (d, c, N, f) => {
          let C = u(d.subarray(c, c + Math.min(N, READ_CHUNK_BYTES)), f);
          return (await new Promise((p) => setImmediate(p)), { bytesRead: C });
        },
        readFile: async () => {
          let d = [];
          for await (let c of I()) d.push(c);
          return Buffer.concat(d);
        },
        createReadStream: () => I(),
        chmod: async (d) => {
          let queryAttributes = e.queryAttributes(s()),
            N =
              (d & 128) === 0 ? queryAttributes | ATTRIBUTE.READONLY : queryAttributes & ~ATTRIBUTE.READONLY;
          if (N !== queryAttributes) e.setAttributes(s(), N === 0 ? ATTRIBUTE.NORMAL : N);
        },
        utimes: async (d, c) => e.setTimes(s(), W(d), W(c)),
        close: async () => {
          if (!r) ((r = !0), e.close(n));
        },
      };
    },
    q = async (n) => {
      try {
        await n();
      } catch (error) {
        throw getErrnoCode(error) === "EBUSY"
          ? Object.assign(m("WORKING_FILE_HELD"), { cause: error })
          : error;
      }
    },
    G = (n) =>
      q(async () => {
        await retryTransient(n);
      }),
    Y = ACCESS.DELETE | ACCESS.FILE_WRITE_ATTRIBUTES | READ_ATTR_ACCESS,
    z = (n) => {
      try {
        return queryWin32FileInfo(e, n).stats(_);
      } catch (error) {
        return (
          logWin32AnchorFailure(
            "a new file's stat could not be read through its handle, so the folder check goes on without it",
            error,
          ),
          null
        );
      }
    },
    P = (n, r, s, o, a, u) =>
      (a ? q : G)(() =>
        h(n, r, u === void 0 ? ACCESS.DELETE | READ_ATTR_ACCESS : Y, OPEN_REPARSE_OPTIONS, async (I) => {
          e.renameByHandle(I, s, assertPlainWin32Name(o), a);
          try {
            if ((await u?.(z(I))) === !0) e.deleteByHandle(I);
          } catch (error) {
            logWin32AnchorFailure(
              "a renamed file could not be removed through its handle after its folder failed the check, so it stays at its new name",
              error,
            );
          }
        }),
      ),
    Z = (n, r, s, o) =>
      G(() =>
        h(n, r, ACCESS.FILE_WRITE_ATTRIBUTES | ACCESS.SYNCHRONIZE, OPEN_REPARSE_OPTIONS, (a) =>
          e.linkByHandle(a, s, assertPlainWin32Name(o)),
        ),
      ),
    X = (n, r) =>
      G(() =>
        h(n, r, Y, OPEN_REPARSE_OPTIONS, (s) => {
          let o = queryAttributesAndTag(e, s);
          if ((o.attributes & ATTRIBUTE.DIRECTORY) !== 0 && !F(o)) throw m("EISDIR");
          e.deleteByHandle(s);
        }),
      ),
    j = (n, r, s, o = !1) => {
      let a = b(n, r, s, OPEN_DIR_OPTIONS, o);
      try {
        if (F(queryAttributesAndTag(e, a))) throw m("ENOTDIR");
        return a;
      } catch (error) {
        throw (e.close(a), error);
      }
    },
    J = {
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
        let open = e.open(n, assertPlainWin32Name(r), {
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
          for (let N = 0; N < o.length; N += MAX_DIR_READ_BYTES)
            if (
              (e.write(open, o.subarray(N, N + MAX_DIR_READ_BYTES), BigInt(N)),
              N + MAX_DIR_READ_BYTES < o.length)
            )
              await new Promise((f) => setImmediate(f));
          await d?.(z(open));
        } catch (error) {
          try {
            e.deleteByHandle(open);
          } catch {}
          throw (e.close(open), error);
        }
        e.close(open);
      },
      createAndOpen: async (n, r, s, o) => {
        let open = e.open(n, assertPlainWin32Name(r), {
            access: FILE_GENERIC_WRITE | ACCESS.FILE_READ_ATTRIBUTES,
            disposition: DISPOSITION.FILE_CREATE,
            options:
              OPTIONS.FILE_NON_DIRECTORY_FILE |
              OPTIONS.FILE_OPEN_REPARSE_POINT |
              OPTIONS.FILE_SYNCHRONOUS_IO_NONALERT |
              OPTIONS.FILE_WRITE_THROUGH,
            attributes: (o & 128) === 0 ? ATTRIBUTE.READONLY : ATTRIBUTE.NORMAL,
          }),
          u = !1,
          I = () => {
            if (u) throw m("EBADF");
            return open;
          };
        return {
          stat: async () => queryWin32FileInfo(e, I()).stats(_),
          writeFile: async (d) => {
            for (let c = 0; c < d.length; c += MAX_DIR_READ_BYTES)
              (e.write(I(), d.subarray(c, c + MAX_DIR_READ_BYTES), BigInt(c)),
                await new Promise((N) => setImmediate(N)));
          },
          write: async (d, c, N, f) => {
            if (![c, N, f].every((p) => Number.isSafeInteger(p) && p >= 0) || c + N > d.length)
              throw m("EINVAL");
            let chunk = d.subarray(c, c + Math.min(N, MAX_DIR_READ_BYTES));
            return (
              e.write(I(), chunk, BigInt(f)),
              await new Promise((p) => setImmediate(p)),
              { bytesWritten: chunk.length }
            );
          },
          utimes: async (d, c) => e.setTimes(I(), W(d), W(c)),
          sync: async () => {},
          close: async () => {
            if (!u) ((u = !0), e.close(open));
          },
        };
      },
      link: Z,
      rename: (n, r, s, o) => P(n, r, s, o, !0),
      renameNoReplace: (n, r, s, o, a) => P(n, r, s, o, !1, a),
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
          throw getErrnoCode(error) === "EISDIR" ? m("EEXIST") : error;
        }
        try {
          e.setSymlink(o, n);
        } catch (error) {
          try {
            e.deleteByHandle(o);
          } catch {}
          throw (e.close(o), error);
        }
        e.close(o);
      },
      readlink: (n, r) => h(n, r, READ_ATTR_ACCESS, OPEN_REPARSE_OPTIONS, (s) => e.readSymlink(s)),
      unlink: X,
      rmdir: (n, r) =>
        h(n, r, Y, OPEN_DIR_OPTIONS, (s) => {
          if (F(queryAttributesAndTag(e, s))) throw m("ENOTDIR");
          e.deleteByHandle(s);
        }),
      list: async (n, r) => e.listDirectory(n, r),
      lstat: L,
      open: (n, r, s, o) => y(n, r, o),
      hold: async (n) => {
        let r = await fs.realpath(n).catch(() => null),
          s = r !== null && /^[a-zA-Z]:$/.test(r) ? `${r}\\` : r;
        if (s === null || isUncPath(s)) return null;
        let o;
        try {
          o = e.open(0, toNtPath(s), {
            access: DIR_LIST_ACCESS,
            disposition: DISPOSITION.FILE_OPEN,
            options: OPEN_DIR_OPTIONS,
          });
        } catch {
          return null;
        }
        try {
          if ((e.queryDevice(o).characteristics & FILE_REMOTE_DEVICE) !== 0) return (e.close(o), null);
          let [a, u] = await Promise.all([queryWin32FileInfo(e, o), fs.lstat(s, { bigint: !0 })]),
            stats = a.stats(_);
          if (
            F(a) ||
            !stats.isDirectory() ||
            !u.isDirectory() ||
            stats.ino === 0n ||
            stats.dev !== u.dev ||
            !fSn(stats.ino, u.ino)
          )
            return (e.close(o), null);
        } catch {
          return (e.close(o), null);
        }
        return J.holdOpenedDir(o, s);
      },
      getHeldDir: (n) => n.dir,
      holdOpenedDir: (n, r) => {
        let s = !1;
        return {
          realPath: r,
          dir: n,
          stat: async () => queryWin32FileInfo(e, n).stats(_),
          close: async () => {
            if (!s) ((s = !0), e.close(n));
          },
        };
      },
      renameOut: (n, r, s, o) => P(n, r, s.dir, o, !0),
      renameIn: (n, r, s, o) => P(n.dir, r, s, o, !0),
      linkIn: (n, r, s, o) => Z(n.dir, r, s, o),
      renameInNoReplace: (n, r, s, o, a) => P(n.dir, r, s, o, !1, a),
      statIn: (n, r) => L(n.dir, r),
      openIn: (n, r, s) => y(n.dir, r, s),
      unlinkIn: (n, r) => X(n.dir, r),
    },
    M = !1,
    se = {
      stat: async () => {
        if (M) throw m("EBADF");
        return queryWin32FileInfo(e, O).stats(_);
      },
      close: async () => {
        if (!M) ((M = !0), e.close(O));
      },
    };
  return (logForDebugging("anchor (win32): held-handle backend up"), { root: se, held: O, ops: J });
}
//@ chunk-tb11za84.js:13060-13192 placement
function logWin32AnchorFailure(i, e) {
  let E = statusOf(e);
  if (E === void 0) {
    logError(e);
    return;
  }
  logForDebugging(`anchor (win32): ${i} (${getErrnoCode(e) ?? "no code"}, status 0x${E.toString(16)})`);
}
