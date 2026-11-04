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
import { openSync, constants, lstatSync, fstatSync, fchmodSync, closeSync, mkdirSync } from "fs";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-9mf2agcn.js:6169-6235 placement = getClaudeTempDir (0.437)
/**
 * Claude 临时根目录：CLAUDE_CODE_TMPDIR，否则系统 tmpdir()。
 */
function tmpdir() {
  let CLAUDE_CODE_TMPDIR = env.CLAUDE_CODE_TMPDIR;
  if (CLAUDE_CODE_TMPDIR) return CLAUDE_CODE_TMPDIR;
  return tmpdir_2();
}
//@ chunk-9mf2agcn.js:6235-6286 placement
var MAX_SAFE_TMPDIR_BYTES = 44;
var PDF_SCRATCH_DIR_PREFIX = "claude-pdf-";
var PREVIEW_COPY_DIR_PREFIX = "claude-preview-";
//@ chunk-9mf2agcn.js:6286-7597 placement
function verifyTempDirOwnership(dir) {
  let uid = process.getuid?.();
  if (uid === undefined) return;
  let realDir = dir.replace(/[\/]+$/, "") || dir;
  let tempDirHint =
    "Set CLAUDE_CODE_TMPDIR to a directory you control, or ask an administrator to remove it.";
  let dirFd;
  try {
    dirFd = openSync(realDir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
      throw Error(
        `Temp directory ${dir} is not a directory (may be an attacker-planted symlink). Refusing to use it. ${tempDirHint}`,
      );
    if (errnoCode === "EACCES") {
      let ownerUid;
      try {
        let dirStat = lstatSync(realDir);
        if (dirStat.uid !== uid) ownerUid = dirStat.uid;
      } catch {}
      if (ownerUid !== undefined)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Temp directory ${dir} is owned by uid ${ownerUid}, expected ${uid}. Refusing to use it \u2014 another user may have pre-created it. ${tempDirHint}`,
          "temp dir owned by another uid (EACCES at open); refusing to use it",
        );
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Temp directory ${dir} is not readable (its mode may have been altered, or a path component denies search). Refusing to use it \u2014 restore its permissions (chmod 0700) or remove it. ${tempDirHint}`,
        "temp dir unreadable (owner-read or path search bit missing); refusing to use it",
      );
    }
    throw error;
  }
  try {
    let dirStat = fstatSync(dirFd);
    if (dirStat.uid !== uid) {
      if (uid === 0 && env.CLAUDE_CODE_CONTAINER_ID) {
        logForDiagnosticsNoPII("warn", "tempdir_owner_mismatch", {
          observed_uid: dirStat.uid,
        });
        return;
      }
      throw Error(
        `Temp directory ${dir} is owned by uid ${dirStat.uid}, expected ${uid}. Refusing to use it \u2014 another user may have pre-created it. ${tempDirHint}`,
      );
    }
    if ((dirStat.mode & 511) !== 448) fchmodSync(dirFd, 448);
  } finally {
    closeSync(dirFd);
  }
}
//@ chunk-9mf2agcn.js:7597-7740 placement
class TempDirState {
  ensured = undefined;
  childProcessTmpDirMemo = undefined;
  markEnsured(ensured) {
    this.ensured = ensured;
  }
  setChildProcessTmpDirMemo(childProcessTmpDirMemo) {
    this.childProcessTmpDirMemo = childProcessTmpDirMemo;
  }
}
//@ chunk-9mf2agcn.js:7740-7791 placement
var tempDirState; // deferred: uses TempDirState of its import cycle while loading; runs once the cycle is complete
var TEMP_ROOT_VOLUME_FULL;
deferInit("chunk-9mf2agcn.js:7740", () => {
  tempDirState = new HostScoped(() => new TempDirState());
  TEMP_ROOT_VOLUME_FULL = "temp_root_volume_full";
});
//@ chunk-9mf2agcn.js:7791-7846 placement = modelMatchesVersionPrefix (0.808)
/**
 * "claude-<uid>"（临时目录名等）。旧版名 modelMatchesVersionPrefix_2 为错配，与模型无关。
 */
