/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/runtimeConfig.shared.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-ayc8mk37.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  base64Module,
  import_core_2,
  import_core,
  import_client,
  import_protocols,
  import_url_parser,
  import_util_utf8,
} from "../../../_unknown/bedrockRuntimeConfig.js";
import { defaultEndpointResolver } from "./endpoint/endpointResolver.js";
import { defaultBedrockRuntimeHttpAuthSchemeProvider } from "./auth/httpAuthSchemeProvider.js";

//@ chunk-ayc8mk37.js:23411-24302 esm-fingerprint
var getRuntimeConfig = (config) => ({
  apiVersion: "2023-09-30",
  base64Decoder: config?.base64Decoder ?? base64Module.fromBase64,
  base64Encoder: config?.base64Encoder ?? base64Module.toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
  extensions: config?.extensions ?? [],
  httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultBedrockRuntimeHttpAuthSchemeProvider,
  httpAuthSchemes: config?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
      signer: new import_core_2.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#httpBearerAuth",
      identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#httpBearerAuth"),
      signer: new import_core.HttpBearerAuthSigner(),
    },
  ],
  logger: config?.logger ?? new import_client.NoOpLogger(),
  protocol:
    config?.protocol ??
    new import_protocols.AwsRestJsonProtocol({
      defaultNamespace: "com.amazonaws.bedrockruntime",
    }),
  serviceId: config?.serviceId ?? "Bedrock Runtime",
  urlParser: config?.urlParser ?? import_url_parser.parseUrl,
  utf8Decoder: config?.utf8Decoder ?? import_util_utf8.fromUtf8,
  utf8Encoder: config?.utf8Encoder ?? import_util_utf8.toUtf8,
});
export { getRuntimeConfig };
