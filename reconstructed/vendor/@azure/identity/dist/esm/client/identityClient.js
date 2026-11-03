/**
 * @azure/identity/dist/esm/client/identityClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { Qo } from "../../../../core-rest-pipeline/dist/esm/util/file.js";
import { AzurePublicCloud, SDK_VERSION } from "../constants.js";
import { ti } from "../../../../core-client/dist/esm/serviceClient.js";
import { $e } from "../util/logging.js";
import { Ld, Hd } from "../credentials/managedIdentityCredential/utils.js";
import { $n, AUTHENTICATIONERROR } from "../../index.js";
import { Z } from "../util/tracing.js";
import { Dd } from "../util/identityTokenEndpoint.js";
import { je, rr } from "../../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";

//@ chunk-mrx6y2r5.js:83557-83582 esm-fingerprint
var NOCORRELATIONID = "noCorrelationId";
//@ chunk-mrx6y2r5.js:83582-83744 esm-fingerprint
function fg(e) {
  let t = e === null || e === void 0 ? void 0 : e.authorityHost;
  if (Qo) t = t !== null && t !== void 0 ? t : process.env.AZURE_AUTHORITY_HOST;
  return t !== null && t !== void 0 ? t : AzurePublicCloud;
}
//@ chunk-mrx6y2r5.js:83744-88341 esm-fingerprint
class Qr extends ti {
  constructor(e) {
    var t, r;
    let n = `azsdk-js-identity/${SDK_VERSION}`,
      o = (
        (t = e === null || e === void 0 ? void 0 : e.userAgentOptions) === null || t === void 0
          ? void 0
          : t.userAgentPrefix
      )
        ? `${e.userAgentOptions.userAgentPrefix} ${n}`
        : `${n}`,
      i = fg(e);
    if (!i.startsWith("https:")) throw Error("The authorityHost address must use the 'https' protocol.");
    super(
      Object.assign(
        Object.assign(
          { requestContentType: "application/json; charset=utf-8", retryOptions: { maxRetries: 3 } },
          e,
        ),
        { userAgentOptions: { userAgentPrefix: o }, baseUri: i },
      ),
    );
    if (
      ((this.allowInsecureConnection = !1),
      (this.authorityHost = i),
      (this.abortControllers = new Map()),
      (this.allowLoggingAccountIdentifiers =
        (r = e === null || e === void 0 ? void 0 : e.loggingOptions) === null || r === void 0
          ? void 0
          : r.allowLoggingAccountIdentifiers),
      (this.tokenCredentialOptions = Object.assign({}, e)),
      e === null || e === void 0 ? void 0 : e.allowInsecureConnection)
    )
      this.allowInsecureConnection = e.allowInsecureConnection;
  }
  async sendTokenRequest(e) {
    $e.info(`IdentityClient: sending token request to [${e.url}]`);
    let sendRequest = await this.sendRequest(e);
    if (sendRequest.bodyAsText && (sendRequest.status === 200 || sendRequest.status === 201)) {
      let parsed = JSON.parse(sendRequest.bodyAsText);
      if (!parsed.access_token) return null;
      this.logIdentifiers(sendRequest);
      let n = {
        accessToken: {
          token: parsed.access_token,
          expiresOnTimestamp: Ld(parsed),
          refreshAfterTimestamp: Hd(parsed),
          tokenType: "Bearer",
        },
        refreshToken: parsed.refresh_token,
      };
      return (
        $e.info(`IdentityClient: [${e.url}] token acquired, expires on ${n.accessToken.expiresOnTimestamp}`),
        n
      );
    } else {
      let r = new $n(sendRequest.status, sendRequest.bodyAsText);
      throw (
        $e.warning(
          `IdentityClient: authentication error. HTTP status: ${sendRequest.status}, ${r.errorResponse.errorDescription}`,
        ),
        r
      );
    }
  }
  async refreshAccessToken(e, t, r, n, o, i = {}) {
    if (n === void 0) return null;
    $e.info(`IdentityClient: refreshing access token with client ID: ${t}, scopes: ${r} started`);
    let s = { grant_type: "refresh_token", client_id: t, refresh_token: n, scope: r };
    if (o !== void 0) s.client_secret = o;
    let uRLSearchParams = new URLSearchParams(s);
    return Z.withSpan("IdentityClient.refreshAccessToken", i, async (c) => {
      try {
        let l = Dd(e),
          d = je({
            url: `${this.authorityHost}/${e}/${l}`,
            method: "POST",
            body: uRLSearchParams.toString(),
            abortSignal: i.abortSignal,
            headers: rr({ Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }),
            tracingOptions: c.tracingOptions,
          }),
          sendTokenRequest = await this.sendTokenRequest(d);
        return ($e.info(`IdentityClient: refreshed token for client ID: ${t}`), sendTokenRequest);
      } catch (error) {
        if (error.name === AUTHENTICATIONERROR && error.errorResponse.error === "interaction_required")
          return ($e.info(`IdentityClient: interaction required for client ID: ${t}`), null);
        else
          throw ($e.warning(`IdentityClient: failed refreshing token for client ID: ${t}: ${error}`), error);
      }
    });
  }
  generateAbortSignal(e) {
    let abortController = new AbortController(),
      r = this.abortControllers.get(e) || [];
    (r.push(abortController), this.abortControllers.set(e, r));
    let onabort = abortController.signal.onabort;
    return (
      (abortController.signal.onabort = (...o) => {
        if ((this.abortControllers.set(e, void 0), onabort)) onabort.apply(abortController.signal, o);
      }),
      abortController.signal
    );
  }
  abortRequests(e) {
    let t = e || NOCORRELATIONID,
      r = [...(this.abortControllers.get(t) || []), ...(this.abortControllers.get(NOCORRELATIONID) || [])];
    if (!r.length) return;
    for (let n of r) n.abort();
    this.abortControllers.set(t, void 0);
  }
  getCorrelationId(e) {
    var t;
    let r =
      (t = e === null || e === void 0 ? void 0 : e.body) === null || t === void 0
        ? void 0
        : t
            .split("&")
            .map((n) => n.split("="))
            .find(([n]) => n === "client-request-id");
    return r && r.length ? r[1] || NOCORRELATIONID : NOCORRELATIONID;
  }
  async sendGetRequestAsync(e, t) {
    let r = je({
        url: e,
        method: "GET",
        body: t === null || t === void 0 ? void 0 : t.body,
        allowInsecureConnection: this.allowInsecureConnection,
        headers: rr(t === null || t === void 0 ? void 0 : t.headers),
        abortSignal: this.generateAbortSignal(NOCORRELATIONID),
      }),
      sendRequest = await this.sendRequest(r);
    return (
      this.logIdentifiers(sendRequest),
      {
        body: sendRequest.bodyAsText ? JSON.parse(sendRequest.bodyAsText) : void 0,
        headers: sendRequest.headers.toJSON(),
        status: sendRequest.status,
      }
    );
  }
  async sendPostRequestAsync(e, t) {
    let r = je({
        url: e,
        method: "POST",
        body: t === null || t === void 0 ? void 0 : t.body,
        headers: rr(t === null || t === void 0 ? void 0 : t.headers),
        allowInsecureConnection: this.allowInsecureConnection,
        abortSignal: this.generateAbortSignal(this.getCorrelationId(t)),
      }),
      sendRequest = await this.sendRequest(r);
    return (
      this.logIdentifiers(sendRequest),
      {
        body: sendRequest.bodyAsText ? JSON.parse(sendRequest.bodyAsText) : void 0,
        headers: sendRequest.headers.toJSON(),
        status: sendRequest.status,
      }
    );
  }
  getTokenCredentialOptions() {
    return this.tokenCredentialOptions;
  }
  logIdentifiers(e) {
    if (!this.allowLoggingAccountIdentifiers || !e.bodyAsText) return;
    let t = "No User Principal Name available";
    try {
      let access_token = (e.parsedBody || JSON.parse(e.bodyAsText)).access_token;
      if (!access_token) return;
      let o = access_token.split(".")[1],
        {
          appid: appid,
          upn: upn,
          tid: tid,
          oid: oid,
        } = JSON.parse(Buffer.from(o, "base64").toString("utf8"));
      $e.info(
        `[Authenticated account] Client ID: ${appid}. Tenant ID: ${tid}. User Principal Name: ${upn || t}. Object ID (user): ${oid}`,
      );
    } catch (error) {
      $e.warning(
        "allowLoggingAccountIdentifiers was set, but we couldn't log the account information. Error:",
        error.message,
      );
    }
  }
}

export { Qr };
