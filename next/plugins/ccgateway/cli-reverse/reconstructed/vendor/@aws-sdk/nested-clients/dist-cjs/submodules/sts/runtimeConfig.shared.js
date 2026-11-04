/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/runtimeConfig.shared.js
 *
 * AWS STS 共享运行时配置（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1), chunk-heg39xxp.js (2)
 * attribution: cjs-require-graph 1, placement 1, esm-fingerprint 1
 */
import { __toESM, __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../../../../core/dist-cjs/index.js";
import { require_protocols } from "../../../../core/dist-cjs/submodules/protocols/index.js";
import { require_core } from "../../../../../@smithy/core/dist-cjs/index.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_url_parser } from "../../../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../../../credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../../../../../@smithy/util-utf8/dist-cjs/index.js";
import { defaultEndpointResolver, require_endpointResolver } from "./endpoint/endpointResolver.js";
import {
  defaultSTSHttpAuthSchemeProvider,
  require_httpAuthSchemeProvider,
} from "../../../../client-sts/dist-cjs/auth/httpAuthSchemeProvider.js";
import { deferInit, beginDeferredInits } from "../../../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 5 modules closed by ./STSClient.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@aws-sdk/nested-clients/dist-cjs/submodules/sts/STSClient.js");
// This module is the first evaluated of an import cycle of 5 modules closed by ./STSClient.js (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:vendor/@aws-sdk/nested-clients/dist-cjs/submodules/sts/STSClient.js");
//@ chunk-heg39xxp.js:5304-5391 placement
var import_core_5 = __toESM(require_core_2());
var import_protocols = __toESM(require_protocols());
var import_core_6 = __toESM(require_core());
var import_client_2 = __toESM(require_client());
var import_url_parser = __toESM(require_url_parser());
var import_credential_provider_web_identity = __toESM(base64Module());
var import_util_utf8 = __toESM(require_util_utf8());
//@ chunk-heg39xxp.js:10286-11221 esm-fingerprint
var getRuntimeConfig = (config) => ({
  apiVersion: "2011-06-15",
  base64Decoder: config?.base64Decoder ?? import_credential_provider_web_identity.fromBase64,
  base64Encoder: config?.base64Encoder ?? import_credential_provider_web_identity.toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
  extensions: config?.extensions ?? [],
  httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSTSHttpAuthSchemeProvider,
  httpAuthSchemes: config?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
      signer: new import_core_5.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#noAuth",
      identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
      signer: new import_core_6.NoAuthSigner(),
    },
  ],
  logger: config?.logger ?? new import_client_2.NoOpLogger(),
  protocol:
    config?.protocol ??
    new import_protocols.AwsQueryProtocol({
      defaultNamespace: "com.amazonaws.sts",
      xmlNamespace: "https://sts.amazonaws.com/doc/2011-06-15/",
      version: "2011-06-15",
    }),
  serviceId: config?.serviceId ?? "STS",
  urlParser: config?.urlParser ?? import_url_parser.parseUrl,
  utf8Decoder: config?.utf8Decoder ?? import_util_utf8.fromUtf8,
  utf8Encoder: config?.utf8Encoder ?? import_util_utf8.toUtf8,
});
//@ chunk-a8ee6x44.js:6653-7841 cjs-require-graph
var require_runtimeConfig_shared; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a8ee6x44.js:6653", () => {
  require_runtimeConfig_shared = __commonJS(function (cjsExports) {
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
      apiVersion: "2011-06-15",
      base64Decoder: config?.base64Decoder ?? util_base64_1.fromBase64,
      base64Encoder: config?.base64Encoder ?? util_base64_1.toBase64,
      disableHostPrefix: config?.disableHostPrefix ?? false,
      endpointProvider: config?.endpointProvider ?? endpointResolver_1.defaultEndpointResolver,
      extensions: config?.extensions ?? [],
      httpAuthSchemeProvider:
        config?.httpAuthSchemeProvider ?? httpAuthSchemeProvider_1.defaultSTSHttpAuthSchemeProvider,
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
        new protocols_1.AwsQueryProtocol({
          defaultNamespace: "com.amazonaws.sts",
          xmlNamespace: "https://sts.amazonaws.com/doc/2011-06-15/",
          version: "2011-06-15",
        }),
      serviceId: config?.serviceId ?? "STS",
      urlParser: config?.urlParser ?? url_parser_1.parseUrl,
      utf8Decoder: config?.utf8Decoder ?? util_utf8_1.fromUtf8,
      utf8Encoder: config?.utf8Encoder ?? util_utf8_1.toUtf8,
    });
    cjsExports.getRuntimeConfig = getRuntimeConfig;
  });
});
export { getRuntimeConfig, require_runtimeConfig_shared };
