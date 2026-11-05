/**
 * @opentelemetry/api/build/src/diag/types.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:31445-31755 cjs-fingerprint
var require_types = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DiagLogLevel = undefined;
  var DiagLogLevel;
  (function (DiagLogLevel) {
    DiagLogLevel[(DiagLogLevel.NONE = 0)] = "NONE";
    DiagLogLevel[(DiagLogLevel.ERROR = 30)] = "ERROR";
    DiagLogLevel[(DiagLogLevel.WARN = 50)] = "WARN";
    DiagLogLevel[(DiagLogLevel.INFO = 60)] = "INFO";
    DiagLogLevel[(DiagLogLevel.DEBUG = 70)] = "DEBUG";
    DiagLogLevel[(DiagLogLevel.VERBOSE = 80)] = "VERBOSE";
    DiagLogLevel[(DiagLogLevel.ALL = 9999)] = "ALL";
  })((DiagLogLevel = cjsExports.DiagLogLevel || (cjsExports.DiagLogLevel = {})));
});
export { require_types };
