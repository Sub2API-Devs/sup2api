/**
 * utils/telemetry/logger.ts
 *
 * OTel 诊断 logger，把 OTel 内部错误写入调试日志。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/logger.ts
 * pieces: chunk-ea1addqx.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";

//@ chunk-ea1addqx.js:261-303 placement
var OTEL_DIAG_ERROR_PREFIX = "[3P telemetry] OTEL diag error:";
//@ chunk-ea1addqx.js:303-565 fingerprint (2.1.88 match: ClaudeCodeDiagLogger, 0.75)
/**
 * OTel 诊断 logger：把 OTel 内部 error/warn 写到调试日志（[3P telemetry] 前缀）。
 */
class ClaudeCodeDiagLogger {
  error(message, ...restArgs) {
    if (env.CLAUDE_CODE_OTEL_DIAG_STDERR)
      process.stderr.write(`${OTEL_DIAG_ERROR_PREFIX} ${message}
`);
    logForDebugging(`${OTEL_DIAG_ERROR_PREFIX} ${message}`, {
      level: "error",
    });
  }
  warn(message, ...restArgs_2) {
    logForDebugging(`[3P telemetry] OTEL diag warn: ${message}`, {
      level: "warn",
    });
  }
  info(_message, ..._args) {
    return;
  }
  debug(_message, ..._args) {
    return;
  }
  verbose(_message, ..._args) {
    return;
  }
}
export { ClaudeCodeDiagLogger, OTEL_DIAG_ERROR_PREFIX };
