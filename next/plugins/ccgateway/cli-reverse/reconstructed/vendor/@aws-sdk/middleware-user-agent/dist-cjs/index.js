/**
 * @aws-sdk/middleware-user-agent/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/middleware-user-agent@3.936.0..3.972.18
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core as require_core_3 } from "../../../@smithy/core/dist-cjs/index.js";
import { require_util_endpoints } from "../../util-endpoints/dist-cjs/index.js";
import { require_protocol_http as require_protocol_http_3 } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_core_2 } from "../../core/dist-cjs/index.js";

//@ chunk-3p78mpxm.js:111841-115054 cjs-fingerprint
var require_middleware_user_agent = __commonJS(function (cjsExports) {
  var core = require_core_3();
  var utilEndpoints = require_util_endpoints();
  var protocolHttp = require_protocol_http_3();
  var core$1 = require_core_2();
  var DEFAULT_UA_APP_ID = undefined;
  function isValidUserAgentAppId(appId) {
    if (appId === undefined) return true;
    return typeof appId === "string" && appId.length <= 50;
  }
  function resolveUserAgentConfig(input) {
    let normalizedAppIdProvider = core.normalizeProvider(input.userAgentAppId ?? DEFAULT_UA_APP_ID);
    let { customUserAgent } = input;
    return Object.assign(input, {
      customUserAgent: typeof customUserAgent === "string" ? [[customUserAgent]] : customUserAgent,
      userAgentAppId: async () => {
        let appId = await normalizedAppIdProvider();
        if (!isValidUserAgentAppId(appId)) {
          let logger =
            input.logger?.constructor?.name === "NoOpLogger" || !input.logger ? console : input.logger;
          if (typeof appId !== "string") logger?.warn("userAgentAppId must be a string or undefined.");
          else if (appId.length > 50)
            logger?.warn("The provided userAgentAppId exceeds the maximum length of 50 characters.");
        }
        return appId;
      },
    });
  }
  var ACCOUNT_ID_ENDPOINT_REGEX = /\d{12}\.ddb/;
  async function checkFeatures(context, config, args) {
    if (args.request?.headers?.["smithy-protocol"] === "rpc-v2-cbor")
      core$1.setFeature(context, "PROTOCOL_RPC_V2_CBOR", "M");
    if (typeof config.retryStrategy === "function") {
      let retryStrategy = await config.retryStrategy();
      if (typeof retryStrategy.acquireInitialRetryToken === "function") {
        if (retryStrategy.constructor?.name?.includes("Adaptive"))
          core$1.setFeature(context, "RETRY_MODE_ADAPTIVE", "F");
        else core$1.setFeature(context, "RETRY_MODE_STANDARD", "E");
      } else core$1.setFeature(context, "RETRY_MODE_LEGACY", "D");
    }
    if (typeof config.accountIdEndpointMode === "function") {
      let endpointV2 = context.endpointV2;
      if (String(endpointV2?.url?.hostname).match(ACCOUNT_ID_ENDPOINT_REGEX))
        core$1.setFeature(context, "ACCOUNT_ID_ENDPOINT", "O");
      switch (await config.accountIdEndpointMode?.()) {
        case "disabled":
          core$1.setFeature(context, "ACCOUNT_ID_MODE_DISABLED", "Q");
          break;
        case "preferred":
          core$1.setFeature(context, "ACCOUNT_ID_MODE_PREFERRED", "P");
          break;
        case "required":
          core$1.setFeature(context, "ACCOUNT_ID_MODE_REQUIRED", "R");
          break;
      }
    }
    let identity = context.__smithy_context?.selectedHttpAuthScheme?.identity;
    if (identity?.$source) {
      let credentials = identity;
      if (credentials.accountId) core$1.setFeature(context, "RESOLVED_ACCOUNT_ID", "T");
      for (let [key, value] of Object.entries(credentials.$source ?? {}))
        core$1.setFeature(context, key, value);
    }
  }
  var USER_AGENT = "user-agent";
  var X_AMZ_USER_AGENT = "x-amz-user-agent";
  var SPACE = " ";
  var UA_NAME_SEPARATOR = "/";
  var UA_NAME_ESCAPE_REGEX = /[^!$%&'*+\-.^_`|~\w]/g;
  var UA_VALUE_ESCAPE_REGEX = /[^!$%&'*+\-.^_`|~\w#]/g;
  var UA_ESCAPE_CHAR = "-";
  var BYTE_LIMIT = 1024;
  function encodeFeatures(features) {
    let buffer = "";
    for (let key in features) {
      let val = features[key];
      if (buffer.length + val.length + 1 <= BYTE_LIMIT) {
        if (buffer.length) buffer += "," + val;
        else buffer += val;
        continue;
      }
      break;
    }
    return buffer;
  }
  var userAgentMiddleware = (options) => (next, context) => async (args) => {
    let { request } = args;
    if (!protocolHttp.HttpRequest.isInstance(request)) return next(args);
    let { headers } = request;
    let userAgent = context?.userAgent?.map(escapeUserAgent) || [];
    let defaultUserAgent = (await options.defaultUserAgentProvider()).map(escapeUserAgent);
    await checkFeatures(context, options, args);
    let awsContext = context;
    defaultUserAgent.push(
      `m/${encodeFeatures(Object.assign({}, context.__smithy_context?.features, awsContext.__aws_sdk_context?.features))}`,
    );
    let customUserAgent = options?.customUserAgent?.map(escapeUserAgent) || [];
    let appId = await options.userAgentAppId();
    if (appId) defaultUserAgent.push(escapeUserAgent(["app", `${appId}`]));
    let prefix = utilEndpoints.getUserAgentPrefix();
    let sdkUserAgentValue = (prefix ? [prefix] : [])
      .concat([...defaultUserAgent, ...userAgent, ...customUserAgent])
      .join(SPACE);
    let normalUAValue = [
      ...defaultUserAgent.filter((section) => section.startsWith("aws-sdk-")),
      ...customUserAgent,
    ].join(SPACE);
    if (options.runtime !== "browser") {
      if (normalUAValue)
        headers[X_AMZ_USER_AGENT] = headers[X_AMZ_USER_AGENT]
          ? `${headers[USER_AGENT]} ${normalUAValue}`
          : normalUAValue;
      headers[USER_AGENT] = sdkUserAgentValue;
    } else headers[X_AMZ_USER_AGENT] = sdkUserAgentValue;
    return next({
      ...args,
      request,
    });
  };
  var escapeUserAgent = (userAgentPair) => {
    let name = userAgentPair[0]
      .split(UA_NAME_SEPARATOR)
      .map((part) => part.replace(UA_NAME_ESCAPE_REGEX, UA_ESCAPE_CHAR))
      .join(UA_NAME_SEPARATOR);
    let version = userAgentPair[1]?.replace(UA_VALUE_ESCAPE_REGEX, UA_ESCAPE_CHAR);
    let prefixSeparatorIndex = name.indexOf(UA_NAME_SEPARATOR);
    let prefix = name.substring(0, prefixSeparatorIndex);
    let uaName = name.substring(prefixSeparatorIndex + 1);
    if (prefix === "api") uaName = uaName.toLowerCase();
    return [prefix, uaName, version]
      .filter((item) => item && item.length > 0)
      .reduce((acc, item, index) => {
        switch (index) {
          case 0:
            return item;
          case 1:
            return `${acc}/${item}`;
          default:
            return `${acc}#${item}`;
        }
      }, "");
  };
  var getUserAgentMiddlewareOptions = {
    name: "getUserAgentMiddleware",
    step: "build",
    priority: "low",
    tags: ["SET_USER_AGENT", "USER_AGENT"],
    override: true,
  };
  var getUserAgentPlugin = (config) => ({
    applyToStack: (clientStack) => {
      clientStack.add(userAgentMiddleware(config), getUserAgentMiddlewareOptions);
    },
  });
  cjsExports.DEFAULT_UA_APP_ID = DEFAULT_UA_APP_ID;
  cjsExports.getUserAgentMiddlewareOptions = getUserAgentMiddlewareOptions;
  cjsExports.getUserAgentPlugin = getUserAgentPlugin;
  cjsExports.resolveUserAgentConfig = resolveUserAgentConfig;
  cjsExports.userAgentMiddleware = userAgentMiddleware;
});
export { require_middleware_user_agent };
