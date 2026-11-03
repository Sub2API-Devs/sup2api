/**
 * cli/remoteIO/servedCalls.ts
 *
 * 2.1.316 新增。云 worker 代客户端执行调用（served call）的分发与拒绝原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4g2ta8k.js (22)
 * attribution: placement 22
 */
import { UI_DETACH } from "./deviceAttestation.js";
import { SENDER_BELOW_FLOOR } from "../../remote/tools/protocolSchemas.js";
import { readCallResult } from "../../remote/tools/toolDescriptors.js";
import { buildRemoteToolCallResult } from "../../remote/tools/callResults.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../../remote/tools/protocolConstants.js";
import { Bgt } from "../sdkMcpManifests.js";
import { isOwnOutboundRequestId, isKnownControlRequestId } from "../../bridge/attestationGate.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";

//@ chunk-z4g2ta8k.js:36667-36696 placement
var VIA_SESSION_CHANNEL = "via_session_channel";
//@ chunk-z4g2ta8k.js:36696-36712 placement
function fn(e) {}
//@ chunk-z4g2ta8k.js:36712-36781 placement
function pn(e, n) {
  let r = Re(e.request) ?? {};
  e.request = { ...r, settings: n };
}
//@ chunk-z4g2ta8k.js:36781-36941 placement
function rewriteAsControlRequest(e, { requestId: requestId, subtype: subtype, eventId: eventId }) {
  for (let h of Object.keys(e)) delete e[h];
  ((e.type = "control_request"),
    (e.request_id = requestId),
    (e.request = { subtype: subtype }),
    (e.uuid = eventId));
}
//@ chunk-z4g2ta8k.js:36941-37115 placement
function rewriteAsUiDetachRequest(e, { requestId: requestId, clientId: clientId, eventId: eventId }) {
  for (let h of Object.keys(e)) delete e[h];
  ((e.type = "control_request"),
    (e.request_id = requestId),
    (e.request = { subtype: UI_DETACH, client_id: clientId }),
    (e.uuid = eventId));
}
//@ chunk-z4g2ta8k.js:37115-37207 placement
function yn(e, n, r) {
  e.response = { subtype: "success", request_id: n, response: { result: r, [SENDER_BELOW_FLOOR]: !0 } };
}
//@ chunk-z4g2ta8k.js:37207-37393 placement
function unverifiedRefusalMessage(e) {
  return `reported refused \u2014 ${e} \u2014 by a sender this session could not verify; whether anything ran there is not confirmed. Check its effect before re-running it.`;
}
//@ chunk-z4g2ta8k.js:37393-39224 placement
var SERVED_CALL_REFUSALS = {
    no_approval:
      "reported refused \u2014 no person's approval matching this call was found \u2014 by a sender this session could not verify; whether anything ran there is not confirmed. Ask the user to approve it again if it is still wanted.",
    unbound: unverifiedRefusalMessage("this session is not bound to that machine"),
    unsupported_protocol: unverifiedRefusalMessage("the call's protocol version was not accepted"),
    invalid_request: unverifiedRefusalMessage("the call was not acceptable as sent"),
    not_served: unverifiedRefusalMessage("that machine does not serve this tool to the session"),
    no_session: unverifiedRefusalMessage("that machine could not tell which session the call came from"),
    session_mismatch: unverifiedRefusalMessage("that machine is connected on behalf of a different session"),
    too_many_in_flight: unverifiedRefusalMessage(
      "that machine already has as many calls under way, or keeps state for as many cloud sessions, as it accepts",
    ),
    refused_field: unverifiedRefusalMessage("one of the call's input fields is not accepted on that machine"),
    sandbox_unavailable: unverifiedRefusalMessage(
      "that machine serves no tools while its sandbox is off or not fully confining",
    ),
    unknown_call: unverifiedRefusalMessage("that machine has no record of the call asked about"),
    stale: unverifiedRefusalMessage(
      "the call, or the answer to its permission question, reached that machine after its delivery window",
    ),
    unattested_request: unverifiedRefusalMessage("the call arrived without a valid device signature"),
    queue_full: unverifiedRefusalMessage("that machine was at one of its capacity limits"),
    rate_limited: unverifiedRefusalMessage("that machine's call budget for this session was spent"),
    duplicate_call: unverifiedRefusalMessage("that machine had already received a call with this id"),
    withdrawn: unverifiedRefusalMessage(
      "the permission request the call was waiting on there ended unanswered",
    ),
    result_lost: unverifiedRefusalMessage("that machine no longer holds the result of the call"),
    unrecognized:
      "reported refused, without a reason this session recognises, by a sender this session could not verify; whether anything ran there is not confirmed. Check its effect before re-running it.",
  },
  UNVERIFIED_SENDER = "unverified-sender";
