/**
 * qrcode/lib/core/alignment-pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";

//@ chunk-spjgqa4y.js:2536-2981 cjs-fingerprint
var require_alignment_pattern = __commonJS(function (cjsExports) {
  var getSymbolSize = require_utils().getSymbolSize;
  cjsExports.getRowColCoords = function (version) {
    if (version === 1) return [];
    let posCount = Math.floor(version / 7) + 2;
    let size = getSymbolSize(version);
    let intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
    let positions = [size - 7];
    for (let i = 1; i < posCount - 1; i++) positions[i] = positions[i - 1] - intervals;
    positions.push(6);
    return positions.reverse();
  };
  cjsExports.getPositions = function (version) {
    let coords = [];
    let pos = cjsExports.getRowColCoords(version);
    let posLength = pos.length;
    for (let i = 0; i < posLength; i++)
      for (let j = 0; j < posLength; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === posLength - 1) || (i === posLength - 1 && j === 0))
          continue;
        coords.push([pos[i], pos[j]]);
      }
    return coords;
  };
});
export { require_alignment_pattern };
