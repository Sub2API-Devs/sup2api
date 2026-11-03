/**
 * utils/ccrStageFiles.ts
 *
 * 2.1.316 新增：云会话中暂存文件仍在复制时的等待与提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import { posix } from "path";
import {
  STAGE_FILE_HOME_MOUNT_PREFIX,
  STAGE_FILE_MOUNT_PREFIX,
  STAGE_FILE_OUTPUTS_MOUNT_PREFIX,
  CLI_CONSUMED_STAGE_MOUNT_PREFIX,
  STAGE_TMP_PREFIX,
  getStageFileRoot,
  getOutputsRoot,
} from "./stageFileRoots.js";
import { logForDebugging } from "./debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logError } from "./log.js";
import { sleep, systemClock } from "./sleep.js";
import { createSignal } from "./signal.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { startSessionActivity, endActivity } from "./sessionActivity.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

//@ chunk-e6aww6q8.js:3755090-3755149 placement
/**
 * 被认为是暂存文件挂载点的路径前缀。
 */
var STAGE_FILE_PREFIXES = [STAGE_FILE_HOME_MOUNT_PREFIX, `${STAGE_FILE_MOUNT_PREFIX}/hearth`];
var STAGE_POLL_MIN_MS = 1000;
var STAGE_POLL_MAX_MS = 60000;
var STAGE_FILE_MAX_AGE_MS = 60000;
//@ chunk-e6aww6q8.js:3755149-3755308 placement
function classifyStageWriteError(error) {
  switch (error.match(/^(?:write|mkdir) failed: (\w+)$/)?.[1]) {
    case "ENOSPC":
      return "no_space";
    case "ENAMETOOLONG":
      return "name_too_long";
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:3755308-3755434 placement
function isStageMountPath(e) {
  return (
    typeof e === "string" &&
    [STAGE_FILE_OUTPUTS_MOUNT_PREFIX, STAGE_FILE_MOUNT_PREFIX].some((n) => e.startsWith(`${n}/`)) &&
    !STAGE_FILE_PREFIXES.some((n) => e.startsWith(`${n}/`))
  );
}
//@ chunk-e6aww6q8.js:3755434-3755839 placement
/**
 * 校验并规范化 CCR 暂存挂载路径：拒绝 NUL、..、CLI 专用前缀等。
 */
function resolveStageMountPath(e) {
  if (typeof e !== "string" || e.includes("\x00") || e.split(posix.sep).includes("..")) return;
  let normalized = posix.normalize(e);
  if (
    !isStageMountPath(normalized) ||
    normalized.startsWith(CLI_CONSUMED_STAGE_MOUNT_PREFIX) ||
    posix.basename(normalized).startsWith(STAGE_TMP_PREFIX)
  )
    return;
  let r = normalized.startsWith(`${STAGE_FILE_MOUNT_PREFIX}/`);
  let replaced = normalized
    .slice((r ? STAGE_FILE_MOUNT_PREFIX : STAGE_FILE_OUTPUTS_MOUNT_PREFIX).length + 1)
    .replace(/\/$/, "");
  if (replaced === "") return;
  try {
    return posix.join(r ? getStageFileRoot() : getOutputsRoot(), replaced);
  } catch {
    logForDebugging("CLAUDE_STAGE_FILE_ROOT is not an absolute path", {
      level: "error",
    });
    return;
  }
}
//@ chunk-e6aww6q8.js:3755839-3756762 placement
function tellStageFileNotPlaced(e, n) {
  let r = new Map();
  let s = new Map();
  let h;
  let y = new Map();
  let S = -1 / 0;
  let w = STAGE_POLL_MIN_MS;
  let L = () => {
    h?.abort();
    h = undefined;
    let G = e.monotonicNow();
    for (let [Se, ke] of y) {
      if (ke + STAGE_FILE_MAX_AGE_MS > G) break;
      y.delete(Se);
    }
    if (s.size === 0) return;
    let list = Array.from(s.keys());
    let Z = new Set();
    for (let Se of s.values()) if (Se !== undefined) Z.add(Se);
    s.clear();
    try {
      if (n(list, Z)) {
        w = Math.min(w * 2, STAGE_POLL_MAX_MS);
        for (let Se of list) y.set(Se, G);
      }
    } catch (error) {
      logFeatureBad("ccr_stage_file_not_placed_note", "tell_threw");
      logError(error);
    }
  };
  return {
    began(G, q) {
      let stageMountPath = resolveStageMountPath(G);
      if (stageMountPath === undefined) return () => {};
      let Se = r.get(stageMountPath) ?? {
        stages: 0,
        placed: false,
      };
      Se.stages++;
      r.set(stageMountPath, Se);
      s.delete(stageMountPath);
      if (!q) y.delete(stageMountPath);
      return (ke) => {
        Se.stages--;
        if (!ke) {
          Se.placed = true;
          y.delete(stageMountPath);
        } else if (ke !== true) Se.cause = ke;
        if (Se.stages > 0) return;
        r.delete(stageMountPath);
        let we = y.get(stageMountPath);
        if (Se.placed || (we !== undefined && we + STAGE_FILE_MAX_AGE_MS > e.monotonicNow())) return;
        s.set(stageMountPath, Se.cause);
        let Ee = e.monotonicNow();
        if (S + STAGE_POLL_MAX_MS <= Ee) w = STAGE_POLL_MIN_MS;
        S = Ee;
        if (h !== undefined) return;
        h = new AbortController();
        sleep(w, h.signal, {
          clock: e,
          unref: true,
        }).then(L);
      };
    },
    tellNow: L,
  };
}
//@ chunk-e6aww6q8.js:3756762-3756785 placement
/**
 * 等待暂存文件就绪的总超时（1 分钟）。
 */
var STAGE_WAIT_MAX_MS = 60000;
var DEFAULT_STAGE_WAIT_TIMEOUT_MS = 8000;
//@ chunk-e6aww6q8.js:3756785-3756834 placement
/**
 * 按是否为暂存挂载路径返回等待超时，否则 undefined。
 */
function stageWaitTimeoutFor(mountPath, permanent = false) {
  return !permanent && isStageMountPath(mountPath) ? DEFAULT_STAGE_WAIT_TIMEOUT_MS : undefined;
}
//@ chunk-e6aww6q8.js:3756834-3759246 placement
/**
 * 云会话中等待暂存文件复制完成，超时时告诉模型文件仍在复制。
 */
function waitForCcrStageFiles(e = systemClock) {
  let n = 0;
  let r = 0;
  let s = 0;
  let h = 0;
  let y = 0;
  let S = 0;
  let w = 0;
  let L = new Set();
  let signal = createSignal();
  let q = new Map();
  let Z = tellStageFileNotPlaced(e, (ke, we) => Se.onFilesNotPlaced?.(ke, we) ?? false);
  let Se = {
    clock: e,
    begin(ke, we, Ee) {
      n += ke ? 1 : 0;
      r++;
      s = e.monotonicNow();
      let stageMountPath = resolveStageMountPath(we);
      let Ie = {
        begunAtMs: s,
        placeToName: stageMountPath,
      };
      L.add(Ie);
      q.get(we)?.endLinger?.abort();
      q.set(we, Ie);
      let Me = Z.began(we, Ee);
      let We = () => q.get(we) === Ie;
      let ze = false;
      let lt = (Je) => {
        n -= ke ? 1 : 0;
        L.delete(Ie);
        if (!Je) {
          for (let nt of L) if (nt.placeToName === stageMountPath) nt.placeToName = undefined;
        }
        if (We()) q.delete(we);
        if (L.size === 0) h = e.monotonicNow();
        signal.emit();
        Me(Je);
      };
      return (Je, nt = false) => {
        if (ze) return;
        ze = true;
        if (Je !== undefined && Je > 0 && We()) {
          Ie.endLinger = new AbortController();
          sleep(Je, Ie.endLinger.signal, {
            clock: e,
            unref: true,
          }).then(() => lt(nt));
        } else lt(nt);
      };
    },
    pending() {
      return L.size;
    },
    pendingHomeFiles() {
      return n;
    },
    pendingYoungerThan(ke) {
      let we = e.monotonicNow();
      let Ee = 0;
      for (let { begunAtMs } of L) Ee += begunAtMs + ke > we ? 1 : 0;
      return Ee;
    },
    tellOfStagesStillCopying(ke) {
      let we = e.monotonicNow();
      let Ee = new Set();
      for (let Ie of L)
        if (Ie.placeToName !== undefined && Ie.endLinger === undefined && Ie.begunAtMs + ke <= we)
          Ee.add(Ie.placeToName);
      if (Ee.size === 0) return;
      let Ae = false;
      try {
        Ae = Se.onFilesStillCopying?.(Array.from(Ee)) !== true;
      } catch (error) {
        logFeatureBad("ccr_stage_file_still_copying_note", "tell_threw");
        logError(error);
      }
      if (Ae) return;
      for (let Ie of L)
        if (Ie.placeToName !== undefined && Ee.has(Ie.placeToName)) Ie.placeToName = undefined;
    },
    async whenSettled({ signal: signal_2, timeoutMs, maxStageAgeMs = 1 / 0 }) {
      let Ae = e.monotonicNow();
      for (;;) {
        let Ie = e.monotonicNow();
        let Me = -1 / 0;
        let We = false;
        for (let { begunAtMs } of L) {
          let yt = begunAtMs + maxStageAgeMs;
          if (yt > Ie) Me = Math.max(Me, yt);
          else if (yt > Ae) We = true;
        }
        if (Me === -1 / 0) {
          Z.tellNow();
          return We ? "timed_out" : "settled";
        }
        if (signal_2.aborted) return "aborted";
        let ze = Math.min(Me, Ae + timeoutMs) - Ie;
        if (ze <= 0) {
          Z.tellNow();
          return "timed_out";
        }
        let { promise, resolve } = Promise.withResolvers();
        let nt = signal.subscribe(resolve);
        let abortController = new AbortController();
        if (S++ === 0) w = Ie;
        try {
          await Promise.race([
            promise,
            sleep(ze, AbortSignal.any([signal_2, abortController.signal]), {
              clock: e,
            }),
          ]);
        } finally {
          if (--S === 0) y += e.monotonicNow() - w;
          nt();
          abortController.abort();
        }
      }
    },
    waitedMs() {
      return y + (S > 0 ? e.monotonicNow() - w : 0);
    },
    forgetWaits() {
      y = 0;
      w = e.monotonicNow();
    },
    tellOfFailedStagesNow: Z.tellNow,
    resetBegun() {
      r = 0;
    },
    aroundDownload(ke) {
      if (r === 0)
        return () => ({
          stage_files_begun: 0,
        });
      let we = {
        stage_files_begun: r,
        stage_files_last_begun_to_attachments_start_ms: Math.round(ke - s),
        stage_files_pending_at_attachments_start: L.size,
      };
      return () => ({
        ...we,
        stage_files_pending_at_attachments_end: L.size,
        ...(L.size === 0 && {
          stage_files_settled_after_attachments_start_ms: Math.max(0, Math.round(h - ke)),
        }),
      });
    },
  };
  return Se;
}
//@ chunk-e6aww6q8.js:3759246-3759332 placement
/**
 * 按会话根保存的暂存文件等待器。
 */
var stagedFilesWaiterByRoot = new SessionRootSlot(waitForCcrStageFiles);
var STAGE_WAIT_OUTCOME_CODES = {
  settled: 1,
  timed_out: 2,
  aborted: 3,
  not_enabled: 4,
  limit_spent: 5,
};
//@ chunk-e6aww6q8.js:3759332-3760390 placement
/**
 * 工具调用前等待暂存文件就绪，受开关与等待额度限制。
 */
async function waitForStagedToolCallFiles(e, signal, r) {
  try {
    let s = e.pendingYoungerThan(STAGE_WAIT_MAX_MS);
    if (s === 0 || signal.aborted) return;
    let h = {
      pending_at_start: e.pending(),
      young_at_start: s,
      home_files_pending_at_start: e.pendingHomeFiles(),
    };
    let y = STAGE_WAIT_MAX_MS - e.waitedMs();
    let S;
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_kite", false) !== true) S = "not_enabled";
    else if (y <= 0) S = "limit_spent";
    if (S !== undefined) {
      if (S === "limit_spent") logFeatureSad("ccr_stage_file_tool_call_wait", S, h);
      let Z = {
        outcome: S,
        outcome_code: STAGE_WAIT_OUTCOME_CODES[S],
        ...h,
      };
      logForDiagnosticsNoPII("info", "tool_call_staged_files_wait", Z);
      e.onToolCallWait?.(Z);
      return;
    }
    let w = e.clock.monotonicNow();
    startSessionActivity("files_arriving", r);
    let L = await e
      .whenSettled({
        signal,
        timeoutMs: y,
        maxStageAgeMs: STAGE_WAIT_MAX_MS,
      })
      .finally(() => endActivity("files_arriving", r));
    let G = {
      waited_ms: Math.round(e.clock.monotonicNow() - w),
      ...h,
      pending_at_end: e.pending(),
    };
    if (L === "settled") logFeatureOk("ccr_stage_file_tool_call_wait", G);
    else logFeatureSad("ccr_stage_file_tool_call_wait", L, G);
    let q = {
      outcome: L,
      outcome_code: STAGE_WAIT_OUTCOME_CODES[L],
      ...G,
    };
    logForDiagnosticsNoPII(L === "timed_out" ? "warn" : "info", "tool_call_staged_files_wait", q);
    e.onToolCallWait?.(q);
  } catch (error) {
    logFeatureBad("ccr_stage_file_tool_call_wait", "threw");
    logError(error);
  } finally {
    if (!signal.aborted) e.tellOfStagesStillCopying(STAGE_WAIT_MAX_MS);
  }
}
//@ chunk-e6aww6q8.js:3760390-3760835 placement
/**
 * 创建等待暂存文件就绪的函数：有待处理文件时限时等待并记录结果。
 */
function createStagedFilesWaiter(e, timeoutMs = STAGE_WAIT_MAX_MS) {
  return async (signal) => {
    let s = e.pending();
    if (s === 0) return;
    let homeFilesPendingAtStart = e.pendingHomeFiles();
    let y = e.clock.monotonicNow();
    let S = await e.whenSettled({
      signal,
      timeoutMs,
    });
    let w = {
      waited_ms: Math.round(e.clock.monotonicNow() - y),
      pending_at_start: s,
      home_files_pending_at_start: homeFilesPendingAtStart,
      pending_at_end: e.pending(),
    };
    logEvent("tengu_turn_handoff_staged_files_wait", {
      outcome: fromEnum(S),
      ...w,
    });
    logForDiagnosticsNoPII(S === "timed_out" ? "warn" : "info", "turn_handoff_staged_files_wait", {
      outcome: S,
      ...w,
    });
  };
}
export {
  stagedFilesWaiterByRoot,
  createStagedFilesWaiter,
  stageWaitTimeoutFor,
  classifyStageWriteError,
  waitForStagedToolCallFiles,
};
