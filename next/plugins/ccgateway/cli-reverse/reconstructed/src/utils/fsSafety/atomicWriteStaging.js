/**
 * utils/fsSafety/atomicWriteStaging.ts
 *
 * 2.1.316 新增：生成原子写入暂存路径（检查父目录）；验证原子写入的暂存目录仍可用（身份未变）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0fzr619q.js (24)
 * attribution: placement 24
 */
import { closeSync, openSync, constants, fstatSync, readSync } from "fs";
import { resolve, dirname, join, basename, relative, isAbsolute, sep } from "path";
import { open, stat, lstat } from "fs/promises";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { hardlinkedRefusalText } from "../plugins/safeCopy.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { getPathsForPermissionCheck } from "../fsOperations.js";
import { PERMISSION_STASH_EVICTED_SYMBOL } from "../../bootstrap/sessionSlices.js";
import { logForDebugging } from "../debug.js";
import { slowLogging } from "../slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0fzr619q.js:1268-1549 placement
/**
 * 记录暂存目录的 dev/ino 与打开的句柄（替换或重置时关闭旧句柄）。
 */
class StagingDirIdentities {
  identities = new Map();
  record(stagingDir, dev, ino, fd) {
    let stagingPath = resolveStagingPath(stagingDir);
    let previous = this.identities.get(stagingPath);
    if (previous)
      try {
        closeSync(previous.fd);
      } catch {}
    this.identities.set(stagingPath, {
      dev,
      ino,
      fd,
    });
  }
  identity(stagingDir) {
    return this.identities.get(resolveStagingPath(stagingDir));
  }
  reset() {
    for (let { fd } of this.identities.values())
      try {
        closeSync(fd);
      } catch {}
    this.identities.clear();
  }
}
//@ chunk-0fzr619q.js:1549-1574 placement
var stagingIdentitiesRegistry; // deferred: uses StagingDirIdentities of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0fzr619q.js:1549", () => {
  stagingIdentitiesRegistry = new HostScoped(() => new StagingDirIdentities());
});
//@ chunk-0fzr619q.js:1574-1610 placement
function currentStagingIdentities() {
  return stagingIdentitiesRegistry.of(getRootSession().host);
}
//@ chunk-0fzr619q.js:1610-1636 placement
function resolveStagingPath(stagingDir) {
  return resolve(stagingDir);
}
//@ chunk-0fzr619q.js:1636-1678 placement
/**
 * 记录原子写入暂存目录的身份（供后续校验未变）。
 */
function recordStagingDirIdentity(stagingDir, dev, ino, fd) {
  currentStagingIdentities().record(stagingDir, dev, ino, fd);
}
//@ chunk-0fzr619q.js:1678-2190 placement
/**
 * 验证原子写入的暂存目录仍可用（身份未变）。
 */
function verifyStagingDir(stagingDir) {
  if (!stagingDir) return;
  let expected = currentStagingIdentities().identity(stagingDir);
  if (!expected) return;
  let dirFd;
  try {
    dirFd = openSync(stagingDir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP" || errnoCode === "EACCES")
      throwStagingTampered(
        `Staging dir ${stagingDir} was established for a sandboxed command but is now unopenable (${errnoCode}) \u2014 refusing atomic write`,
      );
    throw error;
  }
  try {
    let actual = fstatSync(dirFd);
    if (actual.dev !== expected.dev || actual.ino !== expected.ino)
      throwStagingTampered(
        `Staging dir ${stagingDir} identity changed (expected ${expected.dev}/${expected.ino}, found ${actual.dev}/${actual.ino}) \u2014 refusing atomic write`,
      );
  } finally {
    closeSync(dirFd);
  }
}
//@ chunk-0fzr619q.js:2190-3206 placement
/**
 * 生成原子写入暂存路径（检查父目录）。
 */
function stagingPathFor(stagingDir, targetPath, suffix, allowSiblingFallback) {
  let siblingPath = `${targetPath}${suffix}`;
  if (!stagingDir) return siblingPath;
  let expected = currentStagingIdentities().identity(stagingDir);
  if (allowSiblingFallback && dirname(targetPath) !== dirname(stagingDir)) {
    verifyStagingDir(stagingDir);
    return siblingPath;
  }
  let dirFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  try {
    closeSync(openSync(dirname(stagingDir), dirFlags));
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR") {
      if (expected)
        throwStagingTampered(
          `Staging dir parent ${dirname(stagingDir)} is ${errnoCode} but a sandboxed command established ${stagingDir} \u2014 refusing sibling fallback`,
        );
      if (allowSiblingFallback) return siblingPath;
      throw new SymlinkWriteRefusedError(
        `Refusing to stage atomic write under non-directory parent: ${dirname(stagingDir)}`,
      );
    }
    if (!isENOENT(error)) throw error;
    if (expected)
      throwStagingTampered(
        `Staging dir parent ${dirname(stagingDir)} is absent but a sandboxed command established ${stagingDir} \u2014 refusing sibling fallback`,
      );
    return siblingPath;
  }
  let dirFd;
  try {
    dirFd = openSync(stagingDir, dirFlags);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP") {
      if (expected)
        throwStagingTampered(
          `Staging dir ${stagingDir} is ${errnoCode} but a sandboxed command established it \u2014 refusing sibling fallback`,
        );
      return siblingPath;
    }
    throw error;
  }
  try {
    if (expected) {
      let actual = fstatSync(dirFd);
      if (actual.dev !== expected.dev || actual.ino !== expected.ino)
        throwStagingTampered(
          `Staging dir ${stagingDir} identity changed (expected ${expected.dev}/${expected.ino}, found ${actual.dev}/${actual.ino}) \u2014 refusing atomic write`,
        );
    }
  } finally {
    closeSync(dirFd);
  }
  return join(stagingDir, `${basename(targetPath)}${suffix}`);
}
//@ chunk-0fzr619q.js:3206-3291 placement
/**
 * 拒绝通过符号链接写入的错误（及硬链接子类）。
 */
class SymlinkWriteRefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = "SymlinkWriteRefusedError";
  }
}
//@ chunk-0fzr619q.js:3291-3384 placement
let HardLinkWriteRefusedError; // deferred: uses SymlinkWriteRefusedError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0fzr619q.js:3291", () => {
  HardLinkWriteRefusedError = class HardLinkWriteRefusedError extends SymlinkWriteRefusedError {
    constructor(targetPath, nlink) {
      super(hardlinkedRefusalText(targetPath, nlink));
      this.name = "HardLinkWriteRefusedError";
    }
  };
});
//@ chunk-0fzr619q.js:3384-3458 placement
/**
 * 生成写入打开的 flags 描述（O_WRONLY|O_CREAT 加上调用方标志）。
 */
function openWriteFlags(extraFlags) {
  return {
    flags: constants.O_WRONLY | constants.O_CREAT | extraFlags,
    flagsIfMissing: undefined,
  };
}
//@ chunk-0fzr619q.js:3458-3542 placement
/**
 * 拒绝通过符号链接读取的错误。
 */
class SymlinkReadRefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = "SymlinkReadRefusedError";
  }
}
//@ chunk-0fzr619q.js:3542-4021 placement
/**
 * 确认目录链在基目录内且没有链接。
 */
async function assertDirChainReal(baseDir, dirPath) {
  let relPath = relative(baseDir, dirPath);
  if (relPath === "" || relPath.startsWith("..") || isAbsolute(relPath))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `assertDirChainReal: dir must be strictly inside base (rel: ${relPath})`,
      "assertDirChainReal: dir must be strictly inside base",
    );
  let currentPath = baseDir;
  for (let segment of relPath.split(sep)) {
    currentPath = join(currentPath, segment);
    try {
      await (
        await open(currentPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
      ).close();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
        throw new SymlinkWriteRefusedError(
          `Refusing to write under symlinked or non-directory path: ${currentPath}`,
        );
      if (errnoCode === "ENOENT") return;
      throw error;
    }
  }
}
//@ chunk-0fzr619q.js:4021-4106 placement
class StagingDirTamperedError extends Error {
  constructor(message) {
    super(message);
    this.name = "StagingDirTamperedError";
  }
}
//@ chunk-0fzr619q.js:4106-4193 placement
/**
 * 抛出"暂存目录被篡改"错误并上报 sandbox_exec 失败。
 */
function throwStagingTampered(message) {
  logFeatureBad("sandbox_exec", "atomic_write_staging_dir_tampered");
  throw new StagingDirTamperedError(message);
}
//@ chunk-0fzr619q.js:4193-4245 placement
/**
 * 取出写入权限暂存的路径拼写（过期时拒绝）。
 */
function consumeWritePermission(session, filePath, accessKind = "write") {
  return consumePermissionStash(session, filePath, accessKind) ?? getPathsForPermissionCheck(filePath);
}
//@ chunk-0fzr619q.js:4245-4654 placement
/**
 * 从权限暂存中取出路径批准。
 */
