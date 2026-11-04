/**
 * services/oauth/auth-code-listener.ts
 *
 * OAuth 本地回调服务器：在 127.0.0.1 随机端口监听 /callback，校验 state、取授权码并重定向到成功页。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/oauth/auth-code-listener.ts
 * pieces: chunk-b8krr1px.js (9)
 * attribution: affinity 1, fingerprint 1, layout 1, placement 6
 */
import { createServer } from "http";
import { randomBytes } from "crypto";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { shouldUseClaudeAIAuth } from "./client.js";
import { getOauthConfig } from "../../constants/oauth.js";
import {
  isRestrictedLinksEnabled,
  ACCOUNT_ON_HOLD,
  OAuthCallbackError,
  isClaudeAiOrigin,
} from "./oauthErrors.js";
import { logError } from "../../utils/log.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b8krr1px.js:661-671 affinity
/**
 * 回显文本的最大字符数（200）。
 */
var MAX_ECHOED_TEXT_CHARS = 200;
//@ chunk-b8krr1px.js:671-4544 fingerprint (2.1.88 match: AuthCodeListener, 0.723)
/**
 * 本地 OAuth 回调服务器：http.createServer 监听 127.0.0.1 随机端口的 /callback，校验 state 后取 code，并重定向到成功页。
 */
let AuthCodeListener; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b8krr1px.js:671", () => {
  AuthCodeListener = class AuthCodeListener {
    localServer;
    port = 0;
    promiseResolver = null;
    promiseRejecter = null;
    expectedState = null;
    pendingResponse = null;
    callbackPath;
    codeReceived = false;
    constructor(callbackPath = "/callback") {
      this.localServer = createServer();
      this.callbackPath = callbackPath;
    }
    async start(port) {
      return new Promise((resolve, reject) => {
        this.localServer.once("error", (err) => {
          logFeatureBad("oauth_callback_listener", "oauth_callback_server_start_failed");
          reject(
            Error(`Failed to start OAuth callback server: ${err.message}`, {
              cause: err,
            }),
          );
        });
        this.localServer.listen(port ?? 0, "127.0.0.1", () => {
          let address = this.localServer.address();
          this.port = address.port;
          resolve(this.port);
        });
      });
    }
    getPort() {
      return this.port;
    }
    hasPendingResponse() {
      return this.pendingResponse !== null;
    }
    async waitForAuthorization(state, onReady) {
      return new Promise((resolve, reject) => {
        this.promiseResolver = resolve;
        this.promiseRejecter = reject;
        this.expectedState = state;
        this.startLocalListener(onReady);
      });
    }
    handleSuccessRedirect(scopes, customHandler) {
      if (!this.pendingResponse) return;
      if (customHandler) {
        customHandler(this.pendingResponse, scopes);
        this.pendingResponse = null;
        logEvent("tengu_oauth_automatic_redirect", {
          custom_handler: true,
        });
        return;
      }
      let successUrl = shouldUseClaudeAIAuth(scopes)
        ? getOauthConfig().CLAUDEAI_SUCCESS_URL
        : getOauthConfig().CONSOLE_SUCCESS_URL;
      this.pendingResponse.writeHead(302, {
        Location: successUrl,
      });
      this.pendingResponse.end();
      this.pendingResponse = null;
      logEvent("tengu_oauth_automatic_redirect", {});
    }
    handleErrorRedirect() {
      if (!this.pendingResponse) return;
      let errorUrl = getOauthConfig().CLAUDEAI_SUCCESS_URL;
      this.pendingResponse.writeHead(302, {
        Location: errorUrl,
      });
      this.pendingResponse.end();
      this.pendingResponse = null;
      logEvent("tengu_oauth_automatic_redirect_error", {});
    }
    startLocalListener(onReady) {
      this.localServer.on("request", this.handleRedirect.bind(this));
      this.localServer.on("error", this.handleError.bind(this));
      onReady();
    }
    handleRedirect(req, res) {
      let parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      if (parsedUrl.pathname !== this.callbackPath) {
        res.writeHead(404);
        res.end();
        return;
      }
      let authCode = parsedUrl.searchParams.get("code") ?? undefined;
      let state = parsedUrl.searchParams.get("state") ?? undefined;
      let errorCode = parsedUrl.searchParams.get("error") ?? undefined;
      if (!authCode && errorCode && isRestrictedLinksEnabled()) {
        this.respondToErrorCallback({
          error: errorCode,
          errorDescription: parsedUrl.searchParams.get("error_description") ?? undefined,
          errorUri: parsedUrl.searchParams.get("error_uri") ?? undefined,
          state,
          res,
        });
        return;
      }
      this.validateAndRespond(authCode, state, res);
    }
    validateAndRespond(authCode, state, res) {
      if (state === this.expectedState && this.answerIfCodeReceived(res)) return;
      if (!authCode) {
        logFeatureBad("oauth_callback_listener", "oauth_callback_no_code");
        res.writeHead(400);
        res.end("Authorization code not found");
        this.reject(Error("No authorization code received"));
        return;
      }
      if (this.rejectOnStateMismatch(state, res)) return;
      this.codeReceived = true;
      this.pendingResponse = res;
      logFeatureOk("oauth_callback_listener");
      this.resolve(authCode);
    }
    respondToErrorCallback({ error, errorDescription, errorUri, state, res }) {
      if (this.rejectOnStateMismatch(state, res)) return;
      if (this.answerIfCodeReceived(res)) return;
      let onHold = errorDescription === ACCOUNT_ON_HOLD;
      logFeatureBad(
        "oauth_callback_listener",
        onHold ? "oauth_callback_account_on_hold" : "oauth_callback_authorize_error",
      );
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end(
        onHold
          ? "Your account is on hold. You can close this window."
          : "Sign-in was canceled or failed. You can close this window.",
      );
      this.reject(
        new OAuthCallbackError(
          sanitizeEchoedText(error),
          errorDescription === undefined ? undefined : sanitizeEchoedText(errorDescription),
          onHold ? isClaudeAiOrigin(errorUri) : undefined,
        ),
      );
    }
    answerIfCodeReceived(res) {
      if (!this.codeReceived) return false;
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end("Sign-in is already finishing. You can close this window.");
      return true;
    }
    rejectOnStateMismatch(state, res) {
      if (state === this.expectedState) return false;
      logFeatureBad("oauth_callback_listener", "oauth_callback_state_mismatch");
      res.writeHead(400);
      res.end("Invalid state parameter");
      this.reject(Error("Invalid state parameter"));
      return true;
    }
    handleError(err) {
      logFeatureBad("oauth_callback_listener", "oauth_callback_server_error");
      logError(err);
      this.close();
      this.reject(err);
    }
    resolve(authorizationCode) {
      if (this.promiseResolver) {
        this.promiseResolver(authorizationCode);
        this.promiseResolver = null;
        this.promiseRejecter = null;
      }
    }
    reject(error) {
      if (this.promiseRejecter) {
        this.promiseRejecter(error);
        this.promiseResolver = null;
        this.promiseRejecter = null;
      }
    }
    close() {
      if (this.pendingResponse) this.handleErrorRedirect();
      if (this.localServer) {
        this.localServer.removeAllListeners();
        this.localServer.close();
      }
    }
    [Symbol.dispose]() {
      this.close();
    }
  };
});
//@ chunk-b8krr1px.js:4544-4622 layout
/**
 * 清洗要回显的文本（去控制字符并截断）。
 */
