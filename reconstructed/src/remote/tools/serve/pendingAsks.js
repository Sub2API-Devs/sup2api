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
  let e = new Map();
  return {
    register: (o) => void e.set(o.askId, o),
    take: (o) => {
      let r = e.get(o);
      e.delete(o);
      return r;
    },
    list: () => [...e.values()],
    peek: (o) => e.get(o),
    findByCallId: (o) => [...e.values()].findLast((r) => r.callId === o),
    get size() {
      return e.size;
    },
  };
}
//@ chunk-tr0s0d0k.js:11365-11504 placement
function takePendingAsk(e, n, o, r) {
  let s = e.pendingAsks.take(n);
  if (s === undefined) return;
  if (s.callId !== undefined) o(s.callId, s);
  s.windDown();
  s.answer(r);
  return s;
}
//@ chunk-tr0s0d0k.js:11504-11601 placement
function recordSessionDenial(e, askId, o) {
  takePendingAsk(
    e,
    askId,
    (r) =>
      e.calls.remember(r, {
        state: "failed",
        code: "denied_by_session",
      }),
    o,
  );
}
//@ chunk-tr0s0d0k.js:11601-11681 placement
function settleAskedCall(e, askId, o, r) {
  return takePendingAsk(e, askId, (s) => e.calls.settle(s, o, isSessionDenial(o)), r) !== undefined;
}
//@ chunk-tr0s0d0k.js:11681-12356 placement
function withdrawAskedCall(e, askId, o) {
  let r = takePendingAsk(
    e,
    askId,
    (s, d) =>
      e.calls.settle(
        s,
        o.retain ??
          withdrawnEnvelope({
            target: d.asked.envelope.target,
            callId: s,
            reason: o.reason,
            message: o.message,
          }),
        {
          state: "failed",
          code: "withdrawn",
          endedAs: o.reason,
          endedMessage: clipText(o.message),
        },
      ),
    askEndedDenial(o.message),
  );
  if (r !== undefined) {
    if (r.raisedOver !== "relay" && o.countedByItsLeg !== true)
      switch (o.reason) {
        case "host_unbound":
        case "host_stopped":
          logFeatureSad("remote_tool_serve", o.reason);
          break;
        case "evicted":
          logFeatureSad("remote_tool_serve", "ask_superseded");
          break;
        case "tool_withdrawn":
        case "stale_answer":
        case "replaced_by_retry":
          break;
      }
    logRemoteTools(r.callId, "ask ended", {
      ask_id: askId,
      reason: o.reason,
    });
    e.onAskEnded?.({
      callerSessionId: e.callerSessionId,
      callId: r.callId,
      askId,
      reason: o.reason,
    });
  }
}
//@ chunk-tr0s0d0k.js:12356-12366 placement
var MAX_REMEMBERED_IDS = 16;
//@ chunk-tr0s0d0k.js:12366-12949 placement
function resetCallerReadStateOnClear(e, envelope) {
  if (envelope === undefined) return;
  let conversationId = envelope.caller.conversation_id;
  if (conversationId !== undefined && !e.conversationIds.includes(conversationId)) {
    if (e.conversationIds.length > 0) {
      if (e.cwd !== undefined)
        e.directoryReset = {
          from: e.cwd,
          at: Date.now(),
        };
      e.cwd = undefined;
      e.readFileState.clear();
      e.toldOfSandbox = undefined;
      logRemoteTools(envelope.call_id, "caller conversation cleared: launch directory and read state reset");
    }
    pushBoundedId(e.conversationIds, conversationId);
  }
  let compactionId = envelope.caller.compaction_id;
  if (compactionId !== undefined && !e.compactionIds.includes(compactionId)) {
    e.readFileState.clear();
    e.toldOfSandbox = undefined;
    pushBoundedId(e.compactionIds, compactionId);
    logRemoteTools(envelope.call_id, "caller conversation compacted: read state reset");
  }
}
//@ chunk-tr0s0d0k.js:12949-13001 placement
function pushBoundedId(e, n) {
  e.push(n);
  if (e.length > MAX_REMEMBERED_IDS) e.shift();
}
//@ chunk-tr0s0d0k.js:13001-13345 placement
function newCallerSession(callerSessionId, n = {}) {
  return {
    callerSessionId,
    readFileState: createRemoteFileState(READ_FILE_STATE_CACHE_SIZE),
    toolState: new InstanceRegistry(),
    calls: ServedCallLog(n.callRecordBounds),
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
    onAskEnded: n.onAskEnded,
  };
}
//@ chunk-tr0s0d0k.js:13345-13356 placement
var MAX_CALLER_SESSIONS = 20;
//@ chunk-tr0s0d0k.js:13356-13854 placement
/**
 * 远程工具服务端的调用方会话表：每个云会话一份 readFileState、工具状态、调用记录与待答询问（有上限）。
 */
function createCallerSessions(e = {}) {
  let limit = e.limit ?? MAX_CALLER_SESSIONS;
  let o = new Map();
  let epoch = e.epoch ?? randomUUID();
  let s = (callerSessionId) => {
    let callerSession = newCallerSession(callerSessionId, {
      callRecordBounds: e.callRecordBounds,
      onAskEnded: e.onAskEnded,
    });
    for (let p of e.priorCallsFor?.(callerSessionId) ?? []) callerSession.calls.seed(p);
    o.set(callerSessionId, callerSession);
    return callerSession;
  };
  return {
    epoch,
    limit,
    peek: (d) => o.get(d),
    forCaller: (d) => o.get(d) ?? (o.size < limit ? s(d) : undefined),
    heldAsk: (d, u) => {
      let byCallId = o.get(d)?.pendingAsks.findByCallId(u);
      return byCallId === undefined
        ? undefined
        : {
            toolName: byCallId.toolName,
            evaluatedInput: byCallId.evaluatedInput,
            startCwd: byCallId.startCwd,
          };
    },
    get size() {
      return o.size;
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
