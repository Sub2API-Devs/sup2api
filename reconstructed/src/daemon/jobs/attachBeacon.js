/**
 * daemon/jobs/attachBeacon.ts
 *
 * 2.1.316 新增：上报附加结果 tengu_bg_attach_outcome；从存储后端列出信标等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrr64ez0.js (25)
 * attribution: placement 25
 */
import { join } from "path";
import { mkdir, unlink, rename, lstat, readdir } from "fs/promises";
import { daemonAttachJournal, ATTACH_JOURNAL } from "../../utils/sandbox/userNamespace.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { getSpawnLauncherState } from "../../services/daemon/spawnLauncher.js";
import { ownProcStartAsync, getProcessStartTimeAsync } from "../../utils/processIdentity.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { TRANSIENT_FS_ERRORS } from "../../utils/plugins/safeCopy.js";
import { getPlatform } from "../../utils/platform.js";
import { sleep } from "../../utils/sleep.js";
import { getErrnoCode } from "../../utils/errors.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { normalizeDaemonSessionState } from "../../services/daemon/sessionStatus.js";
import { boundedMarkCountOrUndefined } from "../../services/daemon/leaseProtocol.js";

//@ chunk-vrr64ez0.js:2591-2617 placement
var ATTACH_BEACON_STALE_MS = 900000;
var ATTACH_BEACON_MAX_AGE_MS = 86400000;
//@ chunk-vrr64ez0.js:2617-2660 placement
function isBeaconStale(mtimeMs, n) {
  return n - mtimeMs >= ATTACH_BEACON_MAX_AGE_MS || mtimeMs > n + 60000;
}
//@ chunk-vrr64ez0.js:2660-2690 placement
var SESSION_ID_RE = /^[A-Za-z0-9-]{1,64}$/;
//@ chunk-vrr64ez0.js:2690-2734 placement
function beaconPath(e) {
  return join(daemonAttachJournal(), `${e}.json`);
}
//@ chunk-vrr64ez0.js:2734-2746 placement
var MAX_BEACON_BYTES = 8192;
//@ chunk-vrr64ez0.js:2746-2787 placement
function daemonPath(file) {
  return STORAGE_SPACES.daemon([ATTACH_JOURNAL, file]);
}
//@ chunk-vrr64ez0.js:2787-2825 placement
function beaconFilePath(e) {
  return daemonPath(`${e}.json`);
}
//@ chunk-vrr64ez0.js:2825-2837 placement
var beaconLock = createKeyedQueue();
//@ chunk-vrr64ez0.js:2837-2892 placement
function withBeaconLock(e, n) {
  return beaconLock.run("g:" + e, n).catch(() => {});
}
//@ chunk-vrr64ez0.js:2892-3330 placement
/**
 * 记录附加手势信标（surface、尝试次数、进程信息）。
 */
async function startAttachBeacon(e, surface, storageV5) {
  if (!SESSION_ID_RE.test(e)) return;
  let r = {
    gestureId: e,
    surface,
    startedAtEpochMs: Date.now(),
    attempt: 0,
  };
  getSpawnLauncherState().ownedBeacons.set(e, r);
  await withBeaconLock(e, async () => {
    r.pid = process.pid;
    r.procStart = await ownProcStartAsync();
    if (storageV5) {
      if (!(await writeOwnedBeaconToStorage(storageV5, e, r, true)))
        getSpawnLauncherState().ownedBeacons.delete(e);
      return;
    }
    await mkdir(daemonAttachJournal(), {
      recursive: true,
      mode: 448,
    });
    if (!(await isBeaconDirPresent())) {
      getSpawnLauncherState().ownedBeacons.delete(e);
      return;
    }
    if (getSpawnLauncherState().ownedBeacons.get(e) !== r) return;
    await writeFileAtomic(beaconPath(e), jsonStringify(r), 384);
  });
  await reconcileBeacons(storageV5);
}
//@ chunk-vrr64ez0.js:3330-3452 placement
async function writeOwnedBeaconToStorage(e, n, o, r = false) {
  if (!(await isBeaconDirPresent(r))) return false;
  if (getSpawnLauncherState().ownedBeacons.get(n) === o) await e.write(beaconFilePath(n), jsonStringify(o));
  return true;
}
//@ chunk-vrr64ez0.js:3452-3725 placement
/**
 * 记录一次附着尝试编号（单调递增），异步写回信标（存储后端或本地原子写）。
 */
