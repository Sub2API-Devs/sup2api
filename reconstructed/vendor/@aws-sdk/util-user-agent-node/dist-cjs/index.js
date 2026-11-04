/**
 * @aws-sdk/util-user-agent-node/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/util-user-agent-node@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_middleware_user_agent } from "../../middleware-user-agent/dist-cjs/index.js";

//@ chunk-edce4vxq.js:134734-135599 cjs-fingerprint
var require_util_user_agent_node = __commonJS(function (cjsExports) {
  var os = importMetaRequire("os");
  var processModule = importMetaRequire("process");
  var middlewareUserAgent = require_middleware_user_agent();
  var crtAvailability = {
    isCrtAvailable: false,
  };
  var isCrtAvailable = () => {
    if (crtAvailability.isCrtAvailable) return ["md/crt-avail"];
    return null;
  };
  var createDefaultUserAgentProvider =
    ({ serviceId, clientVersion }) =>
    async (config) => {
      let sections = [
        ["aws-sdk-js", clientVersion],
        ["ua", "2.1"],
        [`os/${os.platform()}`, os.release()],
        ["lang/js"],
        ["md/nodejs", `${processModule.versions.node}`],
      ];
      let crtAvailable = isCrtAvailable();
      if (crtAvailable) sections.push(crtAvailable);
      if (serviceId) sections.push([`api/${serviceId}`, clientVersion]);
      if (processModule.env.AWS_EXECUTION_ENV)
        sections.push([`exec-env/${processModule.env.AWS_EXECUTION_ENV}`]);
      let appId = await config?.userAgentAppId?.();
      return appId ? [...sections, [`app/${appId}`]] : [...sections];
    };
  var defaultUserAgent = createDefaultUserAgentProvider;
  var UA_APP_ID_ENV_NAME = "AWS_SDK_UA_APP_ID";
  var UA_APP_ID_INI_NAME = "sdk_ua_app_id";
  var UA_APP_ID_INI_NAME_DEPRECATED = "sdk-ua-app-id";
  var NODE_APP_ID_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[UA_APP_ID_ENV_NAME],
    configFileSelector: (profile) => profile[UA_APP_ID_INI_NAME] ?? profile[UA_APP_ID_INI_NAME_DEPRECATED],
    default: middlewareUserAgent.DEFAULT_UA_APP_ID,
  };
  cjsExports.NODE_APP_ID_CONFIG_OPTIONS = NODE_APP_ID_CONFIG_OPTIONS;
  cjsExports.UA_APP_ID_ENV_NAME = UA_APP_ID_ENV_NAME;
  cjsExports.UA_APP_ID_INI_NAME = UA_APP_ID_INI_NAME;
  cjsExports.createDefaultUserAgentProvider = createDefaultUserAgentProvider;
  cjsExports.crtAvailability = crtAvailability;
  cjsExports.defaultUserAgent = defaultUserAgent;
});
export { require_util_user_agent_node };
