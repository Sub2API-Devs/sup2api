/**
 * @aws-sdk/client-bedrock/dist-cjs/runtimeConfig.shared.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-gkj73j15.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  import_credential_provider_web_identity,
  import_core_6,
  import_core_7,
  import_client_2,
  import_protocols,
  import_url_parser,
  import_util_utf8,
} from "./index.js";
import { defaultEndpointResolver } from "./endpoint/endpointResolver.js";
import { defaultBedrockHttpAuthSchemeProvider } from "./auth/httpAuthSchemeProvider.js";

//@ chunk-gkj73j15.js:8001-8876 esm-fingerprint
var getRuntimeConfig = (config) => ({
  apiVersion: "2023-04-20",
  base64Decoder: config?.base64Decoder ?? import_credential_provider_web_identity.fromBase64,
  base64Encoder: config?.base64Encoder ?? import_credential_provider_web_identity.toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
  extensions: config?.extensions ?? [],
  httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultBedrockHttpAuthSchemeProvider,
  httpAuthSchemes: config?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
      signer: new import_core_6.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#httpBearerAuth",
      identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#httpBearerAuth"),
      signer: new import_core_7.HttpBearerAuthSigner(),
    },
  ],
  logger: config?.logger ?? new import_client_2.NoOpLogger(),
  protocol:
    config?.protocol ??
    new import_protocols.AwsRestJsonProtocol({
      defaultNamespace: "com.amazonaws.bedrock",
    }),
  serviceId: config?.serviceId ?? "Bedrock",
  urlParser: config?.urlParser ?? import_url_parser.parseUrl,
  utf8Decoder: config?.utf8Decoder ?? import_util_utf8.fromUtf8,
  utf8Encoder: config?.utf8Encoder ?? import_util_utf8.toUtf8,
});
export { getRuntimeConfig };
