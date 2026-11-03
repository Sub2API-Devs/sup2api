/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-y366fgzk.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../runtime/bun-runtime.js";
import { Rx } from "../../../../../core/dist-cjs/index.js";
import { bD } from "../../../../../../@smithy/util-middleware/dist-cjs/index.js";

//@ chunk-y366fgzk.js:783-1795 cjs-fingerprint
var U = x(function (Y) {
  Object.defineProperty(Y, "__esModule", { value: !0 });
  Y.resolveHttpAuthSchemeConfig =
    Y.defaultSigninHttpAuthSchemeProvider =
    Y.defaultSigninHttpAuthSchemeParametersProvider =
      void 0;
  var W = Rx(),
    S = bD(),
    pt = async (e, t, r) => ({
      operation: S.getSmithyContext(t).operation,
      region:
        (await S.normalizeProvider(e.region)()) ||
        (() => {
          throw Error("expected `region` to be configured for `aws.auth#sigv4`");
        })(),
    });
  Y.defaultSigninHttpAuthSchemeParametersProvider = pt;
  function lt(e) {
    return {
      schemeId: "aws.auth#sigv4",
      signingProperties: { name: "signin", region: e.region },
      propertiesExtractor: (t, r) => ({ signingProperties: { config: t, context: r } }),
    };
  }
  function ht(e) {
    return { schemeId: "smithy.api#noAuth" };
  }
  var gt = (e) => {
    let t = [];
    switch (e.operation) {
      case "CreateOAuth2Token": {
        t.push(ht(e));
        break;
      }
      default:
        t.push(lt(e));
    }
    return t;
  };
  Y.defaultSigninHttpAuthSchemeProvider = gt;
  var _t = (e) => {
    let awsSdkSigV4Config = W.resolveAwsSdkSigV4Config(e);
    return Object.assign(awsSdkSigV4Config, {
      authSchemePreference: S.normalizeProvider(e.authSchemePreference ?? []),
    });
  };
  Y.resolveHttpAuthSchemeConfig = _t;
});

export { U };
