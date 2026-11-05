/**
 * services/claudeGateway/telemetry/otlpConfig.ts
 *
 * 2.1.316 新增：网关 OTLP 配置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (2)
 * attribution: placement 2
 */
import { envObject } from "./resourceAttributes.js";
import { readStringListAt } from "../desktopSettings.js";

//@ chunk-1hnjmk23.js:1387446-1387680 placement
/**
 * 托管 env 中任一 OTLP 协议为 http/json 时用 http/json，否则 http/protobuf。
 */
function otlpProtocol(bootstrap) {
  let vars = envObject(bootstrap);
  return [
    "OTEL_EXPORTER_OTLP_PROTOCOL",
    "OTEL_EXPORTER_OTLP_METRICS_PROTOCOL",
    "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
    "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  ].some((name) => vars[name] === "http/json")
    ? "http/json"
    : "http/protobuf";
}
//@ chunk-1hnjmk23.js:1387680-1387809 placement
/**
 * 由 sandbox.network.allowedDomains 派生 coworkEgressAllowedHosts。
 */
function coworkEgressHosts(source) {
  let stringListAt = readStringListAt(source, ["sandbox", "network", "allowedDomains"]);
  return stringListAt !== undefined && stringListAt.length > 0
    ? {
        coworkEgressAllowedHosts: stringListAt,
      }
    : {};
}
export { otlpProtocol, coworkEgressHosts };
