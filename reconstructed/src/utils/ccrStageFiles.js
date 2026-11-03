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
import {
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
} from "path";
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
import { sleep, Aa } from "./sleep.js";
import { createSignal } from "./signal.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { startSessionActivity, endActivity } from "./sessionActivity.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

//@ chunk-e6aww6q8.js:3755090-3755149 placement
var _Ur = [STAGE_FILE_HOME_MOUNT_PREFIX, `${STAGE_FILE_MOUNT_PREFIX}/hearth`],
  XLn = 1000,
  QLn = 60000,
  JLn = 60000;
//@ chunk-e6aww6q8.js:3755149-3755308 placement
function classifyStageWriteError(e) {
  switch (e.match(/^(?:write|mkdir) failed: (\w+)$/)?.[1]) {
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
    !_Ur.some((n) => e.startsWith(`${n}/`))
  );
}
/**
 * 校验并规范化 CCR 暂存挂载路径：拒绝 NUL、..、CLI 专用前缀等。
 */
//@ chunk-e6aww6q8.js:3755434-3755839 placement
function resolveStageMountPath(e) {
  if (typeof e !== "string" || e.includes("\x00") || e.split(posix_11.sep).includes("..")) return;
  let normalized = posix_11.normalize(e);
  if (
    !isStageMountPath(normalized) ||
    normalized.startsWith(CLI_CONSUMED_STAGE_MOUNT_PREFIX) ||
    posix_11.basename(normalized).startsWith(STAGE_TMP_PREFIX)
  )
    return;
  let startsWith = normalized.startsWith(`${STAGE_FILE_MOUNT_PREFIX}/`),
    replaced = normalized
      .slice((startsWith ? STAGE_FILE_MOUNT_PREFIX : STAGE_FILE_OUTPUTS_MOUNT_PREFIX).length + 1)
      .replace(/\/$/, "");
  if (replaced === "") return;
  try {
    return posix_11.join(startsWith ? getStageFileRoot() : getOutputsRoot(), replaced);
  } catch {
    logForDebugging("CLAUDE_STAGE_FILE_ROOT is not an absolute path", { level: "error" });
    return;
  }
}
//@ chunk-e6aww6q8.js:3755839-3756762 placement
function tellStageFileNotPlaced(e, n) {
  let r = new Map(),
    s = new Map(),
    h,
    y = new Map(),
    S = -1 / 0,
    w = XLn,
    L = () => {
      (h?.abort(), (h = void 0));
      let monotonicNow = e.monotonicNow();
      for (let [Se, ke] of y) {
        if (ke + JLn > monotonicNow) break;
        y.delete(Se);
      }
      if (s.size === 0) return;
      let list = Array.from(s.keys()),
        Z = new Set();
      for (let Se of s.values()) if (Se !== void 0) Z.add(Se);
      s.clear();
      try {
        if (n(list, Z)) {
          w = Math.min(w * 2, QLn);
          for (let Se of list) y.set(Se, monotonicNow);
        }
      } catch (error) {
        (logFeatureBad("ccr_stage_file_not_placed_note", "tell_threw"), logError(error));
      }
    };
  return {
    began(G, q) {
      let Z = resolveStageMountPath(G);
      if (Z === void 0) return () => {};
      let Se = r.get(Z) ?? { stages: 0, placed: !1 };
      if ((Se.stages++, r.set(Z, Se), s.delete(Z), !q)) y.delete(Z);
      return (ke) => {
        if ((Se.stages--, !ke)) ((Se.placed = !0), y.delete(Z));
        else if (ke !== !0) Se.cause = ke;
        if (Se.stages > 0) return;
        r.delete(Z);
        let we = y.get(Z);
        if (Se.placed || (we !== void 0 && we + JLn > e.monotonicNow())) return;
        s.set(Z, Se.cause);
        let monotonicNow = e.monotonicNow();
        if (S + QLn <= monotonicNow) w = XLn;
        if (((S = monotonicNow), h !== void 0)) return;
        ((h = new AbortController()), sleep(w, h.signal, { clock: e, unref: !0 }).then(L));
      };
    },
    tellNow: L,
  };
}
//@ chunk-e6aww6q8.js:3756762-3756785 placement
var Toe = 60000,
  SUr = 8000;
