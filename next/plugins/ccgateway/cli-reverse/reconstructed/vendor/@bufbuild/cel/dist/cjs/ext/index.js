/**
 * @bufbuild/cel/dist/cjs/ext/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_strings } from "./strings.js";

//@ chunk-qg41pqt6.js:639046-639238 cjs-fingerprint
var require_ext = __commonJS(function (cjsExports) {
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
