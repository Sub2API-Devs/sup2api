/**
 * @aws-sdk/client-bedrock/dist-cjs/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-0dmzgg46.js (5)
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

//@ chunk-0dmzgg46.js:816-953 esm-layout
var D = Re(Ome()),
  Ee = Re(Mme()),
  ye = Re(Dme()),
  S = Re(Oae()),
  De = Re(dR()),
  m = Re(EE()),
  Se = Re(_D()),
  Ie = Re(Lme()),
  Ge = Re(pK()),
  I = Re(dG()),
  he = Re(ff());
//@ chunk-0dmzgg46.js:953-1179 esm-layout
var W = Re(Rx()),
  d = Re(EE()),
  C = Re(bD()),
  U = async (e, o, t) => ({
    operation: C.getSmithyContext(o).operation,
    region:
      (await C.normalizeProvider(e.region)()) ||
      (() => {
        throw Error("expected `region` to be configured for `aws.auth#sigv4`");
      })(),
  });
//@ chunk-0dmzgg46.js:1179-1349 esm-fingerprint
function we(e) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: { name: "bedrock", region: e.region },
    propertiesExtractor: (o, t) => ({ signingProperties: { config: o, context: t } }),
  };
}
//@ chunk-0dmzgg46.js:1349-1565 esm-fingerprint
function Oe(e) {
  return {
    schemeId: "smithy.api#httpBearerAuth",
    propertiesExtractor: (
      { profile: profile, filepath: filepath, configFilepath: configFilepath, ignoreCache: ignoreCache },
      n,
    ) => ({
      identityProperties: {
        profile: profile,
        filepath: filepath,
        configFilepath: configFilepath,
        ignoreCache: ignoreCache,
      },
    }),
  };
}
//@ chunk-0dmzgg46.js:1565-1886 esm-fingerprint
var w = (e) => {
    let o = [];
    switch (e.operation) {
      default:
        (o.push(we(e)), o.push(Oe(e)));
    }
    return o;
  },
  O = (e) => {
    let memoizeIdentityProvider = d.memoizeIdentityProvider(
        e.token,
        d.isIdentityExpired,
        d.doesIdentityRequireRefresh,
      ),
      awsSdkSigV4Config = W.resolveAwsSdkSigV4Config(e);
    return Object.assign(awsSdkSigV4Config, {
      authSchemePreference: C.normalizeProvider(e.authSchemePreference ?? []),
      token: memoizeIdentityProvider,
    });
  };

export { he, S, I, De, D, Ge, O, Se, Ie, Ee, ye, m, U, w };
