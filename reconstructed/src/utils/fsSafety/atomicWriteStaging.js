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
import { BMe } from "../../bootstrap/sessionSlices.js";
import { logForDebugging } from "../debug.js";
import { slowLogging } from "../slowOperations.js";

/**
 * 记录暂存目录的 dev/ino 与打开的句柄（替换或重置时关闭旧句柄）。
 */
//@ chunk-847rdpmn.js:1235-1516 placement
class StagingDirIdentities {
  identities = new Map();
  record(e, n, r, s) {
    let u = Z(e),
      o = this.identities.get(u);
    if (o)
      try {
        closeSync(o.fd);
      } catch {}
    this.identities.set(u, { dev: n, ino: r, fd: s });
  }
  identity(e) {
    return this.identities.get(Z(e));
  }
  reset() {
    for (let { fd: fd } of this.identities.values())
      try {
        closeSync(fd);
      } catch {}
    this.identities.clear();
  }
}
//@ chunk-847rdpmn.js:1516-1541 placement
var ge = new HostScoped(() => new StagingDirIdentities());
//@ chunk-847rdpmn.js:1541-1577 placement
function V() {
  return ge.of(getRootSession().host);
}
//@ chunk-847rdpmn.js:1577-1603 placement
function Z(e) {
  return resolve(e);
}
//@ chunk-847rdpmn.js:1603-1645 placement
function cMi(e, n, r, s) {
  V().record(e, n, r, s);
}
/**
 * 验证原子写入的暂存目录仍可用（身份未变）。
 */
//@ chunk-847rdpmn.js:1645-2157 placement
function verifyStagingDir(e) {
  if (!e) return;
  let identity = V().identity(e);
  if (!identity) return;
  let r;
  try {
    r = openSync(e, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  } catch (error) {
    let u = getErrnoCode(error);
    if (u === "ENOENT" || u === "ENOTDIR" || u === "ELOOP" || u === "EACCES")
      YMt(
        `Staging dir ${e} was established for a sandboxed command but is now unopenable (${u}) \u2014 refusing atomic write`,
      );
    throw error;
  }
  try {
    let s = fstatSync(r);
    if (s.dev !== identity.dev || s.ino !== identity.ino)
      YMt(
        `Staging dir ${e} identity changed (expected ${identity.dev}/${identity.ino}, found ${s.dev}/${s.ino}) \u2014 refusing atomic write`,
      );
  } finally {
    closeSync(r);
  }
}
/**
 * 生成原子写入暂存路径（检查父目录）。
 */
//@ chunk-847rdpmn.js:2157-3173 placement
function stagingPathFor(e, n, r, s) {
  let u = `${n}${r}`;
  if (!e) return u;
  let identity = V().identity(e);
  if (s && dirname(n) !== dirname(e)) return (verifyStagingDir(e), u);
  let a = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  try {
    closeSync(openSync(dirname(e), a));
  } catch (error) {
    let g = getErrnoCode(error);
    if (g === "ELOOP" || g === "ENOTDIR") {
      if (identity)
        YMt(
          `Staging dir parent ${dirname(e)} is ${g} but a sandboxed command established ${e} \u2014 refusing sibling fallback`,
        );
      if (s) return u;
      throw new SymlinkWriteRefusedError(
        `Refusing to stage atomic write under non-directory parent: ${dirname(e)}`,
      );
    }
    if (!isENOENT(error)) throw error;
    if (identity)
      YMt(
        `Staging dir parent ${dirname(e)} is absent but a sandboxed command established ${e} \u2014 refusing sibling fallback`,
      );
    return u;
  }
  let f;
  try {
    f = openSync(e, a);
  } catch (error) {
    let g = getErrnoCode(error);
    if (g === "ENOENT" || g === "ENOTDIR" || g === "ELOOP") {
      if (identity)
        YMt(
          `Staging dir ${e} is ${g} but a sandboxed command established it \u2014 refusing sibling fallback`,
        );
      return u;
    }
    throw error;
  }
  try {
    if (identity) {
      let y = fstatSync(f);
      if (y.dev !== identity.dev || y.ino !== identity.ino)
        YMt(
          `Staging dir ${e} identity changed (expected ${identity.dev}/${identity.ino}, found ${y.dev}/${y.ino}) \u2014 refusing atomic write`,
        );
    }
  } finally {
    closeSync(f);
  }
  return join(e, `${basename(n)}${r}`);
}
/**
 * 拒绝通过符号链接写入的错误（及硬链接子类）。
 */
//@ chunk-847rdpmn.js:3173-3258 placement
class SymlinkWriteRefusedError extends Error {
  constructor(e) {
    super(e);
    this.name = "SymlinkWriteRefusedError";
  }
}
//@ chunk-847rdpmn.js:3258-3351 placement
class HardLinkWriteRefusedError extends SymlinkWriteRefusedError {
  constructor(e, n) {
    super(hardlinkedRefusalText(e, n));
    this.name = "HardLinkWriteRefusedError";
  }
}
//@ chunk-847rdpmn.js:3351-3425 placement
function re(e) {
  return { flags: constants.O_WRONLY | constants.O_CREAT | e, flagsIfMissing: void 0 };
}
/**
 * 拒绝通过符号链接读取的错误。
 */
//@ chunk-847rdpmn.js:3425-3509 placement
class SymlinkReadRefusedError extends Error {
  constructor(e) {
    super(e);
    this.name = "SymlinkReadRefusedError";
  }
}
/**
 * 确认目录链在基目录内且没有链接。
 */
//@ chunk-847rdpmn.js:3509-3988 placement
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
      let a = getErrnoCode(error);
      if (a === "ELOOP" || a === "ENOTDIR")
        throw new SymlinkWriteRefusedError(`Refusing to write under symlinked or non-directory path: ${s}`);
      if (a === "ENOENT") return;
      throw error;
    }
  }
}
//@ chunk-847rdpmn.js:3988-4073 placement
class StagingDirTamperedError extends Error {
  constructor(e) {
    super(e);
    this.name = "StagingDirTamperedError";
  }
}
//@ chunk-847rdpmn.js:4073-4160 placement
function YMt(e) {
  throw (logFeatureBad("sandbox_exec", "atomic_write_staging_dir_tampered"), new StagingDirTamperedError(e));
}
/**
 * 取出写入权限暂存的路径拼写（过期时拒绝）。
 */
