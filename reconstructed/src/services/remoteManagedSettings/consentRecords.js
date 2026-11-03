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
  join as join_12,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
} from "path";
import {
  open,
  open as open_2,
  open as open_3,
  unlink,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
} from "fs/promises";
import { constants, constants as constants_2 } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, T, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { isDiskless } from "../../bootstrap/state.js";
import { ws } from "../../utils/fsFlags.js";
import { getFileReader } from "../../utils/fileStore.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import {
  summarizeManagedSettingsRisk,
  hasDangerousManagedSettings,
  hbr,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { ge } from "../../utils/identity.js";
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
var REMOTE_SETTINGS_CONSENT_FILE = "remote-settings-consent.json",
  REMOTE_SETTINGS_CONSENT = "remote-settings-consent",
  qo = 1,
  Wf = 20,
  Bf = 86400000,
  er = 1048576,
  jf = DoctorLazy(() => u({ accountUuid: o(), dangerousSettingsHash: o(), updatedAt: E() })),
  Uf = DoctorLazy(() => u({ version: T(qo), records: pe(o(), oe()) })),
  Gf = DoctorLazy(() => u({ version: E().gt(qo) }));
//@ chunk-82kqcve8.js:157407-157441 placement
function _l() {
  return join_10(getClaudeConfigDir(), REMOTE_SETTINGS_CONSENT_FILE);
}
//@ chunk-82kqcve8.js:157441-157509 placement
function $r() {
  return { records: new Map(), newerVersion: !1, unreadable: !0 };
}
//@ chunk-82kqcve8.js:157509-157625 placement
function consentFileTooLarge() {
  return (
    logForDebugging(`Remote settings: Consent records file exceeds ${er} bytes; treating it as unreadable`),
    $r()
  );
}
//@ chunk-82kqcve8.js:157625-158709 placement
async function readConsentRecords(e) {
  let n;
  if (isStorageV5Enabled() && e !== void 0) {
    let r;
    try {
      r = await e.readText([
        { key: STORAGE_SPACES.state(REMOTE_SETTINGS_CONSENT), offset: 0, length: er + 1 },
      ]);
    } catch (error) {
      return (logForDebugging(`Remote settings: Consent records unreadable - ${errorMessage(error)}`), $r());
    }
    if (!r.ok)
      return (
        logForDebugging(`Remote settings: Consent records unreadable - ${formatStorageError(r.error)}`),
        $r()
      );
    let s = r.value.items[0];
    if (!s.found) return { records: new Map(), newerVersion: !1, unreadable: !1 };
    if (s.totalBytes > er) return consentFileTooLarge();
    n = s.value;
  } else {
    if (isDiskless()) return { records: new Map(), newerVersion: !1, unreadable: !1 };
    let r = _l();
    try {
      if (ws === 0) {
        let stats = await getFileReader().lstat(r);
        if (stats !== void 0 && !stats.isFile) return $r();
      }
      let tail = await getFileReader().readTail(r, er + 1, { noFollow: !0 });
      if (tail.length > er) return consentFileTooLarge();
      n = tail.toString("utf8");
    } catch (error) {
      return { records: new Map(), newerVersion: !1, unreadable: !isENOENT(error) };
    }
  }
  try {
    let r = jsonParse(n),
      safeParse = Uf().safeParse(r);
    if (!safeParse.success)
      return { records: new Map(), newerVersion: Gf().safeParse(r).success, unreadable: !1 };
    let h = new Map();
    for (let [y, w] of Object.entries(safeParse.data.records)) {
      let safeParse = jf().safeParse(w);
      if (safeParse.success) h.set(y, safeParse.data);
    }
    return { records: h, newerVersion: !1, unreadable: !1 };
  } catch {
    return { records: new Map(), newerVersion: !1, unreadable: !1 };
  }
}
/**
 * 组织同意记录中的危险设置哈希（账号须一致）。
 */
//@ chunk-82kqcve8.js:158709-158868 placement
async function readDangerousSettingsHash(e, n) {
  let { records: records } = await readConsentRecords(n),
    s = records.get(e.organizationUuid);
  if (!s || s.accountUuid !== e.accountUuid) return null;
  return s.dangerousSettingsHash;
}
//@ chunk-82kqcve8.js:158868-159814 placement
async function writeConsentRecords(e, n, r) {
  try {
    let {
      records: records,
      newerVersion: newerVersion,
      unreadable: unreadable,
    } = await readConsentRecords(r);
    if (newerVersion || unreadable) {
      logForDebugging(
        `Remote settings: Consent records file is ${newerVersion ? "from a newer version" : "unreadable"}; not overwriting it`,
      );
      return;
    }
    let w = summarizeManagedSettingsRisk(n),
      S = records.get(e.organizationUuid),
      R = S?.accountUuid === e.accountUuid,
      O = !hasDangerousManagedSettings(w);
    if (O && !(S && R)) return;
    let P = O && S ? S.dangerousSettingsHash : hbr(w),
      now = Date.now();
    if (R && S.dangerousSettingsHash === P && now - S.updatedAt < Bf) return;
    records.delete(e.organizationUuid);
    let sliced = [...records].sort(([, Z], [, ae]) => ae.updatedAt - Z.updatedAt).slice(0, Wf - 1);
    sliced.unshift([
      e.organizationUuid,
      { accountUuid: e.accountUuid, dangerousSettingsHash: P, updatedAt: now },
    ]);
    let G = jsonStringify({ version: qo, records: Object.fromEntries(sliced) });
    if (isStorageV5Enabled() && r !== void 0) {
      let write = await r.write(STORAGE_SPACES.state(REMOTE_SETTINGS_CONSENT), G, { mode: 384 });
      if (!write.ok)
        logForDebugging(`Remote settings: Failed to record org consent - ${formatStorageError(write.error)}`);
      return;
    }
    if (isDiskless()) return;
    await getFileReader().atomicWrite(_l(), G, 384);
  } catch (error) {
    logForDebugging(`Remote settings: Failed to record org consent - ${errorMessage(error)}`);
  }
}
//@ chunk-82kqcve8.js:159907-159987 placement
var Hf = ".synced-at",
  Yf = 32,
  At = ge({ syncedAtMs: void 0, bodyReceivedAtMs: void 0 }, Pl);
