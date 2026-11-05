/**
 * @opentelemetry/otlp-exporter-base/build/src/otlp-network-export-delegate.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_bounded_queue_export_promise_handler } from "./bounded-queue-export-promise-handler.js";
import { require_otlp_export_delegate } from "./otlp-export-delegate.js";

//@ chunk-vxhm2nqe.js:4924-5266 cjs-fingerprint
var require_otlp_network_export_delegate = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createOtlpNetworkExportDelegate = undefined;
  var bounded_queue_export_promise_handler_1 = require_bounded_queue_export_promise_handler();
  var otlp_export_delegate_1 = require_otlp_export_delegate();
  function createOtlpNetworkExportDelegate(options, serializer, transport) {
    return otlp_export_delegate_1.createOtlpExportDelegate(
      {
        transport,
        serializer,
        promiseHandler:
          bounded_queue_export_promise_handler_1.createBoundedQueueExportPromiseHandler(options),
      },
      {
        timeout: options.timeoutMillis,
      },
    );
  }
  cjsExports.createOtlpNetworkExportDelegate = createOtlpNetworkExportDelegate;
});
export { require_otlp_network_export_delegate };
