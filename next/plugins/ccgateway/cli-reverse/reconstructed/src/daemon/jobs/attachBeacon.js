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
import { daemonAttachJournal, ATTACH_JOURNAL } from "../../services/daemon/paths.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vrr64ez0.js:2591-2617 placement
var ATTACH_BEACON_STALE_MS = 900000;
var ATTACH_BEACON_MAX_AGE_MS = 86400000;
//@ chunk-vrr64ez0.js:2617-2660 placement
function isBeaconStale(mtimeMs, nowMs) {
  return nowMs - mtimeMs >= ATTACH_BEACON_MAX_AGE_MS || mtimeMs > nowMs + 60000;
}
//@ chunk-vrr64ez0.js:2660-2690 placement
var SESSION_ID_RE = /^[A-Za-z0-9-]{1,64}$/;
//@ chunk-vrr64ez0.js:2690-2734 placement
function beaconPath(jobId) {
  return join(daemonAttachJournal(), `${jobId}.json`);
}
//@ chunk-vrr64ez0.js:2734-2746 placement
var MAX_BEACON_BYTES = 8192;
//@ chunk-vrr64ez0.js:2746-2787 placement
function daemonPath(file) {
  return STORAGE_SPACES.daemon([ATTACH_JOURNAL, file]);
}
//@ chunk-vrr64ez0.js:2787-2825 placement
function beaconFilePath(gestureId) {
  return daemonPath(`${gestureId}.json`);
}
//@ chunk-vrr64ez0.js:2825-2837 placement
var beaconLock; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrr64ez0.js:2825", () => {
  beaconLock = createKeyedQueue();
});
//@ chunk-vrr64ez0.js:2837-2892 placement
function withBeaconLock(gestureId, fn) {
  return beaconLock.run("g:" + gestureId, fn).catch(() => {});
}
//@ chunk-vrr64ez0.js:2892-3330 placement
/**
 * 记录附加手势信标（surface、尝试次数、进程信息）。
 */
async function startAttachBeacon(gestureId, surface, storageV5) {
  if (!SESSION_ID_RE.test(gestureId)) return;
  let beacon = {
    gestureId,
    surface,
    startedAtEpochMs: Date.now(),
    attempt: 0,
  };
  getSpawnLauncherState().ownedBeacons.set(gestureId, beacon);
  await withBeaconLock(gestureId, async () => {
    beacon.pid = process.pid;
    beacon.procStart = await ownProcStartAsync();
    if (storageV5) {
      if (!(await writeOwnedBeaconToStorage(storageV5, gestureId, beacon, true)))
        getSpawnLauncherState().ownedBeacons.delete(gestureId);
      return;
    }
    await mkdir(daemonAttachJournal(), {
      recursive: true,
      mode: 448,
    });
    if (!(await isBeaconDirPresent())) {
      getSpawnLauncherState().ownedBeacons.delete(gestureId);
      return;
    }
    if (getSpawnLauncherState().ownedBeacons.get(gestureId) !== beacon) return;
    await writeFileAtomic(beaconPath(gestureId), jsonStringify(beacon), 384);
  });
  await reconcileBeacons(storageV5);
}
//@ chunk-vrr64ez0.js:3330-3452 placement
async function writeOwnedBeaconToStorage(storage, gestureId, beacon, allowTransient = false) {
  if (!(await isBeaconDirPresent(allowTransient))) return false;
  if (getSpawnLauncherState().ownedBeacons.get(gestureId) === beacon)
    await storage.write(beaconFilePath(gestureId), jsonStringify(beacon));
  return true;
}
//@ chunk-vrr64ez0.js:3452-3725 placement
/**
 * 记录一次附着尝试编号（单调递增），异步写回信标（存储后端或本地原子写）。
 */
function recordAttachAttempt(gestureId, attempt, storage) {
  let beacon = getSpawnLauncherState().ownedBeacons.get(gestureId);
  if (!beacon || !Number.isInteger(attempt) || attempt <= (beacon.attempt ?? 0)) return;
  beacon.attempt = attempt;
  withBeaconLock(gestureId, async () => {
    beacon.procStart ??= await ownProcStartAsync();
    if (storage) {
      await writeOwnedBeaconToStorage(storage, gestureId, beacon);
      return;
    }
    if (!(await isBeaconDirPresent())) return;
    if (getSpawnLauncherState().ownedBeacons.get(gestureId) !== beacon) return;
    await writeFileAtomic(beaconPath(gestureId), jsonStringify(beacon), 384);
  });
}
//@ chunk-vrr64ez0.js:3725-4540 placement
/**
 * 更新附加信标的标记（期待标记、daemon 已启动、交互已达）。
 */
