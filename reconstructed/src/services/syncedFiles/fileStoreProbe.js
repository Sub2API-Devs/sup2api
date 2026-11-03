/**
 * services/syncedFiles/fileStoreProbe.ts
 *
 * 2.1.316 新增：云会话同步文件存储的探测（manifest 获取重试、拒绝、不可达），公布结论
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-240k3fwa.js (10)
 * attribution: placement 10
 */
import { joined, NOT_IMPLEMENTED_STATUS } from "../../utils/teleport/seedPaths.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { sleep } from "../../utils/sleep.js";
import { qyt } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { XDs, reportFileStoreVerdict, GPr } from "../../cli/remoteIO/workerAuth.js";
import { getSyncedFile } from "./syncedFileSyncer.js";
import { getPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";

//@ chunk-240k3fwa.js:3803-3933 placement
var MANIFEST_GET_ATTEMPTS = 5,
  MANIFEST_RETRY_DELAY_MS = 500,
  MAX_REFUSED_MANIFEST_GETS = 3,
  REFUSED_MANIFEST_DELAY_MS = 5000,
  PROBE_TIMING = {
    manifestGetAttempts: MANIFEST_GET_ATTEMPTS,
    manifestGetRetryDelayMs: MANIFEST_RETRY_DELAY_MS,
    maxRefusedManifestGets: MAX_REFUSED_MANIFEST_GETS,
    refusedManifestGetDelayMs: REFUSED_MANIFEST_DELAY_MS,
  };
/**
 * 读取同步文件存储 manifest，可重试错误按指数退避重试，返回已答复、被拒或不可达。
 */
//@ chunk-240k3fwa.js:3933-4363 placement
async function getManifestWithRetry(getRow, timing) {
  for (let t = 1; ; t++) {
    let o = await getRow(joined);
    switch (o.kind) {
      case "ok":
      case "not_found":
        return { kind: "answered" };
      case "error":
        if (o.status === NOT_IMPLEMENTED_STATUS || !o.retryable)
          return { kind: "refused", status: o.status ?? 0, errorKind: o.errorKind };
        if (t >= timing.manifestGetAttempts)
          return (
            logForDiagnosticsNoPII("warn", "file_store_probe_unreachable", {
              kind: o.errorKind,
              status: o.status ?? 0,
            }),
            { kind: "unreachable" }
          );
        await sleep(timing.manifestGetRetryDelayMs * 2 ** (t - 1), void 0, { unref: !0 });
    }
  }
}
/**
 * 探测云会话同步文件存储是否可用：未开启则公布 off；否则取一次 manifest，能取到为 served、被拒为 refused；不可达时等待有行暂存后再试，并公布结论。
 */
//@ chunk-240k3fwa.js:4363-4697 placement
async function probeFileStore(probe, timing = PROBE_TIMING) {
  let t = (i) => {
      try {
        probe.announceVerdict(i);
      } catch {
        logForDiagnosticsNoPII("error", "file_store_verdict_publish_threw", {});
      }
      return i;
    },
    o;
  try {
    o = await probe.enabled();
  } catch {
    o = !1;
  }
  if (!o) return t("off");
  let s = createWakeQueue(probe.onRowStaged ?? qyt.subscribe),
    n = await probeOnce(probe, timing, t, !1);
  return (
    (async () => {
      let i = n;
      while (i === null) (await s.next(), (i = await probeOnce(probe, timing, t, !0)));
      s.close();
    })(),
    n
  );
}
//@ chunk-240k3fwa.js:4697-4848 placement
function createWakeQueue(r) {
  let e = !1,
    t = null,
    o = r(() => {
      if (t !== null) {
        let s = t;
        ((t = null), s());
      } else e = !0;
    });
  return {
    next: () =>
      new Promise((s) => {
        if (e) ((e = !1), s());
        else t = s;
      }),
    close: o,
  };
}
/**
 * 探测一次同步文件存储：答复则为 served；被拒时按情况重试或公布 refused；不可达返回 null。
 */
//@ chunk-240k3fwa.js:4848-5452 placement
async function probeOnce(probe, timing, announce, afterStage) {
  for (let s = 1; ; s++) {
    let n;
    try {
      n = await getManifestWithRetry(probe.getRow, timing);
    } catch {
      n = { kind: "unreachable" };
    }
    switch (n.kind) {
      case "answered":
        return announce("served");
      case "unreachable":
        return null;
      case "refused":
        if (afterStage && n.errorKind === "auth")
          return (
            logForDiagnosticsNoPII("warn", "file_store_probe_refused_after_stage", { status: n.status }),
            null
          );
        if (probe.hasPreviousCloudInstance && s < timing.maxRefusedManifestGets) {
          await sleep(timing.refusedManifestGetDelayMs, void 0, { unref: !0 });
          continue;
        }
        return (
          logForDiagnosticsNoPII("warn", "file_store_probe_refused", { kind: n.errorKind, status: n.status }),
          logFeatureSad("ccr_dir_sync_seed", "manifest_refused", {
            status: n.status,
            refusal: fromEnum(n.errorKind),
          }),
          announce("refused")
        );
    }
  }
}
//@ chunk-240k3fwa.js:5452-5518 placement
var F = { beforeTurn: async () => {}, afterTurn: () => {}, drain: async () => {} };
//@ chunk-240k3fwa.js:5518-5613 placement
function _() {
  return {
    enabled: XDs,
    getRow: getSyncedFile,
    announceVerdict: reportFileStoreVerdict,
    hasPreviousCloudInstance: workerEpoch() > 1,
  };
}
//@ chunk-240k3fwa.js:5613-5680 placement
function startFileStoreProbe(r, e = _(), t = { git: GPr() }, o = t.git ? k(r) : null) {
  return (probeFileStore(e), F);
}
//@ chunk-240k3fwa.js:5680-5706 placement
function k(r) {
  return null;
}
//@ chunk-240k3fwa.js:5706-5865 placement
function workerEpoch() {
  let CLAUDE_CODE_WORKER_EPOCH = getPreSettingsEnvSnapshot().CLAUDE_CODE_WORKER_EPOCH;
  if (CLAUDE_CODE_WORKER_EPOCH === void 0) return 1;
  let int = Number.parseInt(CLAUDE_CODE_WORKER_EPOCH, 10);
  return Number.isInteger(int) && int >= 1 ? int : Number.MAX_SAFE_INTEGER;
}
