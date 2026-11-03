/**
 * utils/fsSafety/atomicWriteStaging.ts
 *
 * 2.1.316 新增：生成原子写入暂存路径（检查父目录）；验证原子写入的暂存目录仍可用（身份未变）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-847rdpmn.js (24)
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

//@ chunk-847rdpmn.js:1235-1516 placement
/**
 * 记录暂存目录的 dev/ino 与打开的句柄（替换或重置时关闭旧句柄）。
 */
class StagingDirIdentities {
  identities = new Map();
  record(e, dev, ino, fd) {
    let stagingPath = resolveStagingPath(e);
    let o = this.identities.get(stagingPath);
    if (o)
      try {
        closeSync(o.fd);
      } catch {}
    this.identities.set(stagingPath, {
      dev,
      ino,
      fd,
    });
  }
  identity(e) {
    return this.identities.get(resolveStagingPath(e));
  }
  reset() {
    for (let { fd } of this.identities.values())
      try {
        closeSync(fd);
      } catch {}
    this.identities.clear();
  }
}
//@ chunk-847rdpmn.js:1516-1541 placement
var stagingIdentitiesRegistry = new HostScoped(() => new StagingDirIdentities());
//@ chunk-847rdpmn.js:1541-1577 placement
function currentStagingIdentities() {
  return stagingIdentitiesRegistry.of(getRootSession().host);
}
//@ chunk-847rdpmn.js:1577-1603 placement
function resolveStagingPath(e) {
  return resolve(e);
}
//@ chunk-847rdpmn.js:1603-1645 placement
/**
 * 记录原子写入暂存目录的身份（供后续校验未变）。
 */
function recordStagingDirIdentity(e, n, r, s) {
  currentStagingIdentities().record(e, n, r, s);
}
//@ chunk-847rdpmn.js:1645-2157 placement
/**
 * 验证原子写入的暂存目录仍可用（身份未变）。
 */
function verifyStagingDir(stagingDir) {
  if (!stagingDir) return;
  let n = currentStagingIdentities().identity(stagingDir);
  if (!n) return;
  let r;
  try {
    r = openSync(stagingDir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP" || errnoCode === "EACCES")
      throwStagingTampered(
        `Staging dir ${stagingDir} was established for a sandboxed command but is now unopenable (${errnoCode}) \u2014 refusing atomic write`,
      );
    throw error;
  }
  try {
    let s = fstatSync(r);
    if (s.dev !== n.dev || s.ino !== n.ino)
      throwStagingTampered(
        `Staging dir ${stagingDir} identity changed (expected ${n.dev}/${n.ino}, found ${s.dev}/${s.ino}) \u2014 refusing atomic write`,
      );
  } finally {
    closeSync(r);
  }
}
//@ chunk-847rdpmn.js:2157-3173 placement
/**
 * 生成原子写入暂存路径（检查父目录）。
 */
function stagingPathFor(stagingDir, n, r, s) {
  let u = `${n}${r}`;
  if (!stagingDir) return u;
  let o = currentStagingIdentities().identity(stagingDir);
  if (s && dirname(n) !== dirname(stagingDir)) {
    verifyStagingDir(stagingDir);
    return u;
  }
  let a = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  try {
    closeSync(openSync(dirname(stagingDir), a));
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR") {
      if (o)
        throwStagingTampered(
          `Staging dir parent ${dirname(stagingDir)} is ${errnoCode} but a sandboxed command established ${stagingDir} \u2014 refusing sibling fallback`,
        );
      if (s) return u;
      throw new SymlinkWriteRefusedError(
        `Refusing to stage atomic write under non-directory parent: ${dirname(stagingDir)}`,
      );
    }
    if (!isENOENT(error)) throw error;
    if (o)
      throwStagingTampered(
        `Staging dir parent ${dirname(stagingDir)} is absent but a sandboxed command established ${stagingDir} \u2014 refusing sibling fallback`,
      );
    return u;
  }
  let f;
  try {
    f = openSync(stagingDir, a);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP") {
      if (o)
        throwStagingTampered(
          `Staging dir ${stagingDir} is ${errnoCode} but a sandboxed command established it \u2014 refusing sibling fallback`,
        );
      return u;
    }
    throw error;
  }
  try {
    if (o) {
      let y = fstatSync(f);
      if (y.dev !== o.dev || y.ino !== o.ino)
        throwStagingTampered(
          `Staging dir ${stagingDir} identity changed (expected ${o.dev}/${o.ino}, found ${y.dev}/${y.ino}) \u2014 refusing atomic write`,
        );
    }
  } finally {
    closeSync(f);
  }
  return join(stagingDir, `${basename(n)}${r}`);
}
//@ chunk-847rdpmn.js:3173-3258 placement
/**
 * 拒绝通过符号链接写入的错误（及硬链接子类）。
 */
class SymlinkWriteRefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = "SymlinkWriteRefusedError";
  }
}
//@ chunk-847rdpmn.js:3258-3351 placement
class HardLinkWriteRefusedError extends SymlinkWriteRefusedError {
  constructor(e, nlink) {
    super(hardlinkedRefusalText(e, nlink));
    this.name = "HardLinkWriteRefusedError";
  }
}
//@ chunk-847rdpmn.js:3351-3425 placement
/**
 * 生成写入打开的 flags 描述（O_WRONLY|O_CREAT 加上调用方标志）。
 */
function openWriteFlags(e) {
  return {
    flags: constants.O_WRONLY | constants.O_CREAT | e,
    flagsIfMissing: undefined,
  };
}
//@ chunk-847rdpmn.js:3425-3509 placement
/**
 * 拒绝通过符号链接读取的错误。
 */
class SymlinkReadRefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = "SymlinkReadRefusedError";
  }
}
//@ chunk-847rdpmn.js:3509-3988 placement
/**
 * 确认目录链在基目录内且没有链接。
 */
async function assertDirChainReal(e, n) {
  let r = relative(e, n);
  if (r === "" || r.startsWith("..") || isAbsolute(r))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `assertDirChainReal: dir must be strictly inside base (rel: ${r})`,
      "assertDirChainReal: dir must be strictly inside base",
    );
  let s = e;
  for (let u of r.split(sep)) {
    s = join(s, u);
    try {
      await (await open(s, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)).close();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
        throw new SymlinkWriteRefusedError(`Refusing to write under symlinked or non-directory path: ${s}`);
      if (errnoCode === "ENOENT") return;
      throw error;
    }
  }
}
//@ chunk-847rdpmn.js:3988-4073 placement
class StagingDirTamperedError extends Error {
  constructor(message) {
    super(message);
    this.name = "StagingDirTamperedError";
  }
}
//@ chunk-847rdpmn.js:4073-4160 placement
/**
 * 抛出"暂存目录被篡改"错误并上报 sandbox_exec 失败。
 */
function throwStagingTampered(message) {
  logFeatureBad("sandbox_exec", "atomic_write_staging_dir_tampered");
  throw new StagingDirTamperedError(message);
}
//@ chunk-847rdpmn.js:4160-4212 placement
/**
 * 取出写入权限暂存的路径拼写（过期时拒绝）。
 */
function consumeWritePermission(e, n, r = "write") {
  return consumePermissionStash(e, n, r) ?? getPathsForPermissionCheck(n);
}
//@ chunk-847rdpmn.js:4212-4621 placement
/**
 * 从权限暂存中取出路径批准。
 */
function consumePermissionStash(e, n, r) {
  let s = e.session.writePermissionStash.consume(e.toolUseId, n, r);
  if (s === PERMISSION_STASH_EVICTED_SYMBOL)
    throw new (r === "read" ? SymlinkReadRefusedError : SymlinkWriteRefusedError)(
      `Refusing to ${r === "read" ? "read" : "write"} ${n}: its permission check expired before it ran (too many concurrent file operations). Retry.`,
    );
  if (s !== undefined) return s;
  if (e.toolUseId)
    logForDebugging(
      `takeApprovedPathsForWrite: no check-time stash for toolUseId=${e.toolUseId}; using fresh resolution`,
    );
  return;
}
//@ chunk-847rdpmn.js:4621-4662 placement = isFileReadDenied (1)
/**
 * 取出读取权限暂存。
 */