function updateAttachBeacon(gestureId, update, storageV5) {
  let beacon = getSpawnLauncherState().ownedBeacons.get(gestureId);
  if (!beacon) return;
  if (update.marksExpected !== undefined)
    beacon.marksExpected = beacon.marksExpected === true || update.marksExpected;
  if (update.daemonBooted !== undefined)
    beacon.daemonBooted = beacon.daemonBooted === true || update.daemonBooted;
  if (update.interactiveReached) beacon.interactiveReached = true;
  if (update.attachMs !== undefined) beacon.attachMs ??= update.attachMs;
  if (update.msgsLoaded !== undefined) beacon.msgsLoaded ??= update.msgsLoaded;
  if (update.msgsInJsonl !== undefined) beacon.msgsInJsonl ??= update.msgsInJsonl;
  if (update.msgsRenderedAtFirstPaint !== undefined)
    beacon.msgsRenderedAtFirstPaint ??= update.msgsRenderedAtFirstPaint;
  if (update.attachCold !== undefined && beacon.interactiveReached !== true)
    beacon.attachCold = update.attachCold;
  if (update.via !== undefined && beacon.interactiveReached !== true) beacon.via = update.via;
  withBeaconLock(gestureId, async () => {
    beacon.procStart ??= await ownProcStartAsync();
    if (storageV5) {
      await writeOwnedBeaconToStorage(storageV5, gestureId, beacon);
      return;
    }
    if (!(await isBeaconDirPresent())) return;
    if (getSpawnLauncherState().ownedBeacons.get(gestureId) !== beacon) return;
    await writeFileAtomic(beaconPath(gestureId), jsonStringify(beacon), 384);
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
      let isTransientError = false;
      for (let j = 0; ; j++) {
        let deleteResult = await storageV5.delete(beaconFilePath(gestureId));
        if (deleteResult.ok) return;
        let telemetryCode =
          "telemetryCode" in deleteResult.error ? deleteResult.error.telemetryCode : undefined;
        isTransientError = telemetryCode !== undefined && TRANSIENT_FS_ERRORS.has(telemetryCode);
        if (isTransientError && getPlatform() === "windows" && j < BEACON_RETRY_COUNT - 1) {
          await sleep(BEACON_RETENTION_LIMIT);
          continue;
        }
        break;
      }
      if (!isTransientError) return;
      await storageV5.write(beaconFilePath(gestureId), "{}");
      return;
    }
    let beaconFile = beaconPath(gestureId);
    if (!(await isBeaconDirPresent())) return;
    for (let j = 0; ; j++)
      try {
        await unlink(beaconFile);
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
    await rename(beaconFile, `${beaconFile}.${process.pid}.cleared`).catch(() => {});
  });
}
//@ chunk-vrr64ez0.js:5174-5189 placement
var BEACON_RETRY_COUNT = 4;
var BEACON_RETENTION_LIMIT = 50;
//@ chunk-vrr64ez0.js:5189-5291 placement
async function isBeaconDirPresent(allowMissing = false) {
  try {
    return (await lstat(daemonAttachJournal())).isDirectory();
  } catch (error) {
    return allowMissing && getErrnoCode(error) === "ENOENT";
  }
}
//@ chunk-vrr64ez0.js:5291-5403 placement
async function readBeaconFile(fileName) {
  try {
    let text = await readSmallFileOrNull(join(daemonAttachJournal(), fileName), MAX_BEACON_BYTES);
    if (text === null) return null;
    return parseBeacon(text);
  } catch {
    return null;
  }
}
//@ chunk-vrr64ez0.js:5403-5722 placement
/**
 * 读取一个信标记录。
 */
