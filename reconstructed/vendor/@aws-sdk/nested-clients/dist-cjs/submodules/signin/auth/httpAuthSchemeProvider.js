/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-y366fgzk.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../runtime/bun-runtime.js";
import { require_core as require_core_2 } from "../../../../../core/dist-cjs/index.js";
import { require_util_middleware } from "../../../../../../@smithy/util-middleware/dist-cjs/index.js";

//@ chunk-y366fgzk.js:783-1795 cjs-fingerprint
var require_httpAuthSchemeProvider = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.resolveHttpAuthSchemeConfig =
    cjsExports.defaultSigninHttpAuthSchemeProvider =
    cjsExports.defaultSigninHttpAuthSchemeParametersProvider =
      undefined;
  var core_1 = require_core_2();
  var util_middleware_1 = require_util_middleware();
  var defaultSigninHttpAuthSchemeParametersProvider = async (config, context, input) => ({
    operation: util_middleware_1.getSmithyContext(context).operation,
    region:
      (await util_middleware_1.normalizeProvider(config.region)()) ||
      (() => {
        throw Error("expected `region` to be configured for `aws.auth#sigv4`");
      })(),
  });
  cjsExports.defaultSigninHttpAuthSchemeParametersProvider = defaultSigninHttpAuthSchemeParametersProvider;
  function createAwsAuthSigv4HttpAuthOption(authParameters) {
    return {
      schemeId: "aws.auth#sigv4",
      signingProperties: {
        name: "signin",
        region: authParameters.region,
      },
      propertiesExtractor: (config, context) => ({
        signingProperties: {
          config,
          context,
        },
      }),
    };
  }
  function createSmithyApiNoAuthHttpAuthOption(authParameters) {
    return {
      schemeId: "smithy.api#noAuth",
    };
  }
  var defaultSigninHttpAuthSchemeProvider = (authParameters) => {
    let options = [];
    switch (authParameters.operation) {
      case "CreateOAuth2Token": {
        options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
        break;
      }
      default:
        options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
    }
    return options;
  };
  cjsExports.defaultSigninHttpAuthSchemeProvider = defaultSigninHttpAuthSchemeProvider;
  var resolveHttpAuthSchemeConfig = (config) => {
    let config_0 = core_1.resolveAwsSdkSigV4Config(config);
    return Object.assign(config_0, {
      authSchemePreference: util_middleware_1.normalizeProvider(config.authSchemePreference ?? []),
    });
  };
  cjsExports.resolveHttpAuthSchemeConfig = resolveHttpAuthSchemeConfig;
});
export { require_httpAuthSchemeProvider };
