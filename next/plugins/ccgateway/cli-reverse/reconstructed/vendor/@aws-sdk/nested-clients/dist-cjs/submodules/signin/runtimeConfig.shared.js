/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/runtimeConfig.shared.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-csa0qt1j.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../../../../core/dist-cjs/index.js";
import { require_protocols } from "../../../../core/dist-cjs/submodules/protocols/index.js";
import { require_core } from "../../../../../@smithy/core/dist-cjs/index.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_url_parser } from "../../../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../../../credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../../../../../@smithy/util-utf8/dist-cjs/index.js";
import { require_httpAuthSchemeProvider } from "./auth/httpAuthSchemeProvider.js";
import { require_endpointResolver } from "./endpoint/endpointResolver.js";

//@ chunk-csa0qt1j.js:4773-5894 cjs-fingerprint
var require_runtimeConfig_shared = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getRuntimeConfig = undefined;
  var core_1 = require_core_2();
  var protocols_1 = require_protocols();
  var core_2 = require_core();
  var smithy_client_1 = require_client();
  var url_parser_1 = require_url_parser();
  var util_base64_1 = base64Module();
  var util_utf8_1 = require_util_utf8();
  var httpAuthSchemeProvider_1 = require_httpAuthSchemeProvider();
  var endpointResolver_1 = require_endpointResolver();
  var getRuntimeConfig = (config) => ({
    apiVersion: "2023-01-01",
    base64Decoder: config?.base64Decoder ?? util_base64_1.fromBase64,
    base64Encoder: config?.base64Encoder ?? util_base64_1.toBase64,
    disableHostPrefix: config?.disableHostPrefix ?? false,
    endpointProvider: config?.endpointProvider ?? endpointResolver_1.defaultEndpointResolver,
    extensions: config?.extensions ?? [],
    httpAuthSchemeProvider:
      config?.httpAuthSchemeProvider ?? httpAuthSchemeProvider_1.defaultSigninHttpAuthSchemeProvider,
    httpAuthSchemes: config?.httpAuthSchemes ?? [
      {
        schemeId: "aws.auth#sigv4",
        identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
        signer: new core_1.AwsSdkSigV4Signer(),
      },
      {
        schemeId: "smithy.api#noAuth",
        identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
        signer: new core_2.NoAuthSigner(),
      },
    ],
    logger: config?.logger ?? new smithy_client_1.NoOpLogger(),
    protocol:
      config?.protocol ??
      new protocols_1.AwsRestJsonProtocol({
        defaultNamespace: "com.amazonaws.signin",
      }),
    serviceId: config?.serviceId ?? "Signin",
    urlParser: config?.urlParser ?? url_parser_1.parseUrl,
    utf8Decoder: config?.utf8Decoder ?? util_utf8_1.fromUtf8,
    utf8Encoder: config?.utf8Encoder ?? util_utf8_1.toUtf8,
  });
  cjsExports.getRuntimeConfig = getRuntimeConfig;
});
export { require_runtimeConfig_shared };
