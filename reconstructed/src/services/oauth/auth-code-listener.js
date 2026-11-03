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
import { BJt, ACCOUNT_ON_HOLD, OAuthCallbackError, isClaudeAiOrigin } from "./oauthErrors.js";
import { logError } from "../../utils/log.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-b8krr1px.js:661-671 affinity
var P = 200;
/**
 * 本地 OAuth 回调服务器：http.createServer 监听 127.0.0.1 随机端口的 /callback，校验 state 后取 code，并重定向到成功页。
 */
//@ chunk-b8krr1px.js:671-4544 fingerprint = AuthCodeListener (0.723)
class AuthCodeListener {
  localServer;
  port = 0;
  promiseResolver = null;
  promiseRejecter = null;
  expectedState = null;
  pendingResponse = null;
  callbackPath;
  codeReceived = !1;
  constructor(e = "/callback") {
    ((this.localServer = createServer()), (this.callbackPath = e));
  }
  async start(e) {
    return new Promise((r, i) => {
      (this.localServer.once("error", (o) => {
        (logFeatureBad("oauth_callback_listener", "oauth_callback_server_start_failed"),
          i(Error(`Failed to start OAuth callback server: ${o.message}`, { cause: o })));
      }),
        this.localServer.listen(e ?? 0, "127.0.0.1", () => {
          let address = this.localServer.address();
          ((this.port = address.port), r(this.port));
        }));
    });
  }
  getPort() {
    return this.port;
  }
  hasPendingResponse() {
    return this.pendingResponse !== null;
  }
  async waitForAuthorization(e, r) {
    return new Promise((i, o) => {
      ((this.promiseResolver = i),
        (this.promiseRejecter = o),
        (this.expectedState = e),
        this.startLocalListener(r));
    });
  }
  handleSuccessRedirect(e, r) {
    if (!this.pendingResponse) return;
    if (r) {
      (r(this.pendingResponse, e),
        (this.pendingResponse = null),
        logEvent("tengu_oauth_automatic_redirect", { custom_handler: !0 }));
      return;
    }
    let i = shouldUseClaudeAIAuth(e)
      ? getOauthConfig().CLAUDEAI_SUCCESS_URL
      : getOauthConfig().CONSOLE_SUCCESS_URL;
    (this.pendingResponse.writeHead(302, { Location: i }),
      this.pendingResponse.end(),
      (this.pendingResponse = null),
      logEvent("tengu_oauth_automatic_redirect", {}));
  }
  handleErrorRedirect() {
    if (!this.pendingResponse) return;
    let CLAUDEAI_SUCCESS_URL = getOauthConfig().CLAUDEAI_SUCCESS_URL;
    (this.pendingResponse.writeHead(302, { Location: CLAUDEAI_SUCCESS_URL }),
      this.pendingResponse.end(),
      (this.pendingResponse = null),
      logEvent("tengu_oauth_automatic_redirect_error", {}));
  }
  startLocalListener(e) {
    (this.localServer.on("request", this.handleRedirect.bind(this)),
      this.localServer.on("error", this.handleError.bind(this)),
      e());
  }
  handleRedirect(e, r) {
    let i = new URL(e.url || "", `http://${e.headers.host || "localhost"}`);
    if (i.pathname !== this.callbackPath) {
      (r.writeHead(404), r.end());
      return;
    }
    let o = i.searchParams.get("code") ?? void 0,
      n = i.searchParams.get("state") ?? void 0,
      s = i.searchParams.get("error") ?? void 0;
    if (!o && s && BJt()) {
      this.respondToErrorCallback({
        error: s,
        errorDescription: i.searchParams.get("error_description") ?? void 0,
        errorUri: i.searchParams.get("error_uri") ?? void 0,
        state: n,
        res: r,
      });
      return;
    }
    this.validateAndRespond(o, n, r);
  }
  validateAndRespond(e, r, i) {
    if (r === this.expectedState && this.answerIfCodeReceived(i)) return;
    if (!e) {
      (logFeatureBad("oauth_callback_listener", "oauth_callback_no_code"),
        i.writeHead(400),
        i.end("Authorization code not found"),
        this.reject(Error("No authorization code received")));
      return;
    }
    if (this.rejectOnStateMismatch(r, i)) return;
    ((this.codeReceived = !0),
      (this.pendingResponse = i),
      logFeatureOk("oauth_callback_listener"),
      this.resolve(e));
  }
  respondToErrorCallback({ error: e, errorDescription: r, errorUri: i, state: o, res: n }) {
    if (this.rejectOnStateMismatch(o, n)) return;
    if (this.answerIfCodeReceived(n)) return;
    let s = r === ACCOUNT_ON_HOLD;
    (logFeatureBad(
      "oauth_callback_listener",
      s ? "oauth_callback_account_on_hold" : "oauth_callback_authorize_error",
    ),
      n.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }),
      n.end(
        s
          ? "Your account is on hold. You can close this window."
          : "Sign-in was canceled or failed. You can close this window.",
      ),
      this.reject(
        new OAuthCallbackError(S(e), r === void 0 ? void 0 : S(r), s ? isClaudeAiOrigin(i) : void 0),
      ));
  }
  answerIfCodeReceived(e) {
    if (!this.codeReceived) return !1;
    return (
      e.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }),
      e.end("Sign-in is already finishing. You can close this window."),
      !0
    );
  }
  rejectOnStateMismatch(e, r) {
    if (e === this.expectedState) return !1;
    return (
      logFeatureBad("oauth_callback_listener", "oauth_callback_state_mismatch"),
      r.writeHead(400),
      r.end("Invalid state parameter"),
      this.reject(Error("Invalid state parameter")),
      !0
    );
  }
  handleError(e) {
    (logFeatureBad("oauth_callback_listener", "oauth_callback_server_error"),
      logError(e),
      this.close(),
      this.reject(e));
  }
  resolve(e) {
    if (this.promiseResolver)
      (this.promiseResolver(e), (this.promiseResolver = null), (this.promiseRejecter = null));
  }
  reject(e) {
    if (this.promiseRejecter)
      (this.promiseRejecter(e), (this.promiseResolver = null), (this.promiseRejecter = null));
  }
  close() {
    if (this.pendingResponse) this.handleErrorRedirect();
    if (this.localServer) (this.localServer.removeAllListeners(), this.localServer.close());
  }
  [Symbol.dispose]() {
    this.close();
  }
}
//@ chunk-b8krr1px.js:4544-4622 layout
function S(e) {
  return truncateToLength(e.replace(/[\p{Cc}\p{Cf}\p{Cs}\u2028\u2029]/gu, ""), P);
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
//@ chunk-b8krr1px.js:4897-4998 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  return buffer.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
/**
 * PKCE code verifier：32 字节随机数 base64url。
 */
//@ chunk-b8krr1px.js:4998-5027 placement
function generateCodeVerifier() {
  return base64URLEncode(randomBytes(32));
}
//@ chunk-b8krr1px.js:5092-5121 placement
function y() {
  return base64URLEncode(randomBytes(32));
}
//@ chunk-b8krr1px.js:5121-5305 placement
class CallbackListenerUnavailableError extends Error {
  constructor(e) {
    super("Couldn't start the local listener that receives the browser sign-in. Try again.", { cause: e });
    this.name = "CallbackListenerUnavailableError";
  }
}
/**
 * 手动粘贴登录代码的提示文字。
 */
//@ chunk-b8krr1px.js:5305-5448 placement
var MANUAL_CODE_HINT =
    "The browser can't return the sign-in to Claude Code automatically. After you sign in, paste the code shown.",
  PASTE_CODE_PROMPT = "Paste code here > ";

export {
  MANUAL_CODE_HINT,
  PASTE_CODE_PROMPT,
  AuthCodeRefusedError,
  CallbackListenerUnavailableError,
  base64URLEncode,
  generateCodeVerifier,
  AuthCodeListener,
  y,
};
