/**
 * services/claudeGateway/telemetry/otelFanout.ts
 *
 * 2.1.316 新增：网关 OTEL 遥测扇出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (4)
 * attribution: placement 4
 */
import { createGoogleHeaderProvider } from "./googleAuth.js";
import { gatewayLog } from "../../gateway/gatewayBanner.js";
import { ssrfSafeFetch } from "../ssrfGuard.js";

//@ chunk-1ny7cxrt.js:1452744-1452851 placement
/**
 * 用户是否属于管理员组。
 */
function isAdminGroupMember(groups, admin) {
  return (
    admin !== undefined &&
    admin.admin_groups.length > 0 &&
    (groups ?? []).some((group) => admin.admin_groups.includes(group))
  );
}
//@ chunk-1ny7cxrt.js:1452851-1452948 placement
/**
 * 熔断持续毫秒数（30 秒）。
 */
var OTLP_PATH_KINDS = {
  "/v1/metrics": "metrics",
  "/v1/logs": "logs",
  "/v1/traces": "traces",
};
var MAX_OTLP_INFLIGHT = 128;
var OTLP_DEST_FAIL_THRESHOLD = 5;
var OTLP_DEST_BREAKER_MS = 30000;
//@ chunk-1ny7cxrt.js:1452948-1453017 placement
/**
 * 去掉 URL 里的 userinfo，用于日志输出。
 */
function stripUrlCredentials(value) {
  return String(value).replace(/(\b\w+:\/\/)[^@/]+@/g, "$1");
}
//@ chunk-1ny7cxrt.js:1453017-1454873 placement
/**
 * OTLP 转发器：把客户端遥测并行转发到各目标（限并发、Google 认证、按目标熔断 30 秒）。
 */
class OtelFanout {
  inFlight = 0;
  dropped = 0;
  refused = new Map();
  circuitBreakers = new Map();
  googleAuths = new Map();
  googleHeaders(authConfig) {
    let provider = this.googleAuths.get(authConfig);
    if (!provider) {
      provider = createGoogleHeaderProvider(authConfig);
      this.googleAuths.set(authConfig, provider);
    }
    return provider();
  }
  async fanout(path, body, contentType, contentEncoding, destinations) {
    if (destinations.length === 0) return;
    if (this.inFlight >= MAX_OTLP_INFLIGHT) {
      if (this.dropped++ % 100 === 0)
        gatewayLog("warn", `otel fanout saturated (${this.inFlight} in flight); dropping`);
      return;
    }
    this.inFlight++;
    try {
      let now = Date.now();
      let mapped = destinations.map((dest) => (this.circuitBreakers.get(dest.url)?.openUntil ?? 0) > now);
      (
        await Promise.allSettled(
          destinations.map(async (dest, index) => {
            if (mapped[index]) return Promise.reject(Error("circuit open"));
            let headers = {
              "Content-Type": contentType,
              ...(contentEncoding && {
                "Content-Encoding": contentEncoding,
              }),
              ...dest.headers,
            };
            if (dest.auth) {
              let googleHeaders = await this.googleHeaders(dest.auth.google);
              let mapped = Object.keys(dest.headers).map((key) => key.toLowerCase());
              for (let key of Object.keys(headers))
                if (key.toLowerCase() === "authorization") delete headers[key];
              for (let [key, value] of Object.entries(googleHeaders))
                if (key === "authorization" || !mapped.includes(key)) headers[key] = value;
            }
            return ssrfSafeFetch(`${dest.url.replace(/\/$/, "")}${path}`, {
              method: "POST",
              body,
              honorNoProxy: true,
              headers,
              signal: AbortSignal.timeout(1e4),
            }).then((response) => {
              response.body?.cancel().catch(() => {});
              if (
                response.status === 400 ||
                response.status === 413 ||
                response.status === 415 ||
                response.status === 422 ||
                response.status === 431
              ) {
                let refusedCount = this.refused.get(dest.url) ?? 0;
                this.refused.set(dest.url, refusedCount + 1);
                if (refusedCount % 100 === 0)
                  gatewayLog(
                    "warn",
                    `otel dest ${stripUrlCredentials(dest.url)} refused an export's payload: ${response.status} ${stripUrlCredentials(response.statusText)} (not counted as a dest failure)`,
                  );
                return "refused";
              }
              if (!response.ok) throw Error(`${response.status} ${response.statusText}`);
              return "delivered";
            });
          }),
        )
      ).forEach((result, index) => {
        if (mapped[index]) return;
        let url = destinations[index].url;
        if (result.status === "fulfilled") {
          if (result.value === "delivered") this.circuitBreakers.delete(url);
        } else {
          let breaker = this.circuitBreakers.get(url) ?? {
            fails: 0,
            openUntil: 0,
          };
          if (++breaker.fails >= OTLP_DEST_FAIL_THRESHOLD) {
            breaker.openUntil = Date.now() + OTLP_DEST_BREAKER_MS;
            gatewayLog("warn", `otel dest ${stripUrlCredentials(url)} tripped; skipping 30s`);
          } else
            gatewayLog(
              "warn",
              `otel forward to ${stripUrlCredentials(url)} failed: ${stripUrlCredentials(result.reason)}`,
            );
          this.circuitBreakers.set(url, breaker);
        }
      });
    } finally {
      this.inFlight--;
    }
  }
}
export { OtelFanout, isAdminGroupMember, OTLP_PATH_KINDS };
