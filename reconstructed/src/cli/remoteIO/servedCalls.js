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
import { MAX_MANIFEST_STATEMENT_AGE_MS } from "../sdkMcpManifests.js";
import { isOwnOutboundRequestId, isKnownControlRequestId } from "../../bridge/attestationGate.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";

//@ chunk-z4g2ta8k.js:36667-36696 placement
var VIA_SESSION_CHANNEL = "via_session_channel";
//@ chunk-z4g2ta8k.js:36696-36712 placement
function noop(e) {}
//@ chunk-z4g2ta8k.js:36712-36781 placement
function setRequestSettings(payload, settings) {
  let r = asPlainObject(payload.request) ?? {};
  payload.request = {
    ...r,
    settings,
  };
}
//@ chunk-z4g2ta8k.js:36781-36941 placement
function rewriteAsControlRequest(payload, { requestId, subtype, eventId }) {
  for (let key of Object.keys(payload)) delete payload[key];
  payload.type = "control_request";
  payload.request_id = requestId;
  payload.request = {
    subtype,
  };
  payload.uuid = eventId;
}
//@ chunk-z4g2ta8k.js:36941-37115 placement
function rewriteAsUiDetachRequest(payload, { requestId, clientId, eventId }) {
  for (let key of Object.keys(payload)) delete payload[key];
  payload.type = "control_request";
  payload.request_id = requestId;
  payload.request = {
    subtype: UI_DETACH,
    client_id: clientId,
  };
  payload.uuid = eventId;
}
//@ chunk-z4g2ta8k.js:37115-37207 placement
function markResponseBelowFloor(payload, requestId, result) {
  payload.response = {
    subtype: "success",
    request_id: requestId,
    response: {
      result,
      [SENDER_BELOW_FLOOR]: true,
    },
  };
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
};
var UNVERIFIED_SENDER = "unverified-sender";
//@ chunk-z4g2ta8k.js:39224-39635 placement
/**
 * 从 control_response 里读出 served call 的结果信封，若对方报告 refused，就改写成"未验证发送方"的拒绝结果（用固定话术，保留 call_id 与 code）。
 */
function unverifiedRefusalResult(payload) {
  let n = asPlainObject(payload.response);
  let r = asPlainObject(n?.response);
  if (n?.subtype !== "success" || r === undefined) return;
  let s;
  try {
    s = readCallResult(r.result);
  } catch {
    return;
  }
  if (s.envelope.status !== "present" || s.envelope.envelope.outcome !== "refused") return;
  let envelope = s.envelope.envelope;
  let y = SERVED_CALL_REFUSALS[envelope.code];
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      ...(envelope.call_id !== undefined && {
        call_id: envelope.call_id,
      }),
      target: {
        name: UNVERIFIED_SENDER,
        working_dir: "",
      },
      code: envelope.code,
      message: y,
    },
    content: y,
  });
}
//@ chunk-z4g2ta8k.js:39635-39715 placement
function asPlainObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e) ? e : undefined;
}
//@ chunk-z4g2ta8k.js:39715-39728 placement
var LEASE_RENEW_LEAD_MS = 60000;
//@ chunk-z4g2ta8k.js:39728-39742 placement
var LEASE_RENEW_AT_MS = MAX_MANIFEST_STATEMENT_AGE_MS - LEASE_RENEW_LEAD_MS;
//@ chunk-z4g2ta8k.js:39742-40104 placement
/**
 * 租约续期调度器：stated(到期时刻) 记录新租约，按到期前的提前量安排 renew，仍需要时续期一次、不需要或已续过时 lapse；stop 取消定时器。
 */
function createLeaseRenewer(e) {
  let n;
  let r = false;
  let s;
  function h() {
    s?.();
    s = undefined;
  }
  function y() {
    h();
    let k = n;
    if (k === undefined) return;
    let P = r ? MAX_MANIFEST_STATEMENT_AGE_MS : LEASE_RENEW_AT_MS;
    let O = k + P - e.readNow();
    if (O > 0) {
      s = e.schedule(y, Math.min(O, P));
      return;
    }
    let A = e.isWanted();
    let x = k + MAX_MANIFEST_STATEMENT_AGE_MS - e.readNow();
    if (r || (!A && x <= 0)) {
      e.lapse();
      return;
    }
    s = e.schedule(y, Math.max(x, 0));
    if (A) {
      r = true;
      e.renew();
    }
  }
  function S(k) {
    n = k;
    r = false;
    y();
  }
  return {
    stated: S,
    review: y,
    stop: h,
  };
}
//@ chunk-z4g2ta8k.js:40104-40116 placement
var ADMITTER_RECENT_WINDOW_MS = 2000;
//@ chunk-z4g2ta8k.js:40116-40142 placement
var REQUEST_ID_PATTERN = /^[\w.:-]{1,128}$/;
//@ chunk-z4g2ta8k.js:40142-40152 placement
var MAX_RECENT_KEPT_FRAMES = 64;
//@ chunk-z4g2ta8k.js:40152-40165 placement
var KEPT_FRAME_TTL_MS = 60000;
//@ chunk-z4g2ta8k.js:40165-40175 placement
var MAX_REPEATED_FRAME_REQUESTS = 30;
//@ chunk-z4g2ta8k.js:40175-40282 placement
/**
 * 在 Map 中设置键值并移到最新位置，超出容量时淘汰最早的条目。
 */