function sanitizeEchoedText(text) {
  return truncateToLength(text.replace(/[\p{Cc}\p{Cf}\p{Cs}\u2028\u2029]/gu, ""), MAX_ECHOED_TEXT_CHARS);
}
//@ chunk-b8krr1px.js:4622-4844 placement
class AuthCodeRefusedError extends Error {
  constructor() {
    super(
      "That code wasn't accepted. It may be incomplete, expired, already used, or from an earlier sign-in attempt. Sign in again to get a new code.",
    );
    this.name = "AuthCodeRefusedError";
  }
}
//@ chunk-b8krr1px.js:4897-4998 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(buffer) {
  return buffer.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
//@ chunk-b8krr1px.js:4998-5027 placement
/**
 * PKCE code verifier：32 字节随机数 base64url。
 */
function generateCodeVerifier() {
  return base64URLEncode(randomBytes(32));
}
//@ chunk-b8krr1px.js:5092-5121 placement
/**
 * 生成随机 state（32 字节 base64url）。
 */
function generateState() {
  return base64URLEncode(randomBytes(32));
}
//@ chunk-b8krr1px.js:5121-5305 placement
class CallbackListenerUnavailableError extends Error {
  constructor(cause) {
    super("Couldn't start the local listener that receives the browser sign-in. Try again.", {
      cause,
    });
    this.name = "CallbackListenerUnavailableError";
  }
}
//@ chunk-b8krr1px.js:5305-5448 placement
/**
 * 手动粘贴登录代码的提示文字。
 */
var MANUAL_CODE_HINT =
  "The browser can't return the sign-in to Claude Code automatically. After you sign in, paste the code shown.";
var PASTE_CODE_PROMPT = "Paste code here > ";
export {
  MANUAL_CODE_HINT,
  PASTE_CODE_PROMPT,
  AuthCodeRefusedError,
  CallbackListenerUnavailableError,
  base64URLEncode,
  generateCodeVerifier,
  AuthCodeListener,
  generateState,
};
