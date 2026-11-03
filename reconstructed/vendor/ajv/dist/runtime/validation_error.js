/**
 * ajv/dist/runtime/validation_error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:51973-52170 cjs-fingerprint
var elr = x(function (In) {
  Object.defineProperty(In, "__esModule", { value: !0 });
  class Rn extends Error {
    constructor(e) {
      super("validation failed");
      ((this.errors = e), (this.ajv = this.validation = !0));
    }
  }
  In.default = Rn;
});

export { elr };