function consumePermissionStash(session, filePath, accessKind) {
  let stashedPaths = session.session.writePermissionStash.consume(session.toolUseId, filePath, accessKind);
  if (stashedPaths === PERMISSION_STASH_EVICTED_SYMBOL)
    throw new (accessKind === "read" ? SymlinkReadRefusedError : SymlinkWriteRefusedError)(
      `Refusing to ${accessKind === "read" ? "read" : "write"} ${filePath}: its permission check expired before it ran (too many concurrent file operations). Retry.`,
    );
  if (stashedPaths !== undefined) return stashedPaths;
  if (session.toolUseId)
    logForDebugging(
      `takeApprovedPathsForWrite: no check-time stash for toolUseId=${session.toolUseId}; using fresh resolution`,
    );
  return;
}
//@ chunk-0fzr619q.js:4654-4695 placement (2.1.88 match: isFileReadDenied, 1)
/**
 * 取出读取权限暂存。
 */
function consumeReadPermission(filePath, toolPermissionContext) {
  return consumeWritePermission(filePath, toolPermissionContext, "read");
}
//@ chunk-0fzr619q.js:4843-4906 placement
/**
 * 路径是否存在。
 */
async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-0fzr619q.js:4906-5008 placement
/**
 * 路径存在/消失/不可读。
 */
async function pathPresence(filePath) {
  return lstat(filePath).then(
    () => "present",
    (error) => (isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? "gone" : "unreadable"),
  );
}
//@ chunk-0fzr619q.js:5008-5023 placement
/**
 * 有界读取的上限。
 */
var BOUNDED_READ_MAX = 262144;
//@ chunk-0fzr619q.js:5023-5407 placement
/**
 * 有界同步读取文件（可拒绝链接、只读常规文件）。
 */
function readBoundedSync(
  filePath,
  { maxBytes, symlinkAtPath = "follow", regularFileOnly = symlinkAtPath === "refuse" },
) {
  using span = slowLogging`fs.readBoundedSync(${filePath}, max ${maxBytes} bytes)`;
  let openFlags = "r";
  if (symlinkAtPath === "refuse")
    openFlags = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
  else if (regularFileOnly) openFlags = constants.O_RDONLY | constants.O_NONBLOCK;
  let fd = openSync(filePath, openFlags);
  try {
    if (regularFileOnly) {
      if (!fstatSync(fd).isFile())
        throw Object.assign(Error("EINVAL: not a regular file"), {
          code: "EINVAL",
        });
    }
    return readFdBounded(fd, filePath, maxBytes);
  } finally {
    closeSync(fd);
  }
}
//@ chunk-0fzr619q.js:5672-5731 placement
/**
 * 路径是否为 socket。
 */
function isSocket(fd) {
  try {
    return fstatSync(fd).isSocket();
  } catch {
    return false;
  }
}
//@ chunk-0fzr619q.js:5731-5809 placement
/**
 * 有界读取文件描述符内容（读到换行为止），读完关闭 fd。
 */
function readBoundedFdClose(fd, maxBytes) {
  try {
    return readFdBounded(fd, `fd ${fd}`, maxBytes, {
      untilNewline: true,
    });
  } finally {
    closeSync(fd);
  }
}
//@ chunk-0fzr619q.js:5809-6242 placement
/**
 * 有界读取文件描述符内容。
 */
function readFdBounded(fd, label, maxBytes, { untilNewline = false } = {}) {
  let chunks = [];
  let totalRead = 0;
  let readBuffer = Buffer.alloc(8192);
  while (true) {
    let bytesRead = readSync(fd, readBuffer, 0, readBuffer.length, null);
    if (bytesRead === 0) return Buffer.concat(chunks).toString("utf8");
    totalRead += bytesRead;
    if (totalRead > maxBytes)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `refusing to read ${label}: content exceeds ${maxBytes} byte limit`,
        "readBoundedSync: content exceeds byte limit",
      );
    let newlineIndex = untilNewline ? readBuffer.subarray(0, bytesRead).indexOf(10) : -1;
    chunks.push(Buffer.from(readBuffer.subarray(0, newlineIndex === -1 ? bytesRead : newlineIndex + 1)));
    if (newlineIndex !== -1) return Buffer.concat(chunks).toString("utf8");
  }
}
export {
  SymlinkWriteRefusedError,
  stagingPathFor,
  verifyStagingDir,
  openWriteFlags,
  HardLinkWriteRefusedError,
  pathExists,
  BOUNDED_READ_MAX,
  consumePermissionStash,
  readBoundedFdClose,
  readBoundedSync,
  isSocket,
  pathPresence,
  consumeWritePermission,
  SymlinkReadRefusedError,
  consumeReadPermission,
  recordStagingDirIdentity,
  throwStagingTampered,
  assertDirChainReal,
  StagingDirTamperedError,
};
