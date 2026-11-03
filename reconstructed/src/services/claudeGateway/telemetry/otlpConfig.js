/**
 * services/claudeGateway/telemetry/otlpConfig.ts
 *
 * 2.1.316 新增：网关 OTLP 配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (2)
 * attribution: placement 2
 */
import { envObject } from "./resourceAttributes.js";
import { readStringListAt } from "../desktopSettings.js";

//@ chunk-1ny7cxrt.js:1385609-1385843 placement
/**
 * 托管 env 中任一 OTLP 协议为 http/json 时用 http/json，否则 http/protobuf。
 */
function otlpProtocol(settings) {
  let t = envObject(settings);
  return [
    "OTEL_EXPORTER_OTLP_PROTOCOL",
    "OTEL_EXPORTER_OTLP_METRICS_PROTOCOL",
    "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
    "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  ].some((o) => t[o] === "http/json")
    ? "http/json"
    : "http/protobuf";
}
//@ chunk-1ny7cxrt.js:1385843-1385972 placement
/**
 * 由 sandbox.network.allowedDomains 派生 coworkEgressAllowedHosts。
 */
function coworkEgressHosts(settings) {
  let stringListAt = readStringListAt(settings, ["sandbox", "network", "allowedDomains"]);
  return stringListAt !== undefined && stringListAt.length > 0
    ? {
        coworkEgressAllowedHosts: stringListAt,
      }
    : {};
}
export { otlpProtocol, coworkEgressHosts };
