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
import { Vt } from "../utils/agentId.js";
import { truncateCodePoints, truncateToLength } from "../utils/stringUtils.js";
import { hCe } from "./deviceBindingPolicy.js";
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
var REMOTE_DEVICES_API_PATH = "/api/organizations/:orgUUID/cowork/remote_devices",
  COWORK_REMOTE_DEVICE_LIMIT_REACHED = "cowork_remote_device_limit_reached",
  ACCOUNT_SESSION_INVALID = "account_session_invalid",
  DEVICE_REGISTRATION_REVOKED_CODE = "cowork_remote_device_registration_revoked";
//@ chunk-x58vpmpd.js:10588-10642 placement
async function registeredRowPk(e, r) {
  return (await resolveRegisteredDevice(e, r))?.rowPk;
}
//@ chunk-x58vpmpd.js:10642-10757 placement
async function loadRegisteredDevice(e, r) {
  let load = await deviceKeyStore().load(e, r),
    i = Vt(load?.rowPk)?.toLowerCase();
  return load && i ? { rowPk: i, key: load } : void 0;
}
//@ chunk-x58vpmpd.js:10757-10866 placement
async function resolveRegisteredDevice(e, r, n) {
  if (n?.accountUuid === e) return n;
  let i = await loadRegisteredDevice(e, r);
  return i && { accountUuid: e, ...i };
}
//@ chunk-x58vpmpd.js:10866-10894 placement = chordToDisplayString (1)
function getPlatform() {
  return "linux";
}
//@ chunk-x58vpmpd.js:10894-10955 placement
function Ee(e) {
  return truncateCodePoints(e.trim(), 255) || truncateCodePoints(deviceDisplayName().trim(), 255);
}
//@ chunk-x58vpmpd.js:10955-11173 placement
async function registerDeviceCached(e, r, n, { relearn: i = !1 } = {}) {
  try {
    if (!hCe()) throw new DeviceRegistrationUnavailableError("client egress policy");
    return await registerDevice(e, r, n, i);
  } catch (error) {
    throw (
      logFeatureBad(
        "device_registry_register",
        (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && error.errorClass) ||
          "unexpected_error",
      ),
      error
    );
  }
}
/**
 * 向设备注册表登记本机：加载或生成设备密钥，上传公钥并保存返回的行主键。
 */
//@ chunk-x58vpmpd.js:11173-12687 placement
async function registerDevice(e, r, n, i) {
  let orCreate = await deviceKeyStore().loadOrCreate(e, n);
  if (orCreate.rowPk && !i)
    return (logFeatureOk("device_registry_register"), { deviceUUID: orCreate.rowPk, key: orCreate });
  let a = await apiClient
    .post(
      REMOTE_DEVICES_API_PATH,
      { display_name: Ee(r), platform: getPlatform(), public_key: orCreate.publicKeySpkiB64 },
      {
        auth: "teleport-org",
        headers: { "anthropic-beta": OAUTH_BETA_HEADER },
        timeout: 1e4,
        validateStatus: () => !0,
        credentials: n,
      },
    )
    .catch((D) => {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: register request failed (${errorMessage(D)})`,
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
  if (
    (logForDebugging(
      `[deviceRegistry] register status=${a.status} request_id=${String(a.response.headers?.["request-id"] ?? "")}`,
    ),
    a.status === 400 && a.data?.error?.details?.error_code === COWORK_REMOTE_DEVICE_LIMIT_REACHED)
  )
    throw new DeviceLimitReachedError();
  if (
    (a.status === 403 && a.data?.error?.details?.error_code !== ACCOUNT_SESSION_INVALID) ||
    a.status === 404
  )
    throw new DeviceRegistrationUnavailableError(`HTTP ${a.status}`);
  let c = a.data?.error?.details?.error_code;
  if (c === DEVICE_REGISTRATION_REVOKED_CODE || (a.status === 409 && c === void 0))
    throw new DeviceKeyRefusedError(orCreate.publicKeySpkiB64);
  let y = Vt(a.data?.id);
  if (a.status !== 201 || y === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `deviceRegistry: register ${a.status}: ${truncateToLength(String(jsonStringify(a.data) ?? ""), 200)}`,
      "deviceRegistry: register HTTP error",
      "http_error",
    );
  if (a.data?.revoked_at !== null && a.data?.revoked_at !== void 0)
    throw new DeviceKeyRefusedError(orCreate.publicKeySpkiB64);
  let lower = y.toLowerCase();
  return (
    await orCreate.setRowPk(lower).catch((D) => {
      logForDebugging(
        `[deviceRegistry] registered device row=${lower} but could not cache it: ${errorMessage(D)}`,
      );
    }),
    logForDebugging(`[deviceRegistry] registered device row=${lower}`),
    logFeatureOk("device_registry_register"),
    { deviceUUID: lower, key: orCreate }
  );
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
  constructor(e) {
    super(
      "deviceRegistry: this machine's device registration was removed from the account",
      "deviceRegistry: device registration revoked",
      "registration_revoked",
    );
    this.refusedPublicKey = e;
  }
}
//@ chunk-x58vpmpd.js:13317-13393 placement
async function reregisterDevice(e, r, n, i) {
  return (await retireDroppedDeviceKey(e, n, i, 2), registerDeviceCached(e, r, i, { relearn: !0 }));
}
//@ chunk-x58vpmpd.js:13393-13601 placement
async function retireDroppedDeviceKey(e, r, n, i) {
  let load = await deviceKeyStore().load(e, n);
  if (load?.publicKeySpkiB64 !== r) return;
  if (i === 0) throw createKeyNotRetiredError("it is still stored after being dropped");
  return (
    await load.drop().catch((a) => {
      throw createKeyNotRetiredError(errorMessage(a));
    }),
    retireDroppedDeviceKey(e, r, n, i - 1)
  );
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
async function forgetRegisteredRow(e, r) {
  await (await deviceKeyStore().load(e, r))?.setRowPk(void 0);
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
