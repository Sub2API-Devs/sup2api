/**
 * bridge/deviceAttestation.ts
 *
 * 2.1.316 新增：设备签名状态枚举规范化、接受级别比较与服务端强制配置解析，未签名活动的用户提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1qpz7qcd.js (17)
 * attribution: placement 17
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, U, A } from "../../vendor/zod/v4/classic/schemas.js";
import { ao } from "./bridgeHostState.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { errorMessage } from "../utils/errors.js";
import { x } from "./attestationGate.js";

//@ chunk-1qpz7qcd.js:26413-26712 placement
var DEVICE_ATTESTATION_STATUS_NAMES = [
    "UNSPECIFIED",
    "ABSENT",
    "VERIFIED",
    "VERIFIED_BY_GATE",
    "INVALID",
    "UNCHECKED",
    "VERIFIED_KEYLESS_DEVICE",
    "SERVICE_VOUCHED",
    "SERVER_AUTHORED",
    "SERVER_REPLAYED",
    "TRANSITIVELY_VOUCHED",
  ],
  DEVICE_ATTESTATION_STATUS = "DEVICE_ATTESTATION_STATUS_",
  BASE_DEVICE_ATTESTATION_STATUS_NAMES = [
    "UNSPECIFIED",
    "ABSENT",
    "VERIFIED",
    "VERIFIED_BY_GATE",
    "INVALID",
    "UNCHECKED",
  ];
/**
 * 把数字枚举/小写字符串形式的 device_attestation_status 规范成大写枚举名（未知值→UNSPECIFIED）。
 */
//@ chunk-1qpz7qcd.js:26712-27109 placement
function normalizeAttestationStatus(e) {
  if (e === void 0 || e === null) return "UNSPECIFIED";
  if (typeof e === "number") return BASE_DEVICE_ATTESTATION_STATUS_NAMES[e] ?? "UNSPECIFIED";
  if (typeof e !== "string") return "UNSPECIFIED";
  if (e === "server_authored") return "SERVER_AUTHORED";
  if (e === "server_replayed") return "SERVER_REPLAYED";
  if (e === "transitively_vouched") return "TRANSITIVELY_VOUCHED";
  let r = e.startsWith(DEVICE_ATTESTATION_STATUS) ? e.slice(DEVICE_ATTESTATION_STATUS.length) : e;
  return DEVICE_ATTESTATION_STATUS_NAMES.find((n) => n === r) ?? "UNSPECIFIED";
}
//@ chunk-1qpz7qcd.js:27109-27173 placement
var G = ["VERIFIED", "VERIFIED_KEYLESS_DEVICE", "VERIFIED_BY_GATE"];
//@ chunk-1qpz7qcd.js:27173-27229 placement
function weakerAttestationLevel(e, r) {
  return G.indexOf(e) <= G.indexOf(r) ? e : r;
}
//@ chunk-1qpz7qcd.js:27229-27342 placement
function meetsAttestationLevel(e, r) {
  if (e === "SERVICE_VOUCHED") return !0;
  let index = G.findIndex((s) => s === e);
  return index !== -1 && index <= G.indexOf(r);
}
//@ chunk-1qpz7qcd.js:27342-27549 placement
var DEFAULT_ATTESTATION_POLICY = { enforce: !1, acceptLevel: "VERIFIED", acceptStatuses: new Set() },
  nt = ["UNSPECIFIED", "ABSENT", "INVALID", "UNCHECKED"],
  ot = DoctorLazy(() => u({ accept_level: U(G).default("VERIFIED"), accept_statuses: A(U(nt)).default([]) }));
/**
 * 解析服务端下发的签名强制配置（accept_level/accept_statuses）；格式错误时只告警一次并保守回落到 VERIFIED。
 */
