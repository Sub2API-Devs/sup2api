/**
 * google-auth-library/build/src/auth/oauth2common.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_crypto_3 } from "../crypto/crypto.js";

//@ chunk-e8d3a8an.js:102715-104909 cjs-fingerprint
var require_oauth2common = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OAuthClientAuthHandler = undefined;
  cjsExports.getErrorFromOAuthErrorResponse = getErrorFromOAuthErrorResponse;
  var gaxios_1 = require_gaxios_2();
  var crypto_1 = require_crypto_3();
  var METHODS_SUPPORTING_REQUEST_BODY = ["PUT", "POST", "PATCH"];
  class OAuthClientAuthHandler {
    #e = crypto_1.createCrypto();
    #t;
    transporter;
    constructor(options) {
      if (options && "clientId" in options) {
        this.#t = options;
        this.transporter = new gaxios_1.Gaxios();
      } else {
        this.#t = options?.clientAuthentication;
        this.transporter = options?.transporter || new gaxios_1.Gaxios();
      }
    }
    applyClientAuthenticationOptions(opts, bearerToken) {
      opts.headers = gaxios_1.Gaxios.mergeHeaders(opts.headers);
      this.injectAuthenticatedHeaders(opts, bearerToken);
      if (!bearerToken) this.injectAuthenticatedRequestBody(opts);
    }
    injectAuthenticatedHeaders(opts, bearerToken) {
      if (bearerToken)
        opts.headers = gaxios_1.Gaxios.mergeHeaders(opts.headers, {
          authorization: `Bearer ${bearerToken}`,
        });
      else if (this.#t?.confidentialClientType === "basic") {
        opts.headers = gaxios_1.Gaxios.mergeHeaders(opts.headers);
        let clientId = this.#t.clientId;
        let clientSecret = this.#t.clientSecret || "";
        let base64EncodedCreds = this.#e.encodeBase64StringUtf8(`${clientId}:${clientSecret}`);
        gaxios_1.Gaxios.mergeHeaders(opts.headers, {
          authorization: `Basic ${base64EncodedCreds}`,
        });
      }
    }
    injectAuthenticatedRequestBody(opts) {
      if (this.#t?.confidentialClientType === "request-body") {
        let method = (opts.method || "GET").toUpperCase();
        if (!METHODS_SUPPORTING_REQUEST_BODY.includes(method))
          throw Error(
            `${method} HTTP method does not support ${this.#t.confidentialClientType} client authentication`,
          );
        let contentType = new Headers(opts.headers).get("content-type");
        if (
          contentType?.startsWith("application/x-www-form-urlencoded") ||
          opts.data instanceof URLSearchParams
        ) {
          let data = new URLSearchParams(opts.data ?? "");
          data.append("client_id", this.#t.clientId);
          data.append("client_secret", this.#t.clientSecret || "");
          opts.data = data;
        } else if (contentType?.startsWith("application/json")) {
          opts.data = opts.data || {};
          Object.assign(opts.data, {
            client_id: this.#t.clientId,
            client_secret: this.#t.clientSecret || "",
          });
        } else
          throw Error(
            `${contentType} content-types are not supported with ${this.#t.confidentialClientType} client authentication`,
          );
      }
    }
    static get RETRY_CONFIG() {
      return {
        retry: true,
        retryConfig: {
          httpMethodsToRetry: ["GET", "PUT", "POST", "HEAD", "OPTIONS", "DELETE"],
        },
      };
    }
  }
  cjsExports.OAuthClientAuthHandler = OAuthClientAuthHandler;
  function getErrorFromOAuthErrorResponse(resp, err) {
    let { error, error_description: errorDescription, error_uri: errorUri } = resp;
    let message = `Error code ${error}`;
    if (typeof errorDescription !== "undefined") message += `: ${errorDescription}`;
    if (typeof errorUri !== "undefined") message += ` - ${errorUri}`;
    let newError = Error(message);
    if (err) {
      let keys = Object.keys(err);
      if (err.stack) keys.push("stack");
      keys.forEach((key) => {
        if (key !== "message")
          Object.defineProperty(newError, key, {
            value: err[key],
            writable: false,
            enumerable: true,
          });
      });
    }
    return newError;
  }
});
export { require_oauth2common };
