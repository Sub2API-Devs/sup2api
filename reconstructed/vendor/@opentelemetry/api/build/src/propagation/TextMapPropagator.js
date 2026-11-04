/**
 * @opentelemetry/api/build/src/propagation/TextMapPropagator.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:37872-38181 cjs-fingerprint
var require_TextMapPropagator = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.defaultTextMapSetter = cjsExports.defaultTextMapGetter = undefined;
  cjsExports.defaultTextMapGetter = {
    get(carrier, key) {
      if (carrier == null) return;
      return carrier[key];
    },
    keys(carrier) {
      if (carrier == null) return [];
      return Object.keys(carrier);
    },
  };
  cjsExports.defaultTextMapSetter = {
    set(carrier, key, value) {
      if (carrier == null) return;
      carrier[key] = value;
    },
  };
});
export { require_TextMapPropagator };
