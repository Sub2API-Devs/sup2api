/**
 * @aws-sdk/client-sts/dist-cjs/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-sts@3.936.0..3.939.0
 * pieces: chunk-a8ee6x44.js (1), chunk-heg39xxp.js (6)
 * attribution: cjs-require-graph 1, esm-layout 2, esm-fingerprint 4
 */
import { Re, x as x_2 } from "../../../../../runtime/bun-runtime.js";
import { Ome, Lme } from "../../../middleware-host-header/dist-cjs/index.js";
import { Mme } from "../../../middleware-logger/dist-cjs/index.js";
import { Dme } from "../../../middleware-recursion-detection/dist-cjs/index.js";
import { Oae } from "../../../middleware-user-agent/dist-cjs/index.js";
import { dR } from "../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { EE } from "../../../../@smithy/core/dist-cjs/index.js";
import { _D } from "../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { pK } from "../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { dG } from "../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { ff } from "../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { Rx } from "../../../core/dist-cjs/index.js";
import { bD } from "../../../../@smithy/util-middleware/dist-cjs/index.js";
import { j } from "../../../nested-clients/dist-cjs/submodules/cognito-identity/index.js";
import { le } from "../../../nested-clients/dist-cjs/submodules/sts/STSClient.js";

//@ chunk-heg39xxp.js:747-884 esm-layout
var P = Re(Ome()),
  We = Re(Mme()),
  Oe = Re(Dme()),
  v = Re(Oae()),
  Me = Re(dR()),
  h = Re(EE()),
  He = Re(_D()),
  Fe = Re(Lme()),
  Ne = Re(pK()),
  D = Re(dG()),
  Le = Re(ff());
//@ chunk-heg39xxp.js:884-910 esm-layout
var z = Re(Rx()),
  x = Re(bD());
//@ chunk-heg39xxp.js:910-1103 esm-fingerprint
var q = async (e, t, o) => ({
  operation: x.getSmithyContext(t).operation,
  region:
    (await x.normalizeProvider(e.region)()) ||
    (() => {
      throw Error("expected `region` to be configured for `aws.auth#sigv4`");
    })(),
});
//@ chunk-heg39xxp.js:1103-1269 esm-fingerprint
function Ve(e) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: { name: "sts", region: e.region },
    propertiesExtractor: (t, o) => ({ signingProperties: { config: t, context: o } }),
  };
}
//@ chunk-heg39xxp.js:1269-1320 esm-fingerprint
function K(e) {
  return { schemeId: "smithy.api#noAuth" };
}
//@ chunk-heg39xxp.js:1320-1681 esm-fingerprint
var J = (e) => {
    let t = [];
    switch (e.operation) {
      case "AssumeRoleWithSAML": {
        t.push(K(e));
        break;
      }
      case "AssumeRoleWithWebIdentity": {
        t.push(K(e));
        break;
      }
      default:
        t.push(Ve(e));
    }
    return t;
  },
  Be = (e) => Object.assign(e, { stsClientCtor: j }),
  Q = (e) => {
    let t = Be(e),
      awsSdkSigV4Config = z.resolveAwsSdkSigV4Config(t);
    return Object.assign(awsSdkSigV4Config, {
      authSchemePreference: x.normalizeProvider(e.authSchemePreference ?? []),
    });
  };
//@ chunk-a8ee6x44.js:763-1925 cjs-require-graph
var ue = x_2(function (Ce) {
  Object.defineProperty(Ce, "__esModule", { value: !0 });
  Ce.resolveHttpAuthSchemeConfig =
    Ce.resolveStsAuthConfig =
    Ce.defaultSTSHttpAuthSchemeProvider =
    Ce.defaultSTSHttpAuthSchemeParametersProvider =
      void 0;
  var ve = Rx(),
    k = bD(),
    ye = le(),
    _o = async (e, t, n) => ({
      operation: k.getSmithyContext(t).operation,
      region:
        (await k.normalizeProvider(e.region)()) ||
        (() => {
          throw Error("expected `region` to be configured for `aws.auth#sigv4`");
        })(),
    });
  Ce.defaultSTSHttpAuthSchemeParametersProvider = _o;
  function fo(e) {
    return {
      schemeId: "aws.auth#sigv4",
      signingProperties: { name: "sts", region: e.region },
      propertiesExtractor: (t, n) => ({ signingProperties: { config: t, context: n } }),
    };
  }
  function So(e) {
    return { schemeId: "smithy.api#noAuth" };
  }
  var Po = (e) => {
    let t = [];
    switch (e.operation) {
      case "AssumeRoleWithWebIdentity": {
        t.push(So(e));
        break;
      }
      default:
        t.push(fo(e));
    }
    return t;
  };
  Ce.defaultSTSHttpAuthSchemeProvider = Po;
  var Eo = (e) => Object.assign(e, { stsClientCtor: ye.STSClient });
  Ce.resolveStsAuthConfig = Eo;
  var vo = (e) => {
    let stsAuthConfig = Ce.resolveStsAuthConfig(e),
      awsSdkSigV4Config = ve.resolveAwsSdkSigV4Config(stsAuthConfig);
    return Object.assign(awsSdkSigV4Config, {
      authSchemePreference: k.normalizeProvider(e.authSchemePreference ?? []),
    });
  };
  Ce.resolveHttpAuthSchemeConfig = vo;
});

export { J, ue, Le, v, D, Me, P, Ne, Q, He, Fe, We, Oe, h, q };
