/**
 * utils/auth/oauthRefreshLock.ts
 *
 * 2.1.316 新增：核对锁持有者（是否已被接管、记录是否匹配）；写入 OAuth 刷新锁的持有者记录等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (17)
 * attribution: placement 17
 */
import { lstat, unlink, rmdir } from "fs/promises";
import { join } from "path";
import { mkdirSync, rmdirSync, stat as stat_2, statSync, utimes, utimesSync } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, string } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  ownProcStartAsync,
  looksLikeFullHostProcessTable,
  isProbeablePid,
  isProcessProvablyGone,
  isExitedProcessAsync,
  provenSameProcessAsync,
} from "../processIdentity.js";
import { ownPidDomain, ownPidSpace } from "../pidSpace.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, getErrnoCode } from "../errors.js";
import { readSmallFileOrNull } from "../readSmallFile.js";
import { HostScoped } from "../hostScoped.js";
import { createSignal } from "../signal.js";

//@ chunk-aepeg2w5.js:310460-310734 placement
/**
 * 锁持有者记录的文件名（.oauth_refresh.lock.owner）。
 */
var TENGU_QUIET_MARTEN = "tengu_quiet_marten";
var TENGU_ZANY_BOOK = "tengu_zany_book";
var LOCK_OWNER_FILE_NAME = ".oauth_refresh.lock.owner";
var MAX_LOCK_OWNER_BYTES = 4096;
var lockOwnerSchema = DoctorLazy(() =>
  u({
    pid: E().int(),
    procStart: string().max(64).optional(),
    pidDomain: string().max(512),
    pidSpace: string().max(512),
    lockBirthtimeMs: E().positive(),
    legacyLockBirthtimeMs: E().positive().optional(),
  }),
);
//@ chunk-aepeg2w5.js:310734-310809 placement
/**
 * OAuth 锁相关开关读取器的状态类。
 */
