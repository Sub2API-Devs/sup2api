/**
 * bridge/deviceRegistry.ts
 *
 * 2.1.316 新增：向账号设备注册表登记本机（公钥上传、行主键缓存、上限与拒绝错误）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x58vpmpd.js (16)
 * attribution: placement 16
 */
import { hostname } from "os";
import { deviceKeyStore } from "./deviceKey.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { truncateCodePoints, truncateToLength } from "../utils/stringUtils.js";
import { isDeviceBindingAllowed } from "./deviceBindingPolicy.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../utils/errors.js";
import { apiClient } from "../services/routines/routinesApi.js";
import { OAUTH_BETA_HEADER } from "../constants/oauth.js";
import { logForDebugging } from "../utils/debug.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { getPlatformDisplayName } from "../utils/platform.js";

//@ chunk-x58vpmpd.js:10413-10588 placement
var REMOTE_DEVICES_API_PATH = "/api/organizations/:orgUUID/cowork/remote_devices";
var COWORK_REMOTE_DEVICE_LIMIT_REACHED = "cowork_remote_device_limit_reached";
var ACCOUNT_SESSION_INVALID = "account_session_invalid";
var DEVICE_REGISTRATION_REVOKED_CODE = "cowork_remote_device_registration_revoked";
//@ chunk-x58vpmpd.js:10588-10642 placement
async function registeredRowPk(e, r) {
  return (await resolveRegisteredDevice(e, r))?.rowPk;
}
//@ chunk-x58vpmpd.js:10642-10757 placement
async function loadRegisteredDevice(e, r) {
  let n = await deviceKeyStore().load(e, r);
  let lower = normalizeUuidOrNull(n?.rowPk)?.toLowerCase();
  return n && lower
    ? {
        rowPk: lower,
        key: n,
      }
    : undefined;
}
//@ chunk-x58vpmpd.js:10757-10866 placement
async function resolveRegisteredDevice(e, credentials, n) {
  if (n?.accountUuid === e) return n;
  let registeredDevice = await loadRegisteredDevice(e, credentials);
  return (
    registeredDevice && {
      accountUuid: e,
      ...registeredDevice,
    }
  );
}
//@ chunk-x58vpmpd.js:10866-10894 placement = chordToDisplayString (1)
function getPlatform() {
  return "linux";
}
//@ chunk-x58vpmpd.js:10894-10955 placement
function deviceDisplayNameForRegister(e) {
  return truncateCodePoints(e.trim(), 255) || truncateCodePoints(deviceDisplayName().trim(), 255);
}
//@ chunk-x58vpmpd.js:10955-11173 placement
async function registerDeviceCached(e, r, n, { relearn: i = false } = {}) {
  try {
    if (!isDeviceBindingAllowed()) throw new DeviceRegistrationUnavailableError("client egress policy");
    return await registerDevice(e, r, n, i);
  } catch (error) {
    logFeatureBad(
      "device_registry_register",
      (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && error.errorClass) ||
        "unexpected_error",
    );
    throw error;
  }
}
//@ chunk-x58vpmpd.js:11173-12687 placement
/**
 * 向设备注册表登记本机：加载或生成设备密钥，上传公钥并保存返回的行主键。
 */
