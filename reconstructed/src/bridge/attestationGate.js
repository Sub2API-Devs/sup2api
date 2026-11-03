/**
 * bridge/attestationGate.ts
 *
 * 2.1.316 新增：Remote Control/云会话入站事件的设备签名判定：按签名状态与强制策略接受、提示或丢弃事件，并去重通知
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1qpz7qcd.js (29)
 * attribution: affinity 1, placement 28
 */
import { getControlRequestSubtype, createUnsignedEventNotice } from "./controlRequests.js";
import {
  normalizeAttestationStatus,
  meetsAttestationLevel,
  DEFAULT_ATTESTATION_POLICY,
} from "./deviceAttestation.js";
import { EFFORT_LEVELS } from "../utils/effort.js";
import { bridgeHostState } from "./bridgeHostState.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { getControlRequestInfo } from "../services/api/claude.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { BRIDGE_FORWARDED_MESSAGE_TYPES } from "../entrypoints/sdk/controlSchemas.js";
import { isImmediateInterruptRequest } from "../cli/print.js";

//@ chunk-1qpz7qcd.js:30552-30692 affinity
/**
 * 取 payload.request.subtype（控制请求子类型），不是字符串时返回 undefined。疑似归错文件。
 */
function getControlRequestSubtype_2(e) {
  let request = e.payload?.request;
  let subtype =
    typeof request === "object" && request !== null && "subtype" in request ? request.subtype : undefined;
  return typeof subtype === "string" ? subtype : undefined;
}
//@ chunk-1qpz7qcd.js:30692-30743 placement
var ATTESTATION_EXEMPT_CONTROL_SUBTYPES = new Set(["interrupt", "end_session"]);
var MAX_VOUCHED_SETTINGS_SUBTYPE_CHARS = 128;
//@ chunk-1qpz7qcd.js:30743-30992 placement
/**
 * 服务端担保（SERVICE_VOUCHED）的 control_request 且子类型为 set_model/apply_flag_settings、载荷形状严格匹配时返回 true，用于放行无设备签名但由服务端担保的设置类请求。
 */
function isServiceVouchedSettingsRequest(e) {
  let controlRequestSubtype = getControlRequestSubtype_2(e);
  let n = e.payload ? getControlRequestSubtype(e.payload) : undefined;
  return normalizeAttestationStatus(e.device_attestation_status) === "SERVICE_VOUCHED" &&
    e.payload?.type === "control_request" &&
    (controlRequestSubtype === "set_model" || controlRequestSubtype === "apply_flag_settings") &&
    typeof n === "string" &&
    n.length <= MAX_VOUCHED_SETTINGS_SUBTYPE_CHARS
    ? n
    : undefined;
}
//@ chunk-1qpz7qcd.js:30992-31505 placement
/**
 * 校验 set_model / apply_flag_settings 请求对象只含预期键（model,subtype 或 settings,subtype）。
 */
function isStrictSettingsRequestShape(request, r) {
  if (typeof request !== "object" || request === null) return false;
  let subtype = "subtype" in request ? request.subtype : undefined;
  let joined = Object.keys(request).sort().join();
  if (subtype === "set_model") {
    let model = "model" in request ? request.model : undefined;
    return joined === "model,subtype" && typeof model === "string" && r(model);
  }
  let settings = "settings" in request ? request.settings : undefined;
  if (
    subtype !== "apply_flag_settings" ||
    joined !== "settings,subtype" ||
    typeof settings !== "object" ||
    settings === null
  )
    return false;
  let entries = Object.entries(settings);
  return (
    entries.every(
      ([v, D]) =>
        (v === "effortLevel" && EFFORT_LEVELS.some((y) => y === D)) || (v === "ultracode" && D === false),
    ) && entries.some(([v]) => v === "effortLevel")
  );
}
//@ chunk-1qpz7qcd.js:31505-31537 placement
var INBOUND_REQUEST_ID_CAP = 2000;
var OUTBOUND_REQUEST_ID_CAP = 200;
var MAX_KNOWN_REQUEST_ID_CHARS = 128;
var RECENT_DROP_EVENT_ID_CAP = 256;
//@ chunk-1qpz7qcd.js:31537-31623 placement
function rememberBoundedId(e, r, n) {
  e.delete(n);
  e.add(n);
  if (e.size > r)
    for (let s of e) {
      e.delete(s);
      break;
    }
}
//@ chunk-1qpz7qcd.js:31623-31824 placement
/**
 * 请求 id 是否超长或已记录为入站/出站/elicitation/宿主询问请求，用于识别"自己发出的请求的应答"。
 */
