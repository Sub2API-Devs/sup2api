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
  generateState,
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
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logAuthEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";

//@ chunk-b8krr1px.js:5448-8992 fingerprint = OAuthService (0.65)
/**
 * OAuth 登录服务：生成 code verifier，启动本地回调监听（失败时可退回手动粘贴授权码），打开浏览器授权，换取令牌后清理监听器。
 */
class OAuthService {
  codeVerifier;
  authCodeListener = null;
  manualAuthCodeResolver = null;
  authorizationCodeReceived = false;
  constructor() {
    this.codeVerifier = generateCodeVerifier();
  }
  async startOAuthFlow(authURLHandler, r) {
    this.authorizationCodeReceived = false;
    let i = null;
    this.authCodeListener = new AuthCodeListener();
    try {
      i = await this.authCodeListener.start();
    } catch (error) {
      this.authCodeListener = null;
      logForDebugging(`OAuth callback listener could not start: ${errorMessage(error)}`, {
        level: "error",
      });
      let u = error instanceof Error ? getErrnoCode(error.cause) : undefined;
      if (!r?.onCallbackListenerUnavailable || u === "EMFILE" || u === "ENFILE")
        throw new CallbackListenerUnavailableError(error);
      r.onCallbackListenerUnavailable();
    }
    let codeChallenge = generateCodeChallenge(this.codeVerifier);
    let state = generateState();
    let opts = {
      codeChallenge,
      state,
      port: i ?? 0,
      loginWithClaudeAi: r?.loginWithClaudeAi,
      inferenceOnly: r?.inferenceOnly,
      orgUUID: r?.orgUUID,
      loginHint: r?.loginHint,
      loginMethod: r?.loginMethod,
      oauthClient: r?.oauthClient,
      alsoRequestScope: r?.settingsOnlyGrant?.scope,
    };
    let manualFlowUrl = buildAuthUrl({
      ...opts,
      isManual: true,
    });
    let automaticFlowUrl =
      i === null
        ? undefined
        : buildAuthUrl({
            ...opts,
            isManual: false,
          });
    let authorizationCode = await this.waitForAuthorizationCode(state, async () => {
      if (automaticFlowUrl === undefined) await authURLHandler(manualFlowUrl);
      else if (r?.skipBrowserOpen) await authURLHandler(manualFlowUrl, automaticFlowUrl);
      else {
        await authURLHandler(manualFlowUrl);
        await openValidatedUrlSucceeded(automaticFlowUrl);
      }
    });
    let h = this.authCodeListener?.hasPendingResponse() ?? false;
    logEvent("tengu_oauth_auth_code_received", {
      automatic: h,
    });
    try {
      let c = await exchangeCodeForTokens(authorizationCode, {
        state,
        codeVerifier: this.codeVerifier,
        port: opts.port,
        useManualRedirect: !h,
        expiresIn: r?.expiresIn,
        clientId: r?.oauthClient?.clientId,
      });
      if (h) {
        let scopes = parseScopes(c.scope);
        let settingsOnlyGrant = r?.settingsOnlyGrant;
        let successRedirectUrl =
          settingsOnlyGrant && scopes.includes(settingsOnlyGrant.scope) && !shouldUseClaudeAIAuth(scopes)
            ? settingsOnlyGrant.successRedirectUrl
            : r?.successRedirectUrl;
        if (successRedirectUrl)
          this.authCodeListener?.handleSuccessRedirect(scopes, (w) => {
            w.writeHead(302, {
              Location: successRedirectUrl,
            });
            w.end();
          });
        else this.authCodeListener?.handleSuccessRedirect(scopes);
      }
      let u = r?.skipProfileFetch ? null : await fetchProfileInfo(c.access_token);
      if (i === null) logFeatureSad("oauth_login", "callback_listener_unavailable");
      else logFeatureOk("oauth_login");
      return this.formatTokens(c, {
        subscriptionType: u?.subscriptionType ?? null,
        unconfirmedPlan: u?.originStamped !== true,
        rateLimitTier: u?.rateLimitTier ?? null,
        profile: u?.rawProfile,
        clientId: r?.oauthClient?.clientId,
      });
    } catch (error) {
      let u = !h && isInvalidGrantError(error);
      logFeatureBad("oauth_login", u ? "oauth_pasted_code_refused" : "oauth_login_failed");
      if (h) this.authCodeListener?.handleErrorRedirect();
      if (!r?.inferenceOnly && !r?.oauthClient)
        logAuthEvent({
          action: "login",
          success: false,
          authMethod: "oauth",
          error,
        });
      throw u ? new AuthCodeRefusedError() : error;
    } finally {
      this.authCodeListener?.close();
    }
  }
  async waitForAuthorizationCode(state, onReady) {
    return new Promise((resolve, reject) => {
      this.manualAuthCodeResolver = resolve;
      if (!this.authCodeListener) {
        onReady().catch((error) => {
          this.manualAuthCodeResolver = null;
          reject(error);
        });
        return;
      }
      this.authCodeListener
        .waitForAuthorization(state, onReady)
        .then((authorizationCode) => {
          this.manualAuthCodeResolver = null;
          this.authorizationCodeReceived = true;
          resolve(authorizationCode);
        })
        .catch((error) => {
          this.manualAuthCodeResolver = null;
          reject(error);
        });
    });
  }
  handleManualAuthCodeInput(params) {
    if (this.manualAuthCodeResolver) {
      this.authorizationCodeReceived = true;
      this.manualAuthCodeResolver(params.authorizationCode);
      this.manualAuthCodeResolver = null;
      this.authCodeListener?.close();
    }
  }
  formatTokens(response, { subscriptionType, unconfirmedPlan, rateLimitTier, profile, clientId }) {
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + response.expires_in * 1000,
      refreshTokenExpiresAt: resolveRefreshTokenExpiresAt(response.refresh_token_expires_in, true),
      scopes: parseScopes(response.scope),
      subscriptionType,
      ...(subscriptionType !== null && {
        subscriptionTypeSource: unconfirmedPlan ? "profile" : "sign_in",
      }),
      rateLimitTier,
      profile,
      clientId,
      tokenAccount: response.account
        ? {
            uuid: response.account.uuid,
            emailAddress: response.account.email_address,
            organizationUuid: response.organization?.uuid,
            organizationName: response.organization?.name,
            workspaceId: response.workspace?.id,
            workspaceName: response.workspace?.name,
          }
        : undefined,
    };
  }
  hasReceivedAuthorizationCode() {
    return this.authorizationCodeReceived;
  }
  cleanup() {
    this.authCodeListener?.close();
    this.manualAuthCodeResolver = null;
  }
}
export { OAuthService };
