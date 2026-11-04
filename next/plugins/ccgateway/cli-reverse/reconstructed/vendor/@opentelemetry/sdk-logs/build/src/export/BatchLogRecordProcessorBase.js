/**
 * @opentelemetry/sdk-logs/build/src/export/BatchLogRecordProcessorBase.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-aepeg2w5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_core } from "../../../../core/build/src/index.js";

//@ chunk-aepeg2w5.js:656233-656261 esm-layout
var import_api_3 = __toESM(require_api());
var import_core_5 = __toESM(require_core());
//@ chunk-aepeg2w5.js:656261-659093 esm-fingerprint
class BatchLogRecordProcessorBase {
  _exporter;
  _maxExportBatchSize;
  _maxQueueSize;
  _scheduledDelayMillis;
  _exportTimeoutMillis;
  _isExporting = false;
  _finishedLogRecords = [];
  _timer;
  _shutdownOnce;
  constructor(_exporter, config) {
    this._exporter = _exporter;
    this._maxExportBatchSize =
      config?.maxExportBatchSize ?? import_core_5.getNumberFromEnv("OTEL_BLRP_MAX_EXPORT_BATCH_SIZE") ?? 512;
    this._maxQueueSize =
      config?.maxQueueSize ?? import_core_5.getNumberFromEnv("OTEL_BLRP_MAX_QUEUE_SIZE") ?? 2048;
    this._scheduledDelayMillis =
      config?.scheduledDelayMillis ?? import_core_5.getNumberFromEnv("OTEL_BLRP_SCHEDULE_DELAY") ?? 5000;
    this._exportTimeoutMillis =
      config?.exportTimeoutMillis ?? import_core_5.getNumberFromEnv("OTEL_BLRP_EXPORT_TIMEOUT") ?? 30000;
    this._shutdownOnce = new import_core_5.BindOnceFuture(this._shutdown, this);
    if (this._maxExportBatchSize > this._maxQueueSize) {
      import_api_3.diag.warn(
        "BatchLogRecordProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize",
      );
      this._maxExportBatchSize = this._maxQueueSize;
    }
  }
  onEmit(logRecord) {
    if (this._shutdownOnce.isCalled) return;
    this._addToBuffer(logRecord);
  }
  forceFlush() {
    if (this._shutdownOnce.isCalled) return this._shutdownOnce.promise;
    return this._flushAll();
  }
  shutdown() {
    return this._shutdownOnce.call();
  }
  async _shutdown() {
    this.onShutdown();
    await this._flushAll();
    await this._exporter.shutdown();
  }
  _addToBuffer(logRecord) {
    if (this._finishedLogRecords.length >= this._maxQueueSize) return;
    this._finishedLogRecords.push(logRecord);
    this._maybeStartTimer();
  }
  _flushAll() {
    return new Promise((resolve, reject) => {
      let promises = [];
      let batchCount = Math.ceil(this._finishedLogRecords.length / this._maxExportBatchSize);
      for (let i = 0; i < batchCount; i++) promises.push(this._flushOneBatch());
      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch(reject);
    });
  }
  _flushOneBatch() {
    this._clearTimer();
    if (this._finishedLogRecords.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      import_core_5
        .callWithTimeout(
          this._export(this._finishedLogRecords.splice(0, this._maxExportBatchSize)),
          this._exportTimeoutMillis,
        )
        .then(() => resolve())
        .catch(reject);
    });
  }
  _maybeStartTimer() {
    if (this._isExporting) return;
    let flush = () => {
      this._isExporting = true;
      this._flushOneBatch()
        .then(() => {
          this._isExporting = false;
          if (this._finishedLogRecords.length > 0) {
            this._clearTimer();
            this._maybeStartTimer();
          }
        })
        .catch((e) => {
          this._isExporting = false;
          import_core_5.globalErrorHandler(e);
        });
    };
    if (this._finishedLogRecords.length >= this._maxExportBatchSize) return flush();
    if (this._timer !== undefined) return;
    this._timer = setTimeout(() => flush(), this._scheduledDelayMillis);
    if (typeof this._timer !== "number") this._timer.unref();
  }
  _clearTimer() {
    if (this._timer !== undefined) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
  }
  _export(logRecords) {
    let doExport = () =>
      import_core_5.internal
        ._export(this._exporter, logRecords)
        .then((result) => {
          if (result.code !== import_core_5.ExportResultCode.SUCCESS)
            import_core_5.globalErrorHandler(
              result.error ?? Error(`BatchLogRecordProcessor: log record export failed (status ${result})`),
            );
        })
        .catch(import_core_5.globalErrorHandler);
    let pendingResources = logRecords
      .map((logRecord) => logRecord.resource)
      .filter((resource) => resource.asyncAttributesPending);
    if (pendingResources.length === 0) return doExport();
    else
      return Promise.all(pendingResources.map((resource) => resource.waitForAsyncAttributes?.())).then(
        doExport,
        import_core_5.globalErrorHandler,
      );
  }
}
export { BatchLogRecordProcessorBase };
