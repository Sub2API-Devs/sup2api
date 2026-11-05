/**
 * services/remoteManagedSettings/consentRecords.ts
 *
 * 远程托管设置同意记录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (20)
 * attribution: placement 20
 */
import { join as join_2, resolve } from "path";
import { open, unlink, lstat } from "fs/promises";
import { constants } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  literal,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { SETTINGS_FILENAME, HELPER_CONSENT_STATE_ID } from "./remoteSettingsState.js";
import { signatureFileFor, signatureIatFileFor } from "../../utils/settings/policyCertificates.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:155233-155490 placement
/**
 * 远程托管设置同意记录文件的常量与 schema：文件名、格式版本、记录条数上限、刷新窗口、文件大小上限，以及单条/整文件/更高版本三种 schema。
 */
var REMOTE_SETTINGS_CONSENT_FILE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var REMOTE_SETTINGS_CONSENT;
var CONSENT_RECORDS_VERSION;
var MAX_CONSENT_RECORDS;
var CONSENT_REFRESH_MS;
var MAX_CONSENT_FILE_BYTES;
var consentRecordSchema;
var consentRecordsFileSchema;
var newerConsentVersionSchema;
deferInit("chunk-a2q0x549.js:155233", () => {
  REMOTE_SETTINGS_CONSENT_FILE = "remote-settings-consent.json";
  REMOTE_SETTINGS_CONSENT = "remote-settings-consent";
  CONSENT_RECORDS_VERSION = 1;
  MAX_CONSENT_RECORDS = 20;
  CONSENT_REFRESH_MS = 86400000;
  MAX_CONSENT_FILE_BYTES = 1048576;
  consentRecordSchema = DoctorLazy(() =>
    objectSchema({
      accountUuid: stringSchema(),
      dangerousSettingsHash: stringSchema(),
      updatedAt: numberSchema(),
    }),
  );
  consentRecordsFileSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(CONSENT_RECORDS_VERSION),
      records: record(stringSchema(), unknown()),
    }),
  );
  newerConsentVersionSchema = DoctorLazy(() =>
    objectSchema({
      version: numberSchema().gt(CONSENT_RECORDS_VERSION),
    }),
  );
});
//@ chunk-a2q0x549.js:155490-155524 placement
/**
 * 返回配置目录下的同意记录文件路径。
 */
