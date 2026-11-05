/**
 * utils/teleport/trustedDevice.ts
 *
 * 2.1.316 新增：可信设备
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { X_TRUSTED_DEVICE_TOKEN } from "./cloudLaunch.js";
import { trustedDeviceHeaders, resendAfterUntrustedDevice, getOAuthRequestHeaders } from "./api.js";
import { lacksAuthorizationHeader } from "../../services/oauth/sessionsBearerHooks.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isAbortError } from "../errors.js";

//@ chunk-5xgkngpb.js:1957186-1958621 placement
/**
 * 确保本机为可信设备（创建设备证明、处理令牌被拒与恢复关闭）。
 */
async function ensureTrustedDevice(provider, referral, options) {
  let referralHeaders = import_reject(
    referral ?? {},
    (value, headerName) => headerName.toLowerCase() === X_TRUSTED_DEVICE_TOKEN.toLowerCase(),
  );
  let headers = {
    ...provider.headers,
    ...referralHeaders,
    ...(provider.profile ? {} : await trustedDeviceHeaders()),
  };
  let response = await options(headers);
  if (
    !provider.profile &&
    response.status === 401 &&
    provider.recoverBearer !== undefined &&
    !provider.reauthorized
  ) {
    provider.reauthorized = true;
    let bearer = provider.bearer;
    let lacksAuth = lacksAuthorizationHeader(response.config);
    if (!(await provider.recoverBearer(bearer, lacksAuth))) return response;
    let refreshedHeaders = await refreshBearerHeaders(provider);
    if (!lacksAuth && provider.bearer === bearer) return response;
    headers = {
      ...refreshedHeaders,
      ...referralHeaders,
      ...(await trustedDeviceHeaders()),
    };
    response = await options(headers);
    if (response.status === 401 && !lacksAuthorizationHeader(response.config))
      provider.recoverBearer(provider.bearer, false).catch(() => {});
  }
  if (provider.profile || provider.recovery !== undefined || response.status !== 403) return response;
  let { classifyElevatedAuthError, readUntrustedDeviceRefusal } =
    await import("../../bridge/codeSessionApi.js");
  if (readUntrustedDeviceRefusal(response.data)?.kind !== "token_refused") return response;
  let { isDeviceIdentityEnabled } = await import("../../services/analytics/violinGates.js");
  if (!(await isDeviceIdentityEnabled().catch(() => false))) {
    provider.recovery = "disabled";
    logFeatureSad("cloud_create_device_proof", "recovery_disabled");
    return response;
  }
  provider.recovery = "tried";
  let resendError;
  let secondResponse = await resendAfterUntrustedDevice(
    response,
    headers[X_TRUSTED_DEVICE_TOKEN],
    async (newToken) => {
      let refreshedHeaders = await refreshBearerHeaders(provider);
      provider.reenrolled = true;
      return options({
        ...refreshedHeaders,
        ...referralHeaders,
        [X_TRUSTED_DEVICE_TOKEN]: newToken,
      }).catch((error) => {
        resendError = {
          error,
        };
        throw error;
      });
    },
    "cloud_session",
  );
  if (!provider.reenrolled) await refreshBearerHeaders(provider);
  if (resendError !== undefined) {
    if (!isAbortError(resendError.error)) logFeatureSad("cloud_create_device_proof", "resend_unanswered");
    throw resendError.error;
  }
  if (!provider.reenrolled) logFeatureSad("cloud_create_device_proof", "not_reenrolled");
  else if (
    secondResponse.status === 403 &&
    (readUntrustedDeviceRefusal(secondResponse.data)?.kind === "token_refused" ||
      classifyElevatedAuthError(secondResponse.data) === "session_stale_relogin")
  )
    logFeatureSad("cloud_create_device_proof", "refused_after_reenroll");
  else logFeatureOk("cloud_create_device_proof");
  return secondResponse;
}
//@ chunk-5xgkngpb.js:1958621-1958766 placement
async function refreshBearerHeaders(provider) {
  let token = await provider.readBearer().catch(() => {
    return;
  });
  if (token !== undefined) {
    provider.bearer = token;
    provider.headers = {
      ...provider.headers,
      ...getOAuthRequestHeaders(token),
    };
  }
  return provider.headers;
}
//@ chunk-5xgkngpb.js:1958766-1958887 placement
var UNTRUSTED_DEVICE_MESSAGE =
  "this computer is not a trusted device for your account yet. Sign in again with /login to enroll it, then retry";
//@ chunk-5xgkngpb.js:1958887-1959364 placement
/**
 * 403 时检查是否因设备不可信被拒，返回登录登记提示。
 */
async function explainUntrustedDeviceRefusal(response, referralEligibility) {
  if (referralEligibility.profile || response.status !== 403) return;
  let { classifyElevatedAuthError, readUntrustedDeviceRefusal } =
    await import("../../bridge/codeSessionApi.js");
  let { loginEnrollmentOnThisComputer, SESSION_STALE_RELOGIN_HINT, untrustedDeviceHint } =
    await import("../../bridge/trustedDevice.js");
  let untrustedDeviceRefusal = readUntrustedDeviceRefusal(response.data);
  if (untrustedDeviceRefusal === undefined)
    return classifyElevatedAuthError(response.data) === "session_stale_relogin"
      ? SESSION_STALE_RELOGIN_HINT
      : undefined;
  if (untrustedDeviceRefusal.kind !== "token_refused") return;
  return referralEligibility.recovery === "disabled" && loginEnrollmentOnThisComputer() === "enrolls"
    ? UNTRUSTED_DEVICE_MESSAGE
    : untrustedDeviceHint(untrustedDeviceRefusal, {
        justEnrolled: referralEligibility.reenrolled,
      });
}
export { ensureTrustedDevice, explainUntrustedDeviceRefusal };
