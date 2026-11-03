/**
 * qrcode/lib/core/alignment-pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { N } from "./utils.js";

//@ chunk-spjgqa4y.js:2536-2981 cjs-fingerprint
var Dt = x(function (ci) {
  var getSymbolSize = N().getSymbolSize;
  ci.getRowColCoords = function (e) {
    if (e === 1) return [];
    let r = Math.floor(e / 7) + 2,
      n = getSymbolSize(e),
      i = n === 145 ? 26 : Math.ceil((n - 13) / (2 * r - 2)) * 2,
      o = [n - 7];
    for (let s = 1; s < r - 1; s++) o[s] = o[s - 1] - i;
    return (o.push(6), o.reverse());
  };
  ci.getPositions = function (e) {
    let r = [],
      rowColCoords = ci.getRowColCoords(e),
      i = rowColCoords.length;
    for (let o = 0; o < i; o++)
      for (let s = 0; s < i; s++) {
        if ((o === 0 && s === 0) || (o === 0 && s === i - 1) || (o === i - 1 && s === 0)) continue;
        r.push([rowColCoords[o], rowColCoords[s]]);
      }
    return r;
  };
});

export { Dt };