/**
 * 从 control_response 里读出 served call 的结果信封，若对方报告 refused，就改写成"未验证发送方"的拒绝结果（用固定话术，保留 call_id 与 code）。
 */
//@ chunk-z4g2ta8k.js:39224-39635 placement
function unverifiedRefusalResult(e) {
  let n = Re(e.response),
    r = Re(n?.response);
  if (n?.subtype !== "success" || r === void 0) return;
  let s;
  try {
    s = readCallResult(r.result);
  } catch {
    return;
  }
  if (s.envelope.status !== "present" || s.envelope.envelope.outcome !== "refused") return;
  let envelope = s.envelope.envelope,
    y = SERVED_CALL_REFUSALS[envelope.code];
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      ...(envelope.call_id !== void 0 && { call_id: envelope.call_id }),
      target: { name: UNVERIFIED_SENDER, working_dir: "" },
      code: envelope.code,
      message: y,
    },
    content: y,
  });
}
//@ chunk-z4g2ta8k.js:39635-39715 placement
function Re(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e) ? e : void 0;
}
//@ chunk-z4g2ta8k.js:39715-39728 placement
var gn = 60000;
//@ chunk-z4g2ta8k.js:39728-39742 placement
var Sn = Bgt - gn;
/**
 * 租约续期调度器：stated(到期时刻) 记录新租约，按到期前的提前量安排 renew，仍需要时续期一次、不需要或已续过时 lapse；stop 取消定时器。
 */
//@ chunk-z4g2ta8k.js:39742-40104 placement
function createLeaseRenewer(e) {
  let n,
    r = !1,
    s;
  function h() {
    (s?.(), (s = void 0));
  }
  function y() {
    h();
    let k = n;
    if (k === void 0) return;
    let P = r ? Bgt : Sn,
      O = k + P - e.readNow();
    if (O > 0) {
      s = e.schedule(y, Math.min(O, P));
      return;
    }
    let isWanted = e.isWanted(),
      x = k + Bgt - e.readNow();
    if (r || (!isWanted && x <= 0)) {
      e.lapse();
      return;
    }
    if (((s = e.schedule(y, Math.max(x, 0))), isWanted)) ((r = !0), e.renew());
  }
  function S(k) {
    ((n = k), (r = !1), y());
  }
  return { stated: S, review: y, stop: h };
}
//@ chunk-z4g2ta8k.js:40104-40116 placement
var vn = 2000;
//@ chunk-z4g2ta8k.js:40116-40142 placement
var lt = /^[\w.:-]{1,128}$/;
//@ chunk-z4g2ta8k.js:40142-40152 placement
var kn = 64;
//@ chunk-z4g2ta8k.js:40152-40165 placement
var ct = 60000;
//@ chunk-z4g2ta8k.js:40165-40175 placement
var bn = 30;
/**
 * 在 Map 中设置键值并移到最新位置，超出容量时淘汰最早的条目。
 */
