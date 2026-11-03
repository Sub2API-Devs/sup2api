/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso-oidc/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-ddzww9ex.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../runtime/bun-runtime.js";
import { Rx } from "../../../../../core/dist-cjs/index.js";
import { bD } from "../../../../../../@smithy/util-middleware/dist-cjs/index.js";

//@ chunk-ddzww9ex.js:783-1796 cjs-fingerprint
var b = x(function (K) {
  Object.defineProperty(K, "__esModule", { value: !0 });
  K.resolveHttpAuthSchemeConfig =
    K.defaultSSOOIDCHttpAuthSchemeProvider =
    K.defaultSSOOIDCHttpAuthSchemeParametersProvider =
      void 0;
  var z = Rx(),
    f = bD(),
    ct = async (e, t, n) => ({
      operation: f.getSmithyContext(t).operation,
      region:
        (await f.normalizeProvider(e.region)()) ||
        (() => {
          throw Error("expected `region` to be configured for `aws.auth#sigv4`");
        })(),
    });
  K.defaultSSOOIDCHttpAuthSchemeParametersProvider = ct;
  function at(e) {
    return {
      schemeId: "aws.auth#sigv4",
      signingProperties: { name: "sso-oauth", region: e.region },
      propertiesExtractor: (t, n) => ({ signingProperties: { config: t, context: n } }),
    };
  }
  function pt(e) {
    return { schemeId: "smithy.api#noAuth" };
  }
  var dt = (e) => {
    let t = [];
    switch (e.operation) {
      case "CreateToken": {
        t.push(pt(e));
        break;
      }
      default:
        t.push(at(e));
    }
    return t;
  };
  K.defaultSSOOIDCHttpAuthSchemeProvider = dt;
  var ut = (e) => {
    let awsSdkSigV4Config = z.resolveAwsSdkSigV4Config(e);
    return Object.assign(awsSdkSigV4Config, {
      authSchemePreference: f.normalizeProvider(e.authSchemePreference ?? []),
    });
  };
  K.resolveHttpAuthSchemeConfig = ut;
});

export { b };
