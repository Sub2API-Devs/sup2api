/**
 * @opentelemetry/api/build/src/trace/NoopTracerProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_NoopTracer } from "./NoopTracer.js";

//@ chunk-7kayq7nc.js:42879-43071 cjs-fingerprint
var require_NoopTracerProvider = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.NoopTracerProvider = undefined;
  var NoopTracer_1 = require_NoopTracer();
  class NoopTracerProvider {
    getTracer(_name, _version, _options) {
      return new NoopTracer_1.NoopTracer();
    }
  }
  cjsExports.NoopTracerProvider = NoopTracerProvider;
});
export { require_NoopTracerProvider };
