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
    (groups ?? []).some((n) => admin.admin_groups.includes(n))
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
function stripUrlCredentials(e) {
  return String(e).replace(/(\b\w+:\/\/)[^@/]+@/g, "$1");
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
  googleHeaders(e) {
    let t = this.googleAuths.get(e);
    if (!t) {
      t = createGoogleHeaderProvider(e);
      this.googleAuths.set(e, t);
    }
    return t();
  }
  async fanout(e, body, n, o, r) {
    if (r.length === 0) return;
    if (this.inFlight >= MAX_OTLP_INFLIGHT) {
      if (this.dropped++ % 100 === 0)
        gatewayLog("warn", `otel fanout saturated (${this.inFlight} in flight); dropping`);
      return;
    }
    this.inFlight++;
    try {
      let now = Date.now();
      let mapped = r.map((c) => (this.circuitBreakers.get(c.url)?.openUntil ?? 0) > now);
      (
        await Promise.allSettled(
          r.map(async (c, u) => {
            if (mapped[u]) return Promise.reject(Error("circuit open"));
            let f = {
              "Content-Type": n,
              ...(o && {
                "Content-Encoding": o,
              }),
              ...c.headers,
            };
            if (c.auth) {
              let h = await this.googleHeaders(c.auth.google);
              let mapped = Object.keys(c.headers).map((key) => key.toLowerCase());
              for (let key of Object.keys(f)) if (key.toLowerCase() === "authorization") delete f[key];
              for (let [key, value] of Object.entries(h))
                if (key === "authorization" || !mapped.includes(key)) f[key] = value;
            }
            return ssrfSafeFetch(`${c.url.replace(/\/$/, "")}${e}`, {
              method: "POST",
              body,
              honorNoProxy: true,
              headers: f,
              signal: AbortSignal.timeout(1e4),
            }).then((h) => {
              h.body?.cancel().catch(() => {});
              if (
                h.status === 400 ||
                h.status === 413 ||
                h.status === 415 ||
                h.status === 422 ||
                h.status === 431
              ) {
                let m = this.refused.get(c.url) ?? 0;
                this.refused.set(c.url, m + 1);
                if (m % 100 === 0)
                  gatewayLog(
                    "warn",
                    `otel dest ${stripUrlCredentials(c.url)} refused an export's payload: ${h.status} ${stripUrlCredentials(h.statusText)} (not counted as a dest failure)`,
                  );
                return "refused";
              }
              if (!h.ok) throw Error(`${h.status} ${h.statusText}`);
              return "delivered";
            });
          }),
        )
      ).forEach((c, u) => {
        if (mapped[u]) return;
        let url = r[u].url;
        if (c.status === "fulfilled") {
          if (c.value === "delivered") this.circuitBreakers.delete(url);
        } else {
          let h = this.circuitBreakers.get(url) ?? {
            fails: 0,
            openUntil: 0,
          };
          if (++h.fails >= OTLP_DEST_FAIL_THRESHOLD) {
            h.openUntil = Date.now() + OTLP_DEST_BREAKER_MS;
            gatewayLog("warn", `otel dest ${stripUrlCredentials(url)} tripped; skipping 30s`);
          } else
            gatewayLog(
              "warn",
              `otel forward to ${stripUrlCredentials(url)} failed: ${stripUrlCredentials(c.reason)}`,
            );
          this.circuitBreakers.set(url, h);
        }
      });
    } finally {
      this.inFlight--;
    }
  }
}
export { OtelFanout, isAdminGroupMember, OTLP_PATH_KINDS };
