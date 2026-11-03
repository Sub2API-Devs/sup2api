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
import { Re } from "../../../runtime/bun-runtime.js";
import { require_error_3 } from "../../../vendor/@anthropic-ai/bedrock-sdk/core/error.js";
import { isDiskless } from "../../bootstrap/state.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-aepeg2w5.js:659129-659148 placement
var otelSdkModule = Re(require_error_3(), 1);
//@ chunk-aepeg2w5.js:659185-659210 placement
function isDisklessHost() {
  return isDiskless();
}
//@ chunk-aepeg2w5.js:659210-659254 placement
var EXPORT_ENVIRONMENTS = ["dry_run", "test_mode", "production"];
//@ chunk-aepeg2w5.js:659254-659272 placement
var otelSdkLogsModule = Re(require_core(), 1);
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
  record(e) {
    this.count++;
    this.last = e;
    if (this.count === 1)
      logForDebugging(
        `${TELEMETRY_LOG_PREFIX} ${this.pipeline} export failed (${e}). This is Anthropic's own telemetry pipeline, not your OTel collector; further failures are counted and summarised at shutdown.`,
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
function wrapExporterFailures(e, n) {
  let r = e.export.bind(e);
  let s = e.forceFlush?.bind(e);
  let h = e.shutdown.bind(e);
  e.export = (y, S) =>
    r(y, (w) => {
      if (w.code !== otelSdkLogsModule.ExportResultCode.SUCCESS)
        n.record(w.error?.message ?? "unknown error");
      S({
        code: otelSdkLogsModule.ExportResultCode.SUCCESS,
      });
    });
  if (s)
    e.forceFlush = async () => {
      await s();
      n.logSummary();
    };
  e.shutdown = async () => {
    await h();
    n.logSummary();
  };
  return e;
}
export {
  TELEMETRY_LOG_PREFIX,
  EXPORT_ENVIRONMENTS,
  isDisklessHost,
  ExportFailureCounter,
  otelSdkModule,
  wrapExporterFailures,
};
