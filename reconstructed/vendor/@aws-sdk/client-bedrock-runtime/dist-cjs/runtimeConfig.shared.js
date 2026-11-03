/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/runtimeConfig.shared.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-fingerprint 1
 */
import { G, He, qe, je, Ve, $e, k } from "../../../_unknown/bedrockRuntimeConfig.js";
import { Ne } from "./endpoint/endpointResolver.js";
import { Se } from "./auth/httpAuthSchemeProvider.js";

//@ chunk-3cddmtk7.js:23411-24302 esm-fingerprint
var Xe = (e) => ({
  apiVersion: "2023-09-30",
  base64Decoder: e?.base64Decoder ?? G.fromBase64,
  base64Encoder: e?.base64Encoder ?? G.toBase64,
  disableHostPrefix: e?.disableHostPrefix ?? !1,
  endpointProvider: e?.endpointProvider ?? Ne,
  extensions: e?.extensions ?? [],
  httpAuthSchemeProvider: e?.httpAuthSchemeProvider ?? Se,
  httpAuthSchemes: e?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (t) => t.getIdentityProvider("aws.auth#sigv4"),
      signer: new He.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#httpBearerAuth",
      identityProvider: (t) => t.getIdentityProvider("smithy.api#httpBearerAuth"),
      signer: new qe.HttpBearerAuthSigner(),
    },
  ],
  logger: e?.logger ?? new je.NoOpLogger(),
  protocol: e?.protocol ?? new Ve.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.bedrockruntime" }),
  serviceId: e?.serviceId ?? "Bedrock Runtime",
  urlParser: e?.urlParser ?? $e.parseUrl,
  utf8Decoder: e?.utf8Decoder ?? k.fromUtf8,
  utf8Encoder: e?.utf8Encoder ?? k.toUtf8,
});

export { Xe };
