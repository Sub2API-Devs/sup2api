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
import { join, join as join_2, join as join_3 } from "path";
import {
  mkdir,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  rename,
  lstat,
  lstat as lstat_2,
  readdir,
  readdir as readdir_2,
} from "fs/promises";
import { rwe, ATTACH_JOURNAL } from "../../utils/sandbox/userNamespace.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { uB } from "../../services/daemon/spawnLauncher.js";
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
import { ye } from "../../utils/startupMarks.js";
import { ENt } from "../../services/daemon/sessionStatus.js";
import { boundedMarkCountOrUndefined } from "../../services/daemon/leaseProtocol.js";

//@ chunk-vrr64ez0.js:2591-2617 placement
var Zt = 900000,
  wt = 86400000;
//@ chunk-vrr64ez0.js:2617-2660 placement
function We(e, n) {
  return n - e >= wt || e > n + 60000;
}
//@ chunk-vrr64ez0.js:2660-2690 placement
var Qt = /^[A-Za-z0-9-]{1,64}$/;
//@ chunk-vrr64ez0.js:2690-2734 placement
function at(e) {
  return join(rwe(), `${e}.json`);
}
//@ chunk-vrr64ez0.js:2734-2746 placement
var ot = 8192;
//@ chunk-vrr64ez0.js:2746-2787 placement
function $e(e) {
  return STORAGE_SPACES.daemon([ATTACH_JOURNAL, e]);
}
//@ chunk-vrr64ez0.js:2787-2825 placement
function yt(e) {
  return $e(`${e}.json`);
}
//@ chunk-vrr64ez0.js:2825-2837 placement
var en = createKeyedQueue();
//@ chunk-vrr64ez0.js:2837-2892 placement
function st(e, n) {
  return en.run("g:" + e, n).catch(() => {});
}
/**
 * 记录附加手势信标（surface、尝试次数、进程信息）。
 */
//@ chunk-vrr64ez0.js:2892-3330 placement
async function startAttachBeacon(e, n, o) {
  if (!Qt.test(e)) return;
  let r = { gestureId: e, surface: n, startedAtEpochMs: Date.now(), attempt: 0 };
  (uB().ownedBeacons.set(e, r),
    await st(e, async () => {
      if (((r.pid = process.pid), (r.procStart = await ownProcStartAsync()), o)) {
        if (!(await writeOwnedBeaconToStorage(o, e, r, !0))) uB().ownedBeacons.delete(e);
        return;
      }
      if ((await mkdir(rwe(), { recursive: !0, mode: 448 }), !(await isBeaconDirPresent()))) {
        uB().ownedBeacons.delete(e);
        return;
      }
      if (uB().ownedBeacons.get(e) !== r) return;
      await writeFileAtomic(at(e), jsonStringify(r), 384);
    }),
    await Vn(o));
}
//@ chunk-vrr64ez0.js:3330-3452 placement
async function writeOwnedBeaconToStorage(e, n, o, r = !1) {
  if (!(await isBeaconDirPresent(r))) return !1;
  if (uB().ownedBeacons.get(n) === o) await e.write(yt(n), jsonStringify(o));
  return !0;
}
/**
 * 记录一次附着尝试编号（单调递增），异步写回信标（存储后端或本地原子写）。
 */
//@ chunk-vrr64ez0.js:3452-3725 placement
function recordAttachAttempt(e, n, o) {
  let r = uB().ownedBeacons.get(e);
  if (!r || !Number.isInteger(n) || n <= (r.attempt ?? 0)) return;
  ((r.attempt = n),
    st(e, async () => {
      if (((r.procStart ??= await ownProcStartAsync()), o)) {
        await writeOwnedBeaconToStorage(o, e, r);
        return;
      }
      if (!(await isBeaconDirPresent())) return;
      if (uB().ownedBeacons.get(e) !== r) return;
      await writeFileAtomic(at(e), jsonStringify(r), 384);
    }));
}
/**
 * 更新附加信标的标记（期待标记、daemon 已启动、交互已达）。
 */
//@ chunk-vrr64ez0.js:3725-4540 placement
function updateAttachBeacon(e, n, o) {
  let r = uB().ownedBeacons.get(e);
  if (!r) return;
  if (n.marksExpected !== void 0) r.marksExpected = r.marksExpected === !0 || n.marksExpected;
  if (n.daemonBooted !== void 0) r.daemonBooted = r.daemonBooted === !0 || n.daemonBooted;
  if (n.interactiveReached) r.interactiveReached = !0;
  if (n.attachMs !== void 0) r.attachMs ??= n.attachMs;
  if (n.msgsLoaded !== void 0) r.msgsLoaded ??= n.msgsLoaded;
  if (n.msgsInJsonl !== void 0) r.msgsInJsonl ??= n.msgsInJsonl;
  if (n.msgsRenderedAtFirstPaint !== void 0) r.msgsRenderedAtFirstPaint ??= n.msgsRenderedAtFirstPaint;
  if (n.attachCold !== void 0 && r.interactiveReached !== !0) r.attachCold = n.attachCold;
  if (n.via !== void 0 && r.interactiveReached !== !0) r.via = n.via;
  st(e, async () => {
    if (((r.procStart ??= await ownProcStartAsync()), o)) {
      await writeOwnedBeaconToStorage(o, e, r);
      return;
    }
    if (!(await isBeaconDirPresent())) return;
    if (uB().ownedBeacons.get(e) !== r) return;
    await writeFileAtomic(at(e), jsonStringify(r), 384);
  });
}
/**
 * 删除附加信标。
 */
