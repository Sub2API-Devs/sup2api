/**
 * @opentelemetry/otlp-transformer/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "./logs/protobuf/index.js";
import { require_protobuf_2 } from "./metrics/protobuf/index.js";
import { require_protobuf_3 } from "./trace/protobuf/index.js";
import { require_json } from "./logs/json/index.js";
import { require_json_2 } from "./metrics/json/index.js";
import { require_json_3 } from "./trace/json/index.js";

//@ chunk-vxhm2nqe.js:255123-256116 cjs-fingerprint
var require_otlp_transformer = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.JsonTraceSerializer =
    cjsExports.JsonMetricsSerializer =
    cjsExports.JsonLogsSerializer =
    cjsExports.ProtobufTraceSerializer =
    cjsExports.ProtobufMetricsSerializer =
    cjsExports.ProtobufLogsSerializer =
      undefined;
  var protobuf_1 = require_protobuf();
  Object.defineProperty(cjsExports, "ProtobufLogsSerializer", {
    enumerable: true,
    get: function () {
      return protobuf_1.ProtobufLogsSerializer;
    },
  });
  var protobuf_2 = require_protobuf_2();
  Object.defineProperty(cjsExports, "ProtobufMetricsSerializer", {
    enumerable: true,
    get: function () {
      return protobuf_2.ProtobufMetricsSerializer;
    },
  });
  var protobuf_3 = require_protobuf_3();
  Object.defineProperty(cjsExports, "ProtobufTraceSerializer", {
    enumerable: true,
    get: function () {
      return protobuf_3.ProtobufTraceSerializer;
    },
  });
  var json_1 = require_json();
  Object.defineProperty(cjsExports, "JsonLogsSerializer", {
    enumerable: true,
    get: function () {
      return json_1.JsonLogsSerializer;
    },
  });
  var json_2 = require_json_2();
  Object.defineProperty(cjsExports, "JsonMetricsSerializer", {
    enumerable: true,
    get: function () {
      return json_2.JsonMetricsSerializer;
    },
  });
  var json_3 = require_json_3();
  Object.defineProperty(cjsExports, "JsonTraceSerializer", {
    enumerable: true,
    get: function () {
      return json_3.JsonTraceSerializer;
    },
  });
});
export { require_otlp_transformer };
