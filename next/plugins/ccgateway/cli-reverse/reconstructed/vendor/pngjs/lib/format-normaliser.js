/**
 * pngjs/lib/format-normaliser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:34044-34825 cjs-fingerprint
var require_format_normaliser = __commonJS(function (cjsExports, cjsModule) {
  function dePalette(indata, outdata, width, height, palette) {
    let pxPos = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        let color = palette[indata[pxPos]];
        if (!color) throw Error("index " + indata[pxPos] + " not in palette");
        for (let i = 0; i < 4; i++) outdata[pxPos + i] = color[i];
        pxPos += 4;
      }
  }
  function replaceTransparentColor(indata, outdata, width, height, transColor) {
    let pxPos = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        let makeTrans = false;
        if (transColor.length === 1) {
          if (transColor[0] === indata[pxPos]) makeTrans = true;
        } else if (
          transColor[0] === indata[pxPos] &&
          transColor[1] === indata[pxPos + 1] &&
          transColor[2] === indata[pxPos + 2]
        )
          makeTrans = true;
        if (makeTrans) for (let i = 0; i < 4; i++) outdata[pxPos + i] = 0;
        pxPos += 4;
      }
  }
  function scaleDepth(indata, outdata, width, height, depth) {
    let maxOutSample = 255;
    let maxInSample = Math.pow(2, depth) - 1;
    let pxPos = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        for (let i = 0; i < 4; i++)
          outdata[pxPos + i] = Math.floor((indata[pxPos + i] * maxOutSample) / maxInSample + 0.5);
        pxPos += 4;
      }
  }
  cjsModule.exports = function (indata, frame) {
    let { depth, width, height, colorType, transColor, palette } = frame;
    let outdata = indata;
    if (colorType === 3) dePalette(indata, outdata, width, height, palette);
    else {
      if (transColor) replaceTransparentColor(indata, outdata, width, height, transColor);
      if (depth !== 8) {
        if (depth === 16) outdata = Buffer.alloc(width * height * 4);
        scaleDepth(indata, outdata, width, height, depth);
      }
    }
    return outdata;
  };
});
export { require_format_normaliser };
