/**
 * cli/remoteIO/servedCalls.ts
 *
 * 2.1.316 新增。云 worker 代客户端执行调用（served call）的分发与拒绝原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kk50rk6.js (25)
 * attribution: placement 22, layout 3
 */
import { unapprovedSettingsKeys } from "./turnHandoff.js";
import { CLOUD_PLUGINS_FORWARDED_KEY } from "../../utils/plugins/cloudPluginForwarding.js";
import { UI_DETACH } from "./deviceAttestation.js";
import { SENDER_BELOW_FLOOR } from "../../remote/tools/protocolSchemas.js";
import { readCallResult } from "../../remote/tools/toolDescriptors.js";
import { buildRemoteToolCallResult } from "../../remote/tools/callResults.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../../remote/tools/protocolConstants.js";
import { MAX_MANIFEST_STATEMENT_AGE_MS } from "../sdkMcpManifests.js";
import { isOwnOutboundRequestId, isKnownControlRequestId } from "../../bridge/attestationGate.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1kk50rk6.js:39195-39224 placement
var VIA_SESSION_CHANNEL = "via_session_channel";
//@ chunk-1kk50rk6.js:39224-39240 placement
function noop(x) {}
//@ chunk-1kk50rk6.js:39240-39272 layout
var CLAUDE_CODE_EXTRA_BODY = "CLAUDE_CODE_EXTRA_BODY";
//@ chunk-1kk50rk6.js:39272-39355 layout
function extraBodyEnvKeys(payload) {
  return Object.keys(asPlainObject(payload.env) ?? {}).filter(
    (key) => key.toUpperCase() === CLAUDE_CODE_EXTRA_BODY,
  );
}
//@ chunk-1kk50rk6.js:39355-39616 layout
function stripUnattestedSettings(settings, settings_2) {
  if (settings_2 === "list") {
    let filtered = unapprovedSettingsKeys(settings).filter(
      (settingKey) => settingKey !== CLOUD_PLUGINS_FORWARDED_KEY,
    );
    for (let removedSettings of filtered) delete settings[removedSettings];
    return filtered;
  }
  let env = asPlainObject(settings.env);
  let removedEnvKeys = extraBodyEnvKeys(settings);
  if (env === undefined || removedEnvKeys.length === 0) return [];
  for (let envKey of removedEnvKeys) delete env[envKey];
  if (Object.keys(env).length === 0) delete settings.env;
  return removedEnvKeys.map((envKey) => `env.${envKey}`);
}
//@ chunk-1kk50rk6.js:39616-39685 placement (2.1.88 match: useSettings, 0.658)
function setRequestSettings(payload, settings) {
  let request = asPlainObject(payload.request) ?? {};
  payload.request = {
    ...request,
    settings,
  };
}
//@ chunk-1kk50rk6.js:39685-39845 placement
function rewriteAsControlRequest(payload, { requestId, subtype, eventId }) {
  for (let key of Object.keys(payload)) delete payload[key];
  payload.type = "control_request";
  payload.request_id = requestId;
  payload.request = {
    subtype,
  };
  payload.uuid = eventId;
}
//@ chunk-1kk50rk6.js:39845-40019 placement
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
//@ chunk-1kk50rk6.js:40019-40111 placement
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
//@ chunk-1kk50rk6.js:40111-40297 placement
function unverifiedRefusalMessage(code) {
  return `reported refused \u2014 ${code} \u2014 by a sender this session could not verify; whether anything ran there is not confirmed. Check its effect before re-running it.`;
}
//@ chunk-1kk50rk6.js:40297-42128 placement
var SERVED_CALL_REFUSALS; // deferred: uses unverifiedRefusalMessage of its import cycle while loading; runs once the cycle is complete
var UNVERIFIED_SENDER;
deferInit("chunk-1kk50rk6.js:40297", () => {
  SERVED_CALL_REFUSALS = {
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
  UNVERIFIED_SENDER = "unverified-sender";
});
//@ chunk-1kk50rk6.js:42128-42539 placement
/**
 * 从 control_response 里读出 served call 的结果信封，若对方报告 refused，就改写成"未验证发送方"的拒绝结果（用固定话术，保留 call_id 与 code）。
 */
function unverifiedRefusalResult(payload) {
  let response = asPlainObject(payload.response);
  let body = asPlainObject(response?.response);
  if (response?.subtype !== "success" || body === undefined) return;
  let read;
  try {
    read = readCallResult(body.result);
  } catch {
    return;
  }
  if (read.envelope.status !== "present" || read.envelope.envelope.outcome !== "refused") return;
  let envelope = read.envelope.envelope;
  let message = SERVED_CALL_REFUSALS[envelope.code];
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
      message,
    },
    content: message,
  });
}
//@ chunk-1kk50rk6.js:42539-42619 placement
function asPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}
//@ chunk-1kk50rk6.js:42619-42632 placement
var LEASE_RENEW_LEAD_MS = 60000;
//@ chunk-1kk50rk6.js:42632-42646 placement
var LEASE_RENEW_AT_MS = MAX_MANIFEST_STATEMENT_AGE_MS - LEASE_RENEW_LEAD_MS;
//@ chunk-1kk50rk6.js:42646-43008 placement
/**
 * 租约续期调度器：stated(到期时刻) 记录新租约，按到期前的提前量安排 renew，仍需要时续期一次、不需要或已续过时 lapse；stop 取消定时器。
 */
