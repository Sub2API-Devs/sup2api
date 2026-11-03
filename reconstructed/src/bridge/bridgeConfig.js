/**
 * bridge/bridgeConfig.ts
 *
 * 并入已有模块：桥接配置的几个小读取函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeConfig.ts
 * pieces: chunk-71c4j971.js (5), chunk-hqdsrzb2.js (1), chunk-wp3fcgm5.js (10)
 * attribution: placement 4, fingerprint 1, facade-exports 10, affinity 1
 */
import { hostname } from "os";
import { isStoredLoginRefused } from "../utils/auth/storedLoginRefused.js";
import {
  getClaudeAIOAuthTokens,
  isClaudeAISubscriber,
  isClaudeAISubscriberAsync,
  getClaudeAIOAuthTokensAsync,
  getOauthAccountInfo_2,
  getClaudeAIOAuthTokenFingerprint,
} from "../utils/auth.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import { loginToHandOn } from "../utils/auth/launcherHostLogin.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  readHostSessionsBearer,
  ensureHostSessionsBearer,
  recoverHostSessionsBearer,
} from "../utils/hostSessionsBearer.js";
import { getOauthConfig } from "../constants/oauth.js";
import { isGrowthBookEnabled } from "../services/analytics/growthbook.js";
import { env } from "../utils/env.js";
import { getPrivacyLevel } from "../utils/privacyLevel.js";
import { isFeedbackSurveyOtelOn } from "../utils/hostEnvironment.js";
import { getBearerPlan } from "../bootstrap/state.js";
import { BEARER_PLAN_REFRESH_MS } from "./bridgeEnabled.js";
import { SSH_PLACEHOLDER } from "../utils/subprocessEnv.js";

