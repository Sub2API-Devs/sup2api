/**
 * utils/auth/storedLoginRefused.ts
 *
 * 2.1.316 新增。存储的登录是否被拒用（例如设置了 helper 或 base URL）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gkzv6xmy.js (5)
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

//@ chunk-gkzv6xmy.js:608-1405 placement
/**
 * 存储的登录是否被拒用（例如设置了 helper 或 base URL）。
 */
function isStoredLoginRefused(e, r = false, d = false) {
  let s = true;
  try {
    if (isDiskless()) return false;
    let { machine, slot } = getPolicySlots();
    let a = helperTierOf(machine);
    s = a !== null;
    let R =
      a === null &&
      ((getPolicySettingsOrigin() === "helper" && !armedFromUserWritableBase()) ||
        (isConfirmedHelperHeld() && (e !== undefined || helperTierOf(slot ?? null) === null)));
    let u = a ?? (R ? null : getRemoteHelperTier());
    s = u !== null;
    if (u === null) return false;
    let env_2 = u.env ?? {};
    let g = routesOffAnthropicApiWith((A) =>
      A === "ANTHROPIC_BASE_URL" ? undefined : getEnvCaseInsensitive(env_2, A),
    );
    let o = e ?? env.ANTHROPIC_BASE_URL;
    let t =
      o && !isHttpsEndpoint(o)
        ? o
        : baseUrlOverride(slot?.env ?? {}, d) || (g ? undefined : baseUrlOverride(env_2, d) || o);
    if (t ? isHttpsEndpoint(t) : !g) return false;
    let oauthConfig = getOauthConfig();
    let origin = URL.parse(oauthConfig.BASE_API_URL)?.origin;
    if (
      oauthConfig.OAUTH_FILE_SUFFIX !== "-local-oauth" &&
      origin &&
      origin !== "null" &&
      t &&
      t === o &&
      URL.parse(t)?.origin === origin
    )
      return false;
    let { source } = getAuthTokenSource();
    let E = source === "CLAUDE_CODE_OAUTH_TOKEN" && getClaudeAIOAuthTokenOrigin() !== "env";
    if (
      (!r &&
        !E &&
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
    return s;
  }
}
//@ chunk-gkzv6xmy.js:1405-1549 placement
function storedLoginRefusalReason() {
  try {
    return helperTierOf(getPolicySlots().machine) === null ? (getRemoteHelperGap() ?? "admin") : "admin";
  } catch {
    logError(Error("Stored login refusal reason failed"));
    return "admin";
  }
}
//@ chunk-gkzv6xmy.js:1549-1664 placement
async function awaitStoredLoginSettle(signal) {
  try {
    await raceWithAbortSignal(settleRemotePolicy(), signal, () => Error("Stored login settle aborted"));
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}
//@ chunk-gkzv6xmy.js:1664-1885 placement
async function settleStoredLoginRefusal(e) {
  try {
    let r = e?.url ?? (e?.isFilesDial ? getOauthConfig().BASE_API_URL : undefined);
    if (
      isStoredLoginRefused(r, true, e?.isFilesDial ?? false) &&
      !isRemoteManagedSettingsVerified() &&
      (e !== undefined || isClaudeAISubscriber())
    )
      await (e?.signal ? awaitStoredLoginSettle(e.signal) : settleRemotePolicy());
  } catch {
    logError(Error("Stored login settle failed"));
  }
}
//@ chunk-gkzv6xmy.js:1885-1996 placement
function baseUrlOverride(e, r) {
  return (
    getEnvCaseInsensitive(e, "ANTHROPIC_BASE_URL")?.trim() ||
    (r ? getEnvCaseInsensitive(e, "CLAUDE_CODE_API_BASE_URL")?.trim() : undefined)
  );
}
export { settleStoredLoginRefusal, isStoredLoginRefused, storedLoginRefusalReason };
