/**
 * bridge/deviceBinder.ts
 *
 * 2.1.316 新增。准备设备绑定器：签 session_bind、tool_host_link、tool_host_resume 等载荷，失败时以未绑定继续。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ehqcegwt.js (26)
 * attribution: placement 26
 */
import { normalizeUuidOrNull } from "../utils/agentId.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../utils/errors.js";
import { uniq } from "../utils/collections.js";
import { primeWindowsProfileDirs } from "../services/remoteTools/windowsProfileDirs.js";
import { launchedFromHome } from "../services/remoteTools/servingGates.js";
import { err, ok } from "../utils/resultError.js";
import { isDeviceBindingAllowed } from "./deviceBindingPolicy.js";
import { resolveDeviceBindingRecord, getHostAccountUuid } from "./deviceBindingRecord.js";
import { isViolinWoodEnabled } from "../services/analytics/violinGates.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import {
  deviceDisplayName,
  registerDeviceCached,
  DeviceKeyRefusedError,
  reregisterDevice,
  forgetRegisteredRow,
  DeviceLimitReachedError,
  DeviceRegistrationUnavailableError,
} from "./deviceRegistry.js";
import { withFeatureTelemetry, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { launchLocationFacts } from "../services/remoteTools/launchLocation.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ehqcegwt.js:703-780 placement
var DEVICE_REGISTRY_KID_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var buffer;
deferInit("chunk-ehqcegwt.js:703", () => {
  DEVICE_REGISTRY_KID_PREFIX = "creg_";
  buffer = Buffer.from("anthropic.ccr.create_session_bind.v1", "utf8");
});
//@ chunk-ehqcegwt.js:780-928 placement
function uuidToBytes(uuid) {
  if (!normalizeUuidOrNull(uuid))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `deviceBind: malformed UUID '${uuid}'`,
      "deviceBind: malformed UUID",
    );
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}
//@ chunk-ehqcegwt.js:928-1099 placement
/**
 * session_bind 签名载荷编码
 */
function encodeSessionBindPayload(orgUuid, accountUuid, deviceUuid, issuedAtMs) {
  let payload = Buffer.alloc(buffer.length + 48 + 8);
  let offset = 0;
  offset += buffer.copy(payload, offset);
  offset += uuidToBytes(orgUuid).copy(payload, offset);
  offset += uuidToBytes(accountUuid).copy(payload, offset);
  offset += uuidToBytes(deviceUuid).copy(payload, offset);
  payload.writeBigUInt64BE(BigInt(issuedAtMs), offset);
  return payload;
}
//@ chunk-ehqcegwt.js:1099-1316 placement
/**
 * 用设备密钥签 session_bind，返回 kid/签名/时间
 */
async function signSessionBind(orgUuid, accountUuid, deviceUuid, key) {
  let now = Date.now();
  let signature = await key.sign(encodeSessionBindPayload(orgUuid, accountUuid, deviceUuid, now));
  return {
    deviceUUID: deviceUuid,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUuid,
    signature: signature.toString("base64"),
    issuedAt: new Date(now).toISOString(),
    signedOver: {
      orgUuid,
      accountUuid,
      issuedAtMs: now,
    },
  };
}
//@ chunk-ehqcegwt.js:1316-1415 placement
var buffer_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEVICE_UUID_BIND_PLACEHOLDER;
deferInit("chunk-ehqcegwt.js:1316", () => {
  buffer_2 = Buffer.from("anthropic.ccr.session_bind.v1", "utf8");
  DEVICE_UUID_BIND_PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
});
//@ chunk-ehqcegwt.js:1415-1716 placement
/**
 * create_session_bind 签名载荷的二进制编码
 */
