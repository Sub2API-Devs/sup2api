/**
 * @opentelemetry/api/build/src/context-api.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_context_2 } from "./api/context.js";

//@ chunk-7kayq7nc.js:45976-46119 cjs-fingerprint
var require_context_api = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.context = undefined;
  var context_1 = require_context_2();
  cjsExports.context = context_1.ContextAPI.getInstance();
});
export { require_context_api };
