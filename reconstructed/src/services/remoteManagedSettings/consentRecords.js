/**
 * services/remoteManagedSettings/consentRecords.ts
 *
 * 远程托管设置同意记录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (20)
 * attribution: placement 20
 */
import { join, resolve } from "path";
import { open, unlink, lstat } from "fs/promises";
import { constants } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, E, literal, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { isDiskless } from "../../bootstrap/state.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { getFileReader } from "../../utils/fileStore.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import {
  summarizeManagedSettingsRisk,
  hasDangerousManagedSettings,
  realCanonicalPath,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { identity as identity_2 } from "../../utils/identity.js";
import {
  getSettingsPath,
  hostSessionSkipsSharedCache,
  getMockRemoteSettingsFixturePath,
} from "./remoteSettingsCache.js";
import { readRemoteSettingsSyncStamp } from "./syncCacheState.js";
import { uniq } from "../../utils/collections.js";
import { SETTINGS_FILENAME, HELPER_CONSENT_STATE_ID } from "./remoteSettingsState.js";
import { signatureFileFor, signatureIatFileFor } from "../../utils/settings/policyCertificates.js";

//@ chunk-82kqcve8.js:157150-157407 placement
/**
 * 远程托管设置同意记录文件的常量与 schema：文件名、格式版本、记录条数上限、刷新窗口、文件大小上限，以及单条/整文件/更高版本三种 schema。
 */
var REMOTE_SETTINGS_CONSENT_FILE = "remote-settings-consent.json";
var REMOTE_SETTINGS_CONSENT = "remote-settings-consent";
var CONSENT_RECORDS_VERSION = 1;
var MAX_CONSENT_RECORDS = 20;
var CONSENT_REFRESH_MS = 86400000;
var MAX_CONSENT_FILE_BYTES = 1048576;
var consentRecordSchema = DoctorLazy(() =>
  u({
    accountUuid: string(),
    dangerousSettingsHash: string(),
    updatedAt: E(),
  }),
);
var consentRecordsFileSchema = DoctorLazy(() =>
  u({
    version: literal(CONSENT_RECORDS_VERSION),
    records: record(string(), unknown()),
  }),
);
var newerConsentVersionSchema = DoctorLazy(() =>
  u({
    version: E().gt(CONSENT_RECORDS_VERSION),
  }),
);
//@ chunk-82kqcve8.js:157407-157441 placement
/**
 * 返回配置目录下的同意记录文件路径。
 */
function consentRecordsPath() {
  return join(getClaudeConfigDir(), REMOTE_SETTINGS_CONSENT_FILE);
}
//@ chunk-82kqcve8.js:157441-157509 placement
/**
 * 读不出同意记录时的保守状态：空记录表、版本未知，标记 unreadable。
 */
function unreadableConsentState() {
  return {
    records: new Map(),
    newerVersion: false,
    unreadable: true,
  };
}
//@ chunk-82kqcve8.js:157509-157625 placement
function consentFileTooLarge() {
  logForDebugging(
    `Remote settings: Consent records file exceeds ${MAX_CONSENT_FILE_BYTES} bytes; treating it as unreadable`,
  );
  return unreadableConsentState();
}
//@ chunk-82kqcve8.js:157625-158709 placement
async function readConsentRecords(e) {
  let n;
  if (isStorageV5Enabled() && e !== undefined) {
    let r;
    try {
      r = await e.readText([
        {
          key: STORAGE_SPACES.state(REMOTE_SETTINGS_CONSENT),
          offset: 0,
          length: MAX_CONSENT_FILE_BYTES + 1,
        },
      ]);
    } catch (error) {
      logForDebugging(`Remote settings: Consent records unreadable - ${errorMessage(error)}`);
      return unreadableConsentState();
    }
    if (!r.ok) {
      logForDebugging(`Remote settings: Consent records unreadable - ${formatStorageError(r.error)}`);
      return unreadableConsentState();
    }
    let s = r.value.items[0];
    if (!s.found)
      return {
        records: new Map(),
        newerVersion: false,
        unreadable: false,
      };
    if (s.totalBytes > MAX_CONSENT_FILE_BYTES) return consentFileTooLarge();
    n = s.value;
  } else {
    if (isDiskless())
      return {
        records: new Map(),
        newerVersion: false,
        unreadable: false,
      };
    let r = consentRecordsPath();
    try {
      if (NOFOLLOW_NONBLOCK_FLAGS === 0) {
        let stats = await getFileReader().lstat(r);
        if (stats !== undefined && !stats.isFile) return unreadableConsentState();
      }
      let tail = await getFileReader().readTail(r, MAX_CONSENT_FILE_BYTES + 1, {
        noFollow: true,
      });
      if (tail.length > MAX_CONSENT_FILE_BYTES) return consentFileTooLarge();
      n = tail.toString("utf8");
    } catch (error) {
      return {
        records: new Map(),
        newerVersion: false,
        unreadable: !isENOENT(error),
      };
    }
  }
  try {
    let r = jsonParse(n);
    let s = consentRecordsFileSchema().safeParse(r);
    if (!s.success)
      return {
        records: new Map(),
        newerVersion: newerConsentVersionSchema().safeParse(r).success,
        unreadable: false,
      };
    let h = new Map();
    for (let [key, value] of Object.entries(s.data.records)) {
      let S = consentRecordSchema().safeParse(value);
      if (S.success) h.set(key, S.data);
    }
    return {
      records: h,
      newerVersion: false,
      unreadable: false,
    };
  } catch {
    return {
      records: new Map(),
      newerVersion: false,
      unreadable: false,
    };
  }
}
//@ chunk-82kqcve8.js:158709-158868 placement
/**
 * 组织同意记录中的危险设置哈希（账号须一致）。
 */
async function readDangerousSettingsHash(consentIdentity, storageV5) {
  let { records } = await readConsentRecords(storageV5);
  let s = records.get(consentIdentity.organizationUuid);
  if (!s || s.accountUuid !== consentIdentity.accountUuid) return null;
  return s.dangerousSettingsHash;
}
//@ chunk-82kqcve8.js:158868-159814 placement
async function writeConsentRecords(e, n, r) {
  try {
    let { records, newerVersion, unreadable } = await readConsentRecords(r);
    if (newerVersion || unreadable) {
      logForDebugging(
        `Remote settings: Consent records file is ${newerVersion ? "from a newer version" : "unreadable"}; not overwriting it`,
      );
      return;
    }
    let w = summarizeManagedSettingsRisk(n);
    let S = records.get(e.organizationUuid);
    let R = S?.accountUuid === e.accountUuid;
    let O = !hasDangerousManagedSettings(w);
    if (O && !(S && R)) return;
    let P = O && S ? S.dangerousSettingsHash : realCanonicalPath(w);
    let now = Date.now();
    if (R && S.dangerousSettingsHash === P && now - S.updatedAt < CONSENT_REFRESH_MS) return;
    records.delete(e.organizationUuid);
    let sliced = [...records]
      .sort(([, Z], [, ae]) => ae.updatedAt - Z.updatedAt)
      .slice(0, MAX_CONSENT_RECORDS - 1);
    sliced.unshift([
      e.organizationUuid,
      {
        accountUuid: e.accountUuid,
        dangerousSettingsHash: P,
        updatedAt: now,
      },
    ]);
    let G = jsonStringify({
      version: CONSENT_RECORDS_VERSION,
      records: Object.fromEntries(sliced),
    });
    if (isStorageV5Enabled() && r !== undefined) {
      let Z = await r.write(STORAGE_SPACES.state(REMOTE_SETTINGS_CONSENT), G, {
        mode: 384,
      });
      if (!Z.ok)
        logForDebugging(`Remote settings: Failed to record org consent - ${formatStorageError(Z.error)}`);
      return;
    }
    if (isDiskless()) return;
    await getFileReader().atomicWrite(consentRecordsPath(), G, 384);
  } catch (error) {
    logForDebugging(`Remote settings: Failed to record org consent - ${errorMessage(error)}`);
  }
}
//@ chunk-82kqcve8.js:159907-159987 placement
/**
 * 进程级的远程设置同步时间状态：落盘时间与最近一次收到响应体的时间（HostScoped 可重置）。
 */
var SYNC_STAMP_SUFFIX = ".synced-at";
var MAX_SYNC_STAMP_BYTES = 32;
var remoteSettingsSyncState = identity_2(
  {
    syncedAtMs: undefined,
    bodyReceivedAtMs: undefined,
  },
  resetSyncState,
);
//@ chunk-82kqcve8.js:159987-160048 placement
function resetSyncState(remoteSettingsSyncState) {
  remoteSettingsSyncState.syncedAtMs = undefined;
  remoteSettingsSyncState.bodyReceivedAtMs = undefined;
}
//@ chunk-82kqcve8.js:160048-160086 placement
/**
 * 记录最近一次收到远程设置响应体的时间。
 */
function noteBodyReceivedAt(bodyReceivedAtMs) {
  remoteSettingsSyncState.bodyReceivedAtMs = bodyReceivedAtMs;
}
//@ chunk-82kqcve8.js:160086-160119 placement
/**
 * 设置文件旁的时间戳文件路径（<settings>.synced-at）。
 */
function syncStampPath(e = getSettingsPath()) {
  return e + SYNC_STAMP_SUFFIX;
}
//@ chunk-82kqcve8.js:160119-160562 placement
async function stampRemoteSettingsSync(e = Date.now()) {
  if (isSyncStampUnavailable()) return;
  let n = syncStampPath();
  let r = Math.trunc(e);
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0 && (await isSymlinkPath(n))) {
      logForDebugging("Remote settings: sync stamp path is a symlink; not writing through it");
      return;
    }
    let s = await open(
      n,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | NOFOLLOW_NONBLOCK_FLAGS,
      384,
    );
    try {
      await s.writeFile(String(r), {
        encoding: "utf-8",
      });
    } finally {
      await s.close();
    }
    remoteSettingsSyncState.syncedAtMs = r;
  } catch (error) {
    logForDebugging(
      `Remote settings: could not stamp the sync time (${errorMessage(error)}); the cache's age reads as unknown`,
    );
  }
}
//@ chunk-82kqcve8.js:160562-160707 placement
/**
 * 删除远程设置同步戳。
 */