function consentRecordsPath() {
  return join_2(getClaudeConfigDir(), REMOTE_SETTINGS_CONSENT_FILE);
}
//@ chunk-a2q0x549.js:155524-155592 placement
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
//@ chunk-a2q0x549.js:155592-155708 placement
function consentFileTooLarge() {
  logForDebugging(
    `Remote settings: Consent records file exceeds ${MAX_CONSENT_FILE_BYTES} bytes; treating it as unreadable`,
  );
  return unreadableConsentState();
}
//@ chunk-a2q0x549.js:155708-156792 placement
async function readConsentRecords(storageV5) {
  let text;
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let readResult;
    try {
      readResult = await storageV5.readText([
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
    if (!readResult.ok) {
      logForDebugging(
        `Remote settings: Consent records unreadable - ${formatStorageError(readResult.error)}`,
      );
      return unreadableConsentState();
    }
    let item = readResult.value.items[0];
    if (!item.found)
      return {
        records: new Map(),
        newerVersion: false,
        unreadable: false,
      };
    if (item.totalBytes > MAX_CONSENT_FILE_BYTES) return consentFileTooLarge();
    text = item.value;
  } else {
    if (isDiskless())
      return {
        records: new Map(),
        newerVersion: false,
        unreadable: false,
      };
    let path = consentRecordsPath();
    try {
      if (NOFOLLOW_NONBLOCK_FLAGS === 0) {
        let stats = await getFileReader().lstat(path);
        if (stats !== undefined && !stats.isFile) return unreadableConsentState();
      }
      let tail = await getFileReader().readTail(path, MAX_CONSENT_FILE_BYTES + 1, {
        noFollow: true,
      });
      if (tail.length > MAX_CONSENT_FILE_BYTES) return consentFileTooLarge();
      text = tail.toString("utf8");
    } catch (error) {
      return {
        records: new Map(),
        newerVersion: false,
        unreadable: !isENOENT(error),
      };
    }
  }
  try {
    let parsed = jsonParse(text);
    let fileResult = consentRecordsFileSchema().safeParse(parsed);
    if (!fileResult.success)
      return {
        records: new Map(),
        newerVersion: newerConsentVersionSchema().safeParse(parsed).success,
        unreadable: false,
      };
    let records = new Map();
    for (let [key, value] of Object.entries(fileResult.data.records)) {
      let record = consentRecordSchema().safeParse(value);
      if (record.success) records.set(key, record.data);
    }
    return {
      records,
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
//@ chunk-a2q0x549.js:156792-156951 placement
/**
 * 组织同意记录中的危险设置哈希（账号须一致）。
 */
async function readDangerousSettingsHash(consentIdentity, storageV5) {
  let { records } = await readConsentRecords(storageV5);
  let record = records.get(consentIdentity.organizationUuid);
  if (!record || record.accountUuid !== consentIdentity.accountUuid) return null;
  return record.dangerousSettingsHash;
}
//@ chunk-a2q0x549.js:156951-157902 placement
async function writeConsentRecords(identity, settings, storageV5) {
  try {
    let { records, newerVersion, unreadable } = await readConsentRecords(storageV5);
    if (newerVersion || unreadable) {
      logForDebugging(
        `Remote settings: Consent records file is ${newerVersion ? "from a newer version" : "unreadable"}; not overwriting it`,
      );
      return;
    }
    let risk = summarizeManagedSettingsRisk(settings);
    let existing = records.get(identity.organizationUuid);
    let sameAccount = existing?.accountUuid === identity.accountUuid;
    let isBenign = !hasDangerousManagedSettings(risk);
    if (isBenign && !(existing && sameAccount)) return;
    let settingsHash = isBenign && existing ? existing.dangerousSettingsHash : realCanonicalPath(risk);
    let now = Date.now();
    if (
      sameAccount &&
      existing.dangerousSettingsHash === settingsHash &&
      now - existing.updatedAt < CONSENT_REFRESH_MS
    )
      return;
    records.delete(identity.organizationUuid);
    let sliced = [...records]
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONSENT_RECORDS - 1);
    sliced.unshift([
      identity.organizationUuid,
      {
        accountUuid: identity.accountUuid,
        dangerousSettingsHash: settingsHash,
        updatedAt: now,
      },
    ]);
    let payload = jsonStringify({
      version: CONSENT_RECORDS_VERSION,
      records: Object.fromEntries(sliced),
    });
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      let writeResult = await storageV5.write(STORAGE_SPACES.state(REMOTE_SETTINGS_CONSENT), payload, {
        mode: 384,
      });
      if (!writeResult.ok)
        logForDebugging(
          `Remote settings: Failed to record org consent - ${formatStorageError(writeResult.error)}`,
        );
      return;
    }
    if (isDiskless()) return;
    await getFileReader().atomicWrite(consentRecordsPath(), payload, 384);
  } catch (error) {
    logForDebugging(`Remote settings: Failed to record org consent - ${errorMessage(error)}`);
  }
}
//@ chunk-a2q0x549.js:157995-158075 placement
/**
 * 进程级的远程设置同步时间状态：落盘时间与最近一次收到响应体的时间（HostScoped 可重置）。
 */
var SYNC_STAMP_SUFFIX; // deferred: uses resetSyncState of its import cycle while loading; runs once the cycle is complete
var MAX_SYNC_STAMP_BYTES;
var remoteSettingsSyncState;
deferInit("chunk-a2q0x549.js:157995", () => {
  SYNC_STAMP_SUFFIX = ".synced-at";
  MAX_SYNC_STAMP_BYTES = 32;
  remoteSettingsSyncState = identity_2(
    {
      syncedAtMs: undefined,
      bodyReceivedAtMs: undefined,
    },
    resetSyncState,
  );
});
//@ chunk-a2q0x549.js:158075-158136 placement
function resetSyncState(remoteSettingsSyncState) {
  remoteSettingsSyncState.syncedAtMs = undefined;
  remoteSettingsSyncState.bodyReceivedAtMs = undefined;
}
//@ chunk-a2q0x549.js:158136-158174 placement
/**
 * 记录最近一次收到远程设置响应体的时间。
 */
function noteBodyReceivedAt(bodyReceivedAtMs) {
  remoteSettingsSyncState.bodyReceivedAtMs = bodyReceivedAtMs;
}
//@ chunk-a2q0x549.js:158174-158207 placement
/**
 * 设置文件旁的时间戳文件路径（<settings>.synced-at）。
 */
function syncStampPath(settingsPath = getSettingsPath()) {
  return settingsPath + SYNC_STAMP_SUFFIX;
}
//@ chunk-a2q0x549.js:158207-158650 placement
async function stampRemoteSettingsSync(nowMs = Date.now()) {
  if (isSyncStampUnavailable()) return;
  let path = syncStampPath();
  let seconds = Math.trunc(nowMs);
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0 && (await isSymlinkPath(path))) {
      logForDebugging("Remote settings: sync stamp path is a symlink; not writing through it");
      return;
    }
    let handle = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | NOFOLLOW_NONBLOCK_FLAGS,
      384,
    );
    try {
      await handle.writeFile(String(seconds), {
        encoding: "utf-8",
      });
    } finally {
      await handle.close();
    }
    remoteSettingsSyncState.syncedAtMs = seconds;
  } catch (error) {
    logForDebugging(
      `Remote settings: could not stamp the sync time (${errorMessage(error)}); the cache's age reads as unknown`,
    );
  }
}
//@ chunk-a2q0x549.js:158650-158795 placement
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
//@ chunk-a2q0x549.js:158795-158912 placement
/**
 * 读同步戳并计算距今时长。
 */
