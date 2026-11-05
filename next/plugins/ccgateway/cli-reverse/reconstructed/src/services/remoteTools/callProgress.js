/**
 * services/remoteTools/callProgress.ts
 *
 * 2.1.316 新增：远程工具调用进度监视：对端沉默时探测、轮询并判定是否放弃。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5vfqv7sk.js (25)
 * attribution: placement 25
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5vfqv7sk.js:2267-2345 placement
function isSilentCallWatchEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_pernambuco", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-5vfqv7sk.js:2345-2536 placement
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
//@ chunk-5vfqv7sk.js:2536-2675 placement
function sessionProgressProbe(host) {
  return isSilentCallWatchEnabled() &&
    isStillHereOnCached() &&
    host.transport.kind === "session" &&
    host.description?.capabilities?.includes(SAYS_STILL_HERE) === true
    ? host.transport.silence
    : undefined;
}
//@ chunk-5vfqv7sk.js:2675-2738 placement
function missedProbesSince(probe, since) {
  return probe.missed().filter((miss) => miss.writtenAt >= since);
}
//@ chunk-5vfqv7sk.js:2738-2874 placement
function silentCallDecision(misses, timing) {
  let writtenAt = misses[timing.suspectProbes - 1]?.writtenAt;
  return writtenAt === undefined
    ? undefined
    : {
        decidedAt: writtenAt + timing.redialStartedAfterMs + timing.decidingWindowMs,
      };
}
//@ chunk-5vfqv7sk.js:2874-2962 placement
/**
 * 判断给定探测记录里是否还有在 n 时刻仍未到期的可疑探测。
 */
function anyProbeStillPending(misses, decidedAt, timing) {
  return misses.slice(timing.suspectProbes).some((miss) => miss.writtenAt + miss.waitedMs >= decidedAt);
}
//@ chunk-5vfqv7sk.js:2962-3024 placement
/**
 * 记录进度监视异常：写错误日志并上报 rtc_silent_call/watch_threw。
 */
