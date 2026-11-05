/**
 * commander/lib/error.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-ardnz7sf.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-ardnz7sf.js:304-707 cjs-fingerprint
var require_error = __commonJS(function (cjsExports) {
  class CommanderError extends Error {
    constructor(exitCode, code, message) {
      super(message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.code = code;
      this.exitCode = exitCode;
      this.nestedError = undefined;
    }
  }
  class InvalidArgumentError extends CommanderError {
    constructor(message) {
      super(1, "commander.invalidArgument", message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
    }
  }
  cjsExports.CommanderError = CommanderError;
  cjsExports.InvalidArgumentError = InvalidArgumentError;
});
export { require_error };
