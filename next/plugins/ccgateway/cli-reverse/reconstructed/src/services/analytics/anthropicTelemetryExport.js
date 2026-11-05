/**
 * services/analytics/anthropicTelemetryExport.ts
 *
 * 2.1.316 新增：记录 Anthropic 遥测导出失败次数与最后错误；包装导出器：失败只记录，不影响调用方。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (7)
 * attribution: placement 7
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_error_3 } from "../../../vendor/@anthropic-ai/bedrock-sdk/core/error.js";
import { isDiskless } from "../../bootstrap/state.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:671735-671754 placement
var otelSdkModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:671735", () => {
  otelSdkModule = __toESM(require_error_3(), 1);
});
//@ chunk-exfmq47h.js:671791-671816 placement
function isDisklessHost() {
  return isDiskless();
}
//@ chunk-exfmq47h.js:671816-671860 placement
var EXPORT_ENVIRONMENTS = ["dry_run", "test_mode", "production"];
//@ chunk-exfmq47h.js:671860-671878 placement
var otelSdkLogsModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:671860", () => {
  otelSdkLogsModule = __toESM(require_core(), 1);
});
//@ chunk-exfmq47h.js:671878-671909 placement
/**
 * Anthropic 遥测导出器：环境列表（dry_run/test_mode/production）、失败计数包装与日志前缀。
 */
var TELEMETRY_LOG_PREFIX = "[Anthropic telemetry]";
//@ chunk-exfmq47h.js:671909-672398 placement
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
//@ chunk-exfmq47h.js:672398-672743 placement
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
  EXPORT_ENVIRONMENTS,
  isDisklessHost,
  TELEMETRY_LOG_PREFIX,
  ExportFailureCounter,
  otelSdkModule,
  wrapExporterFailures,
};
