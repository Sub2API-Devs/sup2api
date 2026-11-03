/**
 * @bufbuild/cel/dist/cjs/ext/strings.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { li } from "../../../../protobuf/dist/commonjs/index.js";
import { Os } from "../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { Ei } from "../type.js";
import { $o } from "../list.js";
import { Aa } from "../map.js";
import { Bi } from "../uint.js";
import { ba } from "../../../../protobuf/dist/commonjs/reflect/index.js";
import { Tc } from "../func.js";

//@ chunk-fq0cr76a.js:631450-638468 cjs-fingerprint
var aM = x(function (oM) {
  Object.defineProperty(oM, "__esModule", { value: !0 });
  var g0 = li(),
    Gl = Os(),
    Hl = Ei(),
    Bd = $o(),
    QF = Aa(),
    zo = Bi(),
    y0 = ba(),
    Gn = Tc();
  function vae(e) {
    let n = Number(e);
    if (n < 0 || n > this.length) throw Ld(n, this.length);
    return this.charAt(n);
  }
  function GF(e, n) {
    if (n === void 0) return BigInt(this.indexOf(e));
    let r = Number(n);
    if (r < 0 || r >= this.length) throw Ld(r, this.length);
    return BigInt(this.indexOf(e, r));
  }
  function HF(e, n) {
    if (n === void 0) return BigInt(this.lastIndexOf(e));
    let r = Number(n);
    if (r < 0 || r >= this.length) throw Ld(r, this.length);
    return BigInt(this.lastIndexOf(e, r));
  }
  function wae() {
    let e = "";
    for (let n = 0; n < this.length; n++) {
      let code = this.charCodeAt(n);
      if (code >= 65 && code <= 90) e += String.fromCharCode(code + 32);
      else e += this.charAt(n);
    }
    return e;
  }
  function Tae() {
    let e = "";
    for (let n = 0; n < this.length; n++) {
      let code = this.charCodeAt(n);
      if (code >= 97 && code <= 122) e += String.fromCharCode(code - 32);
      else e += this.charAt(n);
    }
    return e;
  }
  function KF(e, n, r) {
    let s = r === void 0 ? this.length : Number(r),
      h = this,
      y = 0,
      b = s,
      index = h.indexOf(e, y);
    while (b > 0 && index !== -1)
      ((h = h.substring(0, index) + n + h.substring(index + e.length)),
        (y = index + n.length),
        b--,
        (index = h.indexOf(e, y)));
    return h;
  }
  function jF(e, n) {
    let r = n === void 0 ? void 0 : Number(n);
    if (r === 1) return Bd.celList([this]);
    return Bd.celList(this.split(e, r));
  }
  function YF(e, n) {
    if (n === void 0) {
      let h = Number(e);
      if (h < 0 || h > this.length) throw Ld(h, this.length);
      return this.substring(h);
    }
    let r = Number(e),
      s = Number(n);
    if (r < 0 || r > this.length) throw Ld(r, this.length);
    if (s < 0 || s > this.length) throw Ld(s, this.length);
    if (r > s) throw Ys("substring", "start > end");
    return this.substring(r, s);
  }
  var ZF = new Set([
    32, 9, 10, 11, 12, 13, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202,
    8232, 8233, 8239, 8287, 12288,
  ]);
  function Aae() {
    let e = 0,
      n = this.length - 1;
    while (e < this.length && ZF.has(this.charCodeAt(e))) e++;
    while (n > e && ZF.has(this.charCodeAt(n))) n--;
    return this.substring(e, n + 1);
  }
  function zF(e = "") {
    let n = "";
    for (let r = 0; r < this.size; r++) {
      let s = this.get(r);
      if (typeof s !== "string") throw Ys("join", "list contains non-string value");
      if (r > 0) n += e;
      n += s;
    }
    return n;
  }
  var Cae = new Map([
    [0, "\\0"],
    [7, "\\a"],
    [8, "\\b"],
    [9, "\\t"],
    [10, "\\n"],
    [11, "\\v"],
    [12, "\\f"],
    [13, "\\r"],
    [34, '\\"'],
    [92, "\\\\"],
  ]);
  function Rae(e) {
    let n = '"';
    for (let r = 0; r < e.length; r++) {
      let code = e.charCodeAt(r);
      n += Cae.get(code) ?? e.charAt(r);
    }
    return ((n += '"'), n);
  }
  function eM(e) {
    switch (e) {
      case "Infinity":
      case "-Infinity":
      case "NaN":
        return e;
      default:
        throw Ys("format", "invalid floating point value");
    }
  }
  function tM(e, n) {
    switch (!0) {
      case typeof e === "number":
        if (!Number.isFinite(e) || n === void 0) return e.toString();
        return new Intl.NumberFormat("en-US", {
          maximumFractionDigits: n,
          minimumFractionDigits: n,
          notation: "standard",
          roundingMode: "halfEven",
          useGrouping: !1,
        }).format(e);
      case typeof e === "string":
        return eM(e);
      default:
        throw Ys("format", "fixed-point clause can only be used on doubles");
    }
  }
  function Iae(e, n) {
    switch (!0) {
      case typeof e === "number":
        if (!Number.isFinite(e)) return e.toString();
        let toExponential = e.toExponential(n),
          index = toExponential.lastIndexOf("+");
        if (index === toExponential.length - 2)
          toExponential = `${toExponential.substring(0, index + 1)}0${toExponential.substring(index + 1)}`;
        return toExponential;
      case typeof e === "string":
        return eM(e);
      default:
        throw Ys("format", "scientific clause can only be used on doubles");
    }
  }
  function Nae(e) {
    switch (!0) {
      case typeof e === "boolean":
        return e ? "1" : "0";
      case typeof e === "bigint":
        return e.toString(2);
      case zo.isCelUint(e):
        return e.value.toString(2);
      default:
        throw Ys("format", "only integers and bools can be formatted as binary");
    }
  }
  function kae(e) {
    switch (!0) {
      case typeof e === "bigint":
        return e.toString(8);
      case zo.isCelUint(e):
        return e.value.toString(8);
      default:
        throw Ys("format", "invalid integer value");
    }
  }
  function nM(e) {
    switch (!0) {
      case typeof e === "bigint":
        return e.toString(10);
      case zo.isCelUint(e):
        return e.value.toString(10);
      case typeof e === "number" && !Number.isFinite(e):
        return e.toString();
      default:
        throw Ys("format", "invalid integer value");
    }
  }
  function XF(e) {
    let n = "";
    for (let r = 0; r < e.length; r++) n += e[r].toString(16).padStart(2, "0");
    return n;
  }
  function rM(e) {
    switch (!0) {
      case typeof e === "bigint":
        return e.toString(16);
      case zo.isCelUint(e):
        return e.value.toString(16);
      case typeof e === "string":
        return XF(new TextEncoder().encode(e));
      case e instanceof Uint8Array:
        return XF(e);
      default:
        throw Ys("format", "only integers, byte buffers, and strings can be formatted as hex");
    }
  }
  function Dae(e) {
    let n = rM(e);
    if (typeof n !== "string") return n;
    return n.toUpperCase();
  }
  function Oae(e) {
    let n = "[";
    for (let r = 0; r < e.size; r++) {
      if (r > 0) n += ", ";
      n += b0(e.get(r));
    }
    return ((n += "]"), n);
  }
  function Pae(e) {
    let n = Array(e.size),
      r = 0;
    for (let [y, b] of e) ((n[r] = [b0(y), b0(b)]), r++);
    let s = "{",
      h = "";
    for (let [y, b] of n.sort((S, w) => S[0].localeCompare(w[0]))) ((s += h + y + ": " + b), (h = ", "));
    return ((s += "}"), s);
  }
  function b0(e) {
    switch (typeof e) {
      case "boolean":
        return e ? "true" : "false";
      case "bigint":
        return nM(e);
      case "number":
        return tM(e, void 0);
      case "string":
        return e;
      case "object":
        switch (!0) {
          case e === null:
            return "null";
          case Hl.isCelType(e):
            return e.name;
          case zo.isCelUint(e):
            return e.value.toString();
          case y0.isReflectMessage(e, Gl.TimestampSchema):
            return g0.toJson(Gl.TimestampSchema, e.message);
          case y0.isReflectMessage(e, Gl.DurationSchema):
            return g0.toJson(Gl.DurationSchema, e.message);
          case e instanceof Uint8Array:
            return new TextDecoder().decode(e);
          case Bd.isCelList(e):
            return Oae(e);
          case QF.isCelMap(e):
            return Pae(e);
        }
    }
    throw Ys("format", "invalid string value");
  }
  function Lae(e) {
    let n = "",
      r = 0,
      s = 0;
    while (r < this.length) {
      if (this.charAt(r) !== "%") {
        ((n += this.charAt(r)), r++);
        continue;
      }
      if (r + 1 >= this.length) throw Ys("format", "invalid format string");
      let charAt = this.charAt(r + 1);
      if (((r += 2), charAt === "%")) {
        n += "%";
        continue;
      }
      let y = 6;
      if (charAt === ".") {
        y = 0;
        while (r < this.length && this.charAt(r) >= "0" && this.charAt(r) <= "9")
          ((y = y * 10 + Number(this.charAt(r))), r++);
        if (r >= this.length) throw Ys("format", "invalid format string");
        ((charAt = this.charAt(r)), r++);
      }
      let b = e.get(s++);
      if (b === void 0) throw Ys("format", "too few arguments for format string");
      n += Bae(charAt, b, y);
    }
    if (s < e.size) throw Ys("format", "too many arguments for format string");
    return n;
  }
  function Bae(e, n, r) {
    switch (e) {
      case "e":
        return Iae(n, r);
      case "f":
        return tM(n, r);
      case "b":
        return Nae(n);
      case "d":
        return nM(n);
      case "s":
        return b0(n);
      case "x":
        return rM(n);
      case "X":
        return Dae(n);
      case "o":
        return kae(n);
      default:
        throw Ys("format", `could not parse formatting clause: unrecognized formatting clause: ${e}`);
    }
  }
  function Ys(e, n) {
    return Error(`invalid argument to function ${e}: ${n}`);
  }
  function Ld(e, n) {
    return Error(`index ${e} out of bounds [0, ${n})`);
  }
  var { STRING: STRING, INT: INT, DYN: DYN } = Hl.CelScalar,
    listType = Hl.listType(DYN),
    listType_2 = Hl.listType(DYN);
  oM.default = [
    Gn.celFunc("strings.quote", [STRING], STRING, Rae),
    Gn.celMethod("charAt", STRING, [INT], STRING, vae),
    Gn.celMethod("indexOf", STRING, [STRING], INT, GF),
    Gn.celMethod("indexOf", STRING, [STRING, INT], INT, GF),
    Gn.celMethod("lastIndexOf", STRING, [STRING], INT, HF),
    Gn.celMethod("lastIndexOf", STRING, [STRING, INT], INT, HF),
    Gn.celMethod("lowerAscii", STRING, [], STRING, wae),
    Gn.celMethod("upperAscii", STRING, [], STRING, Tae),
    Gn.celMethod("replace", STRING, [STRING, STRING], STRING, KF),
    Gn.celMethod("replace", STRING, [STRING, STRING, INT], STRING, KF),
    Gn.celMethod("split", STRING, [STRING], listType_2, jF),
    Gn.celMethod("split", STRING, [STRING, INT], listType_2, jF),
    Gn.celMethod("substring", STRING, [INT], STRING, YF),
    Gn.celMethod("substring", STRING, [INT, INT], STRING, YF),
    Gn.celMethod("trim", STRING, [], STRING, Aae),
    Gn.celMethod("join", listType_2, [], STRING, zF),
    Gn.celMethod("join", listType_2, [STRING], STRING, zF),
    Gn.celMethod("format", STRING, [listType], STRING, Lae),
  ];
});

export { aM };
