/**
 * bridge/attestationGate.ts
 *
 * 2.1.316 新增：Remote Control/云会话入站事件的设备签名判定：按签名状态与强制策略接受、提示或丢弃事件，并去重通知
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ck4jrdtf.js (29)
 * attribution: affinity 1, placement 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ck4jrdtf.js:31055-31195 affinity
/**
 * 取 payload.request.subtype（控制请求子类型），不是字符串时返回 undefined。疑似归错文件。
 */
function getControlRequestSubtype_2(message) {
  let request = message.payload?.request;
  let subtype =
    typeof request === "object" && request !== null && "subtype" in request ? request.subtype : undefined;
  return typeof subtype === "string" ? subtype : undefined;
}
//@ chunk-ck4jrdtf.js:31195-31246 placement
var ATTESTATION_EXEMPT_CONTROL_SUBTYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_VOUCHED_SETTINGS_SUBTYPE_CHARS;
deferInit("chunk-ck4jrdtf.js:31195", () => {
  ATTESTATION_EXEMPT_CONTROL_SUBTYPES = new Set(["interrupt", "end_session"]);
  MAX_VOUCHED_SETTINGS_SUBTYPE_CHARS = 128;
});
//@ chunk-ck4jrdtf.js:31246-31495 placement
/**
 * 服务端担保（SERVICE_VOUCHED）的 control_request 且子类型为 set_model/apply_flag_settings、载荷形状严格匹配时返回 true，用于放行无设备签名但由服务端担保的设置类请求。
 */
function isServiceVouchedSettingsRequest(message) {
  let controlRequestSubtype = getControlRequestSubtype_2(message);
  let requestId = message.payload ? getControlRequestSubtype(message.payload) : undefined;
  return normalizeAttestationStatus(message.device_attestation_status) === "SERVICE_VOUCHED" &&
    message.payload?.type === "control_request" &&
    (controlRequestSubtype === "set_model" || controlRequestSubtype === "apply_flag_settings") &&
    typeof requestId === "string" &&
    requestId.length <= MAX_VOUCHED_SETTINGS_SUBTYPE_CHARS
    ? requestId
    : undefined;
}
//@ chunk-ck4jrdtf.js:31495-32008 placement
/**
 * 校验 set_model / apply_flag_settings 请求对象只含预期键（model,subtype 或 settings,subtype）。
 */
function isStrictSettingsRequestShape(request, isVouchableModel) {
  if (typeof request !== "object" || request === null) return false;
  let subtype = "subtype" in request ? request.subtype : undefined;
  let joined = Object.keys(request).sort().join();
  if (subtype === "set_model") {
    let model = "model" in request ? request.model : undefined;
    return joined === "model,subtype" && typeof model === "string" && isVouchableModel(model);
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
      ([key, value]) =>
        (key === "effortLevel" && EFFORT_LEVELS.some((level) => level === value)) ||
        (key === "ultracode" && value === false),
    ) && entries.some(([key]) => key === "effortLevel")
  );
}
//@ chunk-ck4jrdtf.js:32008-32040 placement
var INBOUND_REQUEST_ID_CAP = 2000;
var OUTBOUND_REQUEST_ID_CAP = 200;
var MAX_KNOWN_REQUEST_ID_CHARS = 128;
var RECENT_DROP_EVENT_ID_CAP = 256;
//@ chunk-ck4jrdtf.js:32040-32126 placement
function rememberBoundedId(idSet, maxSize, id) {
  idSet.delete(id);
  idSet.add(id);
  if (idSet.size > maxSize)
    for (let oldestId of idSet) {
      idSet.delete(oldestId);
      break;
    }
}
//@ chunk-ck4jrdtf.js:32126-32327 placement
/**
 * 请求 id 是否超长或已记录为入站/出站/elicitation/宿主询问请求，用于识别"自己发出的请求的应答"。
 */
function isKnownControlRequestId(requestId) {
  let attestation = bridgeHostState().attestation;
  return (
    requestId.length > MAX_KNOWN_REQUEST_ID_CHARS ||
    attestation.knownInboundRequestIds.has(requestId) ||
    attestation.knownOutboundRequestIds.has(requestId) ||
    attestation.elicitationOutboundRequestIds.has(requestId) ||
    attestation.hostAskOutboundRequestIds.has(requestId)
  );
}
//@ chunk-ck4jrdtf.js:32327-32446 placement
function isOwnOutboundRequestId(requestId) {
  let attestation = bridgeHostState().attestation;
  return (
    attestation.knownOutboundRequestIds.has(requestId) ||
    attestation.elicitationOutboundRequestIds.has(requestId)
  );
}
//@ chunk-ck4jrdtf.js:32446-32574 placement
/**
 * 记录本端发出的 control_request id（带上限的集合），automated=true 时同时记入自动请求集合。
 */
