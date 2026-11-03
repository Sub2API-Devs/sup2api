/**
 * remote/tools/serve/callLedger.ts
 *
 * 2.1.316 新增：服务端调用账本（调用者调用查找、生命周期、加入已知调用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad2e1aj6.js (12)
 * attribution: placement 12
 */
import { userAbortReason } from "../../../utils/abortController.js";
import { AJ } from "../callResults.js";
import { RESULT_RETENTION_MS } from "./servingPolicy.js";
import {
  envelopeFromRecord,
  noCallRecordText,
  rebindEnvelopeCallId,
  callStillRunningText,
  markReplayed,
} from "./callStatusQuery.js";
import { DISOWNED, JOINED_RETRY } from "../servedCallLog.js";
import { logRemoteTools } from "../../../services/remoteTools/remoteToolsDebug.js";
import { Aye } from "../../../utils/sandbox/sandboxDefaultPolicy.js";

//@ chunk-ad2e1aj6.js:13890-13981 placement
function callDeadlineMs(e, n) {
  return Math.min(e.max_call_ms, n?.expires_in_ms ?? Number.POSITIVE_INFINITY);
}
//@ chunk-ad2e1aj6.js:13981-14690 placement
function createCallLifetime({
  remainingMs: remainingMs,
  controller: controller,
  leg: leg,
  lifetime: lifetime,
}) {
  let r = !1,
    i = () => controller.abort(userAbortReason("remote-cancel")),
    y = () => controller.abort(userAbortReason("shutdown")),
    O = () => {
      ((r = !0), i());
    },
    R = setTimeout(O, remainingMs),
    w = leg;
  if (
    (w.addEventListener("abort", i, { once: !0 }),
    lifetime?.addEventListener("abort", y, { once: !0 }),
    w.aborted)
  )
    i();
  if (lifetime?.aborted) y();
  let C = () => {
    (clearTimeout(R), w.removeEventListener("abort", i));
  };
  return {
    get timedOut() {
      return r;
    },
    shuttingDown: () => lifetime?.aborted === !0,
    detachLeg: C,
    enterRunning() {
      clearTimeout(R);
    },
    resume(P) {
      if ((C(), (w = P.signal), w.addEventListener("abort", i, { once: !0 }), w.aborted)) i();
      R = setTimeout(O, AJ(Math.max(1, P.expiresInMs - (Date.now() - P.startedAt))));
    },
    windDown() {
      (clearTimeout(R), (R = setTimeout(i, RESULT_RETENTION_MS)));
    },
    dispose() {
      (C(), lifetime?.removeEventListener("abort", y));
    },
  };
}
//@ chunk-ad2e1aj6.js:14690-15147 placement
function joinKnownCall({
  known: known,
  session: session,
  hostEpoch: hostEpoch,
  callId: callId,
  target: target,
  facts: facts,
}) {
  let y = lookupJoinedRetryCall(known, session);
  if (y !== void 0)
    return (
      (facts.joinedCallId = known.summary.joinedCallId),
      answerJoinedCall({
        session: session,
        joined: y,
        hostEpoch: hostEpoch,
        callId: callId,
        target: target,
        facts: facts,
      })
    );
  let O = pendingAskStatus(known, session, {
    callId: callId,
    target: target,
    hostEpoch: hostEpoch,
    facts: facts,
  });
  if (O !== void 0) return O;
  switch (known.summary.state) {
    case "completed":
    case "failed":
      return replayKnownCall(known, callId, target, facts);
    case "received":
    case "running":
    case "asked":
      return ((facts.answeredFromRecord = "duplicate"), envelopeFromRecord(target, callId, known.summary));
  }
}
//@ chunk-ad2e1aj6.js:15147-16011 placement
function lookupCallerCall({
  sessions: sessions,
  callLog: callLog,
  callerKey: callerKey,
  callId: callId,
  target: target,
  facts: facts,
}) {
  let forCaller = sessions.forCaller(callerKey),
    O = forCaller?.calls.lookup(callId);
  if (O === void 0 || kr(O)) {
    ((facts.answeredFromRecord = "unknown_call"), (facts.fromPriorEpoch = O?.priorEpoch !== void 0));
    let P = forCaller !== void 0 && !forCaller.calls.forgotAny;
    if (O === void 0 && forCaller !== void 0) {
      if ((forCaller.calls.remember(callId, { state: "failed", code: DISOWNED }), P))
        callLog?.note({ t: "disowned", caller: forCaller.callerSessionId, call_id: callId });
    }
    return noCallRecordText({ target: target, callId: callId, hostEpoch: P ? sessions.epoch : void 0 });
  }
  let epoch = sessions.epoch,
    w = lookupJoinedRetryCall(O, forCaller);
  if (w !== void 0)
    return (
      (facts.joinedCallId = O.summary.joinedCallId),
      answerJoinedCall({
        session: forCaller,
        joined: w,
        hostEpoch: epoch,
        callId: callId,
        target: target,
        facts: facts,
      })
    );
  let C = pendingAskStatus(O, forCaller, { callId: callId, target: target, hostEpoch: epoch, facts: facts });
  if (C !== void 0) return C;
  switch (O.summary.state) {
    case "completed":
    case "failed":
      return replayKnownCall(O, callId, target, facts);
    case "received":
    case "running":
    case "asked":
      return (
        (facts.answeredFromRecord = "in_progress"),
        runningCallStatus(O, { callId: callId, target: target, hostEpoch: epoch })
      );
  }
}
//@ chunk-ad2e1aj6.js:16011-16350 placement
function joinRetry({
  session: session,
  joined: joined,
  hostEpoch: hostEpoch,
  callId: callId,
  target: target,
  facts: facts,
  workerEpoch: workerEpoch,
}) {
  return (
    logRemoteTools(callId, "retry joined", {
      joined_call: joined.callId,
      state: joined.call.summary.state,
      worker_epoch: workerEpoch,
    }),
    session.calls.remember(callId, { state: "failed", code: JOINED_RETRY, joinedCallId: joined.callId }),
    (facts.joinedCallId = joined.callId),
    answerJoinedCall({
      session: session,
      joined: joined.call,
      hostEpoch: hostEpoch,
      callId: callId,
      target: target,
      facts: facts,
    })
  );
}
//@ chunk-ad2e1aj6.js:16350-16692 placement
function answerJoinedCall({
  session: session,
  joined: joined,
  hostEpoch: hostEpoch,
  callId: callId,
  target: target,
  facts: facts,
}) {
  switch (joined.summary.state) {
    case "completed":
    case "failed": {
      let y = replayKnownCall(joined, callId, target, facts);
      return ((facts.answeredFromRecord = "joined_retry"), rebindEnvelopeCallId(y, callId));
    }
    case "received":
    case "running":
    case "asked":
      return (
        (facts.answeredFromRecord = "joined_retry"),
        runningCallStatus(joined, {
          callId: callId,
          target: target,
          hostEpoch: hostEpoch,
          answerInHand: hasAnswerInHand(joined, session, facts),
        })
      );
  }
}
//@ chunk-ad2e1aj6.js:16692-16894 placement
function hasAnswerInHand(e, n, s) {
  let { summary: summary } = e;
  if (summary.state !== "asked" || summary.askId === void 0) return !1;
  let r = n?.pendingAsks.peek(summary.askId);
  if (r === void 0) return !1;
  let i = s.redeemsAskId === r.askId ? 1 : 0;
  return r.redeemingLegs > i;
}
//@ chunk-ad2e1aj6.js:16894-17272 placement
function runningCallStatus(
  e,
  { callId: callId, target: target, hostEpoch: hostEpoch, answerInHand: answerInHand = !1 },
) {
  let i = Aye() ? e.outputSoFar?.() : void 0;
  return callStillRunningText({
    target: target,
    callId: callId,
    state:
      e.summary.state === "asked"
        ? answerInHand
          ? "admitting"
          : "awaiting_approval"
        : e.summary.state === "received" || (e.summary.state === "running" && e.summary.started !== !0)
          ? "admitting"
          : "running",
    sinceMs: Date.now() - e.receivedAt,
    hostEpoch: hostEpoch,
    ...(i !== void 0 && { outputTail: i }),
  });
}
//@ chunk-ad2e1aj6.js:17272-17454 placement
function replayKnownCall(e, n, s, h) {
  return (
    (h.answeredFromRecord = e.result !== void 0 ? "replayed" : "duplicate"),
    (h.fromPriorEpoch = e.priorEpoch !== void 0),
    markReplayed(e.result ?? envelopeFromRecord(s, n, e.summary), e.summary.servedAt)
  );
}
//@ chunk-ad2e1aj6.js:17454-17525 placement
function kr(e) {
  return e.summary.state === "failed" && e.summary.code === DISOWNED;
}
//@ chunk-ad2e1aj6.js:17525-17663 placement
function lookupJoinedRetryCall(e, n) {
  let { summary: summary } = e;
  return summary.state === "failed" && summary.code === JOINED_RETRY && summary.joinedCallId !== void 0
    ? n?.calls.lookup(summary.joinedCallId)
    : void 0;
}
//@ chunk-ad2e1aj6.js:17663-18005 placement
function pendingAskStatus(e, n, { callId: callId, target: target, hostEpoch: hostEpoch, facts: facts }) {
  let { summary: summary } = e;
  if (summary.state !== "asked" || summary.askId === void 0) return;
  let O = n?.pendingAsks.peek(summary.askId);
  if (O === void 0) return;
  if (hasAnswerInHand(e, n, facts))
    return (
      (facts.answeredFromRecord = "in_progress"),
      runningCallStatus(e, { callId: callId, target: target, hostEpoch: hostEpoch, answerInHand: !0 })
    );
  return ((facts.answeredFromRecord = "pending_ask"), rebindEnvelopeCallId(O.asked, callId));
}

export { joinKnownCall, joinRetry, callDeadlineMs, createCallLifetime, lookupCallerCall };
