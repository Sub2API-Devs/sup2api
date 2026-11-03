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

//@ chunk-ehqcegwt.js:703-780 placement
var DEVICE_REGISTRY_KID_PREFIX = "creg_";
var buffer = Buffer.from("anthropic.ccr.create_session_bind.v1", "utf8");
//@ chunk-ehqcegwt.js:780-928 placement
function uuidToBytes(e) {
  if (!normalizeUuidOrNull(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `deviceBind: malformed UUID '${e}'`,
      "deviceBind: malformed UUID",
    );
  return Buffer.from(e.replace(/-/g, ""), "hex");
}
//@ chunk-ehqcegwt.js:928-1099 placement
/**
 * session_bind 签名载荷编码
 */
function encodeSessionBindPayload(e, n, i, r) {
  let s = Buffer.alloc(buffer.length + 48 + 8);
  let o = 0;
  o += buffer.copy(s, o);
  o += uuidToBytes(e).copy(s, o);
  o += uuidToBytes(n).copy(s, o);
  o += uuidToBytes(i).copy(s, o);
  s.writeBigUInt64BE(BigInt(r), o);
  return s;
}
//@ chunk-ehqcegwt.js:1099-1316 placement
/**
 * 用设备密钥签 session_bind，返回 kid/签名/时间
 */
async function signSessionBind(orgUuid, accountUuid, deviceUUID, key) {
  let now = Date.now();
  let o = await key.sign(encodeSessionBindPayload(orgUuid, accountUuid, deviceUUID, now));
  return {
    deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: o.toString("base64"),
    issuedAt: new Date(now).toISOString(),
    signedOver: {
      orgUuid,
      accountUuid,
      issuedAtMs: now,
    },
  };
}
//@ chunk-ehqcegwt.js:1316-1415 placement
var buffer_2 = Buffer.from("anthropic.ccr.session_bind.v1", "utf8");
var DEVICE_UUID_BIND_PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
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
  let u = Buffer.alloc(buffer_2.length + 80 + 8);
  let l = 0;
  l += buffer_2.copy(u, l);
  l += uuidToBytes(orgUuid).copy(u, l);
  l += uuidToBytes(accountUuid).copy(u, l);
  l += uuidToBytes(sessionUuid).copy(u, l);
  l += uuidToBytes(expectedCurrentDeviceUuid ?? DEVICE_UUID_BIND_PLACEHOLDER).copy(u, l);
  l += uuidToBytes(newDeviceUuid).copy(u, l);
  u.writeBigUInt64BE(BigInt(issuedAtMs), l);
  return u;
}
//@ chunk-ehqcegwt.js:1716-2038 placement
async function signSessionLateLink({ orgUuid, accountUuid, sessionUuid, deviceUUID, key, now = Date.now }) {
  let u = now();
  let l = await key.sign(
    encodeCreateSessionBindPayload({
      orgUuid,
      accountUuid,
      sessionUuid,
      expectedCurrentDeviceUuid: undefined,
      newDeviceUuid: deviceUUID,
      issuedAtMs: u,
    }),
  );
  return {
    deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: l.toString("base64"),
    issuedAt: new Date(u).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:2038-2181 placement
var buffer_3 = Buffer.from("anthropic.ccr.tool_host_link.v1", "utf8");
var buffer_4 = Buffer.from("anthropic.ccr.tool_host_link.v2", "utf8");
var TOOL_HOST_NAME_PATTERN = /^[a-z0-9_.]{1,48}$/;
var MAX_TOOL_HOST_LINKS = 8;
//@ chunk-ehqcegwt.js:2181-2245 placement
function encodeToolHostLinkPayloadV1(e) {
  return Buffer.concat([buffer_3, ...encodeToolHostLinkHeader(e), u64be(e.issuedAtMs)]);
}
//@ chunk-ehqcegwt.js:2245-2392 placement
function canonicalLinkCapabilities(e) {
  let sorted = uniq(e).sort();
  return e.length >= 1 &&
    e.length <= MAX_TOOL_HOST_LINKS &&
    e.every((i) => TOOL_HOST_NAME_PATTERN.test(i)) &&
    sorted.length === e.length &&
    sorted.every((i, r) => i === e[r])
    ? sorted
    : undefined;
}
//@ chunk-ehqcegwt.js:2392-2717 placement
/**
 * tool_host_link 签名载荷编码（能力名 1-8 个）
 */
function encodeToolHostLinkPayload(e, capabilities) {
  if (canonicalLinkCapabilities(capabilities) === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceBind: tool-host link capabilities must be 1 to 8 sorted, distinct names of a-z, 0-9, _ and .",
      "deviceBind: malformed link capabilities",
    );
  return Buffer.concat([
    buffer_4,
    ...encodeToolHostLinkHeader(e),
    _(capabilities.length),
    ...capabilities.flatMap((i) => {
      let buffer = Buffer.from(i, "ascii");
      return [_(buffer.length), buffer];
    }),
    u64be(e.issuedAtMs),
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
  let h = now();
  let p = {
    orgUuid,
    accountUuid,
    sessionUuid,
    deviceUuid: deviceUUID,
    request,
    issuedAtMs: h,
  };
  let m = await key.sign(
    capabilities === undefined ? encodeToolHostLinkPayloadV1(p) : encodeToolHostLinkPayload(p, capabilities),
  );
  return {
    deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: m.toString("base64"),
    issuedAt: new Date(h).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:3060-3122 placement
var buffer_5 = Buffer.from("anthropic.ccr.tool_host_resume.v1", "utf8");
//@ chunk-ehqcegwt.js:3122-3374 placement
/**
 * tool_host_resume 签名载荷编码（nonce 1-65535 字节）
 */
function encodeToolHostResumePayload(e, nonce) {
  let buffer = Buffer.from(nonce, "utf8");
  if (buffer.length === 0 || buffer.length > 65535)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceBind: tool-host resume nonce must be 1 to 65535 bytes",
      "deviceBind: malformed resume nonce",
    );
  return Buffer.concat([
    buffer_5,
    ...encodeToolHostLinkHeader(e),
    _(buffer.length),
    buffer,
    u64be(e.issuedAtMs),
  ]);
}
//@ chunk-ehqcegwt.js:3374-3604 placement
async function signToolHostResume({ deviceUUID, nonce, key, now = Date.now, ...s }) {
  let o = now();
  let u = await key.sign(
    encodeToolHostResumePayload(
      {
        ...s,
        deviceUuid: deviceUUID,
        issuedAtMs: o,
      },
      nonce,
    ),
  );
  return {
    deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: u.toString("base64"),
    issuedAt: new Date(o).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:3604-3644 placement
async function hasTrustedDeviceToken() {
  return (await trustedDeviceToken()).ok;
}
//@ chunk-ehqcegwt.js:3644-3749 placement
async function trustedDeviceToken() {
  let { trustedDeviceTokenForBind } = await import("./chunk-3kb57csj.js");
  return trustedDeviceTokenForBind(undefined);
}
//@ chunk-ehqcegwt.js:3749-4304 placement
async function localBindIdentity(e) {
  if (e.launchedFromHome === undefined) await primeWindowsProfileDirs();
  if ((e.launchedFromHome ?? launchedFromHome)()) return err("launched_from_home");
  let n;
  try {
    n = (e.isEgressAllowed ?? isDeviceBindingAllowed)();
  } catch {
    n = false;
  }
  if (!n) return err("egress");
  let deviceBindingRecord = resolveDeviceBindingRecord({
    storedAccountUuid: e.accountUuid,
    hostAccountUuid: await (e.getHostAccountUuid
      ? e.getHostAccountUuid()
      : getHostAccountUuid(e.credentials)),
  });
  if (deviceBindingRecord.status === "missing") return err("account");
  if (deviceBindingRecord.status === "mismatch") return err("account_mismatch");
  return (await (e.hasDeviceProof ?? hasTrustedDeviceToken)().catch(() => false))
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
async function prepareDeviceBinder(e) {
  let isEnabled = e.isEnabled ?? isViolinWoodEnabled;
  try {
    if (!(await isEnabled())) return err("gate");
  } catch (error) {
    return err(continueUnboundAfterBindFailure("gate", error));
  }
  let i = "no_device_proof";
  let r = await localBindIdentity({
    ...e,
    hasDeviceProof:
      e.hasDeviceProof ??
      (async () => {
        let m = await trustedDeviceToken();
        if (!m.ok && m.error !== "not_given") i = m.error;
        return m.ok;
      }),
  });
  if (!r.ok) {
    let m = skipDeviceBindWithTelemetry(r.error);
    return r.error === "no_device_proof" ? err(i) : m;
  }
  logEvent("tengu_device_bind_account", {
    source: fromEnum(r.value.source),
  });
  let { accountUuid } = r.value;
  let o = e.displayName ?? deviceDisplayName();
  let u = false;
  let l = async (relearn) => {
    try {
      return ok(
        await registerDeviceCached(accountUuid, o, e.credentials, {
          relearn,
        }),
      );
    } catch (error) {
      if (!(error instanceof DeviceKeyRefusedError) || e.confirmReenroll === undefined || u)
        return err(continueUnboundAfterBindFailure("register", error));
      u = true;
      return (await askReenrollDevice(e.confirmReenroll))
        ? h(error.refusedPublicKey)
        : err(continueUnboundAfterBindFailure("register", error));
    }
  };
  let h = async (refusedPublicKey) => {
    try {
      return ok(
        await withFeatureTelemetry(
          "device_reenroll",
          () => reregisterDevice(accountUuid, o, refusedPublicKey, e.credentials),
          deviceBindErrorClass,
        ),
      );
    } catch (error) {
      return err(continueUnboundAfterBindFailure("register", error));
    }
  };
  let p = async (relearn) => {
    let v = await l(relearn);
    if (!v.ok) return v;
    let { deviceUUID, key } = v.value;
    return ok({
      deviceUUID,
      held: {
        accountUuid,
        rowPk: deviceUUID,
        key,
      },
      sign: async () => {
        try {
          let B = await signSessionBind(e.orgUuid, accountUuid, deviceUUID, key);
          logFeatureOk("device_bind");
          return B;
        } catch (error) {
          continueUnboundAfterBindFailure("sign", error);
          return;
        }
      },
      reregister: async () => {
        await forgetRegisteredRow(accountUuid, e.credentials).catch((error) => {
          logForDebugging(
            `[deviceBind] could not forget the cached device id: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
        return p(true);
      },
    });
  };
  return p(false);
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
function _(e) {
  let n = Buffer.alloc(2);
  n.writeUInt16BE(e);
  return n;
}
//@ chunk-ehqcegwt.js:6005-6080 placement
function u64be(issuedAtMs) {
  let n = Buffer.alloc(8);
  n.writeBigUInt64BE(BigInt(issuedAtMs));
  return n;
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
    let n = await confirmReenroll();
    logEvent("tengu_device_reenroll", {
      confirmed: n,
      prompt_failed: false,
    });
    return n;
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
function deviceBindErrorClass(e) {
  return (
    (e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && e.errorClass) ||
    "unexpected_error"
  );
}
//@ chunk-ehqcegwt.js:6498-6963 placement
/**
 * 设备绑定失败时记遥测并以未绑定继续
 */
function continueUnboundAfterBindFailure(e, error) {
  logEvent("tengu_device_bind_failed", {
    phase: fromEnum(e),
    limit_reached: error instanceof DeviceLimitReachedError,
    registration_unavailable: error instanceof DeviceRegistrationUnavailableError,
    revoked: error instanceof DeviceKeyRefusedError,
  });
  logFeatureSad(
    "device_bind",
    (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && error.errorClass) || e,
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
          : e;
}
export {
  DEVICE_REGISTRY_KID_PREFIX,
  localBindIdentity,
  canonicalLinkCapabilities,
  signSessionLateLink,
  signToolHostLink,
  signToolHostResume,
  uuidToBytes,
};
