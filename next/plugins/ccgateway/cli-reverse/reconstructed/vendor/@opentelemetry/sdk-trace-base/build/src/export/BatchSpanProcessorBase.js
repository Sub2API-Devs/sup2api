/**
 * @opentelemetry/sdk-trace-base/build/src/export/BatchSpanProcessorBase.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_core } from "../../../../core/build/src/index.js";

//@ chunk-3wgj3rdg.js:16143-16169 esm-layout
var import_api_7 = __toESM(require_api());
var import_core_9 = __toESM(require_core());
//@ chunk-3wgj3rdg.js:16169-19635 esm-fingerprint
class BatchSpanProcessorBase {
  _exporter;
  _maxExportBatchSize;
  _maxQueueSize;
  _scheduledDelayMillis;
  _exportTimeoutMillis;
  _isExporting = false;
  _finishedSpans = [];
  _timer;
  _shutdownOnce;
  _droppedSpansCount = 0;
  constructor(_exporter, config) {
    this._exporter = _exporter;
    this._maxExportBatchSize =
      typeof config?.maxExportBatchSize === "number"
        ? config.maxExportBatchSize
        : (import_core_9.getNumberFromEnv("OTEL_BSP_MAX_EXPORT_BATCH_SIZE") ?? 512);
    this._maxQueueSize =
      typeof config?.maxQueueSize === "number"
        ? config.maxQueueSize
        : (import_core_9.getNumberFromEnv("OTEL_BSP_MAX_QUEUE_SIZE") ?? 2048);
    this._scheduledDelayMillis =
      typeof config?.scheduledDelayMillis === "number"
        ? config.scheduledDelayMillis
        : (import_core_9.getNumberFromEnv("OTEL_BSP_SCHEDULE_DELAY") ?? 5000);
    this._exportTimeoutMillis =
      typeof config?.exportTimeoutMillis === "number"
        ? config.exportTimeoutMillis
        : (import_core_9.getNumberFromEnv("OTEL_BSP_EXPORT_TIMEOUT") ?? 30000);
    this._shutdownOnce = new import_core_9.BindOnceFuture(this._shutdown, this);
    if (this._maxExportBatchSize > this._maxQueueSize) {
      import_api_7.diag.warn(
        "BatchSpanProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize",
      );
      this._maxExportBatchSize = this._maxQueueSize;
    }
  }
  forceFlush() {
    if (this._shutdownOnce.isCalled) return this._shutdownOnce.promise;
    return this._flushAll();
  }
  onStart(_span, _parentContext) {}
  onEnd(span) {
    if (this._shutdownOnce.isCalled) return;
    if ((span.spanContext().traceFlags & import_api_7.TraceFlags.SAMPLED) === 0) return;
    this._addToBuffer(span);
  }
  shutdown() {
    return this._shutdownOnce.call();
  }
  _shutdown() {
    return Promise.resolve()
      .then(() => this.onShutdown())
      .then(() => this._flushAll())
      .then(() => this._exporter.shutdown());
  }
  _addToBuffer(span) {
    if (this._finishedSpans.length >= this._maxQueueSize) {
      if (this._droppedSpansCount === 0) import_api_7.diag.debug("maxQueueSize reached, dropping spans");
      this._droppedSpansCount++;
      return;
    }
    if (this._droppedSpansCount > 0) {
      import_api_7.diag.warn(`Dropped ${this._droppedSpansCount} spans because maxQueueSize reached`);
      this._droppedSpansCount = 0;
    }
    this._finishedSpans.push(span);
    this._maybeStartTimer();
  }
  _flushAll() {
    return new Promise((resolve, reject) => {
      let promises = [];
      let count = Math.ceil(this._finishedSpans.length / this._maxExportBatchSize);
      for (let i = 0, j = count; i < j; i++) promises.push(this._flushOneBatch());
      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch(reject);
    });
  }
  _flushOneBatch() {
    this._clearTimer();
    if (this._finishedSpans.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let timer = setTimeout(() => {
        reject(Error("Timeout"));
      }, this._exportTimeoutMillis);
      import_api_7.context.with(import_core_9.suppressTracing(import_api_7.context.active()), () => {
        let spans;
        if (this._finishedSpans.length <= this._maxExportBatchSize) {
          spans = this._finishedSpans;
          this._finishedSpans = [];
        } else spans = this._finishedSpans.splice(0, this._maxExportBatchSize);
        let doExport = () =>
          this._exporter.export(spans, (result) => {
            clearTimeout(timer);
            if (result.code === import_core_9.ExportResultCode.SUCCESS) resolve();
            else reject(result.error ?? Error("BatchSpanProcessor: span export failed"));
          });
        let pendingResources = null;
        for (let i = 0, len = spans.length; i < len; i++) {
          let span = spans[i];
          if (span.resource.asyncAttributesPending && span.resource.waitForAsyncAttributes) {
            pendingResources ??= [];
            pendingResources.push(span.resource.waitForAsyncAttributes());
          }
        }
        if (pendingResources === null) doExport();
        else
          Promise.all(pendingResources).then(doExport, (err) => {
            import_core_9.globalErrorHandler(err);
            reject(err);
          });
      });
    });
  }
  _maybeStartTimer() {
    if (this._isExporting) return;
    let flush = () => {
      this._isExporting = true;
      this._flushOneBatch()
        .finally(() => {
          this._isExporting = false;
          if (this._finishedSpans.length > 0) {
            this._clearTimer();
            this._maybeStartTimer();
          }
        })
        .catch((e) => {
          this._isExporting = false;
          import_core_9.globalErrorHandler(e);
        });
    };
    if (this._finishedSpans.length >= this._maxExportBatchSize) return flush();
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
}
export { BatchSpanProcessorBase };
