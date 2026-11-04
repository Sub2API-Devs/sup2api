/**
 * qrcode/lib/core/finder-pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";

//@ chunk-spjgqa4y.js:2981-3101 cjs-fingerprint
var require_finder_pattern = __commonJS(function (cjsExports) {
  var getSymbolSize = require_utils().getSymbolSize;
  cjsExports.getPositions = function (version) {
    let size = getSymbolSize(version);
    return [
      [0, 0],
      [size - 7, 0],
      [0, size - 7],
    ];
  };
});
export { require_finder_pattern };
