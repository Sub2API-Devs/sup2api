/**
 * utils/teleport/trustedDevice.ts
 *
 * 2.1.316 新增：可信设备
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { X_TRUSTED_DEVICE_TOKEN } from "./cloudLaunch.js";
import { trustedDeviceHeaders, resendAfterUntrustedDevice, getOAuthRequestHeaders } from "./api.js";
import { lacksAuthorizationHeader } from "../../services/oauth/sessionsBearerHooks.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isAbortError } from "../errors.js";

//@ chunk-e6aww6q8.js:1878366-1879795 placement
/**
 * 确保本机为可信设备（创建设备证明、处理令牌被拒与恢复关闭）。
 */
async function ensureTrustedDevice(referralEligibility, n, r) {
  let s = wi(n ?? {}, (Z, Se) => Se.toLowerCase() === X_TRUSTED_DEVICE_TOKEN.toLowerCase());
  let h = {
    ...referralEligibility.headers,
    ...s,
    ...(referralEligibility.profile ? {} : await trustedDeviceHeaders()),
  };
  let y = await r(h);
  if (
    !referralEligibility.profile &&
    y.status === 401 &&
    referralEligibility.recoverBearer !== undefined &&
    !referralEligibility.reauthorized
  ) {
    referralEligibility.reauthorized = true;
    let bearer = referralEligibility.bearer;
    let Se = lacksAuthorizationHeader(y.config);
    if (!(await referralEligibility.recoverBearer(bearer, Se))) return y;
    let ke = await refreshBearerHeaders(referralEligibility);
    if (!Se && referralEligibility.bearer === bearer) return y;
    h = {
      ...ke,
      ...s,
      ...(await trustedDeviceHeaders()),
    };
    y = await r(h);
    if (y.status === 401 && !lacksAuthorizationHeader(y.config))
      referralEligibility.recoverBearer(referralEligibility.bearer, false).catch(() => {});
  }
  if (referralEligibility.profile || referralEligibility.recovery !== undefined || y.status !== 403) return y;
  let { classifyElevatedAuthError, readUntrustedDeviceRefusal } = await import("./chunk-g9dw262t.js");
  if (readUntrustedDeviceRefusal(y.data)?.kind !== "token_refused") return y;
  let { isDeviceIdentityEnabled } = await import("./chunk-m288yvvf.js");
  if (!(await isDeviceIdentityEnabled().catch(() => false))) {
    referralEligibility.recovery = "disabled";
    logFeatureSad("cloud_create_device_proof", "recovery_disabled");
    return y;
  }
  referralEligibility.recovery = "tried";
  let G;
  let q = await resendAfterUntrustedDevice(
    y,
    h[X_TRUSTED_DEVICE_TOKEN],
    async (Z) => {
      let Se = await refreshBearerHeaders(referralEligibility);
      referralEligibility.reenrolled = true;
      return r({
        ...Se,
        ...s,
        [X_TRUSTED_DEVICE_TOKEN]: Z,
      }).catch((error) => {
        G = {
          error,
        };
        throw error;
      });
    },
    "cloud_session",
  );
  if (!referralEligibility.reenrolled) await refreshBearerHeaders(referralEligibility);
  if (G !== undefined) {
    if (!isAbortError(G.error)) logFeatureSad("cloud_create_device_proof", "resend_unanswered");
    throw G.error;
  }
  if (!referralEligibility.reenrolled) logFeatureSad("cloud_create_device_proof", "not_reenrolled");
  else if (
    q.status === 403 &&
    (readUntrustedDeviceRefusal(q.data)?.kind === "token_refused" ||
      classifyElevatedAuthError(q.data) === "session_stale_relogin")
  )
    logFeatureSad("cloud_create_device_proof", "refused_after_reenroll");
  else logFeatureOk("cloud_create_device_proof");
  return q;
}
//@ chunk-e6aww6q8.js:1879795-1879940 placement
async function refreshBearerHeaders(e) {
  let n = await e.readBearer().catch(() => {
    return;
  });
  if (n !== undefined) {
    e.bearer = n;
    e.headers = {
      ...e.headers,
      ...getOAuthRequestHeaders(n),
    };
  }
  return e.headers;
}
//@ chunk-e6aww6q8.js:1879940-1880061 placement
var UNTRUSTED_DEVICE_MESSAGE =
  "this computer is not a trusted device for your account yet. Sign in again with /login to enroll it, then retry";
//@ chunk-e6aww6q8.js:1880061-1880538 placement
/**
 * 403 时检查是否因设备不可信被拒，返回登录登记提示。
 */
async function explainUntrustedDeviceRefusal(response, referralEligibility) {
  if (referralEligibility.profile || response.status !== 403) return;
  let { classifyElevatedAuthError, readUntrustedDeviceRefusal } = await import("./chunk-g9dw262t.js");
  let { loginEnrollmentOnThisComputer, SESSION_STALE_RELOGIN_HINT, untrustedDeviceHint } =
    await import("./chunk-3kb57csj.js");
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
