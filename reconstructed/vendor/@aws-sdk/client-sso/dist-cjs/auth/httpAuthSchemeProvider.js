/**
 * @aws-sdk/client-sso/dist-cjs/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-sso@3.936.0..3.940.0
 * pieces: chunk-kejz1rpb.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
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

//@ chunk-kejz1rpb.js:654-791 esm-layout
var A = Re(Ome()),
  fe = Re(Mme()),
  ge = Re(Dme()),
  w = Re(Oae()),
  ye = Re(dR()),
  d = Re(EE()),
  Se = Re(_D()),
  ve = Re(Lme()),
  xe = Re(pK()),
  P = Re(dG()),
  Ee = Re(ff());
//@ chunk-kejz1rpb.js:791-1006 esm-layout
var k = Re(Rx()),
  l = Re(bD()),
  L = async (e, t, o) => ({
    operation: l.getSmithyContext(t).operation,
    region:
      (await l.normalizeProvider(e.region)()) ||
      (() => {
        throw Error("expected `region` to be configured for `aws.auth#sigv4`");
      })(),
  });
//@ chunk-kejz1rpb.js:1006-1181 esm-fingerprint
function ke(e) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: { name: "awsssoportal", region: e.region },
    propertiesExtractor: (t, o) => ({ signingProperties: { config: t, context: o } }),
  };
}
//@ chunk-kejz1rpb.js:1181-1232 esm-fingerprint
function h(e) {
  return { schemeId: "smithy.api#noAuth" };
}
//@ chunk-kejz1rpb.js:1232-1605 esm-fingerprint
var N = (e) => {
    let t = [];
    switch (e.operation) {
      case "GetRoleCredentials": {
        t.push(h(e));
        break;
      }
      case "ListAccountRoles": {
        t.push(h(e));
        break;
      }
      case "ListAccounts": {
        t.push(h(e));
        break;
      }
      case "Logout": {
        t.push(h(e));
        break;
      }
      default:
        t.push(ke(e));
    }
    return t;
  },
  D = (e) => {
    let awsSdkSigV4Config = k.resolveAwsSdkSigV4Config(e);
    return Object.assign(awsSdkSigV4Config, {
      authSchemePreference: l.normalizeProvider(e.authSchemePreference ?? []),
    });
  };

export { N, Ee, w, P, ye, A, xe, D, Se, ve, fe, ge, d, L };
