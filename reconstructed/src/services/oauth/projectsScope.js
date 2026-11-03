/**
 * services/oauth/projectsScope.ts
 *
 * 2.1.316 新增：Projects OAuth scope
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nghef0fw.js (2)
 * attribution: placement 2
 */
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokens,
  isOAuthRefreshKnownDeadAsync,
  withOAuthRefreshLock,
  markRefreshTokenDeadAfterInvalidGrant,
  saveRefreshedOAuthTokensRespectingLock,
  OAuthRefreshLockContendedError,
} from "../../utils/auth.js";
import { isDiskless } from "../../bootstrap/state.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { refreshOAuthToken, isInvalidGrantError } from "./client.js";
import { uniq } from "../../utils/collections.js";
import {
  claudeAiLoginScopes,
  preservableScopesFrom,
  CLAUDE_AI_PROJECTS_READ_SCOPE,
  CLAUDE_AI_PROJECTS_WRITE_SCOPE,
} from "../../constants/oauth.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";

/**
 * 取得带 Projects 读写 scope 的访问令牌：策略/提供方/流量限制不允许时直接拒绝；会话入口令牌直接用；已有 scope 则返回；否则在 OAuth 刷新锁内用刷新令牌扩展 scope 并保存，返回 {ok, accessToken, expanded} 或失败原因。
 */
//@ chunk-nghef0fw.js:1062-3097 placement
async function ensureProjectsAccessToken(credentials) {
  if (!isPolicyAllowed("allow_projects_tool")) return { ok: !1, reason: "policy_disabled" };
  if (!isFirstPartyProvider()) return { ok: !1, reason: "wrong_provider" };
  if (isEssentialTrafficOnly()) return { ok: !1, reason: "essential_traffic_only" };
  let o = getSessionIngressAuthToken();
  if (o) return { ok: !0, accessToken: o, expanded: !1 };
  try {
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials });
  } catch {}
  let n = getClaudeAIOAuthTokens();
  if (!n?.accessToken) return { ok: !1, reason: "no_token" };
  if (K(n.scopes)) return { ok: !0, accessToken: n.accessToken, expanded: !1 };
  if (n.clientId) return { ok: !1, reason: "custom_client" };
  if (!n.refreshToken) return { ok: !1, reason: "no_refresh" };
  if (isDiskless())
    return (logFeatureBad("oauth_token_refresh", "oauth_refresh_diskless"), { ok: !1, reason: "no_refresh" });
  if (await isOAuthRefreshKnownDeadAsync(credentials)) return { ok: !1, reason: "no_refresh" };
  let u = !1;
  try {
    return await withOAuthRefreshLock(
      async ({ lockedTokens: lockedTokens, isCompromised: isCompromised, signal: signal }) => {
        if (!lockedTokens?.refreshToken) return { ok: !1, reason: "no_refresh" };
        if (isCompromised()) return { ok: !1, reason: "lock_contended" };
        if (K(lockedTokens.scopes) && lockedTokens.accessToken)
          return { ok: !0, accessToken: lockedTokens.accessToken, expanded: !1 };
        if (lockedTokens.clientId) return { ok: !1, reason: "custom_client" };
        if (await isOAuthRefreshKnownDeadAsync(credentials)) return { ok: !1, reason: "no_refresh" };
        let y;
        try {
          ((u = !0),
            (y = await refreshOAuthToken(lockedTokens.refreshToken, {
              clientId: lockedTokens.clientId,
              scopes: uniq([
                ...claudeAiLoginScopes(),
                ...preservableScopesFrom(lockedTokens.scopes),
                CLAUDE_AI_PROJECTS_READ_SCOPE,
                CLAUDE_AI_PROJECTS_WRITE_SCOPE,
              ]),
              signal: signal,
              telemetryContext: "projects_scope_expansion",
            })));
        } catch (error) {
          if (isInvalidGrantError(error) && !isCompromised())
            await markRefreshTokenDeadAfterInvalidGrant(lockedTokens.refreshToken, credentials);
          if (isCompromised() || isAbortError(error)) return { ok: !1, reason: "lock_contended" };
          throw error;
        }
        let w = await saveRefreshedOAuthTokensRespectingLock({
          isCompromised: isCompromised,
          postedRefreshToken: lockedTokens.refreshToken,
          refreshedTokens: y,
          credentials: credentials,
        });
        if (w === "adopted_sibling") return { ok: !1, reason: "lock_contended" };
        if (w === "save_failed")
          return (
            logFeatureSad("projects_scope_expansion", "save_failed"),
            { ok: !1, reason: "save_failed" }
          );
        if (!K(y.scopes))
          return (
            logFeatureSad("projects_scope_expansion", "expand_failed"),
            { ok: !1, reason: "expand_failed", detail: "refresh succeeded but projects scopes not granted" }
          );
        return (
          logFeatureOk("projects_scope_expansion"),
          { ok: !0, accessToken: y.accessToken, expanded: !0 }
        );
      },
      credentials,
    );
  } catch (error) {
    if (error instanceof OAuthRefreshLockContendedError || isAbortError(error))
      return { ok: !1, reason: "lock_contended" };
    if (!u) return { ok: !1, reason: "lock_contended", detail: errorMessage(error) };
    return (
      logFeatureSad("projects_scope_expansion", "expand_failed"),
      { ok: !1, reason: "expand_failed", detail: errorMessage(error) }
    );
  }
}
//@ chunk-nghef0fw.js:3097-3155 placement
function K(e) {
  return !!e && e.includes(CLAUDE_AI_PROJECTS_READ_SCOPE) && e.includes(CLAUDE_AI_PROJECTS_WRITE_SCOPE);
}

export { ensureProjectsAccessToken };
