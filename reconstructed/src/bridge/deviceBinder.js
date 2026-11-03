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
import { Vt } from "../utils/agentId.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../utils/errors.js";
import { uniq } from "../utils/collections.js";
import { primeWindowsProfileDirs } from "../services/remoteTools/windowsProfileDirs.js";
import { launchedFromHome } from "../services/remoteTools/servingGates.js";
import { err, ok } from "../utils/resultError.js";
import { hCe } from "./deviceBindingPolicy.js";
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
var DEVICE_REGISTRY_KID_PREFIX = "creg_",
  buffer = Buffer.from("anthropic.ccr.create_session_bind.v1", "utf8");
//@ chunk-ehqcegwt.js:780-928 placement
function uuidToBytes(e) {
  if (!Vt(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `deviceBind: malformed UUID '${e}'`,
      "deviceBind: malformed UUID",
    );
  return Buffer.from(e.replace(/-/g, ""), "hex");
}
/**
 * session_bind 签名载荷编码
 */
//@ chunk-ehqcegwt.js:928-1099 placement
function encodeSessionBindPayload(e, n, i, r) {
  let alloc = Buffer.alloc(buffer.length + 48 + 8),
    o = 0;
  return (
    (o += buffer.copy(alloc, o)),
    (o += uuidToBytes(e).copy(alloc, o)),
    (o += uuidToBytes(n).copy(alloc, o)),
    (o += uuidToBytes(i).copy(alloc, o)),
    alloc.writeBigUInt64BE(BigInt(r), o),
    alloc
  );
}
/**
 * 用设备密钥签 session_bind，返回 kid/签名/时间
 */
//@ chunk-ehqcegwt.js:1099-1316 placement
async function signSessionBind(e, n, i, r) {
  let now = Date.now(),
    sign = await r.sign(encodeSessionBindPayload(e, n, i, now));
  return {
    deviceUUID: i,
    kid: DEVICE_REGISTRY_KID_PREFIX + i,
    signature: sign.toString("base64"),
    issuedAt: new Date(now).toISOString(),
    signedOver: { orgUuid: e, accountUuid: n, issuedAtMs: now },
  };
}
//@ chunk-ehqcegwt.js:1316-1415 placement
var buffer_2 = Buffer.from("anthropic.ccr.session_bind.v1", "utf8"),
  S = "00000000-0000-0000-0000-000000000000";
/**
 * create_session_bind 签名载荷的二进制编码
 */
//@ chunk-ehqcegwt.js:1415-1716 placement
function encodeCreateSessionBindPayload({
  orgUuid: orgUuid,
  accountUuid: accountUuid,
  sessionUuid: sessionUuid,
  expectedCurrentDeviceUuid: expectedCurrentDeviceUuid,
  newDeviceUuid: newDeviceUuid,
  issuedAtMs: issuedAtMs,
}) {
  let alloc = Buffer.alloc(buffer_2.length + 80 + 8),
    l = 0;
  return (
    (l += buffer_2.copy(alloc, l)),
    (l += uuidToBytes(orgUuid).copy(alloc, l)),
    (l += uuidToBytes(accountUuid).copy(alloc, l)),
    (l += uuidToBytes(sessionUuid).copy(alloc, l)),
    (l += uuidToBytes(expectedCurrentDeviceUuid ?? S).copy(alloc, l)),
    (l += uuidToBytes(newDeviceUuid).copy(alloc, l)),
    alloc.writeBigUInt64BE(BigInt(issuedAtMs), l),
    alloc
  );
}
//@ chunk-ehqcegwt.js:1716-2038 placement
async function signSessionLateLink({
  orgUuid: orgUuid,
  accountUuid: accountUuid,
  sessionUuid: sessionUuid,
  deviceUUID: deviceUUID,
  key: key,
  now: now = Date.now,
}) {
  let u = now(),
    sign = await key.sign(
      encodeCreateSessionBindPayload({
        orgUuid: orgUuid,
        accountUuid: accountUuid,
        sessionUuid: sessionUuid,
        expectedCurrentDeviceUuid: void 0,
        newDeviceUuid: deviceUUID,
        issuedAtMs: u,
      }),
    );
  return {
    deviceUUID: deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: sign.toString("base64"),
    issuedAt: new Date(u).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:2038-2181 placement
var buffer_3 = Buffer.from("anthropic.ccr.tool_host_link.v1", "utf8"),
  buffer_4 = Buffer.from("anthropic.ccr.tool_host_link.v2", "utf8"),
  O = /^[a-z0-9_.]{1,48}$/,
  x = 8;
//@ chunk-ehqcegwt.js:2181-2245 placement
function F(e) {
  return Buffer.concat([buffer_3, ...encodeToolHostLinkHeader(e), U(e.issuedAtMs)]);
}
//@ chunk-ehqcegwt.js:2245-2392 placement
function canonicalLinkCapabilities(e) {
  let sorted = uniq(e).sort();
  return e.length >= 1 &&
    e.length <= x &&
    e.every((i) => O.test(i)) &&
    sorted.length === e.length &&
    sorted.every((i, r) => i === e[r])
    ? sorted
    : void 0;
}
/**
 * tool_host_link 签名载荷编码（能力名 1-8 个）
 */
//@ chunk-ehqcegwt.js:2392-2717 placement
function encodeToolHostLinkPayload(e, n) {
  if (canonicalLinkCapabilities(n) === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceBind: tool-host link capabilities must be 1 to 8 sorted, distinct names of a-z, 0-9, _ and .",
      "deviceBind: malformed link capabilities",
    );
  return Buffer.concat([
    buffer_4,
    ...encodeToolHostLinkHeader(e),
    _(n.length),
    ...n.flatMap((i) => {
      let buffer = Buffer.from(i, "ascii");
      return [_(buffer.length), buffer];
    }),
    U(e.issuedAtMs),
  ]);
}
//@ chunk-ehqcegwt.js:2717-3060 placement
async function signToolHostLink({
  orgUuid: orgUuid,
  accountUuid: accountUuid,
  sessionUuid: sessionUuid,
  deviceUUID: deviceUUID,
  request: request,
  capabilities: capabilities,
  key: key,
  now: now = Date.now,
}) {
  let h = now(),
    p = {
      orgUuid: orgUuid,
      accountUuid: accountUuid,
      sessionUuid: sessionUuid,
      deviceUuid: deviceUUID,
      request: request,
      issuedAtMs: h,
    },
    sign = await key.sign(capabilities === void 0 ? F(p) : encodeToolHostLinkPayload(p, capabilities));
  return {
    deviceUUID: deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: sign.toString("base64"),
    issuedAt: new Date(h).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:3060-3122 placement
var buffer_5 = Buffer.from("anthropic.ccr.tool_host_resume.v1", "utf8");
/**
 * tool_host_resume 签名载荷编码（nonce 1-65535 字节）
 */
//@ chunk-ehqcegwt.js:3122-3374 placement
function encodeToolHostResumePayload(e, n) {
  let buffer = Buffer.from(n, "utf8");
  if (buffer.length === 0 || buffer.length > 65535)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceBind: tool-host resume nonce must be 1 to 65535 bytes",
      "deviceBind: malformed resume nonce",
    );
  return Buffer.concat([buffer_5, ...encodeToolHostLinkHeader(e), _(buffer.length), buffer, U(e.issuedAtMs)]);
}
//@ chunk-ehqcegwt.js:3374-3604 placement
async function signToolHostResume({
  deviceUUID: deviceUUID,
  nonce: nonce,
  key: key,
  now: now = Date.now,
  ...s
}) {
  let o = now(),
    sign = await key.sign(
      encodeToolHostResumePayload({ ...s, deviceUuid: deviceUUID, issuedAtMs: o }, nonce),
    );
  return {
    deviceUUID: deviceUUID,
    kid: DEVICE_REGISTRY_KID_PREFIX + deviceUUID,
    signature: sign.toString("base64"),
    issuedAt: new Date(o).toISOString(),
  };
}
//@ chunk-ehqcegwt.js:3604-3644 placement
async function q() {
  return (await trustedDeviceToken()).ok;
}
//@ chunk-ehqcegwt.js:3644-3749 placement
async function trustedDeviceToken() {
  let { trustedDeviceTokenForBind: trustedDeviceTokenForBind } = await import("./chunk-3kb57csj.js");
  return trustedDeviceTokenForBind(void 0);
}
//@ chunk-ehqcegwt.js:3749-4304 placement
async function localBindIdentity(e) {
  if (e.launchedFromHome === void 0) await primeWindowsProfileDirs();
  if ((e.launchedFromHome ?? launchedFromHome)()) return err("launched_from_home");
  let n;
  try {
    n = (e.isEgressAllowed ?? hCe)();
  } catch {
    n = !1;
  }
  if (!n) return err("egress");
  let i = resolveDeviceBindingRecord({
    storedAccountUuid: e.accountUuid,
    hostAccountUuid: await (e.getHostAccountUuid
      ? e.getHostAccountUuid()
      : getHostAccountUuid(e.credentials)),
  });
  if (i.status === "missing") return err("account");
  if (i.status === "mismatch") return err("account_mismatch");
  return (await (e.hasDeviceProof ?? q)().catch(() => !1))
    ? ok({ accountUuid: i.accountUuid, source: i.source })
    : err("no_device_proof");
}
/**
 * 准备设备绑定器：签 session_bind、tool_host_link、tool_host_resume 等载荷，失败时以未绑定继续。
 */
//@ chunk-ehqcegwt.js:4304-5555 placement
async function prepareDeviceBinder(e) {
  let n = e.isEnabled ?? isViolinWoodEnabled;
  try {
    if (!(await n())) return err("gate");
  } catch (error) {
    return err(continueUnboundAfterBindFailure("gate", error));
  }
  let i = "no_device_proof",
    r = await localBindIdentity({
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
    let m = V(r.error);
    return r.error === "no_device_proof" ? err(i) : m;
  }
  logEvent("tengu_device_bind_account", { source: fromEnum(r.value.source) });
  let { accountUuid: accountUuid } = r.value,
    o = e.displayName ?? deviceDisplayName(),
    u = !1,
    l = async (m) => {
      try {
        return ok(await registerDeviceCached(accountUuid, o, e.credentials, { relearn: m }));
      } catch (error) {
        if (!(error instanceof DeviceKeyRefusedError) || e.confirmReenroll === void 0 || u)
          return err(continueUnboundAfterBindFailure("register", error));
        return (
          (u = !0),
          (await askReenrollDevice(e.confirmReenroll))
            ? h(error.refusedPublicKey)
            : err(continueUnboundAfterBindFailure("register", error))
        );
      }
    },
    h = async (m) => {
      try {
        return ok(
          await withFeatureTelemetry(
            "device_reenroll",
            () => reregisterDevice(accountUuid, o, m, e.credentials),
            W,
          ),
        );
      } catch (error) {
        return err(continueUnboundAfterBindFailure("register", error));
      }
    },
    p = async (m) => {
      let v = await l(m);
      if (!v.ok) return v;
      let { deviceUUID: deviceUUID, key: key } = v.value;
      return ok({
        deviceUUID: deviceUUID,
        held: { accountUuid: accountUuid, rowPk: deviceUUID, key: key },
        sign: async () => {
          try {
            let B = await signSessionBind(e.orgUuid, accountUuid, deviceUUID, key);
            return (logFeatureOk("device_bind"), B);
          } catch (error) {
            continueUnboundAfterBindFailure("sign", error);
            return;
          }
        },
        reregister: async () => (
          await forgetRegisteredRow(accountUuid, e.credentials).catch((B) => {
            logForDebugging(
              `[deviceBind] could not forget the cached device id: ${B instanceof Error ? B.message : String(B)}`,
            );
          }),
          p(!0)
        ),
      });
    };
  return p(!1);
}
/**
 * tool-host link 载荷公共头（org/account/session/device/work/env）
 */
//@ chunk-ehqcegwt.js:5555-5941 placement
function encodeToolHostLinkHeader({
  orgUuid: orgUuid,
  accountUuid: accountUuid,
  sessionUuid: sessionUuid,
  deviceUuid: deviceUuid,
  request: request,
}) {
  let buffer = Buffer.from(request.workId, "utf8"),
    buffer_2 = Buffer.from(request.environmentId, "utf8");
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
  let alloc = Buffer.alloc(2);
  return (alloc.writeUInt16BE(e), alloc);
}
//@ chunk-ehqcegwt.js:6005-6080 placement
function U(e) {
  let alloc = Buffer.alloc(8);
  return (alloc.writeBigUInt64BE(BigInt(e)), alloc);
}
//@ chunk-ehqcegwt.js:6080-6162 placement
function V(e) {
  return (logEvent("tengu_device_bind_skipped", { reason: fromEnum(e), ...launchLocationFacts(e) }), err(e));
}
/**
 * 询问是否重新注册本机并记 tengu_device_reenroll
 */
//@ chunk-ehqcegwt.js:6162-6428 placement
async function askReenrollDevice(e) {
  try {
    let n = await e();
    return (logEvent("tengu_device_reenroll", { confirmed: n, prompt_failed: !1 }), n);
  } catch (error) {
    return (
      logForDebugging(
        `[deviceBind] could not ask whether to register this machine again: ${errorMessage(error)}`,
      ),
      logEvent("tengu_device_reenroll", { confirmed: !1, prompt_failed: !0 }),
      !1
    );
  }
}
//@ chunk-ehqcegwt.js:6428-6498 placement
function W(e) {
  return (
    (e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && e.errorClass) ||
    "unexpected_error"
  );
}
/**
 * 设备绑定失败时记遥测并以未绑定继续
 */
//@ chunk-ehqcegwt.js:6498-6963 placement
function continueUnboundAfterBindFailure(e, n) {
  return (
    logEvent("tengu_device_bind_failed", {
      phase: fromEnum(e),
      limit_reached: n instanceof DeviceLimitReachedError,
      registration_unavailable: n instanceof DeviceRegistrationUnavailableError,
      revoked: n instanceof DeviceKeyRefusedError,
    }),
    logFeatureSad(
      "device_bind",
      (n instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && n.errorClass) || e,
    ),
    logForDebugging(`[deviceBind] continuing unbound: ${n instanceof Error ? n.message : String(n)}`),
    n instanceof DeviceLimitReachedError
      ? "limit_reached"
      : n instanceof DeviceRegistrationUnavailableError
        ? "registration_unavailable"
        : n instanceof DeviceKeyRefusedError
          ? "device_revoked"
          : n instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
              n.errorClass === "no_keychain"
            ? "no_keychain"
            : e
  );
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