function consumeReadPermission(filePath, toolPermissionContext) {
  return consumeWritePermission(filePath, toolPermissionContext, "read");
}
//@ chunk-847rdpmn.js:4810-4873 placement
/**
 * 路径是否存在。
 */
async function pathExists(e) {
  try {
    await stat(e);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-847rdpmn.js:4873-4974 placement
/**
 * 路径存在/消失/不可读。
 */
async function pathPresence(e) {
  return lstat(e).then(
    () => "present",
    (error) => (isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? "gone" : "unreadable"),
  );
}
//@ chunk-847rdpmn.js:4974-4989 placement
/**
 * 有界读取的上限。
 */
var BOUNDED_READ_MAX = 262144;
//@ chunk-847rdpmn.js:4989-5373 placement
/**
 * 有界同步读取文件（可拒绝链接、只读常规文件）。
 */
function readBoundedSync(
  e,
  { maxBytes, symlinkAtPath = "follow", regularFileOnly = symlinkAtPath === "refuse" },
) {
  using u = slowLogging`fs.readBoundedSync(${e}, max ${maxBytes} bytes)`;
  let o = "r";
  if (symlinkAtPath === "refuse") o = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
  else if (regularFileOnly) o = constants.O_RDONLY | constants.O_NONBLOCK;
  let a = openSync(e, o);
  try {
    if (regularFileOnly) {
      if (!fstatSync(a).isFile())
        throw Object.assign(Error("EINVAL: not a regular file"), {
          code: "EINVAL",
        });
    }
    return readFdBounded(a, e, maxBytes);
  } finally {
    closeSync(a);
  }
}
//@ chunk-847rdpmn.js:5638-5697 placement
/**
 * 路径是否为 socket。
 */
function isSocket(e) {
  try {
    return fstatSync(e).isSocket();
  } catch {
    return false;
  }
}
//@ chunk-847rdpmn.js:5697-5775 placement
/**
 * 有界读取文件描述符内容（读到换行为止），读完关闭 fd。
 */
function readBoundedFdClose(e, maxBytes) {
  try {
    return readFdBounded(e, `fd ${e}`, maxBytes, {
      untilNewline: true,
    });
  } finally {
    closeSync(e);
  }
}
//@ chunk-847rdpmn.js:5775-6208 placement
/**
 * 有界读取文件描述符内容。
 */
function readFdBounded(e, n, r, { untilNewline: s = false } = {}) {
  let u = [];
  let o = 0;
  let a = Buffer.alloc(8192);
  while (true) {
    let f = readSync(e, a, 0, a.length, null);
    if (f === 0) return Buffer.concat(u).toString("utf8");
    o += f;
    if (o > r)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `refusing to read ${n}: content exceeds ${r} byte limit`,
        "readBoundedSync: content exceeds byte limit",
      );
    let y = s ? a.subarray(0, f).indexOf(10) : -1;
    u.push(Buffer.from(a.subarray(0, y === -1 ? f : y + 1)));
    if (y !== -1) return Buffer.concat(u).toString("utf8");
  }
}
export {
  consumeWritePermission,
  SymlinkWriteRefusedError,
  readBoundedSync,
  pathExists,
  pathPresence,
  stagingPathFor,
  verifyStagingDir,
  HardLinkWriteRefusedError,
  StagingDirTamperedError,
  openWriteFlags,
  BOUNDED_READ_MAX,
  consumePermissionStash,
  isSocket,
  readBoundedFdClose,
  assertDirChainReal,
  SymlinkReadRefusedError,
  recordStagingDirIdentity,
  throwStagingTampered,
  consumeReadPermission,
};