async function registerDevice(e, r, n, i) {
  let s = await deviceKeyStore().loadOrCreate(e, n);
  if (s.rowPk && !i) {
    logFeatureOk("device_registry_register");
    return {
      deviceUUID: s.rowPk,
      key: s,
    };
  }
  let a = await apiClient
    .post(
      REMOTE_DEVICES_API_PATH,
      {
        display_name: deviceDisplayNameForRegister(r),
        platform: getPlatform(),
        public_key: s.publicKeySpkiB64,
      },
      {
        auth: "teleport-org",
        headers: {
          "anthropic-beta": OAUTH_BETA_HEADER,
        },
        timeout: 1e4,
        validateStatus: () => true,
        credentials: n,
      },
    )
    .catch((error) => {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: register request failed (${errorMessage(error)})`,
        "deviceRegistry: register request failed",
        "request_failed",
      );
    });
  if (!a.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `deviceRegistry: register not sent (${a.reason})`,
      "deviceRegistry: register not sent",
      "not_sent",
    );
  logForDebugging(
    `[deviceRegistry] register status=${a.status} request_id=${String(a.response.headers?.["request-id"] ?? "")}`,
  );
  if (a.status === 400 && a.data?.error?.details?.error_code === COWORK_REMOTE_DEVICE_LIMIT_REACHED)
    throw new DeviceLimitReachedError();
  if (
    (a.status === 403 && a.data?.error?.details?.error_code !== ACCOUNT_SESSION_INVALID) ||
    a.status === 404
  )
    throw new DeviceRegistrationUnavailableError(`HTTP ${a.status}`);
  let errorCode = a.data?.error?.details?.error_code;
  if (errorCode === DEVICE_REGISTRATION_REVOKED_CODE || (a.status === 409 && errorCode === undefined))
    throw new DeviceKeyRefusedError(s.publicKeySpkiB64);
  let y = normalizeUuidOrNull(a.data?.id);
  if (a.status !== 201 || y === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `deviceRegistry: register ${a.status}: ${truncateToLength(String(jsonStringify(a.data) ?? ""), 200)}`,
      "deviceRegistry: register HTTP error",
      "http_error",
    );
  if (a.data?.revoked_at !== null && a.data?.revoked_at !== undefined)
    throw new DeviceKeyRefusedError(s.publicKeySpkiB64);
  let lower = y.toLowerCase();
  await s.setRowPk(lower).catch((error) => {
    logForDebugging(
      `[deviceRegistry] registered device row=${lower} but could not cache it: ${errorMessage(error)}`,
    );
  });
  logForDebugging(`[deviceRegistry] registered device row=${lower}`);
  logFeatureOk("device_registry_register");
  return {
    deviceUUID: lower,
    key: s,
  };
}
//@ chunk-x58vpmpd.js:12687-12839 placement
class DeviceLimitReachedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor() {
    super(
      "deviceRegistry: account device limit reached",
      "deviceRegistry: account device limit reached",
      "limit_reached",
    );
  }
}
//@ chunk-x58vpmpd.js:12839-13082 placement
class DeviceRegistrationUnavailableError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(
      `deviceRegistry: device registration unavailable for this account or organization (${e})`,
      "deviceRegistry: device registration unavailable for this account or organization",
      "registration_unavailable",
    );
  }
}
//@ chunk-x58vpmpd.js:13082-13317 placement
class DeviceKeyRefusedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  refusedPublicKey;
  constructor(refusedPublicKey) {
    super(
      "deviceRegistry: this machine's device registration was removed from the account",
      "deviceRegistry: device registration revoked",
      "registration_revoked",
    );
    this.refusedPublicKey = refusedPublicKey;
  }
}
//@ chunk-x58vpmpd.js:13317-13393 placement
async function reregisterDevice(accountUuid, r, n, credentials) {
  await retireDroppedDeviceKey(accountUuid, n, credentials, 2);
  return registerDeviceCached(accountUuid, r, credentials, {
    relearn: true,
  });
}
//@ chunk-x58vpmpd.js:13393-13601 placement
async function retireDroppedDeviceKey(e, r, n, i) {
  let s = await deviceKeyStore().load(e, n);
  if (s?.publicKeySpkiB64 !== r) return;
  if (i === 0) throw createKeyNotRetiredError("it is still stored after being dropped");
  await s.drop().catch((error) => {
    throw createKeyNotRetiredError(errorMessage(error));
  });
  return retireDroppedDeviceKey(e, r, n, i - 1);
}
//@ chunk-x58vpmpd.js:13601-13759 placement
function createKeyNotRetiredError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `deviceRegistry: the removed device's key could not be retired (${e})`,
    "deviceRegistry: device key not retired",
    "key_not_retired",
  );
}
//@ chunk-x58vpmpd.js:13759-13828 placement
async function forgetRegisteredRow(accountUuid, credentials) {
  await (await deviceKeyStore().load(accountUuid, credentials))?.setRowPk(undefined);
}
//@ chunk-x58vpmpd.js:13828-13895 placement
function deviceDisplayName() {
  return `Claude Code on ${hostname()} \xB7 ${getPlatformDisplayName("linux")}`;
}
export {
  loadRegisteredDevice,
  deviceDisplayName,
  registerDeviceCached,
  DeviceKeyRefusedError,
  reregisterDevice,
  forgetRegisteredRow,
  DeviceLimitReachedError,
  DeviceRegistrationUnavailableError,
  registeredRowPk,
  resolveRegisteredDevice,
};
