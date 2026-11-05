/**
 * @opentelemetry/core/build/src/utils/configuration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";

//@ chunk-7kayq7nc.js:129013-129545 cjs-fingerprint
var require_configuration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.diagLogLevelFromString = undefined;
  var api_1 = require_api();
  var logLevelMap = {
    ALL: api_1.DiagLogLevel.ALL,
    VERBOSE: api_1.DiagLogLevel.VERBOSE,
    DEBUG: api_1.DiagLogLevel.DEBUG,
    INFO: api_1.DiagLogLevel.INFO,
    WARN: api_1.DiagLogLevel.WARN,
    ERROR: api_1.DiagLogLevel.ERROR,
    NONE: api_1.DiagLogLevel.NONE,
  };
  function diagLogLevelFromString(value) {
    if (value == null) return;
    let resolvedLogLevel = logLevelMap[value.toUpperCase()];
    if (resolvedLogLevel == null) {
      api_1.diag.warn(
        `Unknown log level "${value}", expected one of ${Object.keys(logLevelMap)}, using default`,
      );
      return api_1.DiagLogLevel.INFO;
    }
    return resolvedLogLevel;
  }
  cjsExports.diagLogLevelFromString = diagLogLevelFromString;
});
export { require_configuration };
