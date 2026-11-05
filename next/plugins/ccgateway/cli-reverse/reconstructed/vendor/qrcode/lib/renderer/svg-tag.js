/**
 * qrcode/lib/renderer/svg-tag.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils_2 } from "./utils.js";

//@ chunk-s2h2kd6t.js:55012-55959 cjs-fingerprint
var require_svg_tag = __commonJS(function (cjsExports) {
  var Utils = require_utils_2();
  function getColorAttrib(color, attrib) {
    let alpha = color.a / 255;
    let str = attrib + '="' + color.hex + '"';
    return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
  }
  function svgCmd(cmd, x, y) {
    let str = cmd + x;
    if (typeof y !== "undefined") str += " " + y;
    return str;
  }
  function qrToPath(data, size, margin) {
    let path = "";
    let moveBy = 0;
    let newRow = false;
    let lineLength = 0;
    for (let i = 0; i < data.length; i++) {
      let col = Math.floor(i % size);
      let row = Math.floor(i / size);
      if (!col && !newRow) newRow = true;
      if (data[i]) {
        lineLength++;
        if (!(i > 0 && col > 0 && data[i - 1])) {
          path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
          moveBy = 0;
          newRow = false;
        }
        if (!(col + 1 < size && data[i + 1])) {
          path += svgCmd("h", lineLength);
          lineLength = 0;
        }
      } else moveBy++;
    }
    return path;
  }
  cjsExports.render = function (qrData, options, cb) {
    let opts = Utils.getOptions(options);
    let size = qrData.modules.size;
    let data = qrData.modules.data;
    let qrcodesize = size + opts.margin * 2;
    let bg = !opts.color.light.a
      ? ""
      : "<path " +
        getColorAttrib(opts.color.light, "fill") +
        ' d="M0 0h' +
        qrcodesize +
        "v" +
        qrcodesize +
        'H0z"/>';
    let path =
      "<path " +
      getColorAttrib(opts.color.dark, "stroke") +
      ' d="' +
      qrToPath(data, size, opts.margin) +
      '"/>';
    let viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
    let svgTag =
      '<svg xmlns="http://www.w3.org/2000/svg" ' +
      (!opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ') +
      viewBox +
      ' shape-rendering="crispEdges">' +
      bg +
      path +
      `</svg>
`;
    if (typeof cb === "function") cb(null, svgTag);
    return svgTag;
  };
});
export { require_svg_tag };
