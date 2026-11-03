/**
 * @bufbuild/cel/dist/cjs/std/logic.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ny } from "../gen/dev/cel/expr/operator_const.js";
import { q_ } from "../gen/dev/cel/expr/overload_const.js";
import { Ei } from "../type.js";
import { F_ } from "../equals.js";
import { Tc } from "../func.js";

//@ chunk-fq0cr76a.js:502006-507433 cjs-fingerprint
var MB = x(function (FB) {
  Object.defineProperty(FB, "__esModule", { value: !0 });
  FB.matches = UB;
  var Ge = Ny(),
    Ur = q_(),
    yn = Ei(),
    gd = F_(),
    De = Tc(),
    $se = [
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
    ],
    regExp = new RegExp(/^\(\?(?<flags>[ims\-]+)\)/);
  function UB(e) {
    for (let h of $se) if (h.test(e)) throw Error(`Error evaluating pattern ${e}, invalid RE2 syntax`);
    let n = "",
      match = e.match(regExp);
    if (match) {
      for (let h of match?.groups?.flags ?? "") {
        if (h == "-") break;
        n += h;
      }
      e = e.substring(match[0].length);
    }
    return new RegExp(e, n).test(this);
  }
  function Wy(e, n) {
    let r = e.message.seconds - n.message.seconds;
    if (r == 0n) return e.message.nanos - n.message.nanos;
    return r < 0n ? -1 : 1;
  }
  function Gy(e, n) {
    let r = e.message.seconds - n.message.seconds;
    if (r == 0n) return e.message.nanos - n.message.nanos;
    return r < 0n ? -1 : 1;
  }
  function Hy(e, n) {
    let min = Math.min(e.length, n.length);
    for (let s = 0; s < min; s++) {
      if (e[s] < n[s]) return -1;
      if (e[s] > n[s]) return 1;
    }
    return e.length - n.length;
  }
  function Wse(e, n) {
    for (let r of n) if (gd.equals(r, e)) return !0;
    return !1;
  }
  function wp(e, n) {
    return n.has(e);
  }
  var {
      BOOL: BOOL,
      BYTES: BYTES,
      DOUBLE: DOUBLE,
      DYN: DYN,
      INT: INT,
      STRING: STRING,
      UINT: UINT,
    } = yn.CelScalar,
    listType = yn.listType(yn.CelScalar.DYN),
    mapType = yn.mapType(yn.CelScalar.DYN, yn.CelScalar.DYN);
  FB.default = [
    De.celFunc(Ge.LOGICAL_NOT, [BOOL], BOOL, (e) => !e),
    De.celFunc(Ge.EQUALS, [DYN, DYN], BOOL, gd.equals),
    De.celFunc(Ge.NOT_EQUALS, [DYN, DYN], BOOL, (e, n) => !gd.equals(e, n)),
    De.celFunc(Ge.LESS, [BOOL, BOOL], BOOL, (e, n) => e < n),
    De.celFunc(Ge.LESS, [BYTES, BYTES], BOOL, (e, n) => Hy(e, n) < 0),
    De.celFunc(Ge.LESS, [DOUBLE, DOUBLE], BOOL, (e, n) => e < n),
    De.celFunc(Ge.LESS, [STRING, STRING], BOOL, (e, n) => e < n),
    De.celFunc(Ge.LESS, [INT, INT], BOOL, (e, n) => e < n),
    De.celFunc(Ge.LESS, [INT, UINT], BOOL, (e, n) => e < n.value),
    De.celFunc(Ge.LESS, [UINT, INT], BOOL, (e, n) => e.value < n),
    De.celFunc(Ge.LESS, [UINT, UINT], BOOL, (e, n) => e.value < n.value),
    De.celFunc(Ge.LESS, [INT, DOUBLE], BOOL, (e, n) => Number(e) < n),
    De.celFunc(Ge.LESS, [DOUBLE, INT], BOOL, (e, n) => e < Number(n)),
    De.celFunc(Ge.LESS, [DOUBLE, UINT], BOOL, (e, n) => e < Number(n.value)),
    De.celFunc(Ge.LESS, [UINT, DOUBLE], BOOL, (e, n) => Number(e.value) < n),
    De.celFunc(Ge.LESS, [yn.DURATION, yn.DURATION], BOOL, (e, n) => Wy(e, n) < 0),
    De.celFunc(Ge.LESS, [yn.TIMESTAMP, yn.TIMESTAMP], BOOL, (e, n) => Gy(e, n) < 0),
    De.celFunc(Ge.LESS_EQUALS, [BOOL, BOOL], BOOL, (e, n) => e <= n),
    De.celFunc(Ge.LESS_EQUALS, [BYTES, BYTES], BOOL, (e, n) => Hy(e, n) <= 0),
    De.celFunc(Ge.LESS_EQUALS, [DOUBLE, DOUBLE], BOOL, (e, n) => e <= n),
    De.celFunc(Ge.LESS_EQUALS, [STRING, STRING], BOOL, (e, n) => e <= n),
    De.celFunc(Ge.LESS_EQUALS, [INT, INT], BOOL, (e, n) => e <= n),
    De.celFunc(Ge.LESS_EQUALS, [INT, UINT], BOOL, (e, n) => e <= n.value),
    De.celFunc(Ge.LESS_EQUALS, [UINT, INT], BOOL, (e, n) => e.value <= n),
    De.celFunc(Ge.LESS_EQUALS, [UINT, UINT], BOOL, (e, n) => e.value <= n.value),
    De.celFunc(Ge.LESS_EQUALS, [INT, DOUBLE], BOOL, (e, n) => Number(e) <= n),
    De.celFunc(Ge.LESS_EQUALS, [DOUBLE, INT], BOOL, (e, n) => e <= Number(n)),
    De.celFunc(Ge.LESS_EQUALS, [DOUBLE, UINT], BOOL, (e, n) => e <= Number(n.value)),
    De.celFunc(Ge.LESS_EQUALS, [UINT, DOUBLE], BOOL, (e, n) => Number(e.value) <= n),
    De.celFunc(Ge.LESS_EQUALS, [yn.DURATION, yn.DURATION], BOOL, (e, n) => Wy(e, n) <= 0),
    De.celFunc(Ge.LESS_EQUALS, [yn.TIMESTAMP, yn.TIMESTAMP], BOOL, (e, n) => Gy(e, n) <= 0),
    De.celFunc(Ge.GREATER, [BOOL, BOOL], BOOL, (e, n) => e > n),
    De.celFunc(Ge.GREATER, [BYTES, BYTES], BOOL, (e, n) => Hy(e, n) > 0),
    De.celFunc(Ge.GREATER, [DOUBLE, DOUBLE], BOOL, (e, n) => e > n),
    De.celFunc(Ge.GREATER, [STRING, STRING], BOOL, (e, n) => e > n),
    De.celFunc(Ge.GREATER, [INT, INT], BOOL, (e, n) => e > n),
    De.celFunc(Ge.GREATER, [INT, UINT], BOOL, (e, n) => e > n.value),
    De.celFunc(Ge.GREATER, [UINT, INT], BOOL, (e, n) => e.value > n),
    De.celFunc(Ge.GREATER, [UINT, UINT], BOOL, (e, n) => e.value > n.value),
    De.celFunc(Ge.GREATER, [INT, DOUBLE], BOOL, (e, n) => Number(e) > n),
    De.celFunc(Ge.GREATER, [DOUBLE, INT], BOOL, (e, n) => e > Number(n)),
    De.celFunc(Ge.GREATER, [DOUBLE, UINT], BOOL, (e, n) => e > Number(n.value)),
    De.celFunc(Ge.GREATER, [UINT, DOUBLE], BOOL, (e, n) => Number(e.value) > n),
    De.celFunc(Ge.GREATER, [yn.DURATION, yn.DURATION], BOOL, (e, n) => Wy(e, n) > 0),
    De.celFunc(Ge.GREATER, [yn.TIMESTAMP, yn.TIMESTAMP], BOOL, (e, n) => Gy(e, n) > 0),
    De.celFunc(Ge.GREATER_EQUALS, [BOOL, BOOL], BOOL, (e, n) => e >= n),
    De.celFunc(Ge.GREATER_EQUALS, [BYTES, BYTES], BOOL, (e, n) => Hy(e, n) >= 0),
    De.celFunc(Ge.GREATER_EQUALS, [DOUBLE, DOUBLE], BOOL, (e, n) => e >= n),
    De.celFunc(Ge.GREATER_EQUALS, [STRING, STRING], BOOL, (e, n) => e >= n),
    De.celFunc(Ge.GREATER_EQUALS, [INT, INT], BOOL, (e, n) => e >= n),
    De.celFunc(Ge.GREATER_EQUALS, [INT, UINT], BOOL, (e, n) => e >= n.value),
    De.celFunc(Ge.GREATER_EQUALS, [UINT, INT], BOOL, (e, n) => e.value >= n),
    De.celFunc(Ge.GREATER_EQUALS, [UINT, UINT], BOOL, (e, n) => e.value >= n.value),
    De.celFunc(Ge.GREATER_EQUALS, [INT, DOUBLE], BOOL, (e, n) => Number(e) >= n),
    De.celFunc(Ge.GREATER_EQUALS, [DOUBLE, INT], BOOL, (e, n) => e >= Number(n)),
    De.celFunc(Ge.GREATER_EQUALS, [DOUBLE, UINT], BOOL, (e, n) => e >= Number(n.value)),
    De.celFunc(Ge.GREATER_EQUALS, [UINT, DOUBLE], BOOL, (e, n) => Number(e.value) >= n),
    De.celFunc(Ge.GREATER_EQUALS, [yn.DURATION, yn.DURATION], BOOL, (e, n) => Wy(e, n) >= 0),
    De.celFunc(Ge.GREATER_EQUALS, [yn.TIMESTAMP, yn.TIMESTAMP], BOOL, (e, n) => Gy(e, n) >= 0),
    De.celFunc(Ur.SIZE, [BYTES], INT, (e) => BigInt(e.length)),
    De.celFunc(Ur.SIZE, [listType], INT, (e) => BigInt(e.size)),
    De.celFunc(Ur.SIZE, [STRING], INT, (e) => BigInt([...e].length)),
    De.celFunc(Ur.SIZE, [mapType], INT, (e) => BigInt(e.size)),
    De.celMethod(Ur.SIZE, BYTES, [], INT, function () {
      return BigInt(this.length);
    }),
    De.celMethod(Ur.SIZE, listType, [], INT, function () {
      return BigInt(this.size);
    }),
    De.celMethod(Ur.SIZE, STRING, [], INT, function () {
      return BigInt([...this].length);
    }),
    De.celMethod(Ur.SIZE, mapType, [], INT, function () {
      return BigInt(this.size);
    }),
    De.celFunc(Ge.IN, [DYN, listType], BOOL, Wse),
    De.celFunc(Ge.IN, [STRING, mapType], BOOL, wp),
    De.celFunc(Ge.IN, [DOUBLE, mapType], BOOL, wp),
    De.celFunc(Ge.IN, [INT, mapType], BOOL, wp),
    De.celFunc(Ge.IN, [BOOL, mapType], BOOL, wp),
    De.celFunc(Ge.IN, [UINT, mapType], BOOL, wp),
    De.celMethod(Ur.CONTAINS, STRING, [STRING], BOOL, String.prototype.includes),
    De.celMethod(Ur.ENDS_WITH, STRING, [STRING], BOOL, String.prototype.endsWith),
    De.celMethod(Ur.STARTS_WITH, STRING, [STRING], BOOL, String.prototype.startsWith),
    De.celMethod(Ur.MATCHES, STRING, [STRING], BOOL, UB),
  ];
});

export { MB };