function recordAttachAttempt(gestureId, attempt, storageV5) {
  let r = getSpawnLauncherState().ownedBeacons.get(gestureId);
  if (!r || !Number.isInteger(attempt) || attempt <= (r.attempt ?? 0)) return;
  r.attempt = attempt;
  withBeaconLock(gestureId, async () => {
    r.procStart ??= await ownProcStartAsync();
    if (storageV5) {
      await writeOwnedBeaconToStorage(storageV5, gestureId, r);
      return;
    }
    if (!(await isBeaconDirPresent())) return;
    if (getSpawnLauncherState().ownedBeacons.get(gestureId) !== r) return;
    await writeFileAtomic(beaconPath(gestureId), jsonStringify(r), 384);
  });
}
//@ chunk-vrr64ez0.js:3725-4540 placement
/**
 * 更新附加信标的标记（期待标记、daemon 已启动、交互已达）。
 */
function updateAttachBeacon(e, n, o) {
  let r = getSpawnLauncherState().ownedBeacons.get(e);
  if (!r) return;
  if (n.marksExpected !== undefined) r.marksExpected = r.marksExpected === true || n.marksExpected;
  if (n.daemonBooted !== undefined) r.daemonBooted = r.daemonBooted === true || n.daemonBooted;
  if (n.interactiveReached) r.interactiveReached = true;
  if (n.attachMs !== undefined) r.attachMs ??= n.attachMs;
  if (n.msgsLoaded !== undefined) r.msgsLoaded ??= n.msgsLoaded;
  if (n.msgsInJsonl !== undefined) r.msgsInJsonl ??= n.msgsInJsonl;
  if (n.msgsRenderedAtFirstPaint !== undefined) r.msgsRenderedAtFirstPaint ??= n.msgsRenderedAtFirstPaint;
  if (n.attachCold !== undefined && r.interactiveReached !== true) r.attachCold = n.attachCold;
  if (n.via !== undefined && r.interactiveReached !== true) r.via = n.via;
  withBeaconLock(e, async () => {
    r.procStart ??= await ownProcStartAsync();
    if (o) {
      await writeOwnedBeaconToStorage(o, e, r);
      return;
    }
    if (!(await isBeaconDirPresent())) return;
    if (getSpawnLauncherState().ownedBeacons.get(e) !== r) return;
    await writeFileAtomic(beaconPath(e), jsonStringify(r), 384);
  });
}
//@ chunk-vrr64ez0.js:4540-5174 placement
/**
 * 删除附加信标。
 */
async function clearAttachBeacon(gestureId, storageV5) {
  if (!SESSION_ID_RE.test(gestureId)) return;
  getSpawnLauncherState().ownedBeacons.delete(gestureId);
  await withBeaconLock(gestureId, async () => {
    if (storageV5) {
      if (!(await isBeaconDirPresent())) return;
      let r = false;
      for (let j = 0; ; j++) {
        let s = await storageV5.delete(beaconFilePath(gestureId));
        if (s.ok) return;
        let telemetryCode = "telemetryCode" in s.error ? s.error.telemetryCode : undefined;
        r = telemetryCode !== undefined && TRANSIENT_FS_ERRORS.has(telemetryCode);
        if (r && getPlatform() === "windows" && j < BEACON_RETRY_COUNT - 1) {
          await sleep(BEACON_RETENTION_LIMIT);
          continue;
        }
        break;
      }
      if (!r) return;
      await storageV5.write(beaconFilePath(gestureId), "{}");
      return;
    }
    let o = beaconPath(gestureId);
    if (!(await isBeaconDirPresent())) return;
    for (let j = 0; ; j++)
      try {
        await unlink(o);
        return;
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT") return;
        if (
          getPlatform() === "windows" &&
          errnoCode !== undefined &&
          TRANSIENT_FS_ERRORS.has(errnoCode) &&
          j < BEACON_RETRY_COUNT - 1
        ) {
          await sleep(BEACON_RETENTION_LIMIT);
          continue;
        }
        break;
      }
    await rename(o, `${o}.${process.pid}.cleared`).catch(() => {});
  });
}
//@ chunk-vrr64ez0.js:5174-5189 placement
var BEACON_RETRY_COUNT = 4;
var BEACON_RETENTION_LIMIT = 50;
//@ chunk-vrr64ez0.js:5189-5291 placement
async function isBeaconDirPresent(e = false) {
  try {
    return (await lstat(daemonAttachJournal())).isDirectory();
  } catch (error) {
    return e && getErrnoCode(error) === "ENOENT";
  }
}
//@ chunk-vrr64ez0.js:5291-5403 placement
async function readBeaconFile(e) {
  try {
    let smallFileOrNull = await readSmallFileOrNull(join(daemonAttachJournal(), e), MAX_BEACON_BYTES);
    if (smallFileOrNull === null) return null;
    return parseBeacon(smallFileOrNull);
  } catch {
    return null;
  }
}
//@ chunk-vrr64ez0.js:5403-5722 placement
/**
 * 读取一个信标记录。
 */
