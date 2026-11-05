/**
 * @opentelemetry/otlp-exporter-base/build/src/otlp-http-export-delegate.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_otlp_export_delegate } from "./otlp-export-delegate.js";
import { require_http_exporter_transport } from "./transport/http-exporter-transport.js";
import { require_bounded_queue_export_promise_handler } from "./bounded-queue-export-promise-handler.js";
import { require_retrying_transport } from "./retrying-transport.js";

//@ chunk-vxhm2nqe.js:261456-261878 cjs-fingerprint
var require_otlp_http_export_delegate = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createOtlpHttpExportDelegate = undefined;
  var otlp_export_delegate_1 = require_otlp_export_delegate();
  var http_exporter_transport_1 = require_http_exporter_transport();
  var bounded_queue_export_promise_handler_1 = require_bounded_queue_export_promise_handler();
  var retrying_transport_1 = require_retrying_transport();
  function createOtlpHttpExportDelegate(options, serializer) {
    return otlp_export_delegate_1.createOtlpExportDelegate(
      {
        transport: retrying_transport_1.createRetryingTransport({
          transport: http_exporter_transport_1.createHttpExporterTransport(options),
        }),
        serializer,
        promiseHandler:
          bounded_queue_export_promise_handler_1.createBoundedQueueExportPromiseHandler(options),
      },
      {
        timeout: options.timeoutMillis,
      },
    );
  }
  cjsExports.createOtlpHttpExportDelegate = createOtlpHttpExportDelegate;
});
export { require_otlp_http_export_delegate };
