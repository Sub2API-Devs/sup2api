/**
 * @grpc/grpc-js/build/src/environment.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:205117-205375 cjs-fingerprint
var require_environment = __commonJS(function (cjsExports) {
  var _a;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.GRPC_NODE_USE_ALTERNATIVE_RESOLVER = undefined;
  cjsExports.GRPC_NODE_USE_ALTERNATIVE_RESOLVER =
    ((_a = process.env.GRPC_NODE_USE_ALTERNATIVE_RESOLVER) !== null && _a !== undefined ? _a : "false") ===
    "true";
});
export { require_environment };