async function readSyncAge(nowMs = Date.now()) {
  if (isSyncStampUnavailable()) return;
  let remoteSettingsSyncStamp = await readRemoteSettingsSyncStamp();
  if (remoteSettingsSyncStamp === undefined) return;
  remoteSettingsSyncState.syncedAtMs = remoteSettingsSyncStamp;
  return elapsedMs(remoteSettingsSyncStamp, nowMs);
}
//@ chunk-a2q0x549.js:158912-159156 placement
/**
 * 远程设置年龄（同步戳、文件修改时间或接收时间）。
 */
async function settingsAgeMs(preferBody, knownAgeMs, nowMs = Date.now()) {
  let bodyAgeMs =
    remoteSettingsSyncState.bodyReceivedAtMs === undefined
      ? undefined
      : elapsedMs(remoteSettingsSyncState.bodyReceivedAtMs, nowMs);
  if (isSyncStampUnavailable()) return bodyAgeMs;
  if (knownAgeMs !== undefined) return knownAgeMs;
  try {
    let stats = await lstat(getSettingsPath());
    if (stats.isFile()) return elapsedMs(Math.trunc(stats.mtimeMs), nowMs);
  } catch {}
  return preferBody ? bodyAgeMs : undefined;
}
//@ chunk-a2q0x549.js:159156-159249 placement
/**
 * 远程设置的「年龄」（距上次同步落盘的毫秒数），不可知时 undefined。
 */
function remoteSettingsAgeMs(nowMs = Date.now()) {
  if (remoteSettingsSyncState.syncedAtMs === undefined || isSyncStampUnavailable()) return;
  return elapsedMs(remoteSettingsSyncState.syncedAtMs, nowMs);
}
//@ chunk-a2q0x549.js:159249-159281 placement
function isSyncStampUnavailable() {
  return hostSessionSkipsSharedCache() || isDiskless();
}
//@ chunk-a2q0x549.js:159281-159349 placement
/**
 * 计算 now - then 的毫秒差，非法或为负返回 undefined。
 */
function elapsedMs(sinceMs, nowMs) {
  let ageMs = nowMs - sinceMs;
  return Number.isFinite(ageMs) && ageMs >= 0 ? ageMs : undefined;
}
//@ chunk-a2q0x549.js:159683-159761 placement
async function isSymlinkPath(path) {
  try {
    return (await lstat(path)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-a2q0x549.js:159761-159973 placement
function getSettingsWatchPaths(settingsDirs) {
  let bodyPaths = normalizeCaseForComparison_2([
    ...settingsDirs.map((dir) => resolve(dir, SETTINGS_FILENAME)),
    resolve(getSettingsPath()),
  ]);
  let mockRemoteSettingsFixturePath = getMockRemoteSettingsFixturePath();
  return {
    bodies: normalizeCaseForComparison_2([
      ...bodyPaths,
      ...(mockRemoteSettingsFixturePath !== undefined ? [resolve(mockRemoteSettingsFixturePath)] : []),
    ]),
    vouchers: [
      ...bodyPaths.flatMap((path) => [
        signatureFileFor(path),
        signatureIatFileFor(path),
        syncStampPath(path),
      ]),
      ...settingsDirs.flatMap((dir) => [
        resolve(dir, HELPER_CONSENT_STATE_ID),
        resolve(dir, REMOTE_SETTINGS_CONSENT_FILE),
      ]),
    ],
  };
}
export {
  getSettingsWatchPaths,
  REMOTE_SETTINGS_CONSENT_FILE,
  syncStampPath,
  writeConsentRecords,
  stampRemoteSettingsSync,
  readSyncAge,
  settingsAgeMs,
  noteBodyReceivedAt,
  removeSyncStamp,
  readDangerousSettingsHash,
  isSymlinkPath,
  MAX_SYNC_STAMP_BYTES,
  remoteSettingsAgeMs,
};
