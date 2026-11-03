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
import { ao } from "./bridgeHostState.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { getControlRequestInfo } from "../services/api/claude.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { BRIDGE_FORWARDED_MESSAGE_TYPES } from "../entrypoints/sdk/controlSchemas.js";
import { Sat } from "../cli/print.js";

/**
 * 取 payload.request.subtype（控制请求子类型），不是字符串时返回 undefined。疑似归错文件。
 */
//@ chunk-1qpz7qcd.js:30552-30692 affinity
function getControlRequestSubtype_2(e) {
  let r = e.payload?.request,
    n = typeof r === "object" && r !== null && "subtype" in r ? r.subtype : void 0;
  return typeof n === "string" ? n : void 0;
}
//@ chunk-1qpz7qcd.js:30692-30743 placement
var at = new Set(["interrupt", "end_session"]),
  dt = 128;
/**
 * 服务端担保（SERVICE_VOUCHED）的 control_request 且子类型为 set_model/apply_flag_settings、载荷形状严格匹配时返回 true，用于放行无设备签名但由服务端担保的设置类请求。
 */
//@ chunk-1qpz7qcd.js:30743-30992 placement
function isServiceVouchedSettingsRequest(e) {
  let r = getControlRequestSubtype_2(e),
    n = e.payload ? getControlRequestSubtype(e.payload) : void 0;
  return normalizeAttestationStatus(e.device_attestation_status) === "SERVICE_VOUCHED" &&
    e.payload?.type === "control_request" &&
    (r === "set_model" || r === "apply_flag_settings") &&
    typeof n === "string" &&
    n.length <= dt
    ? n
    : void 0;
}
/**
 * 校验 set_model / apply_flag_settings 请求对象只含预期键（model,subtype 或 settings,subtype）。
 */
//@ chunk-1qpz7qcd.js:30992-31505 placement
function isStrictSettingsRequestShape(e, r) {
  if (typeof e !== "object" || e === null) return !1;
  let n = "subtype" in e ? e.subtype : void 0,
    joined = Object.keys(e).sort().join();
  if (n === "set_model") {
    let v = "model" in e ? e.model : void 0;
    return joined === "model,subtype" && typeof v === "string" && r(v);
  }
  let i = "settings" in e ? e.settings : void 0;
  if (n !== "apply_flag_settings" || joined !== "settings,subtype" || typeof i !== "object" || i === null)
    return !1;
  let entries = Object.entries(i);
  return (
    entries.every(
      ([v, D]) =>
        (v === "effortLevel" && EFFORT_LEVELS.some((y) => y === D)) || (v === "ultracode" && D === !1),
    ) && entries.some(([v]) => v === "effortLevel")
  );
}
//@ chunk-1qpz7qcd.js:31505-31537 placement
var lt = 2000,
  Q = 200,
  Re = 128,
  pt = 256;
//@ chunk-1qpz7qcd.js:31537-31623 placement
function F(e, r, n) {
  if ((e.delete(n), e.add(n), e.size > r))
    for (let s of e) {
      e.delete(s);
      break;
    }
}
/**
 * 请求 id 是否超长或已记录为入站/出站/elicitation/宿主询问请求，用于识别"自己发出的请求的应答"。
 */
//@ chunk-1qpz7qcd.js:31623-31824 placement
function isKnownControlRequestId(e) {
  let attestation = ao().attestation;
  return (
    e.length > Re ||
    attestation.knownInboundRequestIds.has(e) ||
    attestation.knownOutboundRequestIds.has(e) ||
    attestation.elicitationOutboundRequestIds.has(e) ||
    attestation.hostAskOutboundRequestIds.has(e)
  );
}
//@ chunk-1qpz7qcd.js:31824-31943 placement
function isOwnOutboundRequestId(e) {
  let attestation = ao().attestation;
  return attestation.knownOutboundRequestIds.has(e) || attestation.elicitationOutboundRequestIds.has(e);
}
/**
 * 记录本端发出的 control_request id（带上限的集合），automated=true 时同时记入自动请求集合。
 */