function createLeaseRenewer(deps) {
  let statedAt;
  let renewed = false;
  let cancel;
  function stop() {
    cancel?.();
    cancel = undefined;
  }
  function review() {
    stop();
    let from = statedAt;
    if (from === undefined) return;
    let delay = renewed ? MAX_MANIFEST_STATEMENT_AGE_MS : LEASE_RENEW_AT_MS;
    let left = from + delay - deps.readNow();
    if (left > 0) {
      cancel = deps.schedule(review, Math.min(left, delay));
      return;
    }
    let wanted = deps.isWanted();
    let remaining = from + MAX_MANIFEST_STATEMENT_AGE_MS - deps.readNow();
    if (renewed || (!wanted && remaining <= 0)) {
      deps.lapse();
      return;
    }
    cancel = deps.schedule(review, Math.max(remaining, 0));
    if (wanted) {
      renewed = true;
      deps.renew();
    }
  }
  function stated(at) {
    statedAt = at;
    renewed = false;
    review();
  }
  return {
    stated,
    review,
    stop,
  };
}
//@ chunk-1kk50rk6.js:43008-43020 placement
var ADMITTER_RECENT_WINDOW_MS = 2000;
//@ chunk-1kk50rk6.js:43020-43046 placement
var REQUEST_ID_PATTERN = /^[\w.:-]{1,128}$/;
//@ chunk-1kk50rk6.js:43046-43056 placement
var MAX_RECENT_KEPT_FRAMES = 64;
//@ chunk-1kk50rk6.js:43056-43069 placement
var KEPT_FRAME_TTL_MS = 60000;
//@ chunk-1kk50rk6.js:43069-43079 placement
var MAX_REPEATED_FRAME_REQUESTS = 30;
//@ chunk-1kk50rk6.js:43079-43186 placement
/**
 * 在 Map 中设置键值并移到最新位置，超出容量时淘汰最早的条目。
 */
