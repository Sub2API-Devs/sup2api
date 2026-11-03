/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/runtimeConfig.shared.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-y366fgzk.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Rx } from "../../../../core/dist-cjs/index.js";
import { Fme } from "../../../../core/dist-cjs/submodules/protocols/index.js";
import { EE } from "../../../../../@smithy/core/dist-cjs/index.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { P4 } from "../../../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../../../credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../../../../@smithy/util-utf8/dist-cjs/index.js";
import { U } from "./auth/httpAuthSchemeProvider.js";
import { _e } from "./endpoint/endpointResolver.js";

//@ chunk-y366fgzk.js:4773-5894 cjs-fingerprint
var Re = x(function (ye) {
  Object.defineProperty(ye, "__esModule", { value: !0 });
  ye.getRuntimeConfig = void 0;
  var me = Rx(),
    Ee = Fme(),
    Se = EE(),
    fe = ff(),
    ve = P4(),
    O = base64Module(),
    T = IR(),
    Pe = U(),
    Ae = _e(),
    Pt = (e) => ({
      apiVersion: "2023-01-01",
      base64Decoder: e?.base64Decoder ?? O.fromBase64,
      base64Encoder: e?.base64Encoder ?? O.toBase64,
      disableHostPrefix: e?.disableHostPrefix ?? !1,
      endpointProvider: e?.endpointProvider ?? Ae.defaultEndpointResolver,
      extensions: e?.extensions ?? [],
      httpAuthSchemeProvider: e?.httpAuthSchemeProvider ?? Pe.defaultSigninHttpAuthSchemeProvider,
      httpAuthSchemes: e?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (t) => t.getIdentityProvider("aws.auth#sigv4"),
          signer: new me.AwsSdkSigV4Signer(),
        },
        {
          schemeId: "smithy.api#noAuth",
          identityProvider: (t) => t.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
          signer: new Se.NoAuthSigner(),
        },
      ],
      logger: e?.logger ?? new fe.NoOpLogger(),
      protocol: e?.protocol ?? new Ee.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.signin" }),
      serviceId: e?.serviceId ?? "Signin",
      urlParser: e?.urlParser ?? ve.parseUrl,
      utf8Decoder: e?.utf8Decoder ?? T.fromUtf8,
      utf8Encoder: e?.utf8Encoder ?? T.toUtf8,
    });
  ye.getRuntimeConfig = Pt;
});

export { Re };
