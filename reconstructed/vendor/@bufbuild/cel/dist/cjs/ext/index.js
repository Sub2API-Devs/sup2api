/**
 * @bufbuild/cel/dist/cjs/ext/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_strings } from "./strings.js";

//@ chunk-fq0cr76a.js:638468-638660 cjs-fingerprint
var require_ext = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.strings = undefined;
  var strings_js_1 = require_strings();
  Object.defineProperty(cjsExports, "strings", {
    enumerable: true,
    get: function () {
      return strings_js_1.default;
    },
  });
});
export { require_ext };
