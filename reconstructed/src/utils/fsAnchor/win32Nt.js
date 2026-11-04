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
};
var FILE_GENERIC_READ =
  ACCESS.READ_CONTROL |
  ACCESS.FILE_READ_DATA |
  ACCESS.FILE_READ_ATTRIBUTES |
  ACCESS.FILE_READ_EA |
  ACCESS.SYNCHRONIZE;
var FILE_GENERIC_WRITE =
  ACCESS.READ_CONTROL |
  ACCESS.FILE_WRITE_DATA |
  ACCESS.FILE_WRITE_ATTRIBUTES |
  ACCESS.FILE_WRITE_EA |
  ACCESS.FILE_APPEND_DATA |
  ACCESS.SYNCHRONIZE;
//@ chunk-9gakhe7s.js:708-979 placement
var DISPOSITION = {
  FILE_OPEN: 1,
  FILE_CREATE: 2,
};
var OPTIONS = {
  FILE_DIRECTORY_FILE: 1,
  FILE_WRITE_THROUGH: 2,
  FILE_SYNCHRONOUS_IO_NONALERT: 32,
  FILE_NON_DIRECTORY_FILE: 64,
  FILE_OPEN_REPARSE_POINT: 2097152,
};
var ATTRIBUTE = {
  READONLY: 1,
  DIRECTORY: 16,
  NORMAL: 128,
  REPARSE_POINT: 1024,
};
var FILE_REMOTE_DEVICE = 16;
var SYMLINK_REPARSE_TAG = 2684354572;
var MAX_REPARSE_DATA_BYTES = 16384;
var REPARSE_DATA_HEADER_BYTES = 8;
var SYMLINK_NAME_HEADER_BYTES = 12;
//@ chunk-9gakhe7s.js:979-1019 placement
function isReparseTagNameSurrogate(reparseTag) {
  return (reparseTag & 536870912) !== 0;
}
//@ chunk-9gakhe7s.js:1019-3620 placement
/**
 * NTSTATUS 码表
 */
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
};
var NT_STATUS_TO_ERRNO = new Map([
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
function ntStatusError(syscall, status) {
  let unsignedStatus = status >>> 0;
  return Object.assign(Error("Windows file-system call failed"), {
    code: NT_STATUS_TO_ERRNO.get(unsignedStatus) ?? "EUNKNOWN",
    syscall,
    status: unsignedStatus,
  });
}
//@ chunk-9gakhe7s.js:3758-3869 placement
function statusOf(error) {
  return typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
}
//@ chunk-9gakhe7s.js:3869-4048 placement
/**
 * NTSTATUS 是否表示不支持
 */
function isUnsupportedNtStatus(error) {
  let status = statusOf(error);
  return (
    status === NT_STATUS.NOT_IMPLEMENTED ||
    status === NT_STATUS.INVALID_INFO_CLASS ||
    status === NT_STATUS.INVALID_PARAMETER ||
    status === NT_STATUS.NOT_SUPPORTED ||
    status === NT_STATUS.INVALID_DEVICE_REQUEST ||
    status === NT_STATUS.INVALID_LEVEL
  );
}
//@ chunk-9gakhe7s.js:4048-4421 placement
function toNtPath(inputPath) {
  let pathWithoutPrefix = inputPath.startsWith("\\\\?\\UNC\\")
    ? "\\\\" + inputPath.slice(8)
    : inputPath.startsWith("\\\\?\\")
      ? inputPath.slice(4)
      : inputPath;
  let isPlainAbsolutePath = !pathWithoutPrefix.includes("/") && !/(^|\\)\.\.?(\\|$)/.test(pathWithoutPrefix);
  if (isPlainAbsolutePath && /^[a-zA-Z]:\\/.test(pathWithoutPrefix)) return "\\??\\" + pathWithoutPrefix;
  if (isPlainAbsolutePath && /^\\\\[^\\?.][^\\]*\\[^\\]+/.test(pathWithoutPrefix))
    return "\\??\\UNC\\" + pathWithoutPrefix.slice(2);
  throw Object.assign(Error("not an absolute Windows drive or network-share path"), {
    code: "EINVAL",
  });
}
//@ chunk-9gakhe7s.js:4421-4883 placement
/**
 * 编码 Windows 符号链接重解析数据；本模块是基于 ntdll 的 Windows 文件锚定后端。
 */
function encodeSymlinkReparseData(targetPath) {
  let buffer = Buffer.from(toNtPath(targetPath), "utf16le");
  let buffer_2 = Buffer.from(fromNtPath(toNtPath(targetPath)), "utf16le");
  let nameBytesLength = SYMLINK_NAME_HEADER_BYTES + buffer.length + buffer_2.length;
  if (REPARSE_DATA_HEADER_BYTES + nameBytesLength > MAX_REPARSE_DATA_BYTES)
    throw Object.assign(Error("symbolic link target too long for a reparse point"), {
      code: "ENAMETOOLONG",
    });
  let buffer_3 = Buffer.alloc(REPARSE_DATA_HEADER_BYTES + nameBytesLength);
  buffer_3.writeUInt32LE(SYMLINK_REPARSE_TAG, 0);
  buffer_3.writeUInt16LE(nameBytesLength, 4);
  buffer_3.writeUInt16LE(0, 8);
  buffer_3.writeUInt16LE(buffer.length, 10);
  buffer_3.writeUInt16LE(buffer.length, 12);
  buffer_3.writeUInt16LE(buffer_2.length, 14);
  buffer_3.writeUInt32LE(0, 16);
  buffer.copy(buffer_3, REPARSE_DATA_HEADER_BYTES + SYMLINK_NAME_HEADER_BYTES);
  buffer_2.copy(buffer_3, REPARSE_DATA_HEADER_BYTES + SYMLINK_NAME_HEADER_BYTES + buffer.length);
  return buffer_3;
}
//@ chunk-9gakhe7s.js:4883-4998 placement
function fromNtPath(ntPath) {
  if (/^\\\?\?\\UNC\\/i.test(ntPath)) return "\\\\" + ntPath.slice(8);
  return /^\\\?\?\\[A-Za-z]:/.test(ntPath) ? ntPath.slice(4) : ntPath;
}
//@ chunk-9gakhe7s.js:4998-5004 placement
var ntdllProbeMemo;
//@ chunk-9gakhe7s.js:5004-5058 placement
function loadNt() {
  if (ntdllProbeMemo !== undefined) return ntdllProbeMemo;
  ntdllProbeMemo = null;
  return ntdllProbeMemo;
}
//@ chunk-9gakhe7s.js:5058-5255 placement
/**
 * 把 NTSTATUS 异常转为 errno 错误
 */
function wrapNtCall(ntCall) {
  return (...args) => {
    try {
      return ntCall(...args);
    } catch (error) {
      let status = statusOf(error);
      if (status === undefined) throw error;
      throw ntStatusError(
        typeof error === "object" && error !== null && "syscall" in error && typeof error.syscall === "string"
          ? error.syscall
          : "ntdll",
        status,
      );
    }
  };
}
//@ chunk-9gakhe7s.js:5255-6827 placement
/**
 * 基于 ntdll 的锚定后端
 */
function createNtBackend(nt) {
  if (typeof nt?.open !== "function") throw Error("not in this runtime");
  let deleteByHandle = wrapNtCall(nt.deleteByHandle);
  let renameByHandle = wrapNtCall(nt.renameByHandle);
  let queryAttributes = wrapNtCall(nt.queryAttributes);
  let setAttributes = wrapNtCall(nt.setAttributes);
  let listDirectory = wrapNtCall(nt.listDirectory);
  let openHandle = wrapNtCall(nt.open);
  let linkByHandle = wrapNtCall(nt.linkByHandle);
  let readSymlink = wrapNtCall(nt.readSymlink);
  let logOlderClassFallback = (infoClassName, error) => {
    logForDebugging(
      `anchor (win32): ${infoClassName} failed (status 0x${((statusOf(error) ?? 0) >>> 0).toString(16)}); trying the older class`,
    );
  };
  let isPlainRelativeName = (name) => name !== "" && name !== "." && name !== ".." && !/[\\/:]/.test(name);
  let plainNameError = () =>
    Object.assign(
      Error("directory-relative names must be a plain file name: not '.', '..', and no separator or ':'"),
      {
        code: "EINVAL",
      },
    );
  return {
    open: (dirHandle, name, options) => {
      if (dirHandle !== 0 && !isPlainRelativeName(name)) throw plainNameError();
      return openHandle(dirHandle, name, options);
    },
    close: wrapNtCall(nt.close),
    write: wrapNtCall(nt.write),
    read: wrapNtCall(nt.read),
    queryInformation: wrapNtCall(nt.queryInformation),
    queryAttributes,
    queryAttributeTag: wrapNtCall(nt.queryAttributeTag),
    queryId: wrapNtCall(nt.queryId),
    queryVolume: wrapNtCall(nt.queryVolume),
    queryDevice: wrapNtCall(nt.queryDevice),
    deleteByHandle: (handle) => {
      try {
        deleteByHandle(handle, true);
        return;
      } catch (error) {
        if (!isUnsupportedNtStatus(error) && statusOf(error) !== NT_STATUS.CANNOT_DELETE) throw error;
        logOlderClassFallback("FileDispositionInformationEx", error);
      }
      try {
        deleteByHandle(handle, false);
      } catch (error) {
        if (statusOf(error) !== NT_STATUS.CANNOT_DELETE) throw error;
        let attributes = queryAttributes(handle);
        if ((attributes & ATTRIBUTE.READONLY) === 0) throw error;
        setAttributes(
          handle,
          (attributes & ~ATTRIBUTE.READONLY) === 0 ? ATTRIBUTE.NORMAL : attributes & ~ATTRIBUTE.READONLY,
        );
        try {
          deleteByHandle(handle, false);
        } catch (error) {
          try {
            setAttributes(handle, attributes);
          } catch {}
          throw error;
        }
      }
    },
    renameByHandle: (handle, dirHandle, newName, replaceExisting) => {
      if (!isPlainRelativeName(newName)) throw plainNameError();
      try {
        renameByHandle(handle, dirHandle, newName, replaceExisting, true);
        return;
      } catch (error) {
        if (!isUnsupportedNtStatus(error)) throw error;
        logOlderClassFallback("FileRenameInformationEx", error);
      }
      renameByHandle(handle, dirHandle, newName, replaceExisting, false);
    },
    linkByHandle: (handle, dirHandle, name) => {
      if (!isPlainRelativeName(name)) throw plainNameError();
      linkByHandle(handle, dirHandle, name);
    },
    setAttributes,
    setTimes: wrapNtCall(nt.setTimes),
    setSymlink: wrapNtCall(nt.setSymlink),
    readSymlink: (handle) => fromNtPath(readSymlink(handle)),
    listDirectory: (handle, maxNames) =>
      listDirectory(
        handle,
        maxNames === undefined ? undefined : maxNames >= 0 ? Math.min(Math.floor(maxNames), 4294967295) : 0,
      ),
    openHandleCount: nt.openHandleCount,
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
  loadNt,
};
