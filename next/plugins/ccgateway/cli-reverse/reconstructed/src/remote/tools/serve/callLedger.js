/**
 * remote/tools/serve/callLedger.ts
 *
 * 2.1.316 新增：服务端调用账本（调用者调用查找、生命周期、加入已知调用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nvm0wye1.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-nvm0wye1.js:14236-14327 placement
function callDeadlineMs(limits, envelope) {
  return Math.min(limits.max_call_ms, envelope?.expires_in_ms ?? Number.POSITIVE_INFINITY);
}
//@ chunk-nvm0wye1.js:14327-15036 placement
function createCallLifetime({ remainingMs, controller, leg, lifetime }) {
  let timedOut = false;
  let abortOnCancel = () => controller.abort(userAbortReason("remote-cancel"));
  let abortOnShutdown = () => controller.abort(userAbortReason("shutdown"));
  let onTimeout = () => {
    timedOut = true;
    abortOnCancel();
  };
  let timer = setTimeout(onTimeout, remainingMs);
  let legSignal = leg;
  legSignal.addEventListener("abort", abortOnCancel, {
    once: true,
  });
  lifetime?.addEventListener("abort", abortOnShutdown, {
    once: true,
  });
  if (legSignal.aborted) abortOnCancel();
  if (lifetime?.aborted) abortOnShutdown();
  let detachLeg = () => {
    clearTimeout(timer);
    legSignal.removeEventListener("abort", abortOnCancel);
  };
  return {
    get timedOut() {
      return timedOut;
    },
    shuttingDown: () => lifetime?.aborted === true,
    detachLeg,
    enterRunning() {
      clearTimeout(timer);
    },
    resume(nextLeg) {
      detachLeg();
      legSignal = nextLeg.signal;
      legSignal.addEventListener("abort", abortOnCancel, {
        once: true,
      });
      if (legSignal.aborted) abortOnCancel();
      timer = setTimeout(
        onTimeout,
        clampToMaxPageSize(Math.max(1, nextLeg.expiresInMs - (Date.now() - nextLeg.startedAt))),
      );
    },
    windDown() {
      clearTimeout(timer);
      timer = setTimeout(abortOnCancel, RESULT_RETENTION_MS);
    },
    dispose() {
      detachLeg();
      lifetime?.removeEventListener("abort", abortOnShutdown);
    },
  };
}
//@ chunk-nvm0wye1.js:15036-15493 placement
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
  let askStatus = pendingAskStatus(known, session, {
    callId,
    target,
    hostEpoch,
    facts,
  });
  if (askStatus !== undefined) return askStatus;
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
//@ chunk-nvm0wye1.js:15493-16357 placement
function lookupCallerCall({ sessions, callLog, callerKey, callId, target, facts }) {
  let session = sessions.forCaller(callerKey);
  let call = session?.calls.lookup(callId);
  if (call === undefined || isDisownedFailure(call)) {
    facts.answeredFromRecord = "unknown_call";
    facts.fromPriorEpoch = call?.priorEpoch !== undefined;
    let hasEpoch = session !== undefined && !session.calls.forgotAny;
    if (call === undefined && session !== undefined) {
      session.calls.remember(callId, {
        state: "failed",
        code: DISOWNED,
      });
      if (hasEpoch)
        callLog?.note({
          t: "disowned",
          caller: session.callerSessionId,
          call_id: callId,
        });
    }
    return noCallRecordText({
      target,
      callId,
      hostEpoch: hasEpoch ? sessions.epoch : undefined,
    });
  }
  let hostEpoch = sessions.epoch;
  let joinedRetryCall = lookupJoinedRetryCall(call, session);
  if (joinedRetryCall !== undefined) {
    facts.joinedCallId = call.summary.joinedCallId;
    return answerJoinedCall({
      session,
      joined: joinedRetryCall,
      hostEpoch,
      callId,
      target,
      facts,
    });
  }
  let joined = pendingAskStatus(call, session, {
    callId,
    target,
    hostEpoch,
    facts,
  });
  if (joined !== undefined) return joined;
  switch (call.summary.state) {
    case "completed":
    case "failed":
      return replayKnownCall(call, callId, target, facts);
    case "received":
    case "running":
    case "asked":
      facts.answeredFromRecord = "in_progress";
      return runningCallStatus(call, {
        callId,
        target,
        hostEpoch,
      });
  }
}
//@ chunk-nvm0wye1.js:16357-16696 placement
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
//@ chunk-nvm0wye1.js:16696-17038 placement
function answerJoinedCall({ session, joined, hostEpoch, callId, target, facts }) {
  switch (joined.summary.state) {
    case "completed":
    case "failed": {
      let replayedEnvelope = replayKnownCall(joined, callId, target, facts);
      facts.answeredFromRecord = "joined_retry";
      return rebindEnvelopeCallId(replayedEnvelope, callId);
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
//@ chunk-nvm0wye1.js:17038-17240 placement
function hasAnswerInHand(known, session, facts) {
  let { summary } = known;
  if (summary.state !== "asked" || summary.askId === undefined) return false;
  let pendingAsk = session?.pendingAsks.peek(summary.askId);
  if (pendingAsk === undefined) return false;
  let answeredLegs = facts.redeemsAskId === pendingAsk.askId ? 1 : 0;
  return pendingAsk.redeemingLegs > answeredLegs;
}
//@ chunk-nvm0wye1.js:17240-17618 placement
function runningCallStatus(known, { callId, target, hostEpoch, answerInHand = false }) {
  let replayed = violinFholeEnabled() ? known.outputSoFar?.() : undefined;
  return callStillRunningText({
    target,
    callId,
    state:
      known.summary.state === "asked"
        ? answerInHand
          ? "admitting"
          : "awaiting_approval"
        : known.summary.state === "received" ||
            (known.summary.state === "running" && known.summary.started !== true)
          ? "admitting"
          : "running",
    sinceMs: Date.now() - known.receivedAt,
    hostEpoch,
    ...(replayed !== undefined && {
      outputTail: replayed,
    }),
  });
}
//@ chunk-nvm0wye1.js:17618-17800 placement
function replayKnownCall(known, callId, target, facts) {
  facts.answeredFromRecord = known.result !== undefined ? "replayed" : "duplicate";
  facts.fromPriorEpoch = known.priorEpoch !== undefined;
  return markReplayed(
    known.result ?? envelopeFromRecord(target, callId, known.summary),
    known.summary.servedAt,
  );
}
//@ chunk-nvm0wye1.js:17800-17871 placement
function isDisownedFailure(record) {
  return record.summary.state === "failed" && record.summary.code === DISOWNED;
}
//@ chunk-nvm0wye1.js:17871-18009 placement
function lookupJoinedRetryCall(record, session) {
  let { summary } = record;
  return summary.state === "failed" && summary.code === JOINED_RETRY && summary.joinedCallId !== undefined
    ? session?.calls.lookup(summary.joinedCallId)
    : undefined;
}
//@ chunk-nvm0wye1.js:18009-18351 placement
function pendingAskStatus(known, session, { callId, target, hostEpoch, facts }) {
  let { summary } = known;
  if (summary.state !== "asked" || summary.askId === undefined) return;
  let pendingAsk = session?.pendingAsks.peek(summary.askId);
  if (pendingAsk === undefined) return;
  if (hasAnswerInHand(known, session, facts)) {
    facts.answeredFromRecord = "in_progress";
    return runningCallStatus(known, {
      callId,
      target,
      hostEpoch,
      answerInHand: true,
    });
  }
  facts.answeredFromRecord = "pending_ask";
  return rebindEnvelopeCallId(pendingAsk.asked, callId);
}
export { joinKnownCall, joinRetry, callDeadlineMs, createCallLifetime, lookupCallerCall };
