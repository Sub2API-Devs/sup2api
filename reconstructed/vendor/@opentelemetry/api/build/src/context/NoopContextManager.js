/**
 * @opentelemetry/api/build/src/context/NoopContextManager.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_context } from "./context.js";

//@ chunk-bwbq4xvm.js:38181-38464 cjs-fingerprint
var require_NoopContextManager = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.NoopContextManager = undefined;
  var context_1 = require_context();
  class NoopContextManager {
    active() {
      return context_1.ROOT_CONTEXT;
    }
    with(_context, fn, thisArg, ...args) {
      return fn.call(thisArg, ...args);
    }
    bind(_context, target) {
      return target;
    }
    enable() {
      return this;
    }
    disable() {
      return this;
    }
  }
  cjsExports.NoopContextManager = NoopContextManager;
});
export { require_NoopContextManager };
