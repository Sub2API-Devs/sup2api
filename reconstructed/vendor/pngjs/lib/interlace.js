/**
 * pngjs/lib/interlace.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:23141-23814 cjs-fingerprint
var lt = x(function (Ao) {
  var H = [
    { x: [0], y: [0] },
    { x: [4], y: [0] },
    { x: [0, 4], y: [4] },
    { x: [2, 6], y: [0, 4] },
    { x: [0, 2, 4, 6], y: [2, 6] },
    { x: [1, 3, 5, 7], y: [0, 2, 4, 6] },
    { x: [0, 1, 2, 3, 4, 5, 6, 7], y: [1, 3, 5, 7] },
  ];
  Ao.getImagePasses = function (t, e) {
    let r = [],
      n = t % 8,
      i = e % 8,
      o = (t - n) / 8,
      s = (e - i) / 8;
    for (let l = 0; l < H.length; l++) {
      let u = H[l],
        f = o * u.x.length,
        a = s * u.y.length;
      for (let h = 0; h < u.x.length; h++)
        if (u.x[h] < n) f++;
        else break;
      for (let h = 0; h < u.y.length; h++)
        if (u.y[h] < i) a++;
        else break;
      if (f > 0 && a > 0) r.push({ width: f, height: a, index: l });
    }
    return r;
  };
  Ao.getInterlaceIterator = function (t) {
    return function (e, r, n) {
      let i = e % H[n].x.length,
        o = ((e - i) / H[n].x.length) * 8 + H[n].x[i],
        s = r % H[n].y.length,
        l = ((r - s) / H[n].y.length) * 8 + H[n].y[s];
      return o * 4 + l * t * 4;
    };
  };
});

export { lt };
