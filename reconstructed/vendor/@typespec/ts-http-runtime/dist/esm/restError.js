/**
 * @typespec/ts-http-runtime/dist/esm/restError.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (6)
 * attribution: esm-layout 2, esm-fingerprint 4
 */
import { Sanitizer, custom } from "./util/sanitizer.js";
import { tr } from "./util/error.js";

//@ chunk-mrx6y2r5.js:37067-37081 esm-layout
var errorSanitizer = new Sanitizer();
//@ chunk-mrx6y2r5.js:37081-37573 esm-fingerprint
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
//@ chunk-mrx6y2r5.js:37573-37616 esm-fingerprint
RestError.REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR";
//@ chunk-mrx6y2r5.js:37616-37645 esm-fingerprint
RestError.PARSE_ERROR = "PARSE_ERROR";
//@ chunk-mrx6y2r5.js:37645-37723 esm-fingerprint
function isRestError(e) {
  if (e instanceof RestError) return true;
  return tr(e) && e.name === "RestError";
}
//@ chunk-mrx6y2r5.js:37832-37903 esm-layout
class AbortError_2 extends Error {
  constructor(message) {
    super(message);
    this.name = "AbortError";
  }
}
export { AbortError_2, RestError, isRestError };
