/**
 * @bufbuild/cel/dist/cjs/std/math.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_operator_const } from "../gen/dev/cel/expr/operator_const.js";
import { require_type } from "../type.js";
import { require_list } from "../list.js";
import { require_uint } from "../uint.js";
import { require_duration } from "../duration.js";
import { require_timestamp_2 } from "../timestamp.js";
import { require_error } from "../error.js";
import { require_func } from "../func.js";

//@ chunk-fq0cr76a.js:484761-487762 cjs-fingerprint
var require_math = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.safeInt = safeInt;
  cjsExports.safeUint = safeUint;
  var opc = require_operator_const();
  var type_js_1 = require_type();
  var list_js_1 = require_list();
  var uint_js_1 = require_uint();
  var duration_js_1 = require_duration();
  var timestamp_js_1 = require_timestamp_2();
  var error_js_1 = require_error();
  var func_js_1 = require_func();
  var MAX_INT = 9223372036854775807n;
  var MIN_INT = -9223372036854775808n;
  var MAX_UINT = 18446744073709551615n;
  function safeInt(value, op = "type conversion") {
    let numeric = typeof value === "string" ? BigInt(value) : value;
    if (typeof numeric === "bigint") {
      if (numeric >= MIN_INT && numeric <= MAX_INT) return numeric;
    } else if (Number.isFinite(numeric)) {
      if (numeric > Number(MIN_INT) && numeric < Number(MAX_INT)) return BigInt(Math.trunc(numeric));
    }
    throw error_js_1.celError(`int overflow during ${op}`);
  }
  function safeUint(value, op = "type conversion") {
    let numeric = typeof value === "string" ? BigInt(value) : value;
    if (typeof numeric === "bigint" || Number.isFinite(numeric)) {
      let int = typeof numeric === "number" ? BigInt(Math.trunc(numeric)) : numeric;
      if (numeric >= 0 && int <= MAX_UINT) return uint_js_1.celUint(int);
    }
    throw error_js_1.celError(`uint overflow during ${op}`);
  }
  function bytesConcat(l, r_2) {
    let val = new Uint8Array(l.length + r_2.length);
    val.set(l);
    val.set(r_2, l.length);
    return val;
  }
  function timestampSum(l, r) {
    return timestamp_js_1.createTimestamp(
      l.message.seconds + r.message.seconds,
      l.message.nanos + r.message.nanos,
    );
  }
  function durationSum(l, r) {
    return duration_js_1.createDuration(
      l.message.seconds + r.message.seconds,
      l.message.nanos + r.message.nanos,
    );
  }
  function durationDifference(l, r) {
    return duration_js_1.createDuration(
      l.message.seconds - r.message.seconds,
      l.message.nanos - r.message.nanos,
    );
  }
  function timestampDifference(l, r) {
    return timestamp_js_1.createTimestamp(
      l.message.seconds - r.message.seconds,
      l.message.nanos - r.message.nanos,
    );
  }
  function safeDivide(type, l, value) {
    if (value === 0n) throw error_js_1.celError(`${type.name} divide by zero`);
    return safeInt(l / value, `divide by ${value}`);
  }
  function safeModulo(type, l, value) {
    if (value === 0n) throw error_js_1.celError(`${type.name} modulus by zero`);
    return l % value;
  }
  var LIST = type_js_1.listType(type_js_1.CelScalar.DYN);
  var { BYTES, DOUBLE, INT, STRING, UINT } = type_js_1.CelScalar;
  cjsExports.default = [
    func_js_1.celFunc(opc.ADD, [INT, INT], INT, (l, r) => safeInt(l + r, opc.ADD)),
    func_js_1.celFunc(opc.ADD, [UINT, UINT], UINT, (l, r) => safeUint(l.value + r.value, opc.ADD)),
    func_js_1.celFunc(opc.ADD, [DOUBLE, DOUBLE], DOUBLE, (l, r) => l + r),
    func_js_1.celFunc(opc.ADD, [type_js_1.DURATION, type_js_1.DURATION], type_js_1.DURATION, durationSum),
    func_js_1.celFunc(opc.ADD, [type_js_1.TIMESTAMP, type_js_1.DURATION], type_js_1.TIMESTAMP, timestampSum),
    func_js_1.celFunc(opc.ADD, [type_js_1.DURATION, type_js_1.TIMESTAMP], type_js_1.TIMESTAMP, timestampSum),
    func_js_1.celFunc(opc.ADD, [STRING, STRING], STRING, (l, r) => l + r),
    func_js_1.celFunc(opc.ADD, [BYTES, BYTES], BYTES, bytesConcat),
    func_js_1.celFunc(opc.ADD, [LIST, LIST], LIST, list_js_1.celListConcat),
    func_js_1.celFunc(opc.SUBTRACT, [INT, INT], INT, (l, r) => safeInt(l - r, opc.SUBTRACT)),
    func_js_1.celFunc(opc.SUBTRACT, [UINT, UINT], UINT, (l, r) => safeUint(l.value - r.value, opc.SUBTRACT)),
    func_js_1.celFunc(opc.SUBTRACT, [DOUBLE, DOUBLE], DOUBLE, (l, r) => l - r),
    func_js_1.celFunc(
      opc.SUBTRACT,
      [type_js_1.TIMESTAMP, type_js_1.TIMESTAMP],
      type_js_1.DURATION,
      durationDifference,
    ),
    func_js_1.celFunc(
      opc.SUBTRACT,
      [type_js_1.DURATION, type_js_1.DURATION],
      type_js_1.DURATION,
      durationDifference,
    ),
    func_js_1.celFunc(
      opc.SUBTRACT,
      [type_js_1.TIMESTAMP, type_js_1.DURATION],
      type_js_1.TIMESTAMP,
      timestampDifference,
    ),
    func_js_1.celFunc(opc.MULTIPLY, [INT, INT], INT, (l, r) => safeInt(l * r, opc.MULTIPLY)),
    func_js_1.celFunc(opc.MULTIPLY, [UINT, UINT], UINT, (l, r) => safeUint(l.value * r.value, opc.MULTIPLY)),
    func_js_1.celFunc(opc.MULTIPLY, [DOUBLE, DOUBLE], DOUBLE, (l, r) => l * r),
    func_js_1.celFunc(opc.DIVIDE, [INT, INT], INT, (l, r) => safeDivide(INT, l, r)),
    func_js_1.celFunc(opc.DIVIDE, [UINT, UINT], UINT, (l, r) =>
      uint_js_1.celUint(safeDivide(UINT, l.value, r.value)),
    ),
    func_js_1.celFunc(opc.DIVIDE, [DOUBLE, DOUBLE], DOUBLE, (l, r) => l / r),
    func_js_1.celFunc(opc.MODULO, [INT, INT], INT, (l, r) => safeModulo(INT, l, r)),
    func_js_1.celFunc(opc.MODULO, [UINT, UINT], UINT, (l, r) =>
      uint_js_1.celUint(safeModulo(UINT, l.value, r.value)),
    ),
    func_js_1.celFunc(opc.NEGATE, [INT], INT, (x) => safeInt(-x)),
    func_js_1.celFunc(opc.NEGATE, [DOUBLE], DOUBLE, (x) => -x),
  ];
});
export { require_math };
