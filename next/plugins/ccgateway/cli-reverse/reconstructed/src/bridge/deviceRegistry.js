/**
 * bridge/deviceRegistry.ts
 *
 * 2.1.316 新增：向账号设备注册表登记本机（公钥上传、行主键缓存、上限与拒绝错误）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dk1d903v.js (16)
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-dk1d903v.js:10414-10589 placement
var REMOTE_DEVICES_API_PATH = "/api/organizations/:orgUUID/cowork/remote_devices";
var COWORK_REMOTE_DEVICE_LIMIT_REACHED = "cowork_remote_device_limit_reached";
var ACCOUNT_SESSION_INVALID = "account_session_invalid";
var DEVICE_REGISTRATION_REVOKED_CODE = "cowork_remote_device_registration_revoked";
//@ chunk-dk1d903v.js:10589-10643 placement
async function registeredRowPk(accountUuid, credentials) {
  return (await resolveRegisteredDevice(accountUuid, credentials))?.rowPk;
}
//@ chunk-dk1d903v.js:10643-10758 placement
async function loadRegisteredDevice(accountUuid, credentials) {
  let deviceKey = await deviceKeyStore().load(accountUuid, credentials);
  let lower = normalizeUuidOrNull(deviceKey?.rowPk)?.toLowerCase();
  return deviceKey && lower
    ? {
        rowPk: lower,
        key: deviceKey,
      }
    : undefined;
}
//@ chunk-dk1d903v.js:10758-10867 placement
async function resolveRegisteredDevice(accountUuid, credentials, held) {
  if (held?.accountUuid === accountUuid) return held;
  let registeredDevice = await loadRegisteredDevice(accountUuid, credentials);
  return (
    registeredDevice && {
      accountUuid,
      ...registeredDevice,
    }
  );
}
//@ chunk-dk1d903v.js:10867-10895 placement (2.1.88 match: chordToDisplayString, 1)
function getPlatform() {
  return "linux";
}
//@ chunk-dk1d903v.js:10895-10956 placement
function deviceDisplayNameForRegister(name) {
  return truncateCodePoints(name.trim(), 255) || truncateCodePoints(deviceDisplayName().trim(), 255);
}
//@ chunk-dk1d903v.js:10956-11174 placement
async function registerDeviceCached(accountUuid, displayName, credentials, { relearn = false } = {}) {
  try {
    if (!isDeviceBindingAllowed()) throw new DeviceRegistrationUnavailableError("client egress policy");
    return await registerDevice(accountUuid, displayName, credentials, relearn);
  } catch (error) {
    logFeatureBad(
      "device_registry_register",
      (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && error.errorClass) ||
        "unexpected_error",
    );
    throw error;
  }
}
//@ chunk-dk1d903v.js:11174-12687 placement
/**
 * 向设备注册表登记本机：加载或生成设备密钥，上传公钥并保存返回的行主键。
 */
