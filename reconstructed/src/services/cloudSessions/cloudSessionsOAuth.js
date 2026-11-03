/**
 * services/cloudSessions/cloudSessionsOAuth.ts
 *
 * 2.1.316 新增：刷新云会话 OAuth 令牌（文件锁、无盘会话处理）；保存云会话 OAuth 令牌（条件写入、竞争检测）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4r7nqnx2.js (8)
 * attribution: placement 8
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

//@ chunk-4r7nqnx2.js:842-894 placement
var U = ".cloud_sessions_oauth_refresh.lock",
  z = 300000;
//@ chunk-4r7nqnx2.js:894-1083 placement
async function readCloudSessionsOAuthAsync(e) {
  try {
    return (await getSecureStorage().readAsync(e))?.cloudSessionsOauth ?? null;
  } catch (error) {
    return (
      logForDebugging(`Failed to read the cloud-sessions OAuth tokens: ${errorMessage(error)}`, {
        level: "error",
      }),
      "unreadable"
    );
  }
}
//@ chunk-4r7nqnx2.js:1083-1302 placement
function hasCloudSessionsTokenForOrg(e) {
  try {
    let s = getSecureStorage().read()?.cloudSessionsOauth;
    return s !== void 0 && s.organizationUuid === e && Boolean(s.accessToken);
  } catch (error) {
    return (
      logForDebugging(`Failed to read the cloud-sessions OAuth tokens: ${errorMessage(error)}`, {
        level: "error",
      }),
      !1
    );
  }
}
/**
 * 保存云会话 OAuth 令牌（条件写入、竞争检测）。
 */
