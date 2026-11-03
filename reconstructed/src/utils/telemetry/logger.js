/**
 * utils/telemetry/logger.ts
 *
 * OTel 诊断 logger，把 OTel 内部错误写入调试日志。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/logger.ts
 * pieces: chunk-th02cny1.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";

//@ chunk-th02cny1.js:261-303 placement
var OTEL_DIAG_ERROR_PREFIX = "[3P telemetry] OTEL diag error:";
/**
 * OTel 诊断 logger：把 OTel 内部 error/warn 写到调试日志（[3P telemetry] 前缀）。
 */
//@ chunk-th02cny1.js:303-565 fingerprint = ClaudeCodeDiagLogger (0.75)
class ClaudeCodeDiagLogger {
  error(r, ...e) {
    if (env.CLAUDE_CODE_OTEL_DIAG_STDERR)
      process.stderr.write(`${OTEL_DIAG_ERROR_PREFIX} ${r}
`);
    logForDebugging(`${OTEL_DIAG_ERROR_PREFIX} ${r}`, { level: "error" });
  }
  warn(r, ...e) {
    logForDebugging(`[3P telemetry] OTEL diag warn: ${r}`, { level: "warn" });
  }
  info(r, ...e) {
    return;
  }
  debug(r, ...e) {
    return;
  }
  verbose(r, ...e) {
    return;
  }
}

export { ClaudeCodeDiagLogger, OTEL_DIAG_ERROR_PREFIX };
