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

//@ chunk-b8krr1px.js:5448-8992 fingerprint (2.1.88 match: OAuthService, 0.65)
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
  async startOAuthFlow(authURLHandler, options) {
    this.authorizationCodeReceived = false;
    let port = null;
    this.authCodeListener = new AuthCodeListener();
    try {
      port = await this.authCodeListener.start();
    } catch (error) {
      this.authCodeListener = null;
      logForDebugging(`OAuth callback listener could not start: ${errorMessage(error)}`, {
        level: "error",
      });
      let errnoCode = error instanceof Error ? getErrnoCode(error.cause) : undefined;
      if (!options?.onCallbackListenerUnavailable || errnoCode === "EMFILE" || errnoCode === "ENFILE")
        throw new CallbackListenerUnavailableError(error);
      options.onCallbackListenerUnavailable();
    }
    let codeChallenge = generateCodeChallenge(this.codeVerifier);
    let state = generateState();
    let opts = {
      codeChallenge,
      state,
      port: port ?? 0,
      loginWithClaudeAi: options?.loginWithClaudeAi,
      inferenceOnly: options?.inferenceOnly,
      orgUUID: options?.orgUUID,
      loginHint: options?.loginHint,
      loginMethod: options?.loginMethod,
      oauthClient: options?.oauthClient,
      alsoRequestScope: options?.settingsOnlyGrant?.scope,
    };
    let manualFlowUrl = buildAuthUrl({
      ...opts,
      isManual: true,
    });
    let automaticFlowUrl =
      port === null
        ? undefined
        : buildAuthUrl({
            ...opts,
            isManual: false,
          });
    let authorizationCode = await this.waitForAuthorizationCode(state, async () => {
      if (automaticFlowUrl === undefined) await authURLHandler(manualFlowUrl);
      else if (options?.skipBrowserOpen) await authURLHandler(manualFlowUrl, automaticFlowUrl);
      else {
        await authURLHandler(manualFlowUrl);
        await openValidatedUrlSucceeded(automaticFlowUrl);
      }
    });
    let automaticFlow = this.authCodeListener?.hasPendingResponse() ?? false;
    logEvent("tengu_oauth_auth_code_received", {
      automatic: automaticFlow,
    });
    try {
      let tokenResponse = await exchangeCodeForTokens(authorizationCode, {
        state,
        codeVerifier: this.codeVerifier,
        port: opts.port,
        useManualRedirect: !automaticFlow,
        expiresIn: options?.expiresIn,
        clientId: options?.oauthClient?.clientId,
      });
      if (automaticFlow) {
        let scopes = parseScopes(tokenResponse.scope);
        let settingsOnlyGrant = options?.settingsOnlyGrant;
        let successRedirectUrl =
          settingsOnlyGrant && scopes.includes(settingsOnlyGrant.scope) && !shouldUseClaudeAIAuth(scopes)
            ? settingsOnlyGrant.successRedirectUrl
            : options?.successRedirectUrl;
        if (successRedirectUrl)
          this.authCodeListener?.handleSuccessRedirect(scopes, (res) => {
            res.writeHead(302, {
              Location: successRedirectUrl,
            });
            res.end();
          });
        else this.authCodeListener?.handleSuccessRedirect(scopes);
      }
      let profileInfo = options?.skipProfileFetch ? null : await fetchProfileInfo(tokenResponse.access_token);
      if (port === null) logFeatureSad("oauth_login", "callback_listener_unavailable");
      else logFeatureOk("oauth_login");
      return this.formatTokens(tokenResponse, {
        subscriptionType: profileInfo?.subscriptionType ?? null,
        unconfirmedPlan: profileInfo?.originStamped !== true,
        rateLimitTier: profileInfo?.rateLimitTier ?? null,
        profile: profileInfo?.rawProfile,
        clientId: options?.oauthClient?.clientId,
      });
    } catch (error) {
      let pastedCodeRefused = !automaticFlow && isInvalidGrantError(error);
      logFeatureBad("oauth_login", pastedCodeRefused ? "oauth_pasted_code_refused" : "oauth_login_failed");
      if (automaticFlow) this.authCodeListener?.handleErrorRedirect();
      if (!options?.inferenceOnly && !options?.oauthClient)
        logAuthEvent({
          action: "login",
          success: false,
          authMethod: "oauth",
          error,
        });
      throw pastedCodeRefused ? new AuthCodeRefusedError() : error;
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