//@ chunk-847rdpmn.js:4160-4212 placement
function consumeWritePermission(e, n, r = "write") {
  return consumePermissionStash(e, n, r) ?? getPathsForPermissionCheck(n);
}
/**
 * 从权限暂存中取出路径批准。
 */
//@ chunk-847rdpmn.js:4212-4621 placement
function consumePermissionStash(e, n, r) {
  let consume = e.session.writePermissionStash.consume(e.toolUseId, n, r);
  if (consume === BMe)
    throw new (r === "read" ? SymlinkReadRefusedError : SymlinkWriteRefusedError)(
      `Refusing to ${r === "read" ? "read" : "write"} ${n}: its permission check expired before it ran (too many concurrent file operations). Retry.`,
    );
  if (consume !== void 0) return consume;
  if (e.toolUseId)
    logForDebugging(
      `takeApprovedPathsForWrite: no check-time stash for toolUseId=${e.toolUseId}; using fresh resolution`,
    );
  return;
}
/**
 * 取出读取权限暂存。
 */
//@ chunk-847rdpmn.js:4621-4662 placement = isFileReadDenied (1)
function consumeReadPermission(filePath, toolPermissionContext) {
  return consumeWritePermission(filePath, toolPermissionContext, "read");
}
/**
 * 路径是否存在。
 */
//@ chunk-847rdpmn.js:4810-4873 placement
async function pathExists(e) {
  try {
    return (await stat(e), !0);
  } catch {
    return !1;
  }
}
/**
 * 路径存在/消失/不可读。
 */
//@ chunk-847rdpmn.js:4873-4974 placement
async function pathPresence(e) {
  return lstat(e).then(
    () => "present",
    (n) => (isENOENT(n) || getErrnoCode(n) === "ENOTDIR" ? "gone" : "unreadable"),
  );
}
/**
 * 有界读取的上限。
 */
//@ chunk-847rdpmn.js:4974-4989 placement
var BOUNDED_READ_MAX = 262144;
/**
 * 有界同步读取文件（可拒绝链接、只读常规文件）。
 */
//@ chunk-847rdpmn.js:4989-5373 placement
function readBoundedSync(
  e,
  {
    maxBytes: maxBytes,
    symlinkAtPath: symlinkAtPath = "follow",
    regularFileOnly: regularFileOnly = symlinkAtPath === "refuse",
  },
) {
  using u = slowLogging`fs.readBoundedSync(${e}, max ${maxBytes} bytes)`;
  let o = "r";
  if (symlinkAtPath === "refuse") o = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
  else if (regularFileOnly) o = constants.O_RDONLY | constants.O_NONBLOCK;
  let a = openSync(e, o);
  try {
    if (regularFileOnly) {
      if (!fstatSync(a).isFile())
        throw Object.assign(Error("EINVAL: not a regular file"), { code: "EINVAL" });
    }
    return readFdBounded(a, e, maxBytes);
  } finally {
    closeSync(a);
  }
}
/**
 * 路径是否为 socket。
 */
//@ chunk-847rdpmn.js:5638-5697 placement
function isSocket(e) {
  try {
    return fstatSync(e).isSocket();
  } catch {
    return !1;
  }
}
//@ chunk-847rdpmn.js:5697-5775 placement
function he(e, n) {
  try {
    return readFdBounded(e, `fd ${e}`, n, { untilNewline: !0 });
  } finally {
    closeSync(e);
  }
}
/**
 * 有界读取文件描述符内容。
 */
//@ chunk-847rdpmn.js:5775-6208 placement
function readFdBounded(e, n, r, { untilNewline: s = !1 } = {}) {
  let u = [],
    o = 0,
    alloc = Buffer.alloc(8192);
  while (!0) {
    let f = readSync(e, alloc, 0, alloc.length, null);
    if (f === 0) return Buffer.concat(u).toString("utf8");
    if (((o += f), o > r))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `refusing to read ${n}: content exceeds ${r} byte limit`,
        "readBoundedSync: content exceeds byte limit",
      );
    let y = s ? alloc.subarray(0, f).indexOf(10) : -1;
    if ((u.push(Buffer.from(alloc.subarray(0, y === -1 ? f : y + 1))), y !== -1))
      return Buffer.concat(u).toString("utf8");
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
  re,
  BOUNDED_READ_MAX,
  consumePermissionStash,
  isSocket,
  he,
  assertDirChainReal,
  SymlinkReadRefusedError,
  consumeReadPermission,
  cMi,
  YMt,
};