async function removeSyncStamp() {
  resetSyncState(remoteSettingsSyncState);
  if (isDiskless()) return;
  try {
    await unlink(syncStampPath());
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Remote settings: could not remove the sync stamp (${errorMessage(error)})`);
  }
}
//@ chunk-82kqcve8.js:160707-160824 placement
/**
 * 读同步戳并计算距今时长。
 */
async function readSyncAge(e = Date.now()) {
  if (isSyncStampUnavailable()) return;
  let remoteSettingsSyncStamp = await readRemoteSettingsSyncStamp();
  if (remoteSettingsSyncStamp === undefined) return;
  remoteSettingsSyncState.syncedAtMs = remoteSettingsSyncStamp;
  return elapsedMs(remoteSettingsSyncStamp, e);
}
//@ chunk-82kqcve8.js:160824-161068 placement
/**
 * 远程设置年龄（同步戳、文件修改时间或接收时间）。
 */
async function settingsAgeMs(e, n, r = Date.now()) {
  let s =
    remoteSettingsSyncState.bodyReceivedAtMs === undefined
      ? undefined
      : elapsedMs(remoteSettingsSyncState.bodyReceivedAtMs, r);
  if (isSyncStampUnavailable()) return s;
  if (n !== undefined) return n;
  try {
    let h = await lstat(getSettingsPath());
    if (h.isFile()) return elapsedMs(Math.trunc(h.mtimeMs), r);
  } catch {}
  return e ? s : undefined;
}
//@ chunk-82kqcve8.js:161068-161161 placement
/**
 * 远程设置的「年龄」（距上次同步落盘的毫秒数），不可知时 undefined。
 */
function remoteSettingsAgeMs(e = Date.now()) {
  if (remoteSettingsSyncState.syncedAtMs === undefined || isSyncStampUnavailable()) return;
  return elapsedMs(remoteSettingsSyncState.syncedAtMs, e);
}
//@ chunk-82kqcve8.js:161161-161192 placement
function isSyncStampUnavailable() {
  return hostSessionSkipsSharedCache() || isDiskless();
}
//@ chunk-82kqcve8.js:161192-161260 placement
/**
 * 计算 now - then 的毫秒差，非法或为负返回 undefined。
 */
function elapsedMs(e, n) {
  let r = n - e;
  return Number.isFinite(r) && r >= 0 ? r : undefined;
}
//@ chunk-82kqcve8.js:161594-161672 placement
async function isSymlinkPath(e) {
  try {
    return (await lstat(e)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-82kqcve8.js:161672-161884 placement
function getSettingsWatchPaths(e) {
  let n = uniq([...e.map((s) => resolve(s, SETTINGS_FILENAME)), resolve(getSettingsPath())]);
  let mockRemoteSettingsFixturePath = getMockRemoteSettingsFixturePath();
  return {
    bodies: uniq([
      ...n,
      ...(mockRemoteSettingsFixturePath !== undefined ? [resolve(mockRemoteSettingsFixturePath)] : []),
    ]),
    vouchers: [
      ...n.flatMap((s) => [signatureFileFor(s), signatureIatFileFor(s), syncStampPath(s)]),
      ...e.flatMap((s) => [resolve(s, HELPER_CONSENT_STATE_ID), resolve(s, REMOTE_SETTINGS_CONSENT_FILE)]),
    ],
  };
}
export {
  getSettingsWatchPaths,
  REMOTE_SETTINGS_CONSENT_FILE,
  writeConsentRecords,
  stampRemoteSettingsSync,
  readSyncAge,
  settingsAgeMs,
  noteBodyReceivedAt,
  removeSyncStamp,
  readDangerousSettingsHash,
  syncStampPath,
  isSymlinkPath,
  MAX_SYNC_STAMP_BYTES,
  remoteSettingsAgeMs,
};
