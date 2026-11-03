/**
 * @aws-sdk/client-bedrock/dist-cjs/runtimeConfig.shared.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-0dmzgg46.js (1)
 * attribution: esm-fingerprint 1
 */
import { g, ie, ce, le, _e, ue, P } from "./index.js";
import { ae } from "./endpoint/endpointResolver.js";
import { w } from "./auth/httpAuthSchemeProvider.js";

//@ chunk-0dmzgg46.js:8001-8876 esm-fingerprint
var de = (e) => ({
  apiVersion: "2023-04-20",
  base64Decoder: e?.base64Decoder ?? g.fromBase64,
  base64Encoder: e?.base64Encoder ?? g.toBase64,
  disableHostPrefix: e?.disableHostPrefix ?? !1,
  endpointProvider: e?.endpointProvider ?? ae,
  extensions: e?.extensions ?? [],
  httpAuthSchemeProvider: e?.httpAuthSchemeProvider ?? w,
  httpAuthSchemes: e?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (o) => o.getIdentityProvider("aws.auth#sigv4"),
      signer: new ie.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#httpBearerAuth",
      identityProvider: (o) => o.getIdentityProvider("smithy.api#httpBearerAuth"),
      signer: new ce.HttpBearerAuthSigner(),
    },
  ],
  logger: e?.logger ?? new le.NoOpLogger(),
  protocol: e?.protocol ?? new _e.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.bedrock" }),
  serviceId: e?.serviceId ?? "Bedrock",
  urlParser: e?.urlParser ?? ue.parseUrl,
  utf8Decoder: e?.utf8Decoder ?? P.fromUtf8,
  utf8Encoder: e?.utf8Encoder ?? P.toUtf8,
});

export { de };
