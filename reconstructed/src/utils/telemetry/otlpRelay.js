/**
 * utils/telemetry/otlpRelay.ts
 *
 * 2.1.316 新增：云会话中把 OTLP 导出转经 session ingress（/worker/otlp/）的端点改写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ry7mqags.js (14)
 * attribution: placement 14
 */
import { env } from "../env.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { isSameOriginAsCcr } from "../../services/mcp/ccrMcpUrls.js";
import { isDiskless } from "../../bootstrap/state.js";
import { maskModelIdForTelemetry } from "../model/modelCatalog/catalogEntries.js";

//@ chunk-ry7mqags.js:370-456 placement
var RELAY_PATH_RE = /^\/v1\/code\/sessions\/[A-Za-z0-9_-]+\/worker\/otlp\/((?:customer\/)?[a-z]+)$/;
//@ chunk-ry7mqags.js:456-514 placement
function matchesRelayPath(pathname, e) {
  let match = RELAY_PATH_RE.exec(pathname);
  return match !== null && match[1] === e;
}
//@ chunk-ry7mqags.js:514-628 placement
function isLoopbackHost(hostname) {
  let lower = hostname.toLowerCase();
  return lower === "localhost" || lower === "::1" || lower === "[::1]" || /^127(\.\d{1,3}){3}$/.test(lower);
}
//@ chunk-ry7mqags.js:628-701 placement
function isRelayCarrier() {
  return env.CLAUDE_CODE_REMOTE === true && startupCcrEnv.bridgeCarrier === undefined;
}
//@ chunk-ry7mqags.js:701-757 placement
/**
 * OTLP 信号名到环境变量段的映射。
 */
var SIGNAL_ENV_SUFFIX = {
  metrics: "METRICS",
  logs: "LOGS",
  traces: "TRACES",
};
//@ chunk-ry7mqags.js:757-853 placement
function hasOtlpHeadersEnv(r) {
  return !!env.OTEL_EXPORTER_OTLP_HEADERS || !!env[`OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[r]}_HEADERS`];
}
//@ chunk-ry7mqags.js:853-1369 placement
function getRemoteOtlpEndpoint(r) {
  if (r === "traces") return null;
  if (!isRelayCarrier()) return null;
  let SESSION_INGRESS_URL = env.SESSION_INGRESS_URL;
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  let trimmed = process.env[`OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[r]}_ENDPOINT`]?.trim();
  if (!SESSION_INGRESS_URL || !CLAUDE_CODE_REMOTE_SESSION_ID || !trimmed) return null;
  if (hasOtlpHeadersEnv(r)) return null;
  let f =
    r === "logs"
      ? ["customer/logs"]
      : [...(hasRemoteOtelLogsEndpoint() ? ["customer/metrics"] : []), "metrics"];
  try {
    let origin = new URL(SESSION_INGRESS_URL).origin;
    let href = new URL(trimmed).href;
    for (let c of f) {
      let l = `/v1/code/sessions/${CLAUDE_CODE_REMOTE_SESSION_ID}/worker/otlp/${c}`;
      let href_2 = new URL(`${origin}${l}`).href;
      if (matchesRelayPath(l, c) && isSameOriginAsCcr(href_2) && href === href_2) return href_2;
    }
    return null;
  } catch {
    return null;
  }
}
//@ chunk-ry7mqags.js:1369-1415 placement = buildAssistantDailyLogPrompt (0.59)
function hasRemoteOtelLogsEndpoint() {
  return isDiskless() && getRemoteOtlpEndpoint("logs") !== null;
}
//@ chunk-ry7mqags.js:1415-1453 placement
/**
 * 走中继时对模型名做脱敏。
 */
function maskModelIdIfRelayed(r) {
  return hasRemoteOtelLogsEndpoint() ? maskModelIdForTelemetry(r) : r;
}
//@ chunk-ry7mqags.js:1453-1781 placement
/**
 * 合法的 CCR traces 中继端点。
 */
function ccrTracesRelayUrl() {
  if (!isRelayCarrier()) return null;
  let OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (!OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) return null;
  let e;
  try {
    e = new URL(OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
  } catch {
    return null;
  }
  if (
    !(e.protocol === "https:" || (e.protocol === "http:" && isLoopbackHost(e.hostname))) ||
    e.username !== "" ||
    e.password !== "" ||
    e.search !== "" ||
    e.hash !== "" ||
    !isSameOriginAsCcr(e.href) ||
    !matchesRelayPath(e.pathname, "traces")
  )
    return null;
  return e.href;
}
//@ chunk-ry7mqags.js:1781-1933 placement
/**
 * OTLP traces 端点是否 CCR 同源中继。
 */
function isCcrTracesEndpoint() {
  let OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (!OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) return false;
  try {
    let e = new URL(OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
    return isSameOriginAsCcr(e.href) && matchesRelayPath(e.pathname, "traces");
  } catch {
    return false;
  }
}
//@ chunk-ry7mqags.js:1933-2135 placement
class ArmLatch {
  armed = false;
  frozen = undefined;
  arm() {
    this.armed = true;
  }
  freeze() {
    this.frozen = this.armed;
  }
  resolve(r) {
    if (this.frozen !== undefined) return this.frozen;
    return this.armed || r();
  }
  reset() {
    this.armed = false;
    this.frozen = undefined;
  }
}
//@ chunk-ry7mqags.js:2135-2149 placement
/**
 * traces 是否走中继的闩锁。
 */
var tracesRelayedLatch = new ArmLatch();
//@ chunk-ry7mqags.js:2149-2201 placement
function isTracesRelayed() {
  return tracesRelayedLatch.resolve(() => ccrTracesRelayUrl() !== null);
}
export {
  maskModelIdIfRelayed,
  hasRemoteOtelLogsEndpoint,
  isTracesRelayed,
  SIGNAL_ENV_SUFFIX,
  ccrTracesRelayUrl,
  isCcrTracesEndpoint,
  tracesRelayedLatch,
  getRemoteOtlpEndpoint,
};