function logWatchFailure(error) {
  logError(error);
  logFeatureBad("rtc_silent_call", "watch_threw");
  return;
}
//@ chunk-5vfqv7sk.js:3024-3087 placement
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
//@ chunk-5vfqv7sk.js:3087-3454 placement
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
    let combinedSignal = AbortSignal.any([signal, abortController.signal]);
    let acceptedAtMs;
    return {
      onAccepted: () => {
        if (acceptedAtMs !== undefined || combinedSignal.aborted) return;
        acceptedAtMs = now();
        pollSilentCall({
          host,
          since: acceptedAtMs,
          signal: combinedSignal,
          timing,
          wait,
          now,
        }).catch(logWatchFailure);
      },
      acceptedAt: () => acceptedAtMs,
      stop: () => abortController.abort(),
    };
  } catch (error) {
    logWatchFailure(error);
    return NOOP_PROGRESS_WATCH;
  }
}
//@ chunk-5vfqv7sk.js:3454-3869 placement
async function pollSilentCall({ host, since, signal, timing, wait, now }) {
  while (!signal.aborted) {
    let probe = sessionProgressProbe(host);
    let quietForMs = probe?.quietForMs();
    if (probe === undefined || quietForMs === undefined) return;
    let misses = missedProbesSince(probe, since);
    let decision = silentCallDecision(misses, timing);
    if (decision !== undefined) {
      if (!anyProbeStillPending(misses, decision.decidedAt, timing))
        await probe.probe(decidingWindowMs(decision.decidedAt, timing, now()));
      return;
    }
    let min = Math.min(quietForMs, now() - since);
    if (min < timing.silentBeforeProbeMs) {
      await wait(Math.min(timing.silentBeforeProbeMs, timing.silentBeforeProbeMs - min), signal);
      continue;
    }
    if ((await probe.probe()) !== false) return;
  }
}
//@ chunk-5vfqv7sk.js:3869-3980 placement
function decidingWindowMs(decidedAt, timing, nowMs) {
  return Math.min(
    timing.redialStartedAfterMs + timing.decidingWindowMs,
    Math.max(timing.decidingWindowMs, decidedAt - nowMs),
  );
}
//@ chunk-5vfqv7sk.js:3980-4244 placement
function startStillHereProbe(options) {
  try {
    let probe = sessionProgressProbe(options.host);
    if (
      probe === undefined ||
      silentCallDecision(missedProbesSince(probe, options.since), options.timing) === undefined
    )
      return;
    let abortController = new AbortController();
    return {
      done: probeStillHere({
        ...options,
        signal: AbortSignal.any([options.signal, abortController.signal]),
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
//@ chunk-5vfqv7sk.js:4244-4602 placement
async function probeStillHere({ host, since, signal, timing, now }) {
  for (let pass of [1, 2]) {
    let probe = sessionProgressProbe(host);
    let misses = probe === undefined ? [] : missedProbesSince(probe, since);
    let decision = silentCallDecision(misses, timing);
    if (signal.aborted || probe === undefined || decision === undefined) return;
    if (anyProbeStillPending(misses, decision.decidedAt, timing)) return false;
    let alive = await probe.probe(decidingWindowMs(decision.decidedAt, timing, now()));
    if (alive !== false) return alive;
  }
  let probe = sessionProgressProbe(host);
  let misses = probe === undefined ? [] : missedProbesSince(probe, since);
  let decision = silentCallDecision(misses, timing);
  return decision !== undefined && anyProbeStillPending(misses, decision.decidedAt, timing)
    ? false
    : undefined;
}
//@ chunk-5vfqv7sk.js:4602-5190 placement
function classifySilentCall({ host, since, probed, checkWrittenAt, timing, now }) {
  try {
    let probe = sessionProgressProbe(host);
    let misses = probe === undefined ? [] : missedProbesSince(probe, since);
    let decision = silentCallDecision(misses, timing);
    if (probe === undefined || probed === true || decision === undefined)
      return {
        kind: "undecided",
      };
    if (probed !== false || !anyProbeStillPending(misses, decision.decidedAt, timing))
      return {
        kind: "probe_inconclusive",
      };
    let ownStreamFrameAt = probe.ownStreamFrameAt();
    if (
      ownStreamFrameAt === undefined ||
      ownStreamFrameAt < checkWrittenAt + timing.ownStreamProofAfterMs ||
      ownStreamFrameAt < now() - timing.ownStreamKeepaliveMs - timing.ownStreamProofAfterMs
    )
      return {
        kind: "own_stream_quiet",
      };
    probe.giveUp();
    let checkTimes = [...misses.map((miss) => miss.writtenAt), checkWrittenAt];
    return {
      kind: "given_up",
      checks: checkTimes.length,
      intervalMs: (Math.max(...checkTimes) - Math.min(...checkTimes)) / (checkTimes.length - 1),
    };
  } catch (error) {
    logWatchFailure(error);
    return {
      kind: "undecided",
    };
  }
}
//@ chunk-5vfqv7sk.js:5190-5318 placement
var CAP_PROGRESS_CHECKS = "progress_checks";
var STANDING_APPROVALS = "standing_approvals";
var STANDING_OFFERED_RULES = "standing_offered_rules";
var PLAN_CLASSIFIER = "plan_classifier";
var ANNOUNCES_RETURN = "announces_return";
var PROGRESS_POLL_MIN_MS = 3000;
//@ chunk-5vfqv7sk.js:5318-5409 placement
function clampedHostLimit(server, limitName) {
  let { min, max } = SERVING_LIMIT_BOUNDS[limitName];
  return sanitizeInt(server.description?.limits[limitName] ?? DEFAULT_SERVING_LIMITS[limitName], min, max);
}
//@ chunk-5vfqv7sk.js:5409-5548 placement
function progressCheckTiming(host) {
  return {
    intervalMs: clampedHostLimit(host, "progress_interval_ms"),
    misses: clampedHostLimit(host, "progress_misses"),
    unreachableBudgetMs: clampedHostLimit(host, "reconcile_ms"),
  };
}
//@ chunk-5vfqv7sk.js:5548-5618 placement
function hostSupportsProgressChecks(host) {
  return host.description?.capabilities?.includes(CAP_PROGRESS_CHECKS) === true;
}
//@ chunk-5vfqv7sk.js:5618-5688 placement
function hostAnnouncesReturn(host) {
  return host.description?.capabilities?.includes(ANNOUNCES_RETURN) === true;
}
//@ chunk-5vfqv7sk.js:5688-5740 placement
function isSessionTransport(host) {
  return host.transport.kind === "session";
}
//@ chunk-5vfqv7sk.js:5740-5810 placement
function hasCapability(server) {
  return server.description?.capabilities?.includes(PLAN_CLASSIFIER) === true;
}
//@ chunk-5vfqv7sk.js:5810-5886 placement (2.1.88 match: handleAutoModeTransition, 0.798)
function isAutoModeCapableHost(host) {
  let accountSetPermissionMode = getAccountSetPermissionMode();
  return (
    hasCapability(host) &&
    (accountSetPermissionMode === "auto" || (accountSetPermissionMode === "plan" && isSessionTransport(host)))
  );
}
//@ chunk-5vfqv7sk.js:5886-5964 placement
function hasSessionCapability(host) {
  return isSessionTransport(host) && host.description?.capabilities?.includes(STANDING_APPROVALS) === true;
}
//@ chunk-5vfqv7sk.js:5964-6042 placement
function hasSessionCapabilityPair(host) {
  return (
    hasSessionCapability(host) && host.description?.capabilities?.includes(STANDING_OFFERED_RULES) === true
  );
}
//@ chunk-5vfqv7sk.js:6042-9835 placement
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
  let queryEnvelope = outcomeQueryEnvelope(callId);
  let attempts = 0;
  let misses = 0;
  let unboundMisses = 0;
  let unreachableSinceMs;
  let epochChanged = false;
  let lateResult;
  let resolveLate;
  let promise = new Promise((resolve) => {
    resolveLate = () => resolve("late");
  });
  let ranSomewhere = ranBefore;
  let sawRunning = false;
  let stillHereProbe;
  let silentVerdict;
  held?.late.then((late) => {
    if (isTransportFailure(late)) held = undefined;
    else if (late.kind === "result" && late.envelope?.outcome === "in_progress") {
      ranSomewhere ||= late.envelope.state === "running";
      if (late.envelope.state === "running") onOutput?.(late.envelope.output_tail);
      misses = 0;
      unboundMisses = 0;
      silentVerdict = undefined;
      held = undefined;
    } else {
      lateResult = late;
      resolveLate();
    }
  });
  let finish = (verdict) => {
    logRemoteTools(callId, "check-in ended", {
      verdict: verdict.kind,
      attempts,
      misses,
      held: held !== undefined,
    });
    stillHereProbe?.stop();
    if (silentVerdict === "ended") logFeatureOk("rtc_silent_call");
    else if (silentVerdict !== undefined && verdict.kind === "host_unresponsive" && !verdict.stillConnected)
      logFeatureSad("rtc_silent_call", silentVerdict);
    return {
      verdict,
      attempts,
      misses,
      epochChanged,
    };
  };
  let hostAsleep = () => lateResult === undefined && host.transport.saidAsleep?.() === true;
  let asleepVerdict = () =>
    finish({
      kind: "host_asleep",
      whileRunning: held !== undefined || ranSomewhere,
    });
  let nextPauseMs = () =>
    fullJitterBackoffMs({
      baseMs: timing.intervalMs,
      capMs: timing.intervalMs,
      floorMs: Math.ceil(timing.intervalMs / 2),
      attempt: 0,
      random: timing.random,
    });
  await (held === undefined
    ? sleep_2(Math.min(PROGRESS_POLL_MIN_MS, nextPauseMs()), signal)
    : Promise.race([promise, Promise.resolve()]));
  while (!signal.aborted) {
    if (lateResult !== undefined) {
      logRemoteTools(callId, "late answer taken on the standing request", {
        heard: lateResult.kind,
        after_misses: misses,
      });
      return finish({
        kind: "late",
        transported: lateResult,
      });
    }
    if (hostAsleep()) {
      misses += 1;
      if (attempts === 0 || misses >= timing.misses) return asleepVerdict();
      await Promise.race([sleep_2(nextPauseMs(), signal), promise]);
      continue;
    }
    attempts += 1;
    onAttempt?.(sawRunning);
    let checkWrittenAt = now();
    stillHereProbe?.stop();
    stillHereProbe =
      silentSince !== undefined && misses + 1 < timing.misses
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
        .call(toolName, {}, queryEnvelope, {
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
      stillHereProbe?.stop();
      stillHereProbe = undefined;
    }
    if (winner === "late" || lateResult !== undefined) continue;
    switch (winner.kind) {
      case "result": {
        let interpreted = interpretCallOutcome(winner, dispatchEpoch);
        let epoch = winner.envelope === undefined ? undefined : hostEpochOf(winner.envelope);
        epochChanged = dispatchEpoch !== undefined && epoch !== undefined && epoch !== dispatchEpoch;
        if (interpreted.kind === "query_turned_away") {
          misses += 1;
          unreachableSinceMs = undefined;
          break;
        }
        if (interpreted.kind !== "still_running") return finish(interpreted);
        if (interpreted.state === "awaiting_approval" && held === undefined)
          return finish({
            kind: "ask_lost",
          });
        ranSomewhere ||= interpreted.state === "running";
        if (interpreted.state === "running") onOutput?.(interpreted.output);
        sawRunning = true;
        misses = 0;
        unboundMisses = 0;
        unreachableSinceMs = undefined;
        silentVerdict = undefined;
        break;
      }
      case "cancelled":
        return finish({
          kind: "cancelled",
        });
      case "host_gone":
        if (held === undefined)
          return finish({
            kind: "gone",
            transported: {
              ...winner,
              unsent: false,
            },
          });
        await Promise.race([promise, sleep_2(timing.intervalMs, signal)]);
        continue;
      case "timed_out":
        misses += 1;
        unreachableSinceMs = undefined;
        break;
      case "dropped":
      case "unreachable":
      case "stalled":
      case "approval_unverified":
      case "transport_error":
        if (isUnverifiedRefusal(winner)) {
          misses += 1;
          unreachableSinceMs = undefined;
          if (isRefusedDrop(winner)) unboundMisses += 1;
          break;
        }
        if (winner.kind === "transport_error" && winner.unreadableResult === true)
          return finish({
            kind: "unknown",
            why: "unreadable",
          });
        unreachableSinceMs ??= now();
        if (now() - unreachableSinceMs >= timing.unreachableBudgetMs)
          return finish({
            kind: "unreachable",
          });
        break;
    }
    logRemoteTools(callId, "check-in answered", {
      attempt: attempts,
      heard: winner.kind,
      misses,
    });
    if (silentSince !== undefined && stillHereProbe !== undefined && winner.kind === "timed_out") {
      let probeWait = sleep_2(nextPauseMs(), signal).then(() => {
        return;
      });
      let winner = await Promise.race([
        stillHereProbe.done,
        probeWait,
        promise.then(() => {
          return;
        }),
      ]);
      if (lateResult === undefined && !signal.aborted && !hostAsleep()) {
        let silentDecision = classifySilentCall({
          host,
          since: silentSince,
          probed: winner?.probed,
          checkWrittenAt,
          timing: silentCallTiming,
          now,
        });
        if (winner !== undefined && silentDecision.kind === "given_up") {
          silentVerdict = "ended";
          return finish({
            kind: "host_unresponsive",
            misses: silentDecision.checks,
            whileRunning: held !== undefined || ranSomewhere,
            stillConnected: false,
            intervalMs: silentDecision.intervalMs,
          });
        }
        if (silentDecision.kind !== "undecided" && silentDecision.kind !== "given_up")
          silentVerdict = winner === undefined ? "probe_late" : silentDecision.kind;
      }
      await Promise.race([probeWait, promise]);
      continue;
    }
    if (misses >= timing.misses) {
      if (hostAsleep()) return asleepVerdict();
      if (unboundMisses === misses)
        return finish({
          kind: "unbound",
          misses,
          whileRunning: ranSomewhere,
        });
      let promise_2 = new Promise((resolve) => {
        signal.addEventListener("abort", () => resolve(undefined), {
          once: true,
        });
      });
      let probeLive = Promise.resolve()
        .then(() =>
          host.transport.probeLive?.({
            signal,
          }),
        )
        .catch(() => {
          return;
        });
      let stillConnected = signal.aborted ? undefined : await Promise.race([probeLive, promise_2, promise]);
      if (lateResult !== undefined)
        return finish({
          kind: "late",
          transported: lateResult,
        });
      if (signal.aborted)
        return finish({
          kind: "cancelled",
        });
      return finish({
        kind: "host_unresponsive",
        misses,
        whileRunning: held !== undefined || ranSomewhere,
        stillConnected: stillConnected === true,
      });
    }
    await Promise.race([sleep_2(nextPauseMs(), signal), promise]);
  }
  return finish({
    kind: "cancelled",
  });
}
export {
  isSessionTransport,
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
};
