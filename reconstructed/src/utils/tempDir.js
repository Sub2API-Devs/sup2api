/**
 * utils/tempDir.ts
 *
 * 2.1.316 新增：临时目录解析与所有权校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9mf2agcn.js (13)
 * attribution: placement 13
 */
import { tmpdir as tmpdir_2 } from "os";
import {
  openSync,
  openSync as openSync_2,
  constants,
  constants as constants_2,
  constants as constants_3,
  lstatSync,
  lstatSync as lstatSync_2,
  fstatSync,
  fstatSync as fstatSync_2,
  fchmodSync,
  closeSync,
  closeSync as closeSync_2,
  mkdirSync,
} from "fs";
import { join } from "path";
import { createHash, randomUUID } from "crypto";
import { env } from "./env.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isDiskFullErrno,
} from "./errors.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";

/**
 * Claude 临时根目录：CLAUDE_CODE_TMPDIR，否则系统 tmpdir()。
 */
//@ chunk-9mf2agcn.js:6169-6235 placement = getClaudeTempDir (0.437)
function tmpdir() {
  let CLAUDE_CODE_TMPDIR = env.CLAUDE_CODE_TMPDIR;
  if (CLAUDE_CODE_TMPDIR) return CLAUDE_CODE_TMPDIR;
  return tmpdir_2();
}
//@ chunk-9mf2agcn.js:6235-6286 placement
var MAX_SAFE_TMPDIR_BYTES = 44,
  PDF_SCRATCH_DIR_PREFIX = "claude-pdf-",
  PREVIEW_COPY_DIR_PREFIX = "claude-preview-";
//@ chunk-9mf2agcn.js:6286-7597 placement
function verifyTempDirOwnership(e) {
  let n = process.getuid?.();
  if (n === void 0) return;
  let r = e.replace(/[\/]+$/, "") || e,
    o = "Set CLAUDE_CODE_TMPDIR to a directory you control, or ask an administrator to remove it.",
    s;
  try {
    s = openSync_2(r, constants_3.O_RDONLY | constants_3.O_DIRECTORY | constants_3.O_NOFOLLOW);
  } catch (error) {
    let u = getErrnoCode(error);
    if (u === "ELOOP" || u === "ENOTDIR")
      throw Error(
        `Temp directory ${e} is not a directory (may be an attacker-planted symlink). Refusing to use it. ${o}`,
      );
    if (u === "EACCES") {
      let l;
      try {
        let a = lstatSync_2(r);
        if (a.uid !== n) l = a.uid;
      } catch {}
      if (l !== void 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Temp directory ${e} is owned by uid ${l}, expected ${n}. Refusing to use it \u2014 another user may have pre-created it. ${o}`,
          "temp dir owned by another uid (EACCES at open); refusing to use it",
        );
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Temp directory ${e} is not readable (its mode may have been altered, or a path component denies search). Refusing to use it \u2014 restore its permissions (chmod 0700) or remove it. ${o}`,
        "temp dir unreadable (owner-read or path search bit missing); refusing to use it",
      );
    }
    throw error;
  }
  try {
    let c = fstatSync_2(s);
    if (c.uid !== n) {
      if (n === 0 && env.CLAUDE_CODE_CONTAINER_ID) {
        logForDiagnosticsNoPII("warn", "tempdir_owner_mismatch", { observed_uid: c.uid });
        return;
      }
      throw Error(
        `Temp directory ${e} is owned by uid ${c.uid}, expected ${n}. Refusing to use it \u2014 another user may have pre-created it. ${o}`,
      );
    }
    if ((c.mode & 511) !== 448) fchmodSync(s, 448);
  } finally {
    closeSync_2(s);
  }
}
//@ chunk-9mf2agcn.js:7597-7740 placement
class TempDirState {
  ensured = void 0;
  childProcessTmpDirMemo = void 0;
  markEnsured(e) {
    this.ensured = e;
  }
  setChildProcessTmpDirMemo(e) {
    this.childProcessTmpDirMemo = e;
  }
}
//@ chunk-9mf2agcn.js:7740-7791 placement
var tempDirState = new HostScoped(() => new TempDirState()),
  TEMP_ROOT_VOLUME_FULL = "temp_root_volume_full";
/**
 * "claude-<uid>"（临时目录名等）。旧版名 modelMatchesVersionPrefix_2 为错配，与模型无关。
 */