async function registerDevice(accountUuid, displayName, credentials, relearn) {
  let deviceKey = await deviceKeyStore().loadOrCreate(accountUuid, credentials);
  if (deviceKey.rowPk && !relearn) {
    logFeatureOk("device_registry_register");
    return {
      deviceUUID: deviceKey.rowPk,
      key: deviceKey,
    };
  }
  let response = await apiClient
    .post(
      REMOTE_DEVICES_API_PATH,
      {
        display_name: deviceDisplayNameForRegister(displayName),
        platform: getPlatform(),
        public_key: deviceKey.publicKeySpkiB64,
      },
      {
        auth: "teleport-org",
        headers: {
          "anthropic-beta": OAUTH_BETA_HEADER,
        },
        timeout: 1e4,
        validateStatus: () => true,
        credentials,
      },
    )
    .catch((error) => {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: register request failed (${errorMessage(error)})`,
        "deviceRegistry: register request failed",
        "request_failed",
      );
    });
  if (!response.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `deviceRegistry: register not sent (${response.reason})`,
      "deviceRegistry: register not sent",
      "not_sent",
    );
  logForDebugging(
    `[deviceRegistry] register status=${response.status} request_id=${String(response.response.headers?.["request-id"] ?? "")}`,
  );
  if (
    response.status === 400 &&
    response.data?.error?.details?.error_code === COWORK_REMOTE_DEVICE_LIMIT_REACHED
  )
    throw new DeviceLimitReachedError();
  if (
    (response.status === 403 && response.data?.error?.details?.error_code !== ACCOUNT_SESSION_INVALID) ||
    response.status === 404
  )
    throw new DeviceRegistrationUnavailableError(`HTTP ${response.status}`);
  let errorCode = response.data?.error?.details?.error_code;
  if (errorCode === DEVICE_REGISTRATION_REVOKED_CODE || (response.status === 409 && errorCode === undefined))
    throw new DeviceKeyRefusedError(deviceKey.publicKeySpkiB64);
  let deviceId = normalizeUuidOrNull(response.data?.id);
  if (response.status !== 201 || deviceId === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `deviceRegistry: register ${response.status}: ${truncateToLength(String(jsonStringify(response.data) ?? ""), 200)}`,
      "deviceRegistry: register HTTP error",
      "http_error",
    );
  if (response.data?.revoked_at !== null && response.data?.revoked_at !== undefined)
    throw new DeviceKeyRefusedError(deviceKey.publicKeySpkiB64);
  let lower = deviceId.toLowerCase();
  await deviceKey.setRowPk(lower).catch((error) => {
    logForDebugging(
      `[deviceRegistry] registered device row=${lower} but could not cache it: ${errorMessage(error)}`,
    );
  });
  logForDebugging(`[deviceRegistry] registered device row=${lower}`);
  logFeatureOk("device_registry_register");
  return {
    deviceUUID: lower,
    key: deviceKey,
  };
}
//@ chunk-dk1d903v.js:12687-12839 placement
let DeviceLimitReachedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dk1d903v.js:12687", () => {
  DeviceLimitReachedError = class DeviceLimitReachedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor() {
      super(
        "deviceRegistry: account device limit reached",
        "deviceRegistry: account device limit reached",
        "limit_reached",
      );
    }
  };
});
//@ chunk-dk1d903v.js:12839-13082 placement
let DeviceRegistrationUnavailableError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dk1d903v.js:12839", () => {
  DeviceRegistrationUnavailableError = class DeviceRegistrationUnavailableError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(detail) {
      super(
        `deviceRegistry: device registration unavailable for this account or organization (${detail})`,
        "deviceRegistry: device registration unavailable for this account or organization",
        "registration_unavailable",
      );
    }
  };
});
//@ chunk-dk1d903v.js:13082-13317 placement
let DeviceKeyRefusedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dk1d903v.js:13082", () => {
  DeviceKeyRefusedError = class DeviceKeyRefusedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    refusedPublicKey;
    constructor(refusedPublicKey) {
      super(
        "deviceRegistry: this machine's device registration was removed from the account",
        "deviceRegistry: device registration revoked",
        "registration_revoked",
      );
      this.refusedPublicKey = refusedPublicKey;
    }
  };
});
//@ chunk-dk1d903v.js:13317-13393 placement
async function reregisterDevice(accountUuid, displayName, publicKeySpkiB64, credentials) {
  await retireDroppedDeviceKey(accountUuid, publicKeySpkiB64, credentials, 2);
  return registerDeviceCached(accountUuid, displayName, credentials, {
    relearn: true,
  });
}
//@ chunk-dk1d903v.js:13393-13601 placement
async function retireDroppedDeviceKey(accountUuid, publicKeySpkiB64, credentials, attemptsLeft) {
  let deviceKey = await deviceKeyStore().load(accountUuid, credentials);
  if (deviceKey?.publicKeySpkiB64 !== publicKeySpkiB64) return;
  if (attemptsLeft === 0) throw createKeyNotRetiredError("it is still stored after being dropped");
  await deviceKey.drop().catch((error) => {
    throw createKeyNotRetiredError(errorMessage(error));
  });
  return retireDroppedDeviceKey(accountUuid, publicKeySpkiB64, credentials, attemptsLeft - 1);
}
//@ chunk-dk1d903v.js:13601-13759 placement
function createKeyNotRetiredError(reason) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `deviceRegistry: the removed device's key could not be retired (${reason})`,
    "deviceRegistry: device key not retired",
    "key_not_retired",
  );
}
//@ chunk-dk1d903v.js:13759-13828 placement
async function forgetRegisteredRow(accountUuid, credentials) {
  await (await deviceKeyStore().load(accountUuid, credentials))?.setRowPk(undefined);
}
//@ chunk-dk1d903v.js:13828-13895 placement
function deviceDisplayName() {
  return `Claude Code on ${hostname()} \xB7 ${getPlatformDisplayName("linux")}`;
}
export {
  forgetRegisteredRow,
  registerDeviceCached,
  deviceDisplayName,
  registeredRowPk,
  DeviceLimitReachedError,
  DeviceRegistrationUnavailableError,
  DeviceKeyRefusedError,
  resolveRegisteredDevice,
  loadRegisteredDevice,
  reregisterDevice,
};