function isKnownControlRequestId(e) {
  let attestation = bridgeHostState().attestation;
  return (
    e.length > MAX_KNOWN_REQUEST_ID_CHARS ||
    attestation.knownInboundRequestIds.has(e) ||
    attestation.knownOutboundRequestIds.has(e) ||
    attestation.elicitationOutboundRequestIds.has(e) ||
    attestation.hostAskOutboundRequestIds.has(e)
  );
}
//@ chunk-1qpz7qcd.js:31824-31943 placement
function isOwnOutboundRequestId(requestId) {
  let attestation = bridgeHostState().attestation;
  return (
    attestation.knownOutboundRequestIds.has(requestId) ||
    attestation.elicitationOutboundRequestIds.has(requestId)
  );
}
//@ chunk-1qpz7qcd.js:31943-32071 placement
/**
 * 记录本端发出的 control_request id（带上限的集合），automated=true 时同时记入自动请求集合。
 */
function rememberOutboundRequestId(requestId, { automated }) {
  let attestation = bridgeHostState().attestation;
  rememberBoundedId(attestation.knownOutboundRequestIds, OUTBOUND_REQUEST_ID_CAP, requestId);
  if (automated)
    rememberBoundedId(attestation.automatedOutboundRequestIds, OUTBOUND_REQUEST_ID_CAP, requestId);
}
//@ chunk-1qpz7qcd.js:32071-32082 placement
var DEVICE_OUTBOUND_REQUEST_ID_CAP = 512;
//@ chunk-1qpz7qcd.js:32082-32148 placement
function rememberDeviceOutboundRequestId(requestId) {
  rememberBoundedId(
    bridgeHostState().attestation.deviceOutboundRequestIds,
    DEVICE_OUTBOUND_REQUEST_ID_CAP,
    requestId,
  );
}
//@ chunk-1qpz7qcd.js:32148-32218 placement
function rememberElicitationRequestId(requestId) {
  rememberBoundedId(
    bridgeHostState().attestation.elicitationOutboundRequestIds,
    OUTBOUND_REQUEST_ID_CAP,
    requestId,
  );
}
//@ chunk-1qpz7qcd.js:32218-32284 placement
function rememberHostAskRequestId(requestId) {
  rememberBoundedId(
    bridgeHostState().attestation.hostAskOutboundRequestIds,
    OUTBOUND_REQUEST_ID_CAP,
    requestId,
  );
}
//@ chunk-1qpz7qcd.js:32284-32528 placement
function isOwnOutboundControlResponse(e) {
  let response = e.payload?.response;
  if (typeof response !== "object" || response === null) return false;
  let controlRequestSubtype = getControlRequestSubtype(response);
  let attestation = bridgeHostState().attestation;
  return (
    controlRequestSubtype !== undefined &&
    (attestation.automatedOutboundRequestIds.has(controlRequestSubtype) ||
      attestation.deviceOutboundRequestIds.has(controlRequestSubtype) ||
      attestation.hostAskOutboundRequestIds.has(controlRequestSubtype))
  );
}
//@ chunk-1qpz7qcd.js:32528-32605 placement
function isToolHostEndedReminder(e) {
  return e.payload?.inbound_origin === "tool_host_ended_reminder";
}
//@ chunk-1qpz7qcd.js:32605-32616 placement
var RESOLVED_PROMPT_REQUEST_ID_CAP = 200;
//@ chunk-1qpz7qcd.js:32616-32682 placement
function rememberResolvedPromptRequestId(e) {
  rememberBoundedId(
    bridgeHostState().attestation.resolvedPromptRequestIds,
    RESOLVED_PROMPT_REQUEST_ID_CAP,
    e,
  );
}
//@ chunk-1qpz7qcd.js:32682-32846 placement
function isResolvedPromptControlResponse(e) {
  let response = e.payload?.response;
  if (typeof response !== "object" || response === null) return false;
  let controlRequestSubtype = getControlRequestSubtype(response);
  return (
    controlRequestSubtype !== undefined &&
    bridgeHostState().attestation.resolvedPromptRequestIds.has(controlRequestSubtype)
  );
}
//@ chunk-1qpz7qcd.js:32846-32865 placement
var DROP_NOTICE_WINDOW_MS = 60000;
var DROP_NOTICE_WINDOW_MAX = 10;
//@ chunk-1qpz7qcd.js:32865-33365 placement
/**
 * 未签名事件被丢弃时去重后通知 dropNotifier / 发送方回执写入器（每个事件 id 只通知一次）。
 */
