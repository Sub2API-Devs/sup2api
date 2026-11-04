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
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { FAST_MODE_CHECK_HTTP_OPTIONS } from "../api/verificationRequired.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:293799-293883 placement
/**
 * 套餐显示名的 schema（字母数字开头，允许空格与 .+-）。
 */
var planDisplayNameSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:293799", () => {
  planDisplayNameSchema = DoctorLazy(() =>
    create_2().regex(/^[\p{L}\p{N}](?:[\p{L}\p{N} .+-]{0,38}[\p{L}\p{N}+])?$/u),
  );
});
//@ chunk-aepeg2w5.js:293883-293932 placement
function isPlanDisplayName(planDisplayName) {
  return planDisplayNameSchema().safeParse(planDisplayName).success;
}
//@ chunk-aepeg2w5.js:293932-294143 placement
function planDisplayNameFromProfile(profile) {
  let planDisplayName = profile?.organization?.plan_display_name;
  if (planDisplayName === undefined || planDisplayName === null) return null;
  let parsed = planDisplayNameSchema().safeParse(planDisplayName);
  if (!parsed.success) {
    logFeatureSad("oauth_profile_fetch", "plan_display_name_rejected");
    return null;
  }
  return parsed.data;
}
//@ chunk-aepeg2w5.js:294143-294454 placement
async function validateOauthToken(accessToken, retryDelaysMs = []) {
  let outcome = await validateOauthTokenWithOutcome(accessToken);
  for (let delayMs of retryDelaysMs) {
    if (outcome.ok || !isTransientValidateFailure(outcome)) break;
    await sleep(delayMs);
    outcome = await validateOauthTokenWithOutcome(accessToken);
  }
  if (outcome.ok) {
    logFeatureOk("oauth_token_validate");
    return outcome.data;
  }
  logFeatureSad("oauth_token_validate", "oauth_validate_failed");
  if (isExpectedApiError(outcome.error))
    logForDebugging(`Failed to validate OAuth token: ${outcome.error}`, {
      level: "error",
    });
  else logError(outcome.error);
  return;
}
//@ chunk-aepeg2w5.js:294454-294752 placement
function isTransientValidateFailure(outcome) {
  switch (outcome.reason) {
    case "timeout":
    case "dns":
    case "connect":
    case "network_error":
      return true;
    case "http_error":
      return (
        outcome.status !== undefined &&
        (outcome.status >= 500 ||
          (outcome.status >= 300 && outcome.status < 400) ||
          (outcome.status >= 400 && !isNonRetryableClientError(outcome.status)))
      );
    case "tls":
    case "proxy":
    case "unauthorized":
    case "forbidden":
    case "error":
      return false;
  }
}
//@ chunk-aepeg2w5.js:294752-295624 placement
async function validateOauthTokenWithOutcome(accessToken) {
  let validateUrl = `${getOauthConfig().BASE_API_URL}/api/oauth/validate`;
  try {
    return {
      ok: true,
      data: (
        await axios_default.post(validateUrl, null, {
          headers: {
            "User-Agent": claudeCodeUserAgent(),
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 1e4,
          ...FAST_MODE_CHECK_HTTP_OPTIONS,
        })
      ).data,
    };
  } catch (error) {
    if (!axios_default.isAxiosError(error))
      return {
        ok: false,
        reason: "error",
        error,
      };
    let status = error.response?.status;
    if (status !== undefined)
      return {
        ok: false,
        reason:
          status === 401
            ? "unauthorized"
            : status === 403
              ? "forbidden"
              : status === 407
                ? "proxy"
                : "http_error",
        status,
        error,
      };
    switch (error.code) {
      case "ECONNABORTED":
      case "ETIMEDOUT":
        return {
          ok: false,
          reason: "timeout",
          error,
        };
      case "ENOTFOUND":
      case "EAI_AGAIN":
        return {
          ok: false,
          reason: "dns",
          error,
        };
      case "ECONNREFUSED":
      case "ECONNRESET":
      case "EHOSTUNREACH":
      case "ENETUNREACH":
      case "EPIPE":
        return {
          ok: false,
          reason: "connect",
          error,
        };
      default:
        return {
          ok: false,
          reason:
            error.code !== undefined && /CERT|TLS|SSL|SELF_SIGNED|UNABLE_TO_VERIFY|EPROTO/.test(error.code)
              ? "tls"
              : "network_error",
          error,
        };
    }
  }
}
export {
  isPlanDisplayName,
  validateOauthToken,
  planDisplayNameFromProfile,
  isTransientValidateFailure,
  validateOauthTokenWithOutcome,
};