//@ chunk-82kqcve8.js:159987-160048 placement
function Pl(e) {
  ((e.syncedAtMs = void 0), (e.bodyReceivedAtMs = void 0));
}
//@ chunk-82kqcve8.js:160048-160086 placement
function vui(e) {
  At.bodyReceivedAtMs = e;
}
//@ chunk-82kqcve8.js:160086-160119 placement
function oYe(e = getSettingsPath()) {
  return e + Hf;
}
//@ chunk-82kqcve8.js:160119-160562 placement
async function stampRemoteSettingsSync(e = Date.now()) {
  if (Wr()) return;
  let n = oYe(),
    trunc = Math.trunc(e);
  try {
    if (ws === 0 && (await isSymlinkPath(n))) {
      logForDebugging("Remote settings: sync stamp path is a symlink; not writing through it");
      return;
    }
    let s = await open_2(n, constants_2.O_WRONLY | constants_2.O_CREAT | constants_2.O_TRUNC | ws, 384);
    try {
      await s.writeFile(String(trunc), { encoding: "utf-8" });
    } finally {
      await s.close();
    }
    At.syncedAtMs = trunc;
  } catch (error) {
    logForDebugging(
      `Remote settings: could not stamp the sync time (${errorMessage(error)}); the cache's age reads as unknown`,
    );
  }
}
/**
 * 删除远程设置同步戳。
 */
//@ chunk-82kqcve8.js:160562-160707 placement
async function removeSyncStamp() {
  if ((Pl(At), isDiskless())) return;
  try {
    await unlink(oYe());
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Remote settings: could not remove the sync stamp (${errorMessage(error)})`);
  }
}
/**
 * 读同步戳并计算距今时长。
 */
//@ chunk-82kqcve8.js:160707-160824 placement
async function readSyncAge(e = Date.now()) {
  if (Wr()) return;
  let n = await readRemoteSettingsSyncStamp();
  if (n === void 0) return;
  return ((At.syncedAtMs = n), Nr(n, e));
}
/**
 * 远程设置年龄（同步戳、文件修改时间或接收时间）。
 */
//@ chunk-82kqcve8.js:160824-161068 placement
async function settingsAgeMs(e, n, r = Date.now()) {
  let s = At.bodyReceivedAtMs === void 0 ? void 0 : Nr(At.bodyReceivedAtMs, r);
  if (Wr()) return s;
  if (n !== void 0) return n;
  try {
    let h = await lstat_2(getSettingsPath());
    if (h.isFile()) return Nr(Math.trunc(h.mtimeMs), r);
  } catch {}
  return e ? s : void 0;
}
//@ chunk-82kqcve8.js:161068-161161 placement
function kui(e = Date.now()) {
  if (At.syncedAtMs === void 0 || Wr()) return;
  return Nr(At.syncedAtMs, e);
}
//@ chunk-82kqcve8.js:161161-161192 placement
function Wr() {
  return hostSessionSkipsSharedCache() || isDiskless();
}
//@ chunk-82kqcve8.js:161192-161260 placement
function Nr(e, n) {
  let r = n - e;
  return Number.isFinite(r) && r >= 0 ? r : void 0;
}
//@ chunk-82kqcve8.js:161594-161672 placement
async function isSymlinkPath(e) {
  try {
    return (await lstat_2(e)).isSymbolicLink();
  } catch {
    return !1;
  }
}
//@ chunk-82kqcve8.js:161672-161884 placement
function getSettingsWatchPaths(e) {
  let n = uniq([...e.map((s) => resolve_4(s, SETTINGS_FILENAME)), resolve_4(getSettingsPath())]),
    r = getMockRemoteSettingsFixturePath();
  return {
    bodies: uniq([...n, ...(r !== void 0 ? [resolve_4(r)] : [])]),
    vouchers: [
      ...n.flatMap((s) => [signatureFileFor(s), signatureIatFileFor(s), oYe(s)]),
      ...e.flatMap((s) => [
        resolve_4(s, HELPER_CONSENT_STATE_ID),
        resolve_4(s, REMOTE_SETTINGS_CONSENT_FILE),
      ]),
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
  vui,
  removeSyncStamp,
  readDangerousSettingsHash,
  oYe,
  isSymlinkPath,
  Yf,
  kui,
};
