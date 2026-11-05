/**
 * semver/functions/clean.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_parse } from "./parse.js";

//@ chunk-7kayq7nc.js:10481-10612 cjs-fingerprint
var require_clean = __commonJS(function (cjsExports, cjsModule) {
  var parse = require_parse();
  var clean = (version, options) => {
    let s = parse(version.trim().replace(/^[=v]+/, ""), options);
    return s ? s.version : null;
  };
  cjsModule.exports = clean;
});
export { require_clean };