async function readBeacon(e, file) {
  let o = daemonPath(file);
  let r = await e.statMeta(o);
  if (!r.ok || r.value.size > MAX_BEACON_BYTES) return null;
  let u = await e.read([o]);
  if (!u.ok) return null;
  let s = u.value.items[0];
  if (!s.found || s.totalBytes > MAX_BEACON_BYTES) return null;
  let beacon = parseBeacon(Buffer.from(s.value).toString("utf8"));
  return beacon === null
    ? null
    : {
        entry: beacon,
        version: s.version,
        mtimeMs: s.mtimeMs,
      };
}
//@ chunk-vrr64ez0.js:5722-5954 placement
function parseBeacon(e) {
  try {
    let n = jsonParse(e);
    return !!n &&
      typeof n === "object" &&
      typeof n.gestureId === "string" &&
      typeof n.startedAtEpochMs === "number" &&
      Number.isFinite(n.startedAtEpochMs) &&
      n.startedAtEpochMs <= Date.now() + 60000
      ? n
      : null;
  } catch {
    return null;
  }
}
//@ chunk-vrr64ez0.js:5954-6160 placement
async function isBeaconOwnerGone(e) {
  if (typeof e.pid !== "number" || !Number.isInteger(e.pid) || e.pid <= 0) return false;
  if (!isProcessRunning(e.pid)) return true;
  if (e.procStart === undefined) return false;
  let processStartTime = await getProcessStartTimeAsync(e.pid);
  return processStartTime !== undefined && processStartTime !== e.procStart;
}
//@ chunk-vrr64ez0.js:6160-6254 placement
async function isBeaconFileStale(e, n) {
  try {
    let o = await lstat(join(daemonAttachJournal(), e));
    return isBeaconStale(o.mtimeMs, n);
  } catch {
    return false;
  }
}
//@ chunk-vrr64ez0.js:6254-6306 placement
function reconcileBeacons(e) {
  return beaconLock.run("reconcile", () => listBeacons(e));
}
//@ chunk-vrr64ez0.js:6306-6989 placement
/**
 * 列出现存信标（清理过期的）。
 */
async function listBeacons(e) {
  if (e) return listBeaconsFromStorage(e);
  if (!(await isBeaconDirPresent())) return [];
  let n;
  try {
    n = await readdir(daemonAttachJournal());
  } catch {
    return [];
  }
  let now = Date.now();
  let r = [];
  for (let u of n) {
    if (!u.endsWith(".json")) {
      try {
        let S = await lstat(join(daemonAttachJournal(), u));
        if (isBeaconStale(S.mtimeMs, now)) await unlink(join(daemonAttachJournal(), u));
      } catch {}
      continue;
    }
    let beaconFile = await readBeaconFile(u);
    if (beaconFile === null) {
      try {
        let S = await lstat(join(daemonAttachJournal(), u));
        if (isBeaconStale(S.mtimeMs, now)) await unlink(join(daemonAttachJournal(), u));
      } catch {}
      continue;
    }
    let h = now - beaconFile.startedAtEpochMs;
    if (
      !(typeof beaconFile.pid === "number" && Number.isInteger(beaconFile.pid) && beaconFile.pid > 0
        ? h >= ATTACH_BEACON_STALE_MS &&
          ((await isBeaconOwnerGone(beaconFile)) ||
            (beaconFile.procStart === undefined && (await isBeaconFileStale(u, now))))
        : h >= ATTACH_BEACON_MAX_AGE_MS)
    ) {
      r.push(beaconFile);
      continue;
    }
    let T = join(daemonAttachJournal(), `${u}.${process.pid}.claimed`);
    try {
      await rename(join(daemonAttachJournal(), u), T);
    } catch {
      continue;
    }
    await unlink(T).catch(() => {});
    reportAttachOutcome(beaconFile);
  }
  return r;
}
//@ chunk-vrr64ez0.js:6989-8047 placement
/**
 * 上报附加结果 tengu_bg_attach_outcome。
 */
