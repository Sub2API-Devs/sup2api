/**
 * qrcode/lib/core/version-check.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:7990-8067 cjs-fingerprint
var require_version_check = __commonJS(function (cjsExports) {
  cjsExports.isValid = function (version) {
    return !isNaN(version) && version >= 1 && version <= 40;
  };
});
export { require_version_check };
