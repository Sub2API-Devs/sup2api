/**
 * pngjs/lib/format-normaliser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:34044-34825 cjs-fingerprint
var _t = x(function (jl, zr) {
  function Ho(t, e, r, n, i) {
    let o = 0;
    for (let s = 0; s < n; s++)
      for (let l = 0; l < r; l++) {
        let u = i[t[o]];
        if (!u) throw Error("index " + t[o] + " not in palette");
        for (let f = 0; f < 4; f++) e[o + f] = u[f];
        o += 4;
      }
  }
  function zo(t, e, r, n, i) {
    let o = 0;
    for (let s = 0; s < n; s++)
      for (let l = 0; l < r; l++) {
        let u = !1;
        if (i.length === 1) {
          if (i[0] === t[o]) u = !0;
        } else if (i[0] === t[o] && i[1] === t[o + 1] && i[2] === t[o + 2]) u = !0;
        if (u) for (let f = 0; f < 4; f++) e[o + f] = 0;
        o += 4;
      }
  }
  function Go(t, e, r, n, i) {
    let o = 255,
      s = Math.pow(2, i) - 1,
      l = 0;
    for (let u = 0; u < n; u++)
      for (let f = 0; f < r; f++) {
        for (let a = 0; a < 4; a++) e[l + a] = Math.floor((t[l + a] * o) / s + 0.5);
        l += 4;
      }
  }
  zr.exports = function (t, e) {
    let {
        depth: depth,
        width: width,
        height: height,
        colorType: colorType,
        transColor: transColor,
        palette: palette,
      } = e,
      u = t;
    if (colorType === 3) Ho(t, u, width, height, palette);
    else {
      if (transColor) zo(t, u, width, height, transColor);
      if (depth !== 8) {
        if (depth === 16) u = Buffer.alloc(width * height * 4);
        Go(t, u, width, height, depth);
      }
    }
    return u;
  };
});

export { _t };
