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
import { CXe, f$n } from "./awayTimings.js";
import { _lr, Kvn, TFe, isUnverifiedRefusal } from "../../remote/tools/protocolConstants.js";
import { PROBE_DEADLINE_MS } from "../../remote/tools/sessionEventTransport.js";
import { isStillHereOnCached } from "../analytics/lazyDoveGate.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { sleep, fullJitterBackoffMs } from "../../utils/sleep.js";
import { qpr } from "../../utils/model/telemetryModelName.js";
import { getAccountSetPermissionMode } from "../../utils/permissions/autoModeState.js";
import { outcomeQueryEnvelope } from "../../remote/tools/protocolSchemas.js";
import { isTransportFailure, interpretCallOutcome, hostEpochOf, isRefusedDrop } from "./callOutcome.js";
import { logRemoteTools } from "./remoteToolsDebug.js";

//@ chunk-qmsrnapp.js:2057-2135 placement
function isSilentCallWatchEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_pernambuco", !1) === !0;
  } catch {
    return !1;
  }
}
/**
 * 远程静默调用的计时参数：探测宽限、首次探测前的静默时长、可疑次数、重拨时间、判定窗口与自身流保活。
 */
//@ chunk-qmsrnapp.js:2135-2326 placement
var PROBE_GRACE_MS = 1000,
  SILENT_CALL_TIMING = {
    silentBeforeProbeMs: 8000,
    suspectProbes: 2,
    redialStartedAfterMs: CXe + f$n + _lr + PROBE_GRACE_MS,
    decidingWindowMs: PROBE_DEADLINE_MS,
    ownStreamProofAfterMs: 2000,
    ownStreamKeepaliveMs: 15000,
  },
  SAYS_STILL_HERE = "says_still_here";
//@ chunk-qmsrnapp.js:2326-2465 placement
function sessionProgressProbe(e) {
  return isSilentCallWatchEnabled() &&
    isStillHereOnCached() &&
    e.transport.kind === "session" &&
    e.description?.capabilities?.includes(SAYS_STILL_HERE) === !0
    ? e.transport.silence
    : void 0;
}
//@ chunk-qmsrnapp.js:2465-2528 placement
function missedProbesSince(e, n) {
  return e.missed().filter((o) => o.writtenAt >= n);
}
//@ chunk-qmsrnapp.js:2528-2664 placement
function silentCallDecision(e, n) {
  let o = e[n.suspectProbes - 1]?.writtenAt;
  return o === void 0 ? void 0 : { decidedAt: o + n.redialStartedAfterMs + n.decidingWindowMs };
}
//@ chunk-qmsrnapp.js:2664-2752 placement
function ce(e, n, o) {
  return e.slice(o.suspectProbes).some((r) => r.writtenAt + r.waitedMs >= n);
}
//@ chunk-qmsrnapp.js:2752-2814 placement
function ae(e) {
  (logError(e), logFeatureBad("rtc_silent_call", "watch_threw"));
  return;
}
//@ chunk-qmsrnapp.js:2814-2877 placement
var Pe = {
  onAccepted: void 0,
  acceptedAt: () => {
    return;
  },
  stop: () => {},
};
/**
 * 远程工具调用发出后监视对端是否沉默：连续错过进度探测时判定 suspect，并在决定窗口内重拨或放弃（rtc_silent_call 遥测）。
 */