async function readBeacon(storageV5, file) {
  let beaconPath = daemonPath(file);
  let stat = await storageV5.statMeta(beaconPath);
  if (!stat.ok || stat.value.size > MAX_BEACON_BYTES) return null;
  let readResult = await storageV5.read([beaconPath]);
  if (!readResult.ok) return null;
  let fileEntry = readResult.value.items[0];
  if (!fileEntry.found || fileEntry.totalBytes > MAX_BEACON_BYTES) return null;
  let beacon = parseBeacon(Buffer.from(fileEntry.value).toString("utf8"));
  return beacon === null
    ? null
    : {
        entry: beacon,
        version: fileEntry.version,
        mtimeMs: fileEntry.mtimeMs,
      };
}
//@ chunk-vrr64ez0.js:5722-5954 placement
function parseBeacon(text) {
  try {
    let parsed = jsonParse(text);
    return !!parsed &&
      typeof parsed === "object" &&
      typeof parsed.gestureId === "string" &&
      typeof parsed.startedAtEpochMs === "number" &&
      Number.isFinite(parsed.startedAtEpochMs) &&
      parsed.startedAtEpochMs <= Date.now() + 60000
      ? parsed
      : null;
  } catch {
    return null;
  }
}
//@ chunk-vrr64ez0.js:5954-6160 placement
async function isBeaconOwnerGone(beacon) {
  if (typeof beacon.pid !== "number" || !Number.isInteger(beacon.pid) || beacon.pid <= 0) return false;
  if (!isProcessRunning(beacon.pid)) return true;
  if (beacon.procStart === undefined) return false;
  let processStartTime = await getProcessStartTimeAsync(beacon.pid);
  return processStartTime !== undefined && processStartTime !== beacon.procStart;
}
//@ chunk-vrr64ez0.js:6160-6254 placement
async function isBeaconFileStale(fileName, nowMs) {
  try {
    let stats = await lstat(join(daemonAttachJournal(), fileName));
    return isBeaconStale(stats.mtimeMs, nowMs);
  } catch {
    return false;
  }
}
//@ chunk-vrr64ez0.js:6254-6306 placement
function reconcileBeacons(storageV5) {
  return beaconLock.run("reconcile", () => listBeacons(storageV5));
}
//@ chunk-vrr64ez0.js:6306-6989 placement
/**
 * 列出现存信标（清理过期的）。
 */
async function listBeacons(storageV5) {
  if (storageV5) return listBeaconsFromStorage(storageV5);
  if (!(await isBeaconDirPresent())) return [];
  let names;
  try {
    names = await readdir(daemonAttachJournal());
  } catch {
    return [];
  }
  let now = Date.now();
  let beacons = [];
  for (let name of names) {
    if (!name.endsWith(".json")) {
      try {
        let staleStat = await lstat(join(daemonAttachJournal(), name));
        if (isBeaconStale(staleStat.mtimeMs, now)) await unlink(join(daemonAttachJournal(), name));
      } catch {}
      continue;
    }
    let beacon = await readBeaconFile(name);
    if (beacon === null) {
      try {
        let staleStat = await lstat(join(daemonAttachJournal(), name));
        if (isBeaconStale(staleStat.mtimeMs, now)) await unlink(join(daemonAttachJournal(), name));
      } catch {}
      continue;
    }
    let ageMs = now - beacon.startedAtEpochMs;
    if (
      !(typeof beacon.pid === "number" && Number.isInteger(beacon.pid) && beacon.pid > 0
        ? ageMs >= ATTACH_BEACON_STALE_MS &&
          ((await isBeaconOwnerGone(beacon)) ||
            (beacon.procStart === undefined && (await isBeaconFileStale(name, now))))
        : ageMs >= ATTACH_BEACON_MAX_AGE_MS)
    ) {
      beacons.push(beacon);
      continue;
    }
    let claimedPath = join(daemonAttachJournal(), `${name}.${process.pid}.claimed`);
    try {
      await rename(join(daemonAttachJournal(), name), claimedPath);
    } catch {
      continue;
    }
    await unlink(claimedPath).catch(() => {});
    reportAttachOutcome(beacon);
  }
  return beacons;
}
//@ chunk-vrr64ez0.js:6989-8047 placement
/**
 * 上报附加结果 tengu_bg_attach_outcome。
 */
