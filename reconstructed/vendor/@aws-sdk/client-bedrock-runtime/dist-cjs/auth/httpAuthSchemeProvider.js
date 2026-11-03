/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
import { Lme } from "../../../middleware-host-header/dist-cjs/index.js";
import { pK } from "../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { dG } from "../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { ff } from "../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { Rx } from "../../../core/dist-cjs/index.js";
import { EE } from "../../../../@smithy/core/dist-cjs/index.js";
import { bD } from "../../../../@smithy/util-middleware/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:13451-13503 esm-layout
var _t = Re(Lme()),
  lt = Re(pK()),
  U = Re(dG()),
  ut = Re(ff());
//@ chunk-3cddmtk7.js:13503-13731 esm-layout
var fe = Re(Rx()),
  S = Re(EE()),
  I = Re(bD()),
  he = async (e, t, o) => ({
    operation: I.getSmithyContext(t).operation,
    region:
      (await I.normalizeProvider(e.region)()) ||
      (() => {
        throw Error("expected `region` to be configured for `aws.auth#sigv4`");
      })(),
  });
//@ chunk-3cddmtk7.js:13731-13901 esm-fingerprint
function Ft(e) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: { name: "bedrock", region: e.region },
    propertiesExtractor: (t, o) => ({ signingProperties: { config: t, context: o } }),
  };
}
//@ chunk-3cddmtk7.js:13901-14117 esm-fingerprint
function Lt(e) {
  return {
    schemeId: "smithy.api#httpBearerAuth",
    propertiesExtractor: (
      { profile: profile, filepath: filepath, configFilepath: configFilepath, ignoreCache: ignoreCache },
      s,
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
//@ chunk-3cddmtk7.js:14117-14441 esm-fingerprint
var Se = (e) => {
    let t = [];
    switch (e.operation) {
      default:
        (t.push(Ft(e)), t.push(Lt(e)));
    }
    return t;
  },
  Ae = (e) => {
    let memoizeIdentityProvider = S.memoizeIdentityProvider(
        e.token,
        S.isIdentityExpired,
        S.doesIdentityRequireRefresh,
      ),
      awsSdkSigV4Config = fe.resolveAwsSdkSigV4Config(e);
    return Object.assign(awsSdkSigV4Config, {
      authSchemePreference: I.normalizeProvider(e.authSchemePreference ?? []),
      token: memoizeIdentityProvider,
    });
  };

export { ut, U, lt, Ae, _t, he, Se };
