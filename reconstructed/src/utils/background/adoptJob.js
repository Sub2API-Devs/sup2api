/**
 * utils/background/adoptJob.ts
 *
 * 2.1.316 新增。接管后台任务。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { lstat } from "fs/promises";
import { join } from "path";
import { ownPidSpace } from "../pidSpace.js";
import { checkMonitorHolder } from "../../services/artifacts/comments/replyYield.js";
import { isRegistrySweepPermitted, isActingAsBgJob } from "../concurrentSessions.js";
import { isProcessRunning } from "../genericProcessUtils.js";
import {
  isProcessProvablyGone,
  provenSameProcessAsync,
  ownProcStartMemo,
  procIdentityOf,
} from "../processIdentity.js";
import { isENOENT } from "../errors.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { openNoFollow_2 } from "../fsSafety/hardenedRead.js";
import { REFUSED_CAPACITY_WINDOW } from "../../services/liveReplica/liveReplica.js";

//@ chunk-18hwfzwa.js:331869-331885 placement
/**
 * probeAdoptedJob 读取 adopt.json 时的大小上限（1 MiB）。
 */
var MAX_ADOPT_JSON_BYTES = 1048576;
//@ chunk-18hwfzwa.js:331885-333584 placement
async function probeAdoptedJob(h, x, D) {
  let L = new Map();
  let ee = new Map();
  let ke;
  let Re = async () =>
    (ke ??= {
      getJobDir: (await import("./chunk-bytagq68.js")).getJobDir,
      probeDaemonJob: (await import("./chunk-swfw3r1m.js")).probeDaemonJob,
      readRoster: (await import("./chunk-tkkyc4e2.js")).readRoster,
      staleMs: (await import("./chunk-mmkvfrvb.js")).STALE_THRESHOLD_MS,
      skewMs: (await import("./chunk-mmkvfrvb.js")).CLOCK_SKEW_ALLOWANCE_MS,
    });
  for (let [Be, intent] of h) {
    if (intent.state !== "armed" || intent.holder !== "bg") continue;
    let { getJobDir, probeDaemonJob, readRoster, staleMs, skewMs } = await Re();
    if (intent.holderPidSpace !== ownPidSpace().slice(0, 160)) {
      L.set(Be, "unproven");
      continue;
    }
    let At = (It, isRegistrySweepPermitted) => {
      let Et = ee.get(It);
      if (Et === undefined) {
        Et = isRegistrySweepPermitted();
        ee.set(It, Et);
      }
      return Et;
    };
    L.set(
      Be,
      await checkMonitorHolder(intent, Be, {
        pidViewTrusted: () => At("trusted", isRegistrySweepPermitted),
        pidState: (It) => (isProcessRunning(It) ? "alive" : isProcessProvablyGone(It) ? "gone" : "unknown"),
        isSameProcess: provenSameProcessAsync,
        self: {
          pid: process.pid,
          token: ownProcStartMemo.token,
          actingAsJob: isActingAsBgJob(),
        },
        identityOf: (It) =>
          procIdentityOf({
            ...(It.holderProcStart !== undefined && {
              procStart: It.holderProcStart,
            }),
            ...(It.holderProcStartFt !== undefined && {
              procStartFt: It.holderProcStartFt,
            }),
          }),
        jobDirExists: (It) =>
          At("dir:" + It, async () => {
            if (x !== undefined) return true;
            try {
              await lstat(getJobDir(It));
              return true;
            } catch (error) {
              if (isENOENT(error)) return false;
              throw error;
            }
          }),
        jobDirTouchedRecently: (It) =>
          At("touched:" + It, async () => {
            try {
              let Ot = await lstat(getJobDir(It));
              let Et = D - Ot.mtimeMs;
              return Et <= staleMs && -Et <= staleMs + skewMs;
            } catch (error) {
              if (isENOENT(error)) return false;
              throw error;
            }
          }),
        jobPresent: (It) =>
          At("present:" + It, async () => {
            let Ot = await probeDaemonJob(It, x);
            if (Ot.daemonUp && Ot.present) return true;
            let Et = await At("roster", () =>
              readRoster(
                {
                  silent: true,
                },
                x,
              ),
            );
            if (Et.parseFailed === true || Et.inspectFailed === true) throw Error("roster unreadable");
            return Et.workers[It] !== undefined;
          }),
        freshConsentFor: (It, Ot) =>
          At("consent:" + It + ":" + Ot, () => readAdoptJson(It, Ot, x, D, getJobDir, staleMs, skewMs)),
      }),
    );
  }
  return L;
}
//@ chunk-18hwfzwa.js:333584-334726 placement
async function readAdoptJson(h, x, D, L, getJobDir, staleMs, skewMs = 60000) {
  let Be;
  if (D !== undefined) {
    let He = await D.read([
      {
        key: STORAGE_SPACES.job(h, ["adopt.json"]),
        offset: 0,
        length: MAX_ADOPT_JSON_BYTES + 1,
      },
    ]);
    if (!He.ok) return true;
    let We = He.value.items[0];
    if (We === undefined || !We.found) return false;
    if (We.totalBytes > MAX_ADOPT_JSON_BYTES) return true;
    Be = Buffer.from(We.value).toString("utf8");
  } else {
    let He = join(getJobDir(h), "adopt.json");
    let We;
    try {
      let noFollow = await openNoFollow_2(He);
      if (!noFollow.ok) return noFollow.error.kind !== "absent";
      We = noFollow.value;
      let stats = await We.stat();
      if (!stats.isFile() || stats.size > MAX_ADOPT_JSON_BYTES) return true;
      let rt = Buffer.alloc(stats.size);
      let { bytesRead } = await We.read(rt, 0, stats.size, 0);
      Be = rt.subarray(0, bytesRead).toString("utf8");
    } catch (error) {
      return !isENOENT(error);
    } finally {
      await We?.close().catch(() => {});
    }
  }
  try {
    let parsed = JSON.parse(Be);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return true;
    let We = parsed;
    let writtenAtMs = typeof We.writtenAtMs === "number" ? We.writtenAtMs : undefined;
    if (We.frameLive === undefined) return false;
    if (!Array.isArray(We.frameLive)) return true;
    if (We.frameLive.length > REFUSED_CAPACITY_WINDOW) return true;
    return We.frameLive.some((Xe) => {
      if (typeof Xe !== "object" || Xe === null) return true;
      let rt = Xe;
      if (rt.slug !== x) return false;
      let kt = typeof rt.writtenAtMs === "number" ? rt.writtenAtMs : writtenAtMs;
      return kt === undefined || (L - kt <= staleMs && kt - L <= staleMs + skewMs);
    });
  } catch {
    return true;
  }
}
export { probeAdoptedJob };
