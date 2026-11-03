/**
 * services/oauth/designOAuth.ts
 *
 * 2.1.316 新增：Design 服务 OAuth 登录与令牌刷新
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8genbs31.js (12)
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

//@ chunk-8genbs31.js:609-773 placement
async function readDesignOAuth(r) {
  try {
    return (await getSecureStorage().readAsync(r))?.designOauth ?? null;
  } catch (error) {
    return (
      logForDebugging(`Failed to read design OAuth tokens: ${errorMessage(error)}`, { level: "error" }),
      null
    );
  }
}
//@ chunk-8genbs31.js:773-1085 placement
async function writeDesignOAuth(r, n) {
  try {
    let o = !1,
      mutate = await getSecureStorage().mutate((e) => {
        if (n?.onlyIf && !n.onlyIf(e.designOauth)) return ((o = !0), e);
        return { ...e, designOauth: r };
      });
    return o ? { ...mutate, raced: !0 } : mutate;
  } catch (error) {
    return (
      logForDebugging(`Failed to save design OAuth tokens: ${errorMessage(error)}`, { level: "error" }),
      { success: !1, warning: "Failed to save design OAuth tokens" }
    );
  }
}
//@ chunk-8genbs31.js:1085-1311 placement
async function clearDesignOAuthIf(r) {
  try {
    await getSecureStorage().mutate((n) => {
      if (!n.designOauth) return n;
      if (!r(n.designOauth)) return n;
      let o = { ...n };
      return (delete o.designOauth, o);
    });
  } catch (error) {
    logForDebugging(`Failed to clear design OAuth tokens: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-8genbs31.js:1311-1346 placement
var w = ".design_oauth_refresh.lock";
//@ chunk-8genbs31.js:1346-1446 placement
async function readStoredDesignOAuth() {
  let r = getSecureStorage();
  return (r.invalidateCache?.(), (await r.readAsync())?.designOauth ?? null);
}
/**
 * 获取 Design 服务的 OAuth 访问令牌，必要时刷新；未登录时返回需要登录。
 */
