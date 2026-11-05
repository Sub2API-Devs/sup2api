/**
 * pngjs/lib/png-sync.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_parser_sync } from "./parser-sync.js";
import { require_packer_sync } from "./packer-sync.js";

//@ chunk-s2h2kd6t.js:47987-48112 cjs-fingerprint
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