function setBoundedRecent(map, pair, limit) {
  map.delete(pair[0]);
  map.set(pair[0], pair[1]);
  for (let key of map.keys()) {
    if (map.size <= limit) break;
    map.delete(key);
  }
}
//@ chunk-1kk50rk6.js:43186-44518 placement
function servedCallDispatcher(deps) {
  let recentAdmitters = new Map();
  let pendingAdmissions = new Map();
  let keptFrames = new Map();
  let windowStart = 0;
  let charged = 0;
  function takeCharge() {
    let now = deps.readNow();
    if (now - windowStart >= KEPT_FRAME_TTL_MS) {
      windowStart = now;
      charged = 0;
    }
    if (charged >= MAX_REPEATED_FRAME_REQUESTS) return false;
    charged += 1;
    return true;
  }
  function isRefused(entry) {
    let { requestId, frame } = entry;
    if (typeof requestId !== "string") return true;
    let own = isOwnOutboundRequestId(requestId) || deps.isAwaited(requestId);
    let known = pendingAdmissions.has(requestId) || isKnownControlRequestId(requestId);
    let admitter = pendingAdmissions.get(requestId)?.admitter ?? recentAdmitters.get(requestId);
    return own || (known && (frame === undefined || admitter !== frame));
  }
  function isKeptFrame(requestId, frame) {
    let kept = frame === undefined ? undefined : keptFrames.get(frame);
    let fresh =
      kept !== undefined &&
      kept.requestId === requestId &&
      deps.readNow() - kept.keptAtMs < KEPT_FRAME_TTL_MS;
    if (frame !== undefined && kept !== undefined) keptFrames.delete(frame);
    return fresh;
  }
  let charges = (entry) =>
    typeof entry.requestId === "string" &&
    REQUEST_ID_PATTERN.test(entry.requestId) &&
    !isRefused(entry) &&
    takeCharge();
  function admitted(entry) {
    if (!(typeof entry.requestId === "string" && REQUEST_ID_PATTERN.test(entry.requestId))) return;
    let previous = pendingAdmissions.get(entry.requestId);
    let firstSeen = !entry.wasSeen && previous === undefined;
    pendingAdmissions.set(entry.requestId, {
      admitter: previous?.admitter ?? (firstSeen ? entry.frame : recentAdmitters.get(entry.requestId)),
      pending: (previous?.pending ?? 0) + 1,
    });
  }
  function settled(requestId) {
    let pending = typeof requestId === "string" ? pendingAdmissions.get(requestId) : undefined;
    if (!(typeof requestId === "string" && pending !== undefined)) return;
    if (pending.pending > 1) {
      pendingAdmissions.set(requestId, {
        ...pending,
        pending: pending.pending - 1,
      });
      return;
    }
    pendingAdmissions.delete(requestId);
    if (pending.admitter !== undefined)
      setBoundedRecent(recentAdmitters, [requestId, pending.admitter], ADMITTER_RECENT_WINDOW_MS);
  }
  function answers(entry, where) {
    if (typeof entry.requestId !== "string") return false;
    if (where === "loop" && isKeptFrame(entry.requestId, entry.frame)) return !isRefused(entry);
    let charged = charges(entry);
    if (charged && where === "filter" && entry.frame !== undefined)
      setBoundedRecent(
        keptFrames,
        [
          entry.frame,
          {
            requestId: entry.requestId,
            keptAtMs: deps.readNow(),
          },
        ],
        MAX_RECENT_KEPT_FRAMES,
      );
    if (!charged && where === "loop" && entry.frame !== undefined) settled(entry.requestId);
    return charged;
  }
  return {
    admitted,
    settled,
    answers,
    charges,
  };
}
//@ chunk-1kk50rk6.js:44518-44582 placement
/**
 * 已服务调用（served call）的最大持有时间 6 小时，超时即丢弃。
 */
var SERVED_CALL_MAX_AGE_MS = 21600000;
var IN_PROCESS_TEAMMATE = "in_process_teammate";
var POST_TURN_MEMORY = "post_turn_memory";
//@ chunk-1kk50rk6.js:44582-45367 placement
class TaskEventMirror {
  live = new Set();
  startedAt;
  note(frame, at) {
    if (frame.type !== "system") return;
    switch (frame.subtype) {
      case "task_started":
        if (frame.task_type !== IN_PROCESS_TEAMMATE && frame.task_type !== POST_TURN_MEMORY)
          this.add(frame.task_id, at);
        return;
      case "task_notification":
        this.remove(frame.task_id);
        return;
      case "task_updated": {
        let status = frame.patch?.status;
        if (status !== undefined && isTerminalTaskStatus(status)) this.remove(frame.task_id);
        return;
      }
      case "background_tasks_changed":
        if (Array.isArray(frame.tasks)) {
          this.drop();
          for (let task of frame.tasks)
            if (task?.task_type !== IN_PROCESS_TEAMMATE && task?.task_type !== POST_TURN_MEMORY)
              this.add(task?.task_id, at);
        }
        return;
      default:
        return;
    }
  }
  since() {
    return this.startedAt;
  }
  add(taskId, at) {
    if (typeof taskId !== "string" || taskId === "") return;
    if (this.startedAt !== undefined && at >= this.startedAt + SERVED_CALL_MAX_AGE_MS) this.drop();
    this.startedAt ??= at;
    this.live.add(taskId);
  }
  remove(taskId) {
    this.live.delete(taskId);
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
  extraBodyEnvKeys,
  stripUnattestedSettings,
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
