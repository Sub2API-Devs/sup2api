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
import { Re, x as x_2 } from "../../../../../../runtime/bun-runtime.js";
import { Rx } from "../../../../core/dist-cjs/index.js";
import { Fme } from "../../../../core/dist-cjs/submodules/protocols/index.js";
import { EE } from "../../../../../@smithy/core/dist-cjs/index.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { P4 } from "../../../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../../../credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../../../../@smithy/util-utf8/dist-cjs/index.js";
import { he, ot } from "./endpoint/endpointResolver.js";
import { J, ue } from "../../../../client-sts/dist-cjs/auth/httpAuthSchemeProvider.js";

//@ chunk-heg39xxp.js:5304-5391 placement
var Ee = Re(Rx()),
  xe = Re(Fme()),
  ge = Re(EE()),
  Ie = Re(ff()),
  Ae = Re(P4()),
  g = Re(base64Module()),
  I = Re(IR());
//@ chunk-heg39xxp.js:10286-11221 esm-fingerprint
var fe = (e) => ({
  apiVersion: "2011-06-15",
  base64Decoder: e?.base64Decoder ?? g.fromBase64,
  base64Encoder: e?.base64Encoder ?? g.toBase64,
  disableHostPrefix: e?.disableHostPrefix ?? !1,
  endpointProvider: e?.endpointProvider ?? he,
  extensions: e?.extensions ?? [],
  httpAuthSchemeProvider: e?.httpAuthSchemeProvider ?? J,
  httpAuthSchemes: e?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (t) => t.getIdentityProvider("aws.auth#sigv4"),
      signer: new Ee.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#noAuth",
      identityProvider: (t) => t.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
      signer: new ge.NoAuthSigner(),
    },
  ],
  logger: e?.logger ?? new Ie.NoOpLogger(),
  protocol:
    e?.protocol ??
    new xe.AwsQueryProtocol({
      defaultNamespace: "com.amazonaws.sts",
      xmlNamespace: "https://sts.amazonaws.com/doc/2011-06-15/",
      version: "2011-06-15",
    }),
  serviceId: e?.serviceId ?? "STS",
  urlParser: e?.urlParser ?? Ae.parseUrl,
  utf8Decoder: e?.utf8Decoder ?? I.fromUtf8,
  utf8Encoder: e?.utf8Encoder ?? I.toUtf8,
});
//@ chunk-a8ee6x44.js:6653-7841 cjs-require-graph
var pt = x_2(function (lt) {
  Object.defineProperty(lt, "__esModule", { value: !0 });
  lt.getRuntimeConfig = void 0;
  var nt = Rx(),
    rt = Fme(),
    it = EE(),
    st = ff(),
    ct = P4(),
    M = base64Module(),
    K = IR(),
    at = ue(),
    ut = ot(),
    Do = (e) => ({
      apiVersion: "2011-06-15",
      base64Decoder: e?.base64Decoder ?? M.fromBase64,
      base64Encoder: e?.base64Encoder ?? M.toBase64,
      disableHostPrefix: e?.disableHostPrefix ?? !1,
      endpointProvider: e?.endpointProvider ?? ut.defaultEndpointResolver,
      extensions: e?.extensions ?? [],
      httpAuthSchemeProvider: e?.httpAuthSchemeProvider ?? at.defaultSTSHttpAuthSchemeProvider,
      httpAuthSchemes: e?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (t) => t.getIdentityProvider("aws.auth#sigv4"),
          signer: new nt.AwsSdkSigV4Signer(),
        },
        {
          schemeId: "smithy.api#noAuth",
          identityProvider: (t) => t.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
          signer: new it.NoAuthSigner(),
        },
      ],
      logger: e?.logger ?? new st.NoOpLogger(),
      protocol:
        e?.protocol ??
        new rt.AwsQueryProtocol({
          defaultNamespace: "com.amazonaws.sts",
          xmlNamespace: "https://sts.amazonaws.com/doc/2011-06-15/",
          version: "2011-06-15",
        }),
      serviceId: e?.serviceId ?? "STS",
      urlParser: e?.urlParser ?? ct.parseUrl,
      utf8Decoder: e?.utf8Decoder ?? K.fromUtf8,
      utf8Encoder: e?.utf8Encoder ?? K.toUtf8,
    });
  lt.getRuntimeConfig = Do;
});

export { fe, pt };
