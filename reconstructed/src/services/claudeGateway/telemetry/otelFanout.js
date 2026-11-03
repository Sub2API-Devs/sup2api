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

/**
 * 用户是否属于管理员组。
 */
//@ chunk-1ny7cxrt.js:1452744-1452851 placement
function isAdminGroupMember(e, t) {
  return t !== void 0 && t.admin_groups.length > 0 && (e ?? []).some((n) => t.admin_groups.includes(n));
}
//@ chunk-1ny7cxrt.js:1452851-1452948 placement
var Q0 = { "/v1/metrics": "metrics", "/v1/logs": "logs", "/v1/traces": "traces" },
  eve = 128,
  tve = 5,
  nve = 30000;
//@ chunk-1ny7cxrt.js:1452948-1453017 placement
function Hd(e) {
  return String(e).replace(/(\b\w+:\/\/)[^@/]+@/g, "$1");
}
/**
 * OTLP 转发器：把客户端遥测并行转发到各目标（限并发、Google 认证、按目标熔断 30 秒）。
 */
//@ chunk-1ny7cxrt.js:1453017-1454873 placement
class OtelFanout {
  inFlight = 0;
  dropped = 0;
  refused = new Map();
  circuitBreakers = new Map();
  googleAuths = new Map();
  googleHeaders(e) {
    let t = this.googleAuths.get(e);
    if (!t) ((t = createGoogleHeaderProvider(e)), this.googleAuths.set(e, t));
    return t();
  }
  async fanout(e, t, n, o, r) {
    if (r.length === 0) return;
    if (this.inFlight >= eve) {
      if (this.dropped++ % 100 === 0)
        gatewayLog("warn", `otel fanout saturated (${this.inFlight} in flight); dropping`);
      return;
    }
    this.inFlight++;
    try {
      let now = Date.now(),
        mapped = r.map((c) => (this.circuitBreakers.get(c.url)?.openUntil ?? 0) > now);
      (
        await Promise.allSettled(
          r.map(async (c, u) => {
            if (mapped[u]) return Promise.reject(Error("circuit open"));
            let f = { "Content-Type": n, ...(o && { "Content-Encoding": o }), ...c.headers };
            if (c.auth) {
              let googleHeaders = await this.googleHeaders(c.auth.google),
                mapped = Object.keys(c.headers).map((y) => y.toLowerCase());
              for (let y of Object.keys(f)) if (y.toLowerCase() === "authorization") delete f[y];
              for (let [y, b] of Object.entries(googleHeaders))
                if (y === "authorization" || !mapped.includes(y)) f[y] = b;
            }
            return ssrfSafeFetch(`${c.url.replace(/\/$/, "")}${e}`, {
              method: "POST",
              body: t,
              honorNoProxy: !0,
              headers: f,
              signal: AbortSignal.timeout(1e4),
            }).then((h) => {
              if (
                (h.body?.cancel().catch(() => {}),
                h.status === 400 ||
                  h.status === 413 ||
                  h.status === 415 ||
                  h.status === 422 ||
                  h.status === 431)
              ) {
                let m = this.refused.get(c.url) ?? 0;
                if ((this.refused.set(c.url, m + 1), m % 100 === 0))
                  gatewayLog(
                    "warn",
                    `otel dest ${Hd(c.url)} refused an export's payload: ${h.status} ${Hd(h.statusText)} (not counted as a dest failure)`,
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
          let h = this.circuitBreakers.get(url) ?? { fails: 0, openUntil: 0 };
          if (++h.fails >= tve)
            ((h.openUntil = Date.now() + nve),
              gatewayLog("warn", `otel dest ${Hd(url)} tripped; skipping 30s`));
          else gatewayLog("warn", `otel forward to ${Hd(url)} failed: ${Hd(c.reason)}`);
          this.circuitBreakers.set(url, h);
        }
      });
    } finally {
      this.inFlight--;
    }
  }
}

export { OtelFanout, isAdminGroupMember, Q0 };