//@ chunk-e6aww6q8.js:3756785-3756834 placement
function K1o(e, n = !1) {
  return !n && isStageMountPath(e) ? SUr : void 0;
}
/**
 * 云会话中等待暂存文件复制完成，超时时告诉模型文件仍在复制。
 */
//@ chunk-e6aww6q8.js:3756834-3759246 placement
function waitForCcrStageFiles(e = Aa) {
  let n = 0,
    r = 0,
    s = 0,
    h = 0,
    y = 0,
    S = 0,
    w = 0,
    L = new Set(),
    G = createSignal(),
    q = new Map(),
    Z = tellStageFileNotPlaced(e, (ke, we) => Se.onFilesNotPlaced?.(ke, we) ?? !1),
    Se = {
      clock: e,
      begin(ke, we, Ee) {
        ((n += ke ? 1 : 0), r++, (s = e.monotonicNow()));
        let Ae = resolveStageMountPath(we),
          Ie = { begunAtMs: s, placeToName: Ae };
        (L.add(Ie), q.get(we)?.endLinger?.abort(), q.set(we, Ie));
        let began = Z.began(we, Ee),
          We = () => q.get(we) === Ie,
          ze = !1,
          lt = (Je) => {
            if (((n -= ke ? 1 : 0), L.delete(Ie), !Je)) {
              for (let nt of L) if (nt.placeToName === Ae) nt.placeToName = void 0;
            }
            if (We()) q.delete(we);
            if (L.size === 0) h = e.monotonicNow();
            (G.emit(), began(Je));
          };
        return (Je, nt = !1) => {
          if (ze) return;
          if (((ze = !0), Je !== void 0 && Je > 0 && We()))
            ((Ie.endLinger = new AbortController()),
              sleep(Je, Ie.endLinger.signal, { clock: e, unref: !0 }).then(() => lt(nt)));
          else lt(nt);
        };
      },
      pending() {
        return L.size;
      },
      pendingHomeFiles() {
        return n;
      },
      pendingYoungerThan(ke) {
        let monotonicNow = e.monotonicNow(),
          Ee = 0;
        for (let { begunAtMs: begunAtMs } of L) Ee += begunAtMs + ke > monotonicNow ? 1 : 0;
        return Ee;
      },
      tellOfStagesStillCopying(ke) {
        let monotonicNow = e.monotonicNow(),
          Ee = new Set();
        for (let Ie of L)
          if (Ie.placeToName !== void 0 && Ie.endLinger === void 0 && Ie.begunAtMs + ke <= monotonicNow)
            Ee.add(Ie.placeToName);
        if (Ee.size === 0) return;
        let Ae = !1;
        try {
          Ae = Se.onFilesStillCopying?.(Array.from(Ee)) !== !0;
        } catch (error) {
          (logFeatureBad("ccr_stage_file_still_copying_note", "tell_threw"), logError(error));
        }
        if (Ae) return;
        for (let Ie of L) if (Ie.placeToName !== void 0 && Ee.has(Ie.placeToName)) Ie.placeToName = void 0;
      },
      async whenSettled({ signal: ke, timeoutMs: we, maxStageAgeMs: Ee = 1 / 0 }) {
        let monotonicNow = e.monotonicNow();
        for (;;) {
          let monotonicNow_2 = e.monotonicNow(),
            Me = -1 / 0,
            We = !1;
          for (let { begunAtMs: begunAtMs } of L) {
            let yt = begunAtMs + Ee;
            if (yt > monotonicNow_2) Me = Math.max(Me, yt);
            else if (yt > monotonicNow) We = !0;
          }
          if (Me === -1 / 0) return (Z.tellNow(), We ? "timed_out" : "settled");
          if (ke.aborted) return "aborted";
          let ze = Math.min(Me, monotonicNow + we) - monotonicNow_2;
          if (ze <= 0) return (Z.tellNow(), "timed_out");
          let { promise: promise, resolve: resolve } = Promise.withResolvers(),
            subscribe = G.subscribe(resolve),
            abortController = new AbortController();
          if (S++ === 0) w = monotonicNow_2;
          try {
            await Promise.race([
              promise,
              sleep(ze, AbortSignal.any([ke, abortController.signal]), { clock: e }),
            ]);
          } finally {
            if (--S === 0) y += e.monotonicNow() - w;
            (subscribe(), abortController.abort());
          }
        }
      },
      waitedMs() {
        return y + (S > 0 ? e.monotonicNow() - w : 0);
      },
      forgetWaits() {
        ((y = 0), (w = e.monotonicNow()));
      },
      tellOfFailedStagesNow: Z.tellNow,
      resetBegun() {
        r = 0;
      },
      aroundDownload(ke) {
        if (r === 0) return () => ({ stage_files_begun: 0 });
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
var kGr = new SessionRootSlot(waitForCcrStageFiles),
  eNn = { settled: 1, timed_out: 2, aborted: 3, not_enabled: 4, limit_spent: 5 };
/**
 * 工具调用前等待暂存文件就绪，受开关与等待额度限制。
 */
//@ chunk-e6aww6q8.js:3759332-3760390 placement
async function waitForStagedToolCallFiles(e, n, r) {
  try {
    let pendingYoungerThan = e.pendingYoungerThan(Toe);
    if (pendingYoungerThan === 0 || n.aborted) return;
    let h = {
        pending_at_start: e.pending(),
        young_at_start: pendingYoungerThan,
        home_files_pending_at_start: e.pendingHomeFiles(),
      },
      y = Toe - e.waitedMs(),
      S;
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_kite", !1) !== !0) S = "not_enabled";
    else if (y <= 0) S = "limit_spent";
    if (S !== void 0) {
      if (S === "limit_spent") logFeatureSad("ccr_stage_file_tool_call_wait", S, h);
      let Z = { outcome: S, outcome_code: eNn[S], ...h };
      (logForDiagnosticsNoPII("info", "tool_call_staged_files_wait", Z), e.onToolCallWait?.(Z));
      return;
    }
    let monotonicNow = e.clock.monotonicNow();
    startSessionActivity("files_arriving", r);
    let L = await e
        .whenSettled({ signal: n, timeoutMs: y, maxStageAgeMs: Toe })
        .finally(() => endActivity("files_arriving", r)),
      G = { waited_ms: Math.round(e.clock.monotonicNow() - monotonicNow), ...h, pending_at_end: e.pending() };
    if (L === "settled") logFeatureOk("ccr_stage_file_tool_call_wait", G);
    else logFeatureSad("ccr_stage_file_tool_call_wait", L, G);
    let q = { outcome: L, outcome_code: eNn[L], ...G };
    (logForDiagnosticsNoPII(L === "timed_out" ? "warn" : "info", "tool_call_staged_files_wait", q),
      e.onToolCallWait?.(q));
  } catch (error) {
    (logFeatureBad("ccr_stage_file_tool_call_wait", "threw"), logError(error));
  } finally {
    if (!n.aborted) e.tellOfStagesStillCopying(Toe);
  }
}
/**
 * 创建等待暂存文件就绪的函数：有待处理文件时限时等待并记录结果。
 */
//@ chunk-e6aww6q8.js:3760390-3760835 placement
function createStagedFilesWaiter(e, n = Toe) {
  return async (r) => {
    let pending = e.pending();
    if (pending === 0) return;
    let pendingHomeFiles = e.pendingHomeFiles(),
      monotonicNow = e.clock.monotonicNow(),
      whenSettled = await e.whenSettled({ signal: r, timeoutMs: n }),
      w = {
        waited_ms: Math.round(e.clock.monotonicNow() - monotonicNow),
        pending_at_start: pending,
        home_files_pending_at_start: pendingHomeFiles,
        pending_at_end: e.pending(),
      };
    (logEvent("tengu_turn_handoff_staged_files_wait", { outcome: fromEnum(whenSettled), ...w }),
      logForDiagnosticsNoPII(
        whenSettled === "timed_out" ? "warn" : "info",
        "turn_handoff_staged_files_wait",
        { outcome: whenSettled, ...w },
      ));
  };
}

export { kGr, createStagedFilesWaiter, K1o, classifyStageWriteError, waitForStagedToolCallFiles };
