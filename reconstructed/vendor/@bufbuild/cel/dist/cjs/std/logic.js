/**
 * @bufbuild/cel/dist/cjs/std/logic.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_operator_const } from "../gen/dev/cel/expr/operator_const.js";
import { require_overload_const } from "../gen/dev/cel/expr/overload_const.js";
import { require_type } from "../type.js";
import { require_equals_2 } from "../equals.js";
import { require_func } from "../func.js";

//@ chunk-fq0cr76a.js:502006-507433 cjs-fingerprint
var require_logic = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.matches = matches;
  var opc = require_operator_const();
  var olc = require_overload_const();
  var type_js_1 = require_type();
  var equals_js_1 = require_equals_2();
  var func_js_1 = require_func();
  var invalidPatterns = [
    /\\[1-9]/,
    /\\k<.>/,
    /\(\?\=/,
    /\(\?\!/,
    /\(\?\<\=/,
    /\(\?\<\!/,
    /\\c[A-Z]/,
    /\\u[0-9a-fA-F]{4}/,
    /\\0(?!\d)/,
    /\[\\b.*\]/,
  ];
  var flagPattern = new RegExp(/^\(\?(?<flags>[ims\-]+)\)/);
  function matches(pattern) {
    for (let invalidPattern of invalidPatterns)
      if (invalidPattern.test(pattern))
        throw Error(`Error evaluating pattern ${pattern}, invalid RE2 syntax`);
    let flags = "";
    let flagMatches = pattern.match(flagPattern);
    if (flagMatches) {
      for (let flag of flagMatches?.groups?.flags ?? "") {
        if (flag == "-") break;
        flags += flag;
      }
      pattern = pattern.substring(flagMatches[0].length);
    }
    return new RegExp(pattern, flags).test(this);
  }
  function compareDuration(lhs, rhs) {
    let cmp = lhs.message.seconds - rhs.message.seconds;
    if (cmp == 0n) return lhs.message.nanos - rhs.message.nanos;
    return cmp < 0n ? -1 : 1;
  }
  function compareTimestamp(lhs, rhs) {
    let cmp = lhs.message.seconds - rhs.message.seconds;
    if (cmp == 0n) return lhs.message.nanos - rhs.message.nanos;
    return cmp < 0n ? -1 : 1;
  }
  function compareBytes(lhs, rhs) {
    let minLen = Math.min(lhs.length, rhs.length);
    for (let i = 0; i < minLen; i++) {
      if (lhs[i] < rhs[i]) return -1;
      if (lhs[i] > rhs[i]) return 1;
    }
    return lhs.length - rhs.length;
  }
  function inList(value, list) {
    for (let v of list) if (equals_js_1.equals(v, value)) return true;
    return false;
  }
  function inMap(value, map) {
    return map.has(value);
  }
  var { BOOL, BYTES, DOUBLE, DYN, INT, STRING, UINT } = type_js_1.CelScalar;
  var LIST = type_js_1.listType(type_js_1.CelScalar.DYN);
  var MAP = type_js_1.mapType(type_js_1.CelScalar.DYN, type_js_1.CelScalar.DYN);
  cjsExports.default = [
    func_js_1.celFunc(opc.LOGICAL_NOT, [BOOL], BOOL, (x) => !x),
    func_js_1.celFunc(opc.EQUALS, [DYN, DYN], BOOL, equals_js_1.equals),
    func_js_1.celFunc(opc.NOT_EQUALS, [DYN, DYN], BOOL, (l, r) => !equals_js_1.equals(l, r)),
    func_js_1.celFunc(opc.LESS, [BOOL, BOOL], BOOL, (l, r) => l < r),
    func_js_1.celFunc(opc.LESS, [BYTES, BYTES], BOOL, (l, r) => compareBytes(l, r) < 0),
    func_js_1.celFunc(opc.LESS, [DOUBLE, DOUBLE], BOOL, (l, r) => l < r),
    func_js_1.celFunc(opc.LESS, [STRING, STRING], BOOL, (l, r) => l < r),
    func_js_1.celFunc(opc.LESS, [INT, INT], BOOL, (l, r) => l < r),
    func_js_1.celFunc(opc.LESS, [INT, UINT], BOOL, (l, r) => l < r.value),
    func_js_1.celFunc(opc.LESS, [UINT, INT], BOOL, (l, r) => l.value < r),
    func_js_1.celFunc(opc.LESS, [UINT, UINT], BOOL, (l, r) => l.value < r.value),
    func_js_1.celFunc(opc.LESS, [INT, DOUBLE], BOOL, (l, r) => Number(l) < r),
    func_js_1.celFunc(opc.LESS, [DOUBLE, INT], BOOL, (l, r) => l < Number(r)),
    func_js_1.celFunc(opc.LESS, [DOUBLE, UINT], BOOL, (l, r) => l < Number(r.value)),
    func_js_1.celFunc(opc.LESS, [UINT, DOUBLE], BOOL, (l, r) => Number(l.value) < r),
    func_js_1.celFunc(
      opc.LESS,
      [type_js_1.DURATION, type_js_1.DURATION],
      BOOL,
      (l, r) => compareDuration(l, r) < 0,
    ),
    func_js_1.celFunc(
      opc.LESS,
      [type_js_1.TIMESTAMP, type_js_1.TIMESTAMP],
      BOOL,
      (l, r) => compareTimestamp(l, r) < 0,
    ),
    func_js_1.celFunc(opc.LESS_EQUALS, [BOOL, BOOL], BOOL, (l, r) => l <= r),
    func_js_1.celFunc(opc.LESS_EQUALS, [BYTES, BYTES], BOOL, (l, r) => compareBytes(l, r) <= 0),
    func_js_1.celFunc(opc.LESS_EQUALS, [DOUBLE, DOUBLE], BOOL, (l, r) => l <= r),
    func_js_1.celFunc(opc.LESS_EQUALS, [STRING, STRING], BOOL, (l, r) => l <= r),
    func_js_1.celFunc(opc.LESS_EQUALS, [INT, INT], BOOL, (l, r) => l <= r),
    func_js_1.celFunc(opc.LESS_EQUALS, [INT, UINT], BOOL, (l, r) => l <= r.value),
    func_js_1.celFunc(opc.LESS_EQUALS, [UINT, INT], BOOL, (l, r) => l.value <= r),
    func_js_1.celFunc(opc.LESS_EQUALS, [UINT, UINT], BOOL, (l, r) => l.value <= r.value),
    func_js_1.celFunc(opc.LESS_EQUALS, [INT, DOUBLE], BOOL, (l, r) => Number(l) <= r),
    func_js_1.celFunc(opc.LESS_EQUALS, [DOUBLE, INT], BOOL, (l, r) => l <= Number(r)),
    func_js_1.celFunc(opc.LESS_EQUALS, [DOUBLE, UINT], BOOL, (l, r) => l <= Number(r.value)),
    func_js_1.celFunc(opc.LESS_EQUALS, [UINT, DOUBLE], BOOL, (l, r) => Number(l.value) <= r),
    func_js_1.celFunc(
      opc.LESS_EQUALS,
      [type_js_1.DURATION, type_js_1.DURATION],
      BOOL,
      (l, r) => compareDuration(l, r) <= 0,
    ),
    func_js_1.celFunc(
      opc.LESS_EQUALS,
      [type_js_1.TIMESTAMP, type_js_1.TIMESTAMP],
      BOOL,
      (l, r) => compareTimestamp(l, r) <= 0,
    ),
    func_js_1.celFunc(opc.GREATER, [BOOL, BOOL], BOOL, (l, r) => l > r),
    func_js_1.celFunc(opc.GREATER, [BYTES, BYTES], BOOL, (l, r) => compareBytes(l, r) > 0),
    func_js_1.celFunc(opc.GREATER, [DOUBLE, DOUBLE], BOOL, (l, r) => l > r),
    func_js_1.celFunc(opc.GREATER, [STRING, STRING], BOOL, (l, r) => l > r),
    func_js_1.celFunc(opc.GREATER, [INT, INT], BOOL, (l, r) => l > r),
    func_js_1.celFunc(opc.GREATER, [INT, UINT], BOOL, (l, r) => l > r.value),
    func_js_1.celFunc(opc.GREATER, [UINT, INT], BOOL, (l, r) => l.value > r),
    func_js_1.celFunc(opc.GREATER, [UINT, UINT], BOOL, (l, r) => l.value > r.value),
    func_js_1.celFunc(opc.GREATER, [INT, DOUBLE], BOOL, (l, r) => Number(l) > r),
    func_js_1.celFunc(opc.GREATER, [DOUBLE, INT], BOOL, (l, r) => l > Number(r)),
    func_js_1.celFunc(opc.GREATER, [DOUBLE, UINT], BOOL, (l, r) => l > Number(r.value)),
    func_js_1.celFunc(opc.GREATER, [UINT, DOUBLE], BOOL, (l, r) => Number(l.value) > r),
    func_js_1.celFunc(
      opc.GREATER,
      [type_js_1.DURATION, type_js_1.DURATION],
      BOOL,
      (l, r) => compareDuration(l, r) > 0,
    ),
    func_js_1.celFunc(
      opc.GREATER,
      [type_js_1.TIMESTAMP, type_js_1.TIMESTAMP],
      BOOL,
      (l, r) => compareTimestamp(l, r) > 0,
    ),
    func_js_1.celFunc(opc.GREATER_EQUALS, [BOOL, BOOL], BOOL, (l, r) => l >= r),
    func_js_1.celFunc(opc.GREATER_EQUALS, [BYTES, BYTES], BOOL, (l, r) => compareBytes(l, r) >= 0),
    func_js_1.celFunc(opc.GREATER_EQUALS, [DOUBLE, DOUBLE], BOOL, (l, r) => l >= r),
    func_js_1.celFunc(opc.GREATER_EQUALS, [STRING, STRING], BOOL, (l, r) => l >= r),
    func_js_1.celFunc(opc.GREATER_EQUALS, [INT, INT], BOOL, (l, r) => l >= r),
    func_js_1.celFunc(opc.GREATER_EQUALS, [INT, UINT], BOOL, (l, r) => l >= r.value),
    func_js_1.celFunc(opc.GREATER_EQUALS, [UINT, INT], BOOL, (l, r) => l.value >= r),
    func_js_1.celFunc(opc.GREATER_EQUALS, [UINT, UINT], BOOL, (l, r) => l.value >= r.value),
    func_js_1.celFunc(opc.GREATER_EQUALS, [INT, DOUBLE], BOOL, (l, r) => Number(l) >= r),
    func_js_1.celFunc(opc.GREATER_EQUALS, [DOUBLE, INT], BOOL, (l, r) => l >= Number(r)),
    func_js_1.celFunc(opc.GREATER_EQUALS, [DOUBLE, UINT], BOOL, (l, r) => l >= Number(r.value)),
    func_js_1.celFunc(opc.GREATER_EQUALS, [UINT, DOUBLE], BOOL, (l, r) => Number(l.value) >= r),
    func_js_1.celFunc(
      opc.GREATER_EQUALS,
      [type_js_1.DURATION, type_js_1.DURATION],
      BOOL,
      (l, r) => compareDuration(l, r) >= 0,
    ),
    func_js_1.celFunc(
      opc.GREATER_EQUALS,
      [type_js_1.TIMESTAMP, type_js_1.TIMESTAMP],
      BOOL,
      (l, r) => compareTimestamp(l, r) >= 0,
    ),
    func_js_1.celFunc(olc.SIZE, [BYTES], INT, (x) => BigInt(x.length)),
    func_js_1.celFunc(olc.SIZE, [LIST], INT, (x) => BigInt(x.size)),
    func_js_1.celFunc(olc.SIZE, [STRING], INT, (x) => BigInt([...x].length)),
    func_js_1.celFunc(olc.SIZE, [MAP], INT, (x) => BigInt(x.size)),
    func_js_1.celMethod(olc.SIZE, BYTES, [], INT, function () {
      return BigInt(this.length);
    }),
    func_js_1.celMethod(olc.SIZE, LIST, [], INT, function () {
      return BigInt(this.size);
    }),
    func_js_1.celMethod(olc.SIZE, STRING, [], INT, function () {
      return BigInt([...this].length);
    }),
    func_js_1.celMethod(olc.SIZE, MAP, [], INT, function () {
      return BigInt(this.size);
    }),
    func_js_1.celFunc(opc.IN, [DYN, LIST], BOOL, inList),
    func_js_1.celFunc(opc.IN, [STRING, MAP], BOOL, inMap),
    func_js_1.celFunc(opc.IN, [DOUBLE, MAP], BOOL, inMap),
    func_js_1.celFunc(opc.IN, [INT, MAP], BOOL, inMap),
    func_js_1.celFunc(opc.IN, [BOOL, MAP], BOOL, inMap),
    func_js_1.celFunc(opc.IN, [UINT, MAP], BOOL, inMap),
    func_js_1.celMethod(olc.CONTAINS, STRING, [STRING], BOOL, String.prototype.includes),
    func_js_1.celMethod(olc.ENDS_WITH, STRING, [STRING], BOOL, String.prototype.endsWith),
    func_js_1.celMethod(olc.STARTS_WITH, STRING, [STRING], BOOL, String.prototype.startsWith),
    func_js_1.celMethod(olc.MATCHES, STRING, [STRING], BOOL, matches),
  ];
});
export { require_logic };
