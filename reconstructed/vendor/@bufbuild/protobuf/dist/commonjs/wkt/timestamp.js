/**
 * @bufbuild/protobuf/dist/commonjs/wkt/timestamp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_timestamp_pb } from "./google/protobuf/timestamp_pb.js";
import { require_create } from "../../cjs/create.js";
import { require_proto_int64 } from "../proto-int64.js";

//@ chunk-fq0cr76a.js:414492-415008 cjs-fingerprint
var require_timestamp = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.timestampNow = timestampNow;
  cjsExports.timestampFromDate = timestampFromDate;
  cjsExports.timestampDate = timestampDate;
  cjsExports.timestampFromMs = timestampFromMs;
  cjsExports.timestampMs = timestampMs;
  var timestamp_pb_js_1 = require_timestamp_pb();
  var create_js_1 = require_create();
  var proto_int64_js_1 = require_proto_int64();
  function timestampNow() {
    return timestampFromDate(new Date());
  }
  function timestampFromDate(date) {
    return timestampFromMs(date.getTime());
  }
  function timestampDate(timestamp) {
    return new Date(timestampMs(timestamp));
  }
  function timestampFromMs(timestampMs) {
    let seconds = Math.floor(timestampMs / 1000);
    return create_js_1.create(timestamp_pb_js_1.TimestampSchema, {
      seconds: proto_int64_js_1.protoInt64.parse(seconds),
      nanos: (timestampMs - seconds * 1000) * 1e6,
    });
  }
  function timestampMs(timestamp) {
    return Number(timestamp.seconds) * 1000 + Math.round(timestamp.nanos / 1e6);
  }
});
export { require_timestamp };
