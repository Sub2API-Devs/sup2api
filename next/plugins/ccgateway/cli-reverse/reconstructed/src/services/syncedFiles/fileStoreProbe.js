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
import { rowStagedSignal } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  openSettingsToCloudGateIfAvailable,
  reportFileStoreVerdict,
  isSettingsToCloudForcedOff,
} from "../../cli/remoteIO/workerAuth.js";
import { getSyncedFile } from "./syncedFileSyncer.js";
import { getPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";

//@ chunk-240k3fwa.js:3803-3933 placement
var MANIFEST_GET_ATTEMPTS = 5;
var MANIFEST_RETRY_DELAY_MS = 500;
var MAX_REFUSED_MANIFEST_GETS = 3;
var REFUSED_MANIFEST_DELAY_MS = 5000;
var PROBE_TIMING = {
  manifestGetAttempts: MANIFEST_GET_ATTEMPTS,
  manifestGetRetryDelayMs: MANIFEST_RETRY_DELAY_MS,
  maxRefusedManifestGets: MAX_REFUSED_MANIFEST_GETS,
  refusedManifestGetDelayMs: REFUSED_MANIFEST_DELAY_MS,
};
//@ chunk-240k3fwa.js:3933-4363 placement
/**
 * 读取同步文件存储 manifest，可重试错误按指数退避重试，返回已答复、被拒或不可达。
 */
async function getManifestWithRetry(getRow, timing) {
  for (let i = 1; ; i++) {
    let row = await getRow(joined);
    switch (row.kind) {
      case "ok":
      case "not_found":
        return {
          kind: "answered",
        };
      case "error":
        if (row.status === NOT_IMPLEMENTED_STATUS || !row.retryable)
          return {
            kind: "refused",
            status: row.status ?? 0,
            errorKind: row.errorKind,
          };
        if (i >= timing.manifestGetAttempts) {
          logForDiagnosticsNoPII("warn", "file_store_probe_unreachable", {
            kind: row.errorKind,
            status: row.status ?? 0,
          });
          return {
            kind: "unreachable",
          };
        }
        await sleep(timing.manifestGetRetryDelayMs * 2 ** (i - 1), undefined, {
          unref: true,
        });
    }
  }
}
//@ chunk-240k3fwa.js:4363-4697 placement
/**
 * 探测云会话同步文件存储是否可用：未开启则公布 off；否则取一次 manifest，能取到为 served、被拒为 refused；不可达时等待有行暂存后再试，并公布结论。
 */
async function probeFileStore(probe, timing = PROBE_TIMING) {
  let announce = (verdict) => {
    try {
      probe.announceVerdict(verdict);
    } catch {
      logForDiagnosticsNoPII("error", "file_store_verdict_publish_threw", {});
    }
    return verdict;
  };
  let enabled;
  try {
    enabled = await probe.enabled();
  } catch {
    enabled = false;
  }
  if (!enabled) return announce("off");
  let wakeQueue = createWakeQueue(probe.onRowStaged ?? rowStagedSignal.subscribe);
  let firstVerdict = await probeOnce(probe, timing, announce, false);
  (async () => {
    let verdict = firstVerdict;
    while (verdict === null) {
      await wakeQueue.next();
      verdict = await probeOnce(probe, timing, announce, true);
    }
    wakeQueue.close();
  })();
  return firstVerdict;
}
//@ chunk-240k3fwa.js:4697-4848 placement
function createWakeQueue(onChange) {
  let pendingWake = false;
  let resolveNext = null;
  let close = onChange(() => {
    if (resolveNext !== null) {
      let resolve = resolveNext;
      resolveNext = null;
      resolve();
    } else pendingWake = true;
  });
  return {
    next: () =>
      new Promise((resolve) => {
        if (pendingWake) {
          pendingWake = false;
          resolve();
        } else resolveNext = resolve;
      }),
    close,
  };
}
//@ chunk-240k3fwa.js:4848-5452 placement
/**
 * 探测一次同步文件存储：答复则为 served；被拒时按情况重试或公布 refused；不可达返回 null。
 */
async function probeOnce(probe, timing, announce, afterStage) {
  for (let i = 1; ; i++) {
    let result;
    try {
      result = await getManifestWithRetry(probe.getRow, timing);
    } catch {
      result = {
        kind: "unreachable",
      };
    }
    switch (result.kind) {
      case "answered":
        return announce("served");
      case "unreachable":
        return null;
      case "refused":
        if (afterStage && result.errorKind === "auth") {
          logForDiagnosticsNoPII("warn", "file_store_probe_refused_after_stage", {
            status: result.status,
          });
          return null;
        }
        if (probe.hasPreviousCloudInstance && i < timing.maxRefusedManifestGets) {
          await sleep(timing.refusedManifestGetDelayMs, undefined, {
            unref: true,
          });
          continue;
        }
        logForDiagnosticsNoPII("warn", "file_store_probe_refused", {
          kind: result.errorKind,
          status: result.status,
        });
        logFeatureSad("ccr_dir_sync_seed", "manifest_refused", {
          status: result.status,
          refusal: fromEnum(result.errorKind),
        });
        return announce("refused");
    }
  }
}
//@ chunk-240k3fwa.js:5452-5518 placement
/**
 * 空的回合前后钩子与 drain 实现。
 */
var NOOP_TURN_HOOKS = {
  beforeTurn: async () => {},
  afterTurn: () => {},
  drain: async () => {},
};
//@ chunk-240k3fwa.js:5518-5613 placement
function _() {
  return {
    enabled: openSettingsToCloudGateIfAvailable,
    getRow: getSyncedFile,
    announceVerdict: reportFileStoreVerdict,
    hasPreviousCloudInstance: workerEpoch() > 1,
  };
}
//@ chunk-240k3fwa.js:5613-5680 placement
function startFileStoreProbe(
  storage,
  probe = _(),
  options = {
    git: isSettingsToCloudForcedOff(),
  },
  slot = options.git ? storageSlotOrNull(storage) : null,
) {
  probeFileStore(probe);
  return NOOP_TURN_HOOKS;
}
//@ chunk-240k3fwa.js:5680-5706 placement
function storageSlotOrNull(storage) {
  return null;
}
//@ chunk-240k3fwa.js:5706-5865 placement
function workerEpoch() {
  let CLAUDE_CODE_WORKER_EPOCH = getPreSettingsEnvSnapshot().CLAUDE_CODE_WORKER_EPOCH;
  if (CLAUDE_CODE_WORKER_EPOCH === undefined) return 1;
  let epoch = Number.parseInt(CLAUDE_CODE_WORKER_EPOCH, 10);
  return Number.isInteger(epoch) && epoch >= 1 ? epoch : Number.MAX_SAFE_INTEGER;
}
export { startFileStoreProbe };
