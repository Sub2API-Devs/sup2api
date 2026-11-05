/**
 * jsonwebtoken/lib/asymmetricKeyDetailsSupported.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../semver/index.js";

//@ chunk-b5df2wx1.js:4769-4860 cjs-fingerprint
var require_asymmetricKeyDetailsSupported = __commonJS(function (cjsExports, cjsModule) {
  var semver = require_semver_3();
  cjsModule.exports = semver.satisfies(process.version, ">=15.7.0");
});
export { require_asymmetricKeyDetailsSupported };
