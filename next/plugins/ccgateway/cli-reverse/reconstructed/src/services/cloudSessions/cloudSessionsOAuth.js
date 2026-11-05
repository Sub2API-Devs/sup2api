/**
 * services/cloudSessions/cloudSessionsOAuth.ts
 *
 * 2.1.316 新增：刷新云会话 OAuth 令牌（文件锁、无盘会话处理）；保存云会话 OAuth 令牌（条件写入、竞争检测）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vp2eq1tc.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import {
  isOAuthTokenExpired,
  refreshOAuthToken,
  revokeOAuthToken,
  isInvalidGrantError,
} from "../oauth/client.js";
import { isDiskless, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import {
  withOauthSlotRefreshLock,
  OauthSlotLockContendedError,
} from "../../utils/auth/oauthSlotRefreshLock.js";
import { CLAUDE_AI_SESSIONS_SCOPE, CLOUD_SESSIONS_OAUTH_SCOPES } from "../../constants/oauth.js";
import { logError } from "../../utils/log.js";
import { env } from "../../utils/env.js";

//@ chunk-vp2eq1tc.js:842-894 placement
/**
 * 云会话 OAuth 授权流程的等待上限（5 分钟，导出给 consoleSignIn 用）。
 */
var OAUTH_REFRESH_LOCK_NAME = ".cloud_sessions_oauth_refresh.lock";
var OAUTH_FLOW_TIMEOUT_MS = 300000;
//@ chunk-vp2eq1tc.js:894-1083 placement
async function readCloudSessionsOAuthAsync(credentials) {
  try {
    return (await getSecureStorage().readAsync(credentials))?.cloudSessionsOauth ?? null;
  } catch (error) {
    logForDebugging(`Failed to read the cloud-sessions OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
    return "unreadable";
  }
}
//@ chunk-vp2eq1tc.js:1083-1302 placement
function hasCloudSessionsTokenForOrg(orgUuid) {
  try {
    let cloudSessionsOauth = getSecureStorage().read()?.cloudSessionsOauth;
    return (
      cloudSessionsOauth !== undefined &&
      cloudSessionsOauth.organizationUuid === orgUuid &&
      Boolean(cloudSessionsOauth.accessToken)
    );
  } catch (error) {
    logForDebugging(`Failed to read the cloud-sessions OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-vp2eq1tc.js:1302-1650 placement
/**
 * 保存云会话 OAuth 令牌（条件写入、竞争检测）。
 */
async function saveCloudSessionsOAuth(cloudSessionsOauth, options) {
  try {
    let raced = false;
    let nextState = await getSecureStorage().mutate((state) => {
      if (options?.onlyIf && !options.onlyIf(state.cloudSessionsOauth)) {
        raced = true;
        return state;
      }
      return {
        ...state,
        cloudSessionsOauth,
      };
    });
    return raced
      ? {
          ...nextState,
          raced: true,
        }
      : nextState;
  } catch (error) {
    logForDebugging(`Failed to save the cloud-sessions OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      success: false,
      warning: "Failed to save the cloud-sessions OAuth tokens",
    };
  }
}
//@ chunk-vp2eq1tc.js:1650-1898 placement
async function clearCloudSessionsOAuthIf(predicate) {
  try {
    await getSecureStorage().mutate((state) => {
      if (!state.cloudSessionsOauth || !predicate(state.cloudSessionsOauth)) return state;
      let next = {
        ...state,
      };
      delete next.cloudSessionsOauth;
      return next;
    });
  } catch (error) {
    logForDebugging(`Failed to clear the cloud-sessions OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-vp2eq1tc.js:1898-2005 placement
async function readFreshCloudSessionsOAuth() {
  let secureStorage = getSecureStorage();
  secureStorage.invalidateCache?.();
  return (await secureStorage.readAsync())?.cloudSessionsOauth ?? null;
}
//@ chunk-vp2eq1tc.js:2005-5005 placement
/**
 * 刷新云会话 OAuth 令牌（文件锁、无盘会话处理）。
 */
async function refreshCloudSessionsOAuth({ organizationUuid, refusedAccessToken, credentials }) {
  let cloudSessionsOAuth = await readCloudSessionsOAuthAsync(credentials);
  if (cloudSessionsOAuth === "unreadable")
    return {
      ok: false,
      reason: "refresh_failed",
      detail: "the credential store could not be read",
    };
  if (!cloudSessionsOAuth?.accessToken || cloudSessionsOAuth.organizationUuid !== organizationUuid)
    return {
      ok: false,
      reason: "needs_sign_in",
    };
  if (
    !isOAuthTokenExpired(cloudSessionsOAuth.expiresAt) &&
    cloudSessionsOAuth.accessToken !== refusedAccessToken
  )
    return {
      ok: true,
      accessToken: cloudSessionsOAuth.accessToken,
    };
  if (isDiskless()) {
    logFeatureBad("oauth_token_refresh", "cloud_sessions_oauth_refresh_diskless");
    return {
      ok: false,
      reason: "needs_sign_in",
    };
  }
  try {
    return await withOauthSlotRefreshLock(OAUTH_REFRESH_LOCK_NAME, async (lock) => {
      let freshCloudSessionsOAuth = await readFreshCloudSessionsOAuth();
      if (
        !freshCloudSessionsOAuth?.accessToken ||
        freshCloudSessionsOAuth.organizationUuid !== organizationUuid
      )
        return {
          ok: false,
          reason: "needs_sign_in",
        };
      if (
        !isOAuthTokenExpired(freshCloudSessionsOAuth.expiresAt) &&
        freshCloudSessionsOAuth.accessToken !== refusedAccessToken
      )
        return {
          ok: true,
          accessToken: freshCloudSessionsOAuth.accessToken,
        };
      if (
        !freshCloudSessionsOAuth.refreshToken ||
        !Array.isArray(freshCloudSessionsOAuth.scopes) ||
        freshCloudSessionsOAuth.scopes.length === 0
      ) {
        let refreshToken = freshCloudSessionsOAuth.refreshToken;
        await clearCloudSessionsOAuthIf((stored) => stored.refreshToken === refreshToken);
        return {
          ok: false,
          reason: "needs_sign_in",
        };
      }
      if (lock.isCompromised()) {
        logFeatureSad("oauth_token_refresh", "cloud_sessions_oauth_refresh_lock_compromised");
        return {
          ok: false,
          reason: "refresh_failed",
          detail: "another Claude Code process is renewing it right now",
        };
      }
      let refreshToken = freshCloudSessionsOAuth.refreshToken;
      try {
        let refreshed = await refreshOAuthToken(refreshToken, {
          clientId: freshCloudSessionsOAuth.clientId,
          scopes: freshCloudSessionsOAuth.scopes,
          skipProfileFetch: true,
        });
        if (!refreshed.refreshToken || !refreshed.expiresAt) {
          if (refreshed.refreshToken && refreshed.refreshToken !== refreshToken)
            await revokeOAuthToken(refreshed.refreshToken, freshCloudSessionsOAuth.clientId);
          return {
            ok: false,
            reason: "refresh_failed",
            detail: "the server's reply had no refresh token or expiry",
          };
        }
        if (!refreshed.scopes.includes(CLAUDE_AI_SESSIONS_SCOPE)) {
          await revokeOAuthToken(refreshed.refreshToken, freshCloudSessionsOAuth.clientId);
          await clearCloudSessionsOAuthIf((stored) => stored.refreshToken === refreshToken);
          return {
            ok: false,
            reason: "needs_sign_in",
            detail: "refresh response missing the sessions scope",
          };
        }
        let saveResult = await saveCloudSessionsOAuth(
          {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: refreshed.expiresAt,
            scopes: refreshed.scopes.filter((scope) =>
              CLOUD_SESSIONS_OAUTH_SCOPES.some((allowedScope) => allowedScope === scope),
            ),
            clientId: freshCloudSessionsOAuth.clientId,
            organizationUuid: freshCloudSessionsOAuth.organizationUuid,
          },
          {
            onlyIf: (current) => current?.refreshToken === refreshToken,
          },
        );
        if (saveResult.raced) {
          await revokeOAuthToken(refreshed.refreshToken, freshCloudSessionsOAuth.clientId);
          let freshCloudSessionsOAuth_2 = await readFreshCloudSessionsOAuth();
          return freshCloudSessionsOAuth_2?.accessToken &&
            freshCloudSessionsOAuth_2.organizationUuid === organizationUuid &&
            !isOAuthTokenExpired(freshCloudSessionsOAuth_2.expiresAt)
            ? {
                ok: true,
                accessToken: freshCloudSessionsOAuth_2.accessToken,
              }
            : {
                ok: false,
                reason: "needs_sign_in",
              };
        }
        if (!saveResult.success)
          logForDebugging(
            "Cloud-sessions OAuth refresh succeeded but the new token could not be saved; using it for this session only.",
            {
              level: "error",
            },
          );
        return {
          ok: true,
          accessToken: refreshed.accessToken,
        };
      } catch (error) {
        if (lock.isCompromised()) {
          let freshCloudSessionsOAuth = await readFreshCloudSessionsOAuth();
          if (
            freshCloudSessionsOAuth?.accessToken &&
            freshCloudSessionsOAuth.organizationUuid === organizationUuid &&
            !isOAuthTokenExpired(freshCloudSessionsOAuth.expiresAt)
          )
            return {
              ok: true,
              accessToken: freshCloudSessionsOAuth.accessToken,
            };
          if (!isInvalidGrantError(error))
            logFeatureSad("oauth_token_refresh", "cloud_sessions_oauth_refresh_lock_compromised");
          return {
            ok: false,
            reason: "refresh_failed",
            detail: "another Claude Code process is renewing it right now",
          };
        }
        if (isInvalidGrantError(error)) {
          await clearCloudSessionsOAuthIf((stored) => stored.refreshToken === refreshToken);
          return {
            ok: false,
            reason: "needs_sign_in",
            detail: "cloud-sessions authorization expired",
          };
        }
        logForDebugging(`Cloud-sessions OAuth refresh failed: ${errorMessage(error)}`, {
          level: "error",
        });
        return {
          ok: false,
          reason: "refresh_failed",
          detail: "the renewal request failed",
        };
      }
    });
  } catch (error) {
    if (error instanceof OauthSlotLockContendedError)
      logFeatureSad("oauth_token_refresh", "cloud_sessions_oauth_refresh_lock_contention");
    else {
      logError(error);
      logFeatureBad("oauth_token_refresh", "cloud_sessions_oauth_refresh_lock_error");
    }
    return {
      ok: false,
      reason: "refresh_failed",
      detail: "the renewal could not run; wait a moment",
    };
  }
}
//@ chunk-vp2eq1tc.js:5005-5057 placement
/**
 * 是否当前是交互式本地会话（用于决定能否走浏览器授权）。
 */
function isInteractiveLocalSession() {
  return !getIsNonInteractiveSession() && env.CLAUDE_CODE_REMOTE !== true;
}
export {
  OAUTH_FLOW_TIMEOUT_MS,
  readFreshCloudSessionsOAuth,
  saveCloudSessionsOAuth,
  hasCloudSessionsTokenForOrg,
  isInteractiveLocalSession,
  refreshCloudSessionsOAuth,
};
