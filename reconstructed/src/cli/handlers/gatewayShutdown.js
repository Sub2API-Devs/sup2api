/**
 * cli/handlers/gatewayShutdown.ts
 *
 * 2.1.316 新增。网关模式进程的优雅退出（CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS 排空等待）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c82nj8g9.js (3)
 * attribution: placement 3
 */
import { env } from "../../utils/env.js";
import { gatewayLog } from "../../services/gateway/gatewayBanner.js";

//@ chunk-c82nj8g9.js:1438-1450 placement
var c = 25000;
//@ chunk-c82nj8g9.js:1450-1479 placement
function t() {
  process.exit(0);
}
//@ chunk-c82nj8g9.js:1479-2438 placement
function installGatewayShutdownHandlers(o, p) {
  let n = env.CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS || c,
    s = !1,
    r = (a) => {
      if ((p(), s))
        (gatewayLog(
          "warn",
          `${a} received while shutting down: not waiting any longer, closing open requests now and exiting`,
        ),
          o.stop(),
          t());
      ((s = !0),
        gatewayLog(
          "info",
          `${a} received: shutting down. Refusing new connections; open requests get up to ${n / 1000}s to finish (set by CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS)`,
        ));
      let d = n + 3000;
      (setTimeout(
        (e) => {
          (gatewayLog(
            "warn",
            `shutdown still not finished ${e / 1000}s after the signal: exiting now. Requests still open are cut and their spend may not be recorded`,
          ),
            t());
        },
        d,
        d,
      ).unref(),
        o.drain(n).then((e) => {
          (gatewayLog(
            e === 0 ? "info" : "warn",
            e === 0
              ? "shutdown complete: every open request finished, none was cut"
              : `drain window over after ${n / 1000}s: cut ${e} request(s) still open. Raise CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS and the orchestrator's grace period together to give streams longer`,
          ),
            t());
        }));
    };
  (process.prependListener("SIGTERM", () => r("SIGTERM")),
    process.prependListener("SIGINT", () => r("SIGINT")));
}
