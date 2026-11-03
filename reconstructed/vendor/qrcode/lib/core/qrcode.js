/**
 * qrcode/lib/core/qrcode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { N } from "./utils.js";
import { be } from "./error-correction-level.js";
import { Nt } from "./bit-buffer.js";
import { Ut } from "./bit-matrix.js";
import { Dt } from "./alignment-pattern.js";
import { Yt } from "./finder-pattern.js";
import { Kt } from "./mask-pattern.js";
import { Ye } from "./error-correction-code.js";
import { Zt } from "./reed-solomon-encoder.js";
import { ir } from "./version.js";
import { sr } from "./format-info.js";
import { q } from "./mode.js";
import { Br } from "./segments.js";

//@ chunk-spjgqa4y.js:17575-20975 cjs-fingerprint
var it = x(function (Bo) {
  var Y = N(),
    te = be(),
    po = Nt(),
    go = Ut(),
    Ir = Dt(),
    Ar = Yt(),
    ne = Kt(),
    ie = Ye(),
    _o = Zt(),
    D = ir(),
    Lr = sr(),
    Rr = q(),
    re = Br();
  function mo(t, e) {
    let size = t.size,
      positions = Ar.getPositions(e);
    for (let i = 0; i < positions.length; i++) {
      let o = positions[i][0],
        s = positions[i][1];
      for (let l = -1; l <= 7; l++) {
        if (o + l <= -1 || size <= o + l) continue;
        for (let u = -1; u <= 7; u++) {
          if (s + u <= -1 || size <= s + u) continue;
          if (
            (l >= 0 && l <= 6 && (u === 0 || u === 6)) ||
            (u >= 0 && u <= 6 && (l === 0 || l === 6)) ||
            (l >= 2 && l <= 4 && u >= 2 && u <= 4)
          )
            t.set(o + l, s + u, !0, !0);
          else t.set(o + l, s + u, !1, !0);
        }
      }
    }
  }
  function yo(t) {
    let size = t.size;
    for (let r = 8; r < size - 8; r++) {
      let n = r % 2 === 0;
      (t.set(r, 6, n, !0), t.set(6, r, n, !0));
    }
  }
  function wo(t, e) {
    let positions = Ir.getPositions(e);
    for (let n = 0; n < positions.length; n++) {
      let i = positions[n][0],
        o = positions[n][1];
      for (let s = -2; s <= 2; s++)
        for (let l = -2; l <= 2; l++)
          if (s === -2 || s === 2 || l === -2 || l === 2 || (s === 0 && l === 0)) t.set(i + s, o + l, !0, !0);
          else t.set(i + s, o + l, !1, !0);
    }
  }
  function Eo(t, e) {
    let size = t.size,
      encodedBits = D.getEncodedBits(e),
      i,
      o,
      s;
    for (let l = 0; l < 18; l++)
      ((i = Math.floor(l / 3)),
        (o = (l % 3) + size - 8 - 3),
        (s = ((encodedBits >> l) & 1) === 1),
        t.set(i, o, s, !0),
        t.set(o, i, s, !0));
  }
  function nt(t, e, r) {
    let size = t.size,
      encodedBits = Lr.getEncodedBits(e, r),
      o,
      s;
    for (o = 0; o < 15; o++) {
      if (((s = ((encodedBits >> o) & 1) === 1), o < 6)) t.set(o, 8, s, !0);
      else if (o < 8) t.set(o + 1, 8, s, !0);
      else t.set(size - 15 + o, 8, s, !0);
      if (o < 8) t.set(8, size - o - 1, s, !0);
      else if (o < 9) t.set(8, 15 - o - 1 + 1, s, !0);
      else t.set(8, 15 - o - 1, s, !0);
    }
    t.set(size - 8, 8, 1, !0);
  }
  function To(t, e) {
    let size = t.size,
      n = -1,
      i = size - 1,
      o = 7,
      s = 0;
    for (let l = size - 1; l > 0; l -= 2) {
      if (l === 6) l--;
      while (!0) {
        for (let u = 0; u < 2; u++)
          if (!t.isReserved(i, l - u)) {
            let f = !1;
            if (s < e.length) f = ((e[s] >>> o) & 1) === 1;
            if ((t.set(i, l - u, f), o--, o === -1)) (s++, (o = 7));
          }
        if (((i += n), i < 0 || size <= i)) {
          ((i -= n), (n = -n));
          break;
        }
      }
    }
  }
  function Co(t, e, r) {
    let n = new po();
    r.forEach(function (u) {
      (n.put(u.mode.bit, 4), n.put(u.getLength(), Rr.getCharCountIndicator(u.mode, t)), u.write(n));
    });
    let symbolTotalCodewords = Y.getSymbolTotalCodewords(t),
      totalCodewordsCount = ie.getTotalCodewordsCount(t, e),
      s = (symbolTotalCodewords - totalCodewordsCount) * 8;
    if (n.getLengthInBits() + 4 <= s) n.put(0, 4);
    while (n.getLengthInBits() % 8 !== 0) n.putBit(0);
    let l = (s - n.getLengthInBits()) / 8;
    for (let u = 0; u < l; u++) n.put(u % 2 ? 17 : 236, 8);
    return bo(n, t, e);
  }
  function bo(t, e, r) {
    let symbolTotalCodewords = Y.getSymbolTotalCodewords(e),
      totalCodewordsCount = ie.getTotalCodewordsCount(e, r),
      o = symbolTotalCodewords - totalCodewordsCount,
      blocksCount = ie.getBlocksCount(e, r),
      l = symbolTotalCodewords % blocksCount,
      u = blocksCount - l,
      floored = Math.floor(symbolTotalCodewords / blocksCount),
      floored_2 = Math.floor(o / blocksCount),
      h = floored_2 + 1,
      c = floored - floored_2,
      p = new _o(c),
      _ = 0,
      w = Array(blocksCount),
      m = Array(blocksCount),
      E = 0,
      uint8Array = new Uint8Array(t.buffer);
    for (let V = 0; V < blocksCount; V++) {
      let qe = V < u ? floored_2 : h;
      ((w[V] = uint8Array.slice(_, _ + qe)), (m[V] = p.encode(w[V])), (_ += qe), (E = Math.max(E, qe)));
    }
    let uint8Array_2 = new Uint8Array(symbolTotalCodewords),
      I = 0,
      L,
      O;
    for (L = 0; L < E; L++)
      for (O = 0; O < blocksCount; O++) if (L < w[O].length) uint8Array_2[I++] = w[O][L];
    for (L = 0; L < c; L++) for (O = 0; O < blocksCount; O++) uint8Array_2[I++] = m[O][L];
    return uint8Array_2;
  }
  function xo(t, e, r, n) {
    let i;
    if (Array.isArray(t)) i = re.fromArray(t);
    else if (typeof t === "string") {
      let f = e;
      if (!f) {
        let rawSplit = re.rawSplit(t);
        f = D.getBestVersionForData(rawSplit, r);
      }
      i = re.fromString(t, f || 40);
    } else throw Error("Invalid data");
    let bestVersionForData = D.getBestVersionForData(i, r);
    if (!bestVersionForData) throw Error("The amount of data is too big to be stored in a QR Code");
    if (!e) e = bestVersionForData;
    else if (e < bestVersionForData)
      throw Error(
        `
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: ` +
          bestVersionForData +
          `.
`,
      );
    let s = Co(e, r, i),
      symbolSize = Y.getSymbolSize(e),
      u = new go(symbolSize);
    if ((mo(u, e), yo(u), wo(u, e), nt(u, r, 0), e >= 7)) Eo(u, e);
    if ((To(u, s), isNaN(n))) n = ne.getBestMask(u, nt.bind(null, u, r));
    return (
      ne.applyMask(n, u),
      nt(u, r, n),
      { modules: u, version: e, errorCorrectionLevel: r, maskPattern: n, segments: i }
    );
  }
  Bo.create = function (e, r) {
    if (typeof e > "u" || e === "") throw Error("No input text");
    let n = te.M,
      i,
      o;
    if (typeof r < "u") {
      if (
        ((n = te.from(r.errorCorrectionLevel, te.M)),
        (i = D.from(r.version)),
        (o = ne.from(r.maskPattern)),
        r.toSJISFunc)
      )
        Y.setToSJISFunction(r.toSJISFunc);
    }
    return xo(e, i, n, o);
  };
});

export { it };
