/**
 * @aws-sdk/client-sso/dist-cjs/runtimeConfig.shared.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-sso@3.936.0..3.940.0
 * pieces: chunk-ddzww9ex.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Rx } from "../../core/dist-cjs/index.js";
import { Fme } from "../../core/dist-cjs/submodules/protocols/index.js";
import { EE } from "../../../@smithy/core/dist-cjs/index.js";
import { ff } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { P4 } from "../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../../@smithy/util-utf8/dist-cjs/index.js";
import { b } from "../../nested-clients/dist-cjs/submodules/sso-oidc/auth/httpAuthSchemeProvider.js";
import { he } from "../../nested-clients/dist-cjs/submodules/sso-oidc/endpoint/endpointResolver.js";

//@ chunk-ddzww9ex.js:4361-5486 cjs-require-graph
var ye = x(function (me) {
  Object.defineProperty(me, "__esModule", { value: !0 });
  me.getRuntimeConfig = void 0;
  var _e = Rx(),
    Ee = Fme(),
    ge = EE(),
    Se = ff(),
    ve = P4(),
    A = base64Module(),
    D = IR(),
    fe = b(),
    xe = he(),
    St = (e) => ({
      apiVersion: "2019-06-10",
      base64Decoder: e?.base64Decoder ?? A.fromBase64,
      base64Encoder: e?.base64Encoder ?? A.toBase64,
      disableHostPrefix: e?.disableHostPrefix ?? !1,
      endpointProvider: e?.endpointProvider ?? xe.defaultEndpointResolver,
      extensions: e?.extensions ?? [],
      httpAuthSchemeProvider: e?.httpAuthSchemeProvider ?? fe.defaultSSOOIDCHttpAuthSchemeProvider,
      httpAuthSchemes: e?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (t) => t.getIdentityProvider("aws.auth#sigv4"),
          signer: new _e.AwsSdkSigV4Signer(),
        },
        {
          schemeId: "smithy.api#noAuth",
          identityProvider: (t) => t.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
          signer: new ge.NoAuthSigner(),
        },
      ],
      logger: e?.logger ?? new Se.NoOpLogger(),
      protocol: e?.protocol ?? new Ee.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.ssooidc" }),
      serviceId: e?.serviceId ?? "SSO OIDC",
      urlParser: e?.urlParser ?? ve.parseUrl,
      utf8Decoder: e?.utf8Decoder ?? D.fromUtf8,
      utf8Encoder: e?.utf8Encoder ?? D.toUtf8,
    });
  me.getRuntimeConfig = St;
});

export { ye };
