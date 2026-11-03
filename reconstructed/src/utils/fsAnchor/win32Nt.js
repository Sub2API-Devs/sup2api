/**
 * utils/fsAnchor/win32Nt.ts
 *
 * 2.1.316 新增。基于 ntdll 的 Windows 文件锚定后端（NTSTATUS 映射、符号链接重解析数据）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9gakhe7s.js (14)
 * attribution: placement 14
 */
import { logForDebugging } from "../debug.js";

//@ chunk-9gakhe7s.js:261-708 placement
var ACCESS = {
    DELETE: 65536,
    READ_CONTROL: 131072,
    SYNCHRONIZE: 1048576,
    FILE_LIST_DIRECTORY: 1,
    FILE_READ_DATA: 1,
    FILE_WRITE_DATA: 2,
    FILE_APPEND_DATA: 4,
    FILE_READ_EA: 8,
    FILE_WRITE_EA: 16,
    FILE_TRAVERSE: 32,
    FILE_READ_ATTRIBUTES: 128,
    FILE_WRITE_ATTRIBUTES: 256,
  },
  FILE_GENERIC_READ =
    ACCESS.READ_CONTROL |
    ACCESS.FILE_READ_DATA |
    ACCESS.FILE_READ_ATTRIBUTES |
    ACCESS.FILE_READ_EA |
    ACCESS.SYNCHRONIZE,
  FILE_GENERIC_WRITE =
    ACCESS.READ_CONTROL |
    ACCESS.FILE_WRITE_DATA |
    ACCESS.FILE_WRITE_ATTRIBUTES |
    ACCESS.FILE_WRITE_EA |
    ACCESS.FILE_APPEND_DATA |
    ACCESS.SYNCHRONIZE;
//@ chunk-9gakhe7s.js:708-979 placement
var DISPOSITION = { FILE_OPEN: 1, FILE_CREATE: 2 },
  OPTIONS = {
    FILE_DIRECTORY_FILE: 1,
    FILE_WRITE_THROUGH: 2,
    FILE_SYNCHRONOUS_IO_NONALERT: 32,
    FILE_NON_DIRECTORY_FILE: 64,
    FILE_OPEN_REPARSE_POINT: 2097152,
  },
  ATTRIBUTE = { READONLY: 1, DIRECTORY: 16, NORMAL: 128, REPARSE_POINT: 1024 },
  FILE_REMOTE_DEVICE = 16,
  m = 2684354572,
  F = 16384,
  A = 8,
  R = 12;
//@ chunk-9gakhe7s.js:979-1019 placement
function isReparseTagNameSurrogate(e) {
  return (e & 536870912) !== 0;
}
/**
 * NTSTATUS 码表
 */