function reportAttachOutcome(e) {
  let n = e.interactiveReached === true;
  let o = !n && e.marksExpected === false;
  let attachMs =
    n &&
    typeof e.attachMs === "number" &&
    Number.isFinite(e.attachMs) &&
    e.attachMs >= 0 &&
    e.attachMs < 86400000
      ? Math.round(e.attachMs)
      : undefined;
  logEvent("tengu_bg_attach_outcome", {
    outcome: fromEnum(n || o ? "detached" : "error"),
    got_ack: n || typeof e.marksExpected === "boolean",
    got_first_frame: n ? true : o ? undefined : false,
    synthetic: true,
    apc_detach: false,
    timed_out: n || o ? undefined : true,
    journal_recovered: true,
    attach_ms: attachMs,
    first_frame_kind: fromEnumOpt(n ? "real" : undefined),
    marks_expected: n ? true : typeof e.marksExpected === "boolean" ? e.marksExpected : undefined,
    attempt:
      typeof e.attempt === "number" && Number.isInteger(e.attempt) && e.attempt >= 0 && e.attempt < 1e6
        ? e.attempt + 1
        : 0,
    gesture_id: sanitizeMarkName(e.gestureId),
    surface: fromEnumOpt(e.surface === "fleet" || e.surface === "bg_cli" ? e.surface : undefined),
    daemon_booted: typeof e.daemonBooted === "boolean" ? e.daemonBooted : undefined,
    attach_cold: typeof e.attachCold === "boolean" ? e.attachCold : undefined,
    via: fromEnumOpt(normalizeDaemonSessionState(e.via)),
    msgs_loaded: n ? boundedMarkCountOrUndefined(e.msgsLoaded) : undefined,
    msgs_in_jsonl: n ? boundedMarkCountOrUndefined(e.msgsInJsonl) : undefined,
    msgs_rendered_at_first_paint: n ? boundedMarkCountOrUndefined(e.msgsRenderedAtFirstPaint) : undefined,
  });
}
//@ chunk-vrr64ez0.js:8047-9021 placement
/**
 * 从存储后端列出信标。
 */
async function listBeaconsFromStorage(e) {
  if (!(await isBeaconDirPresent())) return [];
  let n = [];
  let o;
  do {
    let s = await e.listEntries(
      {
        namespace: "daemon",
        relPath: [ATTACH_JOURNAL],
      },
      o === undefined
        ? undefined
        : {
            cursor: o,
          },
    );
    if (!s.ok) return [];
    for (let item of s.value.items) {
      if (
        item.kind !== "key" ||
        item.key.namespace !== "daemon" ||
        item.key.relPath.length !== 2 ||
        item.key.relPath[0] !== ATTACH_JOURNAL
      )
        continue;
      let A = item.key.relPath[1];
      if (A !== undefined)
        n.push({
          file: A,
          size: item.size,
          mtimeMs: item.mtimeMs,
        });
    }
    o = s.value.cursor;
  } while (o !== undefined);
  let now = Date.now();
  let u = [];
  for (let { file, size, mtimeMs } of n) {
    let w = mtimeMs !== undefined && isBeaconStale(mtimeMs, now);
    if (!file.endsWith(".json")) {
      if (w) await e.delete(daemonPath(file));
      continue;
    }
    let T = size !== undefined && size > MAX_BEACON_BYTES ? null : await readBeacon(e, file);
    if (T === null) {
      if (w) await e.delete(daemonPath(file));
      continue;
    }
    let entry = T.entry;
    let v = now - entry.startedAtEpochMs;
    if (
      !(typeof entry.pid === "number" && Number.isInteger(entry.pid) && entry.pid > 0
        ? v >= ATTACH_BEACON_STALE_MS &&
          ((await isBeaconOwnerGone(entry)) ||
            (entry.procStart === undefined && isBeaconStale(T.mtimeMs, now)))
        : v >= ATTACH_BEACON_MAX_AGE_MS)
    ) {
      u.push(entry);
      continue;
    }
    let j = await e.delete(daemonPath(file), {
      precondition: {
        type: "ifMatch",
        version: T.version,
      },
    });
    if (!j.ok || !j.value.existed) continue;
    reportAttachOutcome(entry);
  }
  return u;
}
export { clearAttachBeacon, startAttachBeacon, updateAttachBeacon, recordAttachAttempt };
