/**
 * pngjs/lib/png-sync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_parser_sync } from "./parser-sync.js";
import { require_packer_sync } from "./packer-sync.js";

//@ chunk-spjgqa4y.js:47987-48112 cjs-fingerprint
var require_png_sync = __commonJS(function (cjsExports) {
  var parse = require_parser_sync();
  var pack = require_packer_sync();
  cjsExports.read = function (buffer, options) {
    return parse(buffer, options || {});
  };
  cjsExports.write = function (png, options) {
    return pack(png, options);
  };
});
export { require_png_sync };
