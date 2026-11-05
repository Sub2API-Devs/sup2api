/**
 * @opentelemetry/otlp-transformer/build/src/logs/protobuf/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_logs } from "./logs.js";

//@ chunk-vxhm2nqe.js:246353-246588 cjs-fingerprint
var require_protobuf = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProtobufLogsSerializer = undefined;
  var logs_1 = require_logs();
  Object.defineProperty(cjsExports, "ProtobufLogsSerializer", {
    enumerable: true,
    get: function () {
      return logs_1.ProtobufLogsSerializer;
    },
  });
});
export { require_protobuf };
