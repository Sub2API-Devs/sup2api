/**
 * qrcode/lib/renderer/terminal/terminal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:53699-54100 cjs-fingerprint
var qrTerminalRenderer = __commonJS(function (cjsExports) {
  cjsExports.render = function (qrData, options, cb) {
    let size = qrData.modules.size;
    let data = qrData.modules.data;
    let black = "\x1B[40m  \x1B[0m";
    let white = "\x1B[47m  \x1B[0m";
    let output = "";
    let hMargin = Array(size + 3).join("\x1B[47m  \x1B[0m");
    let vMargin = Array(2).join("\x1B[47m  \x1B[0m");
    output +=
      hMargin +
      `
`;
    for (let i = 0; i < size; ++i) {
      output += "\x1B[47m  \x1B[0m";
      for (let j = 0; j < size; j++) output += data[i * size + j] ? "\x1B[40m  \x1B[0m" : "\x1B[47m  \x1B[0m";
      output +=
        vMargin +
        `
`;
    }
    output +=
      hMargin +
      `
`;
    if (typeof cb === "function") cb(null, output);
    return output;
  };
});
export { qrTerminalRenderer };
