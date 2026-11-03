/**
 * services/oauth/validateOauthToken.ts
 *
 * 2.1.316 新增：调用 /api/oauth/validate 校验令牌并取资料（分类网络错误、超时）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (6)
 * attribution: placement 6
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create_2 } from "../../../vendor/zod/lib/index.mjs";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { sleep } from "../../utils/sleep.js";
import { isExpectedApiError, isNonRetryableClientError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { hn } from "../api/verificationRequired.js";

//@ chunk-aepeg2w5.js:293799-293883 placement
var sv = DoctorLazy(() => create_2().regex(/^[\p{L}\p{N}](?:[\p{L}\p{N} .+-]{0,38}[\p{L}\p{N}+])?$/u));
//@ chunk-aepeg2w5.js:293883-293932 placement
function isPlanDisplayName(e) {
  return sv().safeParse(e).success;
}
//@ chunk-aepeg2w5.js:293932-294143 placement
function planDisplayNameFromProfile(e) {
  let n = e?.organization?.plan_display_name;
  if (n === void 0 || n === null) return null;
  let safeParse = sv().safeParse(n);
  if (!safeParse.success) return (logFeatureSad("oauth_profile_fetch", "plan_display_name_rejected"), null);
  return safeParse.data;
}
//@ chunk-aepeg2w5.js:294143-294454 placement
async function validateOauthToken(e, n = []) {
  let r = await validateOauthTokenWithOutcome(e);
  for (let s of n) {
    if (r.ok || !isTransientValidateFailure(r)) break;
    (await sleep(s), (r = await validateOauthTokenWithOutcome(e)));
  }
  if (r.ok) return (logFeatureOk("oauth_token_validate"), r.data);
  if ((logFeatureSad("oauth_token_validate", "oauth_validate_failed"), isExpectedApiError(r.error)))
    logForDebugging(`Failed to validate OAuth token: ${r.error}`, { level: "error" });
  else logError(r.error);
  return;
}
//@ chunk-aepeg2w5.js:294454-294752 placement
function isTransientValidateFailure(e) {
  switch (e.reason) {
    case "timeout":
    case "dns":
    case "connect":
    case "network_error":
      return !0;
    case "http_error":
      return (
        e.status !== void 0 &&
        (e.status >= 500 ||
          (e.status >= 300 && e.status < 400) ||
          (e.status >= 400 && !isNonRetryableClientError(e.status)))
      );
    case "tls":
    case "proxy":
    case "unauthorized":
    case "forbidden":
    case "error":
      return !1;
  }
}
//@ chunk-aepeg2w5.js:294752-295624 placement
async function validateOauthTokenWithOutcome(e) {
  let n = `${getOauthConfig().BASE_API_URL}/api/oauth/validate`;
  try {
    return {
      ok: !0,
      data: (
        await Dt.post(n, null, {
          headers: {
            "User-Agent": claudeCodeUserAgent(),
            Authorization: `Bearer ${e}`,
            "Content-Type": "application/json",
          },
          timeout: 1e4,
          ...hn,
        })
      ).data,
    };
  } catch (error) {
    if (!Dt.isAxiosError(error)) return { ok: !1, reason: "error", error: error };
    let s = error.response?.status;
    if (s !== void 0)
      return {
        ok: !1,
        reason: s === 401 ? "unauthorized" : s === 403 ? "forbidden" : s === 407 ? "proxy" : "http_error",
        status: s,
        error: error,
      };
    switch (error.code) {
      case "ECONNABORTED":
      case "ETIMEDOUT":
        return { ok: !1, reason: "timeout", error: error };
      case "ENOTFOUND":
      case "EAI_AGAIN":
        return { ok: !1, reason: "dns", error: error };
      case "ECONNREFUSED":
      case "ECONNRESET":
      case "EHOSTUNREACH":
      case "ENETUNREACH":
      case "EPIPE":
        return { ok: !1, reason: "connect", error: error };
      default:
        return {
          ok: !1,
          reason:
            error.code !== void 0 && /CERT|TLS|SSL|SELF_SIGNED|UNABLE_TO_VERIFY|EPROTO/.test(error.code)
              ? "tls"
              : "network_error",
          error: error,
        };
    }
  }
}

export { isPlanDisplayName, validateOauthToken, planDisplayNameFromProfile };
