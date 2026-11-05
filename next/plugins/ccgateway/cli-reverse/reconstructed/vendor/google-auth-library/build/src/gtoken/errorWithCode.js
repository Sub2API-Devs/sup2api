/**
 * google-auth-library/build/src/gtoken/errorWithCode.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:86744-86929 cjs-fingerprint
var require_errorWithCode = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ErrorWithCode = undefined;
  class ErrorWithCode extends Error {
    code;
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  }
  cjsExports.ErrorWithCode = ErrorWithCode;
});
export { require_errorWithCode };
