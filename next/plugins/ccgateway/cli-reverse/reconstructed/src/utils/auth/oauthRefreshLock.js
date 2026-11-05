/**
 * utils/auth/oauthRefreshLock.ts
 *
 * 2.1.316 新增：核对锁持有者（是否已被接管、记录是否匹配）；写入 OAuth 刷新锁的持有者记录等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat, unlink, rmdir } from "fs/promises";
import { join } from "path";
import { mkdirSync, rmdirSync, stat as stat_2, statSync, utimes, utimesSync } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, numberSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:320707-320981 placement
/**
 * 锁持有者记录的文件名（.oauth_refresh.lock.owner）。
 */
var TENGU_QUIET_MARTEN; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TENGU_ZANY_BOOK;
var LOCK_OWNER_FILE_NAME;
var MAX_LOCK_OWNER_BYTES;
var lockOwnerSchema;
deferInit("chunk-exfmq47h.js:320707", () => {
  TENGU_QUIET_MARTEN = "tengu_quiet_marten";
  TENGU_ZANY_BOOK = "tengu_zany_book";
  LOCK_OWNER_FILE_NAME = ".oauth_refresh.lock.owner";
  MAX_LOCK_OWNER_BYTES = 4096;
  lockOwnerSchema = DoctorLazy(() =>
    objectSchema({
      pid: numberSchema().int(),
      procStart: stringSchema().max(64).optional(),
      pidDomain: stringSchema().max(512),
      pidSpace: stringSchema().max(512),
      lockBirthtimeMs: numberSchema().positive(),
      legacyLockBirthtimeMs: numberSchema().positive().optional(),
    }),
  );
});
//@ chunk-exfmq47h.js:320981-321056 placement
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
//@ chunk-exfmq47h.js:321056-321070 placement
/**
 * 全局唯一的 OAuth 锁开关读取器。
 */
var oauthLockFlagReader; // deferred: uses OAuthLockFlagReader of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:321056", () => {
  oauthLockFlagReader = new OAuthLockFlagReader();
});
//@ chunk-exfmq47h.js:321070-321107 placement
/**
 * 注册 OAuth 锁开关读取器。
 */
function setOAuthLockFlagReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return oauthLockFlagReader.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-exfmq47h.js:321107-321172 placement
/**
 * 读取指定开关；读取异常时视为开启。
 */
function isOAuthLockFlagOn(flagName) {
  try {
    return oauthLockFlagReader.reader?.(flagName, true) !== false;
  } catch {
    return true;
  }
}
//@ chunk-exfmq47h.js:321172-321649 placement
/**
 * 写入 OAuth 刷新锁的持有者记录。
 */