//@ chunk-9gakhe7s.js:1019-3620 placement
var NT_STATUS = {
    STOPPED_ON_SYMLINK: 2147483693,
    NOT_IMPLEMENTED: 3221225474,
    INVALID_INFO_CLASS: 3221225475,
    INFO_LENGTH_MISMATCH: 3221225476,
    INVALID_HANDLE: 3221225480,
    INVALID_PARAMETER: 3221225485,
    NO_SUCH_FILE: 3221225487,
    INVALID_DEVICE_REQUEST: 3221225488,
    ACCESS_DENIED: 3221225506,
    OBJECT_NAME_INVALID: 3221225523,
    OBJECT_NAME_NOT_FOUND: 3221225524,
    OBJECT_NAME_COLLISION: 3221225525,
    OBJECT_PATH_NOT_FOUND: 3221225530,
    OBJECT_PATH_SYNTAX_BAD: 3221225531,
    SHARING_VIOLATION: 3221225539,
    FILE_LOCK_CONFLICT: 3221225556,
    DELETE_PENDING: 3221225558,
    DISK_FULL: 3221225599,
    MEDIA_WRITE_PROTECTED: 3221225634,
    FILE_IS_A_DIRECTORY: 3221225658,
    NOT_SUPPORTED: 3221225659,
    NOT_SAME_DEVICE: 3221225684,
    DIRECTORY_NOT_EMPTY: 3221225729,
    NOT_A_DIRECTORY: 3221225731,
    NAME_TOO_LONG: 3221225734,
    CANNOT_DELETE: 3221225761,
    FILE_DELETED: 3221225763,
    INVALID_LEVEL: 3221225800,
    USER_MAPPED_FILE: 3221226051,
    TOO_MANY_LINKS: 3221226085,
    REPARSE_POINT_ENCOUNTERED: 3221226763,
    BAD_NETWORK_PATH: 3221225662,
    BAD_NETWORK_NAME: 3221225676,
    PRIVILEGE_NOT_HELD: 3221225569,
    IO_REPARSE_TAG_NOT_HANDLED: 3221226105,
    NOT_A_REPARSE_POINT: 3221226101,
    IO_REPARSE_DATA_INVALID: 3221226104,
    NO_MEMORY: 3221225495,
    INSUFFICIENT_RESOURCES: 3221225626,
    DEVICE_NOT_READY: 3221225635,
    IO_TIMEOUT: 3221225653,
    TOO_MANY_OPENED_FILES: 3221225759,
    IO_DEVICE_ERROR: 3221225861,
  },
  b = new Map([
    [NT_STATUS.NO_SUCH_FILE, "ENOENT"],
    [NT_STATUS.OBJECT_NAME_NOT_FOUND, "ENOENT"],
    [NT_STATUS.OBJECT_PATH_NOT_FOUND, "ENOENT"],
    [NT_STATUS.OBJECT_NAME_INVALID, "EINVAL"],
    [NT_STATUS.OBJECT_PATH_SYNTAX_BAD, "EINVAL"],
    [NT_STATUS.OBJECT_NAME_COLLISION, "EEXIST"],
    [NT_STATUS.ACCESS_DENIED, "EPERM"],
    [NT_STATUS.CANNOT_DELETE, "EPERM"],
    [NT_STATUS.DELETE_PENDING, "EPERM"],
    [NT_STATUS.SHARING_VIOLATION, "EBUSY"],
    [NT_STATUS.FILE_LOCK_CONFLICT, "EBUSY"],
    [NT_STATUS.USER_MAPPED_FILE, "EBUSY"],
    [NT_STATUS.FILE_DELETED, "ENOENT"],
    [NT_STATUS.TOO_MANY_LINKS, "EMLINK"],
    [NT_STATUS.INVALID_HANDLE, "EBADF"],
    [NT_STATUS.NOT_A_DIRECTORY, "ENOTDIR"],
    [NT_STATUS.FILE_IS_A_DIRECTORY, "EISDIR"],
    [NT_STATUS.DIRECTORY_NOT_EMPTY, "ENOTEMPTY"],
    [NT_STATUS.NOT_SAME_DEVICE, "EXDEV"],
    [NT_STATUS.STOPPED_ON_SYMLINK, "ELOOP"],
    [NT_STATUS.REPARSE_POINT_ENCOUNTERED, "ELOOP"],
    [NT_STATUS.IO_REPARSE_TAG_NOT_HANDLED, "ELOOP"],
    [NT_STATUS.NOT_A_REPARSE_POINT, "EINVAL"],
    [NT_STATUS.IO_REPARSE_DATA_INVALID, "EINVAL"],
    [NT_STATUS.BAD_NETWORK_PATH, "ENOENT"],
    [NT_STATUS.BAD_NETWORK_NAME, "ENOENT"],
    [NT_STATUS.PRIVILEGE_NOT_HELD, "EPERM"],
    [NT_STATUS.DISK_FULL, "ENOSPC"],
    [NT_STATUS.MEDIA_WRITE_PROTECTED, "EROFS"],
    [NT_STATUS.NAME_TOO_LONG, "ENAMETOOLONG"],
    [NT_STATUS.NOT_SUPPORTED, "ENOTSUP"],
    [NT_STATUS.NOT_IMPLEMENTED, "ENOTSUP"],
    [NT_STATUS.INVALID_DEVICE_REQUEST, "ENOTSUP"],
    [NT_STATUS.INVALID_INFO_CLASS, "ENOTSUP"],
    [NT_STATUS.INVALID_LEVEL, "ENOTSUP"],
    [NT_STATUS.INVALID_PARAMETER, "EINVAL"],
    [NT_STATUS.INFO_LENGTH_MISMATCH, "EINVAL"],
    [NT_STATUS.NO_MEMORY, "ENOMEM"],
    [NT_STATUS.INSUFFICIENT_RESOURCES, "ENOMEM"],
    [NT_STATUS.TOO_MANY_OPENED_FILES, "EMFILE"],
    [NT_STATUS.IO_DEVICE_ERROR, "EIO"],
    [NT_STATUS.DEVICE_NOT_READY, "EAGAIN"],
    [NT_STATUS.IO_TIMEOUT, "ETIMEDOUT"],
  ]);
