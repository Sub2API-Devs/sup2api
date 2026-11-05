/**
 * services/oauth/projectsScope.ts
 *
 * 2.1.316 新增：Projects OAuth scope
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-402wca7h.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import {
  claudeAiLoginScopes,
  preservableScopesFrom,
  CLAUDE_AI_PROJECTS_READ_SCOPE,
  CLAUDE_AI_PROJECTS_WRITE_SCOPE,
} from "../../constants/oauth.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";

//@ chunk-402wca7h.js:1100-3137 placement
/**
 * 取得带 Projects 读写 scope 的访问令牌：策略/提供方/流量限制不允许时直接拒绝；会话入口令牌直接用；已有 scope 则返回；否则在 OAuth 刷新锁内用刷新令牌扩展 scope 并保存，返回 {ok, accessToken, expanded} 或失败原因。
 */
async function ensureProjectsAccessToken(credentials) {
  if (!isPolicyAllowed("allow_projects_tool"))
    return {
      ok: false,
      reason: "policy_disabled",
    };
  if (!isFirstPartyProvider())
    return {
      ok: false,
      reason: "wrong_provider",
    };
  if (isEssentialTrafficOnly())
    return {
      ok: false,
      reason: "essential_traffic_only",
    };
  let sessionIngressAuthToken = getSessionIngressAuthToken();
  if (sessionIngressAuthToken)
    return {
      ok: true,
      accessToken: sessionIngressAuthToken,
      expanded: false,
    };
  try {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
  } catch {}
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  if (!claudeAIOAuthTokens?.accessToken)
    return {
      ok: false,
      reason: "no_token",
    };
  if (hasProjectsScopes(claudeAIOAuthTokens.scopes))
    return {
      ok: true,
      accessToken: claudeAIOAuthTokens.accessToken,
      expanded: false,
    };
  if (claudeAIOAuthTokens.clientId)
    return {
      ok: false,
      reason: "custom_client",
    };
  if (!claudeAIOAuthTokens.refreshToken)
    return {
      ok: false,
      reason: "no_refresh",
    };
  if (isDiskless()) {
    logFeatureBad("oauth_token_refresh", "oauth_refresh_diskless");
    return {
      ok: false,
      reason: "no_refresh",
    };
  }
  if (await isOAuthRefreshKnownDeadAsync(credentials))
    return {
      ok: false,
      reason: "no_refresh",
    };
  let refreshAttempted = false;
  try {
    return await withOAuthRefreshLock(async ({ lockedTokens, isCompromised, signal }) => {
      if (!lockedTokens?.refreshToken)
        return {
          ok: false,
          reason: "no_refresh",
        };
      if (isCompromised())
        return {
          ok: false,
          reason: "lock_contended",
        };
      if (hasProjectsScopes(lockedTokens.scopes) && lockedTokens.accessToken)
        return {
          ok: true,
          accessToken: lockedTokens.accessToken,
          expanded: false,
        };
      if (lockedTokens.clientId)
        return {
          ok: false,
          reason: "custom_client",
        };
      if (await isOAuthRefreshKnownDeadAsync(credentials))
        return {
          ok: false,
          reason: "no_refresh",
        };
      let refreshed;
      try {
        refreshAttempted = true;
        refreshed = await refreshOAuthToken(lockedTokens.refreshToken, {
          clientId: lockedTokens.clientId,
          scopes: normalizeCaseForComparison_2([
            ...claudeAiLoginScopes(),
            ...preservableScopesFrom(lockedTokens.scopes),
            CLAUDE_AI_PROJECTS_READ_SCOPE,
            CLAUDE_AI_PROJECTS_WRITE_SCOPE,
          ]),
          signal,
          telemetryContext: "projects_scope_expansion",
        });
      } catch (error) {
        if (isInvalidGrantError(error) && !isCompromised())
          await markRefreshTokenDeadAfterInvalidGrant(lockedTokens.refreshToken, credentials, error);
        if (isCompromised() || isAbortError(error))
          return {
            ok: false,
            reason: "lock_contended",
          };
        throw error;
      }
      let saveOutcome = await saveRefreshedOAuthTokensRespectingLock({
        isCompromised,
        postedRefreshToken: lockedTokens.refreshToken,
        refreshedTokens: refreshed,
        credentials,
      });
      if (saveOutcome === "adopted_sibling")
        return {
          ok: false,
          reason: "lock_contended",
        };
      if (saveOutcome === "save_failed") {
        logFeatureSad("projects_scope_expansion", "save_failed");
        return {
          ok: false,
          reason: "save_failed",
        };
      }
      if (!hasProjectsScopes(refreshed.scopes)) {
        logFeatureSad("projects_scope_expansion", "expand_failed");
        return {
          ok: false,
          reason: "expand_failed",
          detail: "refresh succeeded but projects scopes not granted",
        };
      }
      logFeatureOk("projects_scope_expansion");
      return {
        ok: true,
        accessToken: refreshed.accessToken,
        expanded: true,
      };
    }, credentials);
  } catch (error) {
    if (error instanceof OAuthRefreshLockContendedError || isAbortError(error))
      return {
        ok: false,
        reason: "lock_contended",
      };
    if (!refreshAttempted)
      return {
        ok: false,
        reason: "lock_contended",
        detail: errorMessage(error),
      };
    logFeatureSad("projects_scope_expansion", "expand_failed");
    return {
      ok: false,
      reason: "expand_failed",
      detail: errorMessage(error),
    };
  }
}
//@ chunk-402wca7h.js:3137-3195 placement
/**
 * 判断 scope 列表是否同时含 projects 的读写权限。
 */
function hasProjectsScopes(scopes) {
  return (
    !!scopes &&
    scopes.includes(CLAUDE_AI_PROJECTS_READ_SCOPE) &&
    scopes.includes(CLAUDE_AI_PROJECTS_WRITE_SCOPE)
  );
}
export { ensureProjectsAccessToken };
