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
import { nv, ZC } from "../../../utils/remoteFileState.js";
import { InstanceRegistry } from "../../../utils/instanceRegistry.js";
import { ServedCallLog } from "../servedCallLog.js";
import { ServedBackgroundCommands } from "./backgroundCommands.js";

//@ chunk-tr0s0d0k.js:10966-10997 placement
var ASK_ENDED_REASON = "remote_call_ask_ended";
//@ chunk-tr0s0d0k.js:10997-11113 placement
function askEndedDenial(e) {
  return {
    behavior: "deny",
    message: e,
    decisionReason: { type: "other", reason: ASK_ENDED_REASON },
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
      return (e.delete(o), r);
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
  let take = e.pendingAsks.take(n);
  if (take === void 0) return;
  if (take.callId !== void 0) o(take.callId, take);
  return (take.windDown(), take.answer(r), take);
}
//@ chunk-tr0s0d0k.js:11504-11601 placement
function recordSessionDenial(e, n, o) {
  takePendingAsk(e, n, (r) => e.calls.remember(r, { state: "failed", code: "denied_by_session" }), o);
}
//@ chunk-tr0s0d0k.js:11601-11681 placement
function settleAskedCall(e, n, o, r) {
  return takePendingAsk(e, n, (s) => e.calls.settle(s, o, isSessionDenial(o)), r) !== void 0;
}
//@ chunk-tr0s0d0k.js:11681-12356 placement
function withdrawAskedCall(e, n, o) {
  let r = takePendingAsk(
    e,
    n,
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
        { state: "failed", code: "withdrawn", endedAs: o.reason, endedMessage: clipText(o.message) },
      ),
    askEndedDenial(o.message),
  );
  if (r !== void 0) {
    if (r.raisedOver !== "relay" && o.countedByItsLeg !== !0)
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
    (logRemoteTools(r.callId, "ask ended", { ask_id: n, reason: o.reason }),
      e.onAskEnded?.({ callerSessionId: e.callerSessionId, callId: r.callId, askId: n, reason: o.reason }));
  }
}
//@ chunk-tr0s0d0k.js:12356-12366 placement
var Lo = 16;
//@ chunk-tr0s0d0k.js:12366-12949 placement
function resetCallerReadStateOnClear(e, n) {
  if (n === void 0) return;
  let conversation_id = n.caller.conversation_id;
  if (conversation_id !== void 0 && !e.conversationIds.includes(conversation_id)) {
    if (e.conversationIds.length > 0) {
      if (e.cwd !== void 0) e.directoryReset = { from: e.cwd, at: Date.now() };
      ((e.cwd = void 0),
        e.readFileState.clear(),
        (e.toldOfSandbox = void 0),
        logRemoteTools(n.call_id, "caller conversation cleared: launch directory and read state reset"));
    }
    xn(e.conversationIds, conversation_id);
  }
  let compaction_id = n.caller.compaction_id;
  if (compaction_id !== void 0 && !e.compactionIds.includes(compaction_id))
    (e.readFileState.clear(),
      (e.toldOfSandbox = void 0),
      xn(e.compactionIds, compaction_id),
      logRemoteTools(n.call_id, "caller conversation compacted: read state reset"));
}
//@ chunk-tr0s0d0k.js:12949-13001 placement
function xn(e, n) {
  if ((e.push(n), e.length > Lo)) e.shift();
}
//@ chunk-tr0s0d0k.js:13001-13345 placement
function newCallerSession(e, n = {}) {
  return {
    callerSessionId: e,
    readFileState: nv(ZC),
    toolState: new InstanceRegistry(),
    calls: ServedCallLog(n.callRecordBounds),
    pendingAsks: createPendingAskRegistry(),
    backgroundShells: new ServedBackgroundCommands(),
    sessionPermissionUpdates: [],
    offeredStandingUpdates: [],
    cwd: void 0,
    directoryReset: void 0,
    conversationIds: [],
    compactionIds: [],
    toldOfSandbox: void 0,
    createdAt: Date.now(),
    onAskEnded: n.onAskEnded,
  };
}
//@ chunk-tr0s0d0k.js:13345-13356 placement
var MAX_CALLER_SESSIONS = 20;
/**
 * 远程工具服务端的调用方会话表：每个云会话一份 readFileState、工具状态、调用记录与待答询问（有上限）。
 */
//@ chunk-tr0s0d0k.js:13356-13854 placement
function createCallerSessions(e = {}) {
  let n = e.limit ?? MAX_CALLER_SESSIONS,
    o = new Map(),
    r = e.epoch ?? randomUUID(),
    s = (d) => {
      let u = newCallerSession(d, { callRecordBounds: e.callRecordBounds, onAskEnded: e.onAskEnded });
      for (let p of e.priorCallsFor?.(d) ?? []) u.calls.seed(p);
      return (o.set(d, u), u);
    };
  return {
    epoch: r,
    limit: n,
    peek: (d) => o.get(d),
    forCaller: (d) => o.get(d) ?? (o.size < n ? s(d) : void 0),
    heldAsk: (d, u) => {
      let p = o.get(d)?.pendingAsks.findByCallId(u);
      return p === void 0
        ? void 0
        : { toolName: p.toolName, evaluatedInput: p.evaluatedInput, startCwd: p.startCwd };
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
