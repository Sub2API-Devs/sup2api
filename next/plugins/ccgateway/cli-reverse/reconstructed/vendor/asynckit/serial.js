/**
 * asynckit/serial.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_serialOrdered } from "./serialOrdered.js";

//@ chunk-ww9agm6g.js:7253-7348 cjs-require-graph
var require_serial = __commonJS(function (cjsExports, cjsModule) {
  var serialOrdered = require_serialOrdered();
  cjsModule.exports = serial;
  function serial(list, iterator, callback) {
    return serialOrdered(list, iterator, null, callback);
  }
});
export { require_serial };
