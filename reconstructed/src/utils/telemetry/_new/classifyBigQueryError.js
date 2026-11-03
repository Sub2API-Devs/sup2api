/**
 * utils/telemetry/_new/classifyBigQueryError.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9vvvg0d3.js (6)
 * attribution: sole-consumer-new 6
 */
import { isClaudeAISubscriber, getSubscriptionType } from "../../auth.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { Qm } from "../../../../vendor/@opentelemetry/core/build/src/index.js";
import { ZGe } from "../../../../vendor/@opentelemetry/sdk-metrics/build/src/index.js";
import { classifyAxiosError } from "../../errors.js";
import { env } from "../../env.js";
import { CLEANUP_TIMEOUT_MS } from "../../cleanupRegistry.js";

//@ chunk-9vvvg0d3.js:24241-24416 sole-consumer-new
function customerTypeAttributes() {
  if (!isClaudeAISubscriber()) return { "user.customer_type": "api" };
  let e = getSubscriptionType();
  return e
    ? { "user.customer_type": "claude_ai", "user.subscription_type": e }
    : { "user.customer_type": "claude_ai" };
}
//@ chunk-9vvvg0d3.js:24416-24448 sole-consumer-new
var N = Re(Qm(), 1),
  Pe = Re(ZGe(), 1);
/**
 * BigQuery 导出错误归类。
 */
//@ chunk-9vvvg0d3.js:24448-24772 sole-consumer-new
function classifyBigQueryError(e) {
  let { kind: kind, status: status } = classifyAxiosError(e);
  switch (kind) {
    case "auth":
      return [status === 401 ? "http_401" : "http_403", status];
    case "timeout":
      return ["timeout"];
    case "network":
      return ["network_error"];
    default:
      if (status !== void 0 && status >= 500) return ["http_5xx", status];
      if (status !== void 0 && status >= 400) return ["http_4xx", status];
      return status !== void 0 ? ["unknown_error", status] : ["unknown_error"];
  }
}
//@ chunk-9vvvg0d3.js:24772-24855 sole-consumer-new
function Qe(e) {
  let { status: status, message: message } = classifyAxiosError(e);
  return status === void 0 ? message : `HTTP ${status}: ${message}`;
}
//@ chunk-9vvvg0d3.js:24855-24866 sole-consumer-new
var Et = 250;
//@ chunk-9vvvg0d3.js:24866-24960 sole-consumer-new
function _t() {
  return Math.max(
    0,
    Math.min(env.CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS ?? CLEANUP_TIMEOUT_MS, CLEANUP_TIMEOUT_MS) - Et,
  );
}

export { N, classifyBigQueryError, Qe, Pe, customerTypeAttributes, _t };
