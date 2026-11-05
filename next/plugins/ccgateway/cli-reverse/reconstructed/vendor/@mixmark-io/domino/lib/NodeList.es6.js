/**
 * @mixmark-io/domino/lib/NodeList.es6.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-w04z664w.js:23412-23571 cjs-fingerprint
var require_NodeList_es6 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = class extends Array {
    constructor(a) {
      super((a && a.length) || 0);
      if (a) for (var idx in a) this[idx] = a[idx];
    }
    item(i) {
      return this[i] || null;
    }
  };
});
export { require_NodeList_es6 };