class OAuthLockFlagReader {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-aepeg2w5.js:310809-310823 placement
/**
 * 全局唯一的 OAuth 锁开关读取器。
 */
var oauthLockFlagReader = new OAuthLockFlagReader();
//@ chunk-aepeg2w5.js:310823-310860 placement
/**
 * 注册 OAuth 锁开关读取器。
 */
function setOAuthLockFlagReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return oauthLockFlagReader.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-aepeg2w5.js:310860-310925 placement
/**
 * 读取指定开关；读取异常时视为开启。
 */
function isOAuthLockFlagOn(e) {
  try {
    return oauthLockFlagReader.reader?.(e, true) !== false;
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:310925-311401 placement
/**
 * 写入 OAuth 刷新锁的持有者记录。
 */
async function writeLockOwnerRecord({ claudeDir, lockfilePath, legacyLockfilePath }) {
  try {
    let [s, h, y, S] = await Promise.all([
      lstat(lockfilePath),
      legacyLockfilePath === null ? null : lstat(legacyLockfilePath),
      ownProcStartAsync(),
      ownPidDomain(),
    ]);
    if (!(s.birthtimeMs > 0)) return null;
    let w = {
      pid: process.pid,
      ...(y !== undefined && {
        procStart: y,
      }),
      pidDomain: S,
      pidSpace: ownPidSpace(),
      lockBirthtimeMs: s.birthtimeMs,
      ...(h !== null &&
        h.birthtimeMs > 0 && {
          legacyLockBirthtimeMs: h.birthtimeMs,
        }),
    };
    await writeFileAtomic(lockOwnerRecordPath(claudeDir), jsonStringify(w));
    return s.birthtimeMs;
  } catch (error) {
    logForDebugging(`OAuth refresh lock owner record not written: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-aepeg2w5.js:311401-311517 placement
async function removeOwnLockOwnerRecord(e, n) {
  let lockOwnerRecord = await readLockOwnerRecord(e);
  if (
    lockOwnerRecord === null ||
    lockOwnerRecord.pid !== process.pid ||
    lockOwnerRecord.lockBirthtimeMs !== n
  )
    return;
  await removeLockOwnerRecord(e);
}
//@ chunk-aepeg2w5.js:311517-311752 placement
async function checkLockStillOwned(e) {
  let n = await checkLockOwner(e);
  if (n === "taken_over" || n === "lock_changed" || n === "disabled") return n;
  try {
    return (await lstat(e.lockfilePath)).mtimeMs === e.watchedMtimeMs ? n : "lock_changed";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "lock_changed" : n;
  }
}
//@ chunk-aepeg2w5.js:311752-312876 placement
/**
 * 核对锁持有者（是否已被接管、记录是否匹配）。
 */
async function checkLockOwner({ claudeDir, lockfilePath, legacyLockfilePath, watchedMtimeMs }) {
  let h = false;
  try {
    if (!isOAuthLockFlagOn(TENGU_QUIET_MARTEN)) return "disabled";
    let lockOwnerRecord = await readLockOwnerRecord(claudeDir);
    if (lockOwnerRecord === null)
      return (await lstat(lockfilePath)).mtimeMs === watchedMtimeMs ? "no_owner_record" : "lock_changed";
    let S = async () => {
      let j = await lstat(lockfilePath);
      if (j.mtimeMs !== watchedMtimeMs) return "lock_changed";
      return j.birthtimeMs === lockOwnerRecord.lockBirthtimeMs ? null : "record_mismatch";
    };
    let w = await S();
    if (w !== null) return w;
    if (lockOwnerRecord.pidDomain !== (await ownPidDomain()) || lockOwnerRecord.pidSpace !== ownPidSpace())
      return "foreign_pid_space";
    if (!(await looksLikeFullHostProcessTable())) return "pid_view_untrusted";
    let { pid, procStart } = lockOwnerRecord;
    if (!(
      isProbeablePid(pid) &&
      (isProcessProvablyGone(pid) ||
        (await isExitedProcessAsync(pid)) ||
        (procStart !== undefined && (await provenSameProcessAsync(pid, procStart)) === false))
    ))
      return "holder_not_proven_gone";
    let F = await lstat(legacyLockfilePath).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw error;
    });
    if (F !== null && F.birthtimeMs !== lockOwnerRecord.legacyLockBirthtimeMs) return "legacy_lock_held";
    h = true;
    if (F !== null) await removeOrIgnoreMissing(legacyLockfilePath);
    h = false;
    let L = await S();
    if (L !== null) return L;
    h = true;
    await removeOrIgnoreMissing(lockfilePath);
    let lockOwnerRecord_2 = await readLockOwnerRecord(claudeDir);
    if (
      lockOwnerRecord_2 !== null &&
      lockOwnerRecord_2.pid === lockOwnerRecord.pid &&
      lockOwnerRecord_2.lockBirthtimeMs === lockOwnerRecord.lockBirthtimeMs
    )
      await removeLockOwnerRecord(claudeDir);
    return "taken_over";
  } catch (error) {
    logForDebugging(`OAuth refresh lock takeover skipped: ${errorMessage(error)}`);
    if (h) return "remove_failed";
    return getErrnoCode(error) === "ENOENT" ? "lock_changed" : "probe_failed";
  }
}
//@ chunk-aepeg2w5.js:312876-312907 placement
/**
 * 锁持有者记录文件的路径。
 */
function lockOwnerRecordPath(e) {
  return join(e, LOCK_OWNER_FILE_NAME);
}
//@ chunk-aepeg2w5.js:312907-313066 placement
async function readLockOwnerRecord(claudeDir) {
  let smallFileOrNull = await readSmallFileOrNull(lockOwnerRecordPath(claudeDir), MAX_LOCK_OWNER_BYTES);
  if (smallFileOrNull === null) return null;
  let r;
  try {
    r = jsonParse(smallFileOrNull);
  } catch {
    return null;
  }
  let s = lockOwnerSchema().safeParse(r);
  return s.success ? s.data : null;
}
//@ chunk-aepeg2w5.js:313066-313194 placement
async function removeLockOwnerRecord(e) {
  try {
    await unlink(lockOwnerRecordPath(e));
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`OAuth refresh lock owner record not removed: ${errorMessage(error)}`);
  }
}
//@ chunk-aepeg2w5.js:313194-313268 placement
/**
 * 删除目录，ENOENT 时忽略。
 */
async function removeOrIgnoreMissing(e) {
  try {
    await rmdir(e);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
}
//@ chunk-aepeg2w5.js:313372-313833 placement
/**
 * 文件系统操作的延迟结算器。
 */
class FsSettler {
  settling = 0;
  mkdir(e, n) {
    this.settle(() => void mkdirSync(e), n);
  }
  rmdir(e, n) {
    this.settle(() => void rmdirSync(e), n);
  }
  stat(e, n) {
    if (this.settling === 0) {
      stat_2(e, n);
      return;
    }
    this.settle(() => statSync(e), n);
  }
  utimes(e, n, r, s) {
    if (this.settling === 0) {
      utimes(e, n, r, s);
      return;
    }
    this.settle(() => void utimesSync(e, n, r), s);
  }
  rmdirSync(e) {
    rmdirSync(e);
  }
  settle(e, n) {
    let r;
    try {
      r = e();
    } catch (error) {
      this.withinSettling(() => n(error));
      return;
    }
    this.withinSettling(() => n(null, r));
  }
  withinSettling(e) {
    this.settling++;
    try {
      e();
    } finally {
      this.settling--;
    }
  }
}
//@ chunk-aepeg2w5.js:313833-313848 placement
/**
 * 按目录保存的文件系统延迟结算器。
 */
var fsSettlerByDir = new Map();
//@ chunk-aepeg2w5.js:313848-313945 placement
/**
 * 取某目录的延迟结算器（按需创建）。
 */
function getFsSettler(e) {
  if (!isOAuthLockFlagOn(TENGU_ZANY_BOOK)) return;
  let n = fsSettlerByDir.get(e);
  if (n === undefined) {
    n = new FsSettler();
    fsSettlerByDir.set(e, n);
  }
  return {
    fs: n,
  };
}
//@ chunk-aepeg2w5.js:313945-313968 placement
/**
 * 按宿主隔离的凭据变化信号。
 */
var credentialSignalByHost = new HostScoped(() => createSignal());
export {
  getFsSettler,
  writeLockOwnerRecord,
  removeOwnLockOwnerRecord,
  checkLockStillOwned,
  credentialSignalByHost,
  setOAuthLockFlagReader,
};
