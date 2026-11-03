/**
 * services/remoteTools/callProgress.ts
 *
 * 2.1.316 新增：远程工具调用进度监视：对端沉默时探测、轮询并判定是否放弃。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (25)
 * attribution: placement 25
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { SESSION_LIVENESS_TIMEOUT_MS, RECONNECT_BACKOFF_BASE_MS } from "./awayTimings.js";
import {
  LIVENESS_PROBE_TIMEOUT_MS,
  SERVING_LIMIT_BOUNDS,
  DEFAULT_SERVING_LIMITS,
  isUnverifiedRefusal,
} from "../../remote/tools/protocolConstants.js";
import { PROBE_DEADLINE_MS } from "../../remote/tools/sessionEventTransport.js";
import { isStillHereOnCached } from "../analytics/lazyDoveGate.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { sleep, fullJitterBackoffMs } from "../../utils/sleep.js";
import { sanitizeInt } from "../../utils/model/telemetryModelName.js";
import { getAccountSetPermissionMode } from "../../utils/permissions/autoModeState.js";
import { outcomeQueryEnvelope } from "../../remote/tools/protocolSchemas.js";
import { isTransportFailure, interpretCallOutcome, hostEpochOf, isRefusedDrop } from "./callOutcome.js";
import { logRemoteTools } from "./remoteToolsDebug.js";

//@ chunk-qmsrnapp.js:2057-2135 placement
function isSilentCallWatchEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_pernambuco", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-qmsrnapp.js:2135-2326 placement
/**
 * 远程静默调用的计时参数：探测宽限、首次探测前的静默时长、可疑次数、重拨时间、判定窗口与自身流保活。
 */
var PROBE_GRACE_MS = 1000;
var SILENT_CALL_TIMING = {
  silentBeforeProbeMs: 8000,
  suspectProbes: 2,
  redialStartedAfterMs:
    SESSION_LIVENESS_TIMEOUT_MS + RECONNECT_BACKOFF_BASE_MS + LIVENESS_PROBE_TIMEOUT_MS + PROBE_GRACE_MS,
  decidingWindowMs: PROBE_DEADLINE_MS,
  ownStreamProofAfterMs: 2000,
  ownStreamKeepaliveMs: 15000,
};
var SAYS_STILL_HERE = "says_still_here";
//@ chunk-qmsrnapp.js:2326-2465 placement
function sessionProgressProbe(host) {
  return isSilentCallWatchEnabled() &&
    isStillHereOnCached() &&
    host.transport.kind === "session" &&
    host.description?.capabilities?.includes(SAYS_STILL_HERE) === true
    ? host.transport.silence
    : undefined;
}
//@ chunk-qmsrnapp.js:2465-2528 placement
function missedProbesSince(e, since) {
  return e.missed().filter((o) => o.writtenAt >= since);
}
//@ chunk-qmsrnapp.js:2528-2664 placement
function silentCallDecision(e, timing) {
  let writtenAt = e[timing.suspectProbes - 1]?.writtenAt;
  return writtenAt === undefined
    ? undefined
    : {
        decidedAt: writtenAt + timing.redialStartedAfterMs + timing.decidingWindowMs,
      };
}
//@ chunk-qmsrnapp.js:2664-2752 placement
/**
 * 判断给定探测记录里是否还有在 n 时刻仍未到期的可疑探测。
 */
function anyProbeStillPending(e, decidedAt, timing) {
  return e.slice(timing.suspectProbes).some((r) => r.writtenAt + r.waitedMs >= decidedAt);
}
//@ chunk-qmsrnapp.js:2752-2814 placement
/**
 * 记录进度监视异常：写错误日志并上报 rtc_silent_call/watch_threw。
 */
function logWatchFailure(error) {
  logError(error);
  logFeatureBad("rtc_silent_call", "watch_threw");
  return;
}
//@ chunk-qmsrnapp.js:2814-2877 placement
/**
 * 空进度句柄：不做任何监视，onAccepted 与 stop 都是空实现。
 */
