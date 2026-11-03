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
import { getPolicySlots, F3t, Sto } from "../model/allowedProviders.js";
import {
  helperTierOf,
  isConfirmedHelperHeld,
  getRemoteHelperTier,
  getRemoteHelperGap,
} from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { getPolicySettingsOrigin } from "../settings/settings.js";
import { Kdt } from "../settings/policyHelper/helperRemote.js";
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

/**
 * 存储的登录是否被拒用（例如设置了 helper 或 base URL）。
 */
//@ chunk-gkzv6xmy.js:608-1405 placement
function isStoredLoginRefused(e, r = !1, d = !1) {
  let s = !0;
  try {
    if (isDiskless()) return !1;
    let { machine: machine, slot: slot } = getPolicySlots(),
      a = helperTierOf(machine);
    s = a !== null;
    let R =
        a === null &&
        ((getPolicySettingsOrigin() === "helper" && !Kdt()) ||
          (isConfirmedHelperHeld() && (e !== void 0 || helperTierOf(slot ?? null) === null))),
      u = a ?? (R ? null : getRemoteHelperTier());
    if (((s = u !== null), u === null)) return !1;
    let m = u.env ?? {},
      g = routesOffAnthropicApiWith((A) =>
        A === "ANTHROPIC_BASE_URL" ? void 0 : getEnvCaseInsensitive(m, A),
      ),
      o = e ?? env.ANTHROPIC_BASE_URL,
      t = o && !F3t(o) ? o : baseUrlOverride(slot?.env ?? {}, d) || (g ? void 0 : baseUrlOverride(m, d) || o);
    if (t ? F3t(t) : !g) return !1;
    let p = getOauthConfig(),
      f = URL.parse(p.BASE_API_URL)?.origin;
    if (
      p.OAUTH_FILE_SUFFIX !== "-local-oauth" &&
      f &&
      f !== "null" &&
      t &&
      t === o &&
      URL.parse(t)?.origin === f
    )
      return !1;
    let { source: source } = getAuthTokenSource(),
      E = source === "CLAUDE_CODE_OAUTH_TOKEN" && getClaudeAIOAuthTokenOrigin() !== "env";
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
      return !1;
    return (computeRemoteSettingsEligibility(), getSessionHybridOrganizationUuid() === null);
  } catch {
    return (logError(Error("Stored login check failed")), s);
  }
}
//@ chunk-gkzv6xmy.js:1405-1549 placement
function storedLoginRefusalReason() {
  try {
    return helperTierOf(getPolicySlots().machine) === null ? (getRemoteHelperGap() ?? "admin") : "admin";
  } catch {
    return (logError(Error("Stored login refusal reason failed")), "admin");
  }
}
//@ chunk-gkzv6xmy.js:1549-1664 placement
async function awaitStoredLoginSettle(e) {
  try {
    await raceWithAbortSignal(Sto(), e, () => Error("Stored login settle aborted"));
  } catch (error) {
    if (!e.aborted) throw error;
  }
}
//@ chunk-gkzv6xmy.js:1664-1885 placement
async function settleStoredLoginRefusal(e) {
  try {
    let r = e?.url ?? (e?.isFilesDial ? getOauthConfig().BASE_API_URL : void 0);
    if (
      isStoredLoginRefused(r, !0, e?.isFilesDial ?? !1) &&
      !isRemoteManagedSettingsVerified() &&
      (e !== void 0 || isClaudeAISubscriber())
    )
      await (e?.signal ? awaitStoredLoginSettle(e.signal) : Sto());
  } catch {
    logError(Error("Stored login settle failed"));
  }
}
//@ chunk-gkzv6xmy.js:1885-1996 placement
function baseUrlOverride(e, r) {
  return (
    getEnvCaseInsensitive(e, "ANTHROPIC_BASE_URL")?.trim() ||
    (r ? getEnvCaseInsensitive(e, "CLAUDE_CODE_API_BASE_URL")?.trim() : void 0)
  );
}

export { settleStoredLoginRefusal, isStoredLoginRefused, storedLoginRefusalReason };
