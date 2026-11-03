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
var d = /^\/v1\/code\/sessions\/[A-Za-z0-9_-]+\/worker\/otlp\/((?:customer\/)?[a-z]+)$/;
//@ chunk-ry7mqags.js:456-514 placement
function o(r, e) {
  let match = d.exec(r);
  return match !== null && match[1] === e;
}
//@ chunk-ry7mqags.js:514-628 placement
function isLoopbackHost(r) {
  let lower = r.toLowerCase();
  return lower === "localhost" || lower === "::1" || lower === "[::1]" || /^127(\.\d{1,3}){3}$/.test(lower);
}
//@ chunk-ry7mqags.js:628-701 placement
function u() {
  return env.CLAUDE_CODE_REMOTE === !0 && startupCcrEnv.bridgeCarrier === void 0;
}
//@ chunk-ry7mqags.js:701-757 placement
var j5t = { metrics: "METRICS", logs: "LOGS", traces: "TRACES" };
//@ chunk-ry7mqags.js:757-853 placement
function hasOtlpHeadersEnv(r) {
  return !!env.OTEL_EXPORTER_OTLP_HEADERS || !!env[`OTEL_EXPORTER_OTLP_${j5t[r]}_HEADERS`];
}
//@ chunk-ry7mqags.js:853-1369 placement
function getRemoteOtlpEndpoint(r) {
  if (r === "traces") return null;
  if (!u()) return null;
  let SESSION_INGRESS_URL = env.SESSION_INGRESS_URL,
    CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID,
    s = process.env[`OTEL_EXPORTER_OTLP_${j5t[r]}_ENDPOINT`]?.trim();
  if (!SESSION_INGRESS_URL || !CLAUDE_CODE_REMOTE_SESSION_ID || !s) return null;
  if (hasOtlpHeadersEnv(r)) return null;
  let f =
    r === "logs"
      ? ["customer/logs"]
      : [...(hasRemoteOtelLogsEndpoint() ? ["customer/metrics"] : []), "metrics"];
  try {
    let origin = new URL(SESSION_INGRESS_URL).origin,
      href = new URL(s).href;
    for (let c of f) {
      let l = `/v1/code/sessions/${CLAUDE_CODE_REMOTE_SESSION_ID}/worker/otlp/${c}`,
        href_2 = new URL(`${origin}${l}`).href;
      if (o(l, c) && isSameOriginAsCcr(href_2) && href === href_2) return href_2;
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
function pTn(r) {
  return hasRemoteOtelLogsEndpoint() ? maskModelIdForTelemetry(r) : r;
}
/**
 * 合法的 CCR traces 中继端点。
 */
//@ chunk-ry7mqags.js:1453-1781 placement
function ccrTracesRelayUrl() {
  if (!u()) return null;
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
    !o(e.pathname, "traces")
  )
    return null;
  return e.href;
}
/**
 * OTLP traces 端点是否 CCR 同源中继。
 */
//@ chunk-ry7mqags.js:1781-1933 placement
function isCcrTracesEndpoint() {
  let OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (!OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) return !1;
  try {
    let e = new URL(OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
    return isSameOriginAsCcr(e.href) && o(e.pathname, "traces");
  } catch {
    return !1;
  }
}
//@ chunk-ry7mqags.js:1933-2135 placement
class ArmLatch {
  armed = !1;
  frozen = void 0;
  arm() {
    this.armed = !0;
  }
  freeze() {
    this.frozen = this.armed;
  }
  resolve(r) {
    if (this.frozen !== void 0) return this.frozen;
    return this.armed || r();
  }
  reset() {
    ((this.armed = !1), (this.frozen = void 0));
  }
}
//@ chunk-ry7mqags.js:2135-2149 placement
var AQr = new ArmLatch();
//@ chunk-ry7mqags.js:2149-2201 placement
function isTracesRelayed() {
  return AQr.resolve(() => ccrTracesRelayUrl() !== null);
}

export {
  pTn,
  hasRemoteOtelLogsEndpoint,
  isTracesRelayed,
  j5t,
  ccrTracesRelayUrl,
  isCcrTracesEndpoint,
  AQr,
  getRemoteOtlpEndpoint,
};