async function writeLockOwnerRecord({ claudeDir, lockfilePath, legacyLockfilePath }) {
  try {
    let [lockStat, legacyStat, procStart, pidDomain] = await Promise.all([
      lstat(lockfilePath),
      legacyLockfilePath === null ? null : lstat(legacyLockfilePath),
      ownProcStartAsync(),
      ownPidDomain(),
    ]);
    if (!(lockStat.birthtimeMs > 0)) return null;
    let record = {
      pid: process.pid,
      ...(procStart !== undefined && {
        procStart,
      }),
      pidDomain,
      pidSpace: ownPidSpace(),
      lockBirthtimeMs: lockStat.birthtimeMs,
      ...(legacyStat !== null &&
        legacyStat.birthtimeMs > 0 && {
          legacyLockBirthtimeMs: legacyStat.birthtimeMs,
        }),
    };
    await writeFileAtomic(lockOwnerRecordPath(claudeDir), jsonStringify(record));
    return lockStat.birthtimeMs;
  } catch (error) {
    logForDebugging(`OAuth refresh lock owner record not written: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-exfmq47h.js:321649-321765 placement
async function removeOwnLockOwnerRecord(claudeDir, lockBirthtimeMs) {
  let lockOwnerRecord = await readLockOwnerRecord(claudeDir);
  if (
    lockOwnerRecord === null ||
    lockOwnerRecord.pid !== process.pid ||
    lockOwnerRecord.lockBirthtimeMs !== lockBirthtimeMs
  )
    return;
  await removeLockOwnerRecord(claudeDir);
}
//@ chunk-exfmq47h.js:321765-322000 placement
async function checkLockStillOwned(options) {
  let outcome = await checkLockOwner(options);
  if (outcome === "taken_over" || outcome === "lock_changed" || outcome === "disabled") return outcome;
  try {
    return (await lstat(options.lockfilePath)).mtimeMs === options.watchedMtimeMs ? outcome : "lock_changed";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "lock_changed" : outcome;
  }
}
//@ chunk-exfmq47h.js:322000-323125 placement
/**
 * 核对锁持有者（是否已被接管、记录是否匹配）。
 */
async function checkLockOwner({ claudeDir, lockfilePath, legacyLockfilePath, watchedMtimeMs }) {
  let removing = false;
  try {
    if (!isOAuthLockFlagOn(TENGU_QUIET_MARTEN)) return "disabled";
    let lockOwnerRecord = await readLockOwnerRecord(claudeDir);
    if (lockOwnerRecord === null)
      return (await lstat(lockfilePath)).mtimeMs === watchedMtimeMs ? "no_owner_record" : "lock_changed";
    let recheckLock = async () => {
      let stat = await lstat(lockfilePath);
      if (stat.mtimeMs !== watchedMtimeMs) return "lock_changed";
      return stat.birthtimeMs === lockOwnerRecord.lockBirthtimeMs ? null : "record_mismatch";
    };
    let mismatch = await recheckLock();
    if (mismatch !== null) return mismatch;
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
    let legacyStat = await lstat(legacyLockfilePath).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw error;
    });
    if (legacyStat !== null && legacyStat.birthtimeMs !== lockOwnerRecord.legacyLockBirthtimeMs)
      return "legacy_lock_held";
    removing = true;
    if (legacyStat !== null) await removeOrIgnoreMissing(legacyLockfilePath);
    removing = false;
    let mismatch_2 = await recheckLock();
    if (mismatch_2 !== null) return mismatch_2;
    removing = true;
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
    if (removing) return "remove_failed";
    return getErrnoCode(error) === "ENOENT" ? "lock_changed" : "probe_failed";
  }
}
//@ chunk-exfmq47h.js:323125-323156 placement
/**
 * 锁持有者记录文件的路径。
 */
function lockOwnerRecordPath(claudeDir) {
  return join(claudeDir, LOCK_OWNER_FILE_NAME);
}
//@ chunk-exfmq47h.js:323156-323315 placement
async function readLockOwnerRecord(claudeDir) {
  let smallFileOrNull = await readSmallFileOrNull(lockOwnerRecordPath(claudeDir), MAX_LOCK_OWNER_BYTES);
  if (smallFileOrNull === null) return null;
  let parsed;
  try {
    parsed = jsonParse(smallFileOrNull);
  } catch {
    return null;
  }
  let parseResult = lockOwnerSchema().safeParse(parsed);
  return parseResult.success ? parseResult.data : null;
}
//@ chunk-exfmq47h.js:323315-323443 placement
async function removeLockOwnerRecord(claudeDir) {
  try {
    await unlink(lockOwnerRecordPath(claudeDir));
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`OAuth refresh lock owner record not removed: ${errorMessage(error)}`);
  }
}
//@ chunk-exfmq47h.js:323443-323517 placement
/**
 * 删除目录，ENOENT 时忽略。
 */
async function removeOrIgnoreMissing(dirPath) {
  try {
    await rmdir(dirPath);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
}
//@ chunk-exfmq47h.js:323621-324082 placement
/**
 * 文件系统操作的延迟结算器。
 */
class FsSettler {
  settling = 0;
  mkdir(path, callback) {
    this.settle(() => void mkdirSync(path), callback);
  }
  rmdir(path, callback) {
    this.settle(() => void rmdirSync(path), callback);
  }
  stat(path, callback) {
    if (this.settling === 0) {
      stat_2(path, callback);
      return;
    }
    this.settle(() => statSync(path), callback);
  }
  utimes(path, atime, mtime, callback) {
    if (this.settling === 0) {
      utimes(path, atime, mtime, callback);
      return;
    }
    this.settle(() => void utimesSync(path, atime, mtime), callback);
  }
  rmdirSync(path) {
    rmdirSync(path);
  }
  settle(operation, callback) {
    let result;
    try {
      result = operation();
    } catch (error) {
      this.withinSettling(() => callback(error));
      return;
    }
    this.withinSettling(() => callback(null, result));
  }
  withinSettling(fn) {
    this.settling++;
    try {
      fn();
    } finally {
      this.settling--;
    }
  }
}
//@ chunk-exfmq47h.js:324082-324097 placement
/**
 * 按目录保存的文件系统延迟结算器。
 */
var fsSettlerByDir; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:324082", () => {
  fsSettlerByDir = new Map();
});
//@ chunk-exfmq47h.js:324097-324194 placement
/**
 * 取某目录的延迟结算器（按需创建）。
 */
function getFsSettler(dir) {
  if (!isOAuthLockFlagOn(TENGU_ZANY_BOOK)) return;
  let settler = fsSettlerByDir.get(dir);
  if (settler === undefined) {
    settler = new FsSettler();
    fsSettlerByDir.set(dir, settler);
  }
  return {
    fs: settler,
  };
}
//@ chunk-exfmq47h.js:324194-324217 placement
/**
 * 按宿主隔离的凭据变化信号。
 */
var credentialSignalByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:324194", () => {
  credentialSignalByHost = new HostScoped(() => createSignal());
});
export {
  getFsSettler,
  writeLockOwnerRecord,
  removeOwnLockOwnerRecord,
  checkLockStillOwned,
  setOAuthLockFlagReader,
  credentialSignalByHost,
};
