/**
 * bridge/deviceAttestation.ts
 *
 * 2.1.316 新增：设备签名状态枚举规范化、接受级别比较与服务端强制配置解析，未签名活动的用户提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ck4jrdtf.js (17)
 * attribution: placement 17
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, _enum, array } from "../../vendor/zod/v4/classic/schemas.js";
import { bridgeHostState } from "./bridgeHostState.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { errorMessage } from "../utils/errors.js";
import { attestationLogPrefix } from "./attestationGate.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ck4jrdtf.js:26916-27215 placement
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
];
var DEVICE_ATTESTATION_STATUS = "DEVICE_ATTESTATION_STATUS_";
var BASE_DEVICE_ATTESTATION_STATUS_NAMES = [
  "UNSPECIFIED",
  "ABSENT",
  "VERIFIED",
  "VERIFIED_BY_GATE",
  "INVALID",
  "UNCHECKED",
];
//@ chunk-ck4jrdtf.js:27215-27612 placement
/**
 * 把数字枚举/小写字符串形式的 device_attestation_status 规范成大写枚举名（未知值→UNSPECIFIED）。
 */
function normalizeAttestationStatus(deviceAttestationStatus) {
  if (deviceAttestationStatus === undefined || deviceAttestationStatus === null) return "UNSPECIFIED";
  if (typeof deviceAttestationStatus === "number")
    return BASE_DEVICE_ATTESTATION_STATUS_NAMES[deviceAttestationStatus] ?? "UNSPECIFIED";
  if (typeof deviceAttestationStatus !== "string") return "UNSPECIFIED";
  if (deviceAttestationStatus === "server_authored") return "SERVER_AUTHORED";
  if (deviceAttestationStatus === "server_replayed") return "SERVER_REPLAYED";
  if (deviceAttestationStatus === "transitively_vouched") return "TRANSITIVELY_VOUCHED";
  let statusTail = deviceAttestationStatus.startsWith(DEVICE_ATTESTATION_STATUS)
    ? deviceAttestationStatus.slice(DEVICE_ATTESTATION_STATUS.length)
    : deviceAttestationStatus;
  return DEVICE_ATTESTATION_STATUS_NAMES.find((name) => name === statusTail) ?? "UNSPECIFIED";
}
//@ chunk-ck4jrdtf.js:27612-27676 placement
var ATTESTATION_LEVEL_ORDER = ["VERIFIED", "VERIFIED_KEYLESS_DEVICE", "VERIFIED_BY_GATE"];
//@ chunk-ck4jrdtf.js:27676-27732 placement
function weakerAttestationLevel(acceptLevel, acceptLevel_2) {
  return ATTESTATION_LEVEL_ORDER.indexOf(acceptLevel) <= ATTESTATION_LEVEL_ORDER.indexOf(acceptLevel_2)
    ? acceptLevel
    : acceptLevel_2;
}
//@ chunk-ck4jrdtf.js:27732-27845 placement
function meetsAttestationLevel(status, requiredLevel) {
  if (status === "SERVICE_VOUCHED") return true;
  let index = ATTESTATION_LEVEL_ORDER.findIndex((level) => level === status);
  return index !== -1 && index <= ATTESTATION_LEVEL_ORDER.indexOf(requiredLevel);
}
//@ chunk-ck4jrdtf.js:27845-28052 placement
var DEFAULT_ATTESTATION_POLICY; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var UNVERIFIED_ATTESTATION_STATUSES;
var attestationEnforceConfigSchema;
deferInit("chunk-ck4jrdtf.js:27845", () => {
  DEFAULT_ATTESTATION_POLICY = {
    enforce: false,
    acceptLevel: "VERIFIED",
    acceptStatuses: new Set(),
  };
  UNVERIFIED_ATTESTATION_STATUSES = ["UNSPECIFIED", "ABSENT", "INVALID", "UNCHECKED"];
  attestationEnforceConfigSchema = DoctorLazy(() =>
    objectSchema({
      accept_level: _enum(ATTESTATION_LEVEL_ORDER).default("VERIFIED"),
      accept_statuses: array(_enum(UNVERIFIED_ATTESTATION_STATUSES)).default([]),
    }),
  );
});
//@ chunk-ck4jrdtf.js:28052-28617 placement
/**
 * 解析服务端下发的签名强制配置（accept_level/accept_statuses）；格式错误时只告警一次并保守回落到 VERIFIED。
 */
