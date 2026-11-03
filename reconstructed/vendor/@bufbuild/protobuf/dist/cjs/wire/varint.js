/**
 * @bufbuild/protobuf/dist/cjs/wire/varint.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:324123-326473 cjs-require-graph
var Tg = x(function (DN) {
  Object.defineProperty(DN, "__esModule", { value: !0 });
  DN.varint64read = lj;
  DN.varint64write = cj;
  DN.int64FromString = uj;
  DN.int64ToString = dj;
  DN.uInt64ToString = NN;
  DN.varint32write = pj;
  DN.varint32read = hj;
  function lj() {
    let e = 0,
      n = 0;
    for (let s = 0; s < 28; s += 7) {
      let h = this.buf[this.pos++];
      if (((e |= (h & 127) << s), (h & 128) == 0)) return (this.assertBounds(), [e, n]);
    }
    let r = this.buf[this.pos++];
    if (((e |= (r & 15) << 28), (n = (r & 112) >> 4), (r & 128) == 0)) return (this.assertBounds(), [e, n]);
    for (let s = 3; s <= 31; s += 7) {
      let h = this.buf[this.pos++];
      if (((n |= (h & 127) << s), (h & 128) == 0)) return (this.assertBounds(), [e, n]);
    }
    throw Error("invalid varint");
  }
  function cj(e, n, r) {
    for (let y = 0; y < 28; y = y + 7) {
      let b = e >>> y,
        S = !(b >>> 7 == 0 && n == 0),
        w = (S ? b | 128 : b) & 255;
      if ((r.push(w), !S)) return;
    }
    let s = ((e >>> 28) & 15) | ((n & 7) << 4),
      h = n >> 3 != 0;
    if ((r.push((h ? s | 128 : s) & 255), !h)) return;
    for (let y = 3; y < 31; y = y + 7) {
      let b = n >>> y,
        S = b >>> 7 != 0,
        w = (S ? b | 128 : b) & 255;
      if ((r.push(w), !S)) return;
    }
    r.push((n >>> 31) & 1);
  }
  var wg = 4294967296;
  function uj(e) {
    let n = e[0] === "-";
    if (n) e = e.slice(1);
    let r = 1e6,
      s = 0,
      h = 0;
    function y(b, S) {
      let w = Number(e.slice(b, S));
      if (((h *= r), (s = s * r + w), s >= wg)) ((h = h + ((s / wg) | 0)), (s = s % wg));
    }
    return (y(-24, -18), y(-18, -12), y(-12, -6), y(-6), n ? kN(s, h) : Fx(s, h));
  }
  function dj(e, n) {
    let r = Fx(e, n),
      s = r.hi & 2147483648;
    if (s) r = kN(r.lo, r.hi);
    let h = NN(r.lo, r.hi);
    return s ? "-" + h : h;
  }
  function NN(e, n) {
    if ((({ lo: e, hi: n } = fj(e, n)), n <= 2097151)) return String(wg * n + e);
    let r = e & 16777215,
      s = ((e >>> 24) | (n << 8)) & 16777215,
      h = (n >> 16) & 65535,
      y = r + s * 6777216 + h * 6710656,
      b = s + h * 8147497,
      S = h * 2,
      w = 1e7;
    if (y >= w) ((b += Math.floor(y / w)), (y %= w));
    if (b >= w) ((S += Math.floor(b / w)), (b %= w));
    return S.toString() + IN(b) + IN(y);
  }
  function fj(e, n) {
    return { lo: e >>> 0, hi: n >>> 0 };
  }
  function Fx(e, n) {
    return { lo: e | 0, hi: n | 0 };
  }
  function kN(e, n) {
    if (((n = ~n), e)) e = ~e + 1;
    else n += 1;
    return Fx(e, n);
  }
  var IN = (e) => {
    let n = String(e);
    return "0000000".slice(n.length) + n;
  };
  function pj(e, n) {
    if (e >= 0) {
      while (e > 127) (n.push((e & 127) | 128), (e = e >>> 7));
      n.push(e);
    } else {
      for (let r = 0; r < 9; r++) (n.push((e & 127) | 128), (e = e >> 7));
      n.push(1);
    }
  }
  function hj() {
    let e = this.buf[this.pos++],
      n = e & 127;
    if ((e & 128) == 0) return (this.assertBounds(), n);
    if (((e = this.buf[this.pos++]), (n |= (e & 127) << 7), (e & 128) == 0)) return (this.assertBounds(), n);
    if (((e = this.buf[this.pos++]), (n |= (e & 127) << 14), (e & 128) == 0)) return (this.assertBounds(), n);
    if (((e = this.buf[this.pos++]), (n |= (e & 127) << 21), (e & 128) == 0)) return (this.assertBounds(), n);
    ((e = this.buf[this.pos++]), (n |= (e & 15) << 28));
    for (let r = 5; (e & 128) !== 0 && r < 10; r++) e = this.buf[this.pos++];
    if ((e & 128) != 0) throw Error("invalid varint");
    return (this.assertBounds(), n >>> 0);
  }
});

export { Tg };
