/**
 * @typespec/ts-http-runtime/dist/esm/restError.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (6)
 * attribution: esm-layout 2, esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Sanitizer, custom } from "./util/sanitizer.js";
import { isError } from "./util/error.js";

//@ chunk-b5df2wx1.js:37067-37081 esm-layout
var errorSanitizer = new Sanitizer();
//@ chunk-b5df2wx1.js:37081-37573 esm-fingerprint
class RestError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "RestError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    Object.defineProperty(this, "request", {
      value: options.request,
      enumerable: false,
    });
    Object.defineProperty(this, "response", {
      value: options.response,
      enumerable: false,
    });
    Object.defineProperty(this, custom, {
      value: () => `RestError: ${this.message} 
 ${errorSanitizer.sanitize(
   Object.assign(Object.assign({}, this), {
     request: this.request,
     response: this.response,
   }),
 )}`,
      enumerable: false,
    });
    Object.setPrototypeOf(this, RestError.prototype);
  }
}
//@ chunk-b5df2wx1.js:37573-37616 esm-fingerprint
RestError.REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR";
//@ chunk-b5df2wx1.js:37616-37645 esm-fingerprint
RestError.PARSE_ERROR = "PARSE_ERROR";
//@ chunk-b5df2wx1.js:37645-37723 esm-fingerprint
function isRestError(error) {
  if (error instanceof RestError) return true;
  return isError(error) && error.name === "RestError";
}
//@ chunk-b5df2wx1.js:37832-37903 esm-layout
class AbortError_2 extends Error {
  constructor(message) {
    super(message);
    this.name = "AbortError";
  }
}
export { AbortError_2, RestError, isRestError };
