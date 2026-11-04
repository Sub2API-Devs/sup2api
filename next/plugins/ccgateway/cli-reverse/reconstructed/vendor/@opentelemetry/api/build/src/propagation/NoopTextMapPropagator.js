/**
 * @opentelemetry/api/build/src/propagation/NoopTextMapPropagator.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:47072-47269 cjs-fingerprint
var require_NoopTextMapPropagator = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.NoopTextMapPropagator = undefined;
  class NoopTextMapPropagator {
    inject(_context, _carrier) {}
    extract(context, _carrier) {
      return context;
    }
    fields() {
      return [];
    }
  }
  cjsExports.NoopTextMapPropagator = NoopTextMapPropagator;
});
export { require_NoopTextMapPropagator };
