/**
 * services/analytics/anthropicTelemetryExport.ts
 *
 * 2.1.316 新增：记录 Anthropic 遥测导出失败次数与最后错误；包装导出器：失败只记录，不影响调用方。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (7)
 * attribution: placement 7
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_error_3 } from "../../../vendor/@anthropic-ai/bedrock-sdk/core/error.js";
import { isDiskless } from "../../bootstrap/state.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:659129-659148 placement
var otelSdkModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:659129", () => {
  otelSdkModule = __toESM(require_error_3(), 1);
});
//@ chunk-aepeg2w5.js:659185-659210 placement
function isDisklessHost() {
  return isDiskless();
}
//@ chunk-aepeg2w5.js:659210-659254 placement
var EXPORT_ENVIRONMENTS = ["dry_run", "test_mode", "production"];
//@ chunk-aepeg2w5.js:659254-659272 placement
var otelSdkLogsModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:659254", () => {
  otelSdkLogsModule = __toESM(require_core(), 1);
});
//@ chunk-aepeg2w5.js:659272-659303 placement
/**
 * Anthropic 遥测导出器：环境列表（dry_run/test_mode/production）、失败计数包装与日志前缀。
 */
var TELEMETRY_LOG_PREFIX = "[Anthropic telemetry]";
//@ chunk-aepeg2w5.js:659303-659792 placement
/**
 * 记录 Anthropic 遥测导出失败次数与最后错误。
 */
class ExportFailureCounter {
  pipeline;
  count = 0;
  reportedCount = 0;
  last;
  constructor(pipeline) {
    this.pipeline = pipeline;
  }
  record(error) {
    this.count++;
    this.last = error;
    if (this.count === 1)
      logForDebugging(
        `${TELEMETRY_LOG_PREFIX} ${this.pipeline} export failed (${error}). This is Anthropic's own telemetry pipeline, not your OTel collector; further failures are counted and summarised at shutdown.`,
      );
  }
  logSummary() {
    if (this.count === this.reportedCount) return;
    this.reportedCount = this.count;
    logForDebugging(
      `${TELEMETRY_LOG_PREFIX} ${this.pipeline} export: ${this.count} failure(s) this session (last: ${this.last})`,
    );
  }
}
//@ chunk-aepeg2w5.js:659792-660137 placement
/**
 * 包装导出器：失败只记录，不影响调用方。
 */
function wrapExporterFailures(exporter, summary) {
  let originalExport = exporter.export.bind(exporter);
  let originalForceFlush = exporter.forceFlush?.bind(exporter);
  let originalShutdown = exporter.shutdown.bind(exporter);
  exporter.export = (logs, callback) =>
    originalExport(logs, (result) => {
      if (result.code !== otelSdkLogsModule.ExportResultCode.SUCCESS)
        summary.record(result.error?.message ?? "unknown error");
      callback({
        code: otelSdkLogsModule.ExportResultCode.SUCCESS,
      });
    });
  if (originalForceFlush)
    exporter.forceFlush = async () => {
      await originalForceFlush();
      summary.logSummary();
    };
  exporter.shutdown = async () => {
    await originalShutdown();
    summary.logSummary();
  };
  return exporter;
}
export {
  TELEMETRY_LOG_PREFIX,
  EXPORT_ENVIRONMENTS,
  isDisklessHost,
  ExportFailureCounter,
  otelSdkModule,
  wrapExporterFailures,
};