function reportAttachOutcome(beacon) {
  let reached = beacon.interactiveReached === true;
  let detachedWithoutMarks = !reached && beacon.marksExpected === false;
  let attachMs =
    reached &&
    typeof beacon.attachMs === "number" &&
    Number.isFinite(beacon.attachMs) &&
    beacon.attachMs >= 0 &&
    beacon.attachMs < 86400000
      ? Math.round(beacon.attachMs)
      : undefined;
  logEvent("tengu_bg_attach_outcome", {
    outcome: fromEnum(reached || detachedWithoutMarks ? "detached" : "error"),
    got_ack: reached || typeof beacon.marksExpected === "boolean",
    got_first_frame: reached ? true : detachedWithoutMarks ? undefined : false,
    synthetic: true,
    apc_detach: false,
    timed_out: reached || detachedWithoutMarks ? undefined : true,
    journal_recovered: true,
    attach_ms: attachMs,
    first_frame_kind: fromEnumOpt(reached ? "real" : undefined),
    marks_expected: reached
      ? true
      : typeof beacon.marksExpected === "boolean"
        ? beacon.marksExpected
        : undefined,
    attempt:
      typeof beacon.attempt === "number" &&
      Number.isInteger(beacon.attempt) &&
      beacon.attempt >= 0 &&
      beacon.attempt < 1e6
        ? beacon.attempt + 1
        : 0,
    gesture_id: sanitizeMarkName(beacon.gestureId),
    surface: fromEnumOpt(
      beacon.surface === "fleet" || beacon.surface === "bg_cli" ? beacon.surface : undefined,
    ),
    daemon_booted: typeof beacon.daemonBooted === "boolean" ? beacon.daemonBooted : undefined,
    attach_cold: typeof beacon.attachCold === "boolean" ? beacon.attachCold : undefined,
    via: fromEnumOpt(normalizeDaemonSessionState(beacon.via)),
    msgs_loaded: reached ? boundedMarkCountOrUndefined(beacon.msgsLoaded) : undefined,
    msgs_in_jsonl: reached ? boundedMarkCountOrUndefined(beacon.msgsInJsonl) : undefined,
    msgs_rendered_at_first_paint: reached
      ? boundedMarkCountOrUndefined(beacon.msgsRenderedAtFirstPaint)
      : undefined,
  });
}
//@ chunk-vrr64ez0.js:8047-9021 placement
/**
 * 从存储后端列出信标。
 */
async function listBeaconsFromStorage(storageV5) {
  if (!(await isBeaconDirPresent())) return [];
  let files = [];
  let cursor;
  do {
    let listing = await storageV5.listEntries(
      {
        namespace: "daemon",
        relPath: [ATTACH_JOURNAL],
      },
      cursor === undefined
        ? undefined
        : {
            cursor,
          },
    );
    if (!listing.ok) return [];
    for (let item of listing.value.items) {
      if (
        item.kind !== "key" ||
        item.key.namespace !== "daemon" ||
        item.key.relPath.length !== 2 ||
        item.key.relPath[0] !== ATTACH_JOURNAL
      )
        continue;
      let fileName = item.key.relPath[1];
      if (fileName !== undefined)
        files.push({
          file: fileName,
          size: item.size,
          mtimeMs: item.mtimeMs,
        });
    }
    cursor = listing.value.cursor;
  } while (cursor !== undefined);
  let now = Date.now();
  let beacons = [];
  for (let { file, size, mtimeMs } of files) {
    let isMtimeStale = mtimeMs !== undefined && isBeaconStale(mtimeMs, now);
    if (!file.endsWith(".json")) {
      if (isMtimeStale) await storageV5.delete(daemonPath(file));
      continue;
    }
    let read = size !== undefined && size > MAX_BEACON_BYTES ? null : await readBeacon(storageV5, file);
    if (read === null) {
      if (isMtimeStale) await storageV5.delete(daemonPath(file));
      continue;
    }
    let entry = read.entry;
    let ageMs = now - entry.startedAtEpochMs;
    if (
      !(typeof entry.pid === "number" && Number.isInteger(entry.pid) && entry.pid > 0
        ? ageMs >= ATTACH_BEACON_STALE_MS &&
          ((await isBeaconOwnerGone(entry)) ||
            (entry.procStart === undefined && isBeaconStale(read.mtimeMs, now)))
        : ageMs >= ATTACH_BEACON_MAX_AGE_MS)
    ) {
      beacons.push(entry);
      continue;
    }
    let deleteResult = await storageV5.delete(daemonPath(file), {
      precondition: {
        type: "ifMatch",
        version: read.version,
      },
    });
    if (!deleteResult.ok || !deleteResult.value.existed) continue;
    reportAttachOutcome(entry);
  }
  return beacons;
}
export { clearAttachBeacon, startAttachBeacon, updateAttachBeacon, recordAttachAttempt };