var NOOP_PROGRESS_WATCH = {
  onAccepted: undefined,
  acceptedAt: () => {
    return;
  },
  stop: () => {},
};
//@ chunk-qmsrnapp.js:2877-3244 placement
/**
 * 远程工具调用发出后监视对端是否沉默：连续错过进度探测时判定 suspect，并在决定窗口内重拨或放弃（rtc_silent_call 遥测）。
 */
function watchSilentCall({
  host,
  signal,
  checkMisses,
  timing = SILENT_CALL_TIMING,
  wait = sleep,
  now = Date.now,
}) {
  try {
    if (sessionProgressProbe(host) === undefined || checkMisses < 2) return NOOP_PROGRESS_WATCH;
    let abortController = new AbortController();
    let h = AbortSignal.any([signal, abortController.signal]);
    let p;
    return {
      onAccepted: () => {
        if (p !== undefined || h.aborted) return;
        p = now();
        pollSilentCall({
          host,
          since: p,
          signal: h,
          timing,
          wait,
          now,
        }).catch(logWatchFailure);
      },
      acceptedAt: () => p,
      stop: () => abortController.abort(),
    };
  } catch (error) {
    logWatchFailure(error);
    return NOOP_PROGRESS_WATCH;
  }
}
//@ chunk-qmsrnapp.js:3244-3659 placement
async function pollSilentCall({ host, since, signal, timing, wait, now }) {
  while (!signal.aborted) {
    let u = sessionProgressProbe(host);
    let h = u?.quietForMs();
    if (u === undefined || h === undefined) return;
    let p = missedProbesSince(u, since);
    let y = silentCallDecision(p, timing);
    if (y !== undefined) {
      if (!anyProbeStillPending(p, y.decidedAt, timing))
        await u.probe(decidingWindowMs(y.decidedAt, timing, now()));
      return;
    }
    let min = Math.min(h, now() - since);
    if (min < timing.silentBeforeProbeMs) {
      await wait(Math.min(timing.silentBeforeProbeMs, timing.silentBeforeProbeMs - min), signal);
      continue;
    }
    if ((await u.probe()) !== false) return;
  }
}
//@ chunk-qmsrnapp.js:3659-3770 placement
function decidingWindowMs(decidedAt, timing, o) {
  return Math.min(
    timing.redialStartedAfterMs + timing.decidingWindowMs,
    Math.max(timing.decidingWindowMs, decidedAt - o),
  );
}
//@ chunk-qmsrnapp.js:3770-4034 placement
function startStillHereProbe(e) {
  try {
    let n = sessionProgressProbe(e.host);
    if (n === undefined || silentCallDecision(missedProbesSince(n, e.since), e.timing) === undefined) return;
    let abortController = new AbortController();
    return {
      done: probeStillHere({
        ...e,
        signal: AbortSignal.any([e.signal, abortController.signal]),
      })
        .catch(logWatchFailure)
        .then((probed) => ({
          probed,
        })),
      stop: () => abortController.abort(),
    };
  } catch (error) {
    return logWatchFailure(error);
  }
}
//@ chunk-qmsrnapp.js:4034-4392 placement
async function probeStillHere({ host, since, signal, timing, now }) {
  for (let p of [1, 2]) {
    let y = sessionProgressProbe(host);
    let _ = y === undefined ? [] : missedProbesSince(y, since);
    let S = silentCallDecision(_, timing);
    if (signal.aborted || y === undefined || S === undefined) return;
    if (anyProbeStillPending(_, S.decidedAt, timing)) return false;
    let k = await y.probe(decidingWindowMs(S.decidedAt, timing, now()));
    if (k !== false) return k;
  }
  let i = sessionProgressProbe(host);
  let u = i === undefined ? [] : missedProbesSince(i, since);
  let h = silentCallDecision(u, timing);
  return h !== undefined && anyProbeStillPending(u, h.decidedAt, timing) ? false : undefined;
}
//@ chunk-qmsrnapp.js:4392-4980 placement
function classifySilentCall({ host, since, probed, checkWrittenAt, timing, now }) {
  try {
    let u = sessionProgressProbe(host);
    let h = u === undefined ? [] : missedProbesSince(u, since);
    let p = silentCallDecision(h, timing);
    if (u === undefined || probed === true || p === undefined)
      return {
        kind: "undecided",
      };
    if (probed !== false || !anyProbeStillPending(h, p.decidedAt, timing))
      return {
        kind: "probe_inconclusive",
      };
    let y = u.ownStreamFrameAt();
    if (
      y === undefined ||
      y < checkWrittenAt + timing.ownStreamProofAfterMs ||
      y < now() - timing.ownStreamKeepaliveMs - timing.ownStreamProofAfterMs
    )
      return {
        kind: "own_stream_quiet",
      };
    u.giveUp();
    let _ = [...h.map((S) => S.writtenAt), checkWrittenAt];
    return {
      kind: "given_up",
      checks: _.length,
      intervalMs: (Math.max(..._) - Math.min(..._)) / (_.length - 1),
    };
  } catch (error) {
    logWatchFailure(error);
    return {
      kind: "undecided",
    };
  }
}
//@ chunk-qmsrnapp.js:4980-5108 placement
var CAP_PROGRESS_CHECKS = "progress_checks";
var STANDING_APPROVALS = "standing_approvals";
var STANDING_OFFERED_RULES = "standing_offered_rules";
var PLAN_CLASSIFIER = "plan_classifier";
var ANNOUNCES_RETURN = "announces_return";
var PROGRESS_POLL_MIN_MS = 3000;
//@ chunk-qmsrnapp.js:5108-5199 placement
function clampedHostLimit(e, n) {
  let { min, max } = SERVING_LIMIT_BOUNDS[n];
  return sanitizeInt(e.description?.limits[n] ?? DEFAULT_SERVING_LIMITS[n], min, max);
}
//@ chunk-qmsrnapp.js:5199-5338 placement
function progressCheckTiming(host) {
  return {
    intervalMs: clampedHostLimit(host, "progress_interval_ms"),
    misses: clampedHostLimit(host, "progress_misses"),
    unreachableBudgetMs: clampedHostLimit(host, "reconcile_ms"),
  };
}
//@ chunk-qmsrnapp.js:5338-5408 placement
function hostSupportsProgressChecks(host) {
  return host.description?.capabilities?.includes(CAP_PROGRESS_CHECKS) === true;
}
//@ chunk-qmsrnapp.js:5408-5478 placement
function hostAnnouncesReturn(host) {
  return host.description?.capabilities?.includes(ANNOUNCES_RETURN) === true;
}
//@ chunk-qmsrnapp.js:5478-5530 placement
function isSessionTransport(e) {
  return e.transport.kind === "session";
}
//@ chunk-qmsrnapp.js:5530-5600 placement
function hasCapability(e) {
  return e.description?.capabilities?.includes(PLAN_CLASSIFIER) === true;
}
//@ chunk-qmsrnapp.js:5600-5676 placement = handleAutoModeTransition (0.799)
function isAutoModeCapableHost(host) {
  let accountSetPermissionMode = getAccountSetPermissionMode();
  return (
    hasCapability(host) &&
    (accountSetPermissionMode === "auto" || (accountSetPermissionMode === "plan" && isSessionTransport(host)))
  );
}
//@ chunk-qmsrnapp.js:5676-5754 placement
function hasSessionCapability(e) {
  return isSessionTransport(e) && e.description?.capabilities?.includes(STANDING_APPROVALS) === true;
}
//@ chunk-qmsrnapp.js:5754-5832 placement
function hasSessionCapabilityPair(host) {
  return (
    hasSessionCapability(host) && host.description?.capabilities?.includes(STANDING_OFFERED_RULES) === true
  );
}
//@ chunk-qmsrnapp.js:5832-9616 placement
/**
 * 等待在远程机器上执行的调用结果：周期性进度探测、迟到结果、对端重启/断线时向对端追问调用结局。
 */