function claudeTempDirName() {
  return `claude-${process.getuid?.() ?? 0}`;
}
//@ chunk-9mf2agcn.js:7846-7885 placement
function claudeTempDir() {
  return resolveTempDir(tempDirState.of(getRootSession().host));
}
//@ chunk-9mf2agcn.js:7885-8647 placement
/**
 * 解析会话临时目录（无盘会话不可用），校验所有权与可用空间。
 */
function resolveTempDir(state) {
  if (isDiskless())
    throw Error(
      "The temp directory is unavailable in a diskless session: nothing is created, verified or written under the shared per-uid temp root",
    );
  let tmp = tmpdir();
  let dir = join(tmp, claudeTempDirName());
  if (dir !== state.ensured) {
    if (typeof process.getuid === "function") {
      try {
        mkdirSync(dir, {
          recursive: true,
          mode: 448,
        });
      } catch (error) {
        if (isDiskFullErrno(error)) {
          let errnoCode = getErrnoCode(error);
          let reason =
            errnoCode === "EDQUOT"
              ? `your disk quota on the volume holding ${tmp} is used up (${errnoCode})`
              : `the volume holding ${tmp} is full (${errnoCode})`;
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Claude Code's temporary directory ${dir} could not be created: ${reason}. Free space on that volume, or set CLAUDE_CODE_TMPDIR to a directory on another one, then try again.`,
            "claude temp dir not created: volume full (ENOSPC/EDQUOT)",
            TEMP_ROOT_VOLUME_FULL,
          );
        }
        throw error;
      }
      verifyTempDirOwnership(dir);
    } else
      try {
        mkdirSync(dir, {
          recursive: true,
          mode: 448,
        });
      } catch {}
    state.markEnsured(dir);
  }
  return dir;
}
//@ chunk-9mf2agcn.js:8647-8718 placement
var PLUGIN_TOOL_STAGING_DIRNAME = "plugin-tool-staging";
var PLUGIN_TOOL_STAGING_GUARD_FLAG = "bot_protected_tengu_graceful_dream";
//@ chunk-9mf2agcn.js:8718-8838 placement
function pluginToolStagingRoot() {
  let root = claudeTempDir();
  mkdirSync(root, {
    recursive: true,
    mode: 448,
  });
  verifyTempDirOwnership(root);
  let staging = join(root, PLUGIN_TOOL_STAGING_DIRNAME);
  mkdirSync(staging, {
    recursive: true,
    mode: 448,
  });
  verifyTempDirOwnership(staging);
  return staging;
}
//@ chunk-9mf2agcn.js:8838-9117 placement
function childProcessTmpDir() {
  let state = tempDirState.of(getRootSession().host);
  let tempDir = resolveTempDir(state);
  if (Buffer.byteLength(tempDir) <= MAX_SAFE_TMPDIR_BYTES) return tempDir;
  let tmp = tmpdir_2();
  let childProcessTmpDirMemo = state.childProcessTmpDirMemo;
  if (childProcessTmpDirMemo?.forDir === tempDir) return childProcessTmpDirMemo.result;
  let dir = join(tmp, claudeTempDirName());
  let result = dir;
  try {
    mkdirSync(dir, {
      recursive: true,
      mode: 448,
    });
    verifyTempDirOwnership(dir);
  } catch {
    result = tempDir;
  }
  state.setChildProcessTmpDirMemo({
    forDir: tempDir,
    result,
  });
  return result;
}
//@ chunk-9mf2agcn.js:9117-9192 placement
function socketSafeTmpdir() {
  let tmp = tmpdir();
  if (Buffer.byteLength(tmp) <= MAX_SAFE_TMPDIR_BYTES) return tmp;
  return tmpdir_2();
}
//@ chunk-9mf2agcn.js:9192-9352 placement = generateTempFilePath (1)
/**
 * 在临时目录下生成带随机后缀的临时文件路径。
 */
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
  PLUGIN_TOOL_STAGING_GUARD_FLAG,
  PLUGIN_TOOL_STAGING_DIRNAME,
  claudeTempDirName,
  socketSafeTmpdir,
  TEMP_ROOT_VOLUME_FULL,
};