//@ chunk-qmsrnapp.js:2877-3244 placement
function watchSilentCall({
  host: host,
  signal: signal,
  checkMisses: checkMisses,
  timing: timing = SILENT_CALL_TIMING,
  wait: wait = sleep,
  now: now = Date.now,
}) {
  try {
    if (sessionProgressProbe(host) === void 0 || checkMisses < 2) return Pe;
    let abortController = new AbortController(),
      any = AbortSignal.any([signal, abortController.signal]),
      p;
    return {
      onAccepted: () => {
        if (p !== void 0 || any.aborted) return;
        ((p = now()),
          pollSilentCall({ host: host, since: p, signal: any, timing: timing, wait: wait, now: now }).catch(
            ae,
          ));
      },
      acceptedAt: () => p,
      stop: () => abortController.abort(),
    };
  } catch (error) {
    return (ae(error), Pe);
  }
}
//@ chunk-qmsrnapp.js:3244-3659 placement
async function pollSilentCall({
  host: host,
  since: since,
  signal: signal,
  timing: timing,
  wait: wait,
  now: now,
}) {
  while (!signal.aborted) {
    let u = sessionProgressProbe(host),
      h = u?.quietForMs();
    if (u === void 0 || h === void 0) return;
    let p = missedProbesSince(u, since),
      y = silentCallDecision(p, timing);
    if (y !== void 0) {
      if (!ce(p, y.decidedAt, timing)) await u.probe(decidingWindowMs(y.decidedAt, timing, now()));
      return;
    }
    let min = Math.min(h, now() - since);
    if (min < timing.silentBeforeProbeMs) {
      await wait(Math.min(timing.silentBeforeProbeMs, timing.silentBeforeProbeMs - min), signal);
      continue;
    }
    if ((await u.probe()) !== !1) return;
  }
}
//@ chunk-qmsrnapp.js:3659-3770 placement
function decidingWindowMs(e, n, o) {
  return Math.min(n.redialStartedAfterMs + n.decidingWindowMs, Math.max(n.decidingWindowMs, e - o));
}
//@ chunk-qmsrnapp.js:3770-4034 placement
function startStillHereProbe(e) {
  try {
    let n = sessionProgressProbe(e.host);
    if (n === void 0 || silentCallDecision(missedProbesSince(n, e.since), e.timing) === void 0) return;
    let abortController = new AbortController();
    return {
      done: probeStillHere({ ...e, signal: AbortSignal.any([e.signal, abortController.signal]) })
        .catch(ae)
        .then((r) => ({ probed: r })),
      stop: () => abortController.abort(),
    };
  } catch (error) {
    return ae(error);
  }
}
//@ chunk-qmsrnapp.js:4034-4392 placement
async function probeStillHere({ host: host, since: since, signal: signal, timing: timing, now: now }) {
  for (let p of [1, 2]) {
    let y = sessionProgressProbe(host),
      _ = y === void 0 ? [] : missedProbesSince(y, since),
      S = silentCallDecision(_, timing);
    if (signal.aborted || y === void 0 || S === void 0) return;
    if (ce(_, S.decidedAt, timing)) return !1;
    let probe = await y.probe(decidingWindowMs(S.decidedAt, timing, now()));
    if (probe !== !1) return probe;
  }
  let i = sessionProgressProbe(host),
    u = i === void 0 ? [] : missedProbesSince(i, since),
    h = silentCallDecision(u, timing);
  return h !== void 0 && ce(u, h.decidedAt, timing) ? !1 : void 0;
}
//@ chunk-qmsrnapp.js:4392-4980 placement
function classifySilentCall({
  host: host,
  since: since,
  probed: probed,
  checkWrittenAt: checkWrittenAt,
  timing: timing,
  now: now,
}) {
  try {
    let u = sessionProgressProbe(host),
      h = u === void 0 ? [] : missedProbesSince(u, since),
      p = silentCallDecision(h, timing);
    if (u === void 0 || probed === !0 || p === void 0) return { kind: "undecided" };
    if (probed !== !1 || !ce(h, p.decidedAt, timing)) return { kind: "probe_inconclusive" };
    let ownStreamFrameAt = u.ownStreamFrameAt();
    if (
      ownStreamFrameAt === void 0 ||
      ownStreamFrameAt < checkWrittenAt + timing.ownStreamProofAfterMs ||
      ownStreamFrameAt < now() - timing.ownStreamKeepaliveMs - timing.ownStreamProofAfterMs
    )
      return { kind: "own_stream_quiet" };
    u.giveUp();
    let _ = [...h.map((S) => S.writtenAt), checkWrittenAt];
    return {
      kind: "given_up",
      checks: _.length,
      intervalMs: (Math.max(..._) - Math.min(..._)) / (_.length - 1),
    };
  } catch (error) {
    return (ae(error), { kind: "undecided" });
  }
}
//@ chunk-qmsrnapp.js:4980-5108 placement
var CAP_PROGRESS_CHECKS = "progress_checks",
  STANDING_APPROVALS = "standing_approvals",
  STANDING_OFFERED_RULES = "standing_offered_rules",
  PLAN_CLASSIFIER = "plan_classifier",
  ANNOUNCES_RETURN = "announces_return",
  Kt = 3000;