function setBoundedRecent(e, n, r) {
  e.delete(n[0]);
  e.set(n[0], n[1]);
  for (let key of e.keys()) {
    if (e.size <= r) break;
    e.delete(key);
  }
}
//@ chunk-z4g2ta8k.js:40282-41614 placement
function servedCallDispatcher(e) {
  let n = new Map();
  let r = new Map();
  let s = new Map();
  let h = 0;
  let y = 0;
  function S() {
    let now = e.readNow();
    if (now - h >= KEPT_FRAME_TTL_MS) {
      h = now;
      y = 0;
    }
    if (y >= MAX_REPEATED_FRAME_REQUESTS) return false;
    y += 1;
    return true;
  }
  function k(M) {
    let { requestId, frame } = M;
    if (typeof requestId !== "string") return true;
    let z = isOwnOutboundRequestId(requestId) || e.isAwaited(requestId);
    let G = r.has(requestId) || isKnownControlRequestId(requestId);
    let L = r.get(requestId)?.admitter ?? n.get(requestId);
    return z || (G && (frame === undefined || L !== frame));
  }
  function P(requestId, frame) {
    let q = frame === undefined ? undefined : s.get(frame);
    let z = q !== undefined && q.requestId === requestId && e.readNow() - q.keptAtMs < KEPT_FRAME_TTL_MS;
    if (frame !== undefined && q !== undefined) s.delete(frame);
    return z;
  }
  let O = (M) => typeof M.requestId === "string" && REQUEST_ID_PATTERN.test(M.requestId) && !k(M) && S();
  function A(M) {
    if (!(typeof M.requestId === "string" && REQUEST_ID_PATTERN.test(M.requestId))) return;
    let q = r.get(M.requestId);
    let z = !M.wasSeen && q === undefined;
    r.set(M.requestId, {
      admitter: q?.admitter ?? (z ? M.frame : n.get(M.requestId)),
      pending: (q?.pending ?? 0) + 1,
    });
  }
  function x(requestId) {
    let T = typeof requestId === "string" ? r.get(requestId) : undefined;
    if (!(typeof requestId === "string" && T !== undefined)) return;
    if (T.pending > 1) {
      r.set(requestId, {
        ...T,
        pending: T.pending - 1,
      });
      return;
    }
    r.delete(requestId);
    if (T.admitter !== undefined) setBoundedRecent(n, [requestId, T.admitter], ADMITTER_RECENT_WINDOW_MS);
  }
  function U(M, T) {
    if (typeof M.requestId !== "string") return false;
    if (T === "loop" && P(M.requestId, M.frame)) return !k(M);
    let z = O(M);
    if (z && T === "filter" && M.frame !== undefined)
      setBoundedRecent(
        s,
        [
          M.frame,
          {
            requestId: M.requestId,
            keptAtMs: e.readNow(),
          },
        ],
        MAX_RECENT_KEPT_FRAMES,
      );
    if (!z && T === "loop" && M.frame !== undefined) x(M.requestId);
    return z;
  }
  return {
    admitted: A,
    settled: x,
    answers: U,
    charges: O,
  };
}
//@ chunk-z4g2ta8k.js:41614-41678 placement
/**
 * 已服务调用（served call）的最大持有时间 6 小时，超时即丢弃。
 */
var SERVED_CALL_MAX_AGE_MS = 21600000;
var IN_PROCESS_TEAMMATE = "in_process_teammate";
var POST_TURN_MEMORY = "post_turn_memory";
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
        let status = e.patch?.status;
        if (status !== undefined && isTerminalTaskStatus(status)) this.remove(e.task_id);
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
    if (this.startedAt !== undefined && n >= this.startedAt + SERVED_CALL_MAX_AGE_MS) this.drop();
    this.startedAt ??= n;
    this.live.add(e);
  }
  remove(e) {
    this.live.delete(e);
    if (this.live.size === 0) this.drop();
  }
  drop() {
    this.live.clear();
    this.startedAt = undefined;
  }
}
export {
  SERVED_CALL_MAX_AGE_MS,
  setBoundedRecent,
  asPlainObject,
  unverifiedRefusalResult,
  VIA_SESSION_CHANNEL,
  servedCallDispatcher,
  createLeaseRenewer,
  TaskEventMirror,
  noop,
  rewriteAsUiDetachRequest,
  rewriteAsControlRequest,
  setRequestSettings,
  markResponseBelowFloor,
};
