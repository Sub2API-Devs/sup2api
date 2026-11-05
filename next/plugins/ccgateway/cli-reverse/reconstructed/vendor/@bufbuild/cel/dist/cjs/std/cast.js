/**
 * @bufbuild/cel/dist/cjs/std/cast.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "../../../../protobuf/dist/commonjs/index.js";
import { require_error_4 } from "../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_math } from "./math.js";
import { require_type } from "../type.js";
import { require_duration } from "../duration.js";
import { require_func } from "../func.js";
import { require_eval } from "../eval.js";

//@ chunk-qg41pqt6.js:488336-490790 cjs-fingerprint
var require_cast = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var protobuf_1 = require_protobuf();
  var wkt_1 = require_error_4();
  var math_js_1 = require_math();
  var type_js_1 = require_type();
  var duration_js_1 = require_duration();
  var func_js_1 = require_func();
  var eval_js_1 = require_eval();
  var encoder = new TextEncoder();
  var decoder = new TextDecoder(undefined, {
    fatal: true,
  });
  function stringToBool(x) {
    switch (x) {
      case "true":
      case "True":
      case "TRUE":
      case "t":
      case "1":
        return true;
      case "false":
      case "False":
      case "FALSE":
      case "f":
      case "0":
        return false;
    }
    throw Error(`Unable to convert string '${x}' to bool`);
  }
  function bytesToString(x) {
    try {
      return decoder.decode(x);
    } catch (e) {
      throw Error(`Failed to decode bytes as string: ${e}`);
    }
  }
  function stringToTimestamp(x) {
    try {
      return protobuf_1.fromJson(wkt_1.TimestampSchema, x);
    } catch (e) {
      throw Error(`Failed to parse timestamp: ${e}`);
    }
  }
  function toType(x) {
    if (protobuf_1.isMessage(x)) return type_js_1.objectType(eval_js_1.getMsgDesc(x.$typeName));
    return type_js_1.celType(x);
  }
  function identity(x) {
    return x;
  }
  var { BOOL, BYTES, DOUBLE, DYN, INT, STRING, TYPE, UINT } = type_js_1.CelScalar;
  cjsExports.default = [
    func_js_1.celFunc("int", [INT], INT, identity),
    func_js_1.celFunc("int", [UINT], INT, (x) => math_js_1.safeInt(x.value)),
    func_js_1.celFunc("int", [DOUBLE], INT, math_js_1.safeInt),
    func_js_1.celFunc("int", [STRING], INT, math_js_1.safeInt),
    func_js_1.celFunc("int", [type_js_1.TIMESTAMP], INT, (x) => math_js_1.safeInt(x.message.seconds)),
    func_js_1.celFunc("int", [type_js_1.DURATION], INT, (x) => math_js_1.safeInt(x.message.seconds)),
    func_js_1.celFunc("uint", [UINT], UINT, identity),
    func_js_1.celFunc("uint", [INT], UINT, math_js_1.safeUint),
    func_js_1.celFunc("uint", [DOUBLE], UINT, math_js_1.safeUint),
    func_js_1.celFunc("uint", [STRING], UINT, math_js_1.safeUint),
    func_js_1.celFunc("double", [DOUBLE], DOUBLE, identity),
    func_js_1.celFunc("double", [INT], DOUBLE, (x) => Number(x)),
    func_js_1.celFunc("double", [UINT], DOUBLE, (x) => Number(x.value)),
    func_js_1.celFunc("double", [STRING], DOUBLE, (x) => Number(x)),
    func_js_1.celFunc("bool", [BOOL], BOOL, identity),
    func_js_1.celFunc("bool", [STRING], BOOL, stringToBool),
    func_js_1.celFunc("bytes", [BYTES], BYTES, identity),
    func_js_1.celFunc("bytes", [STRING], BYTES, (x) => encoder.encode(x)),
    func_js_1.celFunc("string", [STRING], STRING, identity),
    func_js_1.celFunc("string", [BOOL], STRING, (x) => x.toString()),
    func_js_1.celFunc("string", [INT], STRING, (x) => x.toString()),
    func_js_1.celFunc("string", [UINT], STRING, (x) => x.value.toString()),
    func_js_1.celFunc("string", [DOUBLE], STRING, (x) => x.toString()),
    func_js_1.celFunc("string", [BYTES], STRING, bytesToString),
    func_js_1.celFunc("string", [type_js_1.TIMESTAMP], STRING, (x) =>
      protobuf_1.toJson(wkt_1.TimestampSchema, x.message),
    ),
    func_js_1.celFunc("string", [type_js_1.DURATION], STRING, (x) =>
      protobuf_1.toJson(wkt_1.DurationSchema, x.message),
    ),
    func_js_1.celFunc("timestamp", [type_js_1.TIMESTAMP], type_js_1.TIMESTAMP, identity),
    func_js_1.celFunc("timestamp", [STRING], type_js_1.TIMESTAMP, stringToTimestamp),
    func_js_1.celFunc("timestamp", [INT], type_js_1.TIMESTAMP, (x) => wkt_1.timestampFromMs(Number(x))),
    func_js_1.celFunc("duration", [type_js_1.DURATION], type_js_1.DURATION, identity),
    func_js_1.celFunc("duration", [STRING], type_js_1.DURATION, duration_js_1.parseDuration),
    func_js_1.celFunc("duration", [INT], type_js_1.DURATION, (x) =>
      protobuf_1.create(wkt_1.DurationSchema, {
        seconds: x,
      }),
    ),
    func_js_1.celFunc("type", [DYN], TYPE, toType),
    func_js_1.celFunc("dyn", [DYN], DYN, identity),
  ];
});
export { require_cast };