//@ chunk-8genbs31.js:1446-4170 placement
async function getDesignAccessToken(r) {
  let n = await readDesignOAuth(r);
  if (!n?.accessToken) return { ok: !1, reason: "needs_design_login" };
  if (!isOAuthTokenExpired(n.expiresAt)) return { ok: !0, accessToken: n.accessToken };
  if (isDiskless())
    return (
      logFeatureBad("oauth_token_refresh", "design_oauth_refresh_diskless"),
      { ok: !1, reason: "needs_design_login" }
    );
  try {
    return await withOauthSlotRefreshLock(w, async (o) => {
      let s = await readStoredDesignOAuth();
      if (!s?.accessToken) return { ok: !1, reason: "needs_design_login" };
      if (!isOAuthTokenExpired(s.expiresAt)) return { ok: !0, accessToken: s.accessToken };
      if (!s.refreshToken) {
        let refreshToken = s.refreshToken;
        return (
          await clearDesignOAuthIf((c) => c.refreshToken === refreshToken),
          { ok: !1, reason: "needs_design_login" }
        );
      }
      if (!Array.isArray(s.scopes) || s.scopes.length === 0) {
        let refreshToken = s.refreshToken;
        return (
          await clearDesignOAuthIf((c) => c.refreshToken === refreshToken),
          { ok: !1, reason: "needs_design_login" }
        );
      }
      if (o.isCompromised())
        return (
          logFeatureSad("oauth_token_refresh", "design_oauth_refresh_lock_compromised"),
          {
            ok: !1,
            reason: "design_refresh_failed",
            detail: "another process is refreshing the design token",
          }
        );
      try {
        let e = await refreshOAuthToken(s.refreshToken, {
          clientId: s.clientId,
          scopes: s.scopes,
          skipProfileFetch: !0,
        });
        if (!e.refreshToken || !e.expiresAt) {
          if (e.refreshToken && e.refreshToken !== s.refreshToken)
            await revokeOAuthToken(e.refreshToken, s.clientId);
          return {
            ok: !1,
            reason: "design_refresh_failed",
            detail: "refresh response missing refresh_token or expiry",
          };
        }
        if (!DESIGN_OAUTH_SCOPES.every((a) => e.scopes.includes(a))) {
          if (e.refreshToken) await revokeOAuthToken(e.refreshToken, s.clientId);
          let refreshToken = s.refreshToken;
          return (
            await clearDesignOAuthIf((k) => k.refreshToken === refreshToken),
            { ok: !1, reason: "needs_design_login", detail: "refresh response missing design scopes" }
          );
        }
        let refreshToken = s.refreshToken,
          u = await writeDesignOAuth(
            {
              accessToken: e.accessToken,
              refreshToken: e.refreshToken,
              expiresAt: e.expiresAt,
              scopes: e.scopes.filter((scope) => DESIGN_OAUTH_SCOPES.some((k) => k === scope)),
              clientId: s.clientId,
            },
            { onlyIf: (a) => a?.refreshToken === refreshToken },
          );
        if (u.raced) {
          await revokeOAuthToken(e.refreshToken, s.clientId);
          let a = await readStoredDesignOAuth();
          return a?.accessToken && !isOAuthTokenExpired(a.expiresAt)
            ? { ok: !0, accessToken: a.accessToken }
            : { ok: !1, reason: "needs_design_login" };
        }
        if (!u.success)
          logForDebugging(
            "Design OAuth refresh succeeded but persist failed; continuing with in-memory token.",
            { level: "error" },
          );
        return { ok: !0, accessToken: e.accessToken };
      } catch (error) {
        if (o.isCompromised()) {
          let c = await readStoredDesignOAuth();
          if (c?.accessToken && !isOAuthTokenExpired(c.expiresAt))
            return { ok: !0, accessToken: c.accessToken };
          if (!isInvalidGrantError(error))
            logFeatureSad("oauth_token_refresh", "design_oauth_refresh_lock_compromised");
          return {
            ok: !1,
            reason: "design_refresh_failed",
            detail: "another process is refreshing the design token",
          };
        }
        if (isInvalidGrantError(error)) {
          let refreshToken = s.refreshToken;
          return (
            await clearDesignOAuthIf((u) => u.refreshToken === refreshToken),
            { ok: !1, reason: "needs_design_login", detail: "design authorization expired" }
          );
        }
        return { ok: !1, reason: "design_refresh_failed", detail: errorMessage(error) };
      }
    });
  } catch (error) {
    if (error instanceof OauthSlotLockContendedError)
      logFeatureSad("oauth_token_refresh", "design_oauth_refresh_lock_contention");
    else (logError(error), logFeatureBad("oauth_token_refresh", "design_oauth_refresh_lock_error"));
    return { ok: !1, reason: "design_refresh_failed", detail: errorMessage(error) };
  }
}
//@ chunk-8genbs31.js:4170-4252 placement
function designOAuthClientId() {
  return env.CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID ?? getOauthConfig().DESIGN_CLIENT_ID;
}
//@ chunk-8genbs31.js:4252-4304 placement
function isDesignOAuthConfigured() {
  return !designOAuthClientId().startsWith("00000000-");
}
//@ chunk-8genbs31.js:4304-4983 placement
async function refreshDesignToken(r, n) {
  let filtered = DESIGN_OAUTH_SCOPES.filter((s) => !r.scopes.includes(s));
  if (filtered.length > 0) {
    if (r.refreshToken) await revokeOAuthToken(r.refreshToken, n);
    return {
      ok: !1,
      message: `The authorization server did not grant the design scopes (missing: ${filtered.join(", ")}) \u2014 the Claude Design app registration may be incomplete or out of date.`,
    };
  }
  if (!r.refreshToken || !r.expiresAt) {
    if (r.refreshToken) await revokeOAuthToken(r.refreshToken, n);
    return {
      ok: !1,
      message:
        "The token response was missing a refresh token or expiry \u2014 cannot store a usable design credential.",
    };
  }
  return {
    ok: !0,
    slot: {
      accessToken: r.accessToken,
      refreshToken: r.refreshToken,
      expiresAt: r.expiresAt,
      scopes: r.scopes.filter((scope) => DESIGN_OAUTH_SCOPES.some((e) => e === scope)),
      clientId: n,
    },
  };
}
//@ chunk-8genbs31.js:4983-5048 placement
function isRemoteEnvironment() {
  return env.isSSH() || env.CLAUDE_CODE_REMOTE === !0 || getIsRemoteMode();
}
//@ chunk-8genbs31.js:5048-5061 placement
var A = 300000;
/**
 * 执行 Design OAuth 登录流程（本地回调或手动粘贴授权码），保存令牌。
 */
