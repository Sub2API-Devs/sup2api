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
import { Lz } from "./resourceAttributes.js";
import { readStringListAt } from "../desktopSettings.js";

/**
 * 托管 env 中任一 OTLP 协议为 http/json 时用 http/json，否则 http/protobuf。
 */
//@ chunk-1ny7cxrt.js:1385609-1385843 placement
function otlpProtocol(e) {
  let t = Lz(e);
  return [
    "OTEL_EXPORTER_OTLP_PROTOCOL",
    "OTEL_EXPORTER_OTLP_METRICS_PROTOCOL",
    "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
    "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  ].some((o) => t[o] === "http/json")
    ? "http/json"
    : "http/protobuf";
}
/**
 * 由 sandbox.network.allowedDomains 派生 coworkEgressAllowedHosts。
 */
//@ chunk-1ny7cxrt.js:1385843-1385972 placement
function coworkEgressHosts(e) {
  let t = readStringListAt(e, ["sandbox", "network", "allowedDomains"]);
  return t !== void 0 && t.length > 0 ? { coworkEgressAllowedHosts: t } : {};
}

export { otlpProtocol, coworkEgressHosts };