//@ chunk-vrr64ez0.js:4540-5174 placement
async function clearAttachBeacon(e, n) {
  if (!Qt.test(e)) return;
  (uB().ownedBeacons.delete(e),
    await st(e, async () => {
      if (n) {
        if (!(await isBeaconDirPresent())) return;
        let r = !1;
        for (let u = 0; ; u++) {
          let s = await n.delete(yt(e));
          if (s.ok) return;
          let h = "telemetryCode" in s.error ? s.error.telemetryCode : void 0;
          if (
            ((r = h !== void 0 && TRANSIENT_FS_ERRORS.has(h)), r && getPlatform() === "windows" && u < zt - 1)
          ) {
            await sleep(Yt);
            continue;
          }
          break;
        }
        if (!r) return;
        await n.write(yt(e), "{}");
        return;
      }
      let o = at(e);
      if (!(await isBeaconDirPresent())) return;
      for (let r = 0; ; r++)
        try {
          await unlink(o);
          return;
        } catch (error) {
          let s = getErrnoCode(error);
          if (s === "ENOENT") return;
          if (getPlatform() === "windows" && s !== void 0 && TRANSIENT_FS_ERRORS.has(s) && r < zt - 1) {
            await sleep(Yt);
            continue;
          }
          break;
        }
      await rename(o, `${o}.${process.pid}.cleared`).catch(() => {});
    }));
}
//@ chunk-vrr64ez0.js:5174-5189 placement
var zt = 4,
  Yt = 50;
//@ chunk-vrr64ez0.js:5189-5291 placement
async function isBeaconDirPresent(e = !1) {
  try {
    return (await lstat(rwe())).isDirectory();
  } catch (error) {
    return e && getErrnoCode(error) === "ENOENT";
  }
}
//@ chunk-vrr64ez0.js:5291-5403 placement
async function readBeaconFile(e) {
  try {
    let n = await readSmallFileOrNull(join(rwe(), e), ot);
    if (n === null) return null;
    return parseBeacon(n);
  } catch {
    return null;
  }
}
/**
 * 读取一个信标记录。
 */
//@ chunk-vrr64ez0.js:5403-5722 placement
async function readBeacon(e, n) {
  let o = $e(n),
    statMeta = await e.statMeta(o);
  if (!statMeta.ok || statMeta.value.size > ot) return null;
  let read = await e.read([o]);
  if (!read.ok) return null;
  let s = read.value.items[0];
  if (!s.found || s.totalBytes > ot) return null;
  let h = parseBeacon(Buffer.from(s.value).toString("utf8"));
  return h === null ? null : { entry: h, version: s.version, mtimeMs: s.mtimeMs };
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
  if (typeof e.pid !== "number" || !Number.isInteger(e.pid) || e.pid <= 0) return !1;
  if (!isProcessRunning(e.pid)) return !0;
  if (e.procStart === void 0) return !1;
  let n = await getProcessStartTimeAsync(e.pid);
  return n !== void 0 && n !== e.procStart;
}
//@ chunk-vrr64ez0.js:6160-6254 placement
async function qn(e, n) {
  try {
    let o = await lstat(join(rwe(), e));
    return We(o.mtimeMs, n);
  } catch {
    return !1;
  }
}
//@ chunk-vrr64ez0.js:6254-6306 placement
function Vn(e) {
  return en.run("reconcile", () => listBeacons(e));
}
/**
 * 列出现存信标（清理过期的）。
 */
//@ chunk-vrr64ez0.js:6306-6989 placement
async function listBeacons(e) {
  if (e) return listBeaconsFromStorage(e);
  if (!(await isBeaconDirPresent())) return [];
  let n;
  try {
    n = await readdir(rwe());
  } catch {
    return [];
  }
  let now = Date.now(),
    r = [];
  for (let u of n) {
    if (!u.endsWith(".json")) {
      try {
        let S = await lstat(join(rwe(), u));
        if (We(S.mtimeMs, now)) await unlink(join(rwe(), u));
      } catch {}
      continue;
    }
    let s = await readBeaconFile(u);
    if (s === null) {
      try {
        let S = await lstat(join(rwe(), u));
        if (We(S.mtimeMs, now)) await unlink(join(rwe(), u));
      } catch {}
      continue;
    }
    let h = now - s.startedAtEpochMs;
    if (
      !(typeof s.pid === "number" && Number.isInteger(s.pid) && s.pid > 0
        ? h >= Zt && ((await isBeaconOwnerGone(s)) || (s.procStart === void 0 && (await qn(u, now))))
        : h >= wt)
    ) {
      r.push(s);
      continue;
    }
    let T = join(rwe(), `${u}.${process.pid}.claimed`);
    try {
      await rename(join(rwe(), u), T);
    } catch {
      continue;
    }
    (await unlink(T).catch(() => {}), reportAttachOutcome(s));
  }
  return r;
}
/**
 * 上报附加结果 tengu_bg_attach_outcome。
 */
