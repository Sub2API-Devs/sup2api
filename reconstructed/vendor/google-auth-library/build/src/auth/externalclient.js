/**
 * google-auth-library/build/src/auth/externalclient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_baseexternalclient } from "./baseexternalclient.js";
import { require_identitypoolclient } from "./identitypoolclient.js";
import { require_awsclient } from "./awsclient.js";
import { require_pluggable_auth_client } from "./pluggable-auth-client.js";

//@ chunk-na3pph4p.js:135197-135921 cjs-fingerprint
var require_externalclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ExternalAccountClient = undefined;
  var baseexternalclient_1 = require_baseexternalclient();
  var identitypoolclient_1 = require_identitypoolclient();
  var awsclient_1 = require_awsclient();
  var pluggable_auth_client_1 = require_pluggable_auth_client();
  class ExternalAccountClient {
    constructor() {
      throw Error(
        "ExternalAccountClients should be initialized via: ExternalAccountClient.fromJSON(), directly via explicit constructors, eg. new AwsClient(options), new IdentityPoolClient(options), newPluggableAuthClientOptions, or via new GoogleAuth(options).getClient()",
      );
    }
    static fromJSON(options) {
      if (options && options.type === baseexternalclient_1.EXTERNAL_ACCOUNT_TYPE) {
        if (options.credential_source?.environment_id) return new awsclient_1.AwsClient(options);
        else if (options.credential_source?.executable)
          return new pluggable_auth_client_1.PluggableAuthClient(options);
        else return new identitypoolclient_1.IdentityPoolClient(options);
      } else return null;
    }
  }
  cjsExports.ExternalAccountClient = ExternalAccountClient;
});
export { require_externalclient };