//@ chunk-wp3fcgm5.js:527-548 facade-exports
function getBridgeTokenOverride() {
  return;
}
//@ chunk-wp3fcgm5.js:548-657 facade-exports
function isBridgeFileLoginRefused(e = getBridgeBaseUrlOverride(), n) {
  if (getBridgeTokenOverride() !== undefined) return false;
  return (
    isStoredLoginRefused(e) ||
    (n !== undefined && n !== getClaudeAIOAuthTokens()?.accessToken && isStoredLoginRefused(e, true))
  );
}
//@ chunk-wp3fcgm5.js:657-758 facade-exports
function getBridgeAccessToken() {
  let bridgeTokenOverride = getBridgeTokenOverride();
  if (bridgeTokenOverride !== undefined) return bridgeTokenOverride;
  if (!isFirstPartyProvider() || !isClaudeAISubscriber()) return;
  return loginToHandOn(getClaudeAIOAuthTokens())?.accessToken;
}
//@ chunk-wp3fcgm5.js:758-915 facade-exports
async function getBridgeAccessTokenAsync(e) {
  if (!(isStorageV5Enabled() && e !== undefined)) return getBridgeAccessToken();
  let bridgeTokenOverride = getBridgeTokenOverride();
  if (bridgeTokenOverride !== undefined) return bridgeTokenOverride;
  if (!isFirstPartyProvider() || !(await isClaudeAISubscriberAsync(e))) return;
  return loginToHandOn(await getClaudeAIOAuthTokensAsync(e))?.accessToken;
}
//@ chunk-wp3fcgm5.js:915-995 facade-exports
function getBridgeSessionsAccessToken() {
  let bridgeAccessToken = getBridgeAccessToken();
  if (bridgeAccessToken === undefined || getBridgeTokenOverride() !== undefined) return bridgeAccessToken;
  return readHostSessionsBearer() ?? bridgeAccessToken;
}
//@ chunk-wp3fcgm5.js:995-1094 facade-exports
async function getBridgeSessionsAccessTokenAsync(credentials) {
  let bridgeAccessToken = await getBridgeAccessTokenAsync(credentials);
  if (bridgeAccessToken === undefined || getBridgeTokenOverride() !== undefined) return bridgeAccessToken;
  return (await ensureHostSessionsBearer()) ?? bridgeAccessToken;
}
//@ chunk-wp3fcgm5.js:1094-1195 facade-exports
async function bridgeSessionsAccessTokenAfter401(e, credentials, r = false) {
  if ((await recoverHostSessionsBearer(e, r ? "withheld" : "refused")) === "not_held") return;
  return getBridgeSessionsAccessTokenAsync(credentials);
}
//@ chunk-wp3fcgm5.js:1195-1240 facade-exports = getTeamMemorySyncEndpoint (1)
function getBridgeBaseUrl() {
  return getBridgeBaseUrlOverride() ?? getOauthConfig().BASE_API_URL;
}
//@ chunk-wp3fcgm5.js:1240-1350 facade-exports
function getBridgeSessionNamePrefix() {
  let e = process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX || hostname();
  return slugifyBridgeSessionName(e) || "remote-control";
}
//@ chunk-wp3fcgm5.js:1350-1437 affinity
function slugifyBridgeSessionName(e) {
  return e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
//@ chunk-71c4j971.js:2819-2899 placement
function isGrowthBookUnavailableOnNoTelemetry() {
  return (
    !isGrowthBookEnabled() &&
    !env.DISABLE_GROWTHBOOK &&
    getPrivacyLevel() === "no-telemetry" &&
    !isFeedbackSurveyOtelOn()
  );
}
//@ chunk-71c4j971.js:2899-3113 placement
function getBearerSubscriptionType() {
  let bearerPlan = getBearerPlan();
  let named = bearerPlan?.named;
  if (!named || bearerPlan?.bearerSha256 !== getBridgeAccessToken_2()) return null;
  return (env.CLAUDE_CODE_ORGANIZATION_UUID || getOauthAccountInfo_2()?.organizationUuid)?.toLowerCase() ===
    named.organizationUuid.toLowerCase()
    ? named.subscriptionType
    : null;
}
//@ chunk-71c4j971.js:3113-3223 placement
function hasFreshBearerPlan() {
  let bearerPlan = getBearerPlan();
  return (
    bearerPlan !== null &&
    bearerPlan.bearerSha256 === getBridgeAccessToken_2() &&
    (bearerPlan.named !== null || Date.now() - bearerPlan.answeredAtMs < BEARER_PLAN_REFRESH_MS)
  );
}
//@ chunk-71c4j971.js:3223-3259 placement
function isBridgeEntitlementHintAvailable() {
  return isGrowthBookUnavailableOnNoTelemetry() && getBearerSubscriptionType() !== null;
}
//@ chunk-71c4j971.js:3259-3364 fingerprint = getBridgeAccessToken (0.638)
function getBridgeAccessToken_2() {
  try {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    return claudeAIOAuthTokens &&
      !claudeAIOAuthTokens.refreshToken &&
      claudeAIOAuthTokens.accessToken !== SSH_PLACEHOLDER
      ? getClaudeAIOAuthTokenFingerprint()
      : null;
  } catch {
    return null;
  }
}
//@ chunk-hqdsrzb2.js:425-446 facade-exports
function getBridgeBaseUrlOverride() {
  return;
}
export {
  isGrowthBookUnavailableOnNoTelemetry,
  getBearerSubscriptionType,
  getBridgeAccessToken_2,
  hasFreshBearerPlan,
  getBridgeAccessTokenAsync,
  getBridgeAccessToken,
  getBridgeSessionNamePrefix,
  getBridgeBaseUrl,
  isBridgeFileLoginRefused,
  getBridgeTokenOverride,
  getBridgeBaseUrlOverride,
  isBridgeEntitlementHintAvailable,
  getBridgeSessionsAccessToken,
  getBridgeSessionsAccessTokenAsync,
  bridgeSessionsAccessTokenAfter401,
};
