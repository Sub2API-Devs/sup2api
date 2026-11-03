/**
 * @bufbuild/cel/dist/cjs/std/math.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ny } from "../gen/dev/cel/expr/operator_const.js";
import { Ei } from "../type.js";
import { $o } from "../list.js";
import { Bi } from "../uint.js";
import { L_ } from "../duration.js";
import { lB } from "../timestamp.js";
import { bl } from "../error.js";
import { Tc } from "../func.js";

//@ chunk-fq0cr76a.js:484761-487762 cjs-fingerprint
var H_ = x(function (CB) {
  Object.defineProperty(CB, "__esModule", { value: !0 });
  CB.safeInt = hd;
  CB.safeUint = Uy;
  var Vt = Ny(),
    Sn = Ei(),
    AB = $o(),
    md = Bi(),
    Fy = L_(),
    My = lB(),
    Bl = bl(),
    dn = Tc(),
    EB = 9223372036854775807n,
    xB = -9223372036854775808n,
    Xee = 18446744073709551615n;
  function hd(e, n = "type conversion") {
    let r = typeof e === "string" ? BigInt(e) : e;
    if (typeof r === "bigint") {
      if (r >= xB && r <= EB) return r;
    } else if (Number.isFinite(r)) {
      if (r > Number(xB) && r < Number(EB)) return BigInt(Math.trunc(r));
    }
    throw Bl.celError(`int overflow during ${n}`);
  }
  function Uy(e, n = "type conversion") {
    let r = typeof e === "string" ? BigInt(e) : e;
    if (typeof r === "bigint" || Number.isFinite(r)) {
      let s = typeof r === "number" ? BigInt(Math.trunc(r)) : r;
      if (r >= 0 && s <= Xee) return md.celUint(s);
    }
    throw Bl.celError(`uint overflow during ${n}`);
  }
  function Jee(e, n) {
    let uint8Array = new Uint8Array(e.length + n.length);
    return (uint8Array.set(e), uint8Array.set(n, e.length), uint8Array);
  }
  function _B(e, n) {
    return My.createTimestamp(e.message.seconds + n.message.seconds, e.message.nanos + n.message.nanos);
  }
  function Qee(e, n) {
    return Fy.createDuration(e.message.seconds + n.message.seconds, e.message.nanos + n.message.nanos);
  }
  function vB(e, n) {
    return Fy.createDuration(e.message.seconds - n.message.seconds, e.message.nanos - n.message.nanos);
  }
  function ete(e, n) {
    return My.createTimestamp(e.message.seconds - n.message.seconds, e.message.nanos - n.message.nanos);
  }
  function wB(e, n, r) {
    if (r === 0n) throw Bl.celError(`${e.name} divide by zero`);
    return hd(n / r, `divide by ${r}`);
  }
  function TB(e, n, r) {
    if (r === 0n) throw Bl.celError(`${e.name} modulus by zero`);
    return n % r;
  }
  var listType = Sn.listType(Sn.CelScalar.DYN),
    { BYTES: BYTES, DOUBLE: DOUBLE, INT: INT, STRING: STRING, UINT: UINT } = Sn.CelScalar;
  CB.default = [
    dn.celFunc(Vt.ADD, [INT, INT], INT, (e, n) => hd(e + n, Vt.ADD)),
    dn.celFunc(Vt.ADD, [UINT, UINT], UINT, (e, n) => Uy(e.value + n.value, Vt.ADD)),
    dn.celFunc(Vt.ADD, [DOUBLE, DOUBLE], DOUBLE, (e, n) => e + n),
    dn.celFunc(Vt.ADD, [Sn.DURATION, Sn.DURATION], Sn.DURATION, Qee),
    dn.celFunc(Vt.ADD, [Sn.TIMESTAMP, Sn.DURATION], Sn.TIMESTAMP, _B),
    dn.celFunc(Vt.ADD, [Sn.DURATION, Sn.TIMESTAMP], Sn.TIMESTAMP, _B),
    dn.celFunc(Vt.ADD, [STRING, STRING], STRING, (e, n) => e + n),
    dn.celFunc(Vt.ADD, [BYTES, BYTES], BYTES, Jee),
    dn.celFunc(Vt.ADD, [listType, listType], listType, AB.celListConcat),
    dn.celFunc(Vt.SUBTRACT, [INT, INT], INT, (e, n) => hd(e - n, Vt.SUBTRACT)),
    dn.celFunc(Vt.SUBTRACT, [UINT, UINT], UINT, (e, n) => Uy(e.value - n.value, Vt.SUBTRACT)),
    dn.celFunc(Vt.SUBTRACT, [DOUBLE, DOUBLE], DOUBLE, (e, n) => e - n),
    dn.celFunc(Vt.SUBTRACT, [Sn.TIMESTAMP, Sn.TIMESTAMP], Sn.DURATION, vB),
    dn.celFunc(Vt.SUBTRACT, [Sn.DURATION, Sn.DURATION], Sn.DURATION, vB),
    dn.celFunc(Vt.SUBTRACT, [Sn.TIMESTAMP, Sn.DURATION], Sn.TIMESTAMP, ete),
    dn.celFunc(Vt.MULTIPLY, [INT, INT], INT, (e, n) => hd(e * n, Vt.MULTIPLY)),
    dn.celFunc(Vt.MULTIPLY, [UINT, UINT], UINT, (e, n) => Uy(e.value * n.value, Vt.MULTIPLY)),
    dn.celFunc(Vt.MULTIPLY, [DOUBLE, DOUBLE], DOUBLE, (e, n) => e * n),
    dn.celFunc(Vt.DIVIDE, [INT, INT], INT, (e, n) => wB(INT, e, n)),
    dn.celFunc(Vt.DIVIDE, [UINT, UINT], UINT, (e, n) => md.celUint(wB(UINT, e.value, n.value))),
    dn.celFunc(Vt.DIVIDE, [DOUBLE, DOUBLE], DOUBLE, (e, n) => e / n),
    dn.celFunc(Vt.MODULO, [INT, INT], INT, (e, n) => TB(INT, e, n)),
    dn.celFunc(Vt.MODULO, [UINT, UINT], UINT, (e, n) => md.celUint(TB(UINT, e.value, n.value))),
    dn.celFunc(Vt.NEGATE, [INT], INT, (e) => hd(-e)),
    dn.celFunc(Vt.NEGATE, [DOUBLE], DOUBLE, (e) => -e),
  ];
});

export { H_ };
