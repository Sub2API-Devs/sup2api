/**
 * google-auth-library/build/src/auth/stscredentials.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_authclient } from "./authclient.js";
import { require_oauth2common } from "./oauth2common.js";
import { require_util } from "../util.js";

//@ chunk-e8d3a8an.js:104909-106065 cjs-fingerprint
var require_stscredentials = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.StsCredentials = undefined;
  var gaxios_1 = require_gaxios_2();
  var authclient_1 = require_authclient();
  var oauth2common_1 = require_oauth2common();
  var util_1 = require_util();
  class StsCredentials extends oauth2common_1.OAuthClientAuthHandler {
    #e;
    constructor(
      options = {
        tokenExchangeEndpoint: "",
      },
      clientAuthentication,
    ) {
      if (typeof options !== "object" || options instanceof URL)
        options = {
          tokenExchangeEndpoint: options,
          clientAuthentication,
        };
      super(options);
      this.#e = options.tokenExchangeEndpoint;
    }
    async exchangeToken(stsCredentialsOptions, headers, options) {
      let values = {
        grant_type: stsCredentialsOptions.grantType,
        resource: stsCredentialsOptions.resource,
        audience: stsCredentialsOptions.audience,
        scope: stsCredentialsOptions.scope?.join(" "),
        requested_token_type: stsCredentialsOptions.requestedTokenType,
        subject_token: stsCredentialsOptions.subjectToken,
        subject_token_type: stsCredentialsOptions.subjectTokenType,
        actor_token: stsCredentialsOptions.actingParty?.actorToken,
        actor_token_type: stsCredentialsOptions.actingParty?.actorTokenType,
        options: options && JSON.stringify(options),
      };
      let opts = {
        ...StsCredentials.RETRY_CONFIG,
        url: this.#e.toString(),
        method: "POST",
        headers,
        data: new URLSearchParams(util_1.removeUndefinedValuesInObject(values)),
        responseType: "json",
      };
      authclient_1.AuthClient.setMethodName(opts, "exchangeToken");
      this.applyClientAuthenticationOptions(opts);
      try {
        let response = await this.transporter.request(opts);
        let stsSuccessfulResponse = response.data;
        stsSuccessfulResponse.res = response;
        return stsSuccessfulResponse;
      } catch (error) {
        if (error instanceof gaxios_1.GaxiosError && error.response)
          throw oauth2common_1.getErrorFromOAuthErrorResponse(error.response.data, error);
        throw error;
      }
    }
  }
  cjsExports.StsCredentials = StsCredentials;
});
export { require_stscredentials };
