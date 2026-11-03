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
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  rmdir,
  rmdir as rmdir_2,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
} from "path";
import {
  mkdirSync,
  rmdirSync,
  stat as stat_2,
  statSync,
  statSync as statSync_2,
  utimes,
  utimesSync,
} from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, o } from "../../../vendor/zod/v4/classic/schemas.js";
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
var TENGU_QUIET_MARTEN = "tengu_quiet_marten",
  TENGU_ZANY_BOOK = "tengu_zany_book",
  bL = ".oauth_refresh.lock.owner",
  vL = 4096,
  EL = DoctorLazy(() =>
    u({
      pid: E().int(),
      procStart: o().max(64).optional(),
      pidDomain: o().max(512),
      pidSpace: o().max(512),
      lockBirthtimeMs: E().positive(),
      legacyLockBirthtimeMs: E().positive().optional(),
    }),
  );
//@ chunk-aepeg2w5.js:310734-310809 placement
class Ev {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-aepeg2w5.js:310809-310823 placement
var wv = new Ev();
//@ chunk-aepeg2w5.js:310823-310860 placement
function Cv(e) {
  return wv.register(e);
}
//@ chunk-aepeg2w5.js:310860-310925 placement
function xf(e) {
  try {
    return wv.reader?.(e, !0) !== !1;
  } catch {
    return !0;
  }
}
/**
 * 写入 OAuth 刷新锁的持有者记录。
 */
//@ chunk-aepeg2w5.js:310925-311401 placement
async function writeLockOwnerRecord({
  claudeDir: claudeDir,
  lockfilePath: lockfilePath,
  legacyLockfilePath: legacyLockfilePath,
}) {
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
      ...(y !== void 0 && { procStart: y }),
      pidDomain: S,
      pidSpace: ownPidSpace(),
      lockBirthtimeMs: s.birthtimeMs,
      ...(h !== null && h.birthtimeMs > 0 && { legacyLockBirthtimeMs: h.birthtimeMs }),
    };
    return (await writeFileAtomic(Pf(claudeDir), jsonStringify(w)), s.birthtimeMs);
  } catch (error) {
    return (logForDebugging(`OAuth refresh lock owner record not written: ${errorMessage(error)}`), null);
  }
}
//@ chunk-aepeg2w5.js:311401-311517 placement
async function removeOwnLockOwnerRecord(e, n) {
  let r = await readLockOwnerRecord(e);
  if (r === null || r.pid !== process.pid || r.lockBirthtimeMs !== n) return;
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
/**
 * 核对锁持有者（是否已被接管、记录是否匹配）。
 */
//@ chunk-aepeg2w5.js:311752-312876 placement
async function checkLockOwner({
  claudeDir: claudeDir,
  lockfilePath: lockfilePath,
  legacyLockfilePath: legacyLockfilePath,
  watchedMtimeMs: watchedMtimeMs,
}) {
  let h = !1;
  try {
    if (!xf(TENGU_QUIET_MARTEN)) return "disabled";
    let y = await readLockOwnerRecord(claudeDir);
    if (y === null)
      return (await lstat(lockfilePath)).mtimeMs === watchedMtimeMs ? "no_owner_record" : "lock_changed";
    let S = async () => {
        let j = await lstat(lockfilePath);
        if (j.mtimeMs !== watchedMtimeMs) return "lock_changed";
        return j.birthtimeMs === y.lockBirthtimeMs ? null : "record_mismatch";
      },
      w = await S();
    if (w !== null) return w;
    if (y.pidDomain !== (await ownPidDomain()) || y.pidSpace !== ownPidSpace()) return "foreign_pid_space";
    if (!(await looksLikeFullHostProcessTable())) return "pid_view_untrusted";
    let { pid: pid, procStart: procStart } = y;
    if (!(
      isProbeablePid(pid) &&
      (isProcessProvablyGone(pid) ||
        (await isExitedProcessAsync(pid)) ||
        (procStart !== void 0 && (await provenSameProcessAsync(pid, procStart)) === !1))
    ))
      return "holder_not_proven_gone";
    let F = await lstat(legacyLockfilePath).catch((j) => {
      if (getErrnoCode(j) === "ENOENT") return null;
      throw j;
    });
    if (F !== null && F.birthtimeMs !== y.legacyLockBirthtimeMs) return "legacy_lock_held";
    if (((h = !0), F !== null)) await _v(legacyLockfilePath);
    h = !1;
    let L = await S();
    if (L !== null) return L;
    ((h = !0), await _v(lockfilePath));
    let G = await readLockOwnerRecord(claudeDir);
    if (G !== null && G.pid === y.pid && G.lockBirthtimeMs === y.lockBirthtimeMs)
      await removeLockOwnerRecord(claudeDir);
    return "taken_over";
  } catch (error) {
    if ((logForDebugging(`OAuth refresh lock takeover skipped: ${errorMessage(error)}`), h))
      return "remove_failed";
    return getErrnoCode(error) === "ENOENT" ? "lock_changed" : "probe_failed";
  }
}
//@ chunk-aepeg2w5.js:312876-312907 placement
function Pf(e) {
  return join_4(e, bL);
}
//@ chunk-aepeg2w5.js:312907-313066 placement
async function readLockOwnerRecord(e) {
  let n = await readSmallFileOrNull(Pf(e), vL);
  if (n === null) return null;
  let r;
  try {
    r = jsonParse(n);
  } catch {
    return null;
  }
  let safeParse = EL().safeParse(r);
  return safeParse.success ? safeParse.data : null;
}
//@ chunk-aepeg2w5.js:313066-313194 placement
async function removeLockOwnerRecord(e) {
  try {
    await unlink(Pf(e));
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`OAuth refresh lock owner record not removed: ${errorMessage(error)}`);
  }
}
//@ chunk-aepeg2w5.js:313194-313268 placement
async function _v(e) {
  try {
    await rmdir(e);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
}
/**
 * 文件系统操作的延迟结算器。
 */
//@ chunk-aepeg2w5.js:313372-313833 placement
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
var Iv = new Map();
//@ chunk-aepeg2w5.js:313848-313945 placement
function Mf(e) {
  if (!xf(TENGU_ZANY_BOOK)) return;
  let n = Iv.get(e);
  if (n === void 0) ((n = new FsSettler()), Iv.set(e, n));
  return { fs: n };
}
//@ chunk-aepeg2w5.js:313945-313968 placement
var xL = new HostScoped(() => createSignal());

export { Mf, writeLockOwnerRecord, removeOwnLockOwnerRecord, checkLockStillOwned, xL, Cv };
