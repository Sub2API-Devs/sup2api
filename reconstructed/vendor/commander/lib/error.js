/**
 * commander/lib/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-b7dyevzy.js:304-707 cjs-fingerprint
var b = x(function (et) {
  class V extends Error {
    constructor(t, e, i) {
      super(i);
      (Error.captureStackTrace(this, this.constructor),
        (this.name = this.constructor.name),
        (this.code = e),
        (this.exitCode = t),
        (this.nestedError = void 0));
    }
  }
  class W extends V {
    constructor(t) {
      super(1, "commander.invalidArgument", t);
      (Error.captureStackTrace(this, this.constructor), (this.name = this.constructor.name));
    }
  }
  et.CommanderError = V;
  et.InvalidArgumentError = W;
});

export { b };
