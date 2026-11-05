/**
 * @bufbuild/protobuf/dist/commonjs/wkt/duration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_duration_pb } from "./google/protobuf/duration_pb.js";
import { require_create } from "../../cjs/create.js";
import { require_proto_int64 } from "../proto-int64.js";

//@ chunk-qg41pqt6.js:416162-416543 cjs-fingerprint
var require_duration_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.durationFromMs = durationFromMs;
  cjsExports.durationMs = durationMs;
  var duration_pb_js_1 = require_duration_pb();
  var create_js_1 = require_create();
  var proto_int64_js_1 = require_proto_int64();
  function durationFromMs(durationMs) {
    let sign = durationMs < 0 ? -1 : 1;
    let absDurationMs = Math.abs(durationMs);
    let absSeconds = Math.floor(absDurationMs / 1000);
    let absNanos = (absDurationMs - absSeconds * 1000) * 1e6;
    return create_js_1.create(duration_pb_js_1.DurationSchema, {
      seconds: proto_int64_js_1.protoInt64.parse(absSeconds * sign),
      nanos: absNanos === 0 ? 0 : absNanos * sign,
    });
  }
  function durationMs(duration) {
    return Number(duration.seconds) * 1000 + Math.round(duration.nanos / 1e6);
  }
});
export { require_duration_2 };