//@ chunk-z4g2ta8k.js:40175-40282 placement
function setBoundedRecent(e, n, r) {
  (e.delete(n[0]), e.set(n[0], n[1]));
  for (let s of e.keys()) {
    if (e.size <= r) break;
    e.delete(s);
  }
}
//@ chunk-z4g2ta8k.js:40282-41614 placement
function servedCallDispatcher(e) {
  let n = new Map(),
    r = new Map(),
    s = new Map(),
    h = 0,
    y = 0;
  function S() {
    let now = e.readNow();
    if (now - h >= ct) ((h = now), (y = 0));
    if (y >= bn) return !1;
    return ((y += 1), !0);
  }
  function k(M) {
    let { requestId: requestId, frame: frame } = M;
    if (typeof requestId !== "string") return !0;
    let z = isOwnOutboundRequestId(requestId) || e.isAwaited(requestId),
      G = r.has(requestId) || isKnownControlRequestId(requestId),
      L = r.get(requestId)?.admitter ?? n.get(requestId);
    return z || (G && (frame === void 0 || L !== frame));
  }
  function P(M, T) {
    let q = T === void 0 ? void 0 : s.get(T),
      z = q !== void 0 && q.requestId === M && e.readNow() - q.keptAtMs < ct;
    if (T !== void 0 && q !== void 0) s.delete(T);
    return z;
  }
  let O = (M) => typeof M.requestId === "string" && lt.test(M.requestId) && !k(M) && S();
  function A(M) {
    if (!(typeof M.requestId === "string" && lt.test(M.requestId))) return;
    let q = r.get(M.requestId),
      z = !M.wasSeen && q === void 0;
    r.set(M.requestId, {
      admitter: q?.admitter ?? (z ? M.frame : n.get(M.requestId)),
      pending: (q?.pending ?? 0) + 1,
    });
  }
  function x(M) {
    let T = typeof M === "string" ? r.get(M) : void 0;
    if (!(typeof M === "string" && T !== void 0)) return;
    if (T.pending > 1) {
      r.set(M, { ...T, pending: T.pending - 1 });
      return;
    }
    if ((r.delete(M), T.admitter !== void 0)) setBoundedRecent(n, [M, T.admitter], vn);
  }
  function U(M, T) {
    if (typeof M.requestId !== "string") return !1;
    if (T === "loop" && P(M.requestId, M.frame)) return !k(M);
    let z = O(M);
    if (z && T === "filter" && M.frame !== void 0)
      setBoundedRecent(s, [M.frame, { requestId: M.requestId, keptAtMs: e.readNow() }], kn);
    if (!z && T === "loop" && M.frame !== void 0) x(M.requestId);
    return z;
  }
  return { admitted: A, settled: x, answers: U, charges: O };
}
//@ chunk-z4g2ta8k.js:41614-41678 placement
var z1n = 21600000,
  IN_PROCESS_TEAMMATE = "in_process_teammate",
  POST_TURN_MEMORY = "post_turn_memory";
//@ chunk-z4g2ta8k.js:41678-42463 placement
class TaskEventMirror {
  live = new Set();
  startedAt;
  note(e, n) {
    if (e.type !== "system") return;
    switch (e.subtype) {
      case "task_started":
        if (e.task_type !== IN_PROCESS_TEAMMATE && e.task_type !== POST_TURN_MEMORY) this.add(e.task_id, n);
        return;
      case "task_notification":
        this.remove(e.task_id);
        return;
      case "task_updated": {
        let r = e.patch?.status;
        if (r !== void 0 && isTerminalTaskStatus(r)) this.remove(e.task_id);
        return;
      }
      case "background_tasks_changed":
        if (Array.isArray(e.tasks)) {
          this.drop();
          for (let task of e.tasks)
            if (task?.task_type !== IN_PROCESS_TEAMMATE && task?.task_type !== POST_TURN_MEMORY)
              this.add(task?.task_id, n);
        }
        return;
      default:
        return;
    }
  }
  since() {
    return this.startedAt;
  }
  add(e, n) {
    if (typeof e !== "string" || e === "") return;
    if (this.startedAt !== void 0 && n >= this.startedAt + z1n) this.drop();
    ((this.startedAt ??= n), this.live.add(e));
  }
  remove(e) {
    if ((this.live.delete(e), this.live.size === 0)) this.drop();
  }
  drop() {
    (this.live.clear(), (this.startedAt = void 0));
  }
}

export {
  z1n,
  setBoundedRecent,
  Re,
  unverifiedRefusalResult,
  VIA_SESSION_CHANNEL,
  servedCallDispatcher,
  createLeaseRenewer,
  TaskEventMirror,
  fn,
  rewriteAsUiDetachRequest,
  rewriteAsControlRequest,
  pn,
  yn,
};
