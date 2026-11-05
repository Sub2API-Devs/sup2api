/**
 * @grpc/grpc-js/build/src/error.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:5985-6294 cjs-fingerprint
var require_error = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getErrorMessage = getErrorMessage;
  cjsExports.getErrorCode = getErrorCode;
  function getErrorMessage(error) {
    if (error instanceof Error) return error.message;
    else return String(error);
  }
  function getErrorCode(error) {
    if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "number")
      return error.code;
    else return null;
  }
});
export { require_error };
