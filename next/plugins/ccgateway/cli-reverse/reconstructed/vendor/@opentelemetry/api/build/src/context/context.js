/**
 * @opentelemetry/api/build/src/context/context.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:34777-35270 cjs-fingerprint
var require_context = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ROOT_CONTEXT = cjsExports.createContextKey = undefined;
  function createContextKey(description) {
    return Symbol.for(description);
  }
  cjsExports.createContextKey = createContextKey;
  class BaseContext {
    constructor(parentContext) {
      let selfRef = this;
      selfRef._currentContext = parentContext ? new Map(parentContext) : new Map();
      selfRef.getValue = (key) => selfRef._currentContext.get(key);
      selfRef.setValue = (key, value) => {
        let context = new BaseContext(selfRef._currentContext);
        context._currentContext.set(key, value);
        return context;
      };
      selfRef.deleteValue = (key) => {
        let context = new BaseContext(selfRef._currentContext);
        context._currentContext.delete(key);
        return context;
      };
    }
  }
  cjsExports.ROOT_CONTEXT = new BaseContext();
});
export { require_context };