//@ chunk-9gakhe7s.js:3620-3758 placement
function ntStatusError(e, n) {
  let N = n >>> 0;
  return Object.assign(Error("Windows file-system call failed"), {
    code: b.get(N) ?? "EUNKNOWN",
    syscall: e,
    status: N,
  });
}
//@ chunk-9gakhe7s.js:3758-3869 placement
function statusOf(e) {
  return typeof e === "object" && e !== null && "status" in e && typeof e.status === "number"
    ? e.status
    : void 0;
}
/**
 * NTSTATUS 是否表示不支持
 */
//@ chunk-9gakhe7s.js:3869-4048 placement
function isUnsupportedNtStatus(e) {
  let n = statusOf(e);
  return (
    n === NT_STATUS.NOT_IMPLEMENTED ||
    n === NT_STATUS.INVALID_INFO_CLASS ||
    n === NT_STATUS.INVALID_PARAMETER ||
    n === NT_STATUS.NOT_SUPPORTED ||
    n === NT_STATUS.INVALID_DEVICE_REQUEST ||
    n === NT_STATUS.INVALID_LEVEL
  );
}
//@ chunk-9gakhe7s.js:4048-4421 placement
function toNtPath(e) {
  let n = e.startsWith("\\\\?\\UNC\\") ? "\\\\" + e.slice(8) : e.startsWith("\\\\?\\") ? e.slice(4) : e,
    N = !n.includes("/") && !/(^|\\)\.\.?(\\|$)/.test(n);
  if (N && /^[a-zA-Z]:\\/.test(n)) return "\\??\\" + n;
  if (N && /^\\\\[^\\?.][^\\]*\\[^\\]+/.test(n)) return "\\??\\UNC\\" + n.slice(2);
  throw Object.assign(Error("not an absolute Windows drive or network-share path"), { code: "EINVAL" });
}
/**
 * 编码 Windows 符号链接重解析数据；本模块是基于 ntdll 的 Windows 文件锚定后端。
 */
//@ chunk-9gakhe7s.js:4421-4883 placement
function encodeSymlinkReparseData(e) {
  let buffer = Buffer.from(toNtPath(e), "utf16le"),
    buffer_2 = Buffer.from(fromNtPath(toNtPath(e)), "utf16le"),
    s = R + buffer.length + buffer_2.length;
  if (A + s > F)
    throw Object.assign(Error("symbolic link target too long for a reparse point"), { code: "ENAMETOOLONG" });
  let alloc = Buffer.alloc(A + s);
  return (
    alloc.writeUInt32LE(m, 0),
    alloc.writeUInt16LE(s, 4),
    alloc.writeUInt16LE(0, 8),
    alloc.writeUInt16LE(buffer.length, 10),
    alloc.writeUInt16LE(buffer.length, 12),
    alloc.writeUInt16LE(buffer_2.length, 14),
    alloc.writeUInt32LE(0, 16),
    buffer.copy(alloc, A + R),
    buffer_2.copy(alloc, A + R + buffer.length),
    alloc
  );
}
//@ chunk-9gakhe7s.js:4883-4998 placement
function fromNtPath(e) {
  if (/^\\\?\?\\UNC\\/i.test(e)) return "\\\\" + e.slice(8);
  return /^\\\?\?\\[A-Za-z]:/.test(e) ? e.slice(4) : e;
}
//@ chunk-9gakhe7s.js:4998-5004 placement
var T;
//@ chunk-9gakhe7s.js:5004-5058 placement
function loadNt() {
  if (T !== void 0) return T;
  return ((T = null), T);
}
/**
 * 把 NTSTATUS 异常转为 errno 错误
 */
