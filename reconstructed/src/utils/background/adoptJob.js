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
import { lstat, lstat as lstat_2 } from "fs/promises";
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
} from "path";
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
import { sIe } from "../../services/liveReplica/liveReplica.js";

//@ chunk-18hwfzwa.js:331869-331885 placement
var Cae = 1048576;
//@ chunk-18hwfzwa.js:331885-333584 placement
async function probeAdoptedJob(h, x, D) {
  let L = new Map(),
    ee = new Map(),
    ke,
    Re = async () =>
      (ke ??= {
        getJobDir: (await import("./chunk-bytagq68.js")).getJobDir,
        probeDaemonJob: (await import("./chunk-swfw3r1m.js")).probeDaemonJob,
        readRoster: (await import("./chunk-tkkyc4e2.js")).readRoster,
        staleMs: (await import("./chunk-mmkvfrvb.js")).STALE_THRESHOLD_MS,
        skewMs: (await import("./chunk-mmkvfrvb.js")).CLOCK_SKEW_ALLOWANCE_MS,
      });
  for (let [Be, He] of h) {
    if (He.state !== "armed" || He.holder !== "bg") continue;
    let {
      getJobDir: getJobDir,
      probeDaemonJob: probeDaemonJob,
      readRoster: readRoster,
      staleMs: staleMs,
      skewMs: skewMs,
    } = await Re();
    if (He.holderPidSpace !== ownPidSpace().slice(0, 160)) {
      L.set(Be, "unproven");
      continue;
    }
    let At = (It, Ot) => {
      let Et = ee.get(It);
      if (Et === void 0) ((Et = Ot()), ee.set(It, Et));
      return Et;
    };
    L.set(
      Be,
      await checkMonitorHolder(He, Be, {
        pidViewTrusted: () => At("trusted", isRegistrySweepPermitted),
        pidState: (It) => (isProcessRunning(It) ? "alive" : isProcessProvablyGone(It) ? "gone" : "unknown"),
        isSameProcess: provenSameProcessAsync,
        self: { pid: process.pid, token: ownProcStartMemo.token, actingAsJob: isActingAsBgJob() },
        identityOf: (It) =>
          procIdentityOf({
            ...(It.holderProcStart !== void 0 && { procStart: It.holderProcStart }),
            ...(It.holderProcStartFt !== void 0 && { procStartFt: It.holderProcStartFt }),
          }),
        jobDirExists: (It) =>
          At("dir:" + It, async () => {
            if (x !== void 0) return !0;
            try {
              return (await lstat(getJobDir(It)), !0);
            } catch (error) {
              if (isENOENT(error)) return !1;
              throw error;
            }
          }),
        jobDirTouchedRecently: (It) =>
          At("touched:" + It, async () => {
            try {
              let Ot = await lstat(getJobDir(It)),
                Et = D - Ot.mtimeMs;
              return Et <= staleMs && -Et <= staleMs + skewMs;
            } catch (error) {
              if (isENOENT(error)) return !1;
              throw error;
            }
          }),
        jobPresent: (It) =>
          At("present:" + It, async () => {
            let Ot = await probeDaemonJob(It, x);
            if (Ot.daemonUp && Ot.present) return !0;
            let Et = await At("roster", () => readRoster({ silent: !0 }, x));
            if (Et.parseFailed === !0 || Et.inspectFailed === !0) throw Error("roster unreadable");
            return Et.workers[It] !== void 0;
          }),
        freshConsentFor: (It, Ot) =>
          At("consent:" + It + ":" + Ot, () => readAdoptJson(It, Ot, x, D, getJobDir, staleMs, skewMs)),
      }),
    );
  }
  return L;
}
//@ chunk-18hwfzwa.js:333584-334726 placement
async function readAdoptJson(h, x, D, L, ee, ke, Re = 60000) {
  let Be;
  if (D !== void 0) {
    let read = await D.read([{ key: STORAGE_SPACES.job(h, ["adopt.json"]), offset: 0, length: Cae + 1 }]);
    if (!read.ok) return !0;
    let We = read.value.items[0];
    if (We === void 0 || !We.found) return !1;
    if (We.totalBytes > Cae) return !0;
    Be = Buffer.from(We.value).toString("utf8");
  } else {
    let He = join_6(ee(h), "adopt.json"),
      We;
    try {
      let ze = await openNoFollow_2(He);
      if (!ze.ok) return ze.error.kind !== "absent";
      We = ze.value;
      let stats = await We.stat();
      if (!stats.isFile() || stats.size > Cae) return !0;
      let alloc = Buffer.alloc(stats.size),
        { bytesRead: bytesRead } = await We.read(alloc, 0, stats.size, 0);
      Be = alloc.subarray(0, bytesRead).toString("utf8");
    } catch (error) {
      return !isENOENT(error);
    } finally {
      await We?.close().catch(() => {});
    }
  }
  try {
    let parsed = JSON.parse(Be);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return !0;
    let We = parsed,
      ze = typeof We.writtenAtMs === "number" ? We.writtenAtMs : void 0;
    if (We.frameLive === void 0) return !1;
    if (!Array.isArray(We.frameLive)) return !0;
    if (We.frameLive.length > sIe) return !0;
    return We.frameLive.some((Xe) => {
      if (typeof Xe !== "object" || Xe === null) return !0;
      let rt = Xe;
      if (rt.slug !== x) return !1;
      let kt = typeof rt.writtenAtMs === "number" ? rt.writtenAtMs : ze;
      return kt === void 0 || (L - kt <= ke && kt - L <= ke + Re);
    });
  } catch {
    return !0;
  }
}

export { probeAdoptedJob };
