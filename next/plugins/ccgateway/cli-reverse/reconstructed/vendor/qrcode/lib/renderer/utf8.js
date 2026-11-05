/**
 * qrcode/lib/renderer/utf8.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_utils_2 } from "./utils.js";

//@ chunk-s2h2kd6t.js:52922-53699 cjs-fingerprint
var require_utf8 = __commonJS(function (cjsExports) {
  var Utils = require_utils_2();
  var BLOCK_CHAR = {
    WW: " ",
    WB: "\u2584",
    BB: "\u2588",
    BW: "\u2580",
  };
  var INVERTED_BLOCK_CHAR = {
    BB: " ",
    BW: "\u2584",
    WW: "\u2588",
    WB: "\u2580",
  };
  function getBlockChar(top, bottom, blocks) {
    if (top && bottom) return blocks.BB;
    if (top && !bottom) return blocks.BW;
    if (!top && bottom) return blocks.WB;
    return blocks.WW;
  }
  cjsExports.render = function (qrData, options, cb) {
    let opts = Utils.getOptions(options);
    let blocks = BLOCK_CHAR;
    if (opts.color.dark.hex === "#ffffff" || opts.color.light.hex === "#000000") blocks = INVERTED_BLOCK_CHAR;
    let size = qrData.modules.size;
    let data = qrData.modules.data;
    let output = "";
    let hMargin = Array(size + opts.margin * 2 + 1).join(blocks.WW);
    hMargin = Array(opts.margin / 2 + 1).join(
      hMargin +
        `
`,
    );
    let vMargin = Array(opts.margin + 1).join(blocks.WW);
    output += hMargin;
    for (let i = 0; i < size; i += 2) {
      output += vMargin;
      for (let j = 0; j < size; j++) {
        let topModule = data[i * size + j];
        let bottomModule = data[(i + 1) * size + j];
        output += getBlockChar(topModule, bottomModule, blocks);
      }
      output +=
        vMargin +
        `
`;
    }
    output += hMargin.slice(0, -1);
    if (typeof cb === "function") cb(null, output);
    return output;
  };
  cjsExports.renderToFile = function (path, qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    let fs = importMetaRequire("fs");
    let utf8 = cjsExports.render(qrData, options);
    fs.writeFile(path, utf8, cb);
  };
});
export { require_utf8 };
