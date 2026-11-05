/**
 * qrcode/lib/renderer/svg.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_svg_tag } from "./svg-tag.js";

//@ chunk-s2h2kd6t.js:55959-56269 cjs-fingerprint
var require_svg = __commonJS(function (cjsExports) {
  var svgTagRenderer = require_svg_tag();
  cjsExports.render = svgTagRenderer.render;
  cjsExports.renderToFile = function (path, qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    let fs = importMetaRequire("fs");
    let svgText =
      '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
      cjsExports.render(qrData, options);
    fs.writeFile(path, svgText, cb);
  };
});
export { require_svg };
