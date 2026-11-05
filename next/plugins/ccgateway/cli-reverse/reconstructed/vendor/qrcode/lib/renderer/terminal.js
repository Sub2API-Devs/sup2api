/**
 * qrcode/lib/renderer/terminal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { qrTerminalRenderer } from "./terminal/terminal.js";
import { qrTerminalSmallRenderer } from "./terminal/terminal-small.js";

//@ chunk-s2h2kd6t.js:54879-55012 cjs-fingerprint
var qrTerminalModule = __commonJS(function (cjsExports) {
  var big = qrTerminalRenderer();
  var small = qrTerminalSmallRenderer();
  cjsExports.render = function (qrData, options, cb) {
    if (options && options.small) return small.render(qrData, options, cb);
    return big.render(qrData, options, cb);
  };
});
export { qrTerminalModule };