//@ chunk-4r7nqnx2.js:1302-1650 placement
async function saveCloudSessionsOAuth(e, s) {
  try {
    let k = !1,
      mutate = await getSecureStorage().mutate((r) => {
        if (s?.onlyIf && !s.onlyIf(r.cloudSessionsOauth)) return ((k = !0), r);
        return { ...r, cloudSessionsOauth: e };
      });
    return k ? { ...mutate, raced: !0 } : mutate;
  } catch (error) {
    return (
      logForDebugging(`Failed to save the cloud-sessions OAuth tokens: ${errorMessage(error)}`, {
        level: "error",
      }),
      { success: !1, warning: "Failed to save the cloud-sessions OAuth tokens" }
    );
  }
}
//@ chunk-4r7nqnx2.js:1650-1898 placement
async function clearCloudSessionsOAuthIf(e) {
  try {
    await getSecureStorage().mutate((s) => {
      if (!s.cloudSessionsOauth || !e(s.cloudSessionsOauth)) return s;
      let k = { ...s };
      return (delete k.cloudSessionsOauth, k);
    });
  } catch (error) {
    logForDebugging(`Failed to clear the cloud-sessions OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-4r7nqnx2.js:1898-2005 placement
async function readFreshCloudSessionsOAuth() {
  let e = getSecureStorage();
  return (e.invalidateCache?.(), (await e.readAsync())?.cloudSessionsOauth ?? null);
}
/**
 * 刷新云会话 OAuth 令牌（文件锁、无盘会话处理）。
 */
//@ chunk-4r7nqnx2.js:2005-5005 placement
async function refreshCloudSessionsOAuth({
  organizationUuid: organizationUuid,
  refusedAccessToken: refusedAccessToken,
  credentials: credentials,
}) {
  let u = await readCloudSessionsOAuthAsync(credentials);
  if (u === "unreadable")
    return { ok: !1, reason: "refresh_failed", detail: "the credential store could not be read" };
  if (!u?.accessToken || u.organizationUuid !== organizationUuid) return { ok: !1, reason: "needs_sign_in" };
  if (!isOAuthTokenExpired(u.expiresAt) && u.accessToken !== refusedAccessToken)
    return { ok: !0, accessToken: u.accessToken };
  if (isDiskless())
    return (
      logFeatureBad("oauth_token_refresh", "cloud_sessions_oauth_refresh_diskless"),
      { ok: !1, reason: "needs_sign_in" }
    );
  try {
    return await withOauthSlotRefreshLock(U, async (r) => {
      let o = await readFreshCloudSessionsOAuth();
      if (!o?.accessToken || o.organizationUuid !== organizationUuid)
        return { ok: !1, reason: "needs_sign_in" };
      if (!isOAuthTokenExpired(o.expiresAt) && o.accessToken !== refusedAccessToken)
        return { ok: !0, accessToken: o.accessToken };
      if (!o.refreshToken || !Array.isArray(o.scopes) || o.scopes.length === 0) {
        let refreshToken = o.refreshToken;
        return (
          await clearCloudSessionsOAuthIf((c) => c.refreshToken === refreshToken),
          { ok: !1, reason: "needs_sign_in" }
        );
      }
      if (r.isCompromised())
        return (
          logFeatureSad("oauth_token_refresh", "cloud_sessions_oauth_refresh_lock_compromised"),
          { ok: !1, reason: "refresh_failed", detail: "another Claude Code process is renewing it right now" }
        );
      let refreshToken = o.refreshToken;
      try {
        let n = await refreshOAuthToken(refreshToken, {
          clientId: o.clientId,
          scopes: o.scopes,
          skipProfileFetch: !0,
        });
        if (!n.refreshToken || !n.expiresAt) {
          if (n.refreshToken && n.refreshToken !== refreshToken)
            await revokeOAuthToken(n.refreshToken, o.clientId);
          return {
            ok: !1,
            reason: "refresh_failed",
            detail: "the server's reply had no refresh token or expiry",
          };
        }
        if (!n.scopes.includes(CLAUDE_AI_SESSIONS_SCOPE))
          return (
            await revokeOAuthToken(n.refreshToken, o.clientId),
            await clearCloudSessionsOAuthIf((h) => h.refreshToken === refreshToken),
            { ok: !1, reason: "needs_sign_in", detail: "refresh response missing the sessions scope" }
          );
        let c = await saveCloudSessionsOAuth(
          {
            accessToken: n.accessToken,
            refreshToken: n.refreshToken,
            expiresAt: n.expiresAt,
            scopes: n.scopes.filter((scope) => CLOUD_SESSIONS_OAUTH_SCOPES.some((p) => p === scope)),
            clientId: o.clientId,
            organizationUuid: o.organizationUuid,
          },
          { onlyIf: (h) => h?.refreshToken === refreshToken },
        );
        if (c.raced) {
          await revokeOAuthToken(n.refreshToken, o.clientId);
          let h = await readFreshCloudSessionsOAuth();
          return h?.accessToken &&
            h.organizationUuid === organizationUuid &&
            !isOAuthTokenExpired(h.expiresAt)
            ? { ok: !0, accessToken: h.accessToken }
            : { ok: !1, reason: "needs_sign_in" };
        }
        if (!c.success)
          logForDebugging(
            "Cloud-sessions OAuth refresh succeeded but the new token could not be saved; using it for this session only.",
            { level: "error" },
          );
        return { ok: !0, accessToken: n.accessToken };
      } catch (error) {
        if (r.isCompromised()) {
          let c = await readFreshCloudSessionsOAuth();
          if (c?.accessToken && c.organizationUuid === organizationUuid && !isOAuthTokenExpired(c.expiresAt))
            return { ok: !0, accessToken: c.accessToken };
          if (!isInvalidGrantError(error))
            logFeatureSad("oauth_token_refresh", "cloud_sessions_oauth_refresh_lock_compromised");
          return {
            ok: !1,
            reason: "refresh_failed",
            detail: "another Claude Code process is renewing it right now",
          };
        }
        if (isInvalidGrantError(error))
          return (
            await clearCloudSessionsOAuthIf((c) => c.refreshToken === refreshToken),
            { ok: !1, reason: "needs_sign_in", detail: "cloud-sessions authorization expired" }
          );
        return (
          logForDebugging(`Cloud-sessions OAuth refresh failed: ${errorMessage(error)}`, { level: "error" }),
          { ok: !1, reason: "refresh_failed", detail: "the renewal request failed" }
        );
      }
    });
  } catch (error) {
    if (error instanceof OauthSlotLockContendedError)
      logFeatureSad("oauth_token_refresh", "cloud_sessions_oauth_refresh_lock_contention");
    else (logError(error), logFeatureBad("oauth_token_refresh", "cloud_sessions_oauth_refresh_lock_error"));
    return { ok: !1, reason: "refresh_failed", detail: "the renewal could not run; wait a moment" };
  }
}
//@ chunk-4r7nqnx2.js:5005-5057 placement
function D() {
  return !getIsNonInteractiveSession() && env.CLAUDE_CODE_REMOTE !== !0;
}

export {
  z,
  readFreshCloudSessionsOAuth,
  saveCloudSessionsOAuth,
  hasCloudSessionsTokenForOrg,
  D,
  refreshCloudSessionsOAuth,
};