//@ chunk-8genbs31.js:5061-7261 placement
async function runDesignLogin(r, n) {
  if (r?.aborted) return { ok: !1, reason: "interrupted", message: "Design login was interrupted." };
  if (!isDesignOAuthConfigured())
    return {
      ok: !1,
      reason: "unconfigured",
      message:
        "The Claude Design OAuth client is not configured in this build. Set CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID to the registered client id, or update to a build with the registered client.",
    };
  if (isRemoteEnvironment() && !n?.onManualCode)
    return {
      ok: !1,
      reason: "remote",
      message:
        "This session is remote, so the browser can't reach the local sign-in listener. Run /design-login instead \u2014 it supports pasting the authorization code manually.",
    };
  let o = designOAuthClientId(),
    s = new OAuthService(),
    e = !1,
    c = !1,
    u;
  try {
    let a = n?.onAuthUrl;
    n?.onManualCode?.((g, T) => s.handleManualAuthCodeInput({ authorizationCode: g, state: T }));
    let startOAuthFlow = s.startOAuthFlow(
      a
        ? async (g, T) => {
            a(T ?? g, g);
          }
        : async () => {},
      {
        loginWithClaudeAi: !0,
        oauthClient: { clientId: o, scopes: DESIGN_OAUTH_SCOPES },
        skipProfileFetch: !0,
        successRedirectUrl: getOauthConfig().CLAUDEAI_SUCCESS_URL,
        ...(a && { skipBrowserOpen: !0 }),
      },
    );
    startOAuthFlow
      .then((g) => {
        if (c && g.refreshToken) revokeOAuthToken(g.refreshToken, o);
      })
      .catch(() => {});
    let winner = await Promise.race([
        startOAuthFlow,
        new Promise((g, T) => {
          ((u = setTimeout(() => {
            ((e = !0), (c = !0), T(Error("design login timed out")));
          }, A)),
            r?.addEventListener(
              "abort",
              () => {
                ((c = !0), T(Error("design login interrupted")));
              },
              { once: !0 },
            ));
        }),
      ]),
      h = await refreshDesignToken(winner, o);
    if (!h.ok) return { ok: !1, reason: "invalid", message: h.message };
    if (r?.aborted)
      return (
        await revokeOAuthToken(h.slot.refreshToken, h.slot.clientId),
        { ok: !1, reason: "interrupted", message: "Design login was interrupted." }
      );
    if (!(await writeDesignOAuth(h.slot)).success)
      return (
        await revokeOAuthToken(h.slot.refreshToken, h.slot.clientId),
        {
          ok: !1,
          reason: "save_failed",
          message: "Could not save the design credential to secure storage. Retry, or run /design-login.",
        }
      );
    return { ok: !0, accessToken: h.slot.accessToken };
  } catch (error) {
    if (((c = !0), r?.aborted))
      return { ok: !1, reason: "interrupted", message: "Design login was interrupted." };
    if (e)
      return {
        ok: !1,
        reason: "timed_out",
        message:
          "The browser authorization timed out after 5 minutes. Retry, or run /design-login for the manual flow.",
      };
    if (error instanceof AuthCodeRefusedError)
      return { ok: !1, reason: "code_refused", message: error.message };
    return {
      ok: !1,
      reason: "failed",
      cause: errorMessage(error),
      message: `The browser authorization failed (${errorMessage(error)}). Run /design-login to retry with the manual flow.`,
    };
  } finally {
    if (u !== void 0) clearTimeout(u);
    s.cleanup();
  }
}

export {
  getDesignAccessToken,
  readDesignOAuth,
  runDesignLogin,
  isDesignOAuthConfigured,
  isRemoteEnvironment,
  designOAuthClientId,
  refreshDesignToken,
  writeDesignOAuth,
};
