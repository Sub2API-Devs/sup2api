/**
 * openid-client/lib/helpers/deep_clone.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1hnjmk23.js:24104-24208 cjs-fingerprint
var require_deep_clone = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = globalThis.structuredClone || ((obj) => JSON.parse(JSON.stringify(obj)));
});
export { require_deep_clone };
