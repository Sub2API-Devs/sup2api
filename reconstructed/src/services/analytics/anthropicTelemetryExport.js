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
import { p3e } from "../../../vendor/@anthropic-ai/bedrock-sdk/core/error.js";
import { isDiskless } from "../../bootstrap/state.js";
import { Qm } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-aepeg2w5.js:659129-659148 placement
var xd = Re(p3e(), 1);
//@ chunk-aepeg2w5.js:659185-659210 placement
function Mo() {
  return isDiskless();
}
//@ chunk-aepeg2w5.js:659210-659254 placement
var bR = ["dry_run", "test_mode", "production"];
//@ chunk-aepeg2w5.js:659254-659272 placement
var sg = Re(Qm(), 1);
//@ chunk-aepeg2w5.js:659272-659303 placement
var X3 = "[Anthropic telemetry]";
/**
 * 记录 Anthropic 遥测导出失败次数与最后错误。
 */
//@ chunk-aepeg2w5.js:659303-659792 placement
class ExportFailureCounter {
  pipeline;
  count = 0;
  reportedCount = 0;
  last;
  constructor(e) {
    this.pipeline = e;
  }
  record(e) {
    if ((this.count++, (this.last = e), this.count === 1))
      logForDebugging(
        `${X3} ${this.pipeline} export failed (${e}). This is Anthropic's own telemetry pipeline, not your OTel collector; further failures are counted and summarised at shutdown.`,
      );
  }
  logSummary() {
    if (this.count === this.reportedCount) return;
    ((this.reportedCount = this.count),
      logForDebugging(
        `${X3} ${this.pipeline} export: ${this.count} failure(s) this session (last: ${this.last})`,
      ));
  }
}
/**
 * 包装导出器：失败只记录，不影响调用方。
 */
//@ chunk-aepeg2w5.js:659792-660137 placement
function wrapExporterFailures(e, n) {
  let r = e.export.bind(e),
    s = e.forceFlush?.bind(e),
    h = e.shutdown.bind(e);
  if (
    ((e.export = (y, S) =>
      r(y, (w) => {
        if (w.code !== sg.ExportResultCode.SUCCESS) n.record(w.error?.message ?? "unknown error");
        S({ code: sg.ExportResultCode.SUCCESS });
      })),
    s)
  )
    e.forceFlush = async () => {
      (await s(), n.logSummary());
    };
  return (
    (e.shutdown = async () => {
      (await h(), n.logSummary());
    }),
    e
  );
}

export { X3, bR, Mo, ExportFailureCounter, xd, wrapExporterFailures };
