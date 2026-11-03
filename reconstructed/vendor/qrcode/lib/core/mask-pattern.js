/**
 * qrcode/lib/core/mask-pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:3101-5121 cjs-fingerprint
var Kt = x(function (yi) {
  yi.Patterns = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7,
  };
  var G = { N1: 3, N2: 3, N3: 40, N4: 10 };
  yi.isValid = function (e) {
    return e != null && e !== "" && !isNaN(e) && e >= 0 && e <= 7;
  };
  yi.from = function (e) {
    return yi.isValid(e) ? parseInt(e, 10) : void 0;
  };
  yi.getPenaltyN1 = function (e) {
    let size = e.size,
      n = 0,
      i = 0,
      o = 0,
      s = null,
      l = null;
    for (let u = 0; u < size; u++) {
      ((i = o = 0), (s = l = null));
      for (let f = 0; f < size; f++) {
        let a = e.get(u, f);
        if (a === s) i++;
        else {
          if (i >= 5) n += G.N1 + (i - 5);
          ((s = a), (i = 1));
        }
        if (((a = e.get(f, u)), a === l)) o++;
        else {
          if (o >= 5) n += G.N1 + (o - 5);
          ((l = a), (o = 1));
        }
      }
      if (i >= 5) n += G.N1 + (i - 5);
      if (o >= 5) n += G.N1 + (o - 5);
    }
    return n;
  };
  yi.getPenaltyN2 = function (e) {
    let size = e.size,
      n = 0;
    for (let i = 0; i < size - 1; i++)
      for (let o = 0; o < size - 1; o++) {
        let s = e.get(i, o) + e.get(i, o + 1) + e.get(i + 1, o) + e.get(i + 1, o + 1);
        if (s === 4 || s === 0) n++;
      }
    return n * G.N2;
  };
  yi.getPenaltyN3 = function (e) {
    let size = e.size,
      n = 0,
      i = 0,
      o = 0;
    for (let s = 0; s < size; s++) {
      i = o = 0;
      for (let l = 0; l < size; l++) {
        if (((i = ((i << 1) & 2047) | e.get(s, l)), l >= 10 && (i === 1488 || i === 93))) n++;
        if (((o = ((o << 1) & 2047) | e.get(l, s)), l >= 10 && (o === 1488 || o === 93))) n++;
      }
    }
    return n * G.N3;
  };
  yi.getPenaltyN4 = function (e) {
    let r = 0,
      n = e.data.length;
    for (let o = 0; o < n; o++) r += e.data[o];
    return Math.abs(Math.ceil((r * 100) / n / 5) - 10) * G.N4;
  };
  function mi(t, e, r) {
    switch (t) {
      case yi.Patterns.PATTERN000:
        return (e + r) % 2 === 0;
      case yi.Patterns.PATTERN001:
        return e % 2 === 0;
      case yi.Patterns.PATTERN010:
        return r % 3 === 0;
      case yi.Patterns.PATTERN011:
        return (e + r) % 3 === 0;
      case yi.Patterns.PATTERN100:
        return (Math.floor(e / 2) + Math.floor(r / 3)) % 2 === 0;
      case yi.Patterns.PATTERN101:
        return ((e * r) % 2) + ((e * r) % 3) === 0;
      case yi.Patterns.PATTERN110:
        return (((e * r) % 2) + ((e * r) % 3)) % 2 === 0;
      case yi.Patterns.PATTERN111:
        return (((e * r) % 3) + ((e + r) % 2)) % 2 === 0;
      default:
        throw Error("bad maskPattern:" + t);
    }
  }
  yi.applyMask = function (e, r) {
    let size = r.size;
    for (let i = 0; i < size; i++)
      for (let o = 0; o < size; o++) {
        if (r.isReserved(o, i)) continue;
        r.xor(o, i, mi(e, o, i));
      }
  };
  yi.getBestMask = function (e, r) {
    let n = Object.keys(yi.Patterns).length,
      i = 0,
      o = 1 / 0;
    for (let s = 0; s < n; s++) {
      (r(s), yi.applyMask(s, e));
      let l = yi.getPenaltyN1(e) + yi.getPenaltyN2(e) + yi.getPenaltyN3(e) + yi.getPenaltyN4(e);
      if ((yi.applyMask(s, e), l < o)) ((o = l), (i = s));
    }
    return i;
  };
});

export { Kt };
