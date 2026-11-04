/**
 * services/oauth/getOauthProfile.ts
 *
 * 拉取账户 profile：/api/oauth/profile（Bearer）与 /api/claude_cli_profile（x-api-key），校验形状并分类失败原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/oauth/getOauthProfile.ts
 * pieces: chunk-aepeg2w5.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { getGlobalConfig } from "../../utils/config.js";
import { apiKeyForHost } from "../analytics/telemetryCredentialGuard.js";
import { getAnthropicApiKey } from "../../utils/auth.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import {
  FAST_MODE_CHECK_HTTP_OPTIONS,
  parseOauthProfileResponse,
  classifyProfileFetchError,
  profileFetchErrorCode,
} from "../api/verificationRequired.js";
import { isExpectedApiError, classifyAxiosError, isNonRetryableClientError } from "../../utils/errors.js";
import { logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { isSessionsToken } from "./sessionsBearerHooks.js";

//@ chunk-aepeg2w5.js:292428-292931 placement = getOauthProfileFromApiKey (0.622)
/**
 * GET <BASE_API_URL>/api/claude_cli_profile（x-api-key + oauth beta），API key 用户取账户信息。
 */
async function getOauthProfileFromApiKey() {
  let accountUuid = getGlobalConfig().oauthAccount?.accountUuid;
  let apiKey = apiKeyForHost(getAnthropicApiKey());
  if (!accountUuid || !apiKey) return;
  let endpoint = `${getOauthConfig().BASE_API_URL}/api/claude_cli_profile`;
  try {
    let response = await axios_default.get(endpoint, {
      headers: {
        "User-Agent": claudeCodeUserAgent(),
        "x-api-key": apiKey,
        "anthropic-beta": OAUTH_BETA_HEADER,
        "Cache-Control": "no-cache",
      },
      params: {
        account_uuid: accountUuid,
      },
      timeout: 1e4,
      ...FAST_MODE_CHECK_HTTP_OPTIONS,
    });
    return parseOauthProfileResponse(response.data);
  } catch (error) {
    if (isExpectedApiError(error)) {
      logFeatureSad("oauth_profile_fetch", `api_key_${classifyProfileFetchError(error)}`);
      logForDebugging(`Failed to fetch oauth profile from API key: ${error}`, {
        level: "error",
      });
    } else {
      logFeatureBad("oauth_profile_fetch", `api_key_${profileFetchErrorCode(error)}`);
      logError(error);
    }
  }
}
//@ chunk-aepeg2w5.js:292931-293028 placement
async function getOauthProfileWithOriginFromOauthToken(accessToken) {
  let oauthProfileFromOauthToken = await getOauthProfileFromOauthToken_2(accessToken);
  return oauthProfileFromOauthToken.ok
    ? {
        profile: oauthProfileFromOauthToken.profile,
        stamped: oauthProfileFromOauthToken.stamped,
      }
    : undefined;
}
//@ chunk-aepeg2w5.js:293028-293097 placement
/**
 * GET <BASE_API_URL>/api/oauth/profile（Bearer），校验响应形状，失败分类 no_auth/rate_limited/timeout/network_error。
 */
async function getOauthProfileFromOauthToken(accessToken) {
  let oauthProfileFromOauthToken = await getOauthProfileFromOauthToken_2(accessToken);
  return oauthProfileFromOauthToken.ok ? oauthProfileFromOauthToken.profile : undefined;
}
//@ chunk-aepeg2w5.js:293097-293799 fingerprint = getOauthProfileFromOauthToken (0.434)
async function getOauthProfileFromOauthToken_2(accessToken) {
  let endpoint = `${getOauthConfig().BASE_API_URL}/api/oauth/profile`;
  try {
    let response = await axios_default.get(endpoint, {
      headers: {
        "User-Agent": claudeCodeUserAgent(),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      timeout: 1e4,
      ...FAST_MODE_CHECK_HTTP_OPTIONS,
    });
    let oauthProfileResponse = parseOauthProfileResponse(response.data);
    if (oauthProfileResponse === undefined)
      return {
        ok: false,
        why: "no_answer",
      };
    let requestId =
      typeof response.headers?.get === "function"
        ? response.headers.get("request-id")
        : response.headers?.["request-id"];
    return {
      ok: true,
      profile: oauthProfileResponse,
      stamped: isSessionsToken(requestId),
    };
  } catch (error) {
    if (isExpectedApiError(error)) {
      logFeatureSad("oauth_profile_fetch", `token_${classifyProfileFetchError(error)}`);
      logForDebugging(`Failed to fetch oauth profile from OAuth token: ${error}`, {
        level: "error",
      });
    } else {
      logFeatureBad("oauth_profile_fetch", `token_${profileFetchErrorCode(error)}`);
      logError(error);
    }
    let { kind, status } = classifyAxiosError(error);
    return {
      ok: false,
      why: kind === "other" ? "fault" : isNonRetryableClientError(status) ? "refused" : "no_answer",
    };
  }
}
export { getOauthProfileFromOauthToken, getOauthProfileWithOriginFromOauthToken, getOauthProfileFromApiKey };