//@ chunk-9mf2agcn.js:7791-7846 placement = modelMatchesVersionPrefix (0.808)
function claudeTempDirName() {
  return `claude-${process.getuid?.() ?? 0}`;
}
//@ chunk-9mf2agcn.js:7846-7885 placement
function claudeTempDir() {
  return resolveTempDir(tempDirState.of(getRootSession().host));
}
/**
 * 解析会话临时目录（无盘会话不可用），校验所有权与可用空间。
 */
//@ chunk-9mf2agcn.js:7885-8647 placement
function resolveTempDir(e) {
  if (isDiskless())
    throw Error(
      "The temp directory is unavailable in a diskless session: nothing is created, verified or written under the shared per-uid temp root",
    );
  let n = tmpdir(),
    r = join(n, claudeTempDirName());
  if (r !== e.ensured) {
    if (typeof process.getuid === "function") {
      try {
        mkdirSync(r, { recursive: !0, mode: 448 });
      } catch (error) {
        if (isDiskFullErrno(error)) {
          let s = getErrnoCode(error),
            c =
              s === "EDQUOT"
                ? `your disk quota on the volume holding ${n} is used up (${s})`
                : `the volume holding ${n} is full (${s})`;
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Claude Code's temporary directory ${r} could not be created: ${c}. Free space on that volume, or set CLAUDE_CODE_TMPDIR to a directory on another one, then try again.`,
            "claude temp dir not created: volume full (ENOSPC/EDQUOT)",
            TEMP_ROOT_VOLUME_FULL,
          );
        }
        throw error;
      }
      verifyTempDirOwnership(r);
    } else
      try {
        mkdirSync(r, { recursive: !0, mode: 448 });
      } catch {}
    e.markEnsured(r);
  }
  return r;
}
//@ chunk-9mf2agcn.js:8647-8718 placement
var PLUGIN_TOOL_STAGING_DIRNAME = "plugin-tool-staging",
  PLUGIN_TOOL_STAGING_GUARD_FLAG = "bot_protected_tengu_graceful_dream";
//@ chunk-9mf2agcn.js:8718-8838 placement
function pluginToolStagingRoot() {
  let e = claudeTempDir();
  (mkdirSync(e, { recursive: !0, mode: 448 }), verifyTempDirOwnership(e));
  let n = join(e, PLUGIN_TOOL_STAGING_DIRNAME);
  return (mkdirSync(n, { recursive: !0, mode: 448 }), verifyTempDirOwnership(n), n);
}
//@ chunk-9mf2agcn.js:8838-9117 placement
function childProcessTmpDir() {
  let of = tempDirState.of(getRootSession().host),
    n = resolveTempDir(of);
  if (Buffer.byteLength(n) <= MAX_SAFE_TMPDIR_BYTES) return n;
  let r = tmpdir_2(),
    childProcessTmpDirMemo = of.childProcessTmpDirMemo;
  if (childProcessTmpDirMemo?.forDir === n) return childProcessTmpDirMemo.result;
  let s = join(r, claudeTempDirName()),
    c = s;
  try {
    (mkdirSync(s, { recursive: !0, mode: 448 }), verifyTempDirOwnership(s));
  } catch {
    c = n;
  }
  return (of.setChildProcessTmpDirMemo({ forDir: n, result: c }), c);
}
//@ chunk-9mf2agcn.js:9117-9192 placement
function socketSafeTmpdir() {
  let e = tmpdir();
  if (Buffer.byteLength(e) <= MAX_SAFE_TMPDIR_BYTES) return e;
  return tmpdir_2();
}
/**
 * 在临时目录下生成带随机后缀的临时文件路径。
 */
//@ chunk-9mf2agcn.js:9192-9352 placement = generateTempFilePath (1)
function generateTempFilePath(prefix = "claude-prompt", extension = ".md", options) {
  let id = options?.contentHash
    ? createHash("sha256").update(options.contentHash).digest("hex").slice(0, 16)
    : randomUUID();
  return join(claudeTempDir(), `${prefix}-${id}${extension}`);
}

export {
  generateTempFilePath,
  claudeTempDir,
  tmpdir,
  pluginToolStagingRoot,
  verifyTempDirOwnership,
  PDF_SCRATCH_DIR_PREFIX,
  PREVIEW_COPY_DIR_PREFIX,
  childProcessTmpDir,
  MAX_SAFE_TMPDIR_BYTES,
  claudeTempDirName,
  PLUGIN_TOOL_STAGING_GUARD_FLAG,
  PLUGIN_TOOL_STAGING_DIRNAME,
  socketSafeTmpdir,
  TEMP_ROOT_VOLUME_FULL,
};