function rememberOutboundRequestId(requestId, { automated }) {
  let attestation = bridgeHostState().attestation;
  rememberBoundedId(attestation.knownOutboundRequestIds, OUTBOUND_REQUEST_ID_CAP, requestId);
  if (automated)
    rememberBoundedId(attestation.automatedOutboundRequestIds, OUTBOUND_REQUEST_ID_CAP, requestId);
}
//@ chunk-ck4jrdtf.js:32574-32585 placement
var DEVICE_OUTBOUND_REQUEST_ID_CAP = 512;
//@ chunk-ck4jrdtf.js:32585-32651 placement
function rememberDeviceOutboundRequestId(requestId) {
  rememberBoundedId(
    bridgeHostState().attestation.deviceOutboundRequestIds,
    DEVICE_OUTBOUND_REQUEST_ID_CAP,
    requestId,
  );
}
//@ chunk-ck4jrdtf.js:32651-32721 placement
function rememberElicitationRequestId(requestId) {
  rememberBoundedId(
    bridgeHostState().attestation.elicitationOutboundRequestIds,
    OUTBOUND_REQUEST_ID_CAP,
    requestId,
  );
}
//@ chunk-ck4jrdtf.js:32721-32787 placement
function rememberHostAskRequestId(requestId) {
  rememberBoundedId(
    bridgeHostState().attestation.hostAskOutboundRequestIds,
    OUTBOUND_REQUEST_ID_CAP,
    requestId,
  );
}
//@ chunk-ck4jrdtf.js:32787-33031 placement
function isOwnOutboundControlResponse(message) {
  let response = message.payload?.response;
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
//@ chunk-ck4jrdtf.js:33031-33108 placement
function isToolHostEndedReminder(message) {
  return message.payload?.inbound_origin === "tool_host_ended_reminder";
}
//@ chunk-ck4jrdtf.js:33108-33119 placement
var RESOLVED_PROMPT_REQUEST_ID_CAP = 200;
//@ chunk-ck4jrdtf.js:33119-33185 placement
function rememberResolvedPromptRequestId(requestId) {
  rememberBoundedId(
    bridgeHostState().attestation.resolvedPromptRequestIds,
    RESOLVED_PROMPT_REQUEST_ID_CAP,
    requestId,
  );
}
//@ chunk-ck4jrdtf.js:33185-33349 placement
function isResolvedPromptControlResponse(message) {
  let response = message.payload?.response;
  if (typeof response !== "object" || response === null) return false;
  let controlRequestSubtype = getControlRequestSubtype(response);
  return (
    controlRequestSubtype !== undefined &&
    bridgeHostState().attestation.resolvedPromptRequestIds.has(controlRequestSubtype)
  );
}
//@ chunk-ck4jrdtf.js:33349-33368 placement
var DROP_NOTICE_WINDOW_MS = 60000;
var DROP_NOTICE_WINDOW_MAX = 10;
//@ chunk-ck4jrdtf.js:33368-33868 placement
/**
 * 未签名事件被丢弃时去重后通知 dropNotifier / 发送方回执写入器（每个事件 id 只通知一次）。
 */
function notifyDroppedEvent(notice, eventId) {
  let attestation = bridgeHostState().attestation;
  if (attestation.dropNotifier === undefined && attestation.senderDropWriter === undefined) return;
  if (attestation.recentDropEventIds.has(eventId)) return;
  rememberBoundedId(attestation.recentDropEventIds, RECENT_DROP_EVENT_ID_CAP, eventId);
  let dropNoticeWindow =
    notice.payloadType === "control_request"
      ? attestation.commandDropNoticeWindow
      : attestation.messageDropNoticeWindow;
  let now = Date.now();
  if (now - dropNoticeWindow.start >= DROP_NOTICE_WINDOW_MS) {
    dropNoticeWindow.start = now;
    dropNoticeWindow.count = 0;
  }
  dropNoticeWindow.count++;
  if (dropNoticeWindow.count <= DROP_NOTICE_WINDOW_MAX) dispatchDropNotice(notice);
  else if (dropNoticeWindow.count === DROP_NOTICE_WINDOW_MAX + 1)
    dispatchDropNotice({
      status: notice.status,
      payloadType: notice.payloadType,
      ...(notice.subtype !== undefined && {
        subtype: notice.subtype,
      }),
      windowCapped: true,
      ...(notice.isCloud && {
        isCloud: true,
      }),
    });
}
//@ chunk-ck4jrdtf.js:33868-34195 placement
function dispatchDropNotice(notice) {
  let attestation = bridgeHostState().attestation;
  if (attestation.dropNotifier !== undefined)
    try {
      attestation.dropNotifier(notice);
    } catch (error) {
      logForDebugging(
        `${attestationLogPrefix(notice.isCloud === true)} drop notifier threw: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  if (attestation.senderDropWriter !== undefined)
    try {
      let unsignedEventNotice = createUnsignedEventNotice(notice);
      if (unsignedEventNotice) attestation.senderDropWriter(unsignedEventNotice);
    } catch (error) {
      logForDebugging(
        `${attestationLogPrefix(notice.isCloud === true)} drop sender writer threw: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
}
//@ chunk-ck4jrdtf.js:34195-34410 placement
function rememberInboundRequestId(message) {
  let requestId =
    (typeof message.payload?.type === "string" ? message.payload.type : message.event_type) ===
      "control_request" && message.payload
      ? getControlRequestSubtype(message.payload)
      : undefined;
  if (requestId !== undefined && requestId.length <= MAX_KNOWN_REQUEST_ID_CHARS)
    rememberBoundedId(
      bridgeHostState().attestation.knownInboundRequestIds,
      INBOUND_REQUEST_ID_CAP,
      requestId,
    );
}
//@ chunk-ck4jrdtf.js:34410-34569 placement
function noteInboundControlRequestAttestation(requestId, payloadType, isCloudWorker) {
  if (payloadType !== "control_request") return;
  rememberInboundRequestId(requestId);
  if (getControlRequestInfo(requestId) !== undefined)
    logFeatureOk(
      isCloudWorker ? "ccr_worker_control_request_attestation" : "bridge_control_request_attestation",
    );
}
//@ chunk-ck4jrdtf.js:34654-35185 placement
/**
 * 按（状态, 载荷类型）去重记录一次设备签名丢弃诊断与遥测。
 */
function reportAttestationDropOnce(message, status, payloadType, isCloudWorker) {
  try {
    let attestation = bridgeHostState().attestation;
    let reportedCodes = isCloudWorker
      ? attestation.reportedCloudWorkerCodes
      : attestation.reportedStrayDropCodes;
    let payloadClass =
      payloadType === "control_request"
        ? "control_request_other"
        : BRIDGE_FORWARDED_MESSAGE_TYPES.has(payloadType)
          ? payloadType
          : "other_payload_type";
    let code = `${status.toLowerCase()}_${payloadClass}`;
    if (reportedCodes.has(code)) return;
    reportedCodes.add(code);
    logForDebugging(
      `${attestationLogPrefix(isCloudWorker)} DROPPING unverified ${payloadType} event_id=${message.event_id} status=${status} (stray payload class ${code}; counted once per process)`,
      {
        level: "warn",
      },
    );
    logFeatureBad(
      isCloudWorker ? "ccr_worker_stray_event_attestation" : "bridge_stray_event_attestation",
      code,
    );
  } catch (error) {
    logForDebugging(
      `${attestationLogPrefix(isCloudWorker)} stray-drop report threw: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
}
//@ chunk-ck4jrdtf.js:35185-35258 placement
function attestationLogPrefix(isCloudWorker) {
  return isCloudWorker ? "[ccr-worker:attestation]" : "[bridge:attestation]";
}
//@ chunk-ck4jrdtf.js:35258-35622 placement
/**
 * 计算事件的有效签名状态：非云 worker 时把 SERVER_AUTHORED/REPLAYED 视为 UNSPECIFIED；TRANSITIVELY_VOUCHED 在接受级别允许时视为已验证。
 */
function resolveEffectiveAttestation(rawStatus, policy, { isCloudWorker, vouchWithheld = false }) {
  let effectiveStatus =
    !isCloudWorker && (rawStatus === "SERVER_AUTHORED" || rawStatus === "SERVER_REPLAYED")
      ? "UNSPECIFIED"
      : rawStatus;
  let meetsTransitiveLevel =
    effectiveStatus === "TRANSITIVELY_VOUCHED" &&
    meetsAttestationLevel("VERIFIED_KEYLESS_DEVICE", policy.acceptLevel) &&
    !vouchWithheld;
  return {
    status: effectiveStatus,
    meetsLevel: meetsTransitiveLevel || meetsAttestationLevel(effectiveStatus, policy.acceptLevel),
    configException:
      policy.acceptStatuses.has(effectiveStatus) ||
      (effectiveStatus === "TRANSITIVELY_VOUCHED" && policy.acceptStatuses.has("UNSPECIFIED")),
  };
}
//@ chunk-ck4jrdtf.js:35622-38362 placement
/**
 * Remote Control/云会话入站事件的设备签名判定核心：根据事件类型、状态、过滤策略决定接受、提示或丢弃，并处理 user/control_response 的特殊放行。
 */
function evaluateInboundAttestation(message, policy, isCloudWorker, acceptUnstamped, isVouchableModel) {
  let payloadType = typeof message.payload?.type === "string" ? message.payload.type : message.event_type;
  let isUserFacing = payloadType === "user" || payloadType === "control_response";
  let rawStatus = normalizeAttestationStatus(message.device_attestation_status);
  let unstampedUser =
    rawStatus === "TRANSITIVELY_VOUCHED" &&
    payloadType === "user" &&
    !(typeof message.payload.inbound_origin === "string" && message.payload.inbound_origin !== "");
  let unstampedNonUrgent =
    isCloudWorker &&
    rawStatus === "TRANSITIVELY_VOUCHED" &&
    ((payloadType !== "user" && payloadType !== "queued_notification") ||
      message.payload?.priority === "now" ||
      !acceptUnstamped);
  let { status, meetsLevel, configException } = resolveEffectiveAttestation(rawStatus, policy, {
    isCloudWorker,
    vouchWithheld: unstampedUser || unstampedNonUrgent,
  });
  let reasonCode = `${status.toLowerCase()}_${payloadType}${unstampedUser ? "_unstamped" : ""}`;
  let request = message.payload?.request;
  let settingsRefusal =
    isCloudWorker &&
    status === "SERVICE_VOUCHED" &&
    payloadType === "control_request" &&
    ((!ATTESTATION_EXEMPT_CONTROL_SUBTYPES.has(getControlRequestSubtype_2(message) ?? "") &&
      (isVouchableModel === undefined ||
        isServiceVouchedSettingsRequest(message) === undefined ||
        !isStrictSettingsRequestShape(request, isVouchableModel))) ||
      (typeof request === "object" && request !== null && isImmediateInterruptRequest(request)));
  if (meetsLevel && !settingsRefusal) {
    if (isUserFacing)
      logFeatureOk(isCloudWorker ? "ccr_worker_event_attestation" : "bridge_event_attestation");
    noteInboundControlRequestAttestation(message, payloadType, isCloudWorker);
    return false;
  }
  if (!policy.enforce) {
    noteInboundControlRequestAttestation(message, payloadType, isCloudWorker);
    if (status === "UNSPECIFIED") return false;
    if (isUserFacing) {
      logForDebugging(
        `${attestationLogPrefix(isCloudWorker)} accepting unverified ${payloadType} event_id=${message.event_id} status=${status}`,
        {
          level: "info",
        },
      );
      logFeatureSad(isCloudWorker ? "ccr_worker_event_attestation" : "bridge_event_attestation", reasonCode);
    }
    return false;
  }
  let hadConfigException = configException;
  let noticeSuppressed = false;
  if (isUserFacing) {
    let dropReasonCode = reasonCode;
    logForDebugging(
      `${attestationLogPrefix(isCloudWorker)} ${hadConfigException ? "accepting (config exception)" : "DROPPING"} unverified ${payloadType} event_id=${message.event_id} status=${status}`,
      {
        level: hadConfigException ? "info" : "warn",
      },
    );
    if (hadConfigException)
      logFeatureSad(
        isCloudWorker ? "ccr_worker_event_attestation" : "bridge_event_attestation",
        dropReasonCode,
      );
    else if (payloadType === "control_response" && isOwnOutboundControlResponse(message)) {
      noticeSuppressed = true;
      logForDebugging(
        `${attestationLogPrefix(isCloudWorker)} dropped ${payloadType} event_id=${message.event_id} status=${status} answers an automated outbound request; notice suppressed`,
        {
          level: "info",
        },
      );
      logFeatureBad(
        isCloudWorker ? "ccr_worker_event_attestation" : "bridge_event_attestation",
        `${dropReasonCode}_automated_reply`,
      );
    } else if (payloadType === "control_response" && isResolvedPromptControlResponse(message)) {
      noticeSuppressed = true;
      logForDebugging(
        `${attestationLogPrefix(isCloudWorker)} dropped ${payloadType} event_id=${message.event_id} status=${status} is a duplicate answer to an already-resolved prompt; notice suppressed`,
        {
          level: "info",
        },
      );
      logFeatureBad(
        isCloudWorker ? "ccr_worker_event_attestation" : "bridge_event_attestation",
        `${dropReasonCode}_resolved_duplicate`,
      );
    } else if (isCloudWorker && payloadType === "user" && isToolHostEndedReminder(message)) {
      noticeSuppressed = true;
      logForDebugging(
        `${attestationLogPrefix(isCloudWorker)} dropped ${payloadType} event_id=${message.event_id} status=${status} is the service's own linked-computer line; notice suppressed`,
        {
          level: "info",
        },
      );
      logFeatureBad("ccr_worker_event_attestation", `${dropReasonCode}_service_line`);
    } else {
      noticeSuppressed = true;
      logFeatureBad(
        isCloudWorker ? "ccr_worker_event_attestation" : "bridge_event_attestation",
        dropReasonCode,
      );
      notifyDroppedEvent(
        {
          status,
          payloadType,
          ...(isCloudWorker && {
            isCloud: true,
          }),
        },
        message.event_id,
      );
    }
  } else if (payloadType === "control_request" && !hadConfigException) {
    let controlRequestInfo = getControlRequestInfo(message);
    if (controlRequestInfo) {
      noticeSuppressed = true;
      let requestId =
        controlRequestInfo.requestId !== undefined && isKnownControlRequestId(controlRequestInfo.requestId)
          ? undefined
          : controlRequestInfo.requestId;
      logForDebugging(
        `${attestationLogPrefix(isCloudWorker)} DROPPING unverified control_request subtype=${controlRequestInfo.subtype} event_id=${message.event_id} status=${status}${requestId === undefined && controlRequestInfo.requestId !== undefined ? " (forged-id refusal suppressed, or the id is too long)" : ""}`,
        {
          level: "warn",
        },
      );
      logFeatureBad(
        isCloudWorker ? "ccr_worker_control_request_attestation" : "bridge_control_request_attestation",
        `${status.toLowerCase()}_${controlRequestInfo.subtype}`,
      );
      notifyDroppedEvent(
        {
          status,
          payloadType,
          subtype: controlRequestInfo.subtype,
          requestId,
          ...(isCloudWorker && {
            isCloud: true,
          }),
        },
        message.event_id,
      );
    }
  }
  if (!hadConfigException && !noticeSuppressed)
    reportAttestationDropOnce(message, status, payloadType, isCloudWorker);
  if (hadConfigException) noteInboundControlRequestAttestation(message, payloadType, isCloudWorker);
  return !hadConfigException;
}
//@ chunk-ck4jrdtf.js:38362-38436 placement
function evaluateInboundAttestationWithPolicy(message) {
  return evaluateInboundAttestation(
    message,
    bridgeHostState().attestation.filterPolicy?.() ?? DEFAULT_ATTESTATION_POLICY,
    false,
    true,
  );
}
//@ chunk-ck4jrdtf.js:38436-38931 placement
/**
 * 云 worker 通道上非 client 来源的事件按 enforce 策略丢弃或仅告警（"would drop"），再进入签名判定。
 */
function filterInboundEventBySource(message, policy, acceptUnstamped = false, isVouchableModel) {
  if (message.source !== "client") {
    try {
      let reportedCloudWorkerCodes = bridgeHostState().attestation.reportedCloudWorkerCodes;
      if (!reportedCloudWorkerCodes.has("source_not_client")) {
        reportedCloudWorkerCodes.add("source_not_client");
        logForDebugging(
          `${attestationLogPrefix(true)} ${policy.enforce ? "DROPPING" : "would drop"} event_id=${message.event_id}: not marked client-written (counted once per process)`,
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
    if (!policy.enforce) rememberInboundRequestId(message);
    return policy.enforce;
  }
  return evaluateInboundAttestation(message, policy, true, acceptUnstamped, isVouchableModel);
}
export {
  getControlRequestSubtype_2,
  rememberResolvedPromptRequestId,
  rememberElicitationRequestId,
  rememberHostAskRequestId,
  rememberOutboundRequestId,
  rememberDeviceOutboundRequestId,
  resolveEffectiveAttestation,
  isOwnOutboundRequestId,
  isKnownControlRequestId,
  evaluateInboundAttestationWithPolicy,
  rememberInboundRequestId,
  isServiceVouchedSettingsRequest,
  filterInboundEventBySource,
  attestationLogPrefix,
};
