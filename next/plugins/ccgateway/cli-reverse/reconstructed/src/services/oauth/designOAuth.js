/**
 * services/oauth/designOAuth.ts
 *
 * 2.1.316 新增：Design 服务 OAuth 登录与令牌刷新
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-71ydz5km.js (12)
 * attribution: placement 12
 */
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isOAuthTokenExpired, refreshOAuthToken, revokeOAuthToken, isInvalidGrantError } from "./client.js";
import { isDiskless, getIsRemoteMode } from "../../bootstrap/state.js";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import {
  withOauthSlotRefreshLock,
  OauthSlotLockContendedError,
} from "../../utils/auth/oauthSlotRefreshLock.js";
import { DESIGN_OAUTH_SCOPES, getOauthConfig } from "../../constants/oauth.js";
import { logError } from "../../utils/log.js";
import { env } from "../../utils/env.js";
import { OAuthService } from "./index.js";
import { AuthCodeRefusedError } from "./auth-code-listener.js";

//@ chunk-71ydz5km.js:609-773 placement
async function readDesignOAuth(key) {
  try {
    return (await getSecureStorage().readAsync(key))?.designOauth ?? null;
  } catch (error) {
    logForDebugging(`Failed to read design OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-71ydz5km.js:773-1085 placement
async function writeDesignOAuth(designOauth, options) {
  try {
    let raced = false;
    let result = await getSecureStorage().mutate((store) => {
      if (options?.onlyIf && !options.onlyIf(store.designOauth)) {
        raced = true;
        return store;
      }
      return {
        ...store,
        designOauth,
      };
    });
    return raced
      ? {
          ...result,
          raced: true,
        }
      : result;
  } catch (error) {
    logForDebugging(`Failed to save design OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      success: false,
      warning: "Failed to save design OAuth tokens",
    };
  }
}
//@ chunk-71ydz5km.js:1085-1311 placement
async function clearDesignOAuthIf(shouldClear) {
  try {
    await getSecureStorage().mutate((store) => {
      if (!store.designOauth) return store;
      if (!shouldClear(store.designOauth)) return store;
      let next = {
        ...store,
      };
      delete next.designOauth;
      return next;
    });
  } catch (error) {
    logForDebugging(`Failed to clear design OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-71ydz5km.js:1311-1346 placement
/**
 * Design OAuth 刷新用的文件锁名。
 */
var DESIGN_OAUTH_REFRESH_LOCK = ".design_oauth_refresh.lock";
//@ chunk-71ydz5km.js:1346-1446 placement
async function readStoredDesignOAuth() {
  let secureStorage = getSecureStorage();
  secureStorage.invalidateCache?.();
  return (await secureStorage.readAsync())?.designOauth ?? null;
}
//@ chunk-71ydz5km.js:1446-4170 placement
/**
 * 获取 Design 服务的 OAuth 访问令牌，必要时刷新；未登录时返回需要登录。
 */
async function getDesignAccessToken(credentials) {
  let designOAuth = await readDesignOAuth(credentials);
  if (!designOAuth?.accessToken)
    return {
      ok: false,
      reason: "needs_design_login",
    };
  if (!isOAuthTokenExpired(designOAuth.expiresAt))
    return {
      ok: true,
      accessToken: designOAuth.accessToken,
    };
  if (isDiskless()) {
    logFeatureBad("oauth_token_refresh", "design_oauth_refresh_diskless");
    return {
      ok: false,
      reason: "needs_design_login",
    };
  }
  try {
    return await withOauthSlotRefreshLock(DESIGN_OAUTH_REFRESH_LOCK, async (lock) => {
      let storedDesignOAuth = await readStoredDesignOAuth();
      if (!storedDesignOAuth?.accessToken)
        return {
          ok: false,
          reason: "needs_design_login",
        };
      if (!isOAuthTokenExpired(storedDesignOAuth.expiresAt))
        return {
          ok: true,
          accessToken: storedDesignOAuth.accessToken,
        };
      if (!storedDesignOAuth.refreshToken) {
        let refreshToken = storedDesignOAuth.refreshToken;
        await clearDesignOAuthIf((stored) => stored.refreshToken === refreshToken);
        return {
          ok: false,
          reason: "needs_design_login",
        };
      }
      if (!Array.isArray(storedDesignOAuth.scopes) || storedDesignOAuth.scopes.length === 0) {
        let refreshToken = storedDesignOAuth.refreshToken;
        await clearDesignOAuthIf((stored) => stored.refreshToken === refreshToken);
        return {
          ok: false,
          reason: "needs_design_login",
        };
      }
      if (lock.isCompromised()) {
        logFeatureSad("oauth_token_refresh", "design_oauth_refresh_lock_compromised");
        return {
          ok: false,
          reason: "design_refresh_failed",
          detail: "another process is refreshing the design token",
        };
      }
      try {
        let refreshed = await refreshOAuthToken(storedDesignOAuth.refreshToken, {
          clientId: storedDesignOAuth.clientId,
          scopes: storedDesignOAuth.scopes,
          skipProfileFetch: true,
        });
        if (!refreshed.refreshToken || !refreshed.expiresAt) {
          if (refreshed.refreshToken && refreshed.refreshToken !== storedDesignOAuth.refreshToken)
            await revokeOAuthToken(refreshed.refreshToken, storedDesignOAuth.clientId);
          return {
            ok: false,
            reason: "design_refresh_failed",
            detail: "refresh response missing refresh_token or expiry",
          };
        }
        if (!DESIGN_OAUTH_SCOPES.every((scope) => refreshed.scopes.includes(scope))) {
          if (refreshed.refreshToken)
            await revokeOAuthToken(refreshed.refreshToken, storedDesignOAuth.clientId);
          let refreshToken = storedDesignOAuth.refreshToken;
          await clearDesignOAuthIf((stored) => stored.refreshToken === refreshToken);
          return {
            ok: false,
            reason: "needs_design_login",
            detail: "refresh response missing design scopes",
          };
        }
        let refreshToken = storedDesignOAuth.refreshToken;
        let writeResult = await writeDesignOAuth(
          {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: refreshed.expiresAt,
            scopes: refreshed.scopes.filter((scope) =>
              DESIGN_OAUTH_SCOPES.some((knownScope) => knownScope === scope),
            ),
            clientId: storedDesignOAuth.clientId,
          },
          {
            onlyIf: (current) => current?.refreshToken === refreshToken,
          },
        );
        if (writeResult.raced) {
          await revokeOAuthToken(refreshed.refreshToken, storedDesignOAuth.clientId);
          let storedDesignOAuth_2 = await readStoredDesignOAuth();
          return storedDesignOAuth_2?.accessToken && !isOAuthTokenExpired(storedDesignOAuth_2.expiresAt)
            ? {
                ok: true,
                accessToken: storedDesignOAuth_2.accessToken,
              }
            : {
                ok: false,
                reason: "needs_design_login",
              };
        }
        if (!writeResult.success)
          logForDebugging(
            "Design OAuth refresh succeeded but persist failed; continuing with in-memory token.",
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
          let storedDesignOAuth = await readStoredDesignOAuth();
          if (storedDesignOAuth?.accessToken && !isOAuthTokenExpired(storedDesignOAuth.expiresAt))
            return {
              ok: true,
              accessToken: storedDesignOAuth.accessToken,
            };
          if (!isInvalidGrantError(error))
            logFeatureSad("oauth_token_refresh", "design_oauth_refresh_lock_compromised");
          return {
            ok: false,
            reason: "design_refresh_failed",
            detail: "another process is refreshing the design token",
          };
        }
        if (isInvalidGrantError(error)) {
          let refreshToken = storedDesignOAuth.refreshToken;
          await clearDesignOAuthIf((stored) => stored.refreshToken === refreshToken);
          return {
            ok: false,
            reason: "needs_design_login",
            detail: "design authorization expired",
          };
        }
        return {
          ok: false,
          reason: "design_refresh_failed",
          detail: errorMessage(error),
        };
      }
    });
  } catch (error) {
    if (error instanceof OauthSlotLockContendedError)
      logFeatureSad("oauth_token_refresh", "design_oauth_refresh_lock_contention");
    else {
      logError(error);
      logFeatureBad("oauth_token_refresh", "design_oauth_refresh_lock_error");
    }
    return {
      ok: false,
      reason: "design_refresh_failed",
      detail: errorMessage(error),
    };
  }
}
//@ chunk-71ydz5km.js:4170-4252 placement
function designOAuthClientId() {
  return env.CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID ?? getOauthConfig().DESIGN_CLIENT_ID;
}
//@ chunk-71ydz5km.js:4252-4304 placement
function isDesignOAuthConfigured() {
  return !designOAuthClientId().startsWith("00000000-");
}
//@ chunk-71ydz5km.js:4304-4983 placement
async function refreshDesignToken(tokenResponse, clientId) {
  let filtered = DESIGN_OAUTH_SCOPES.filter((scope) => !tokenResponse.scopes.includes(scope));
  if (filtered.length > 0) {
    if (tokenResponse.refreshToken) await revokeOAuthToken(tokenResponse.refreshToken, clientId);
    return {
      ok: false,
      message: `The authorization server did not grant the design scopes (missing: ${filtered.join(", ")}) \u2014 the Claude Design app registration may be incomplete or out of date.`,
    };
  }
  if (!tokenResponse.refreshToken || !tokenResponse.expiresAt) {
    if (tokenResponse.refreshToken) await revokeOAuthToken(tokenResponse.refreshToken, clientId);
    return {
      ok: false,
      message:
        "The token response was missing a refresh token or expiry \u2014 cannot store a usable design credential.",
    };
  }
  return {
    ok: true,
    slot: {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresAt: tokenResponse.expiresAt,
      scopes: tokenResponse.scopes.filter((scope) =>
        DESIGN_OAUTH_SCOPES.some((knownScope) => knownScope === scope),
      ),
      clientId,
    },
  };
}
//@ chunk-71ydz5km.js:4983-5048 placement
function isRemoteEnvironment() {
  return env.isSSH() || env.CLAUDE_CODE_REMOTE === true || getIsRemoteMode();
}
//@ chunk-71ydz5km.js:5048-5061 placement
/**
 * Design 登录流程的等待上限（5 分钟）。
 */
var DESIGN_LOGIN_TIMEOUT_MS = 300000;
//@ chunk-71ydz5km.js:5061-7261 placement
/**
 * 执行 Design OAuth 登录流程（本地回调或手动粘贴授权码），保存令牌。
 */
async function runDesignLogin(signal, options) {
  if (signal?.aborted)
    return {
      ok: false,
      reason: "interrupted",
      message: "Design login was interrupted.",
    };
  if (!isDesignOAuthConfigured())
    return {
      ok: false,
      reason: "unconfigured",
      message:
        "The Claude Design OAuth client is not configured in this build. Set CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID to the registered client id, or update to a build with the registered client.",
    };
  if (isRemoteEnvironment() && !options?.onManualCode)
    return {
      ok: false,
      reason: "remote",
      message:
        "This session is remote, so the browser can't reach the local sign-in listener. Run /design-login instead \u2014 it supports pasting the authorization code manually.",
    };
  let clientId = designOAuthClientId();
  let oauthService = new OAuthService();
  let timedOut = false;
  let abandoned = false;
  let timeoutTimer;
  try {
    let onAuthUrl = options?.onAuthUrl;
    options?.onManualCode?.((authorizationCode, state) =>
      oauthService.handleManualAuthCodeInput({
        authorizationCode,
        state,
      }),
    );
    let loginFlow = oauthService.startOAuthFlow(
      onAuthUrl
        ? async (authUrl, state) => {
            onAuthUrl(state ?? authUrl, authUrl);
          }
        : async () => {},
      {
        loginWithClaudeAi: true,
        oauthClient: {
          clientId,
          scopes: DESIGN_OAUTH_SCOPES,
        },
        skipProfileFetch: true,
        successRedirectUrl: getOauthConfig().CLAUDEAI_SUCCESS_URL,
        ...(onAuthUrl && {
          skipBrowserOpen: true,
        }),
      },
    );
    loginFlow
      .then((tokens) => {
        if (abandoned && tokens.refreshToken) revokeOAuthToken(tokens.refreshToken, clientId);
      })
      .catch(() => {});
    let winner = await Promise.race([
      loginFlow,
      new Promise((resolve, reject) => {
        timeoutTimer = setTimeout(() => {
          timedOut = true;
          abandoned = true;
          reject(Error("design login timed out"));
        }, DESIGN_LOGIN_TIMEOUT_MS);
        signal?.addEventListener(
          "abort",
          () => {
            abandoned = true;
            reject(Error("design login interrupted"));
          },
          {
            once: true,
          },
        );
      }),
    ]);
    let refreshed = await refreshDesignToken(winner, clientId);
    if (!refreshed.ok)
      return {
        ok: false,
        reason: "invalid",
        message: refreshed.message,
      };
    if (signal?.aborted) {
      await revokeOAuthToken(refreshed.slot.refreshToken, refreshed.slot.clientId);
      return {
        ok: false,
        reason: "interrupted",
        message: "Design login was interrupted.",
      };
    }
    if (!(await writeDesignOAuth(refreshed.slot)).success) {
      await revokeOAuthToken(refreshed.slot.refreshToken, refreshed.slot.clientId);
      return {
        ok: false,
        reason: "save_failed",
        message: "Could not save the design credential to secure storage. Retry, or run /design-login.",
      };
    }
    return {
      ok: true,
      accessToken: refreshed.slot.accessToken,
    };
  } catch (error) {
    abandoned = true;
    if (signal?.aborted)
      return {
        ok: false,
        reason: "interrupted",
        message: "Design login was interrupted.",
      };
    if (timedOut)
      return {
        ok: false,
        reason: "timed_out",
        message:
          "The browser authorization timed out after 5 minutes. Retry, or run /design-login for the manual flow.",
      };
    if (error instanceof AuthCodeRefusedError)
      return {
        ok: false,
        reason: "code_refused",
        message: error.message,
      };
    return {
      ok: false,
      reason: "failed",
      cause: errorMessage(error),
      message: `The browser authorization failed (${errorMessage(error)}). Run /design-login to retry with the manual flow.`,
    };
  } finally {
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
    oauthService.cleanup();
  }
}
export {
  readDesignOAuth,
  isDesignOAuthConfigured,
  runDesignLogin,
  isRemoteEnvironment,
  designOAuthClientId,
  refreshDesignToken,
  writeDesignOAuth,
  getDesignAccessToken,
};
