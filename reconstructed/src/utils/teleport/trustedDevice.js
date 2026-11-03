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

/**
 * 确保本机为可信设备（创建设备证明、处理令牌被拒与恢复关闭）。
 */
//@ chunk-e6aww6q8.js:1878366-1879795 placement
async function ensureTrustedDevice(e, n, r) {
  let s = wi(n ?? {}, (Z, Se) => Se.toLowerCase() === X_TRUSTED_DEVICE_TOKEN.toLowerCase()),
    h = { ...e.headers, ...s, ...(e.profile ? {} : await trustedDeviceHeaders()) },
    y = await r(h);
  if (!e.profile && y.status === 401 && e.recoverBearer !== void 0 && !e.reauthorized) {
    e.reauthorized = !0;
    let bearer = e.bearer,
      Se = lacksAuthorizationHeader(y.config);
    if (!(await e.recoverBearer(bearer, Se))) return y;
    let ke = await refreshBearerHeaders(e);
    if (!Se && e.bearer === bearer) return y;
    if (
      ((h = { ...ke, ...s, ...(await trustedDeviceHeaders()) }),
      (y = await r(h)),
      y.status === 401 && !lacksAuthorizationHeader(y.config))
    )
      e.recoverBearer(e.bearer, !1).catch(() => {});
  }
  if (e.profile || e.recovery !== void 0 || y.status !== 403) return y;
  let {
    classifyElevatedAuthError: classifyElevatedAuthError,
    readUntrustedDeviceRefusal: readUntrustedDeviceRefusal,
  } = await import("./chunk-g9dw262t.js");
  if (readUntrustedDeviceRefusal(y.data)?.kind !== "token_refused") return y;
  let { isDeviceIdentityEnabled: isDeviceIdentityEnabled } = await import("./chunk-m288yvvf.js");
  if (!(await isDeviceIdentityEnabled().catch(() => !1)))
    return ((e.recovery = "disabled"), logFeatureSad("cloud_create_device_proof", "recovery_disabled"), y);
  e.recovery = "tried";
  let G,
    q = await resendAfterUntrustedDevice(
      y,
      h[X_TRUSTED_DEVICE_TOKEN],
      async (Z) => {
        let Se = await refreshBearerHeaders(e);
        return (
          (e.reenrolled = !0),
          r({ ...Se, ...s, [X_TRUSTED_DEVICE_TOKEN]: Z }).catch((ke) => {
            throw ((G = { error: ke }), ke);
          })
        );
      },
      "cloud_session",
    );
  if (!e.reenrolled) await refreshBearerHeaders(e);
  if (G !== void 0) {
    if (!isAbortError(G.error)) logFeatureSad("cloud_create_device_proof", "resend_unanswered");
    throw G.error;
  }
  if (!e.reenrolled) logFeatureSad("cloud_create_device_proof", "not_reenrolled");
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
  if (n !== void 0) ((e.bearer = n), (e.headers = { ...e.headers, ...getOAuthRequestHeaders(n) }));
  return e.headers;
}
//@ chunk-e6aww6q8.js:1879940-1880061 placement
var UNTRUSTED_DEVICE_MESSAGE =
  "this computer is not a trusted device for your account yet. Sign in again with /login to enroll it, then retry";
/**
 * 403 时检查是否因设备不可信被拒，返回登录登记提示。
 */
//@ chunk-e6aww6q8.js:1880061-1880538 placement
async function explainUntrustedDeviceRefusal(e, n) {
  if (n.profile || e.status !== 403) return;
  let {
      classifyElevatedAuthError: classifyElevatedAuthError,
      readUntrustedDeviceRefusal: readUntrustedDeviceRefusal,
    } = await import("./chunk-g9dw262t.js"),
    {
      loginEnrollmentOnThisComputer: loginEnrollmentOnThisComputer,
      SESSION_STALE_RELOGIN_HINT: SESSION_STALE_RELOGIN_HINT,
      untrustedDeviceHint: untrustedDeviceHint,
    } = await import("./chunk-3kb57csj.js"),
    w = readUntrustedDeviceRefusal(e.data);
  if (w === void 0)
    return classifyElevatedAuthError(e.data) === "session_stale_relogin"
      ? SESSION_STALE_RELOGIN_HINT
      : void 0;
  if (w.kind !== "token_refused") return;
  return n.recovery === "disabled" && loginEnrollmentOnThisComputer() === "enrolls"
    ? UNTRUSTED_DEVICE_MESSAGE
    : untrustedDeviceHint(w, { justEnrolled: n.reenrolled });
}

export { ensureTrustedDevice, explainUntrustedDeviceRefusal };