//@ chunk-qmsrnapp.js:5108-5199 placement
function clampedHostLimit(e, n) {
  let { min: min, max: max } = Kvn[n];
  return qpr(e.description?.limits[n] ?? TFe[n], min, max);
}
//@ chunk-qmsrnapp.js:5199-5338 placement
function progressCheckTiming(e) {
  return {
    intervalMs: clampedHostLimit(e, "progress_interval_ms"),
    misses: clampedHostLimit(e, "progress_misses"),
    unreachableBudgetMs: clampedHostLimit(e, "reconcile_ms"),
  };
}
//@ chunk-qmsrnapp.js:5338-5408 placement
function hostSupportsProgressChecks(e) {
  return e.description?.capabilities?.includes(CAP_PROGRESS_CHECKS) === !0;
}
//@ chunk-qmsrnapp.js:5408-5478 placement
function hostAnnouncesReturn(e) {
  return e.description?.capabilities?.includes(ANNOUNCES_RETURN) === !0;
}
//@ chunk-qmsrnapp.js:5478-5530 placement
function isSessionTransport(e) {
  return e.transport.kind === "session";
}
//@ chunk-qmsrnapp.js:5530-5600 placement
function hasCapability(e) {
  return e.description?.capabilities?.includes(PLAN_CLASSIFIER) === !0;
}
//@ chunk-qmsrnapp.js:5600-5676 placement = handleAutoModeTransition (0.799)
function isAutoModeCapableHost(e) {
  let n = getAccountSetPermissionMode();
  return hasCapability(e) && (n === "auto" || (n === "plan" && isSessionTransport(e)));
}
//@ chunk-qmsrnapp.js:5676-5754 placement
function hasSessionCapability(e) {
  return isSessionTransport(e) && e.description?.capabilities?.includes(STANDING_APPROVALS) === !0;
}
//@ chunk-qmsrnapp.js:5754-5832 placement
function hasSessionCapabilityPair(e) {
  return hasSessionCapability(e) && e.description?.capabilities?.includes(STANDING_OFFERED_RULES) === !0;
}
/**
 * 等待在远程机器上执行的调用结果：周期性进度探测、迟到结果、对端重启/断线时向对端追问调用结局。
 */