//@ chunk-9gakhe7s.js:5058-5255 placement
function wrapNtCall(e) {
  return (...n) => {
    try {
      return e(...n);
    } catch (error) {
      let s = statusOf(error);
      if (s === void 0) throw error;
      throw ntStatusError(
        typeof error === "object" && error !== null && "syscall" in error && typeof error.syscall === "string"
          ? error.syscall
          : "ntdll",
        s,
      );
    }
  };
}
/**
 * 基于 ntdll 的锚定后端
 */
//@ chunk-9gakhe7s.js:5255-6827 placement
function createNtBackend(e) {
  if (typeof e?.open !== "function") throw Error("not in this runtime");
  let n = wrapNtCall(e.deleteByHandle),
    N = wrapNtCall(e.renameByHandle),
    s = wrapNtCall(e.queryAttributes),
    I = wrapNtCall(e.setAttributes),
    S = wrapNtCall(e.listDirectory),
    x = wrapNtCall(e.open),
    f = wrapNtCall(e.linkByHandle),
    C = wrapNtCall(e.readSymlink),
    u = (r, o) => {
      logForDebugging(
        `anchor (win32): ${r} failed (status 0x${((statusOf(o) ?? 0) >>> 0).toString(16)}); trying the older class`,
      );
    },
    c = (r) => r !== "" && r !== "." && r !== ".." && !/[\\/:]/.test(r),
    l = () =>
      Object.assign(
        Error("directory-relative names must be a plain file name: not '.', '..', and no separator or ':'"),
        { code: "EINVAL" },
      );
  return {
    open: (r, o, i) => {
      if (r !== 0 && !c(o)) throw l();
      return x(r, o, i);
    },
    close: wrapNtCall(e.close),
    write: wrapNtCall(e.write),
    read: wrapNtCall(e.read),
    queryInformation: wrapNtCall(e.queryInformation),
    queryAttributes: s,
    queryAttributeTag: wrapNtCall(e.queryAttributeTag),
    queryId: wrapNtCall(e.queryId),
    queryVolume: wrapNtCall(e.queryVolume),
    queryDevice: wrapNtCall(e.queryDevice),
    deleteByHandle: (r) => {
      try {
        n(r, !0);
        return;
      } catch (error) {
        if (!isUnsupportedNtStatus(error) && statusOf(error) !== NT_STATUS.CANNOT_DELETE) throw error;
        u("FileDispositionInformationEx", error);
      }
      try {
        n(r, !1);
      } catch (error) {
        if (statusOf(error) !== NT_STATUS.CANNOT_DELETE) throw error;
        let i = s(r);
        if ((i & ATTRIBUTE.READONLY) === 0) throw error;
        I(r, (i & ~ATTRIBUTE.READONLY) === 0 ? ATTRIBUTE.NORMAL : i & ~ATTRIBUTE.READONLY);
        try {
          n(r, !1);
        } catch (error) {
          try {
            I(r, i);
          } catch {}
          throw error;
        }
      }
    },
    renameByHandle: (r, o, i, O) => {
      if (!c(i)) throw l();
      try {
        N(r, o, i, O, !0);
        return;
      } catch (error) {
        if (!isUnsupportedNtStatus(error)) throw error;
        u("FileRenameInformationEx", error);
      }
      N(r, o, i, O, !1);
    },
    linkByHandle: (r, o, i) => {
      if (!c(i)) throw l();
      f(r, o, i);
    },
    setAttributes: I,
    setTimes: wrapNtCall(e.setTimes),
    setSymlink: wrapNtCall(e.setSymlink),
    readSymlink: (r) => fromNtPath(C(r)),
    listDirectory: (r, o) => S(r, o === void 0 ? void 0 : o >= 0 ? Math.min(Math.floor(o), 4294967295) : 0),
    openHandleCount: e.openHandleCount,
  };
}

export {
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
};
