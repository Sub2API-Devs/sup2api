/**
 * @aws-sdk/core/dist-cjs/submodules/client/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/core@3.936.0
 * pieces: chunk-wr5gyt6x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-wr5gyt6x.js:226-1118 cjs-fingerprint
var require_client = __commonJS(function (cjsExports) {
  var state = {
    warningEmitted: false,
  };
  var emitWarningIfUnsupportedVersion = (version) => {
    if (version && !state.warningEmitted && parseInt(version.substring(1, version.indexOf("."))) < 18) {
      state.warningEmitted = true;
      process.emitWarning(`NodeDeprecationWarning: The AWS SDK for JavaScript (v3) will
no longer support Node.js 16.x on January 6, 2025.

To continue receiving updates to AWS services, bug fixes, and security
updates please upgrade to a supported Node.js LTS version.

More information can be found at: https://a.co/74kJMmI`);
    }
  };
  function setCredentialFeature(credentials, feature, value) {
    if (!credentials.$source) credentials.$source = {};
    credentials.$source[feature] = value;
    return credentials;
  }
  function setFeature(context, feature, value) {
    if (!context.__aws_sdk_context)
      context.__aws_sdk_context = {
        features: {},
      };
    else if (!context.__aws_sdk_context.features) context.__aws_sdk_context.features = {};
    context.__aws_sdk_context.features[feature] = value;
  }
  function setTokenFeature(token, feature, value) {
    if (!token.$source) token.$source = {};
    token.$source[feature] = value;
    return token;
  }
  cjsExports.emitWarningIfUnsupportedVersion = emitWarningIfUnsupportedVersion;
  cjsExports.setCredentialFeature = setCredentialFeature;
  cjsExports.setFeature = setFeature;
  cjsExports.setTokenFeature = setTokenFeature;
  cjsExports.state = state;
});
export { require_client };
