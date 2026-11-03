/**
 * qrcode/lib/renderer/svg.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { Bt } from "./svg-tag.js";

//@ chunk-spjgqa4y.js:55959-56269 cjs-fingerprint
var Kn = x(function (vn) {
  var Gn = Bt();
  vn.render = Gn.render;
  vn.renderToFile = function (e, r, n, i) {
    if (typeof i > "u") ((i = n), (n = void 0));
    let o = importMetaRequire("fs"),
      l =
        '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
        vn.render(r, n);
    o.writeFile(e, l, i);
  };
});

export { Kn };