//@ chunk-1qpz7qcd.js:31943-32071 placement
function rememberOutboundRequestId(e, { automated: automated }) {
  let attestation = ao().attestation;
  if ((F(attestation.knownOutboundRequestIds, Q, e), automated))
    F(attestation.automatedOutboundRequestIds, Q, e);
}
//@ chunk-1qpz7qcd.js:32071-32082 placement
var ct = 512;
//@ chunk-1qpz7qcd.js:32082-32148 placement
function rememberDeviceOutboundRequestId(e) {
  F(ao().attestation.deviceOutboundRequestIds, ct, e);
}
//@ chunk-1qpz7qcd.js:32148-32218 placement
function rememberElicitationRequestId(e) {
  F(ao().attestation.elicitationOutboundRequestIds, Q, e);
}
//@ chunk-1qpz7qcd.js:32218-32284 placement
function rememberHostAskRequestId(e) {
  F(ao().attestation.hostAskOutboundRequestIds, Q, e);
}
//@ chunk-1qpz7qcd.js:32284-32528 placement
function isOwnOutboundControlResponse(e) {
  let r = e.payload?.response;
  if (typeof r !== "object" || r === null) return !1;
  let n = getControlRequestSubtype(r),
    attestation = ao().attestation;
  return (
    n !== void 0 &&
    (attestation.automatedOutboundRequestIds.has(n) ||
      attestation.deviceOutboundRequestIds.has(n) ||
      attestation.hostAskOutboundRequestIds.has(n))
  );
}
//@ chunk-1qpz7qcd.js:32528-32605 placement
function gt(e) {
  return e.payload?.inbound_origin === "tool_host_ended_reminder";
}
//@ chunk-1qpz7qcd.js:32605-32616 placement
var ft = 200;
//@ chunk-1qpz7qcd.js:32616-32682 placement
function rememberResolvedPromptRequestId(e) {
  F(ao().attestation.resolvedPromptRequestIds, ft, e);
}
//@ chunk-1qpz7qcd.js:32682-32846 placement
function isResolvedPromptControlResponse(e) {
  let r = e.payload?.response;
  if (typeof r !== "object" || r === null) return !1;
  let n = getControlRequestSubtype(r);
  return n !== void 0 && ao().attestation.resolvedPromptRequestIds.has(n);
}
//@ chunk-1qpz7qcd.js:32846-32865 placement
var mt = 60000,
  Ee = 10;
/**
 * 未签名事件被丢弃时去重后通知 dropNotifier / 发送方回执写入器（每个事件 id 只通知一次）。
 */
