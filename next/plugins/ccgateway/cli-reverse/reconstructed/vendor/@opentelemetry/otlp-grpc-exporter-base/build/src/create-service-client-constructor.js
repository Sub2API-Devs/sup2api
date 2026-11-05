/**
 * @opentelemetry/otlp-grpc-exporter-base/build/src/create-service-client-constructor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-grpc-exporter-base@0.208.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_grpc_js } from "../../../../@grpc/grpc-js/build/src/index.js";

//@ chunk-3k21nfa0.js:385561-385939 cjs-fingerprint
var require_create_service_client_constructor = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createServiceClientConstructor = undefined;
  var grpc = require_grpc_js();
  function createServiceClientConstructor(path, name) {
    return grpc.makeGenericClientConstructor(
      {
        export: {
          path,
          requestStream: false,
          responseStream: false,
          requestSerialize: (arg) => arg,
          requestDeserialize: (arg) => arg,
          responseSerialize: (arg) => arg,
          responseDeserialize: (arg) => arg,
        },
      },
      name,
    );
  }
  cjsExports.createServiceClientConstructor = createServiceClientConstructor;
});
export { require_create_service_client_constructor };