//@ chunk-1qpz7qcd.js:27549-28114 placement
function parseAttestationEnforceConfig(e) {
  let attestation = ao().attestation,
    safeParse = ot().safeParse(e);
  if (!safeParse.success && !attestation.malformedConfigReported) {
    attestation.malformedConfigReported = !0;
    try {
      (logForDebugging(
        `[bridge:attestation] malformed enforce config \u2014 failing closed to accept_level=VERIFIED with no accept_statuses: ${safeParse.error.message}`,
        { level: "error" },
      ),
        logFeatureSad("bridge_event_attestation", "malformed_config"));
    } catch (error) {
      logForDebugging(`[bridge:attestation] malformed-config report threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  return {
    enforce: !0,
    acceptLevel: safeParse.success ? safeParse.data.accept_level : "VERIFIED",
    acceptStatuses: new Set(safeParse.success ? safeParse.data.accept_statuses : []),
  };
}
//@ chunk-1qpz7qcd.js:28114-28413 placement
function reportAttestationHeaderUnreadable(e) {
  try {
    let reportedCloudWorkerCodes = ao().attestation.reportedCloudWorkerCodes;
    if (reportedCloudWorkerCodes.has(e)) return;
    (reportedCloudWorkerCodes.add(e),
      logForDebugging(`${x(!0)} the attestation policy header could not be read whole (${e})`, {
        level: "error",
      }),
      logFeatureSad("ccr_worker_attestation_policy", e));
  } catch (error) {
    logForDebugging(`${x(!0)} policy-fault report threw: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-1qpz7qcd.js:28413-28461 placement
function setAttestationFilterPolicy(e) {
  ao().attestation.filterPolicy = e;
}
//@ chunk-1qpz7qcd.js:28461-28509 placement
function setDropNotifier(e) {
  ao().attestation.dropNotifier = e;
}
//@ chunk-1qpz7qcd.js:28509-28592 placement
function clearDropNotifier(e) {
  let attestation = ao().attestation;
  if (attestation.dropNotifier === e) attestation.dropNotifier = void 0;
}
//@ chunk-1qpz7qcd.js:28592-28644 placement
function setSenderDropWriter(e) {
  ao().attestation.senderDropWriter = e;
}
//@ chunk-1qpz7qcd.js:28644-28735 placement
function clearSenderDropWriter(e) {
  let attestation = ao().attestation;
  if (attestation.senderDropWriter === e) attestation.senderDropWriter = void 0;
}
//@ chunk-1qpz7qcd.js:28735-28767 placement
var REMOTE_IO_WARNING_PREFIX = "[remote-io] warning: ";
//@ chunk-1qpz7qcd.js:28767-29479 placement
function describeUnsignedEvent({
  status: status,
  payloadType: payloadType,
  subtype: subtype,
  isCloud: isCloud,
}) {
  let i = isCloud
    ? "The app that sent it doesn't sign its activity. Use an app that does."
    : "The app that sent it doesn't sign its activity. Use the terminal or an app that does.";
  return {
    what:
      payloadType === "control_response"
        ? "permission response"
        : payloadType === "control_request"
          ? `remote command (${subtype})`
          : "message",
    hint:
      isCloud && status === "ABSENT"
        ? "If you sent it, try again or sign in again."
        : isCloud && status === "VERIFIED_BY_GATE"
          ? "If you sent it, signing in again may fix this."
          : status === "ABSENT" || status === "INVALID"
            ? "Re-pair the sending device in Trusted Devices."
            : status === "VERIFIED_BY_GATE" || status === "VERIFIED_KEYLESS_DEVICE"
              ? i
              : status === "TRANSITIVELY_VOUCHED"
                ? "It came from an automated cloud session, not from a person."
                : void 0,
  };
}
/**
 * 生成"远端活动缺少有效设备签名被忽略"的用户提示，突发时只提示一次。
 */
//@ chunk-1qpz7qcd.js:29479-29815 placement
function formatUnsignedEventWarning(e) {
  let r = e.isCloud ? "This session" : "Remote Control";
  if (e.windowCapped)
    return `${r} is rejecting a burst of unsigned remote activity; further warnings for this burst are suppressed.`;
  let { what: what, hint: hint } = describeUnsignedEvent(e);
  return `${r} ignored a ${what} that arrived without a valid device signature (attestation: ${e.status}).${hint ? ` ${hint}` : ""}`;
}
//@ chunk-1qpz7qcd.js:29815-29975 placement
function formatUnsignedEventNotice(e) {
  let { what: what, hint: hint } = describeUnsignedEvent(e);
  return `This ${what} arrived without a valid device signature (attestation: ${e.status}) and was ignored.${hint ? ` ${hint}` : ""}`;
}

export {
  normalizeAttestationStatus,
  DEFAULT_ATTESTATION_POLICY,
  parseAttestationEnforceConfig,
  weakerAttestationLevel,
  setAttestationFilterPolicy,
  setDropNotifier,
  formatUnsignedEventWarning,
  describeUnsignedEvent,
  formatUnsignedEventNotice,
  meetsAttestationLevel,
  clearSenderDropWriter,
  setSenderDropWriter,
  REMOTE_IO_WARNING_PREFIX,
  reportAttestationHeaderUnreadable,
  clearDropNotifier,
};
