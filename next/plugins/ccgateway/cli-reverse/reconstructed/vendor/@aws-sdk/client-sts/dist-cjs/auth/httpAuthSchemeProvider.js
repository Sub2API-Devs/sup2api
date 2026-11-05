/**
 * @aws-sdk/client-sts/dist-cjs/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-sts@3.936.0..3.939.0
 * pieces: chunk-539esr4f.js (6), chunk-brqnbz3r.js (1)
 * attribution: esm-layout 2, esm-fingerprint 4, cjs-require-graph 1
 */
import { __toESM, __commonJS } from "../../../../../runtime/bun-runtime.js";
import {
  require_middleware_host_header,
  require_middleware_host_header_2,
} from "../../../middleware-host-header/dist-cjs/index.js";
import { require_middleware_logger } from "../../../middleware-logger/dist-cjs/index.js";
import { require_middleware_recursion_detection } from "../../../middleware-recursion-detection/dist-cjs/index.js";
import { require_middleware_user_agent } from "../../../middleware-user-agent/dist-cjs/index.js";
import { require_index_native } from "../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { require_core } from "../../../../@smithy/core/dist-cjs/index.js";
import { require_schema } from "../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { require_middleware_endpoint } from "../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { require_retry } from "../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { require_client } from "../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_core_2 } from "../../../core/dist-cjs/index.js";
import { require_util_middleware } from "../../../../@smithy/util-middleware/dist-cjs/index.js";
import { CognitoIdentityClient } from "../../../nested-clients/dist-cjs/submodules/cognito-identity/index.js";
import { require_STSClient } from "../../../nested-clients/dist-cjs/submodules/sts/STSClient.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-539esr4f.js:747-884 esm-layout
var import_middleware_host_header = __toESM(require_middleware_host_header());
var import_middleware_logger = __toESM(require_middleware_logger());
var import_middleware_recursion_detection = __toESM(require_middleware_recursion_detection());
var import_middleware_user_agent = __toESM(require_middleware_user_agent());
var import_index_native = __toESM(require_index_native());
var import_core = __toESM(require_core());
var import_schema = __toESM(require_schema());
var import_middleware_host_header_2 = __toESM(require_middleware_host_header_2());
var import_middleware_endpoint = __toESM(require_middleware_endpoint());
var import_retry_2 = __toESM(require_retry());
var import_client = __toESM(require_client());
//@ chunk-539esr4f.js:884-910 esm-layout
var import_core_2 = __toESM(require_core_2());
var import_util_middleware = __toESM(require_util_middleware());
//@ chunk-539esr4f.js:910-1103 esm-fingerprint
var defaultSTSHttpAuthSchemeParametersProvider = async (config, context, input) => ({
  operation: import_util_middleware.getSmithyContext(context).operation,
  region:
    (await import_util_middleware.normalizeProvider(config.region)()) ||
    (() => {
      throw Error("expected `region` to be configured for `aws.auth#sigv4`");
    })(),
});
//@ chunk-539esr4f.js:1103-1269 esm-fingerprint
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "sts",
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
//@ chunk-539esr4f.js:1269-1320 esm-fingerprint
function createSmithyApiNoAuthHttpAuthOption(authParameters) {
  return {
    schemeId: "smithy.api#noAuth",
  };
}
//@ chunk-539esr4f.js:1320-1681 esm-fingerprint
var defaultSTSHttpAuthSchemeProvider = (authParameters) => {
  let options = [];
  switch (authParameters.operation) {
    case "AssumeRoleWithSAML": {
      options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
      break;
    }
    case "AssumeRoleWithWebIdentity": {
      options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
      break;
    }
    default:
      options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
  }
  return options;
};
var resolveStsAuthConfig = (input) =>
  Object.assign(input, {
    stsClientCtor: CognitoIdentityClient,
  });
var resolveHttpAuthSchemeConfig = (config) => {
  let config_0 = resolveStsAuthConfig(config);
  let config_1 = import_core_2.resolveAwsSdkSigV4Config(config_0);
  return Object.assign(config_1, {
    authSchemePreference: import_util_middleware.normalizeProvider(config.authSchemePreference ?? []),
  });
};
//@ chunk-brqnbz3r.js:763-1925 cjs-require-graph
var require_httpAuthSchemeProvider; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-brqnbz3r.js:763", () => {
  require_httpAuthSchemeProvider = __commonJS(function (cjsExports) {
    Object.defineProperty(cjsExports, "__esModule", {
      value: true,
    });
    cjsExports.resolveHttpAuthSchemeConfig =
      cjsExports.resolveStsAuthConfig =
      cjsExports.defaultSTSHttpAuthSchemeProvider =
      cjsExports.defaultSTSHttpAuthSchemeParametersProvider =
        undefined;
    var core_1 = require_core_2();
    var util_middleware_1 = require_util_middleware();
    var STSClient_1 = require_STSClient();
    var defaultSTSHttpAuthSchemeParametersProvider = async (config, context, input) => ({
      operation: util_middleware_1.getSmithyContext(context).operation,
      region:
        (await util_middleware_1.normalizeProvider(config.region)()) ||
        (() => {
          throw Error("expected `region` to be configured for `aws.auth#sigv4`");
        })(),
    });
    cjsExports.defaultSTSHttpAuthSchemeParametersProvider = defaultSTSHttpAuthSchemeParametersProvider;
    function createAwsAuthSigv4HttpAuthOption(authParameters) {
      return {
        schemeId: "aws.auth#sigv4",
        signingProperties: {
          name: "sts",
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
    var defaultSTSHttpAuthSchemeProvider = (authParameters) => {
      let options = [];
      switch (authParameters.operation) {
        case "AssumeRoleWithWebIdentity": {
          options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
          break;
        }
        default:
          options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
      }
      return options;
    };
    cjsExports.defaultSTSHttpAuthSchemeProvider = defaultSTSHttpAuthSchemeProvider;
    var resolveStsAuthConfig = (input) =>
      Object.assign(input, {
        stsClientCtor: STSClient_1.STSClient,
      });
    cjsExports.resolveStsAuthConfig = resolveStsAuthConfig;
    var resolveHttpAuthSchemeConfig = (config) => {
      let config_0 = cjsExports.resolveStsAuthConfig(config);
      let config_1 = core_1.resolveAwsSdkSigV4Config(config_0);
      return Object.assign(config_1, {
        authSchemePreference: util_middleware_1.normalizeProvider(config.authSchemePreference ?? []),
      });
    };
    cjsExports.resolveHttpAuthSchemeConfig = resolveHttpAuthSchemeConfig;
  });
});
export {
  defaultSTSHttpAuthSchemeProvider,
  require_httpAuthSchemeProvider,
  import_client,
  import_middleware_user_agent,
  import_retry_2,
  import_index_native,
  import_middleware_host_header,
  import_middleware_endpoint,
  resolveHttpAuthSchemeConfig,
  import_schema,
  import_middleware_host_header_2,
  import_middleware_logger,
  import_middleware_recursion_detection,
  import_core,
  defaultSTSHttpAuthSchemeParametersProvider,
};
