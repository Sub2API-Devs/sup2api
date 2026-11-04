/**
 * remote/tools/serve/pendingAsks.ts
 *
 * 2.1.316 新增：待答复询问登记与调用者会话
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (13)
 * attribution: placement 13
 */
import { randomUUID } from "crypto";
import { isSessionDenial, withdrawnEnvelope } from "./callStatusQuery.js";
import { clipText } from "../protocolSchemas.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { logRemoteTools } from "../../../services/remoteTools/remoteToolsDebug.js";
import { createRemoteFileState, READ_FILE_STATE_CACHE_SIZE } from "../../../utils/remoteFileState.js";
import { InstanceRegistry } from "../../../utils/instanceRegistry.js";
import { ServedCallLog } from "../servedCallLog.js";
import { ServedBackgroundCommands } from "./backgroundCommands.js";

//@ chunk-tr0s0d0k.js:10966-10997 placement
var ASK_ENDED_REASON = "remote_call_ask_ended";
//@ chunk-tr0s0d0k.js:10997-11113 placement
function askEndedDenial(message) {
  return {
    behavior: "deny",
    message,
    decisionReason: {
      type: "other",
      reason: ASK_ENDED_REASON,
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-tr0s0d0k.js:11113-11365 placement
function createPendingAskRegistry() {
  let asks = new Map();
  return {
    register: (ask) => void asks.set(ask.askId, ask),
    take: (askId) => {
      let ask = asks.get(askId);
      asks.delete(askId);
      return ask;
    },
    list: () => [...asks.values()],
    peek: (askId) => asks.get(askId),
    findByCallId: (callId) => [...asks.values()].findLast((ask) => ask.callId === callId),
    get size() {
      return asks.size;
    },
  };
}
//@ chunk-tr0s0d0k.js:11365-11504 placement
function takePendingAsk(session, askId, onSettled, denial) {
  let ask = session.pendingAsks.take(askId);
  if (ask === undefined) return;
  if (ask.callId !== undefined) onSettled(ask.callId, ask);
  ask.windDown();
  ask.answer(denial);
  return ask;
}
//@ chunk-tr0s0d0k.js:11504-11601 placement
function recordSessionDenial(session, askId, onMissing) {
  takePendingAsk(
    session,
    askId,
    (callId) =>
      session.calls.remember(callId, {
        state: "failed",
        code: "denied_by_session",
      }),
    onMissing,
  );
}
//@ chunk-tr0s0d0k.js:11601-11681 placement
function settleAskedCall(session, askId, envelope, onMissing) {
  return (
    takePendingAsk(
      session,
      askId,
      (callId) => session.calls.settle(callId, envelope, isSessionDenial(envelope)),
      onMissing,
    ) !== undefined
  );
}
//@ chunk-tr0s0d0k.js:11681-12356 placement
function withdrawAskedCall(session, askId, withdrawal) {
  let ended = takePendingAsk(
    session,
    askId,
    (callId, ask) =>
      session.calls.settle(
        callId,
        withdrawal.retain ??
          withdrawnEnvelope({
            target: ask.asked.envelope.target,
            callId,
            reason: withdrawal.reason,
            message: withdrawal.message,
          }),
        {
          state: "failed",
          code: "withdrawn",
          endedAs: withdrawal.reason,
          endedMessage: clipText(withdrawal.message),
        },
      ),
    askEndedDenial(withdrawal.message),
  );
  if (ended !== undefined) {
    if (ended.raisedOver !== "relay" && withdrawal.countedByItsLeg !== true)
      switch (withdrawal.reason) {
        case "host_unbound":
        case "host_stopped":
          logFeatureSad("remote_tool_serve", withdrawal.reason);
          break;
        case "evicted":
          logFeatureSad("remote_tool_serve", "ask_superseded");
          break;
        case "tool_withdrawn":
        case "stale_answer":
        case "replaced_by_retry":
          break;
      }
    logRemoteTools(ended.callId, "ask ended", {
      ask_id: askId,
      reason: withdrawal.reason,
    });
    session.onAskEnded?.({
      callerSessionId: session.callerSessionId,
      callId: ended.callId,
      askId,
      reason: withdrawal.reason,
    });
  }
}
//@ chunk-tr0s0d0k.js:12356-12366 placement
var MAX_REMEMBERED_IDS = 16;
//@ chunk-tr0s0d0k.js:12366-12949 placement
function resetCallerReadStateOnClear(readState, envelope) {
  if (envelope === undefined) return;
  let conversationId = envelope.caller.conversation_id;
  if (conversationId !== undefined && !readState.conversationIds.includes(conversationId)) {
    if (readState.conversationIds.length > 0) {
      if (readState.cwd !== undefined)
        readState.directoryReset = {
          from: readState.cwd,
          at: Date.now(),
        };
      readState.cwd = undefined;
      readState.readFileState.clear();
      readState.toldOfSandbox = undefined;
      logRemoteTools(envelope.call_id, "caller conversation cleared: launch directory and read state reset");
    }
    pushBoundedId(readState.conversationIds, conversationId);
  }
  let compactionId = envelope.caller.compaction_id;
  if (compactionId !== undefined && !readState.compactionIds.includes(compactionId)) {
    readState.readFileState.clear();
    readState.toldOfSandbox = undefined;
    pushBoundedId(readState.compactionIds, compactionId);
    logRemoteTools(envelope.call_id, "caller conversation compacted: read state reset");
  }
}
//@ chunk-tr0s0d0k.js:12949-13001 placement
function pushBoundedId(ids, id) {
  ids.push(id);
  if (ids.length > MAX_REMEMBERED_IDS) ids.shift();
}
//@ chunk-tr0s0d0k.js:13001-13345 placement
function newCallerSession(callerSessionId, options = {}) {
  return {
    callerSessionId,
    readFileState: createRemoteFileState(READ_FILE_STATE_CACHE_SIZE),
    toolState: new InstanceRegistry(),
    calls: ServedCallLog(options.callRecordBounds),
    pendingAsks: createPendingAskRegistry(),
    backgroundShells: new ServedBackgroundCommands(),
    sessionPermissionUpdates: [],
    offeredStandingUpdates: [],
    cwd: undefined,
    directoryReset: undefined,
    conversationIds: [],
    compactionIds: [],
    toldOfSandbox: undefined,
    createdAt: Date.now(),
    onAskEnded: options.onAskEnded,
  };
}
//@ chunk-tr0s0d0k.js:13345-13356 placement
var MAX_CALLER_SESSIONS = 20;
//@ chunk-tr0s0d0k.js:13356-13854 placement
/**
 * 远程工具服务端的调用方会话表：每个云会话一份 readFileState、工具状态、调用记录与待答询问（有上限）。
 */
function createCallerSessions(options = {}) {
  let limit = options.limit ?? MAX_CALLER_SESSIONS;
  let byCallerId = new Map();
  let epoch = options.epoch ?? randomUUID();
  let createCaller = (callerSessionId) => {
    let callerSession = newCallerSession(callerSessionId, {
      callRecordBounds: options.callRecordBounds,
      onAskEnded: options.onAskEnded,
    });
    for (let priorCall of options.priorCallsFor?.(callerSessionId) ?? []) callerSession.calls.seed(priorCall);
    byCallerId.set(callerSessionId, callerSession);
    return callerSession;
  };
  return {
    epoch,
    limit,
    peek: (callerSessionId) => byCallerId.get(callerSessionId),
    forCaller: (callerSessionId) =>
      byCallerId.get(callerSessionId) ??
      (byCallerId.size < limit ? createCaller(callerSessionId) : undefined),
    heldAsk: (callerSessionId, callId) => {
      let byCallId = byCallerId.get(callerSessionId)?.pendingAsks.findByCallId(callId);
      return byCallId === undefined
        ? undefined
        : {
            toolName: byCallId.toolName,
            evaluatedInput: byCallId.evaluatedInput,
            startCwd: byCallId.startCwd,
          };
    },
    get size() {
      return byCallerId.size;
    },
  };
}
export {
  withdrawAskedCall,
  resetCallerReadStateOnClear,
  recordSessionDenial,
  settleAskedCall,
  askEndedDenial,
  MAX_CALLER_SESSIONS,
  createCallerSessions,
  ASK_ENDED_REASON,
};
