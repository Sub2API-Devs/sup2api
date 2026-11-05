/**
 * @opentelemetry/otlp-transformer/build/src/logs/json/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_logs_2 } from "./logs.js";

//@ chunk-vxhm2nqe.js:253672-253895 cjs-fingerprint
var require_json = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.JsonLogsSerializer = undefined;
  var logs_1 = require_logs_2();
  Object.defineProperty(cjsExports, "JsonLogsSerializer", {
    enumerable: true,
    get: function () {
      return logs_1.JsonLogsSerializer;
    },
  });
});
export { require_json };