//@ chunk-qmsrnapp.js:5832-9616 placement
async function awaitRemoteCallWithProgress({
  host: host,
  held: held,
  dispatchEpoch: dispatchEpoch,
  toolName: toolName,
  callId: callId,
  signal: signal,
  timing: timing,
  ranBefore: ranBefore = !1,
  onAttempt: onAttempt,
  onOutput: onOutput,
  silentSince: silentSince,
  silentCallTiming: silentCallTiming = SILENT_CALL_TIMING,
  sleep: sleep_2 = sleep,
  now: now = Date.now,
}) {
  let P = outcomeQueryEnvelope(callId),
    T = 0,
    A = 0,
    I = 0,
    R,
    K = !1,
    W,
    V,
    promise = new Promise((j) => {
      V = () => j("late");
    }),
    Y = ranBefore,
    X = !1,
    w,
    L;
  held?.late.then((j) => {
    if (isTransportFailure(j)) held = void 0;
    else if (j.kind === "result" && j.envelope?.outcome === "in_progress") {
      if (((Y ||= j.envelope.state === "running"), j.envelope.state === "running"))
        onOutput?.(j.envelope.output_tail);
      ((A = 0), (I = 0), (L = void 0), (held = void 0));
    } else ((W = j), V());
  });
  let D = (j) => {
      if (
        (logRemoteTools(callId, "check-in ended", {
          verdict: j.kind,
          attempts: T,
          misses: A,
          held: held !== void 0,
        }),
        w?.stop(),
        L === "ended")
      )
        logFeatureOk("rtc_silent_call");
      else if (L !== void 0 && j.kind === "host_unresponsive" && !j.stillConnected)
        logFeatureSad("rtc_silent_call", L);
      return { verdict: j, attempts: T, misses: A, epochChanged: K };
    },
    C = () => W === void 0 && host.transport.saidAsleep?.() === !0,
    x = () => D({ kind: "host_asleep", whileRunning: held !== void 0 || Y }),
    le = () =>
      fullJitterBackoffMs({
        baseMs: timing.intervalMs,
        capMs: timing.intervalMs,
        floorMs: Math.ceil(timing.intervalMs / 2),
        attempt: 0,
        random: timing.random,
      });
  await (held === void 0 ? sleep_2(Math.min(Kt, le()), signal) : Promise.race([promise, Promise.resolve()]));
  while (!signal.aborted) {
    if (W !== void 0)
      return (
        logRemoteTools(callId, "late answer taken on the standing request", {
          heard: W.kind,
          after_misses: A,
        }),
        D({ kind: "late", transported: W })
      );
    if (C()) {
      if (((A += 1), T === 0 || A >= timing.misses)) return x();
      await Promise.race([sleep_2(le(), signal), promise]);
      continue;
    }
    ((T += 1), onAttempt?.(X));
    let j = now();
    (w?.stop(),
      (w =
        silentSince !== void 0 && A + 1 < timing.misses
          ? startStillHereProbe({
              host: host,
              since: silentSince,
              signal: signal,
              timing: silentCallTiming,
              now: now,
            })
          : void 0));
    let winner = await Promise.race([
      host.transport
        .call(toolName, {}, P, {
          signal: signal,
          deadlineMs: Math.min(timing.intervalMs, host.transport.limits.defaultDeadlineMs),
          toolUseId: callId,
        })
        .catch(() => ({ kind: "transport_error", detail: "" })),
      promise,
    ]);
    if (winner === "late" || winner.kind !== "timed_out") (w?.stop(), (w = void 0));
    if (winner === "late" || W !== void 0) continue;
    switch (winner.kind) {
      case "result": {
        let q = interpretCallOutcome(winner, dispatchEpoch),
          Q = winner.envelope === void 0 ? void 0 : hostEpochOf(winner.envelope);
        if (
          ((K = dispatchEpoch !== void 0 && Q !== void 0 && Q !== dispatchEpoch),
          q.kind === "query_turned_away")
        ) {
          ((A += 1), (R = void 0));
          break;
        }
        if (q.kind !== "still_running") return D(q);
        if (q.state === "awaiting_approval" && held === void 0) return D({ kind: "ask_lost" });
        if (((Y ||= q.state === "running"), q.state === "running")) onOutput?.(q.output);
        ((X = !0), (A = 0), (I = 0), (R = void 0), (L = void 0));
        break;
      }
      case "cancelled":
        return D({ kind: "cancelled" });
      case "host_gone":
        if (held === void 0) return D({ kind: "gone", transported: { ...winner, unsent: !1 } });
        await Promise.race([promise, sleep_2(timing.intervalMs, signal)]);
        continue;
      case "timed_out":
        ((A += 1), (R = void 0));
        break;
      case "dropped":
      case "unreachable":
      case "stalled":
      case "approval_unverified":
      case "transport_error":
        if (isUnverifiedRefusal(winner)) {
          if (((A += 1), (R = void 0), isRefusedDrop(winner))) I += 1;
          break;
        }
        if (winner.kind === "transport_error" && winner.unreadableResult === !0)
          return D({ kind: "unknown", why: "unreadable" });
        if (((R ??= now()), now() - R >= timing.unreachableBudgetMs)) return D({ kind: "unreachable" });
        break;
    }
    if (
      (logRemoteTools(callId, "check-in answered", { attempt: T, heard: winner.kind, misses: A }),
      silentSince !== void 0 && w !== void 0 && winner.kind === "timed_out")
    ) {
      let q = sleep_2(le(), signal).then(() => {
          return;
        }),
        winner = await Promise.race([
          w.done,
          q,
          promise.then(() => {
            return;
          }),
        ]);
      if (W === void 0 && !signal.aborted && !C()) {
        let Z = classifySilentCall({
          host: host,
          since: silentSince,
          probed: winner?.probed,
          checkWrittenAt: j,
          timing: silentCallTiming,
          now: now,
        });
        if (winner !== void 0 && Z.kind === "given_up")
          return (
            (L = "ended"),
            D({
              kind: "host_unresponsive",
              misses: Z.checks,
              whileRunning: held !== void 0 || Y,
              stillConnected: !1,
              intervalMs: Z.intervalMs,
            })
          );
        if (Z.kind !== "undecided" && Z.kind !== "given_up") L = winner === void 0 ? "probe_late" : Z.kind;
      }
      await Promise.race([q, promise]);
      continue;
    }
    if (A >= timing.misses) {
      if (C()) return x();
      if (I === A) return D({ kind: "unbound", misses: A, whileRunning: Y });
      let promise_2 = new Promise((Ht) => {
          signal.addEventListener("abort", () => Ht(void 0), { once: !0 });
        }),
        Q = Promise.resolve()
          .then(() => host.transport.probeLive?.({ signal: signal }))
          .catch(() => {
            return;
          }),
        Z = signal.aborted ? void 0 : await Promise.race([Q, promise_2, promise]);
      if (W !== void 0) return D({ kind: "late", transported: W });
      if (signal.aborted) return D({ kind: "cancelled" });
      return D({
        kind: "host_unresponsive",
        misses: A,
        whileRunning: held !== void 0 || Y,
        stillConnected: Z === !0,
      });
    }
    await Promise.race([sleep_2(le(), signal), promise]);
  }
  return D({ kind: "cancelled" });
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
