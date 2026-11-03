/**
 * qrcode/lib/core/finder-pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { N } from "./utils.js";

//@ chunk-spjgqa4y.js:2981-3101 cjs-fingerprint
var Yt = x(function (gi) {
  var getSymbolSize = N().getSymbolSize;
  gi.getPositions = function (e) {
    let r = getSymbolSize(e);
    return [
      [0, 0],
      [r - 7, 0],
      [0, r - 7],
    ];
  };
});

export { Yt };
