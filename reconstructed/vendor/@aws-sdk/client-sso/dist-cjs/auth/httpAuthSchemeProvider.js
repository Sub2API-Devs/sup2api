/**
 * @aws-sdk/client-sso/dist-cjs/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-sso@3.936.0..3.940.0
 * pieces: chunk-kejz1rpb.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
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
import { require_core as require_core_2 } from "../../../core/dist-cjs/index.js";
import { require_util_middleware } from "../../../../@smithy/util-middleware/dist-cjs/index.js";

//@ chunk-kejz1rpb.js:654-791 esm-layout
var import_middleware_host_header = Re(require_middleware_host_header());
var import_middleware_logger = Re(require_middleware_logger());
var import_middleware_recursion_detection = Re(require_middleware_recursion_detection());
var import_middleware_user_agent = Re(require_middleware_user_agent());
var import_index_native = Re(require_index_native());
var import_core = Re(require_core());
var import_schema = Re(require_schema());
var import_middleware_host_header_2 = Re(require_middleware_host_header_2());
var import_middleware_endpoint = Re(require_middleware_endpoint());
var import_retry = Re(require_retry());
var import_client = Re(require_client());
//@ chunk-kejz1rpb.js:791-1006 esm-layout
var import_core_2 = Re(require_core_2());
var import_util_middleware = Re(require_util_middleware());
var defaultSSOHttpAuthSchemeParametersProvider = async (config, context, input) => ({
  operation: import_util_middleware.getSmithyContext(context).operation,
  region:
    (await import_util_middleware.normalizeProvider(config.region)()) ||
    (() => {
      throw Error("expected `region` to be configured for `aws.auth#sigv4`");
    })(),
});
//@ chunk-kejz1rpb.js:1006-1181 esm-fingerprint
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "awsssoportal",
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
//@ chunk-kejz1rpb.js:1181-1232 esm-fingerprint
function createSmithyApiNoAuthHttpAuthOption(authParameters) {
  return {
    schemeId: "smithy.api#noAuth",
  };
}
//@ chunk-kejz1rpb.js:1232-1605 esm-fingerprint
var defaultSSOHttpAuthSchemeProvider = (authParameters) => {
  let options = [];
  switch (authParameters.operation) {
    case "GetRoleCredentials": {
      options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
      break;
    }
    case "ListAccountRoles": {
      options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
      break;
    }
    case "ListAccounts": {
      options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
      break;
    }
    case "Logout": {
      options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
      break;
    }
    default:
      options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
  }
  return options;
};
var resolveHttpAuthSchemeConfig = (config) => {
  let config_0 = import_core_2.resolveAwsSdkSigV4Config(config);
  return Object.assign(config_0, {
    authSchemePreference: import_util_middleware.normalizeProvider(config.authSchemePreference ?? []),
  });
};
export {
  defaultSSOHttpAuthSchemeProvider,
  import_client,
  import_middleware_user_agent,
  import_retry,
  import_index_native,
  import_middleware_host_header,
  import_middleware_endpoint,
  resolveHttpAuthSchemeConfig,
  import_schema,
  import_middleware_host_header_2,
  import_middleware_logger,
  import_middleware_recursion_detection,
  import_core,
  defaultSSOHttpAuthSchemeParametersProvider,
};
