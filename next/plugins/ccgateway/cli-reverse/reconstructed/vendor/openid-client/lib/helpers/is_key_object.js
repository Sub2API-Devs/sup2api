/**
 * openid-client/lib/helpers/is_key_object.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-1hnjmk23.js:7540-7671 cjs-fingerprint
var require_is_key_object = __commonJS(function (cjsExports, cjsModule) {
  var util = importMetaRequire("util");
  var nodeCrypto = importMetaRequire("crypto");
  cjsModule.exports = util.types.isKeyObject || ((obj) => obj && obj instanceof nodeCrypto.KeyObject);
});
export { require_is_key_object };
