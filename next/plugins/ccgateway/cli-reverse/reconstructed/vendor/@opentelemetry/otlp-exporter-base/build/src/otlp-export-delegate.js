/**
 * @opentelemetry/otlp-exporter-base/build/src/otlp-export-delegate.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../core/build/src/index.js";
import { require_types } from "./types.js";
import { require_logging_response_handler } from "./logging-response-handler.js";
import { require_api } from "../../../api/build/src/index.js";

//@ chunk-vxhm2nqe.js:3069-4924 cjs-fingerprint
var require_otlp_export_delegate = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createOtlpExportDelegate = undefined;
  var core_1 = require_core();
  var types_1 = require_types();
  var logging_response_handler_1 = require_logging_response_handler();
  var api_1 = require_api();
  class OTLPExportDelegate {
    _transport;
    _serializer;
    _responseHandler;
    _promiseQueue;
    _timeout;
    _diagLogger;
    constructor(_transport, _serializer, _responseHandler, _promiseQueue, _timeout) {
      this._transport = _transport;
      this._serializer = _serializer;
      this._responseHandler = _responseHandler;
      this._promiseQueue = _promiseQueue;
      this._timeout = _timeout;
      this._diagLogger = api_1.diag.createComponentLogger({
        namespace: "OTLPExportDelegate",
      });
    }
    export(internalRepresentation, resultCallback) {
      this._diagLogger.debug("items to be sent", internalRepresentation);
      if (this._promiseQueue.hasReachedLimit()) {
        resultCallback({
          code: core_1.ExportResultCode.FAILED,
          error: Error("Concurrent export limit reached"),
        });
        return;
      }
      let serializedRequest = this._serializer.serializeRequest(internalRepresentation);
      if (serializedRequest == null) {
        resultCallback({
          code: core_1.ExportResultCode.FAILED,
          error: Error("Nothing to send"),
        });
        return;
      }
      this._promiseQueue.pushPromise(
        this._transport.send(serializedRequest, this._timeout).then(
          (response) => {
            if (response.status === "success") {
              if (response.data != null)
                try {
                  this._responseHandler.handleResponse(this._serializer.deserializeResponse(response.data));
                } catch (e) {
                  this._diagLogger.warn(
                    "Export succeeded but could not deserialize response - is the response specification compliant?",
                    e,
                    response.data,
                  );
                }
              resultCallback({
                code: core_1.ExportResultCode.SUCCESS,
              });
              return;
            } else if (response.status === "failure" && response.error) {
              resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: response.error,
              });
              return;
            } else if (response.status === "retryable")
              resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: new types_1.OTLPExporterError("Export failed with retryable status"),
              });
            else
              resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: new types_1.OTLPExporterError("Export failed with unknown error"),
              });
          },
          (reason) =>
            resultCallback({
              code: core_1.ExportResultCode.FAILED,
              error: reason,
            }),
        ),
      );
    }
    forceFlush() {
      return this._promiseQueue.awaitAll();
    }
    async shutdown() {
      this._diagLogger.debug("shutdown started");
      await this.forceFlush();
      this._transport.shutdown();
    }
  }
  function createOtlpExportDelegate(components, settings) {
    return new OTLPExportDelegate(
      components.transport,
      components.serializer,
      logging_response_handler_1.createLoggingPartialSuccessResponseHandler(),
      components.promiseHandler,
      settings.timeout,
    );
  }
  cjsExports.createOtlpExportDelegate = createOtlpExportDelegate;
});
export { require_otlp_export_delegate };