//@ chunk-1qpz7qcd.js:32865-33365 placement
function notifyDroppedEvent(e, r) {
  let attestation = ao().attestation;
  if (attestation.dropNotifier === void 0 && attestation.senderDropWriter === void 0) return;
  if (attestation.recentDropEventIds.has(r)) return;
  F(attestation.recentDropEventIds, pt, r);
  let s =
      e.payloadType === "control_request"
        ? attestation.commandDropNoticeWindow
        : attestation.messageDropNoticeWindow,
    now = Date.now();
  if (now - s.start >= mt) ((s.start = now), (s.count = 0));
  if ((s.count++, s.count <= Ee)) dispatchDropNotice(e);
  else if (s.count === Ee + 1)
    dispatchDropNotice({
      status: e.status,
      payloadType: e.payloadType,
      ...(e.subtype !== void 0 && { subtype: e.subtype }),
      windowCapped: !0,
      ...(e.isCloud && { isCloud: !0 }),
    });
}
//@ chunk-1qpz7qcd.js:33365-33692 placement
function dispatchDropNotice(e) {
  let attestation = ao().attestation;
  if (attestation.dropNotifier !== void 0)
    try {
      attestation.dropNotifier(e);
    } catch (error) {
      logForDebugging(`${x(e.isCloud === !0)} drop notifier threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  if (attestation.senderDropWriter !== void 0)
    try {
      let n = createUnsignedEventNotice(e);
      if (n) attestation.senderDropWriter(n);
    } catch (error) {
      logForDebugging(`${x(e.isCloud === !0)} drop sender writer threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
}
//@ chunk-1qpz7qcd.js:33692-33907 placement
function rememberInboundRequestId(e) {
  let n =
    (typeof e.payload?.type === "string" ? e.payload.type : e.event_type) === "control_request" && e.payload
      ? getControlRequestSubtype(e.payload)
      : void 0;
  if (n !== void 0 && n.length <= Re) F(ao().attestation.knownInboundRequestIds, lt, n);
}
//@ chunk-1qpz7qcd.js:33907-34066 placement
function noteInboundControlRequestAttestation(e, r, n) {
  if (r !== "control_request") return;
  if ((rememberInboundRequestId(e), getControlRequestInfo(e) !== void 0))
    logFeatureOk(n ? "ccr_worker_control_request_attestation" : "bridge_control_request_attestation");
}
/**
 * 按（状态, 载荷类型）去重记录一次设备签名丢弃诊断与遥测。
 */
//@ chunk-1qpz7qcd.js:34151-34682 placement
function reportAttestationDropOnce(e, r, n, s) {
  try {
    let attestation = ao().attestation,
      b = s ? attestation.reportedCloudWorkerCodes : attestation.reportedStrayDropCodes,
      v =
        n === "control_request"
          ? "control_request_other"
          : BRIDGE_FORWARDED_MESSAGE_TYPES.has(n)
            ? n
            : "other_payload_type",
      D = `${r.toLowerCase()}_${v}`;
    if (b.has(D)) return;
    (b.add(D),
      logForDebugging(
        `${x(s)} DROPPING unverified ${n} event_id=${e.event_id} status=${r} (stray payload class ${D}; counted once per process)`,
        { level: "warn" },
      ),
      logFeatureBad(s ? "ccr_worker_stray_event_attestation" : "bridge_stray_event_attestation", D));
  } catch (error) {
    logForDebugging(`${x(s)} stray-drop report threw: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-1qpz7qcd.js:34682-34755 placement
function x(e) {
  return e ? "[ccr-worker:attestation]" : "[bridge:attestation]";
}
/**
 * 计算事件的有效签名状态：非云 worker 时把 SERVER_AUTHORED/REPLAYED 视为 UNSPECIFIED；TRANSITIVELY_VOUCHED 在接受级别允许时视为已验证。
 */
//@ chunk-1qpz7qcd.js:34755-35119 placement
function resolveEffectiveAttestation(
  e,
  r,
  { isCloudWorker: isCloudWorker, vouchWithheld: vouchWithheld = !1 },
) {
  let i = !isCloudWorker && (e === "SERVER_AUTHORED" || e === "SERVER_REPLAYED") ? "UNSPECIFIED" : e,
    b =
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
/**
 * Remote Control/云会话入站事件的设备签名判定核心：根据事件类型、状态、过滤策略决定接受、提示或丢弃，并处理 user/control_response 的特殊放行。
 */
//@ chunk-1qpz7qcd.js:35119-37859 placement
function evaluateInboundAttestation(e, r, n, s, i) {
  let b = typeof e.payload?.type === "string" ? e.payload.type : e.event_type,
    v = b === "user" || b === "control_response",
    D = normalizeAttestationStatus(e.device_attestation_status),
    y =
      D === "TRANSITIVELY_VOUCHED" &&
      b === "user" &&
      !(typeof e.payload.inbound_origin === "string" && e.payload.inbound_origin !== ""),
    C =
      n &&
      D === "TRANSITIVELY_VOUCHED" &&
      ((b !== "user" && b !== "queued_notification") || e.payload?.priority === "now" || !s),
    {
      status: status,
      meetsLevel: meetsLevel,
      configException: configException,
    } = resolveEffectiveAttestation(D, r, { isCloudWorker: n, vouchWithheld: y || C }),
    B = `${status.toLowerCase()}_${b}${y ? "_unstamped" : ""}`,
    V = e.payload?.request,
    X =
      n &&
      status === "SERVICE_VOUCHED" &&
      b === "control_request" &&
      ((!at.has(getControlRequestSubtype_2(e) ?? "") &&
        (i === void 0 ||
          isServiceVouchedSettingsRequest(e) === void 0 ||
          !isStrictSettingsRequestShape(V, i))) ||
        (typeof V === "object" && V !== null && Sat(V)));
  if (meetsLevel && !X) {
    if (v) logFeatureOk(n ? "ccr_worker_event_attestation" : "bridge_event_attestation");
    return (noteInboundControlRequestAttestation(e, b, n), !1);
  }
  if (!r.enforce) {
    if ((noteInboundControlRequestAttestation(e, b, n), status === "UNSPECIFIED")) return !1;
    if (v)
      (logForDebugging(`${x(n)} accepting unverified ${b} event_id=${e.event_id} status=${status}`, {
        level: "info",
      }),
        logFeatureSad(n ? "ccr_worker_event_attestation" : "bridge_event_attestation", B));
    return !1;
  }
  let N = configException,
    L = !1;
  if (v) {
    let w = B;
    if (
      (logForDebugging(
        `${x(n)} ${N ? "accepting (config exception)" : "DROPPING"} unverified ${b} event_id=${e.event_id} status=${status}`,
        { level: N ? "info" : "warn" },
      ),
      N)
    )
      logFeatureSad(n ? "ccr_worker_event_attestation" : "bridge_event_attestation", w);
    else if (b === "control_response" && isOwnOutboundControlResponse(e))
      ((L = !0),
        logForDebugging(
          `${x(n)} dropped ${b} event_id=${e.event_id} status=${status} answers an automated outbound request; notice suppressed`,
          { level: "info" },
        ),
        logFeatureBad(
          n ? "ccr_worker_event_attestation" : "bridge_event_attestation",
          `${w}_automated_reply`,
        ));
    else if (b === "control_response" && isResolvedPromptControlResponse(e))
      ((L = !0),
        logForDebugging(
          `${x(n)} dropped ${b} event_id=${e.event_id} status=${status} is a duplicate answer to an already-resolved prompt; notice suppressed`,
          { level: "info" },
        ),
        logFeatureBad(
          n ? "ccr_worker_event_attestation" : "bridge_event_attestation",
          `${w}_resolved_duplicate`,
        ));
    else if (n && b === "user" && gt(e))
      ((L = !0),
        logForDebugging(
          `${x(n)} dropped ${b} event_id=${e.event_id} status=${status} is the service's own linked-computer line; notice suppressed`,
          { level: "info" },
        ),
        logFeatureBad("ccr_worker_event_attestation", `${w}_service_line`));
    else
      ((L = !0),
        logFeatureBad(n ? "ccr_worker_event_attestation" : "bridge_event_attestation", w),
        notifyDroppedEvent({ status: status, payloadType: b, ...(n && { isCloud: !0 }) }, e.event_id));
  } else if (b === "control_request" && !N) {
    let w = getControlRequestInfo(e);
    if (w) {
      L = !0;
      let j = w.requestId !== void 0 && isKnownControlRequestId(w.requestId) ? void 0 : w.requestId;
      (logForDebugging(
        `${x(n)} DROPPING unverified control_request subtype=${w.subtype} event_id=${e.event_id} status=${status}${j === void 0 && w.requestId !== void 0 ? " (forged-id refusal suppressed, or the id is too long)" : ""}`,
        { level: "warn" },
      ),
        logFeatureBad(
          n ? "ccr_worker_control_request_attestation" : "bridge_control_request_attestation",
          `${status.toLowerCase()}_${w.subtype}`,
        ),
        notifyDroppedEvent(
          { status: status, payloadType: b, subtype: w.subtype, requestId: j, ...(n && { isCloud: !0 }) },
          e.event_id,
        ));
    }
  }
  if (!N && !L) reportAttestationDropOnce(e, status, b, n);
  if (N) noteInboundControlRequestAttestation(e, b, n);
  return !N;
}
//@ chunk-1qpz7qcd.js:37859-37933 placement
function evaluateInboundAttestationWithPolicy(e) {
  return evaluateInboundAttestation(
    e,
    ao().attestation.filterPolicy?.() ?? DEFAULT_ATTESTATION_POLICY,
    !1,
    !0,
  );
}
/**
 * 云 worker 通道上非 client 来源的事件按 enforce 策略丢弃或仅告警（"would drop"），再进入签名判定。
 */
//@ chunk-1qpz7qcd.js:37933-38428 placement
function filterInboundEventBySource(e, r, n = !1, s) {
  if (e.source !== "client") {
    try {
      let reportedCloudWorkerCodes = ao().attestation.reportedCloudWorkerCodes;
      if (!reportedCloudWorkerCodes.has("source_not_client"))
        (reportedCloudWorkerCodes.add("source_not_client"),
          logForDebugging(
            `${x(!0)} ${r.enforce ? "DROPPING" : "would drop"} event_id=${e.event_id}: not marked client-written (counted once per process)`,
            { level: "warn" },
          ),
          logFeatureBad("ccr_worker_stray_event_attestation", "source_not_client"));
    } catch (error) {
      logForDebugging(`${x(!0)} source-drop report threw: ${errorMessage(error)}`, { level: "error" });
    }
    if (!r.enforce) rememberInboundRequestId(e);
    return r.enforce;
  }
  return evaluateInboundAttestation(e, r, !0, n, s);
}

export {
  resolveEffectiveAttestation,
  getControlRequestSubtype_2,
  x,
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
