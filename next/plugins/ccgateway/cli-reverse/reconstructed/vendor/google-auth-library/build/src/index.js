/**
 * google-auth-library/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_googleauth } from "./auth/googleauth.js";
import { require_gcp_metadata } from "../../../gcp-metadata/build/src/index.js";
import { require_gaxios_2 } from "../../../gaxios/build/cjs/src/index.js";
import { require_authclient } from "./auth/authclient.js";
import { require_computeclient } from "./auth/computeclient.js";
import { require_envDetect } from "./auth/envDetect.js";
import { require_iam } from "./auth/iam.js";
import { require_idtokenclient } from "./auth/idtokenclient.js";
import { require_jwtaccess } from "./auth/jwtaccess.js";
import { require_jwtclient } from "./auth/jwtclient.js";
import { require_impersonated } from "./auth/impersonated.js";
import { require_oauth2client } from "./auth/oauth2client.js";
import { require_loginticket } from "./auth/loginticket.js";
import { require_refreshclient } from "./auth/refreshclient.js";
import { require_awsclient } from "./auth/awsclient.js";
import { require_awsrequestsigner } from "./auth/awsrequestsigner.js";
import { require_identitypoolclient } from "./auth/identitypoolclient.js";
import { require_externalclient } from "./auth/externalclient.js";
import { require_baseexternalclient } from "./auth/baseexternalclient.js";
import { require_downscopedclient } from "./auth/downscopedclient.js";
import { require_pluggable_auth_client } from "./auth/pluggable-auth-client.js";
import { require_externalAccountAuthorizedUserClient } from "./auth/externalAccountAuthorizedUserClient.js";
import { require_passthrough } from "./auth/passthrough.js";
import { require_googleToken } from "./gtoken/googleToken.js";

//@ chunk-e8d3a8an.js:155530-159525 cjs-fingerprint
var require_google_auth_library = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, target) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(target, p))
          __createBinding(target, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.GoogleAuth =
    cjsExports.auth =
    cjsExports.PassThroughClient =
    cjsExports.ExternalAccountAuthorizedUserClient =
    cjsExports.EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE =
    cjsExports.ExecutableError =
    cjsExports.PluggableAuthClient =
    cjsExports.DownscopedClient =
    cjsExports.BaseExternalAccountClient =
    cjsExports.ExternalAccountClient =
    cjsExports.IdentityPoolClient =
    cjsExports.AwsRequestSigner =
    cjsExports.AwsClient =
    cjsExports.UserRefreshClient =
    cjsExports.LoginTicket =
    cjsExports.ClientAuthentication =
    cjsExports.OAuth2Client =
    cjsExports.CodeChallengeMethod =
    cjsExports.Impersonated =
    cjsExports.JWT =
    cjsExports.JWTAccess =
    cjsExports.IdTokenClient =
    cjsExports.IAMAuth =
    cjsExports.GCPEnv =
    cjsExports.Compute =
    cjsExports.DEFAULT_UNIVERSE =
    cjsExports.AuthClient =
    cjsExports.gaxios =
    cjsExports.gcpMetadata =
      undefined;
  var googleauth_1 = require_googleauth();
  Object.defineProperty(cjsExports, "GoogleAuth", {
    enumerable: true,
    get: function () {
      return googleauth_1.GoogleAuth;
    },
  });
  cjsExports.gcpMetadata = require_gcp_metadata();
  cjsExports.gaxios = require_gaxios_2();
  var authclient_1 = require_authclient();
  Object.defineProperty(cjsExports, "AuthClient", {
    enumerable: true,
    get: function () {
      return authclient_1.AuthClient;
    },
  });
  Object.defineProperty(cjsExports, "DEFAULT_UNIVERSE", {
    enumerable: true,
    get: function () {
      return authclient_1.DEFAULT_UNIVERSE;
    },
  });
  var computeclient_1 = require_computeclient();
  Object.defineProperty(cjsExports, "Compute", {
    enumerable: true,
    get: function () {
      return computeclient_1.Compute;
    },
  });
  var envDetect_1 = require_envDetect();
  Object.defineProperty(cjsExports, "GCPEnv", {
    enumerable: true,
    get: function () {
      return envDetect_1.GCPEnv;
    },
  });
  var iam_1 = require_iam();
  Object.defineProperty(cjsExports, "IAMAuth", {
    enumerable: true,
    get: function () {
      return iam_1.IAMAuth;
    },
  });
  var idtokenclient_1 = require_idtokenclient();
  Object.defineProperty(cjsExports, "IdTokenClient", {
    enumerable: true,
    get: function () {
      return idtokenclient_1.IdTokenClient;
    },
  });
  var jwtaccess_1 = require_jwtaccess();
  Object.defineProperty(cjsExports, "JWTAccess", {
    enumerable: true,
    get: function () {
      return jwtaccess_1.JWTAccess;
    },
  });
  var jwtclient_1 = require_jwtclient();
  Object.defineProperty(cjsExports, "JWT", {
    enumerable: true,
    get: function () {
      return jwtclient_1.JWT;
    },
  });
  var impersonated_1 = require_impersonated();
  Object.defineProperty(cjsExports, "Impersonated", {
    enumerable: true,
    get: function () {
      return impersonated_1.Impersonated;
    },
  });
  var oauth2client_1 = require_oauth2client();
  Object.defineProperty(cjsExports, "CodeChallengeMethod", {
    enumerable: true,
    get: function () {
      return oauth2client_1.CodeChallengeMethod;
    },
  });
  Object.defineProperty(cjsExports, "OAuth2Client", {
    enumerable: true,
    get: function () {
      return oauth2client_1.OAuth2Client;
    },
  });
  Object.defineProperty(cjsExports, "ClientAuthentication", {
    enumerable: true,
    get: function () {
      return oauth2client_1.ClientAuthentication;
    },
  });
  var loginticket_1 = require_loginticket();
  Object.defineProperty(cjsExports, "LoginTicket", {
    enumerable: true,
    get: function () {
      return loginticket_1.LoginTicket;
    },
  });
  var refreshclient_1 = require_refreshclient();
  Object.defineProperty(cjsExports, "UserRefreshClient", {
    enumerable: true,
    get: function () {
      return refreshclient_1.UserRefreshClient;
    },
  });
  var awsclient_1 = require_awsclient();
  Object.defineProperty(cjsExports, "AwsClient", {
    enumerable: true,
    get: function () {
      return awsclient_1.AwsClient;
    },
  });
  var awsrequestsigner_1 = require_awsrequestsigner();
  Object.defineProperty(cjsExports, "AwsRequestSigner", {
    enumerable: true,
    get: function () {
      return awsrequestsigner_1.AwsRequestSigner;
    },
  });
  var identitypoolclient_1 = require_identitypoolclient();
  Object.defineProperty(cjsExports, "IdentityPoolClient", {
    enumerable: true,
    get: function () {
      return identitypoolclient_1.IdentityPoolClient;
    },
  });
  var externalclient_1 = require_externalclient();
  Object.defineProperty(cjsExports, "ExternalAccountClient", {
    enumerable: true,
    get: function () {
      return externalclient_1.ExternalAccountClient;
    },
  });
  var baseexternalclient_1 = require_baseexternalclient();
  Object.defineProperty(cjsExports, "BaseExternalAccountClient", {
    enumerable: true,
    get: function () {
      return baseexternalclient_1.BaseExternalAccountClient;
    },
  });
  var downscopedclient_1 = require_downscopedclient();
  Object.defineProperty(cjsExports, "DownscopedClient", {
    enumerable: true,
    get: function () {
      return downscopedclient_1.DownscopedClient;
    },
  });
  var pluggable_auth_client_1 = require_pluggable_auth_client();
  Object.defineProperty(cjsExports, "PluggableAuthClient", {
    enumerable: true,
    get: function () {
      return pluggable_auth_client_1.PluggableAuthClient;
    },
  });
  Object.defineProperty(cjsExports, "ExecutableError", {
    enumerable: true,
    get: function () {
      return pluggable_auth_client_1.ExecutableError;
    },
  });
  var externalAccountAuthorizedUserClient_1 = require_externalAccountAuthorizedUserClient();
  Object.defineProperty(cjsExports, "EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE", {
    enumerable: true,
    get: function () {
      return externalAccountAuthorizedUserClient_1.EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE;
    },
  });
  Object.defineProperty(cjsExports, "ExternalAccountAuthorizedUserClient", {
    enumerable: true,
    get: function () {
      return externalAccountAuthorizedUserClient_1.ExternalAccountAuthorizedUserClient;
    },
  });
  var passthrough_1 = require_passthrough();
  Object.defineProperty(cjsExports, "PassThroughClient", {
    enumerable: true,
    get: function () {
      return passthrough_1.PassThroughClient;
    },
  });
  __exportStar(require_googleToken(), cjsExports);
  var auth = new googleauth_1.GoogleAuth();
  cjsExports.auth = auth;
});
export { require_google_auth_library };
