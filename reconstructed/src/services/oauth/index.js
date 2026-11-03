/**
 * services/oauth/index.ts
 *
 * OAuthService：登录流程编排（verifier、本地回调或手动粘贴码、打开浏览器、换令牌、清理）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/oauth/index.ts
 * pieces: chunk-b8krr1px.js (1)
 * attribution: fingerprint 1
 */
import {
  generateCodeVerifier,
  AuthCodeListener,
  CallbackListenerUnavailableError,
  y,
  AuthCodeRefusedError,
} from "./auth-code-listener.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { generateCodeChallenge } from "./crypto.js";
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  parseScopes,
  shouldUseClaudeAIAuth,
  fetchProfileInfo,
  isInvalidGrantError,
  resolveRefreshTokenExpiresAt,
} from "./client.js";
import { fi } from "../../utils/browser.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logAuthEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";

/**
 * OAuth 登录服务：生成 code verifier，启动本地回调监听（失败时可退回手动粘贴授权码），打开浏览器授权，换取令牌后清理监听器。
 */
//@ chunk-b8krr1px.js:5448-8992 fingerprint = OAuthService (0.65)
class OAuthService {
  codeVerifier;
  authCodeListener = null;
  manualAuthCodeResolver = null;
  authorizationCodeReceived = !1;
  constructor() {
    this.codeVerifier = generateCodeVerifier();
  }
  async startOAuthFlow(e, r) {
    this.authorizationCodeReceived = !1;
    let i = null;
    this.authCodeListener = new AuthCodeListener();
    try {
      i = await this.authCodeListener.start();
    } catch (error) {
      ((this.authCodeListener = null),
        logForDebugging(`OAuth callback listener could not start: ${errorMessage(error)}`, {
          level: "error",
        }));
      let u = error instanceof Error ? getErrnoCode(error.cause) : void 0;
      if (!r?.onCallbackListenerUnavailable || u === "EMFILE" || u === "ENFILE")
        throw new CallbackListenerUnavailableError(error);
      r.onCallbackListenerUnavailable();
    }
    let o = generateCodeChallenge(this.codeVerifier),
      n = y(),
      s = {
        codeChallenge: o,
        state: n,
        port: i ?? 0,
        loginWithClaudeAi: r?.loginWithClaudeAi,
        inferenceOnly: r?.inferenceOnly,
        orgUUID: r?.orgUUID,
        loginHint: r?.loginHint,
        loginMethod: r?.loginMethod,
        oauthClient: r?.oauthClient,
        alsoRequestScope: r?.settingsOnlyGrant?.scope,
      },
      v = buildAuthUrl({ ...s, isManual: !0 }),
      C = i === null ? void 0 : buildAuthUrl({ ...s, isManual: !1 }),
      waitForAuthorizationCode = await this.waitForAuthorizationCode(n, async () => {
        if (C === void 0) await e(v);
        else if (r?.skipBrowserOpen) await e(v, C);
        else (await e(v), await fi(C));
      }),
      h = this.authCodeListener?.hasPendingResponse() ?? !1;
    logEvent("tengu_oauth_auth_code_received", { automatic: h });
    try {
      let c = await exchangeCodeForTokens(waitForAuthorizationCode, {
        state: n,
        codeVerifier: this.codeVerifier,
        port: s.port,
        useManualRedirect: !h,
        expiresIn: r?.expiresIn,
        clientId: r?.oauthClient?.clientId,
      });
      if (h) {
        let p = parseScopes(c.scope),
          R = r?.settingsOnlyGrant,
          b =
            R && p.includes(R.scope) && !shouldUseClaudeAIAuth(p)
              ? R.successRedirectUrl
              : r?.successRedirectUrl;
        if (b)
          this.authCodeListener?.handleSuccessRedirect(p, (w) => {
            (w.writeHead(302, { Location: b }), w.end());
          });
        else this.authCodeListener?.handleSuccessRedirect(p);
      }
      let u = r?.skipProfileFetch ? null : await fetchProfileInfo(c.access_token);
      if (i === null) logFeatureSad("oauth_login", "callback_listener_unavailable");
      else logFeatureOk("oauth_login");
      return this.formatTokens(c, {
        subscriptionType: u?.subscriptionType ?? null,
        unconfirmedPlan: u?.originStamped !== !0,
        rateLimitTier: u?.rateLimitTier ?? null,
        profile: u?.rawProfile,
        clientId: r?.oauthClient?.clientId,
      });
    } catch (error) {
      let u = !h && isInvalidGrantError(error);
      if ((logFeatureBad("oauth_login", u ? "oauth_pasted_code_refused" : "oauth_login_failed"), h))
        this.authCodeListener?.handleErrorRedirect();
      if (!r?.inferenceOnly && !r?.oauthClient)
        logAuthEvent({ action: "login", success: !1, authMethod: "oauth", error: error });
      throw u ? new AuthCodeRefusedError() : error;
    } finally {
      this.authCodeListener?.close();
    }
  }
  async waitForAuthorizationCode(e, r) {
    return new Promise((i, o) => {
      if (((this.manualAuthCodeResolver = i), !this.authCodeListener)) {
        r().catch((n) => {
          ((this.manualAuthCodeResolver = null), o(n));
        });
        return;
      }
      this.authCodeListener
        .waitForAuthorization(e, r)
        .then((n) => {
          ((this.manualAuthCodeResolver = null), (this.authorizationCodeReceived = !0), i(n));
        })
        .catch((n) => {
          ((this.manualAuthCodeResolver = null), o(n));
        });
    });
  }
  handleManualAuthCodeInput(e) {
    if (this.manualAuthCodeResolver)
      ((this.authorizationCodeReceived = !0),
        this.manualAuthCodeResolver(e.authorizationCode),
        (this.manualAuthCodeResolver = null),
        this.authCodeListener?.close());
  }
  formatTokens(e, { subscriptionType: r, unconfirmedPlan: i, rateLimitTier: o, profile: n, clientId: s }) {
    return {
      accessToken: e.access_token,
      refreshToken: e.refresh_token,
      expiresAt: Date.now() + e.expires_in * 1000,
      refreshTokenExpiresAt: resolveRefreshTokenExpiresAt(e.refresh_token_expires_in, !0),
      scopes: parseScopes(e.scope),
      subscriptionType: r,
      ...(r !== null && { subscriptionTypeSource: i ? "profile" : "sign_in" }),
      rateLimitTier: o,
      profile: n,
      clientId: s,
      tokenAccount: e.account
        ? {
            uuid: e.account.uuid,
            emailAddress: e.account.email_address,
            organizationUuid: e.organization?.uuid,
            organizationName: e.organization?.name,
            workspaceId: e.workspace?.id,
            workspaceName: e.workspace?.name,
          }
        : void 0,
    };
  }
  hasReceivedAuthorizationCode() {
    return this.authorizationCodeReceived;
  }
  cleanup() {
    (this.authCodeListener?.close(), (this.manualAuthCodeResolver = null));
  }
}

export { OAuthService };
