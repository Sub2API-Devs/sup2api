/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/runtimeConfig.shared.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-fingerprint 1
 */
import { G, He, qe, je, Ve, $e, k } from "../../../_unknown/bedrockRuntimeConfig.js";
import { defaultEndpointResolver } from "./endpoint/endpointResolver.js";
import { defaultBedrockRuntimeHttpAuthSchemeProvider } from "./auth/httpAuthSchemeProvider.js";

//@ chunk-3cddmtk7.js:23411-24302 esm-fingerprint
var getRuntimeConfig = (config) => ({
  apiVersion: "2023-09-30",
  base64Decoder: config?.base64Decoder ?? G.fromBase64,
  base64Encoder: config?.base64Encoder ?? G.toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
  extensions: config?.extensions ?? [],
  httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultBedrockRuntimeHttpAuthSchemeProvider,
  httpAuthSchemes: config?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
      signer: new He.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#httpBearerAuth",
      identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#httpBearerAuth"),
      signer: new qe.HttpBearerAuthSigner(),
    },
  ],
  logger: config?.logger ?? new je.NoOpLogger(),
  protocol:
    config?.protocol ??
    new Ve.AwsRestJsonProtocol({
      defaultNamespace: "com.amazonaws.bedrockruntime",
    }),
  serviceId: config?.serviceId ?? "Bedrock Runtime",
  urlParser: config?.urlParser ?? $e.parseUrl,
  utf8Decoder: config?.utf8Decoder ?? k.fromUtf8,
  utf8Encoder: config?.utf8Encoder ?? k.toUtf8,
});
export { getRuntimeConfig };
