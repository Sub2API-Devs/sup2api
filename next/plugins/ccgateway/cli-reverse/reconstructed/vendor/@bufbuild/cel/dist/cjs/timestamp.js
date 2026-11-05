/**
 * @bufbuild/cel/dist/cjs/timestamp.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-qg41pqt6.js:482529-482899 cjs-fingerprint
var require_timestamp_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createTimestamp = createTimestamp;
  var protobuf_1 = require_protobuf();
  var wkt_1 = require_error_4();
  var MAX_TIMESTAMP_SECONDS = 253402300799n;
  var MIN_TIMESTAMP_SECONDS = -62135596800n;
  var ONE_SECOND = 1000000000n;
  function createTimestamp(s_2 = 0n, ns = 0n) {
    let fullNanos = s_2 * ONE_SECOND + BigInt(ns);
    let shift = fullNanos % ONE_SECOND < 0n ? 1n : 0n;
    let seconds = fullNanos / ONE_SECOND - shift;
    let nanos = Number((fullNanos % ONE_SECOND) + shift * ONE_SECOND);
    if (seconds > MAX_TIMESTAMP_SECONDS || seconds < MIN_TIMESTAMP_SECONDS)
      throw Error("timestamp out of range");
    return protobuf_1.create(wkt_1.TimestampSchema, {
      seconds,
      nanos,
    });
  }
});
export { require_timestamp_2 };