function encodeCreateSessionBindPayload({
  orgUuid,
  accountUuid,
  sessionUuid,
  expectedCurrentDeviceUuid,
  newDeviceUuid,
  issuedAtMs,
}) {
  let payload = Buffer.alloc(buffer_2.length + 80 + 8);
  let offset = 0;
  offset += buffer_2.copy(payload, offset);
  offset += uuidToBytes(orgUuid).copy(payload, offset);
  offset += uuidToBytes(accountUuid).copy(payload, offset);
  offset += uuidToBytes(sessionUuid).copy(payload, offset);
  offset += uuidToBytes(expectedCurrentDeviceUuid ?? DEVICE_UUID_BIND_PLACEHOLDER).copy(payload, offset);
  offset += uuidToBytes(newDeviceUuid).copy(payload, offset);
  payload.writeBigUInt64BE(BigInt(issuedAtMs), offset);
  return payload;
}
//@ chunk-ehqcegwt.js:1716-2038 placement
async function signSessionLateLink({ orgUuid, accountUuid, sessionUuid, deviceUUID, key, now = Date.now }) {
  let issuedAtMs = now();
  let signature = await key.sign(
    encodeCreateSessionBindPayload({
      orgUuid,
      accountUuid,
      sessionUuid,
      expectedCurrentDeviceUuid: undefined,
      newDeviceUuid: deviceUUID,
      issuedAtMs,
    }),
  );
  return {
    deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: signature.toString("base64"),
    issuedAt: new Date(issuedAtMs).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:2038-2181 placement
var buffer_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var buffer_4;
var TOOL_HOST_NAME_PATTERN;
var MAX_TOOL_HOST_LINKS;
deferInit("chunk-ehqcegwt.js:2038", () => {
  buffer_3 = Buffer.from("anthropic.ccr.tool_host_link.v1", "utf8");
  buffer_4 = Buffer.from("anthropic.ccr.tool_host_link.v2", "utf8");
  TOOL_HOST_NAME_PATTERN = /^[a-z0-9_.]{1,48}$/;
  MAX_TOOL_HOST_LINKS = 8;
});
//@ chunk-ehqcegwt.js:2181-2245 placement
function encodeToolHostLinkPayloadV1(header) {
  return Buffer.concat([buffer_3, ...encodeToolHostLinkHeader(header), u64be(header.issuedAtMs)]);
}
//@ chunk-ehqcegwt.js:2245-2392 placement
function canonicalLinkCapabilities(names) {
  let sorted = uniq(names).sort();
  return names.length >= 1 &&
    names.length <= MAX_TOOL_HOST_LINKS &&
    names.every((name) => TOOL_HOST_NAME_PATTERN.test(name)) &&
    sorted.length === names.length &&
    sorted.every((name, index) => name === names[index])
    ? sorted
    : undefined;
}
//@ chunk-ehqcegwt.js:2392-2717 placement
/**
 * tool_host_link 签名载荷编码（能力名 1-8 个）
 */
function encodeToolHostLinkPayload(header, names) {
  if (canonicalLinkCapabilities(names) === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceBind: tool-host link capabilities must be 1 to 8 sorted, distinct names of a-z, 0-9, _ and .",
      "deviceBind: malformed link capabilities",
    );
  return Buffer.concat([
    buffer_4,
    ...encodeToolHostLinkHeader(header),
    _(names.length),
    ...names.flatMap((capability) => {
      let buffer = Buffer.from(capability, "ascii");
      return [_(buffer.length), buffer];
    }),
    u64be(header.issuedAtMs),
  ]);
}
//@ chunk-ehqcegwt.js:2717-3060 placement
async function signToolHostLink({
  orgUuid,
  accountUuid,
  sessionUuid,
  deviceUUID,
  request,
  capabilities,
  key,
  now = Date.now,
}) {
  let issuedAtMs = now();
  let header = {
    orgUuid,
    accountUuid,
    sessionUuid,
    deviceUuid: deviceUUID,
    request,
    issuedAtMs,
  };
  let signature = await key.sign(
    capabilities === undefined
      ? encodeToolHostLinkPayloadV1(header)
      : encodeToolHostLinkPayload(header, capabilities),
  );
  return {
    deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: signature.toString("base64"),
    issuedAt: new Date(issuedAtMs).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:3060-3122 placement
var buffer_5; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ehqcegwt.js:3060", () => {
  buffer_5 = Buffer.from("anthropic.ccr.tool_host_resume.v1", "utf8");
});
//@ chunk-ehqcegwt.js:3122-3374 placement
/**
 * tool_host_resume 签名载荷编码（nonce 1-65535 字节）
 */
function encodeToolHostResumePayload(header, nonce) {
  let buffer = Buffer.from(nonce, "utf8");
  if (buffer.length === 0 || buffer.length > 65535)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceBind: tool-host resume nonce must be 1 to 65535 bytes",
      "deviceBind: malformed resume nonce",
    );
  return Buffer.concat([
    buffer_5,
    ...encodeToolHostLinkHeader(header),
    _(buffer.length),
    buffer,
    u64be(header.issuedAtMs),
  ]);
}
//@ chunk-ehqcegwt.js:3374-3604 placement
async function signToolHostResume({ deviceUUID, nonce, key, now = Date.now, ...linkFields }) {
  let issuedAtMs = now();
  let signature = await key.sign(
    encodeToolHostResumePayload(
      {
        ...linkFields,
        deviceUuid: deviceUUID,
        issuedAtMs,
      },
      nonce,
    ),
  );
  return {
    deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: signature.toString("base64"),
    issuedAt: new Date(issuedAtMs).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:3604-3644 placement
async function hasTrustedDeviceToken() {
  return (await trustedDeviceToken()).ok;
}
//@ chunk-ehqcegwt.js:3644-3749 placement
async function trustedDeviceToken() {
  let { trustedDeviceTokenForBind } = await import("./trustedDevice.js");
  return trustedDeviceTokenForBind(undefined);
}
//@ chunk-ehqcegwt.js:3749-4304 placement
async function localBindIdentity(options) {
  if (options.launchedFromHome === undefined) await primeWindowsProfileDirs();
  if ((options.launchedFromHome ?? launchedFromHome)()) return err("launched_from_home");
  let egressAllowed;
  try {
    egressAllowed = (options.isEgressAllowed ?? isDeviceBindingAllowed)();
  } catch {
    egressAllowed = false;
  }
  if (!egressAllowed) return err("egress");
  let deviceBindingRecord = resolveDeviceBindingRecord({
    storedAccountUuid: options.accountUuid,
    hostAccountUuid: await (options.getHostAccountUuid
      ? options.getHostAccountUuid()
      : getHostAccountUuid(options.credentials)),
  });
  if (deviceBindingRecord.status === "missing") return err("account");
  if (deviceBindingRecord.status === "mismatch") return err("account_mismatch");
  return (await (options.hasDeviceProof ?? hasTrustedDeviceToken)().catch(() => false))
    ? ok({
        accountUuid: deviceBindingRecord.accountUuid,
        source: deviceBindingRecord.source,
      })
    : err("no_device_proof");
}
//@ chunk-ehqcegwt.js:4304-5555 placement
/**
 * 准备设备绑定器：签 session_bind、tool_host_link、tool_host_resume 等载荷，失败时以未绑定继续。
 */
async function prepareDeviceBinder(options) {
  let isEnabled = options.isEnabled ?? isViolinWoodEnabled;
  try {
    if (!(await isEnabled())) return err("gate");
  } catch (error) {
    return err(continueUnboundAfterBindFailure("gate", error));
  }
  let deviceProofError = "no_device_proof";
  let identity = await localBindIdentity({
    ...options,
    hasDeviceProof:
      options.hasDeviceProof ??
      (async () => {
        let token = await trustedDeviceToken();
        if (!token.ok && token.error !== "not_given") deviceProofError = token.error;
        return token.ok;
      }),
  });
  if (!identity.ok) {
    let skipResult = skipDeviceBindWithTelemetry(identity.error);
    return identity.error === "no_device_proof" ? err(deviceProofError) : skipResult;
  }
  logEvent("tengu_device_bind_account", {
    source: fromEnum(identity.value.source),
  });
  let { accountUuid } = identity.value;
  let displayName = options.displayName ?? deviceDisplayName();
  let reenrollTried = false;
  let registerOnce = async (relearn) => {
    try {
      return ok(
        await registerDeviceCached(accountUuid, displayName, options.credentials, {
          relearn,
        }),
      );
    } catch (error) {
      if (!(error instanceof DeviceKeyRefusedError) || options.confirmReenroll === undefined || reenrollTried)
        return err(continueUnboundAfterBindFailure("register", error));
      reenrollTried = true;
      return (await askReenrollDevice(options.confirmReenroll))
        ? reenrollThen(error.refusedPublicKey)
        : err(continueUnboundAfterBindFailure("register", error));
    }
  };
  let reenrollThen = async (refusedPublicKey) => {
    try {
      return ok(
        await withFeatureTelemetry(
          "device_reenroll",
          () => reregisterDevice(accountUuid, displayName, refusedPublicKey, options.credentials),
          deviceBindErrorClass,
        ),
      );
    } catch (error) {
      return err(continueUnboundAfterBindFailure("register", error));
    }
  };
  let bindWith = async (relearn) => {
    let registered = await registerOnce(relearn);
    if (!registered.ok) return registered;
    let { deviceUUID, key } = registered.value;
    return ok({
      deviceUUID,
      held: {
        accountUuid,
        rowPk: deviceUUID,
        key,
      },
      sign: async () => {
        try {
          let signature = await signSessionBind(options.orgUuid, accountUuid, deviceUUID, key);
          logFeatureOk("device_bind");
          return signature;
        } catch (error) {
          continueUnboundAfterBindFailure("sign", error);
          return;
        }
      },
      reregister: async () => {
        await forgetRegisteredRow(accountUuid, options.credentials).catch((error) => {
          logForDebugging(
            `[deviceBind] could not forget the cached device id: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
        return bindWith(true);
      },
    });
  };
  return bindWith(false);
}
//@ chunk-ehqcegwt.js:5555-5941 placement
/**
 * tool-host link 载荷公共头（org/account/session/device/work/env）
 */
function encodeToolHostLinkHeader({ orgUuid, accountUuid, sessionUuid, deviceUuid, request }) {
  let buffer = Buffer.from(request.workId, "utf8");
  let buffer_2 = Buffer.from(request.environmentId, "utf8");
  if (buffer.length === 0 || buffer_2.length === 0 || buffer.length > 65535 || buffer_2.length > 65535)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceBind: tool-host link request ids must be 1 to 65535 bytes",
      "deviceBind: malformed link request",
    );
  return [
    uuidToBytes(orgUuid),
    uuidToBytes(accountUuid),
    uuidToBytes(sessionUuid),
    uuidToBytes(deviceUuid),
    _(buffer.length),
    buffer,
    _(buffer_2.length),
    buffer_2,
  ];
}
//@ chunk-ehqcegwt.js:5941-6005 placement
function _(value) {
  let buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}
//@ chunk-ehqcegwt.js:6005-6080 placement
function u64be(issuedAtMs) {
  let buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(issuedAtMs));
  return buffer;
}
//@ chunk-ehqcegwt.js:6080-6162 placement
function skipDeviceBindWithTelemetry(error) {
  logEvent("tengu_device_bind_skipped", {
    reason: fromEnum(error),
    ...launchLocationFacts(error),
  });
  return err(error);
}
//@ chunk-ehqcegwt.js:6162-6428 placement
/**
 * 询问是否重新注册本机并记 tengu_device_reenroll
 */
async function askReenrollDevice(confirmReenroll) {
  try {
    let confirmed = await confirmReenroll();
    logEvent("tengu_device_reenroll", {
      confirmed,
      prompt_failed: false,
    });
    return confirmed;
  } catch (error) {
    logForDebugging(
      `[deviceBind] could not ask whether to register this machine again: ${errorMessage(error)}`,
    );
    logEvent("tengu_device_reenroll", {
      confirmed: false,
      prompt_failed: true,
    });
    return false;
  }
}
//@ chunk-ehqcegwt.js:6428-6498 placement
function deviceBindErrorClass(error) {
  return (
    (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && error.errorClass) ||
    "unexpected_error"
  );
}
//@ chunk-ehqcegwt.js:6498-6963 placement
/**
 * 设备绑定失败时记遥测并以未绑定继续
 */
function continueUnboundAfterBindFailure(phase, error) {
  logEvent("tengu_device_bind_failed", {
    phase: fromEnum(phase),
    limit_reached: error instanceof DeviceLimitReachedError,
    registration_unavailable: error instanceof DeviceRegistrationUnavailableError,
    revoked: error instanceof DeviceKeyRefusedError,
  });
  logFeatureSad(
    "device_bind",
    (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && error.errorClass) ||
      phase,
  );
  logForDebugging(
    `[deviceBind] continuing unbound: ${error instanceof Error ? error.message : String(error)}`,
  );
  return error instanceof DeviceLimitReachedError
    ? "limit_reached"
    : error instanceof DeviceRegistrationUnavailableError
      ? "registration_unavailable"
      : error instanceof DeviceKeyRefusedError
        ? "device_revoked"
        : error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
            error.errorClass === "no_keychain"
          ? "no_keychain"
          : phase;
}
export {
  DEVICE_REGISTRY_KID_PREFIX,
  localBindIdentity,
  canonicalLinkCapabilities,
  signSessionLateLink,
  signToolHostLink,
  signToolHostResume,
  uuidToBytes,
  prepareDeviceBinder,
};