//@ chunk-vrr64ez0.js:6989-8047 placement
function reportAttachOutcome(e) {
  let n = e.interactiveReached === !0,
    o = !n && e.marksExpected === !1,
    r =
      n &&
      typeof e.attachMs === "number" &&
      Number.isFinite(e.attachMs) &&
      e.attachMs >= 0 &&
      e.attachMs < 86400000
        ? Math.round(e.attachMs)
        : void 0;
  logEvent("tengu_bg_attach_outcome", {
    outcome: fromEnum(n || o ? "detached" : "error"),
    got_ack: n || typeof e.marksExpected === "boolean",
    got_first_frame: n ? !0 : o ? void 0 : !1,
    synthetic: !0,
    apc_detach: !1,
    timed_out: n || o ? void 0 : !0,
    journal_recovered: !0,
    attach_ms: r,
    first_frame_kind: fromEnumOpt(n ? "real" : void 0),
    marks_expected: n ? !0 : typeof e.marksExpected === "boolean" ? e.marksExpected : void 0,
    attempt:
      typeof e.attempt === "number" && Number.isInteger(e.attempt) && e.attempt >= 0 && e.attempt < 1e6
        ? e.attempt + 1
        : 0,
    gesture_id: ye(e.gestureId),
    surface: fromEnumOpt(e.surface === "fleet" || e.surface === "bg_cli" ? e.surface : void 0),
    daemon_booted: typeof e.daemonBooted === "boolean" ? e.daemonBooted : void 0,
    attach_cold: typeof e.attachCold === "boolean" ? e.attachCold : void 0,
    via: fromEnumOpt(ENt(e.via)),
    msgs_loaded: n ? boundedMarkCountOrUndefined(e.msgsLoaded) : void 0,
    msgs_in_jsonl: n ? boundedMarkCountOrUndefined(e.msgsInJsonl) : void 0,
    msgs_rendered_at_first_paint: n ? boundedMarkCountOrUndefined(e.msgsRenderedAtFirstPaint) : void 0,
  });
}
/**
 * 从存储后端列出信标。
 */
//@ chunk-vrr64ez0.js:8047-9021 placement
async function listBeaconsFromStorage(e) {
  if (!(await isBeaconDirPresent())) return [];
  let n = [],
    o;
  do {
    let listEntries = await e.listEntries(
      { namespace: "daemon", relPath: [ATTACH_JOURNAL] },
      o === void 0 ? void 0 : { cursor: o },
    );
    if (!listEntries.ok) return [];
    for (let item of listEntries.value.items) {
      if (
        item.kind !== "key" ||
        item.key.namespace !== "daemon" ||
        item.key.relPath.length !== 2 ||
        item.key.relPath[0] !== ATTACH_JOURNAL
      )
        continue;
      let A = item.key.relPath[1];
      if (A !== void 0) n.push({ file: A, size: item.size, mtimeMs: item.mtimeMs });
    }
    o = listEntries.value.cursor;
  } while (o !== void 0);
  let now = Date.now(),
    u = [];
  for (let { file: file, size: size, mtimeMs: mtimeMs } of n) {
    let w = mtimeMs !== void 0 && We(mtimeMs, now);
    if (!file.endsWith(".json")) {
      if (w) await e.delete($e(file));
      continue;
    }
    let T = size !== void 0 && size > ot ? null : await readBeacon(e, file);
    if (T === null) {
      if (w) await e.delete($e(file));
      continue;
    }
    let entry = T.entry,
      v = now - entry.startedAtEpochMs;
    if (
      !(typeof entry.pid === "number" && Number.isInteger(entry.pid) && entry.pid > 0
        ? v >= Zt && ((await isBeaconOwnerGone(entry)) || (entry.procStart === void 0 && We(T.mtimeMs, now)))
        : v >= wt)
    ) {
      u.push(entry);
      continue;
    }
    let j = await e.delete($e(file), { precondition: { type: "ifMatch", version: T.version } });
    if (!j.ok || !j.value.existed) continue;
    reportAttachOutcome(entry);
  }
  return u;
}

export { clearAttachBeacon, startAttachBeacon, updateAttachBeacon, recordAttachAttempt };