async function awaitRemoteCallWithProgress({
  host,
  held,
  dispatchEpoch,
  toolName,
  callId,
  signal,
  timing,
  ranBefore = false,
  onAttempt,
  onOutput,
  silentSince,
  silentCallTiming = SILENT_CALL_TIMING,
  sleep: sleep_2 = sleep,
  now = Date.now,
}) {
  let P = outcomeQueryEnvelope(callId);
  let T = 0;
  let A = 0;
  let I = 0;
  let R;
  let epochChanged = false;
  let W;
  let V;
  let promise = new Promise((resolve) => {
    V = () => resolve("late");
  });
  let Y = ranBefore;
  let X = false;
  let w;
  let L;
  held?.late.then((j) => {
    if (isTransportFailure(j)) held = undefined;
    else if (j.kind === "result" && j.envelope?.outcome === "in_progress") {
      Y ||= j.envelope.state === "running";
      if (j.envelope.state === "running") onOutput?.(j.envelope.output_tail);
      A = 0;
      I = 0;
      L = undefined;
      held = undefined;
    } else {
      W = j;
      V();
    }
  });
  let D = (j) => {
    logRemoteTools(callId, "check-in ended", {
      verdict: j.kind,
      attempts: T,
      misses: A,
      held: held !== undefined,
    });
    w?.stop();
    if (L === "ended") logFeatureOk("rtc_silent_call");
    else if (L !== undefined && j.kind === "host_unresponsive" && !j.stillConnected)
      logFeatureSad("rtc_silent_call", L);
    return {
      verdict: j,
      attempts: T,
      misses: A,
      epochChanged,
    };
  };
  let C = () => W === undefined && host.transport.saidAsleep?.() === true;
  let x = () =>
    D({
      kind: "host_asleep",
      whileRunning: held !== undefined || Y,
    });
  let le = () =>
    fullJitterBackoffMs({
      baseMs: timing.intervalMs,
      capMs: timing.intervalMs,
      floorMs: Math.ceil(timing.intervalMs / 2),
      attempt: 0,
      random: timing.random,
    });
  await (held === undefined
    ? sleep_2(Math.min(PROGRESS_POLL_MIN_MS, le()), signal)
    : Promise.race([promise, Promise.resolve()]));
  while (!signal.aborted) {
    if (W !== undefined) {
      logRemoteTools(callId, "late answer taken on the standing request", {
        heard: W.kind,
        after_misses: A,
      });
      return D({
        kind: "late",
        transported: W,
      });
    }
    if (C()) {
      A += 1;
      if (T === 0 || A >= timing.misses) return x();
      await Promise.race([sleep_2(le(), signal), promise]);
      continue;
    }
    T += 1;
    onAttempt?.(X);
    let checkWrittenAt = now();
    w?.stop();
    w =
      silentSince !== undefined && A + 1 < timing.misses
        ? startStillHereProbe({
            host,
            since: silentSince,
            signal,
            timing: silentCallTiming,
            now,
          })
        : undefined;
    let winner = await Promise.race([
      host.transport
        .call(toolName, {}, P, {
          signal,
          deadlineMs: Math.min(timing.intervalMs, host.transport.limits.defaultDeadlineMs),
          toolUseId: callId,
        })
        .catch(() => ({
          kind: "transport_error",
          detail: "",
        })),
      promise,
    ]);
    if (winner === "late" || winner.kind !== "timed_out") {
      w?.stop();
      w = undefined;
    }
    if (winner === "late" || W !== undefined) continue;
    switch (winner.kind) {
      case "result": {
        let q = interpretCallOutcome(winner, dispatchEpoch);
        let Q = winner.envelope === undefined ? undefined : hostEpochOf(winner.envelope);
        epochChanged = dispatchEpoch !== undefined && Q !== undefined && Q !== dispatchEpoch;
        if (q.kind === "query_turned_away") {
          A += 1;
          R = undefined;
          break;
        }
        if (q.kind !== "still_running") return D(q);
        if (q.state === "awaiting_approval" && held === undefined)
          return D({
            kind: "ask_lost",
          });
        Y ||= q.state === "running";
        if (q.state === "running") onOutput?.(q.output);
        X = true;
        A = 0;
        I = 0;
        R = undefined;
        L = undefined;
        break;
      }
      case "cancelled":
        return D({
          kind: "cancelled",
        });
      case "host_gone":
        if (held === undefined)
          return D({
            kind: "gone",
            transported: {
              ...winner,
              unsent: false,
            },
          });
        await Promise.race([promise, sleep_2(timing.intervalMs, signal)]);
        continue;
      case "timed_out":
        A += 1;
        R = undefined;
        break;
      case "dropped":
      case "unreachable":
      case "stalled":
      case "approval_unverified":
      case "transport_error":
        if (isUnverifiedRefusal(winner)) {
          A += 1;
          R = undefined;
          if (isRefusedDrop(winner)) I += 1;
          break;
        }
        if (winner.kind === "transport_error" && winner.unreadableResult === true)
          return D({
            kind: "unknown",
            why: "unreadable",
          });
        R ??= now();
        if (now() - R >= timing.unreachableBudgetMs)
          return D({
            kind: "unreachable",
          });
        break;
    }
    logRemoteTools(callId, "check-in answered", {
      attempt: T,
      heard: winner.kind,
      misses: A,
    });
    if (silentSince !== undefined && w !== undefined && winner.kind === "timed_out") {
      let q = sleep_2(le(), signal).then(() => {
        return;
      });
      let winner = await Promise.race([
        w.done,
        q,
        promise.then(() => {
          return;
        }),
      ]);
      if (W === undefined && !signal.aborted && !C()) {
        let Z = classifySilentCall({
          host,
          since: silentSince,
          probed: winner?.probed,
          checkWrittenAt,
          timing: silentCallTiming,
          now,
        });
        if (winner !== undefined && Z.kind === "given_up") {
          L = "ended";
          return D({
            kind: "host_unresponsive",
            misses: Z.checks,
            whileRunning: held !== undefined || Y,
            stillConnected: false,
            intervalMs: Z.intervalMs,
          });
        }
        if (Z.kind !== "undecided" && Z.kind !== "given_up") L = winner === undefined ? "probe_late" : Z.kind;
      }
      await Promise.race([q, promise]);
      continue;
    }
    if (A >= timing.misses) {
      if (C()) return x();
      if (I === A)
        return D({
          kind: "unbound",
          misses: A,
          whileRunning: Y,
        });
      let promise_2 = new Promise((resolve) => {
        signal.addEventListener("abort", () => resolve(undefined), {
          once: true,
        });
      });
      let Q = Promise.resolve()
        .then(() =>
          host.transport.probeLive?.({
            signal,
          }),
        )
        .catch(() => {
          return;
        });
      let Z = signal.aborted ? undefined : await Promise.race([Q, promise_2, promise]);
      if (W !== undefined)
        return D({
          kind: "late",
          transported: W,
        });
      if (signal.aborted)
        return D({
          kind: "cancelled",
        });
      return D({
        kind: "host_unresponsive",
        misses: A,
        whileRunning: held !== undefined || Y,
        stillConnected: Z === true,
      });
    }
    await Promise.race([sleep_2(le(), signal), promise]);
  }
  return D({
    kind: "cancelled",
  });
}
export {
  hostSupportsProgressChecks,
  clampedHostLimit,
  progressCheckTiming,
  SILENT_CALL_TIMING,
  awaitRemoteCallWithProgress,
  hostAnnouncesReturn,
  watchSilentCall,
  isAutoModeCapableHost,
  hasCapability,
  hasSessionCapability,
  hasSessionCapabilityPair,
  isSessionTransport,
};