function notifyDroppedEvent(e, eventId) {
  let attestation = bridgeHostState().attestation;
  if (attestation.dropNotifier === undefined && attestation.senderDropWriter === undefined) return;
  if (attestation.recentDropEventIds.has(eventId)) return;
  rememberBoundedId(attestation.recentDropEventIds, RECENT_DROP_EVENT_ID_CAP, eventId);
  let s =
    e.payloadType === "control_request"
      ? attestation.commandDropNoticeWindow
      : attestation.messageDropNoticeWindow;
  let now = Date.now();
  if (now - s.start >= DROP_NOTICE_WINDOW_MS) {
    s.start = now;
    s.count = 0;
  }
  s.count++;
  if (s.count <= DROP_NOTICE_WINDOW_MAX) dispatchDropNotice(e);
  else if (s.count === DROP_NOTICE_WINDOW_MAX + 1)
    dispatchDropNotice({
      status: e.status,
      payloadType: e.payloadType,
      ...(e.subtype !== undefined && {
        subtype: e.subtype,
      }),
      windowCapped: true,
      ...(e.isCloud && {
        isCloud: true,
      }),
    });
}
//@ chunk-1qpz7qcd.js:33365-33692 placement
function dispatchDropNotice(e) {
  let attestation = bridgeHostState().attestation;
  if (attestation.dropNotifier !== undefined)
    try {
      attestation.dropNotifier(e);
    } catch (error) {
      logForDebugging(
        `${attestationLogPrefix(e.isCloud === true)} drop notifier threw: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  if (attestation.senderDropWriter !== undefined)
    try {
      let unsignedEventNotice = createUnsignedEventNotice(e);
      if (unsignedEventNotice) attestation.senderDropWriter(unsignedEventNotice);
    } catch (error) {
      logForDebugging(
        `${attestationLogPrefix(e.isCloud === true)} drop sender writer threw: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
}
//@ chunk-1qpz7qcd.js:33692-33907 placement
function rememberInboundRequestId(e) {
  let n =
    (typeof e.payload?.type === "string" ? e.payload.type : e.event_type) === "control_request" && e.payload
      ? getControlRequestSubtype(e.payload)
      : undefined;
  if (n !== undefined && n.length <= MAX_KNOWN_REQUEST_ID_CHARS)
    rememberBoundedId(bridgeHostState().attestation.knownInboundRequestIds, INBOUND_REQUEST_ID_CAP, n);
}
//@ chunk-1qpz7qcd.js:33907-34066 placement
function noteInboundControlRequestAttestation(messages, r, n) {
  if (r !== "control_request") return;
  rememberInboundRequestId(messages);
  if (getControlRequestInfo(messages) !== undefined)
    logFeatureOk(n ? "ccr_worker_control_request_attestation" : "bridge_control_request_attestation");
}
//@ chunk-1qpz7qcd.js:34151-34682 placement
/**
 * 按（状态, 载荷类型）去重记录一次设备签名丢弃诊断与遥测。
 */
function reportAttestationDropOnce(e, status, n, s) {
  try {
    let attestation = bridgeHostState().attestation;
    let b = s ? attestation.reportedCloudWorkerCodes : attestation.reportedStrayDropCodes;
    let v =
      n === "control_request"
        ? "control_request_other"
        : BRIDGE_FORWARDED_MESSAGE_TYPES.has(n)
          ? n
          : "other_payload_type";
    let D = `${status.toLowerCase()}_${v}`;
    if (b.has(D)) return;
    b.add(D);
    logForDebugging(
      `${attestationLogPrefix(s)} DROPPING unverified ${n} event_id=${e.event_id} status=${status} (stray payload class ${D}; counted once per process)`,
      {
        level: "warn",
      },
    );
    logFeatureBad(s ? "ccr_worker_stray_event_attestation" : "bridge_stray_event_attestation", D);
  } catch (error) {
    logForDebugging(`${attestationLogPrefix(s)} stray-drop report threw: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-1qpz7qcd.js:34682-34755 placement
function attestationLogPrefix(e) {
  return e ? "[ccr-worker:attestation]" : "[bridge:attestation]";
}
//@ chunk-1qpz7qcd.js:34755-35119 placement
/**
 * 计算事件的有效签名状态：非云 worker 时把 SERVER_AUTHORED/REPLAYED 视为 UNSPECIFIED；TRANSITIVELY_VOUCHED 在接受级别允许时视为已验证。
 */
function resolveEffectiveAttestation(e, r, { isCloudWorker, vouchWithheld = false }) {
  let i = !isCloudWorker && (e === "SERVER_AUTHORED" || e === "SERVER_REPLAYED") ? "UNSPECIFIED" : e;
  let b =
    i === "TRANSITIVELY_VOUCHED" &&
    meetsAttestationLevel("VERIFIED_KEYLESS_DEVICE", r.acceptLevel) &&
    !vouchWithheld;
  return {
    status: i,
    meetsLevel: b || meetsAttestationLevel(i, r.acceptLevel),
    configException:
      r.acceptStatuses.has(i) || (i === "TRANSITIVELY_VOUCHED" && r.acceptStatuses.has("UNSPECIFIED")),
  };
}
//@ chunk-1qpz7qcd.js:35119-37859 placement
/**
 * Remote Control/云会话入站事件的设备签名判定核心：根据事件类型、状态、过滤策略决定接受、提示或丢弃，并处理 user/control_response 的特殊放行。
 */
function evaluateInboundAttestation(messages, r, n, s, i) {
  let b = typeof messages.payload?.type === "string" ? messages.payload.type : messages.event_type;
  let v = b === "user" || b === "control_response";
  let D = normalizeAttestationStatus(messages.device_attestation_status);
  let y =
    D === "TRANSITIVELY_VOUCHED" &&
    b === "user" &&
    !(typeof messages.payload.inbound_origin === "string" && messages.payload.inbound_origin !== "");
  let C =
    n &&
    D === "TRANSITIVELY_VOUCHED" &&
    ((b !== "user" && b !== "queued_notification") || messages.payload?.priority === "now" || !s);
  let { status, meetsLevel, configException } = resolveEffectiveAttestation(D, r, {
    isCloudWorker: n,
    vouchWithheld: y || C,
  });
  let B = `${status.toLowerCase()}_${b}${y ? "_unstamped" : ""}`;
  let request = messages.payload?.request;
  let X =
    n &&
    status === "SERVICE_VOUCHED" &&
    b === "control_request" &&
    ((!ATTESTATION_EXEMPT_CONTROL_SUBTYPES.has(getControlRequestSubtype_2(messages) ?? "") &&
      (i === undefined ||
        isServiceVouchedSettingsRequest(messages) === undefined ||
        !isStrictSettingsRequestShape(request, i))) ||
      (typeof request === "object" && request !== null && isImmediateInterruptRequest(request)));
  if (meetsLevel && !X) {
    if (v) logFeatureOk(n ? "ccr_worker_event_attestation" : "bridge_event_attestation");
    noteInboundControlRequestAttestation(messages, b, n);
    return false;
  }
  if (!r.enforce) {
    noteInboundControlRequestAttestation(messages, b, n);
    if (status === "UNSPECIFIED") return false;
    if (v) {
      logForDebugging(
        `${attestationLogPrefix(n)} accepting unverified ${b} event_id=${messages.event_id} status=${status}`,
        {
          level: "info",
        },
      );
      logFeatureSad(n ? "ccr_worker_event_attestation" : "bridge_event_attestation", B);
    }
    return false;
  }
  let N = configException;
  let L = false;
  if (v) {
    let w = B;
    logForDebugging(
      `${attestationLogPrefix(n)} ${N ? "accepting (config exception)" : "DROPPING"} unverified ${b} event_id=${messages.event_id} status=${status}`,
      {
        level: N ? "info" : "warn",
      },
    );
    if (N) logFeatureSad(n ? "ccr_worker_event_attestation" : "bridge_event_attestation", w);
    else if (b === "control_response" && isOwnOutboundControlResponse(messages)) {
      L = true;
      logForDebugging(
        `${attestationLogPrefix(n)} dropped ${b} event_id=${messages.event_id} status=${status} answers an automated outbound request; notice suppressed`,
        {
          level: "info",
        },
      );
      logFeatureBad(n ? "ccr_worker_event_attestation" : "bridge_event_attestation", `${w}_automated_reply`);
    } else if (b === "control_response" && isResolvedPromptControlResponse(messages)) {
      L = true;
      logForDebugging(
        `${attestationLogPrefix(n)} dropped ${b} event_id=${messages.event_id} status=${status} is a duplicate answer to an already-resolved prompt; notice suppressed`,
        {
          level: "info",
        },
      );
      logFeatureBad(
        n ? "ccr_worker_event_attestation" : "bridge_event_attestation",
        `${w}_resolved_duplicate`,
      );
    } else if (n && b === "user" && isToolHostEndedReminder(messages)) {
      L = true;
      logForDebugging(
        `${attestationLogPrefix(n)} dropped ${b} event_id=${messages.event_id} status=${status} is the service's own linked-computer line; notice suppressed`,
        {
          level: "info",
        },
      );
      logFeatureBad("ccr_worker_event_attestation", `${w}_service_line`);
    } else {
      L = true;
      logFeatureBad(n ? "ccr_worker_event_attestation" : "bridge_event_attestation", w);
      notifyDroppedEvent(
        {
          status,
          payloadType: b,
          ...(n && {
            isCloud: true,
          }),
        },
        messages.event_id,
      );
    }
  } else if (b === "control_request" && !N) {
    let controlRequestInfo = getControlRequestInfo(messages);
    if (controlRequestInfo) {
      L = true;
      let requestId =
        controlRequestInfo.requestId !== undefined && isKnownControlRequestId(controlRequestInfo.requestId)
          ? undefined
          : controlRequestInfo.requestId;
      logForDebugging(
        `${attestationLogPrefix(n)} DROPPING unverified control_request subtype=${controlRequestInfo.subtype} event_id=${messages.event_id} status=${status}${requestId === undefined && controlRequestInfo.requestId !== undefined ? " (forged-id refusal suppressed, or the id is too long)" : ""}`,
        {
          level: "warn",
        },
      );
      logFeatureBad(
        n ? "ccr_worker_control_request_attestation" : "bridge_control_request_attestation",
        `${status.toLowerCase()}_${controlRequestInfo.subtype}`,
      );
      notifyDroppedEvent(
        {
          status,
          payloadType: b,
          subtype: controlRequestInfo.subtype,
          requestId,
          ...(n && {
            isCloud: true,
          }),
        },
        messages.event_id,
      );
    }
  }
  if (!N && !L) reportAttestationDropOnce(messages, status, b, n);
  if (N) noteInboundControlRequestAttestation(messages, b, n);
  return !N;
}
//@ chunk-1qpz7qcd.js:37859-37933 placement
function evaluateInboundAttestationWithPolicy(e) {
  return evaluateInboundAttestation(
    e,
    bridgeHostState().attestation.filterPolicy?.() ?? DEFAULT_ATTESTATION_POLICY,
    false,
    true,
  );
}
//@ chunk-1qpz7qcd.js:37933-38428 placement
/**
 * 云 worker 通道上非 client 来源的事件按 enforce 策略丢弃或仅告警（"would drop"），再进入签名判定。
 */
function filterInboundEventBySource(e, workerAttestationPolicy, n = false, vouchableCloudModel) {
  if (e.source !== "client") {
    try {
      let reportedCloudWorkerCodes = bridgeHostState().attestation.reportedCloudWorkerCodes;
      if (!reportedCloudWorkerCodes.has("source_not_client")) {
        reportedCloudWorkerCodes.add("source_not_client");
        logForDebugging(
          `${attestationLogPrefix(true)} ${workerAttestationPolicy.enforce ? "DROPPING" : "would drop"} event_id=${e.event_id}: not marked client-written (counted once per process)`,
          {
            level: "warn",
          },
        );
        logFeatureBad("ccr_worker_stray_event_attestation", "source_not_client");
      }
    } catch (error) {
      logForDebugging(`${attestationLogPrefix(true)} source-drop report threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (!workerAttestationPolicy.enforce) rememberInboundRequestId(e);
    return workerAttestationPolicy.enforce;
  }
  return evaluateInboundAttestation(e, workerAttestationPolicy, true, n, vouchableCloudModel);
}
export {
  resolveEffectiveAttestation,
  getControlRequestSubtype_2,
  attestationLogPrefix,
  rememberResolvedPromptRequestId,
  rememberOutboundRequestId,
  rememberElicitationRequestId,
  rememberHostAskRequestId,
  rememberDeviceOutboundRequestId,
  evaluateInboundAttestationWithPolicy,
  isOwnOutboundRequestId,
  isKnownControlRequestId,
  rememberInboundRequestId,
  isServiceVouchedSettingsRequest,
  filterInboundEventBySource,
};
