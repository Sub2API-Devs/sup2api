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
import { clampToMaxPageSize } from "../callResults.js";
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
import { violinFholeEnabled } from "../../../utils/sandbox/sandboxDefaultPolicy.js";

//@ chunk-ad2e1aj6.js:13890-13981 placement
function callDeadlineMs(limits, envelope) {
  return Math.min(limits.max_call_ms, envelope?.expires_in_ms ?? Number.POSITIVE_INFINITY);
}
//@ chunk-ad2e1aj6.js:13981-14690 placement
function createCallLifetime({ remainingMs, controller, leg, lifetime }) {
  let r = false;
  let i = () => controller.abort(userAbortReason("remote-cancel"));
  let y = () => controller.abort(userAbortReason("shutdown"));
  let O = () => {
    r = true;
    i();
  };
  let timer = setTimeout(O, remainingMs);
  let w = leg;
  w.addEventListener("abort", i, {
    once: true,
  });
  lifetime?.addEventListener("abort", y, {
    once: true,
  });
  if (w.aborted) i();
  if (lifetime?.aborted) y();
  let C = () => {
    clearTimeout(timer);
    w.removeEventListener("abort", i);
  };
  return {
    get timedOut() {
      return r;
    },
    shuttingDown: () => lifetime?.aborted === true,
    detachLeg: C,
    enterRunning() {
      clearTimeout(timer);
    },
    resume(P) {
      C();
      w = P.signal;
      w.addEventListener("abort", i, {
        once: true,
      });
      if (w.aborted) i();
      timer = setTimeout(O, clampToMaxPageSize(Math.max(1, P.expiresInMs - (Date.now() - P.startedAt))));
    },
    windDown() {
      clearTimeout(timer);
      timer = setTimeout(i, RESULT_RETENTION_MS);
    },
    dispose() {
      C();
      lifetime?.removeEventListener("abort", y);
    },
  };
}
//@ chunk-ad2e1aj6.js:14690-15147 placement
function joinKnownCall({ known, session, hostEpoch, callId, target, facts }) {
  let joinedRetryCall = lookupJoinedRetryCall(known, session);
  if (joinedRetryCall !== undefined) {
    facts.joinedCallId = known.summary.joinedCallId;
    return answerJoinedCall({
      session,
      joined: joinedRetryCall,
      hostEpoch,
      callId,
      target,
      facts,
    });
  }
  let O = pendingAskStatus(known, session, {
    callId,
    target,
    hostEpoch,
    facts,
  });
  if (O !== undefined) return O;
  switch (known.summary.state) {
    case "completed":
    case "failed":
      return replayKnownCall(known, callId, target, facts);
    case "received":
    case "running":
    case "asked":
      facts.answeredFromRecord = "duplicate";
      return envelopeFromRecord(target, callId, known.summary);
  }
}
//@ chunk-ad2e1aj6.js:15147-16011 placement
function lookupCallerCall({ sessions, callLog, callerKey, callId, target, facts }) {
  let y = sessions.forCaller(callerKey);
  let O = y?.calls.lookup(callId);
  if (O === undefined || isDisownedFailure(O)) {
    facts.answeredFromRecord = "unknown_call";
    facts.fromPriorEpoch = O?.priorEpoch !== undefined;
    let P = y !== undefined && !y.calls.forgotAny;
    if (O === undefined && y !== undefined) {
      y.calls.remember(callId, {
        state: "failed",
        code: DISOWNED,
      });
      if (P)
        callLog?.note({
          t: "disowned",
          caller: y.callerSessionId,
          call_id: callId,
        });
    }
    return noCallRecordText({
      target,
      callId,
      hostEpoch: P ? sessions.epoch : undefined,
    });
  }
  let hostEpoch = sessions.epoch;
  let joinedRetryCall = lookupJoinedRetryCall(O, y);
  if (joinedRetryCall !== undefined) {
    facts.joinedCallId = O.summary.joinedCallId;
    return answerJoinedCall({
      session: y,
      joined: joinedRetryCall,
      hostEpoch,
      callId,
      target,
      facts,
    });
  }
  let C = pendingAskStatus(O, y, {
    callId,
    target,
    hostEpoch,
    facts,
  });
  if (C !== undefined) return C;
  switch (O.summary.state) {
    case "completed":
    case "failed":
      return replayKnownCall(O, callId, target, facts);
    case "received":
    case "running":
    case "asked":
      facts.answeredFromRecord = "in_progress";
      return runningCallStatus(O, {
        callId,
        target,
        hostEpoch,
      });
  }
}
//@ chunk-ad2e1aj6.js:16011-16350 placement
function joinRetry({ session, joined, hostEpoch, callId, target, facts, workerEpoch }) {
  logRemoteTools(callId, "retry joined", {
    joined_call: joined.callId,
    state: joined.call.summary.state,
    worker_epoch: workerEpoch,
  });
  session.calls.remember(callId, {
    state: "failed",
    code: JOINED_RETRY,
    joinedCallId: joined.callId,
  });
  facts.joinedCallId = joined.callId;
  return answerJoinedCall({
    session,
    joined: joined.call,
    hostEpoch,
    callId,
    target,
    facts,
  });
}
//@ chunk-ad2e1aj6.js:16350-16692 placement
function answerJoinedCall({ session, joined, hostEpoch, callId, target, facts }) {
  switch (joined.summary.state) {
    case "completed":
    case "failed": {
      let y = replayKnownCall(joined, callId, target, facts);
      facts.answeredFromRecord = "joined_retry";
      return rebindEnvelopeCallId(y, callId);
    }
    case "received":
    case "running":
    case "asked":
      facts.answeredFromRecord = "joined_retry";
      return runningCallStatus(joined, {
        callId,
        target,
        hostEpoch,
        answerInHand: hasAnswerInHand(joined, session, facts),
      });
  }
}
//@ chunk-ad2e1aj6.js:16692-16894 placement
function hasAnswerInHand(e, n, facts) {
  let { summary } = e;
  if (summary.state !== "asked" || summary.askId === undefined) return false;
  let r = n?.pendingAsks.peek(summary.askId);
  if (r === undefined) return false;
  let i = facts.redeemsAskId === r.askId ? 1 : 0;
  return r.redeemingLegs > i;
}
//@ chunk-ad2e1aj6.js:16894-17272 placement
function runningCallStatus(e, { callId, target, hostEpoch, answerInHand = false }) {
  let i = violinFholeEnabled() ? e.outputSoFar?.() : undefined;
  return callStillRunningText({
    target,
    callId,
    state:
      e.summary.state === "asked"
        ? answerInHand
          ? "admitting"
          : "awaiting_approval"
        : e.summary.state === "received" || (e.summary.state === "running" && e.summary.started !== true)
          ? "admitting"
          : "running",
    sinceMs: Date.now() - e.receivedAt,
    hostEpoch,
    ...(i !== undefined && {
      outputTail: i,
    }),
  });
}
//@ chunk-ad2e1aj6.js:17272-17454 placement
function replayKnownCall(e, callId, target, facts) {
  facts.answeredFromRecord = e.result !== undefined ? "replayed" : "duplicate";
  facts.fromPriorEpoch = e.priorEpoch !== undefined;
  return markReplayed(e.result ?? envelopeFromRecord(target, callId, e.summary), e.summary.servedAt);
}
//@ chunk-ad2e1aj6.js:17454-17525 placement
function isDisownedFailure(e) {
  return e.summary.state === "failed" && e.summary.code === DISOWNED;
}
//@ chunk-ad2e1aj6.js:17525-17663 placement
function lookupJoinedRetryCall(e, n) {
  let { summary } = e;
  return summary.state === "failed" && summary.code === JOINED_RETRY && summary.joinedCallId !== undefined
    ? n?.calls.lookup(summary.joinedCallId)
    : undefined;
}
//@ chunk-ad2e1aj6.js:17663-18005 placement
function pendingAskStatus(e, n, { callId, target, hostEpoch, facts }) {
  let { summary } = e;
  if (summary.state !== "asked" || summary.askId === undefined) return;
  let O = n?.pendingAsks.peek(summary.askId);
  if (O === undefined) return;
  if (hasAnswerInHand(e, n, facts)) {
    facts.answeredFromRecord = "in_progress";
    return runningCallStatus(e, {
      callId,
      target,
      hostEpoch,
      answerInHand: true,
    });
  }
  facts.answeredFromRecord = "pending_ask";
  return rebindEnvelopeCallId(O.asked, callId);
}
export { joinKnownCall, joinRetry, callDeadlineMs, createCallLifetime, lookupCallerCall };
