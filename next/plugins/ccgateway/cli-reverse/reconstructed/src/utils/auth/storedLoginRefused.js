/**
 * utils/auth/storedLoginRefused.ts
 *
 * 2.1.316 新增。存储的登录是否被拒用（例如设置了 helper 或 base URL）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xrw4a49n.js (5)
 * attribution: placement 5
 */
import { isDiskless, isOauthTokenFromBgSnapshot } from "../../bootstrap/state.js";
import { getPolicySlots, isHttpsEndpoint, settleRemotePolicy } from "../model/allowedProviders.js";
import {
  helperTierOf,
  isConfirmedHelperHeld,
  getRemoteHelperTier,
  getRemoteHelperGap,
} from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { getPolicySettingsOrigin } from "../settings/settings.js";
import { armedFromUserWritableBase } from "../settings/policyHelper/helperRemote.js";
import { routesOffAnthropicApiWith } from "../model/providers.js";
import { getEnvCaseInsensitive } from "../plugins/securityDefaultPlugin.js";
import { env } from "../env.js";
import { getOauthConfig } from "../../constants/oauth.js";
import {
  getAuthTokenSource,
  getClaudeAIOAuthTokenOrigin,
  isLoginStashedInTokenSlot,
  isManagedOAuthContext,
  isHostManagedProviderAuth,
  isClaudeAISubscriber,
} from "../auth.js";
import { computeRemoteSettingsEligibility } from "../../services/cloudSessions/eligibility.js";
import {
  getSessionHybridOrganizationUuid,
  isRemoteManagedSettingsVerified,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { logError } from "../log.js";
import { raceWithAbortSignal } from "../sleep.js";

//@ chunk-xrw4a49n.js:608-1405 placement
/**
 * 存储的登录是否被拒用（例如设置了 helper 或 base URL）。
 */
function isStoredLoginRefused(baseUrlOverrideValue, settling = false, includeFilesDial = false) {
  let fallback = true;
  try {
    if (isDiskless()) return false;
    let { machine, slot } = getPolicySlots();
    let machineTier = helperTierOf(machine);
    fallback = machineTier !== null;
    let useRemoteTier =
      machineTier === null &&
      ((getPolicySettingsOrigin() === "helper" && !armedFromUserWritableBase()) ||
        (isConfirmedHelperHeld() &&
          (baseUrlOverrideValue !== undefined || helperTierOf(slot ?? null) === null)));
    let tierConfig = machineTier ?? (useRemoteTier ? null : getRemoteHelperTier());
    fallback = tierConfig !== null;
    if (tierConfig === null) return false;
    let env_2 = tierConfig.env ?? {};
    let routesApi = routesOffAnthropicApiWith((envVarName) =>
      envVarName === "ANTHROPIC_BASE_URL" ? undefined : getEnvCaseInsensitive(env_2, envVarName),
    );
    let baseUrl = baseUrlOverrideValue ?? env.ANTHROPIC_BASE_URL;
    let effectiveBaseUrl =
      baseUrl && !isHttpsEndpoint(baseUrl)
        ? baseUrl
        : baseUrlOverride(slot?.env ?? {}, includeFilesDial) ||
          (routesApi ? undefined : baseUrlOverride(env_2, includeFilesDial) || baseUrl);
    if (effectiveBaseUrl ? isHttpsEndpoint(effectiveBaseUrl) : !routesApi) return false;
    let oauthConfig = getOauthConfig();
    let origin = URL.parse(oauthConfig.BASE_API_URL)?.origin;
    if (
      oauthConfig.OAUTH_FILE_SUFFIX !== "-local-oauth" &&
      origin &&
      origin !== "null" &&
      effectiveBaseUrl &&
      effectiveBaseUrl === baseUrl &&
      URL.parse(effectiveBaseUrl)?.origin === origin
    )
      return false;
    let { source } = getAuthTokenSource();
    let hasEnvToken = source === "CLAUDE_CODE_OAUTH_TOKEN" && getClaudeAIOAuthTokenOrigin() !== "env";
    if (
      (!settling &&
        !hasEnvToken &&
        !isOauthTokenFromBgSnapshot() &&
        !isLoginStashedInTokenSlot() &&
        source !== "claude.ai" &&
        source !== "apiKeyHelper" &&
        source !== "none") ||
      isManagedOAuthContext() ||
      isHostManagedProviderAuth()
    )
      return false;
    computeRemoteSettingsEligibility();
    return getSessionHybridOrganizationUuid() === null;
  } catch {
    logError(Error("Stored login check failed"));
    return fallback;
  }
}
//@ chunk-xrw4a49n.js:1405-1549 placement
function storedLoginRefusalReason() {
  try {
    return helperTierOf(getPolicySlots().machine) === null ? (getRemoteHelperGap() ?? "admin") : "admin";
  } catch {
    logError(Error("Stored login refusal reason failed"));
    return "admin";
  }
}
//@ chunk-xrw4a49n.js:1549-1664 placement
async function awaitStoredLoginSettle(signal) {
  try {
    await raceWithAbortSignal(settleRemotePolicy(), signal, () => Error("Stored login settle aborted"));
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}
//@ chunk-xrw4a49n.js:1664-1885 placement
async function settleStoredLoginRefusal(context) {
  try {
    let baseUrl = context?.url ?? (context?.isFilesDial ? getOauthConfig().BASE_API_URL : undefined);
    if (
      isStoredLoginRefused(baseUrl, true, context?.isFilesDial ?? false) &&
      !isRemoteManagedSettingsVerified() &&
      (context !== undefined || isClaudeAISubscriber())
    )
      await (context?.signal ? awaitStoredLoginSettle(context.signal) : settleRemotePolicy());
  } catch {
    logError(Error("Stored login settle failed"));
  }
}
//@ chunk-xrw4a49n.js:1885-1996 placement
function baseUrlOverride(envObject, includeFilesDial) {
  return (
    getEnvCaseInsensitive(envObject, "ANTHROPIC_BASE_URL")?.trim() ||
    (includeFilesDial ? getEnvCaseInsensitive(envObject, "CLAUDE_CODE_API_BASE_URL")?.trim() : undefined)
  );
}
export { storedLoginRefusalReason, settleStoredLoginRefusal, isStoredLoginRefused };