function parseAttestationEnforceConfig(config) {
  let attestation = bridgeHostState().attestation;
  let parsed = attestationEnforceConfigSchema().safeParse(config);
  if (!parsed.success && !attestation.malformedConfigReported) {
    attestation.malformedConfigReported = true;
    try {
      logForDebugging(
        `[bridge:attestation] malformed enforce config \u2014 failing closed to accept_level=VERIFIED with no accept_statuses: ${parsed.error.message}`,
        {
          level: "error",
        },
      );
      logFeatureSad("bridge_event_attestation", "malformed_config");
    } catch (error) {
      logForDebugging(`[bridge:attestation] malformed-config report threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  return {
    enforce: true,
    acceptLevel: parsed.success ? parsed.data.accept_level : "VERIFIED",
    acceptStatuses: new Set(parsed.success ? parsed.data.accept_statuses : []),
  };
}
//@ chunk-ck4jrdtf.js:28617-28916 placement
function reportAttestationHeaderUnreadable(fault) {
  try {
    let reportedCloudWorkerCodes = bridgeHostState().attestation.reportedCloudWorkerCodes;
    if (reportedCloudWorkerCodes.has(fault)) return;
    reportedCloudWorkerCodes.add(fault);
    logForDebugging(
      `${attestationLogPrefix(true)} the attestation policy header could not be read whole (${fault})`,
      {
        level: "error",
      },
    );
    logFeatureSad("ccr_worker_attestation_policy", fault);
  } catch (error) {
    logForDebugging(`${attestationLogPrefix(true)} policy-fault report threw: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-ck4jrdtf.js:28916-28964 placement
function setAttestationFilterPolicy(filterPolicy) {
  bridgeHostState().attestation.filterPolicy = filterPolicy;
}
//@ chunk-ck4jrdtf.js:28964-29012 placement
function setDropNotifier(dropNotifier) {
  bridgeHostState().attestation.dropNotifier = dropNotifier;
}
//@ chunk-ck4jrdtf.js:29012-29095 placement
function clearDropNotifier(attestationDropNotifier) {
  let attestation = bridgeHostState().attestation;
  if (attestation.dropNotifier === attestationDropNotifier) attestation.dropNotifier = undefined;
}
//@ chunk-ck4jrdtf.js:29095-29147 placement
function setSenderDropWriter(senderDropWriter) {
  bridgeHostState().attestation.senderDropWriter = senderDropWriter;
}
//@ chunk-ck4jrdtf.js:29147-29238 placement
function clearSenderDropWriter(writer) {
  let attestation = bridgeHostState().attestation;
  if (attestation.senderDropWriter === writer) attestation.senderDropWriter = undefined;
}
//@ chunk-ck4jrdtf.js:29238-29270 placement
var REMOTE_IO_WARNING_PREFIX = "[remote-io] warning: ";
//@ chunk-ck4jrdtf.js:29270-29982 placement
function describeUnsignedEvent({ status, payloadType, subtype, isCloud }) {
  let unsupportedAppHint = isCloud
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
              ? unsupportedAppHint
              : status === "TRANSITIVELY_VOUCHED"
                ? "It came from an automated cloud session, not from a person."
                : undefined,
  };
}
//@ chunk-ck4jrdtf.js:29982-30318 placement
/**
 * 生成"远端活动缺少有效设备签名被忽略"的用户提示，突发时只提示一次。
 */
function formatUnsignedEventWarning(notice) {
  let subject = notice.isCloud ? "This session" : "Remote Control";
  if (notice.windowCapped)
    return `${subject} is rejecting a burst of unsigned remote activity; further warnings for this burst are suppressed.`;
  let { what, hint } = describeUnsignedEvent(notice);
  return `${subject} ignored a ${what} that arrived without a valid device signature (attestation: ${notice.status}).${hint ? ` ${hint}` : ""}`;
}
//@ chunk-ck4jrdtf.js:30318-30478 placement
function formatUnsignedEventNotice(notice) {
  let { what, hint } = describeUnsignedEvent(notice);
  return `This ${what} arrived without a valid device signature (attestation: ${notice.status}) and was ignored.${hint ? ` ${hint}` : ""}`;
}
export {
  normalizeAttestationStatus,
  setAttestationFilterPolicy,
  meetsAttestationLevel,
  REMOTE_IO_WARNING_PREFIX,
  formatUnsignedEventWarning,
  formatUnsignedEventNotice,
  setSenderDropWriter,
  setDropNotifier,
  reportAttestationHeaderUnreadable,
  clearSenderDropWriter,
  clearDropNotifier,
  describeUnsignedEvent,
  DEFAULT_ATTESTATION_POLICY,
  parseAttestationEnforceConfig,
  weakerAttestationLevel,
};
