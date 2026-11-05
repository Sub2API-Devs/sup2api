/**
 * utils/telemetry/otlpRelay.ts
 *
 * 2.1.316 新增：云会话中把 OTLP 导出转经 session ingress（/worker/otlp/）的端点改写
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g7y7q04y.js (14)
 * attribution: placement 14
 */
import { env } from "../env.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { isSameOriginAsCcr } from "../../services/mcp/ccrMcpUrls.js";
import { isDiskless } from "../../bootstrap/state.js";
import { maskModelIdForTelemetry } from "../model/modelCatalog/catalogEntries.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g7y7q04y.js:370-456 placement
var RELAY_PATH_RE = /^\/v1\/code\/sessions\/[A-Za-z0-9_-]+\/worker\/otlp\/((?:customer\/)?[a-z]+)$/;
//@ chunk-g7y7q04y.js:456-514 placement
function matchesRelayPath(requestPath, signal) {
  let match = RELAY_PATH_RE.exec(requestPath);
  return match !== null && match[1] === signal;
}
//@ chunk-g7y7q04y.js:514-628 placement
function isLoopbackHost(hostname) {
  let lower = hostname.toLowerCase();
  return lower === "localhost" || lower === "::1" || lower === "[::1]" || /^127(\.\d{1,3}){3}$/.test(lower);
}
//@ chunk-g7y7q04y.js:628-701 placement
function isRelayCarrier() {
  return env.CLAUDE_CODE_REMOTE === true && startupCcrEnv.bridgeCarrier === undefined;
}
//@ chunk-g7y7q04y.js:701-757 placement
/**
 * OTLP 信号名到环境变量段的映射。
 */
var SIGNAL_ENV_SUFFIX = {
  metrics: "METRICS",
  logs: "LOGS",
  traces: "TRACES",
};
//@ chunk-g7y7q04y.js:757-853 placement
function hasOtlpHeadersEnv(signal) {
  return !!env.OTEL_EXPORTER_OTLP_HEADERS || !!env[`OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[signal]}_HEADERS`];
}
//@ chunk-g7y7q04y.js:853-1369 placement
function getRemoteOtlpEndpoint(signal) {
  if (signal === "traces") return null;
  if (!isRelayCarrier()) return null;
  let SESSION_INGRESS_URL = env.SESSION_INGRESS_URL;
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  let trimmed = process.env[`OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[signal]}_ENDPOINT`]?.trim();
  if (!SESSION_INGRESS_URL || !CLAUDE_CODE_REMOTE_SESSION_ID || !trimmed) return null;
  if (hasOtlpHeadersEnv(signal)) return null;
  let paths =
    signal === "logs"
      ? ["customer/logs"]
      : [...(hasRemoteOtelLogsEndpoint() ? ["customer/metrics"] : []), "metrics"];
  try {
    let origin = new URL(SESSION_INGRESS_URL).origin;
    let href = new URL(trimmed).href;
    for (let path of paths) {
      let url = `/v1/code/sessions/${CLAUDE_CODE_REMOTE_SESSION_ID}/worker/otlp/${path}`;
      let href_2 = new URL(`${origin}${url}`).href;
      if (matchesRelayPath(url, path) && isSameOriginAsCcr(href_2) && href === href_2) return href_2;
    }
    return null;
  } catch {
    return null;
  }
}
//@ chunk-g7y7q04y.js:1369-1415 placement (2.1.88 match: buildAssistantDailyLogPrompt, 0.59)
function hasRemoteOtelLogsEndpoint() {
  return isDiskless() && getRemoteOtlpEndpoint("logs") !== null;
}
//@ chunk-g7y7q04y.js:1415-1453 placement
/**
 * 走中继时对模型名做脱敏。
 */
function maskModelIdIfRelayed(modelId) {
  return hasRemoteOtelLogsEndpoint() ? maskModelIdForTelemetry(modelId) : modelId;
}
//@ chunk-g7y7q04y.js:1453-1781 placement
/**
 * 合法的 CCR traces 中继端点。
 */
function ccrTracesRelayUrl() {
  if (!isRelayCarrier()) return null;
  let OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (!OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) return null;
  let url;
  try {
    url = new URL(OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
  } catch {
    return null;
  }
  if (
    !(url.protocol === "https:" || (url.protocol === "http:" && isLoopbackHost(url.hostname))) ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !isSameOriginAsCcr(url.href) ||
    !matchesRelayPath(url.pathname, "traces")
  )
    return null;
  return url.href;
}
//@ chunk-g7y7q04y.js:1781-1933 placement
/**
 * OTLP traces 端点是否 CCR 同源中继。
 */
function isCcrTracesEndpoint() {
  let OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (!OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) return false;
  try {
    let url = new URL(OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
    return isSameOriginAsCcr(url.href) && matchesRelayPath(url.pathname, "traces");
  } catch {
    return false;
  }
}
//@ chunk-g7y7q04y.js:1933-2135 placement
class ArmLatch {
  armed = false;
  frozen = undefined;
  arm() {
    this.armed = true;
  }
  freeze() {
    this.frozen = this.armed;
  }
  resolve(fallback) {
    if (this.frozen !== undefined) return this.frozen;
    return this.armed || fallback();
  }
  reset() {
    this.armed = false;
    this.frozen = undefined;
  }
}
//@ chunk-g7y7q04y.js:2135-2149 placement
/**
 * traces 是否走中继的闩锁。
 */
var tracesRelayedLatch; // deferred: uses ArmLatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g7y7q04y.js:2135", () => {
  tracesRelayedLatch = new ArmLatch();
});
//@ chunk-g7y7q04y.js:2149-2201 placement
function isTracesRelayed() {
  return tracesRelayedLatch.resolve(() => ccrTracesRelayUrl() !== null);
}
export {
  hasRemoteOtelLogsEndpoint,
  isTracesRelayed,
  SIGNAL_ENV_SUFFIX,
  ccrTracesRelayUrl,
  isCcrTracesEndpoint,
  tracesRelayedLatch,
  getRemoteOtlpEndpoint,
  maskModelIdIfRelayed,
};
