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
var GATEWAY_DRAIN_TIMEOUT_MS = 25000;
//@ chunk-c82nj8g9.js:1450-1479 placement
function exitZero() {
  process.exit(0);
}
//@ chunk-c82nj8g9.js:1479-2438 placement
function installGatewayShutdownHandlers(gateway, onSignal) {
  let CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS = env.CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS || GATEWAY_DRAIN_TIMEOUT_MS;
  let isShuttingDown = false;
  let handleSignal = (signalName) => {
    onSignal();
    if (isShuttingDown) {
      gatewayLog(
        "warn",
        `${signalName} received while shutting down: not waiting any longer, closing open requests now and exiting`,
      );
      gateway.stop();
      exitZero();
    }
    isShuttingDown = true;
    gatewayLog(
      "info",
      `${signalName} received: shutting down. Refusing new connections; open requests get up to ${CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS / 1000}s to finish (set by CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS)`,
    );
    let hardExitMs = CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS + 3000;
    setTimeout(
      (elapsedMs) => {
        gatewayLog(
          "warn",
          `shutdown still not finished ${elapsedMs / 1000}s after the signal: exiting now. Requests still open are cut and their spend may not be recorded`,
        );
        exitZero();
      },
      hardExitMs,
      hardExitMs,
    ).unref();
    gateway.drain(CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS).then((cutCount) => {
      gatewayLog(
        cutCount === 0 ? "info" : "warn",
        cutCount === 0
          ? "shutdown complete: every open request finished, none was cut"
          : `drain window over after ${CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS / 1000}s: cut ${cutCount} request(s) still open. Raise CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS and the orchestrator's grace period together to give streams longer`,
      );
      exitZero();
    });
  };
  process.prependListener("SIGTERM", () => handleSignal("SIGTERM"));
  process.prependListener("SIGINT", () => handleSignal("SIGINT"));
}
export { installGatewayShutdownHandlers };
