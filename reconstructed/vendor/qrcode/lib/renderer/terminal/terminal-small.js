/**
 * qrcode/lib/renderer/terminal/terminal-small.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:54100-54879 cjs-fingerprint
var qrTerminalSmallRenderer = x(function (cjsExports) {
  var vs = "\x1B[47m\x1B[30m";
  var Vs = "\x1B[40m\x1B[37m";
  var Ks = function (lineSetup, foregroundWhite, foregroundBlack) {
    return {
      "00": "\x1B[0m " + lineSetup,
      "01": "\x1B[0m" + foregroundWhite + "\u2584" + lineSetup,
      "02": "\x1B[0m" + foregroundBlack + "\u2584" + lineSetup,
      10: "\x1B[0m" + foregroundWhite + "\u2580" + lineSetup,
      11: " ",
      12: "\u2584",
      20: "\x1B[0m" + foregroundBlack + "\u2580" + lineSetup,
      21: "\u2580",
      22: "\u2588",
    };
  };
  var mkCodePixel = function (modules, size, x, y) {
    let sizePlus = size + 1;
    if (x >= sizePlus || y >= sizePlus || y < -1 || x < -1) return "0";
    if (x >= size || y >= size || y < 0 || x < 0) return "1";
    let idx = y * size + x;
    return modules[idx] ? "2" : "1";
  };
  var mkCode = function (modules, size, x, y) {
    return mkCodePixel(modules, size, x, y) + mkCodePixel(modules, size, x, y + 1);
  };
  cjsExports.render = function (qrData, options, cb) {
    let size = qrData.modules.size;
    let data = qrData.modules.data;
    let o = !!(options && options.inverse);
    let lineSetup = options && options.inverse ? Vs : vs;
    let palette = Ks(lineSetup, o ? "\x1B[30m" : "\x1B[37m", o ? "\x1B[37m" : "\x1B[30m");
    let newLine =
      `\x1B[0m
` + lineSetup;
    let output = lineSetup;
    for (let y = -1; y < size + 1; y += 2) {
      for (let x = -1; x < size; x++) output += palette[mkCode(data, size, x, y)];
      output += palette[mkCode(data, size, size, y)] + newLine;
    }
    output += "\x1B[0m";
    if (typeof cb === "function") cb(null, output);
    return output;
  };
});
export { qrTerminalSmallRenderer };
